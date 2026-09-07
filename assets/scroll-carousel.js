class ScrollCarousel extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-track]');
    this.prevButtons = Array.from(this.querySelectorAll('[data-prev]'));
    this.nextButtons = Array.from(this.querySelectorAll('[data-next]'));
    this.dotsContainer = this.querySelector('[data-dots]');
    if (!this.track) return;

    this.prevButtons.forEach((button) =>
      button.addEventListener('click', () => this.scrollByPage(-1)),
    );
    this.nextButtons.forEach((button) =>
      button.addEventListener('click', () => this.scrollByPage(1)),
    );

    this.buildDots();
    this.track.addEventListener('scroll', () => this.updateActiveDot(), { passive: true });

    // Rebuild on real size changes, not just window resize: connectedCallback can
    // run before the section stylesheet has applied, and a track measured then
    // looks like it fits on one page, so the dots would never appear at all.
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRebuild());
      this.resizeObserver.observe(this.track);
      Array.from(this.track.children).forEach((child) => this.resizeObserver.observe(child));
    } else {
      window.addEventListener('resize', () => this.buildDots());
    }
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.rebuildFrame) cancelAnimationFrame(this.rebuildFrame);
  }

  scheduleRebuild() {
    if (this.rebuildFrame) cancelAnimationFrame(this.rebuildFrame);
    this.rebuildFrame = requestAnimationFrame(() => {
      this.rebuildFrame = null;
      this.buildDots();
    });
  }

  /* Distance between two cards, so a move always lands on a snap point. */
  cardStep() {
    const items = this.track.children;
    if (items.length < 2) return 0;
    const first = items[0].getBoundingClientRect();
    const second = items[1].getBoundingClientRect();
    return Math.max(0, second.left - first.left);
  }

  scrollByPage(direction) {
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    if (maxScroll <= 0) return;

    const step = this.cardStep();
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
      gsap.to(this.track, { scrollLeft: left, duration: 0.3, ease: 'power2.out' });
    } else {
      this.track.scrollTo({ left, behavior: 'smooth' });
    }
  }

  buildDots() {
    if (!this.dotsContainer) return;
    const pageWidth = this.track.clientWidth;
    const pageCount = pageWidth > 0 ? Math.ceil(this.track.scrollWidth / pageWidth) : 1;

    this.dotsContainer.innerHTML = '';
    if (pageCount <= 1) return;

    for (let i = 0; i < pageCount; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'scroll-carousel_dot';
      if (i === 0) dot.classList.add('is-active');
      dot.setAttribute('aria-label', `Go to page ${i + 1}`);
      dot.addEventListener('click', () => {
        const maxScroll = this.track.scrollWidth - this.track.clientWidth;
        this.scrollTrackTo((i / (pageCount - 1)) * maxScroll);
      });
      this.dotsContainer.appendChild(dot);
    }

    this.updateActiveDot();
  }

  updateActiveDot() {
    if (!this.dotsContainer) return;
    const dots = Array.from(this.dotsContainer.children);
    if (dots.length === 0) return;

    // Spread the dots over the distance the track can actually travel, so the
    // last dot lights up at the end of the scroll rather than a page beyond it.
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    const progress = maxScroll > 0 ? this.track.scrollLeft / maxScroll : 0;
    const current = Math.round(progress * (dots.length - 1));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  }
}

customElements.define('scroll-carousel', ScrollCarousel);
