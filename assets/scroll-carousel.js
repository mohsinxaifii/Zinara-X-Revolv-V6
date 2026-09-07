class ScrollCarousel extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-track]');
    this.prevButtons = Array.from(this.querySelectorAll('[data-prev]'));
    this.nextButtons = Array.from(this.querySelectorAll('[data-next]'));
    this.dotsContainer = this.querySelector('[data-dots]');
    if (!this.track) return;

    this.loop = this.hasAttribute('loop');

    this.prevButtons.forEach((button) =>
      button.addEventListener('click', () => this.scrollByPage(-1)),
    );
    this.nextButtons.forEach((button) =>
      button.addEventListener('click', () => this.scrollByPage(1)),
    );

    if (this.loop) this.buildLoop();
    this.buildDots();

    this.track.addEventListener(
      'scroll',
      () => {
        this.updateActiveDot();
        this.scheduleRecentre();
      },
      { passive: true },
    );

    // Rebuild on real size changes, not just window resize: connectedCallback can
    // run before the section stylesheet has applied, and a track measured then
    // looks like it fits on one page, so the dots would never appear at all.
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRebuild());
      this.resizeObserver.observe(this.track);
      const first = this.track.firstElementChild;
      if (first) this.resizeObserver.observe(first);
    } else {
      window.addEventListener('resize', () => this.buildDots());
    }
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.rebuildFrame) cancelAnimationFrame(this.rebuildFrame);
    if (this.recentreTimer) clearTimeout(this.recentreTimer);
  }

  /* ------------------------------------------------------------ geometry */

  /* Distance between two cards, so every move lands on a snap point. */
  cardStep() {
    const items = this.track.children;
    if (items.length < 2) return 0;
    const first = items[0].getBoundingClientRect();
    const second = items[1].getBoundingClientRect();
    return Math.max(0, second.left - first.left);
  }

  get setWidth() {
    return this.loop ? this.originals.length * this.cardStep() : 0;
  }

  /* ---------------------------------------------------------------- loop */

  /* One copy of the card set on each side, so the track can keep travelling in
     either direction; the scroll position is quietly moved back into the middle
     copy whenever it leaves, which is invisible because the sets are identical. */
  buildLoop() {
    this.originals = Array.from(this.track.children);
    if (this.originals.length < 2) {
      this.loop = false;
      return;
    }

    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    this.originals.forEach((item) => {
      before.appendChild(this.cloneItem(item));
      after.appendChild(this.cloneItem(item));
    });
    this.track.insertBefore(before, this.track.firstChild);
    this.track.appendChild(after);

    requestAnimationFrame(() => this.recentre(true));
  }

  cloneItem(item) {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('id');
    clone.removeAttribute('data-shopify-editor-block');
    if (clone.tagName === 'A' || clone.tagName === 'BUTTON') clone.tabIndex = -1;
    clone.querySelectorAll('a, button, input, select, textarea').forEach((el) => {
      el.tabIndex = -1;
    });
    return clone;
  }

  recentre(initial) {
    if (!this.loop) return;
    const setWidth = this.setWidth;
    if (setWidth <= 0) return;

    const current = this.track.scrollLeft;
    let left = current;
    if (initial) left = setWidth;
    else if (current >= setWidth * 2) left = current - setWidth;
    else if (current < setWidth) left = current + setWidth;

    if (left !== current) this.track.scrollLeft = left;
  }

  /* Only correct once the scroll has settled, so an in-flight smooth scroll is
     never cut short mid-animation. */
  scheduleRecentre() {
    if (!this.loop) return;
    if (this.recentreTimer) clearTimeout(this.recentreTimer);
    this.recentreTimer = setTimeout(() => this.recentre(false), 120);
  }

  /* ------------------------------------------------------------ movement */

  scrollByPage(direction) {
    const step = this.cardStep();

    if (this.loop) {
      if (step <= 0) return;
      this.recentre(false); // instant, before the animation starts
      this.scrollTrackTo(this.track.scrollLeft + step * direction);
      return;
    }

    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    if (maxScroll <= 0) return;

    const distance =
      step > 0
        ? Math.max(1, Math.floor(this.track.clientWidth / step)) * step
        : this.track.clientWidth;

    const current = this.track.scrollLeft;
    const target = current + distance * direction;

    // Clamp before wrapping. A track only a little wider than one page would
    // otherwise overshoot on the first click and snap straight back to 0,
    // which reads as the arrow doing nothing.
    let destination;
    if (direction > 0) {
      destination = current >= maxScroll - 1 ? 0 : Math.min(target, maxScroll);
    } else {
      destination = current <= 1 ? maxScroll : Math.max(target, 0);
    }

    this.scrollTrackTo(destination);
  }

  scrollTrackTo(left) {
    if (window.gsap) {
      gsap.to(this.track, { scrollLeft: left, duration: 0.45, ease: 'power2.out' });
    } else {
      this.track.scrollTo({ left, behavior: 'smooth' });
    }
  }

  /* ---------------------------------------------------------------- dots */

  dotCount() {
    if (this.loop) return this.originals.length;
    const pageWidth = this.track.clientWidth;
    return pageWidth > 0 ? Math.ceil(this.track.scrollWidth / pageWidth) : 1;
  }

  buildDots() {
    if (!this.dotsContainer) return;
    const count = this.dotCount();

    this.dotsContainer.innerHTML = '';
    if (count <= 1) return;

    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'scroll-carousel_dot';
      dot.setAttribute('aria-label', `Go to ${this.loop ? 'slide' : 'page'} ${i + 1}`);
      dot.addEventListener('click', () => this.scrollTrackTo(this.offsetForDot(i, count)));
      this.dotsContainer.appendChild(dot);
    }

    this.updateActiveDot();
  }

  offsetForDot(index, count) {
    if (this.loop) {
      this.recentre(false);
      return this.setWidth + index * this.cardStep();
    }
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    return count > 1 ? (index / (count - 1)) * maxScroll : 0;
  }

  updateActiveDot() {
    if (!this.dotsContainer) return;
    const dots = Array.from(this.dotsContainer.children);
    if (dots.length === 0) return;

    let current;
    if (this.loop) {
      const step = this.cardStep();
      const offset = step > 0 ? Math.round((this.track.scrollLeft - this.setWidth) / step) : 0;
      current = ((offset % dots.length) + dots.length) % dots.length;
    } else {
      // Spread the dots over the distance the track can actually travel, so the
      // last dot lights up at the end of the scroll rather than a page beyond it.
      const maxScroll = this.track.scrollWidth - this.track.clientWidth;
      const progress = maxScroll > 0 ? this.track.scrollLeft / maxScroll : 0;
      current = Math.round(progress * (dots.length - 1));
    }

    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  }
}

customElements.define('scroll-carousel', ScrollCarousel);
