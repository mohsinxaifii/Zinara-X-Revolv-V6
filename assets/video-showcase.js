class VideoCard extends HTMLElement {
  connectedCallback() {
    this.playButton = this.querySelector('[data-play-video]');
    this.videoWrap = this.querySelector('.video-showcase_wrapper_track_item_video');
    this.poster = this.querySelector('.video-showcase_wrapper_track_item_poster');
    if (!this.playButton || !this.videoWrap) return;

    this.playButton.addEventListener('click', () => {
      this.poster?.setAttribute('hidden', '');
      this.playButton.setAttribute('hidden', '');
      this.videoWrap.removeAttribute('hidden');
      this.videoWrap.querySelector('video')?.play();
    });
  }
}

customElements.define('video-card', VideoCard);
