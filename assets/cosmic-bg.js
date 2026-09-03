/* Cosmic Engraving overlay — the engraved plate image (fixed, behind) does the
   heavy lifting; this canvas adds only living texture on top: paper grain,
   faint hatching, dust, motes. Slow, ceremonial. No second star — the plate owns it. */

(function () {
  'use strict';
  var canvas = document.getElementById('fractal-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, DPR;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  var grainCv, hatchCv, drift = 0, t = 0;
  var stars = [];
  var points = [];

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    /* fine film grain tile */
    grainCv = document.createElement('canvas');
    grainCv.width = grainCv.height = 256;
    var g = grainCv.getContext('2d');
    var id = g.createImageData(256, 256);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = Math.random() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = Math.random() < .5 ? 12 : 4;
    }
    g.putImageData(id, 0, 0);

    /* giant faint cross-hatch */
    hatchCv = document.createElement('canvas');
    hatchCv.width = W; hatchCv.height = H;
    var h = hatchCv.getContext('2d');
    h.clearRect(0, 0, W, H);
    h.strokeStyle = 'rgba(241,241,238,.03)';
    h.lineWidth = 1;
    var step = 7;
    for (var x = -H; x < W; x += step) {
      h.beginPath(); h.moveTo(x, 0); h.lineTo(x + H, H); h.stroke();
    }
    h.strokeStyle = 'rgba(241,241,238,.022)';
    for (var y2 = -W; y2 < H; y2 += step) {
      h.beginPath(); h.moveTo(0, y2); h.lineTo(W, y2 + W); h.stroke();
    }

    /* paper dust */
    stars = [];
    var n = Math.min(90, Math.round(W * H / 26000));
    for (var s = 0; s < n; s++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * .7 + .3,
        a: Math.random() * .12 + .04,
        ph: Math.random() * TAU,
        sp: Math.random() * .00018 + .00006
      });
    }

    /* drifting motes */
    points = [];
    for (var p = 0; p < 26; p++) {
      points.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .06,
        vy: -Math.random() * .04 - .012,
        r: Math.random() * .9 + .4,
        a: Math.random() * .22 + .08
      });
    }
  }

  function frame(ts) {
    t = ts;
    ctx.clearRect(0, 0, W, H);

    /* grain tile drifting */
    drift = (ts * .004) % 256;
    ctx.globalAlpha = 1;
    var pat = ctx.createPattern(grainCv, 'repeat');
    ctx.save();
    ctx.translate(-drift, drift * .6);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();

    /* cross-hatch breathing */
    var breathe = .5 + Math.sin(ts * .00008) * .5;
    ctx.globalAlpha = .35 + breathe * .65;
    ctx.drawImage(hatchCv, 0, 0);
    ctx.globalAlpha = 1;

    /* paper dust twinkling */
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (.5 + .5 * Math.sin(ts * s.sp * 1000 + s.ph));
      ctx.fillStyle = 'rgba(216,217,220,' + a + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }

    /* drifting motes */
    for (var p = 0; p < points.length; p++) {
      var m = points[p];
      m.x += m.vx; m.y += m.vy;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10;
      ctx.fillStyle = 'rgba(184,185,188,' + m.a + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
    }

    if (!reduce) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () {
    clearTimeout(canvas._rt);
    canvas._rt = setTimeout(size, 180);
  });

  size();
  if (reduce) { frame(0); } else { requestAnimationFrame(frame); }
})();
