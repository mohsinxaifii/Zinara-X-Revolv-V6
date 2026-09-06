/**
 * Native scroll-reveal foundation for the Zinara theme.
 * Elements opt in with `data-animate` (+ optional `data-animate-delay` in ms).
 * Respects prefers-reduced-motion and Shopify theme-editor section reloads.
 */
const ANIMATE_ATTR = 'data-animate';
const VISIBLE_CLASS = 'is-visible';

function revealElement(element) {
  const delay = Number(element.getAttribute('data-animate-delay')) || 0;
  window.setTimeout(() => element.classList.add(VISIBLE_CLASS), delay);
}

function initScrollReveal(root = document) {
  const elements = Array.from(root.querySelectorAll(`[${ANIMATE_ATTR}]`));
  if (elements.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((element) => element.classList.add(VISIBLE_CLASS));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );

  elements.forEach((element) => observer.observe(element));
}

document.addEventListener('DOMContentLoaded', () => initScrollReveal());

if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => initScrollReveal(event.target));
}
