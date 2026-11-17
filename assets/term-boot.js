// Runs in <head> before the first paint: marks JS as on, restores the saved
// terminal theme (so amber never flashes quiet first), and defends against framing.
(function () {
  'use strict';
  var r = document.documentElement;
  r.classList.add('js');

  // Clickjacking defence: GitHub Pages can't send frame-ancestors, so hide and try to break out.
  if (window.top !== window.self) {
    r.classList.add('kk-framed');
    try { window.top.location.replace(window.location.href); } catch (e) { }
  }

  try {
    if (localStorage.getItem('kk-term-theme') === 'amber') r.classList.add('t-amber');
  } catch (e) { }

  // Hello intro: once per visit, never with reduced motion, never when a link opens a section.
  // Decided here so the terminal is hidden before the first paint instead of flashing.
  try {
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && !location.hash && !sessionStorage.getItem('kk-intro') && !r.classList.contains('kk-framed')) {
      r.classList.add('intro-on');
    }
  } catch (e) { }
})();
