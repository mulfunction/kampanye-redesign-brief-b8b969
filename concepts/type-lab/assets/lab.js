/* Type lab shared behaviour: intro (GSAP + SplitText, local copies of 3.13.0), sound toggle, phone menu, grid overlay.
   The static frame is complete without this file; it only adds the entrance and the toggles. */
(() => {
  const d = document, html = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sound toggle: <button class="sound" data-sound="#id" aria-pressed="false"><span data-label>Nyalakan suara</span></button> */
  d.querySelectorAll('[data-sound]').forEach((btn) => {
    const v = d.querySelector(btn.dataset.sound);
    btn.addEventListener('click', () => {
      if (!v) return;
      v.muted = !v.muted;
      if (!v.muted && v.paused) v.play().catch(() => {});
      btn.setAttribute('aria-pressed', String(!v.muted));
      const l = btn.querySelector('[data-label]');
      if (l) l.textContent = v.muted ? 'Nyalakan suara' : 'Matikan suara';
    });
  });

  /* Reduced motion: loops stay on their poster frame */
  if (reduce) d.querySelectorAll('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });

  /* Phone menu */
  const mb = d.querySelector('[data-menu]');
  if (mb) {
    const set = (open) => { html.classList.toggle('menu-open', open); mb.setAttribute('aria-expanded', String(open)); mb.querySelector('[data-label]') && (mb.querySelector('[data-label]').textContent = open ? 'Tutup' : 'Menu'); };
    mb.addEventListener('click', () => set(!html.classList.contains('menu-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* Grid overlay */
  addEventListener('keydown', (e) => {
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test(e.target.tagName)) html.classList.toggle('show-grid');
  });

  /* Intro: lines rise out of masks, small text settles, image opens like a shutter. Done in about 1.6 s. */
  const start = () => {
    if (reduce || !window.gsap) { html.classList.remove('intro'); return; }
    const g = window.gsap;
    if (window.SplitText) g.registerPlugin(window.SplitText);
    const els = [...d.querySelectorAll('[data-i]')];
    const tl = g.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => splits.forEach((s) => s.revert()) });
    const splits = [];
    els.forEach((el) => {
      const kind = el.dataset.i, at = parseFloat(el.dataset.d || '0');
      if (kind === 'lines' && window.SplitText) {
        const s = window.SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
        splits.push(s);
        g.set(el, { opacity: 1 });
        tl.from(s.lines, { yPercent: 108, duration: 1.15, stagger: 0.085 }, at);
      } else if (kind === 'line') { /* manual line inside a .mask parent */
        g.set(el, { opacity: 1 });
        tl.from(el, { yPercent: 108, duration: 1.15 }, at);
      } else if (kind === 'wipe') {
        g.set(el, { opacity: 1 });
        tl.from(el, { clipPath: el.dataset.from || 'inset(0 0 100% 0)', duration: 1.35, ease: 'expo.inOut' }, at);
      } else {
        g.set(el, { opacity: 1 });
        tl.from(el, { opacity: 0, y: kind === 'fade' ? 0 : 10, duration: 0.9 }, at);
      }
    });
    html.classList.remove('intro');
  };
  (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(start);
})();
