/* masuk.js: phone menu sheet + scroll fallback for browsers without CSS scroll timelines.
   No library. The fallback only runs a rAF while the hero is on screen and only after a scroll event. */
(function () {
  var h = document.documentElement;
  // menu sheet (phones)
  var btn = document.querySelector('.menu-btn');
  var sheet = document.getElementById('sheet');
  if (btn && sheet) {
    var close = sheet.querySelector('.close');
    var open = function () { sheet.hidden = false; requestAnimationFrame(function () { sheet.classList.add('is-open'); }); btn.setAttribute('aria-expanded', 'true'); sheet.querySelector('a').focus(); };
    var shut = function () { sheet.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); setTimeout(function () { sheet.hidden = true; }, 220); btn.focus(); };
    btn.addEventListener('click', open);
    close.addEventListener('click', shut);
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) shut(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) shut(); });
  }
  // poster wall: the tiles carry data-src so nothing of Karya downloads during the hero; fetch them once the
  // section is within about one screen (the hero runway is long, so this starts during the glide, not at load)
  var wall = document.querySelector('.wall');
  if (wall) {
    var fill = function () {
      [].forEach.call(wall.querySelectorAll('[data-srcset]'), function (el) { el.srcset = el.getAttribute('data-srcset'); el.removeAttribute('data-srcset'); });
      [].forEach.call(wall.querySelectorAll('img[data-src]'), function (el) { el.src = el.getAttribute('data-src'); el.removeAttribute('data-src'); });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fill(); } }, { rootMargin: '0px 0px 100% 0px' });
      io.observe(wall);
    } else fill();
  }
  // scroll fallback: seek the paused CSS animations through --p
  if (window.CSS && CSS.supports('animation-timeline: view()')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sec = document.querySelector('.masuk');
  if (!sec) return;
  var visible = false, queued = false;
  function place() {
    queued = false;
    var r = sec.getBoundingClientRect();
    var run = r.height - innerHeight;
    var p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    sec.style.setProperty('--p', p.toFixed(4));
  }
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) place(); }).observe(sec);
  addEventListener('scroll', function () { if (visible && !queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', place);
  place();
})();
