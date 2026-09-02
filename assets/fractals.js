/* Fundo fractal — Kelvin Oliveira · portfólio
   Formas que se decompõem em cópias de si mesmas e voltam à forma original, em loop.
   Colocadas apenas nos espaços vazios do documento — nunca sobre texto/cards,
   nunca sobre outras formas. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var canvas = document.getElementById('fractal-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GOLD = [201, 162, 39];
  var GRAY = [178, 178, 178];
  var TYPES = ['quad', 'hex', 'tri'];
  var MAX_CELLS = 24;

  var docW = 0, docH = 0, cells = [], raf = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function fade(x, e) { x = clamp(x / (e || 0.3), 0, 1); return x * x * (3 - 2 * x); }
  function inter(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function mid(p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
  function centroid(pts) {
    var x = 0, y = 0, i;
    for (i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; }
    return [x / pts.length, y / pts.length];
  }
  function norm(p) {
    var l = Math.hypot(p[0], p[1]) || 1;
    return [p[0] / l, p[1] / l];
  }

  function stroke(pts, rgb, a) {
    if (a <= 0.012) return;
    ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a.toFixed(3) + ')';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function xform(pts, C, s, ang, mx, my) {
    var cos = Math.cos(ang), sin = Math.sin(ang), out = [], i, p, dx, dy;
    for (i = 0; i < pts.length; i++) {
      p = pts[i]; dx = (p[0] - C[0]) * s; dy = (p[1] - C[1]) * s;
      out.push([C[0] + dx * cos - dy * sin + mx, C[1] + dx * sin + dy * cos + my]);
    }
    return out;
  }

  /* ---------- QUAD: quadrado → 4 quadrados → 4 cada ---------- */
  function drawQuad(c, t) {
    var h = c.S / 2;
    var fd1 = fade(t, 0.35);
    var s2 = clamp(t * 1.6 - 0.6, 0, 1);
    var fd2 = fade(s2, 0.35);
    var cos0 = Math.cos(c.rot0), sin0 = Math.sin(c.rot0);
    function T(pts) {
      var o = [], i;
      for (i = 0; i < pts.length; i++) {
        var x = pts[i][0], y = pts[i][1];
        o.push([c.x + x * cos0 - y * sin0, c.y + x * sin0 + y * cos0]);
      }
      return o;
    }
    stroke(T([[-h, -h], [h, -h], [h, h], [-h, h]]), c.rgb, c.a0 * (1 - 0.62 * fd1));
    var D = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    var hc = h / 2, i, j;
    for (i = 0; i < 4; i++) {
      var dx = D[i][0], dy = D[i][1];
      var C1 = [dx * h / 2, dy * h / 2];
      var child = [
        [C1[0] - hc, C1[1] - hc], [C1[0] + hc, C1[1] - hc],
        [C1[0] + hc, C1[1] + hc], [C1[0] - hc, C1[1] + hc]
      ];
      var s1a = 1 - 0.12 * t, ang1 = t * 0.10 * (i % 2 ? 1 : -1);
      var mvx = dx * t * h * 0.14, mvy = dy * t * h * 0.14;
      stroke(T(xform(child, C1, s1a, ang1, mvx, mvy)), c.rgb, c.a1 * fd1);
      var hcg = hc / 2;
      for (j = 0; j < 4; j++) {
        var gx = D[j][0], gy = D[j][1];
        var C2 = [C1[0] + gx * hc / 2, C1[1] + gy * hc / 2];
        var mini = [
          [C2[0] - hcg, C2[1] - hcg], [C2[0] + hcg, C2[1] - hcg],
          [C2[0] + hcg, C2[1] + hcg], [C2[0] - hcg, C2[1] + hcg]
        ];
        var s2a = 1 - 0.12 * s2, ang2 = s2 * 0.10 * (j % 2 ? 1 : -1);
        var gmvx = gx * s2 * hc * 0.14, gmvy = gy * s2 * hc * 0.14;
        var mg = xform(xform(mini, C2, s2a, ang2, gmvx, gmvy), C1, s1a, ang1, mvx, mvy);
        stroke(T(mg), c.rgb, c.a2 * fd2);
      }
    }
  }

  /* ---------- HEX: hexágono → 6 triângulos → 4 cada ---------- */
  function drawHex(c, t) {
    var R = c.S * 0.5;
    var fd1 = fade(t, 0.35);
    var s2 = clamp(t * 1.6 - 0.6, 0, 1);
    var fd2 = fade(s2, 0.35);
    var cos0 = Math.cos(c.rot0), sin0 = Math.sin(c.rot0);
    function T(pts) {
      var o = [], i;
      for (i = 0; i < pts.length; i++) {
        var x = pts[i][0], y = pts[i][1];
        o.push([c.x + x * cos0 - y * sin0, c.y + x * sin0 + y * cos0]);
      }
      return o;
    }
    var V = [], k;
    for (k = 0; k < 6; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 3;
      V.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    stroke(T(V), c.rgb, c.a0 * (1 - 0.62 * fd1));
    for (k = 0; k < 6; k++) {
      var v1 = V[k], v2 = V[(k + 1) % 6];
      var tri = [[0, 0], v1, v2];
      var C1 = centroid(tri);
      var dir = norm(C1);
      var s1a = 1 - 0.10 * t, ang1 = t * 0.08 * (k % 2 ? 1 : -1);
      var mvx = dir[0] * t * R * 0.16, mvy = dir[1] * t * R * 0.16;
      stroke(T(xform(tri, C1, s1a, ang1, mvx, mvy)), c.rgb, c.a1 * fd1);
      var m1 = mid(tri[0], tri[1]), m2 = mid(tri[0], tri[2]), m3 = mid(tri[1], tri[2]);
      var subs = [[tri[0], m1, m2], [m1, tri[1], m3], [m2, m3, tri[2]], [m1, m3, m2]];
      var j;
      for (j = 0; j < 4; j++) {
        var sub = subs[j];
        var C2 = centroid(sub);
        var d2 = norm([C2[0] - C1[0], C2[1] - C1[1]]);
        var s2a = 1 - 0.12 * s2, ang2 = s2 * 0.09 * (j % 2 ? 1 : -1);
        var gmv = s2 * R * 0.07;
        var sg = xform(xform(sub, C2, s2a, ang2, d2[0] * gmv, d2[1] * gmv), C1, s1a, ang1, mvx, mvy);
        stroke(T(sg), c.rgb, c.a2 * fd2);
      }
    }
  }

  /* ---------- TRI: triângulo → 3 cantos (Sierpinski) ---------- */
  function drawTri(c, t) {
    var r = c.S * 0.577;
    var fd1 = fade(t, 0.35);
    var s2 = clamp(t * 1.6 - 0.6, 0, 1);
    var fd2 = fade(s2, 0.35);
    var cos0 = Math.cos(c.rot0), sin0 = Math.sin(c.rot0);
    function T(pts) {
      var o = [], i;
      for (i = 0; i < pts.length; i++) {
        var x = pts[i][0], y = pts[i][1];
        o.push([c.x + x * cos0 - y * sin0, c.y + x * sin0 + y * cos0]);
      }
      return o;
    }
    var V = [[0, -r], [0.866 * r, 0.5 * r], [-0.866 * r, 0.5 * r]];
    stroke(T(V), c.rgb, c.a0 * (1 - 0.62 * fd1));
    var ghost = [mid(V[0], V[1]), mid(V[1], V[2]), mid(V[2], V[0])];
    stroke(T(ghost), c.rgb, c.a0 * 0.55 * fd1 * (1 - 0.45 * fd2));
    var k;
    for (k = 0; k < 3; k++) {
      var A = V[k], B = V[(k + 1) % 3], C = V[(k + 2) % 3];
      var mA = mid(A, B), mB = mid(A, C);
      var tri = [A, mA, mB];
      var C1 = centroid(tri);
      var dir = norm([A[0] - C1[0], A[1] - C1[1]]);
      var s1a = 1 - 0.08 * t;
      var mvx = dir[0] * t * r * 0.12, mvy = dir[1] * t * r * 0.12;
      stroke(T(xform(tri, C1, s1a, 0, mvx, mvy)), c.rgb, c.a1 * fd1);
      var nA = mid(A, mA), nB = mid(A, mB), nC = mid(mA, mB);
      var minis = [[A, nA, nB], [mA, nA, nC], [mB, nB, nC]];
      var j;
      for (j = 0; j < 3; j++) {
        var mn = minis[j];
        var C2 = centroid(mn);
        var d2 = norm([C2[0] - C1[0], C2[1] - C1[1]]);
        var s2a = 1 - 0.10 * s2;
        var gmv = s2 * r * 0.06;
        var mg = xform(xform(mn, C2, s2a, 0, d2[0] * gmv, d2[1] * gmv), C1, s1a, 0, mvx, mvy);
        stroke(T(mg), c.rgb, c.a2 * fd2);
      }
    }
  }

  function drawCell(c, t) {
    if (c.type === 'quad') drawQuad(c, t);
    else if (c.type === 'hex') drawHex(c, t);
    else drawTri(c, t);
  }

  /* ---------- colocação: apenas em áreas livres do documento ---------- */
  function contentRects() {
    var sels = 'header .eyebrow, header h1, header .hero-sub, header .hero-links, header .hero-facts, .sec-head, .bcard, .pcard, .about-grid, footer .inner';
    var out = [], sy = window.scrollY || 0;
    out.push({ x: 0, y: -200, w: docW, h: 264 }); // faixa do topo (nav fixa)
    document.querySelectorAll(sels).forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      out.push({ x: r.left - 22, y: r.top + sy - 22, w: r.width + 44, h: r.height + 44 });
    });
    return out;
  }

  function findSpots() {
    var rects = contentRects();
    var placed = [], spots = [];
    var W = docW, H = docH;
    var sizes = [215, 160, 120, 88];
    var si, S, gx, gy, y, x;
    for (si = 0; si < sizes.length && spots.length < MAX_CELLS; si++) {
      S = sizes[si];
      gx = S * 1.12;
      gy = S * 1.3;
      for (y = 74 + S * 0.6; y < H - S * 0.6 - 12; y += gy) {
        for (x = 16 + S * 0.55; x < W - 16 - S * 0.55; x += gx) {
          if (spots.length >= MAX_CELLS) break;
          var jx = x + rnd(-0.18, 0.18) * S;
          var jy = y + rnd(-0.14, 0.14) * S;
          var r = { x: jx - S / 2, y: jy - S / 2, w: S, h: S };
          if (r.x < 12 || r.y < 66 || r.x + S > W - 12 || r.y + S > H - 12) continue;
          var ok = true, i;
          for (i = 0; i < rects.length; i++) { if (inter(r, rects[i])) { ok = false; break; } }
          if (ok) for (i = 0; i < placed.length; i++) { if (inter(r, placed[i])) { ok = false; break; } }
          if (!ok) continue;
          placed.push({ x: r.x - 16, y: r.y - 16, w: S + 32, h: S + 32 });
          spots.push({ x: jx, y: jy, S: S });
        }
      }
    }
    return spots;
  }

  function layout() {
    docW = Math.max(document.documentElement.offsetWidth, window.innerWidth);
    docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    var DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(docW * DPR);
    canvas.height = Math.round(docH * DPR);
    canvas.style.width = docW + 'px';
    canvas.style.height = docH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    var spots = findSpots();
    cells = [];
    var i;
    for (i = 0; i < spots.length && i < MAX_CELLS; i++) {
      var sp = spots[i];
      var gray = (i % 4 === 3);
      var c = {
        x: sp.x, y: sp.y, S: sp.S,
        type: TYPES[i % 3],
        rot0: 0,
        period: rnd(9, 16),
        phase: rnd(0, 16),
        rgb: gray ? GRAY : GOLD,
        a0: gray ? 0.26 : 0.34,
        a1: gray ? 0.22 : 0.30,
        a2: gray ? 0.16 : 0.22
      };
      if (c.type === 'quad') c.rot0 = rnd(-0.3, 0.3);
      if (c.type === 'tri') c.rot0 = Math.random() < 0.5 ? 0 : Math.PI;
      cells.push(c);
    }
    window.__fractalCells = cells;
    if (reduced) { drawStatic(); }
    else if (!raf) { raf = requestAnimationFrame(frame); }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, docW, docH);
    for (var i = 0; i < cells.length; i++) drawCell(cells[i], 0.4);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, docW, docH);
    var t = ts / 1000;
    var vy = window.scrollY || 0, vh = window.innerHeight;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.y + c.S < vy - 60 || c.y - c.S > vy + vh + 60) continue;
      var p = ((t + c.phase) / c.period) % 1;
      var s = Math.pow((1 - Math.cos(TAU * p)) / 2, 1.2);
      drawCell(c, s);
    }
  }

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layout(); if (reduced) drawStatic(); }, 180);
  });
  window.addEventListener('load', function () { layout(); if (reduced) drawStatic(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else if (!reduced && !raf) { raf = requestAnimationFrame(frame); }
  });

  layout();
})();
