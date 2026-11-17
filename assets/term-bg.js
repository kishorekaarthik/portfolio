// Night-room background behind the terminal: pixel art drawn at 320x180 and scaled up
// to cover the screen. Small motions (rain, steam, clock, window lights) stop under
// prefers-reduced-motion and while the tab is hidden.
(function () {
  'use strict';
  var cv = document.getElementById('bg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var W = 320, H = 180;
  cv.width = W; cv.height = H;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function R(c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function glowColor() { return root.classList.contains('t-amber') ? '#ffb547' : '#9fd38a'; }

  function draw(t) {
    // wall with faint stripes, skirting, desk
    R('#0d0f17', 0, 0, W, 148);
    for (var x = 0; x < W; x += 10) R('#0f121b', x, 0, 5, 148);
    R('#0a0b10', 0, 142, W, 6);
    R('#2a1d14', 0, 148, W, 4); R('#1c140e', 0, 152, W, 28);
    for (x = 0; x < W; x += 26) R('#21180f', x, 154, 18, 1);
    R('#140e0a', 0, 176, W, 4);

    // window (left): night sky, moon, skyline, palm, rain
    var wx = 10, wy = 18, ww = 50, wh = 70, i, y;
    R('#070b1a', wx, wy, ww, wh);
    for (y = wy; y < wy + wh; y++) { ctx.globalAlpha = (y - wy) / wh * 0.5; R('#16224a', wx, y, ww, 1); }
    ctx.globalAlpha = 1;
    var r = rng(51);
    for (i = 0; i < 22; i++) { ctx.globalAlpha = 0.4 + 0.6 * r(); R('#c8d2f0', wx + r() * ww, wy + r() * 40, 1, 1); }
    ctx.globalAlpha = 1;
    R('#e9e4c9', wx + 32, wy + 8, 7, 7); R('#e9e4c9', wx + 31, wy + 10, 9, 3);
    var r2 = rng(8);
    for (i = 0; i < 8; i++) {
      var bx = wx + i * 7, bh = 10 + r2() * 22;
      R('#05070f', bx, wy + wh - bh, 7, bh);
      for (var yy = wy + wh - bh + 3; yy < wy + wh - 2; yy += 4) {
        if (r2() > 0.7) R(reduce || Math.sin(t / 3000 + i + yy) > -0.6 ? '#d29a52' : '#1a1e2c', bx + 2, yy, 1, 1);
      }
    }
    for (i = 0; i < 30; i++) R('#04060c', wx + 8 + Math.round(Math.sin(i / 8) * 1.5), wy + wh - i, 2, 1);
    [[-1, -1], [1, -1], [-1, 0], [1, 0]].forEach(function (d) {
      for (var j = 0; j < 9; j++) R('#04060c', wx + 9 + d[0] * j, wy + wh - 31 + d[1] * (j * j / 14), 2, 1);
    });
    if (!reduce) {
      ctx.globalAlpha = 0.3;
      for (i = 0; i < 16; i++) R('#9fb0d8', wx + ((i * 29) % ww), wy + (i * 17 + t / 14) % wh, 1, 3);
      ctx.globalAlpha = 1;
    }
    R('#1d212c', wx - 3, wy - 3, ww + 6, 3); R('#1d212c', wx - 3, wy + wh, ww + 6, 3);
    R('#1d212c', wx - 3, wy, 3, wh); R('#1d212c', wx + ww, wy, 3, wh);
    R('#1d212c', wx + ww / 2 - 1, wy, 2, wh); R('#1d212c', wx, wy + wh / 2 - 1, ww, 2);
    R('#262b38', wx - 6, wy + wh + 3, ww + 12, 3);
    for (y = wy - 6; y < wy + wh + 10; y++) {
      var s = Math.round(Math.sin(y / 6));
      R('#2a1a2a', wx - 12 + s, y, 8, 1); R('#2a1a2a', wx + ww + 4 - s, y, 8, 1);
      R('#3a2438', wx - 10 + s, y, 2, 1); R('#3a2438', wx + ww + 6 - s, y, 2, 1);
    }
    R('#141620', wx - 14, wy - 8, ww + 28, 3);
    ctx.globalAlpha = 0.06; ctx.fillStyle = '#9fb0d8';
    ctx.beginPath(); ctx.moveTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + 40, 148); ctx.lineTo(wx + 10, 148); ctx.lineTo(wx, wy + wh); ctx.fill();
    ctx.globalAlpha = 1;
    R('#3a2a20', wx + 38, wy + wh - 4, 7, 6);
    [[-3, -5], [0, -8], [3, -6], [-1, -3], [2, -3]].forEach(function (d) { R('#2f5a34', wx + 41 + d[0], wy + wh - 4 + d[1], 2, 5); });

    // right wall: clock, shelf of books, poster
    R('#1d212c', 276, 12, 14, 14); R('#0e1018', 278, 14, 10, 10);
    var ang = reduce ? 1 : t / 60000 * Math.PI * 2;
    R('#c9cfcb', 282, 18, 1, 1);
    for (var k = 1; k < 4; k++) R('#8b928e', 282 + Math.round(Math.cos(ang) * k), 18 + Math.round(Math.sin(ang) * k), 1, 1);
    R('#1d212c', 256, 46, 56, 2);
    [['#3a2420', 258, 10], ['#20304a', 262, 12], ['#2d3a24', 267, 9], ['#4a3a20', 271, 13], ['#2a2a3a', 276, 11], ['#3a2030', 281, 8]]
      .forEach(function (b) { R(b[0], b[1], 46 - b[2], 4, b[2]); });
    R('#2a2a3a', 290, 40, 10, 6); R('#c9cfcb', 293, 38, 4, 2);
    R('#1d212c', 262, 62, 40, 30); R('#0b1a10', 264, 64, 36, 26);
    R('#3f6b37', 268, 69, 4, 1); R('#3f6b37', 273, 69, 2, 1); R('#3f6b37', 268, 76, 12, 1); R('#3f6b37', 268, 80, 8, 1);

    // desk props: lamp, mug with steam, notebook, headphones
    R('#0f1012', 290, 146, 18, 2); R('#16171b', 298, 118, 2, 28); R('#16171b', 292, 112, 16, 7);
    ctx.globalAlpha = 0.10; ctx.fillStyle = '#e3a64e';
    ctx.beginPath(); ctx.moveTo(292, 119); ctx.lineTo(308, 119); ctx.lineTo(326, 150); ctx.lineTo(274, 150); ctx.fill();
    ctx.globalAlpha = 1; R('#f2c27a', 294, 119, 12, 1);
    R('#3a302a', 264, 138, 9, 10); R('#3a302a', 273, 141, 2, 4); R('#2a1d14', 265, 139, 7, 1);
    if (!reduce) {
      for (i = 0; i < 3; i++) { ctx.globalAlpha = 0.3; R('#9a9a9a', 266 + i * 2 + Math.round(Math.sin(t / 400 + i)), 128 - ((t / 120 + i * 4) % 10), 1, 2); }
      ctx.globalAlpha = 1;
    }
    R('#2a2420', 30, 144, 28, 4); R('#e6e2d6', 32, 143, 24, 1); R('#1a1c20', 14, 140, 10, 8); R('#1a1c20', 16, 138, 6, 2);

    // soft glow from the terminal onto the wall (follows the theme)
    ctx.fillStyle = glowColor();
    for (k = 0; k < 4; k++) { ctx.globalAlpha = 0.022; ctx.beginPath(); ctx.ellipse(160, 100, 70 + k * 16, 38 + k * 9, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // Cover-fit the low-res canvas to the viewport, keeping the centre in view.
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight, sc = Math.max(vw / W, vh / H);
    cv.style.width = W * sc + 'px'; cv.style.height = H * sc + 'px';
    cv.style.left = (vw - W * sc) / 2 + 'px'; cv.style.top = (vh - H * sc) / 2 + 'px';
  }
  fit();
  window.addEventListener('resize', fit);

  var last = 0;
  function loop(t) {
    if (document.hidden) { requestAnimationFrame(loop); return; }
    if (t - last >= 50) { last = t; draw(t); } // ~20 fps is plenty for pixel art
    requestAnimationFrame(loop);
  }
  draw(0);
  if (!reduce) requestAnimationFrame(loop);
  // Redraw once when the theme changes so the glow matches.
  if (window.MutationObserver) new MutationObserver(function () { draw(last); }).observe(root, { attributes: true, attributeFilter: ['class'] });
})();
