(() => {
  const button = document.getElementById('load-comments');
  const thread = document.getElementById('comments-thread');

  if (!button || !thread) return;

  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = 'Loading comments…';

    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('repo', 'AumariZJoseph/personal-webiste');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-light');

    script.addEventListener('load', () => button.remove());
    script.addEventListener('error', () => {
      button.remove();
      const message = document.createElement('p');
      message.className = 'comments__error';
      message.append('The comment thread could not be loaded. You can still join the conversation on ');
      const link = document.createElement('a');
      link.href = 'https://github.com/AumariZJoseph/personal-webiste/issues';
      link.textContent = 'GitHub';
      message.append(link, '.');
      thread.replaceChildren(message);
    });

    thread.append(script);
  }, { once: true });
})();
