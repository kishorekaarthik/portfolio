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
    var subject = a.getAttribute('data-mail-subject');
    var body = a.getAttribute('data-mail-body');
    var query = [];
    if (subject) query.push('subject=' + encodeURIComponent(subject));
    if (body) query.push('body=' + encodeURIComponent(body));
    a.href = 'mailto:' + addr + (query.length ? '?' + query.join('&') : '');
    if (a.classList.contains('mail')) a.textContent = addr;
  });

  // Recruiter to-do list: tick an item's box when it's clicked.
  document.querySelectorAll('.todo-link, .todo-wa').forEach(function (a) {
    a.addEventListener('click', function () {
      var row = a.closest('.todo-row');
      if (row) row.classList.add('done');
    });
  });

  // Paper-plane sign-off on Say hello: only useful once the pre-filled mailto link is built above.
  var signoff = document.querySelector('.wave-signoff');
  if (signoff) signoff.hidden = false;
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

  // Visit note: a welcome on the first visit, then a counted line on each return.
  // One visit = one browser session; the tally lives only in this browser (localStorage).
  var wb = document.querySelector('.welcome-note');
  if (wb) {
    var vk = 'kk-visits', visits = 0, newVisit = false;
    try {
      visits = parseInt(localStorage.getItem(vk), 10) || 0;
      if (!sessionStorage.getItem(vk)) {
        visits += 1;
        newVisit = true;
        localStorage.setItem(vk, String(visits));
        sessionStorage.setItem(vk, '1');
      }
    } catch (e) { newVisit = false; }

    var LINES = {
      1: 'Oh hey, a new face! \uD83D\uDC4B Pull up a chair and click anything on the desk. It doesn\u2019t bite.',
      2: 'Welcome back! Visit #2. Are you a recruiter or just a fan of canteen coffee?',
      3: 'Visit #3. Okay, this is becoming a habit. Same time tomorrow?',
      4: 'Visit #4. You now know this site better than my mom does.',
      5: 'Visit #5. High five! \uD83D\uDD90\uFE0F That\u2019s officially a streak.',
      6: 'Visit #6. You\u2019re either hiring me or auditing me. Either way, hi.',
      7: 'Visit #7. Lucky number seven. Feeling lucky enough to say hello?',
      8: 'Visit #8. I should start charging rent for this browser tab.',
      9: 'Visit #9. My threat model now lists you as \u201Csuspiciously interested\u201D.',
      10: 'Visit #10. Double digits! \uD83C\uDF89 That\u2019s a filter coffee on me.',
      11: 'Visit #11. You\u2019re a regular now. Your usual table is ready.'
    };

    if (newVisit && visits >= 1) {
      var wbMsg = wb.querySelector('.welcome-msg');
      var hideWb = function () {
        if (wb.hidden || wb.classList.contains('welcome-out')) return;
        wb.classList.add('welcome-out');
        setTimeout(function () { wb.hidden = true; wb.classList.remove('welcome-out'); }, 260);
      };
      wbMsg.textContent = LINES[visits] ||
        ('Visit #' + visits + '. At this point you\u2019re basically part of the furniture.');
      if (visits >= 3) {
        var hello = document.createElement('a');
        hello.href = '#contact';
        hello.textContent = 'Say hello \u2192';
        hello.addEventListener('click', hideWb);
        wbMsg.appendChild(document.createTextNode(' '));
        wbMsg.appendChild(hello);
      }
      wb.querySelector('.welcome-close').addEventListener('click', hideWb);

      // Get out of the way once a page (sheet) is opened.
      var root = document.documentElement;
      if (window.MutationObserver) {
        new MutationObserver(function () {
          var st = root.getAttribute('data-desk-state');
          if (st && st !== 'desk') hideWb();
        }).observe(root, { attributes: true, attributeFilter: ['data-desk-state'] });
      }

      setTimeout(function () {
        var st = root.getAttribute('data-desk-state');
        if (st && st !== 'desk') return; // arrived straight on a page: skip the note
        wb.hidden = false;
        setTimeout(hideWb, 8000);
      }, 900);
    }
  }
})();
