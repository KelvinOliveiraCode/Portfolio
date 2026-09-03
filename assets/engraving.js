/* Engraving interactions — slow reveal, breathing gold word, cursor ring. */

(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal: section heads, panels, timeline ---- */
  var revealables = [].slice.call(document.querySelectorAll('section > .sec-head, .bcard, .pcard, .about-grid > div, .timeline .item, .hero-facts .fact'));

  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });

    revealables.forEach(function (el, i) {
      el.classList.add('rv');
      el.style.transitionDelay = (i % 3) * 0.14 + 's';
      io.observe(el);
    });
  }

  /* ---- cursor: thin circle that warms over interactive elements ---- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    var ring = document.createElement('div');
    ring.id = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);

    var raf = null, tx = 0, ty = 0, cx = 0, cy = 0, init = false;

    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!init) { cx = tx; cy = ty; ring.classList.add('on'); init = true; }
      if (raf === null) raf = requestAnimationFrame(loop);
      var t = e.target;
      var hot = t.closest && (t.closest('a') || t.closest('.bcard') || t.closest('.pcard'));
      ring.classList.toggle('hot', !!hot);
    });

    function loop() {
      cx += (tx - cx) * .12;
      cy += (ty - cy) * .12;
      ring.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .4) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    document.documentElement.addEventListener('mouseleave', function () {
      ring.classList.remove('on');
      init = false;
    });
  }

  /* ---- 3D: whole page tilts toward the mouse, cards lift with parallax ---- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    var cards = [].slice.call(document.querySelectorAll('.bcard, .pcard'));
    var maxTilt = 1.6;          /* degrees for the plate video */
    var rx = 0, ry = 0, crx = 0, cry = 0, running = false;

    var kick = function () {
      if (!running) { running = true; requestAnimationFrame(tiltLoop); }
    };

    window.addEventListener('mousemove', function (e) {
      /* -1..1 from viewport center */
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      ry = nx * maxTilt;        /* look left/right */
      rx = -ny * maxTilt;       /* look up/down */
      kick();
    });
    /* scrolling brings new cards into the band — recompute once */
    window.addEventListener('scroll', function () { kick(); }, { passive: true });

    function tiltLoop() {
      /* slow ceremonial easing, not snappy */
      crx += (rx - crx) * .045;
      cry += (ry - cry) * .045;

      var plate = document.getElementById('plate');
      if (plate) {
        var im = plate.querySelector('img');
        var el = im || plate;
        el.style.transform = 'translate(-50%,-50%) perspective(1200px) rotateX(' + crx.toFixed(3) + 'deg) rotateY(' + cry.toFixed(3) + 'deg) scale(1.06)';
      }

      /* each card tilts a touch more, only when near viewport center band */
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        if (r.bottom < -80 || r.top > window.innerHeight + 80) continue;
        /* don't fight the scroll-reveal transform until it's done */
        if (cards[i].classList.contains('rv') && !cards[i].classList.contains('in')) continue;
        var cxx = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth;
        var cyy = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        cards[i].style.transform =
          'perspective(900px) rotateX(' + (-cyy * 3 + (-rx * .5)).toFixed(3) + 'deg) rotateY(' + (cxx * 3 + (ry * .5)).toFixed(3) + 'deg) translateZ(6px)';
      }

      if (Math.abs(rx - crx) + Math.abs(ry - cry) > .002) {
        requestAnimationFrame(tiltLoop);
      } else {
        running = false;
      }
    }
    kick();
  }

  /* ---- background video removed; plate is now the still image ---- */

  /* ---- gold word in h1: slow celestial breathing ---- */
  if (!reduce) {
    var gold = document.querySelector('h1 .gold');
    if (gold) gold.classList.add('breathe-gold');
  }
})();
