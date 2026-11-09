(function () {
  'use strict';

  var SECTIONS = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'scars', label: 'Hackathons' },
    { id: 'work', label: 'Work' },
    { id: 'contact', label: 'Say hello' }
  ];

  var root = document.documentElement;
  var desk = document.querySelector('.desk');
  var hero = document.querySelector('.hero');
  var footer = document.querySelector('footer');
  if (!desk) return;

  var byId = {};
  SECTIONS.forEach(function (s, i) {
    s.el = document.getElementById(s.id);
    s.index = i;
    byId[s.id] = s;
  });
  if (SECTIONS.some(function (s) { return !s.el; })) return;

  var sidebarLinks = document.querySelectorAll('header.sidebar nav a[href^="#"]');
  var current = null;      // id of the open sheet, null = desk
  var lastOpener = null;   // id whose desk object gets focus back on close

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function idFromHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { }
    return byId[h] ? h : null;
  }

  // ---------- sheet chrome ----------

  function buildChrome(s) {
    var sec = s.el;
    var h2 = sec.querySelector('h2');
    if (h2) {
      h2.id = 'sheet-title-' + s.id;
      h2.tabIndex = -1;
      sec.setAttribute('aria-labelledby', h2.id);
    }
    sec.setAttribute('role', 'region');

    var bar = make('div', 'sheet-bar');
    var close = make('button', 'sheet-close hand', '✕ back to desk');
    close.type = 'button';
    bar.appendChild(close);

    var nav = make('nav', 'sheet-nav');
    nav.setAttribute('aria-label', 'Sections');
    SECTIONS.forEach(function (t) {
      var a = make('a', null, t.label);
      a.href = '#' + t.id;
      if (t.id === s.id) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    bar.appendChild(nav);

    var tg = make('button', 'tg sheet-tg');
    tg.type = 'button';
    tg.setAttribute('aria-label', 'Switch between light and dark mode');
    document.querySelectorAll('#tg svg').forEach(function (svg) { tg.appendChild(svg.cloneNode(true)); });
    bar.appendChild(tg);

    sec.insertBefore(bar, sec.firstChild);

    var pn = make('nav', 'sheet-pn hand');
    pn.setAttribute('aria-label', 'Previous and next section');
    var prev = SECTIONS[s.index - 1], next = SECTIONS[s.index + 1];
    if (prev) {
      var pa = make('a', 'sheet-prev', '← ' + prev.label);
      pa.href = '#' + prev.id;
      pn.appendChild(pa);
    }
    if (next) {
      var na = make('a', 'sheet-next', next.label + ' →');
      na.href = '#' + next.id;
      pn.appendChild(na);
    }
    sec.appendChild(pn);
  }

  // ---------- rendering ----------

  // Make the DOM match `id` (null = desk). No animation, no state label.
  function applyDom(id) {
    var prev = current;
    current = id;

    SECTIONS.forEach(function (s) {
      var open = s.id === id;
      s.el.hidden = !open;
      s.el.classList.toggle('is-open', open);
    });
    desk.inert = !!id;
    if (hero) hero.inert = !!id;
    if (footer) footer.inert = !!id;
    document.body.classList.toggle('sheet-open', !!id);
    sidebarLinks.forEach(function (a) {
      if (id && a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (id) {
      lastOpener = id;
      byId[id].el.scrollTop = 0;
      var h2 = document.getElementById('sheet-title-' + id);
      if (h2) h2.focus({ preventScroll: true });
    } else if (prev && lastOpener) {
      var obj = desk.querySelector('.desk-obj[data-target="' + lastOpener + '"]');
      if (obj) obj.focus({ preventScroll: true });
    }
  }

  // ---------- transitions ----------

  var busy = false;      // a transition is running
  var target = null;     // where the running transition is heading
  var pending = null;    // latest action requested while busy
  var awaitingPop = false; // history.back() issued, popstate not seen yet
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function after(el, cls, ms, done) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      el.removeEventListener('animationend', onEnd);
      if (cls) el.classList.remove(cls);
      done();
    }
    function onEnd(e) { if (e.target === el) finish(); }
    el.addEventListener('animationend', onEnd);
    setTimeout(finish, ms);
  }

  function settle() {
    busy = false;
    root.dataset.deskState = current ? 'sheet' : 'desk';
    var next = pending;
    pending = null;
    if (next) next();
  }

  function render(id, opts) {
    var animate = !(opts && opts.animate === false) && !reduceMotion.matches;
    if (busy) {
      pending = function () { render(idFromHash(), opts); };
      return;
    }
    if (id === current) return;

    if (!animate) {
      root.classList.remove('desk-zoom');
      applyDom(id);
      root.dataset.deskState = id ? 'sheet' : 'desk';
      return;
    }

    busy = true;
    target = id;
    if (id && !current) {
      root.dataset.deskState = 'opening';
      var obj = desk.querySelector('.desk-obj[data-target="' + id + '"]');
      if (obj) {
        var d = desk.getBoundingClientRect(), r = obj.getBoundingClientRect();
        desk.style.transformOrigin = (r.left - d.left + r.width / 2) + 'px ' + (r.top - d.top + r.height / 2) + 'px';
      }
      root.classList.add('desk-zoom');
      setTimeout(function () {
        applyDom(id);
        var sec = byId[id].el;
        sec.classList.add('sheet-enter');
        after(sec, 'sheet-enter', 450, settle);
      }, 170);
    } else if (id && current) {
      root.dataset.deskState = 'switching';
      applyDom(id);
      var sw = byId[id].el;
      sw.classList.add('sheet-swap');
      after(sw, 'sheet-swap', 350, settle);
    } else {
      root.dataset.deskState = 'closing';
      var out = byId[current].el;
      out.classList.add('sheet-leave');
      after(out, 'sheet-leave', 400, function () {
        applyDom(null);
        root.classList.remove('desk-zoom');
        settle();
      });
    }
  }

  // ---------- navigation ----------

  function go(id) {
    if (busy) {
      pending = function () { go(id); };
      return;
    }
    if (awaitingPop || id === current) return;
    // Decide from the URL, not the screen: mid-animation they can disagree.
    var push = !idFromHash();
    var fromDesk = push ? true : !!(history.state && history.state.fromDesk);
    var state = { kk: 'sheet', fromDesk: fromDesk };
    if (push) history.pushState(state, '', '#' + id);
    else history.replaceState(state, '', '#' + id);
    render(id);
  }

  function requestClose() {
    if (busy) {
      pending = requestClose;
      return;
    }
    if (!current || awaitingPop) return;
    if (history.state && history.state.fromDesk) {
      awaitingPop = true;
      history.back();
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      render(null);
    }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.sheet-tg')) {
      var mainToggle = document.getElementById('tg');
      if (mainToggle) mainToggle.click();
      return;
    }
    if (t.closest('.sheet-close')) {
      e.preventDefault();
      requestClose();
      return;
    }
    var a = t.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (byId[id]) {
      e.preventDefault();
      go(id);
    } else if ((id === 'top' || id === '') && current) {
      e.preventDefault();
      requestClose();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) {
      e.preventDefault();
      requestClose();
    }
  });

  function onHistory() { awaitingPop = false; render(idFromHash()); }
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);

  // ---------- start ----------

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  SECTIONS.forEach(buildChrome);
  root.classList.add('desk-mode');
  desk.hidden = false;
  SECTIONS.forEach(function (s) { s.el.hidden = true; });
  root.dataset.deskState = 'desk';
  render(idFromHash(), { animate: false });
  window.scrollTo(0, 0);
})();
