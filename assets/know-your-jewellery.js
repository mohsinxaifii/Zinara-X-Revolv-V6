class FlipCard extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', () => this.classList.toggle('is-flipped'));
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.classList.toggle('is-flipped');
      }
    });
  }
}

customElements.define('flip-card', FlipCard);
