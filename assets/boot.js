// Runs in <head>, before the first paint, so the page never shows the long
// no-JS layout (or the wrong theme) for a moment and then jumps to the desk.
(function () {
  'use strict';
  var r = document.documentElement, t = 'light';
  try {
    var saved = localStorage.getItem('kk-theme');
    if (saved === 'light' || saved === 'dark') t = saved;
  } catch (e) { }
  r.dataset.theme = t;
  r.classList.add('desk-mode');
  // If desk.js never takes over (failed to load, or bailed out), fall back to the long page.
  window.addEventListener('load', function () {
    if (!r.dataset.deskState) r.classList.remove('desk-mode');
  });
})();
