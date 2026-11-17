// Shared script. The site must work fully without this file.

// Hero -> dock morph (Home only).
// The big h1 scrolls normally. Over the first --dock-range px of scrolling it
// shrinks, glides to the dock mark at the top-right and cross-fades into it,
// while the slim dock strip fades in behind the mark. The range ends before
// the About section reaches the strip, so the moving hero never overlaps text.
//   - Scroll-driven CSS animations do the work where supported (.dock-sda);
//     otherwise this script drives the same values (.dock-js).
//   - Reduced motion: no morph; the strip + mark simply appear once scrolled.
(function () {
  var dock = document.querySelector('.dock');
  var mark = dock && dock.querySelector('.dock-mark');
  var title = document.querySelector('.masthead .hero-title');
  var about = document.getElementById('about');
  if (!dock || !mark || !title || !about) return;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var sda = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  var range = 1;
  var ticking = false;

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function px(name) { return parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0; }

  function measure() {
    root.classList.add('dock-ready');
    root.classList.toggle('dock-sda', sda && !reduce.matches);
    root.classList.toggle('dock-js', !sda && !reduce.matches);

    var y = window.scrollY;
    var rule = parseFloat(getComputedStyle(document.body).lineHeight) || 32;
    var dockH = px('--dock-h');

    // Untransformed h1 centre in page coordinates (= viewport coords at scroll 0).
    // offsetLeft/Top are relative to .masthead-inner and ignore transforms.
    var inner = title.offsetParent.getBoundingClientRect();
    var w = title.offsetWidth;
    var h = title.offsetHeight;
    var c0x = inner.left + title.offsetLeft + w / 2;
    var c0y = inner.top + y + title.offsetTop + h / 2;

    // Dock mark centre (the dock is fixed, so this is the same at any scroll).
    var m = mark.getBoundingClientRect();
    var ctx = m.left + m.width / 2;
    var cty = m.top + m.height / 2;

    // Morph ends one rule before the About section would reach the strip.
    var aboutTop = about.getBoundingClientRect().top + y;
    range = Math.max(1, Math.round(aboutTop - dockH - rule));

    root.style.setProperty('--dock-range', range + 'px');
    root.style.setProperty('--dock-tx', (ctx - c0x).toFixed(1) + 'px');
    root.style.setProperty('--dock-ty', (range + cty - c0y).toFixed(1) + 'px');
    root.style.setProperty('--dock-s', (mark.offsetWidth / w).toFixed(4));
    update();
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    if (reduce.matches) {
      root.classList.toggle('is-docked', y > 0);
      return;
    }
    var p = clamp01(y / range);
    root.classList.toggle('is-docked', p >= 0.7);
    if (!sda) {
      root.style.setProperty('--dock-p', p.toFixed(4));
      root.style.setProperty('--hero-o', (1 - clamp01((p - 0.45) / 0.35)).toFixed(3));
      root.style.setProperty('--mark-o', clamp01((p - 0.45) / 0.35).toFixed(3));
      root.style.setProperty('--strip-o', clamp01((p - 0.3) / 0.4).toFixed(3));
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', measure);
  if (reduce.addEventListener) reduce.addEventListener('change', measure);

  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();

// Work panels: allow sticky stacking only when a whole panel fits on screen
// below the dock strip (tallest panel + --dock-h + 16px <= viewport).
// Adds .stack-fits to <html>; css/motion.css does the rest (wide screens,
// no-preference only).
(function () {
  var panels = document.querySelectorAll('.panel-stack .panel');
  if (!panels.length) return;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function px(name) {
    return parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
  }

  function check() {
    var tallest = 0;
    panels.forEach(function (p) { tallest = Math.max(tallest, p.offsetHeight); });
    var fits = !reduce.matches &&
      // --sticky-top is calc(--dock-h + 16px); custom properties come back
      // unresolved, so add the parts here.
      tallest + px('--dock-h') + 16 <= window.innerHeight;
    root.classList.toggle('stack-fits', fits);
  }

  window.addEventListener('resize', check);
  if (reduce.addEventListener) reduce.addEventListener('change', check);
  check();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
})();

// Reveal on scroll. Elements with [data-reveal] are hidden only after
// the html element gets .reveal-ready (below), and only when the visitor
// allows motion (see css/motion.css). Each element reveals once.
(function () {
  if (!('IntersectionObserver' in window)) return;

  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  var STEP_MS = 80;   // stagger between siblings entering together
  var MAX_STEPS = 6;  // cap so long groups never feel slow

  var observer = new IntersectionObserver(function (entries) {
    var entering = entries
      .filter(function (e) { return e.isIntersecting; })
      .map(function (e) { return e.target; })
      .sort(function (a, b) {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

    var perParent = new Map();
    entering.forEach(function (el) {
      var k = perParent.get(el.parentNode) || 0;
      perParent.set(el.parentNode, k + 1);
      el.style.setProperty('--delay', Math.min(k, MAX_STEPS) * STEP_MS + 'ms');
      el.classList.add('is-in');
      observer.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  document.documentElement.classList.add('reveal-ready');
  targets.forEach(function (el) { observer.observe(el); });
})();
