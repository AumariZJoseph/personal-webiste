(() => {
  // ---- Navbar: transparent over hero, solid white once scrolled ----
  const nav = document.getElementById('nav');
  const setNavState = () => {
    const scrolled = window.scrollY > 40;
    nav.setAttribute('data-state', scrolled ? 'solid' : 'transparent');
  };
  setNavState();
  window.addEventListener('scroll', setNavState, { passive: true });

  // ---- Hero globe: a pinned, scroll-linked camera move on larger screens ----
  const hero = document.querySelector('.hero');
  const heroStage = document.querySelector('.hero__stage');
  const globe = document.querySelector('.hero__globe-art');
  const globeFrame = document.querySelector('.hero__globe');
  const desktopViewport = window.matchMedia('(min-width: 961px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (hero && heroStage && globe && globeFrame) {
    let globeVisible = true;
    let animationFrame = null;
    let targetProgress = 0;
    let renderedProgress = 0;
    let hasRendered = false;

    const clamp = (value) => Math.min(1, Math.max(0, value));
    const smootherstep = (value) => {
      const t = clamp(value);
      return t * t * t * (t * (t * 6 - 15) + 10);
    };
    const lerp = (from, to, amount) => from + (to - from) * amount;
    const cameraStops = [
      { at: 0,    scale: 1,    x: 0,  y: 0,  opacity: .72 },
      { at: .18,  scale: 1.08, x: 3,  y: .5, opacity: .72 },
      { at: .50,  scale: 1.8,  x: 17, y: 3,  opacity: .68 },
      { at: .78,  scale: 2.9,  x: 38, y: 6.5, opacity: .61 },
      { at: 1,    scale: 4.35, x: 60, y: 10, opacity: .54 }
    ];
    const canAnimateGlobe = () => desktopViewport.matches && !reducedMotion.matches;

    const getCamera = (progress) => {
      let endIndex = cameraStops.findIndex((stop) => progress <= stop.at);
      if (endIndex <= 0) return cameraStops[0];
      if (endIndex === -1) return cameraStops[cameraStops.length - 1];

      const start = cameraStops[endIndex - 1];
      const end = cameraStops[endIndex];
      const amount = smootherstep((progress - start.at) / (end.at - start.at));
      return {
        scale: lerp(start.scale, end.scale, amount),
        x: lerp(start.x, end.x, amount),
        y: lerp(start.y, end.y, amount),
        opacity: lerp(start.opacity, end.opacity, amount)
      };
    };

    const paintGlobe = () => {
      animationFrame = null;

      if (!canAnimateGlobe()) {
        globe.style.removeProperty('--globe-scale');
        globe.style.removeProperty('--globe-x');
        globe.style.removeProperty('--globe-y');
        globeFrame.style.removeProperty('--globe-opacity');
        hasRendered = false;
        return;
      }

      if (!hasRendered) {
        renderedProgress = targetProgress;
        hasRendered = true;
      } else {
        renderedProgress = lerp(renderedProgress, targetProgress, .16);
      }

      const camera = getCamera(renderedProgress);
      globe.style.setProperty('--globe-scale', camera.scale.toFixed(4));
      globe.style.setProperty('--globe-x', `${camera.x.toFixed(3)}%`);
      globe.style.setProperty('--globe-y', `${camera.y.toFixed(3)}%`);
      globeFrame.style.setProperty('--globe-opacity', camera.opacity.toFixed(3));

      if (Math.abs(targetProgress - renderedProgress) > .00025) {
        animationFrame = requestAnimationFrame(paintGlobe);
      }
    };

    const measureGlobe = () => {
      if (!canAnimateGlobe()) {
        if (!animationFrame) animationFrame = requestAnimationFrame(paintGlobe);
        return;
      }

      const bounds = hero.getBoundingClientRect();
      const scrollRange = Math.max(hero.offsetHeight - window.innerHeight, 1);
      targetProgress = clamp(-bounds.top / scrollRange);
      if (globeVisible && !animationFrame) animationFrame = requestAnimationFrame(paintGlobe);
    };

    const globeObserver = new IntersectionObserver(([entry]) => {
      globeVisible = entry.isIntersecting;
      if (globeVisible) measureGlobe();
    }, { threshold: 0 });

    globeObserver.observe(hero);
    measureGlobe();
    window.addEventListener('scroll', measureGlobe, { passive: true });
    window.addEventListener('resize', measureGlobe, { passive: true });
    desktopViewport.addEventListener('change', measureGlobe);
    reducedMotion.addEventListener('change', measureGlobe);
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
