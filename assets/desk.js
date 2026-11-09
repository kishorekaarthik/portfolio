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
  if (!desk) return;

  root.classList.add('desk-mode');
  desk.hidden = false;
  SECTIONS.forEach(function (s) {
    var el = document.getElementById(s.id);
    if (el) el.hidden = true;
  });
  root.dataset.deskState = 'desk';
})();
