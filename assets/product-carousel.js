class ProductCarousel extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('.product-carousel_wrapper_controls_tabs_tab'));
    this.panels = Array.from(this.querySelectorAll('.product-carousel_wrapper_stage_panel'));
    this.prevButton = this.querySelector('.product-carousel_wrapper_stage_prev');
    this.nextButton = this.querySelector('.product-carousel_wrapper_stage_next');
    this.dotsContainer = this.querySelector('[data-dots]');
    this.viewAllLinks = Array.from(this.querySelectorAll('[data-view-all-link]'));
    this.activeIndex = 0;

    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.selectTab(index));
    });
    this.prevButton?.addEventListener('click', () => this.scrollByPage(-1));
    this.nextButton?.addEventListener('click', () => this.scrollByPage(1));

    this.buildDots();
    this.activePanel?.addEventListener('scroll', () => this.updateActiveDot(), { passive: true });
    window.addEventListener('resize', () => this.buildDots());
  }

  get activePanel() {
    return this.panels[this.activeIndex]?.querySelector(
      '.product-carousel_wrapper_stage_panel_track',
    );
  }

  selectTab(index) {
    if (index === this.activeIndex) return;
    this.activeIndex = index;

    this.tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-selected', String(i === index));
    });
    this.panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === index);
      panel.toggleAttribute('hidden', i !== index);
    });

    const url = this.tabs[index]?.dataset.collectionUrl;
    if (url) {
      this.viewAllLinks.forEach((link) => {
        link.href = url;
      });
    }

    this.buildDots();
  }

  scrollByPage(direction) {
    const track = this.activePanel;
    if (!track) return;
    const pageWidth = track.clientWidth;
    const maxScroll = track.scrollWidth - track.clientWidth;
    let target = track.scrollLeft + pageWidth * direction;

    if (direction > 0 && target >= maxScroll - 1) {
      target = 0;
    } else if (direction < 0 && target <= 1) {
      target = maxScroll;
    }

    if (window.gsap) {
      gsap.to(track, { scrollLeft: target, duration: 0.3, ease: 'power2.out' });
    } else {
      track.scrollTo({ left: target, behavior: 'smooth' });
    }
  }

  buildDots() {
    const track = this.activePanel;
    if (!track || !this.dotsContainer) return;

    const pageWidth = track.clientWidth;
    const pageCount = pageWidth > 0 ? Math.ceil(track.scrollWidth / pageWidth) : 1;

    this.dotsContainer.innerHTML = '';
    if (pageCount <= 1) return;

    for (let i = 0; i < pageCount; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'product-carousel_wrapper_dots_dot';
      if (i === 0) dot.classList.add('is-active');
      dot.setAttribute('aria-label', `Go to page ${i + 1}`);
      dot.addEventListener('click', () => {
        const target = i * pageWidth;
        if (window.gsap) {
          gsap.to(track, { scrollLeft: target, duration: 0.3, ease: 'power2.out' });
        } else {
          track.scrollTo({ left: target, behavior: 'smooth' });
        }
      });
      this.dotsContainer.appendChild(dot);
    }
  }

  updateActiveDot() {
    const track = this.activePanel;
    if (!track || !this.dotsContainer) return;
    const pageWidth = track.clientWidth;
    const currentPage = pageWidth > 0 ? Math.round(track.scrollLeft / pageWidth) : 0;
    Array.from(this.dotsContainer.children).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentPage);
    });
  }
}

customElements.define('product-carousel', ProductCarousel);
