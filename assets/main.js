(function () {
  'use strict';

  // Clickjacking defence: GitHub Pages can't send X-Frame-Options or a
  // frame-ancestors header. If framed, hide the page (browsers often block
  // the break-out below) and try to break out anyway.
  if (window.top !== window.self) {
    document.documentElement.classList.add('kk-framed');
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
  // Joke cookie note: shown once per visitor, then remembered (localStorage, not a cookie).
  var note = document.querySelector('.cookie-note');
  if (note) {
    var nk = 'kk-cookie-note', seen = null;
    try { seen = localStorage.getItem(nk); } catch (e) { }
    if (!seen) {
      var closeNote = function () {
        try { localStorage.setItem(nk, 'dismissed'); } catch (e) { }
        note.classList.add('cookie-out');
        setTimeout(function () { note.hidden = true; }, 260);
      };
      note.querySelector('.cookie-ok').addEventListener('click', closeNote);
      note.querySelector('.cookie-coffee').addEventListener('click', function () {
        try { localStorage.setItem(nk, 'dismissed'); } catch (e) { }
        note.querySelector('.cookie-msg').textContent = 'Excellent taste. \u2615 Filter coffee it is. Still no cookies though.';
        note.querySelector('.cookie-actions').hidden = true;
        setTimeout(closeNote, 1800);
      });
      setTimeout(function () { note.hidden = false; }, 700);
    }
  }

  // Returning-visitor note: counts visits (one per browser session) in localStorage.
  var wb = document.querySelector('.welcome-note');
  if (wb) {
    var vk = 'kk-visits', visits = 0;
    try {
      visits = parseInt(localStorage.getItem(vk), 10) || 0;
      if (!sessionStorage.getItem(vk)) {
        visits += 1;
        localStorage.setItem(vk, String(visits));
        sessionStorage.setItem(vk, '1');
      }
    } catch (e) { visits = 0; }
    if (visits >= 2) {
      var wbMsg = wb.querySelector('.welcome-msg');
      var hideWb = function () {
        if (wb.hidden) return;
        wb.classList.add('welcome-out');
        setTimeout(function () { wb.hidden = true; }, 260);
      };
      if (visits === 2) {
        wbMsg.textContent = 'Welcome back! Visit #2. Are you a recruiter or just a fan of canteen coffee?';
      } else if (visits === 3) {
        wbMsg.textContent = 'Visit #3. Okay, this is becoming a habit. Same time tomorrow?';
      } else {
        wbMsg.textContent = 'Visit #' + visits + '. You\u2019re officially a regular. ';
        var hello = document.createElement('a');
        hello.href = '#contact';
        hello.textContent = 'Just say hello \u2192';
        hello.addEventListener('click', hideWb);
        wbMsg.appendChild(hello);
      }
      wb.querySelector('.welcome-close').addEventListener('click', hideWb);
      setTimeout(function () {
        wb.hidden = false;
        setTimeout(hideWb, 8000);
      }, 900);
    }
  }

})();
