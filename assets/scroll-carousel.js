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
    window.addEventListener('resize', () => this.buildDots());
  }

  scrollByPage(direction) {
    const pageWidth = this.track.clientWidth;
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    let target = this.track.scrollLeft + pageWidth * direction;
    if (target < 0) target = maxScroll;
    if (target > maxScroll) target = 0;

    if (window.gsap) {
      gsap.to(this.track, { scrollLeft: target, duration: 0.3, ease: 'power2.out' });
    } else {
      this.track.scrollTo({ left: target, behavior: 'smooth' });
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
        const target = i * pageWidth;
        if (window.gsap) {
          gsap.to(this.track, { scrollLeft: target, duration: 0.3, ease: 'power2.out' });
        } else {
          this.track.scrollTo({ left: target, behavior: 'smooth' });
        }
      });
      this.dotsContainer.appendChild(dot);
    }
  }

  updateActiveDot() {
    if (!this.dotsContainer) return;
    const pageWidth = this.track.clientWidth;
    const currentPage = pageWidth > 0 ? Math.round(this.track.scrollLeft / pageWidth) : 0;
    Array.from(this.dotsContainer.children).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentPage);
    });
  }
}

customElements.define('scroll-carousel', ScrollCarousel);
