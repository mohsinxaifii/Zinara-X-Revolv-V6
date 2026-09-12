/**
 * PLP behaviour: the filter rail, the sort menu, the price range and load-more.
 *
 * Filtering and sorting both go through the same path - rewrite the query string
 * from the form, fetch that URL, and swap in the grid, the rail and the count
 * from the response. That keeps Shopify's storefront filtering as the source of
 * truth (counts, disabled values, the sort list) instead of reimplementing it,
 * and it keeps the URL shareable.
 */
class CollectionPage extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('[data-filter-form]');
    if (!this.form) return;

    this.grid = this.querySelector('[data-grid]');
    this.sortInput = this.querySelector('[data-sort-input]');

    this.form.addEventListener('change', (event) => {
      if (event.target.closest('[data-price-filter]')) return; // price commits on release
      this.submit();
    });

    this.addEventListener('click', (event) => {
      const preset = event.target.closest('[data-price-preset]');
      if (preset) return this.applyPreset(preset);

      const sortOption = event.target.closest('[data-sort-option]');
      if (sortOption) return this.applySort(sortOption);

      if (event.target.closest('[data-sort-trigger]')) return this.toggleSort();

      const moreLink = event.target.closest('[data-more-link]');
      if (moreLink) {
        event.preventDefault();
        return this.loadMore(moreLink);
      }

      const addButton = event.target.closest('[data-add-to-cart]');
      if (addButton) {
        // The button sits inside the card's <a>, so stop the navigation.
        event.preventDefault();
        return this.openVariantDrawer(addButton);
      }
    });

    document.addEventListener('click', this.closeSortOnOutsideClick);
    this.setupPrice();

    // Restore the grid when the shopper walks back through filter states.
    window.addEventListener('popstate', () => this.render(window.location.href, false));
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.closeSortOnOutsideClick);
  }

  /* ---------------------------------------------------------------- sorting */

  toggleSort() {
    const trigger = this.querySelector('[data-sort-trigger]');
    const menu = this.querySelector('[data-sort-menu]');
    if (!trigger || !menu) return;
    const open = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
  }

  closeSortOnOutsideClick = (event) => {
    const sort = this.querySelector('[data-sort]');
    if (!sort || sort.contains(event.target)) return;
    const trigger = this.querySelector('[data-sort-trigger]');
    const menu = this.querySelector('[data-sort-menu]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  };

  applySort(option) {
    if (this.sortInput) this.sortInput.value = option.value;
    this.toggleSort();
    this.submit();
  }

  /* ------------------------------------------------------------------ price */

  setupPrice() {
    const scope = this.querySelector('[data-price-filter]');
    if (!scope) return;

    const min = scope.querySelector('[data-price-min]');
    const max = scope.querySelector('[data-price-max]');
    if (!min || !max) return;

    const paint = () => {
      // Keep the handles from crossing over each other.
      if (Number(min.value) > Number(max.value)) {
        const held = min.value;
        min.value = max.value;
        max.value = held;
      }
      const ceiling = Number(scope.dataset.rangeMax) || 1;
      const fill = scope.querySelector('[data-price-fill]');
      if (fill) {
        fill.style.left = `${(Number(min.value) / ceiling) * 100}%`;
        fill.style.right = `${100 - (Number(max.value) / ceiling) * 100}%`;
      }
      const readout = scope.querySelector('[data-price-readout]');
      if (readout) {
        const symbol = scope.dataset.symbol || '';
        readout.textContent = `${symbol}${this.group(min.value)} - ${symbol}${this.group(max.value)}`;
      }
    };

    const commit = () => {
      scope.querySelector('[data-price-min-input]').value = min.value;
      scope.querySelector('[data-price-max-input]').value = max.value;
      this.submit();
    };

    [min, max].forEach((input) => {
      input.addEventListener('input', paint);
      input.addEventListener('change', commit);
    });
    paint();
  }

  applyPreset(preset) {
    const scope = preset.closest('[data-price-filter]');
    if (!scope) return;
    const min = scope.querySelector('[data-price-min]');
    const max = scope.querySelector('[data-price-max]');
    min.value = preset.dataset.min;
    max.value = preset.dataset.max;
    scope.querySelector('[data-price-min-input]').value = preset.dataset.min;
    scope.querySelector('[data-price-max-input]').value = preset.dataset.max;
    this.submit();
  }

  /* Indian digit grouping, to match the money filter the template renders with. */
  group(value) {
    return Number(value).toLocaleString('en-IN');
  }

  /* -------------------------------------------------------------- rendering */

  submit() {
    const params = new URLSearchParams(new FormData(this.form));
    // Empty inputs would otherwise post bare keys and break the filter URL.
    Array.from(params.entries()).forEach(([key, value]) => {
      if (value === '') params.delete(key);
    });
    const url = `${this.dataset.collectionUrl}?${params.toString()}`;
    this.render(url, true);
  }

  async render(url, push) {
    this.setBusy(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fresh = doc.querySelector('collection-page');
      if (!fresh) throw new Error('no collection-page in response');

      ['[data-grid]', '[data-filters]', '[data-more]'].forEach((selector) => {
        const next = fresh.querySelector(selector);
        const current = this.querySelector(selector);
        if (next && current) current.replaceWith(next);
        else if (!next && current) current.remove();
      });

      const count = fresh.querySelector('.collection_wrapper_main_toolbar_count');
      const currentCount = this.querySelector('.collection_wrapper_main_toolbar_count');
      if (count && currentCount) currentCount.textContent = count.textContent;

      if (push) window.history.pushState({}, '', url);
      this.setupPrice();
    } catch (error) {
      // A failed swap should not strand the shopper on a stale grid.
      console.error('[collection] could not apply filters', error);
      window.location.href = url;
    } finally {
      this.setBusy(false);
    }
  }

  setBusy(busy) {
    if (this.grid) this.grid.setAttribute('aria-busy', String(busy));
    this.querySelector('[data-more]')?.classList.toggle('is-loading', busy);
  }

  /* ------------------------------------------------------------- load more */

  async loadMore(link) {
    const wrap = link.closest('[data-more]');
    wrap?.classList.add('is-loading');
    try {
      const response = await fetch(link.href);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      doc.querySelectorAll('[data-grid] > *').forEach((card) => this.grid.appendChild(card));

      const nextMore = doc.querySelector('[data-more]');
      if (nextMore) wrap.replaceWith(nextMore);
      else wrap.remove();

      window.history.replaceState({}, '', link.href);
    } catch (error) {
      console.error('[collection] could not load more', error);
      window.location.href = link.href;
    } finally {
      wrap?.classList.remove('is-loading');
    }
  }

  /* ----------------------------------------------------------- add to cart */

  /* Adding is the drawer's job - metal and size have to be chosen first. */
  openVariantDrawer(button) {
    const drawer = document.querySelector('variant-drawer');
    const productUrl = button.closest('.product-card')?.getAttribute('href');
    if (!drawer || !productUrl) return this.addToCart(button);
    drawer.open(productUrl, button);
  }

  async addToCart(button) {
    if (button.dataset.busy === 'true') return;
    button.dataset.busy = 'true';

    const label = button.querySelector('[data-add-label]');
    try {
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(button.dataset.variantId), quantity: 1 }] }),
      });
      if (!response.ok) throw new Error(`${response.status}`);

      button.classList.add('is-added');
      if (label) label.textContent = button.dataset.addedLabel || 'Added to cart';
      document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
    } catch (error) {
      console.error('[collection] could not add to cart', error);
    } finally {
      button.dataset.busy = 'false';
    }
  }
}

customElements.define('collection-page', CollectionPage);
