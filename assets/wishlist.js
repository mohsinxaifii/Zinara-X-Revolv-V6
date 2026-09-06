(() => {
  const STORAGE_KEY = 'zinara:wishlist';

  function getWishlist() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function setWishlist(ids) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      /* localStorage unavailable (private mode, etc.) — wishlist just won't persist */
    }
  }

  function syncButton(button) {
    const id = button.dataset.productId;
    const isActive = getWishlist().includes(id);
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }

  function toggle(button) {
    const id = button.dataset.productId;
    const wishlist = getWishlist();
    const index = wishlist.indexOf(id);
    if (index === -1) {
      wishlist.push(id);
    } else {
      wishlist.splice(index, 1);
    }
    setWishlist(wishlist);
    syncButton(button);
  }

  function init(root = document) {
    root.querySelectorAll('[data-wishlist-toggle]').forEach(syncButton);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wishlist-toggle]');
    if (!button) return;
    event.preventDefault();
    toggle(button);
  });

  document.addEventListener('DOMContentLoaded', () => init());
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (event) => init(event.target));
  }
})();
