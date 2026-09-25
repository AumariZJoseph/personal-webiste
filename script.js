(() => {
  // ---- Navbar: transparent over hero, solid white once scrolled ----
  const nav = document.getElementById('nav');
  const setNavState = () => {
    const scrolled = window.scrollY > 40;
    nav.setAttribute('data-state', scrolled ? 'solid' : 'transparent');
  };
  setNavState();
  window.addEventListener('scroll', setNavState, { passive: true });

  // ---- Hero globe: sticky, transform-only scroll sequence on larger screens ----
  const hero = document.querySelector('.hero');
  const heroStage = document.querySelector('.hero__stage');
  const globe = document.querySelector('.hero__globe-art');
  const desktopViewport = window.matchMedia('(min-width: 761px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (hero && heroStage && globe) {
    let globeVisible = true;
    let globeFrame = null;

    const clamp = (value) => Math.min(1, Math.max(0, value));
    const smoothstep = (value) => {
      const t = clamp(value);
      return t * t * (3 - 2 * t);
    };
    const stage = (progress, start, end, from, to) => {
      return from + (to - from) * smoothstep((progress - start) / (end - start));
    };
    const canAnimateGlobe = () => desktopViewport.matches && !reducedMotion.matches;

    const updateGlobe = () => {
      globeFrame = null;
      if (!canAnimateGlobe()) {
        globe.style.removeProperty('--globe-scale');
        globe.style.removeProperty('--globe-x');
        globe.style.removeProperty('--globe-y');
        globe.style.removeProperty('--caribbean-detail');
        globe.style.removeProperty('--world-detail');
        return;
      }

      const bounds = hero.getBoundingClientRect();
      const scrollRange = Math.max(hero.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-bounds.top / scrollRange);
      const scale = progress < .24
        ? stage(progress, 0, .24, 1, 1.32)
        : progress < .62
          ? stage(progress, .24, .62, 1.32, 2.18)
          : stage(progress, .62, 1, 2.18, 3.7);
      const drift = smoothstep(progress);
      const caribbeanDetail = smoothstep((progress - .48) / .52);

      globe.style.setProperty('--globe-scale', scale.toFixed(3));
      globe.style.setProperty('--globe-x', `${(23 * drift).toFixed(2)}%`);
      globe.style.setProperty('--globe-y', `${(25 * drift).toFixed(2)}%`);
      globe.style.setProperty('--caribbean-detail', caribbeanDetail.toFixed(3));
      globe.style.setProperty('--world-detail', (1 - (.65 * caribbeanDetail)).toFixed(3));
    };

    const requestGlobeUpdate = () => {
      if (globeVisible && !globeFrame) globeFrame = requestAnimationFrame(updateGlobe);
    };
    const globeObserver = new IntersectionObserver(([entry]) => {
      globeVisible = entry.isIntersecting;
      if (globeVisible) requestGlobeUpdate();
    }, { threshold: 0 });

    globeObserver.observe(hero);
    requestGlobeUpdate();
    window.addEventListener('scroll', requestGlobeUpdate, { passive: true });
    window.addEventListener('resize', requestGlobeUpdate, { passive: true });
    desktopViewport.addEventListener('change', requestGlobeUpdate);
    reducedMotion.addEventListener('change', requestGlobeUpdate);
  }

  // ---- Mobile menu ----
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobile-menu');

  const closeMenu = () => {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    menu.hidden = true;
  };
  const openMenu = () => {
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    menu.hidden = false;
  };

  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      burger.focus();
    }
  });
})();
