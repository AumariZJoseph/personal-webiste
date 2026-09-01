(() => {
  // ---- Navbar: transparent over hero, solid white once scrolled ----
  const nav = document.getElementById('nav');
  const setNavState = () => {
    const scrolled = window.scrollY > 40;
    nav.setAttribute('data-state', scrolled ? 'solid' : 'transparent');
  };
  setNavState();
  window.addEventListener('scroll', setNavState, { passive: true });

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
