class FlipCard extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', () => this.classList.toggle('is-flipped'));
  }
}

customElements.define('flip-card', FlipCard);
