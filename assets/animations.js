/**
 * Motion choreography for the Zinara theme, on GSAP + ScrollTrigger.
 *
 * Covers the things CSS transitions cannot express: scroll reveals that stagger
 * across a section, dialogs that have to finish animating *before* the browser
 * pulls them out of the top layer, and accordions that need their own height
 * measured before they can travel to it. Hover, focus and press state stay in
 * motion.css, where they cost nothing per element.
 *
 * Everything degrades. GSAP arrives from a CDN, so each entry point checks for
 * it and falls back to showing content outright; the `motion` class the layout
 * sets before paint is cleared here (or by a timeout) so a blocked script can
 * never leave a section invisible.
 */
(() => {
  const ROOT = document.documentElement;
  const REVEAL_ATTR = 'data-animate';
  const VISIBLE_CLASS = 'is-visible';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const hasGsap = () => typeof window.gsap !== 'undefined';

  /** Show everything and step out of the way. */
  function revealAll(root = document) {
    root.querySelectorAll(`[${REVEAL_ATTR}]`).forEach((el) => el.classList.add(VISIBLE_CLASS));
    ROOT.classList.remove('motion');
  }

  /* ----------------------------------------------------------- reveals */

  /**
   * Elements opt in with `data-animate`, optionally `data-animate-delay` (ms)
   * and `data-animate-from` (up | down | left | right | scale | fade).
   *
   * Direct children of a `data-animate-group` are staggered as one batch, which
   * is what makes a grid of cards read as a wave rather than twelve unrelated
   * fades.
   */
  function initReveals(root = document) {
    const elements = Array.from(root.querySelectorAll(`[${REVEAL_ATTR}]:not(.${VISIBLE_CLASS})`));
    if (elements.length === 0) return;

    if (reduced.matches || !hasGsap()) {
      revealAll(root);
      return;
    }

    const { gsap } = window;

    const offsetFor = (el) => {
      const distance = Number(el.getAttribute('data-animate-distance')) || 28;
      switch (el.getAttribute('data-animate-from')) {
        case 'down':
          return { y: -distance };
        case 'left':
          return { x: -distance };
        case 'right':
          return { x: distance };
        case 'scale':
          return { scale: 0.94 };
        case 'fade':
          return {};
        default:
          return { y: distance };
      }
    };

    // Group members animate together, so they are pulled out of the individual
    // pass and handled by their container's single trigger.
    const grouped = new Set();
    root.querySelectorAll('[data-animate-group]').forEach((group) => {
      const members = Array.from(group.querySelectorAll(`:scope > [${REVEAL_ATTR}]`));
      if (members.length === 0) return;
      members.forEach((member) => grouped.add(member));

      gsap.set(members, { opacity: 0, ...offsetFor(members[0]) });
      gsap.to(members, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: Number(group.getAttribute('data-animate-stagger')) || 0.08,
        scrollTrigger: { trigger: group, start: 'top 88%', once: true },
        onStart: () => members.forEach((m) => m.classList.add(VISIBLE_CLASS)),
        onComplete: () => gsap.set(members, { clearProps: 'transform' }),
      });
    });

    elements
      .filter((el) => !grouped.has(el))
      .forEach((el) => {
        gsap.set(el, { opacity: 0, ...offsetFor(el) });
        gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.7,
          delay: (Number(el.getAttribute('data-animate-delay')) || 0) / 1000,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onStart: () => el.classList.add(VISIBLE_CLASS),
          onComplete: () => gsap.set(el, { clearProps: 'transform' }),
        });
      });

    ROOT.classList.remove('motion');
  }

  /* ----------------------------------------------------------- dialogs */

  /**
   * `close()` removes a dialog from the top layer immediately, so an exit
   * animation has to run first and call the real close afterwards. `close` is
   * wrapped per dialog rather than globally so anything already listening for
   * the `close` event still fires exactly once, at the end.
   */
  function initDialogs(root = document) {
    if (!hasGsap() || reduced.matches) return;
    const { gsap } = window;

    root.querySelectorAll('dialog:not([data-motion-bound])').forEach((dialog) => {
      dialog.setAttribute('data-motion-bound', '');

      // A sidesheet slides in from the edge it is pinned to; anything centred
      // scales up from just under full size.
      const panel =
        dialog.querySelector('.pdp-sheet_panel, .variant-drawer_panel') || null;
      const centred =
        dialog.querySelector('.pdp-modal_panel, .pdp-lightbox_body, .pdp-ugc-box_reel') || null;
      const target = panel || centred || dialog.firstElementChild;
      if (!target) return;

      const enter = panel ? { x: 40 } : { scale: 0.96 };

      const nativeShow = dialog.showModal.bind(dialog);
      const nativeClose = dialog.close.bind(dialog);
      let closing = false;

      dialog.showModal = (...args) => {
        nativeShow(...args);
        gsap.killTweensOf(target);
        gsap.fromTo(
          target,
          { opacity: 0, ...enter },
          { opacity: 1, x: 0, scale: 1, duration: 0.34, ease: 'power3.out', clearProps: 'transform' },
        );
      };

      dialog.close = (...args) => {
        if (closing || !dialog.open) return nativeClose(...args);
        closing = true;
        gsap.killTweensOf(target);
        gsap.to(target, {
          opacity: 0,
          ...enter,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => {
            closing = false;
            gsap.set(target, { clearProps: 'opacity,transform' });
            nativeClose(...args);
          },
        });
      };

      // Esc bypasses close() entirely, so the panel is reset for next time.
      dialog.addEventListener('close', () => {
        closing = false;
        gsap.set(target, { clearProps: 'opacity,transform' });
      });
    });
  }

  /* --------------------------------------------------------- accordions */

  /**
   * <details> snaps open because the browser has no transition for it. The body
   * is measured and travelled to instead, with the close deferred until the
   * collapse finishes so the content stays visible on the way down.
   */
  function initAccordions(root = document) {
    if (!hasGsap() || reduced.matches) return;
    const { gsap } = window;

    root
      .querySelectorAll('details:not([data-motion-bound])')
      .forEach((details) => {
        const summary = details.querySelector('summary');
        const body = summary?.nextElementSibling;
        if (!summary || !body) return;
        details.setAttribute('data-motion-bound', '');

        summary.addEventListener('click', (event) => {
          event.preventDefault();
          if (details.dataset.motionBusy === 'true') return;
          details.dataset.motionBusy = 'true';

          if (!details.open) {
            details.open = true;
            gsap.fromTo(
              body,
              { height: 0, opacity: 0 },
              {
                height: 'auto',
                opacity: 1,
                duration: 0.36,
                ease: 'power2.out',
                onComplete: () => {
                  gsap.set(body, { clearProps: 'height,opacity,overflow' });
                  details.dataset.motionBusy = 'false';
                },
              },
            );
          } else {
            gsap.to(body, {
              height: 0,
              opacity: 0,
              duration: 0.28,
              ease: 'power2.in',
              onComplete: () => {
                details.open = false;
                gsap.set(body, { clearProps: 'height,opacity,overflow' });
                details.dataset.motionBusy = 'false';
              },
            });
          }
        });
      });
  }

  /* -------------------------------------------------------------- boot */

  function init(root = document) {
    initReveals(root);
    initDialogs(root);
    initAccordions(root);
  }

  function boot() {
    if (reduced.matches) {
      revealAll();
      return;
    }

    if (hasGsap()) {
      if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
      init();
      return;
    }

    // GSAP is deferred from a CDN and may simply not arrive. Poll briefly, then
    // give up and show everything rather than waiting forever.
    let waited = 0;
    const timer = setInterval(() => {
      waited += 60;
      if (hasGsap()) {
        clearInterval(timer);
        if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
        init();
      } else if (waited >= 1800) {
        clearInterval(timer);
        revealAll();
      }
    }, 60);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-run for sections the theme editor swaps in after load.
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (event) => init(event.target));
  }

  reduced.addEventListener('change', (event) => {
    if (event.matches) revealAll();
  });
})();
