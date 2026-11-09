(function () {
  'use strict';

  // Clickjacking defence: GitHub Pages can't send X-Frame-Options or a
  // frame-ancestors header, so break out if another site frames this page.
  if (window.top !== window.self) {
    try { window.top.location.replace(window.location.href); } catch (e) { }
  }

  // Theme toggle. Only accept known values from storage.
  var r = document.documentElement, k = 'kk-theme', t = 'light';
  try {
    var saved = localStorage.getItem(k);
    if (saved === 'light' || saved === 'dark') t = saved;
  } catch (e) { }
  r.dataset.theme = t;
  var tg = document.getElementById('tg');
  if (tg) {
    tg.addEventListener('click', function () {
      var n = r.dataset.theme === 'dark' ? 'light' : 'dark';
      r.dataset.theme = n;
      try { localStorage.setItem(k, n); } catch (e) { }
    });
  }

  // Story tabs.
  var storyBtns = document.querySelectorAll('.story-btn');
  var storyPanes = document.querySelectorAll('.story-pane');
  storyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = this.getAttribute('data-story');
      storyBtns.forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      storyPanes.forEach(function (p) {
        var active = p.id === 'pane-' + mode;
        p.classList.toggle('active', active);
        if (active) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
    });
  });

  // Missing-image fallback (replaces inline onerror="" handlers, which a
  // strict Content-Security-Policy blocks).
  document.querySelectorAll('.media img').forEach(function (img) {
    var mark = function () { img.parentNode.classList.add('missing'); };
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener('error', mark);
  });

  // Email: assembled at runtime so simple scrapers don't harvest it.
  document.querySelectorAll('a[data-mail-user]').forEach(function (a) {
    var addr = a.getAttribute('data-mail-user') + '@' + a.getAttribute('data-mail-domain');
    a.href = 'mailto:' + addr;
    a.textContent = addr;
  });
})();
