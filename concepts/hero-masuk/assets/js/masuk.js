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
