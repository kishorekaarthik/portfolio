// Terminal home page. Sections live in index.html (<section data-cmd>); this file prints
// them as command output and adds the easter eggs, CTF, themes, cookie note and visit line.
(function () {
  'use strict';

  var root = document.documentElement;
  var log = document.getElementById('log');
  var cli = document.getElementById('cli');
  var scr = document.getElementById('scr');
  var win = document.getElementById('win');
  var flagc = document.getElementById('flagc');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- small helpers ----------
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cmdl(c, t) { return '<button class="cmdlink" type="button" data-run="' + esc(c) + '">' + esc(t || c) + '</button>'; }
  function tb(label, run, cls) { return '<button class="tbtn ' + (cls || '') + '" type="button" data-run="' + esc(run) + '"><span>' + esc(label) + '</span></button>'; }

  function out(html) {
    var d = document.createElement('div');
    d.className = 'rv';
    if (typeof html === 'string') d.innerHTML = html; else d.appendChild(html);
    var i = 0;
    d.querySelectorAll(':scope > *, .blk > *').forEach(function (el) { el.style.setProperty('--i', i++); });
    log.appendChild(d);
    scr.scrollTop = scr.scrollHeight;
    clearSel();
    return d;
  }

  // ---------- keyboard selection: arrows move through the newest output's commands and links ----------
  var selIdx = -1;
  function selectable() {
    var blocks = log.querySelectorAll('.rv');
    for (var i = blocks.length - 1; i >= 0; i--) {
      var items = blocks[i].querySelectorAll('[data-run], a[href]');
      if (items.length) return [].slice.call(items);
    }
    return [];
  }
  function clearSel() {
    selIdx = -1;
    [].forEach.call(log.querySelectorAll('.kbsel'), function (el) { el.classList.remove('kbsel'); });
  }
  function moveSel(step) {
    var items = selectable();
    if (!items.length) return false;
    var next = selIdx < 0 ? (step > 0 ? 0 : items.length - 1) : (selIdx + step + items.length) % items.length;
    clearSel();
    selIdx = next;
    items[selIdx].classList.add('kbsel');
    items[selIdx].scrollIntoView({ block: 'nearest' });
    return true;
  }
  function echo(c) { out('<p><span class="acc">$</span> ' + esc(c) + '</p>'); }

  // Copy a content section (minus its no-JS heading) into the session.
  function printSection(name) {
    var sec = document.querySelector('#content section[data-cmd="' + name + '"]');
    var frag = document.createDocumentFragment();
    [].forEach.call(sec.children, function (el) {
      if (!el.classList.contains('sec-h')) frag.appendChild(el.cloneNode(true));
    });
    return out(frag);
  }
  function about(lens) {
    var pane = document.querySelector('#about [data-lens="' + lens + '"]').cloneNode(true);
    var d = out('<p class="btns"><span class="dim">lens:</span>' +
      tb('honest story', 'about --honest', lens === 'honest' ? 'on' : 'ghost') +
      tb('recruiter path', 'about --recruiter', lens === 'recruiter' ? 'on' : 'ghost') + '</p>');
    d.appendChild(pane);
    scr.scrollTop = scr.scrollHeight;
  }

  // ---------- themes ----------
  var THEMES = [['quiet', 'soft grey + muted green (default)', '#9fd38a'], ['amber', 'amber monochrome terminal', '#ffb547']];
  var theme = root.classList.contains('t-amber') ? 'amber' : 'quiet';
  function flicker() { if (reduce) return; win.classList.remove('crt'); void win.offsetWidth; win.classList.add('crt'); }
  function setTheme(name) {
    if (name !== 'quiet' && name !== 'amber') return false;
    root.classList.toggle('t-amber', name === 'amber');
    theme = name;
    store.set('kk-term-theme', name);
    flicker();
    return true;
  }

  // ---------- CTF: only SHA-256 fingerprints of the flags live here ----------
  var FLAGS = {
    '5c926a9b3ee23a3a53f7533be83303dcfaa0ab620c9456c11472be67fd5d6a1b': 1,
    '9e4a26845de32d484fb5be109f1f77ceaa8a2e64dad12359d78a0b28002636a5': 2
  };
  var found = [];
  try { found = JSON.parse(store.get('kk-flags') || '[]').filter(function (n) { return n === 1 || n === 2; }); } catch (e) { found = []; }
  function saveFlags() { store.set('kk-flags', JSON.stringify(found)); flagc.textContent = 'flags ' + found.length + '/2'; }
  saveFlags();
  function sha256(s) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function submit(flag) {
    return sha256(flag).then(function (h) {
      var n = FLAGS[h];
      if (!n) { out('<p class="bad">✗ not a valid flag.</p>'); return; }
      if (found.indexOf(n) !== -1) { out('<p class="dim">already captured flag ' + n + '.</p>'); return; }
      found.push(n); saveFlags();
      flagc.classList.remove('flash'); void flagc.offsetWidth; flagc.classList.add('flash');
      out('<p class="acc">✓ flag ' + n + ' captured. ' + found.length + '/2</p>');
      if (found.length === 2) out('<pre class="acc">\n ┌───────────────────────────────────────┐\n │  both flags captured.                 │\n │  you\'d be great to work with.         │\n │  email me the flags and say hi.       │\n └───────────────────────────────────────┘</pre>');
    });
  }
  var NOTE = 'cm90MTMgbWUgLT4gIFhYe280ZjM2NF92Zl9hYmdfM2FwZWxjZzEwYX0=';
  function rot13(s) { return s.replace(/[a-z]/gi, function (c) { var b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }); }

  // ---------- contact: same pre-filled messages as the desk ----------
  var ADDR = ['skishorekaarthik', 'gmail.com'].join('@');
  var MAIL = {
    subject: 'Let’s connect — from your portfolio',
    body: 'Hi Kishore,\n\nI came across your portfolio and would love to connect. Are you free for a quick chat this week?\n\nThanks!'
  };
  var WA = document.querySelector('[data-wa]').href;
  function mail() {
    var d = out('<div class="mail"><div class="hd"><span class="dim">to:</span><span>skishorekaarthik [at] gmail [dot] com</span>' +
      '<span class="dim">subject:</span><span>' + esc(MAIL.subject) + '</span></div><pre>' + esc(MAIL.body) + '</pre></div>' +
      '<p class="btns"><a class="tbtn" data-mailto href="#"><span>send with my mail app</span></a>' +
      '<button class="tbtn ghost" type="button" data-copy><span>copy email</span></button>' +
      '<a class="tbtn ghost" href="' + esc(WA) + '" target="_blank" rel="noopener"><span>whatsapp instead</span></a></p>' +
      '<p class="dim"># everything\'s pre-filled. edit it in your mail app before sending.</p>');
    d.querySelector('[data-mailto]').href = 'mailto:' + ADDR + '?subject=' + encodeURIComponent(MAIL.subject) + '&body=' + encodeURIComponent(MAIL.body);
    var cb = d.querySelector('[data-copy]');
    cb.addEventListener('click', function () {
      var label = cb.firstChild;
      var done = function () { label.textContent = 'copied'; };
      var fail = function () { label.textContent = ADDR; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ADDR).then(done, fail); else fail();
    });
  }

  // ---------- commands ----------
  var SECTIONS = ['projects', 'skills', 'certs', 'hackathons', 'resume', 'contact'];
  var HISTORY = ['git commit -m "final"', 'git commit -m "final final"', 'git push --force   # sorry', 'chmod 777 everything   # it was 2am',
    'sudo apt install patience', 'ssh prod   # nope, closed it', 'echo "hire me" > /dev/recruiter'];
  function rows(list) {
    return '<div class="blk">' + list.map(function (r) {
      return '<div class="row"><span>' + r[0] + '</span><span class="dim">' + r[1] + '</span></div>';
    }).join('') + '</div>';
  }
  var C = {
    help: function () {
      out(rows([[cmdl('about'), 'the honest story (or the recruiter one)'], [cmdl('ls'), 'list sections'], [cmdl('projects'), 'what I\'ve built'],
        [cmdl('skills'), 'languages and tools'], [cmdl('certs'), 'verified credentials'], [cmdl('hackathons'), 'battle scars'],
        [cmdl('resume'), 'get the pdf'], [cmdl('contact'), 'say hello'], [cmdl('mail'), 'pre-filled email'],
        [cmdl('theme'), 'switch to a retro screen'], [cmdl('desk'), 'the old desk-room version'], ['clear', 'clean the screen']]) +
        '<p class="dim">some commands aren\'t listed. curiosity is a security skill.</p>');
    },
    whoami: function () { out('<p class="dim">that\'s pinned at the top. try ' + cmdl('about') + ' for the longer version.</p>'); },
    about: function () { about('honest'); },
    'about --honest': function () { about('honest'); },
    'about --recruiter': function () { about('recruiter'); },
    ls: function () {
      out(rows([[cmdl('about'), 'pennadam → rec → job hunt'], [cmdl('projects'), 'cybershield, securedb'], [cmdl('skills'), 'java, python, spring, pytorch…'],
        [cmdl('certs'), 'fortinet ×3, aws'], [cmdl('hackathons'), 'SIH 2025 winner, 1 paper'], [cmdl('resume'), 'resume.pdf'], [cmdl('contact'), 'say hello']]) +
        '<p class="dim keys">use ↑ ↓ to pick, enter to open, tab to complete.</p>');
    },
    'ls -a': function () {
      out(rows([['<span class="dim">.</span>', ''], ['<span class="dim">..</span>', ''], ['<span class="warn">.secrets/</span>', 'drwx------'],
        [cmdl('robots.txt'), ''], ['about', ''], ['projects', ''], ['resume.pdf', '']]));
    },
    'ls .secrets': function () { out('<p>note.txt</p>'); },
    'cat .secrets/note.txt': function () { out('<pre>' + NOTE + '</pre><p class="dim"># looks encoded. try: decode &lt;text&gt;</p>'); },
    'robots.txt': function () { C['cat robots.txt'](); },
    'cat robots.txt': function () { out('<pre>User-agent: *\nDisallow: /.secrets/\n\n# flag 1 isn\'t here. it\'s somewhere you\'d look\n# if you wanted to see how this page was built.</pre>'); },
    'cat resume.pdf': function () { out('<p class="dim">that\'s a binary file. your terminal would scream. try ' + cmdl('resume') + '.</p>'); },
    mail: mail,
    theme: function () {
      out('<p class="dim">pick a screen. it\'s remembered for next time.</p>' + rows(THEMES.map(function (t) {
        return [tb(t[0], 'theme ' + t[0], theme === t[0] ? 'on' : 'ghost'), '<span class="swatch" style="background:' + t[2] + '"></span>' + t[1]];
      })));
    },
    desk: function () { out('<p class="dim">opening the desk…</p>'); setTimeout(function () { location.href = 'desk/'; }, reduce ? 0 : 350); },
    clear: function () { log.innerHTML = ''; },
    cookies: function () { out('<p><span class="warn">cookie policy:</span> zero cookies. I just count heads, not names.</p><p class="dim">visits are tallied in your own browser only. analytics are cookie-free.</p>'); },
    // hidden commands
    'sudo hire kishore': function () {
      out('<p class="dim">[sudo] password for recruiter: ********</p><p class="acc">permission granted. opening contact…</p>');
      setTimeout(function () { run('contact', true); }, reduce ? 0 : 500);
    },
    sudo: function () { out('<p class="bad">guest is not in the sudoers file. this incident will be reported.</p><p class="dim">(try: sudo hire kishore)</p>'); },
    'rm -rf /': function () { out('<p class="bad">rm: refusing to remove \'/\': nice try.</p><p class="dim">this incident has been logged ☕</p>'); },
    coffee: function () {
      out('<pre class="warn steam"><span>     ( (</span>\n<span>      ) )</span>\n   .______.\n   |      |]   filter coffee, brewing…\n   \\      /\n    `----\'     dabara set. best paired with code review.</pre>');
    },
    history: function () { out('<pre class="dim">' + HISTORY.map(function (h, i) { return ('    ' + (i + 1)).slice(-4) + '  ' + esc(h); }).join('\n') + '</pre>'); },
    exit: function () { out('<p class="dim">there is no escape. but there is a ' + cmdl('contact') + ' page.</p>'); },
    hint: function () {
      var h = found.indexOf(1) === -1 ? 'flag 1: how was this page built? look at the source.'
        : found.indexOf(2) === -1 ? 'flag 2: ls -a. some files start with a dot.' : 'both flags found. go say hello.';
      out('<p class="dim">' + h + '</p>');
    },
    flags: function () {
      out('<p>flags found: <span class="acc">' + found.length + '/2</span> ' + [1, 2].map(function (n) { return found.indexOf(n) !== -1 ? '■' : '□'; }).join(' ') + '</p>');
    }
  };
  SECTIONS.forEach(function (s) { C[s] = function () { printSection(s); }; });
  C['ls .secrets/'] = C['ls .secrets'];

  // Old desk links (#work, #scars…) and shareable section links.
  var HASH = { about: 'about', skills: 'skills', scars: 'hackathons', hackathons: 'hackathons', work: 'projects', projects: 'projects', certs: 'certs', resume: 'resume', contact: 'contact' };
  function setHash(cmd) {
    var h = cmd === 'about' || SECTIONS.indexOf(cmd) !== -1 ? '#' + cmd : '';
    try { history.replaceState(null, '', location.pathname + location.search + h); } catch (e) { }
  }

  function run(raw, silentEcho) {
    var c = String(raw).trim();
    if (!c) return;
    if (!silentEcho) echo(c);
    var lc = c.toLowerCase().replace(/\s+/g, ' ');
    if (lc.indexOf('submit ') === 0) return submit(c.slice(7).trim());
    if (lc.indexOf('decode ') === 0) {
      try { out('<pre>' + esc(atob(c.slice(7).trim())) + '</pre>'); } catch (e) { out('<p class="bad">decode: not valid base64</p>'); }
      return;
    }
    if (lc.indexOf('rot13 ') === 0) return out('<pre>' + esc(rot13(c.slice(6))) + '</pre>');
    if (lc.indexOf('theme ') === 0) {
      var k = lc.slice(6).trim();
      return setTheme(k) ? out('<p class="acc">screen switched to ' + esc(k) + '.</p>')
        : out('<p class="bad">theme: unknown screen \'' + esc(k) + '\'</p><p class="dim">type ' + cmdl('theme') + '</p>');
    }
    if (C[lc]) { setHash(lc); return C[lc](); }
    var m = /^(cd|cat|open) (.+)$/.exec(lc);
    if (m) { var key = m[2].replace(/\/$/, ''); if (C[key]) { setHash(key); return C[key](); } }
    if (lc.indexOf('sudo ') === 0) return C.sudo();
    out('<p class="bad">command not found: ' + esc(c) + '</p><p class="dim">type ' + cmdl('help') + '</p>');
  }

  // Clicking a command types it into the prompt first, then runs it.
  var busy = false;
  function typeRun(c) {
    if (busy) return;
    if (reduce) { run(c); return; }
    busy = true;
    scr.classList.add('typing');
    var i = 0, step = Math.max(8, Math.min(32, 500 / c.length));
    (function t() {
      cli.value = c.slice(0, ++i);
      if (i < c.length) { setTimeout(t, step); return; }
      setTimeout(function () { cli.value = ''; busy = false; scr.classList.remove('typing'); run(c); }, 120);
    })();
  }

  // Tab completion over the listed commands only (hidden ones stay hidden).
  var COMPLETE = ['help', 'about', 'about --honest', 'about --recruiter', 'ls', 'projects', 'skills', 'certs', 'hackathons',
    'resume', 'contact', 'mail', 'theme', 'theme quiet', 'theme amber', 'desk', 'clear'];
  function complete() {
    var v = cli.value.toLowerCase();
    if (!v) return;
    var hits = COMPLETE.filter(function (c) { return c.indexOf(v) === 0 && c !== v; });
    if (hits.length === 1) { cli.value = hits[0]; return; }
    if (hits.length > 1) {
      // extend to the longest shared prefix, then list the options
      var pre = hits.reduce(function (a, b) { var i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
      if (pre.length > v.length) cli.value = pre;
      else out('<p class="dim">' + hits.map(esc).join('   ') + '</p>');
    }
  }

  cli.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || busy) return;
    if (!cli.value.trim() && selIdx >= 0) return; // the document handler opens the highlighted item
    var v = cli.value; cli.value = ''; run(v);
  });

  document.addEventListener('keydown', function (e) {
    if (busy || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    // Leave real buttons and links (focused with Tab) to the browser.
    if (t !== cli && t !== document.body && !(t.closest && t.closest('#scr') && !t.closest('a,button'))) return;
    var empty = !cli.value;
    var k = e.key;
    if ((k === 'ArrowDown' || (k === 'ArrowRight' && empty)) && empty) { if (moveSel(1)) e.preventDefault(); }
    else if ((k === 'ArrowUp' || k === 'ArrowLeft') && empty) { if (moveSel(-1)) e.preventDefault(); }
    else if (k === 'Enter' && empty && selIdx >= 0) {
      var items = selectable(), el = items[selIdx];
      e.preventDefault();
      if (el) el.click();
    }
    else if (k === 'Tab' && t === cli && !empty) { e.preventDefault(); complete(); }
    else if (k === 'Escape') { clearSel(); cli.value = ''; }
    else if (t === document.body && k.length === 1 && matchMedia('(pointer: fine)').matches) {
      // Start typing anywhere: send the key to the prompt.
      cli.focus({ preventScroll: true });
    }
  });
  win.addEventListener('click', function (e) {
    var b = e.target.closest('[data-run]');
    if (b) { e.preventDefault(); typeRun(b.getAttribute('data-run')); return; }
    // Desktop only: clicking empty space in the session focuses the prompt (phones would pop the keyboard).
    if (e.target.closest('#scr') && !e.target.closest('a,button') && matchMedia('(pointer: fine)').matches && !String(getSelection())) cli.focus({ preventScroll: true });
  });

  // ---------- Konami code: amber and back ----------
  var K = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'], ki = 0, before = 'quiet';
  document.addEventListener('keydown', function (e) {
    var key = (e.key || '').toLowerCase();
    ki = key === K[ki] ? ki + 1 : (key === K[0] ? 1 : 0);
    if (ki < K.length) return;
    ki = 0;
    // the B and A presses may have landed in the prompt; take them back out
    setTimeout(function () { cli.value = cli.value.replace(/ba$/i, ''); }, 0);
    var on = theme !== 'amber';
    if (on) before = theme;
    setTheme(on ? 'amber' : before);
    out('<p class="acc">' + (on ? '↑↑↓↓←→←→BA · retro mode on. enter it again to switch back.' : 'retro mode off.') + '</p>');
  });

  // ---------- console message ----------
  try {
    console.log('%cLooking under the hood?', 'color:#9fd38a;font:600 14px monospace');
    console.log('%cTry  ls -a  in the terminal. There are 2 flags hidden on this page.', 'color:#8b928e;font:12px monospace');
  } catch (e) { }

  // ---------- visit line: same counting and messages as the desk ----------
  var LINES = {
    1: 'oh hey, a new face. pull up a chair and type help. it doesn’t bite.',
    2: 'welcome back. visit #2. are you a recruiter or just a fan of canteen coffee?',
    3: 'visit #3. okay, this is becoming a habit. same time tomorrow?',
    4: 'visit #4. you now know this site better than my mom does.',
    5: 'visit #5. high five. that’s officially a streak.',
    6: 'visit #6. you’re either hiring me or auditing me. either way, hi.',
    7: 'visit #7. lucky number seven. feeling lucky enough to say hello?',
    8: 'visit #8. I should start charging rent for this browser tab.',
    9: 'visit #9. my threat model now lists you as “suspiciously interested”.',
    10: 'visit #10. double digits. that’s a filter coffee on me.',
    11: 'visit #11. you’re a regular now. your usual table is ready.'
  };
  function visitLine() {
    var v = parseInt(store.get('kk-visits'), 10) || 0;
    var last = store.get('kk-term-last');
    if (!session.get('kk-visits')) {
      v += 1;
      store.set('kk-visits', String(v));
      session.set('kk-visits', '1');
      store.set('kk-term-last', new Date().toString().slice(0, 21));
    }
    if (v < 1) v = 1;
    var msg = LINES[v] || ('visit #' + v + '. at this point you’re basically part of the furniture.');
    out('<p class="dim">' + (last && v > 1 ? 'last login: ' + esc(last) + ' · ' : '') + '<span class="acc">' + msg + '</span>' +
      (v >= 3 ? ' ' + cmdl('contact', 'say hello →') : '') + '</p>');
  }

  // ---------- cookie note (once per visitor, shared with the desk) ----------
  var ck = document.getElementById('cookie');
  function closeCookie() { ck.hidden = true; store.set('kk-cookie-note', '1'); }
  if (!store.get('kk-cookie-note')) ck.hidden = false;
  document.getElementById('cok').addEventListener('click', closeCookie);
  document.getElementById('ccof').addEventListener('click', function () {
    store.set('kk-cookie-note', '1');
    document.getElementById('cmsg').innerHTML = '<span class="warn">excellent taste.</span> filter coffee it is. still no cookies though.';
    var acts = document.getElementById('cacts');
    acts.innerHTML = '<button class="tbtn ghost" type="button"><span>close</span></button>';
    acts.firstChild.addEventListener('click', closeCookie);
  });

  // ---------- name decrypt ----------
  function decrypt() {
    if (reduce) return;
    var el = document.getElementById('nm'), target = el.textContent, G = '!<>-_/\\[]{}=+*^?#01', f = 0;
    el.setAttribute('aria-label', target);
    (function tick() {
      f++;
      el.textContent = target.split('').map(function (ch, i) { return ch === ' ' || f > i * 1.6 + 6 ? ch : G[Math.random() * G.length | 0]; }).join('');
      if (f < 32) setTimeout(tick, 28); else el.textContent = target;
    })();
  }

  // ---------- boot ----------
  function start() {
    var h = (location.hash || '').slice(1).toLowerCase();
    visitLine();
    if (HASH[h]) typeRun(HASH[h]); else typeRun('ls');
    // Desktop: put the cursor in the prompt so keys work straight away (phones would pop the keyboard).
    if (matchMedia('(pointer: fine)').matches) cli.focus({ preventScroll: true });
  }
  // ---------- hello intro: greetings, then "hello, world" typed, then the terminal ----------
  // term-boot.js adds .intro-on only on the first load of a visit, with motion allowed and no #section link.
  function playIntro(done) {
    if (!root.classList.contains('intro-on')) { done(false); return; }
    session.set('kk-intro', '1');
    var box = document.getElementById('intro');
    var words = [].slice.call(box.querySelectorAll('.word'));
    var hw = document.getElementById('hw');
    var timers = [], finished = false, STEP = 320, GREET = words.length - 1;
    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function show(i) { words.forEach(function (w, k) { w.classList.toggle('on', k === i); }); }
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', finish, true);
      document.removeEventListener('pointerdown', finish, true);
      box.classList.add('gone');
      root.classList.add('intro-done');
      setTimeout(function () { root.classList.remove('intro-on', 'intro-done'); }, 520);
      done(true);
    }
    // Any key or click skips it.
    document.addEventListener('keydown', finish, true);
    document.addEventListener('pointerdown', finish, true);
    for (var i = 0; i < GREET; i++) (function (i) { T(function () { show(i); }, 150 + i * STEP); })(i);
    T(function () {
      show(GREET);
      var text = 'hello, world', n = 0;
      (function type() {
        hw.textContent = text.slice(0, ++n);
        if (n < text.length) T(type, 70); else T(finish, 650);
      })();
    }, 150 + GREET * STEP);
  }

  function boot() {
    var first = !session.get('kk-booted');
    session.set('kk-booted', '1');
    playIntro(function (played) {
      // After the intro, skip the boot lines: one welcome animation is enough.
      if (played) { decrypt(); start(); return; }
      bootLines(first);
    });
  }
  function bootLines(first) {
    if (reduce || !first) { start(); return; }
    decrypt();
    var lines = ['mounting /home/kishore', 'brewing filter coffee', 'hiding flags under the rug'], i = 0;
    (function next() {
      if (i < lines.length) { out('<p class="boot"><b>[ ok ]</b> ' + lines[i++] + '</p>'); setTimeout(next, 170); return; }
      setTimeout(function () { out('<div class="gap"></div>'); start(); }, 200);
    })();
  }
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1).toLowerCase();
    if (HASH[h]) typeRun(HASH[h]);
  });

  boot();
})();
