(function() {
  var toggle = document.getElementById('theme-toggle');
  var html = document.documentElement;

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    toggle.textContent = theme === 'dark' ? '☀' : '☾';
    toggle.setAttribute('aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem('theme', theme);
    syncGiscus(theme);
  }

  function syncGiscus(theme) {
    var frame = document.querySelector('iframe.giscus-frame');
    if (!frame) return;
    var giscusTheme = theme === 'dark' ? 'dark_dimmed' : 'light';
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: giscusTheme } } },
      'https://giscus.app'
    );
  }

  var saved = localStorage.getItem('theme');
  if (saved) {
    setTheme(saved);
  } else if (window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  }

  toggle.addEventListener('click', function() {
    var current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
})();
