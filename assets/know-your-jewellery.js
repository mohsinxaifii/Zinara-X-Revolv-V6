class MythFactStack extends HTMLElement {
  connectedCallback() {
    this.cards = Array.from(this.querySelectorAll('[data-flip-card]'));
    this.dotsContainer = this.closest('.know-your-jewellery_wrapper_grid_diamonds')?.querySelector(
      '[data-flip-dots]',
    );
    this.activeIndex = 0;

    this.cards.forEach((card, index) => {
      card.addEventListener('click', () => {
        if (index === this.activeIndex) {
          card.classList.toggle('is-flipped');
          return;
        }
        this.goTo(index);
      });
    });

    this.buildDots();
  }

  goTo(index) {
    this.cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
      card.classList.remove('is-flipped');
    });
    this.activeIndex = index;
    if (this.dotsContainer) {
      Array.from(this.dotsContainer.children).forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
      });
    }
  }

  buildDots() {
    if (!this.dotsContainer || this.cards.length < 2) return;
    this.dotsContainer.innerHTML = '';
    this.cards.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'scroll-carousel_dot';
      if (index === 0) dot.classList.add('is-active');
      dot.setAttribute('aria-label', `Show card ${index + 1}`);
      dot.addEventListener('click', () => this.goTo(index));
      this.dotsContainer.appendChild(dot);
    });
  }
}

customElements.define('myth-fact-stack', MythFactStack);
