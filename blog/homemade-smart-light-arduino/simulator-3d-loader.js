(() => {
  const start = () => {
    const section = document.getElementById('simulator-3d');
    const launchButton = document.getElementById('launch-3d');
    const status = document.getElementById('lab3d-load-status');
    const fallback = document.getElementById('lab3d-fallback');
    const shell = document.getElementById('lab3d-shell');
    const expandButton = document.getElementById('lab3d-expand');

    if (!section || !launchButton || !status || !fallback || !shell || !expandButton) return;

    let launchPromise = null;
    let expanded = false;

    const setExpanded = (next, { focus = false } = {}) => {
      expanded = Boolean(next);
      section.classList.toggle('is-expanded', expanded);
      document.body.classList.toggle('lab3d-overlay-open', expanded);
      expandButton.setAttribute('aria-pressed', String(expanded));
      expandButton.textContent = expanded ? 'Return to article' : 'Expand lab';
      expandButton.setAttribute('aria-label', expanded ? 'Return the 3D lab to the article' : 'Expand the 3D lab');
      if (focus) expandButton.focus({ preventScroll: true });
    };

    const supportsWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return Boolean(
          window.WebGLRenderingContext
          && (canvas.getContext('webgl2') || canvas.getContext('webgl'))
        );
      } catch {
        return false;
      }
    };

    const showFallback = (message) => {
      section.dataset.state = 'error';
      status.textContent = message;
      fallback.hidden = false;
      launchButton.disabled = true;
      launchButton.setAttribute('aria-disabled', 'true');
    };

    const launch = () => {
      if (launchPromise) return launchPromise;

      if (!supportsWebGL()) {
        showFallback('The 3D lab is unavailable in this browser. The documented build guide remains available below.');
        launchPromise = Promise.resolve(false);
        return launchPromise;
      }

      section.dataset.state = 'loading';
      status.textContent = 'Loading the 3D workbench…';
      launchButton.disabled = true;
      launchButton.setAttribute('aria-busy', 'true');

      launchPromise = import('./simulator-3d.js')
        .then((module) => {
          if (typeof module.initSmartLight3D !== 'function') {
            throw new TypeError('The 3D lab module is missing its initializer.');
          }
          return module.initSmartLight3D(section);
        })
        .then(() => {
          shell.hidden = false;
          section.dataset.state = 'ready';
          status.textContent = '3D workbench ready.';
          expandButton.hidden = false;
          setExpanded(true, { focus: true });
          launchButton.remove();
          return true;
        })
        .catch((error) => {
          console.error('Unable to initialize the smart-light 3D lab.', error);
          showFallback('The 3D lab could not be loaded. The documented build guide remains available below.');
          return false;
        });

      return launchPromise;
    };

    launchButton.addEventListener('click', launch, { once: true });
    expandButton.addEventListener('click', () => setExpanded(!expanded, { focus: true }));
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !expanded) return;
      setExpanded(false, { focus: true });
    });

    const search = new URLSearchParams(window.location.search);
    if (search.get('lab3d') === 'auto' || window.__THREE_GAME_AUTO_LAUNCH__ === true) {
      window.requestAnimationFrame(() => launchButton.click());
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
