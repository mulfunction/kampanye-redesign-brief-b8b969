// PINDAI page: choreography on ONE clock (gsap.ticker renders the GL; every tween lives on gsap).
// Static path (reduced motion, no WebGL2, CDN failure): finished frame + type, HUD swaps baked posters.
const d = document, html = d.documentElement;
const plate = d.querySelector('[data-pindai]');
const poster = plate.querySelector('img');
const hudBtns = [...d.querySelectorAll('.hud button')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SCAN = 2.7;     // seconds, near to far (type is fully written by ~2.7 s; the sky finishes behind it)
let base = 'akhir';

/* phone menu */
const mb = d.querySelector('[data-menu]');
const setMenu = (open) => { html.classList.toggle('menu-open', open); mb.setAttribute('aria-expanded', String(open)); mb.querySelector('[data-label]').textContent = open ? 'Tutup' : 'Menu'; };
mb.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* HUD: data-on = the layer currently SHOWN (lens included); aria-pressed = the layer CHOSEN */
const showHud = (name) => hudBtns.forEach((b) => b.toggleAttribute('data-on', b.dataset.layer === name));
const pressHud = (name) => hudBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === name)));

function staticMode() {
  html.classList.remove('intro', 'gl-on');
  plate.querySelector('source')?.remove();
  const src = { sketsa: plate.dataset.sketch, kedalaman: plate.dataset.depthPoster, akhir: plate.dataset.still };
  poster.src = src.akhir;
  // no lens here: the hint points at the layer buttons instead
  plate.querySelectorAll('.hint span').forEach((el) => { el.textContent = 'Pilih lapisan untuk melihat cara membuatnya'; });
  showHud('akhir'); pressHud('akhir');
  hudBtns.forEach((b) => b.addEventListener('click', () => { const l = b.dataset.layer; poster.src = src[l]; showHud(l); pressHud(l); }));
}

async function glMode() {
  const gsap = window.gsap;
  if (!gsap) throw new Error('gsap missing');
  const { mountPindai } = await import('./pindai-gl.js');
  const fontsReady = d.fonts ? d.fonts.ready : Promise.resolve();
  const ctl = await mountPindai(plate, { gsap });
  await fontsReady;
  const U = ctl.U;
  window.__pindai = ctl;   // QA hook (frame counter, uniforms)

  ctl.onLens((on) => showHud(on ? 'sketsa' : base));
  hudBtns.forEach((b) => b.addEventListener('click', () => {
    const l = b.dataset.layer; base = l; pressHud(l); showHud(l);
    if (l === 'akhir') gsap.to(U.uProgress, { value: 1, duration: 2.4, ease: 'power2.inOut', overwrite: 'auto' });
    else {
      const wasFinal = U.uProgress.value > 0.5;
      if (wasFinal) U.uMode.value = l === 'kedalaman' ? 1 : 0;
      else gsap.to(U.uMode, { value: l === 'kedalaman' ? 1 : 0, duration: 0.9, ease: 'power2.inOut', overwrite: 'auto' });
      gsap.to(U.uContour, { value: 1, duration: 0.6, overwrite: 'auto' });
      gsap.to(U.uProgress, { value: 0, duration: 2.0, ease: 'power2.inOut', overwrite: 'auto' });
    }
  }));

  // the scan writes each headline line: a clip wipe led by a red hairline
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const wipe = (el, at, dur = 1.2) => {
    const inn = el.querySelector('.in'), bar = el.querySelector('.bar');
    tl.set(el, { opacity: 1 }, at);
    tl.fromTo(inn, { clipPath: 'inset(-25% 100% -35% 0%)' }, { clipPath: 'inset(-25% 0% -35% 0%)', duration: dur, ease: 'power3.inOut', clearProps: 'clipPath' }, at);
    tl.fromTo(bar, { x: 0, opacity: 1 }, { x: () => inn.offsetWidth, duration: dur, ease: 'power3.inOut' }, at);
    tl.to(bar, { opacity: 0, duration: 0.35, ease: 'power1.out' }, at + dur - 0.15);
  };
  const rise = (sel, at) => { tl.fromTo(sel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, immediateRender: false }, at); };

  html.classList.add('gl-on');
  showHud('sketsa'); pressHud('akhir');
  tl.fromTo(ctl.canvas, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'none' }, 0);
  rise('.side-r', 0.15);
  tl.to(U.uContour, { value: 1, duration: 0.85, ease: 'power2.inOut' }, 0.2);
  tl.call(() => showHud('kedalaman'), null, 0.4);
  const S0 = 0.8;
  tl.to(U.uProgress, { value: 1, duration: SCAN, ease: 'power1.inOut' }, S0);
  const [w1, w2] = d.querySelectorAll('[data-w]');
  wipe(w1, 1.05, 1.15);
  wipe(w2, 1.4, 1.15);
  rise('.side-l', 1.85);
  rise('.plate .hint', S0 + SCAN);
  tl.call(() => { if (!ctl.lensOpen()) showHud('akhir'); }, null, S0 + SCAN * 0.8);
  tl.call(() => { html.classList.remove('intro'); ctl.enableLens(true); idle(); }, null, S0 + SCAN);

  // idle: a faint red pulse sweeps the depth every few seconds; on touch the lens also wanders now and then
  function idle() {
    const pulse = () => {
      gsap.fromTo(U.uPulse, { value: -0.12 }, { value: 1.12, duration: 3.6, ease: 'sine.inOut',
        onComplete: () => { U.uPulse.value = -1; gsap.delayedCall(4.4, pulse); } });
    };
    gsap.delayedCall(2.2, pulse);
    if (ctl.touch) {
      const wander = () => {
        if (ctl.sinceTap() > 8000 && base === 'akhir') { ctl.autoLens(true); gsap.delayedCall(4.6, () => ctl.autoLens(false)); }
        gsap.delayedCall(11, wander);
      };
      gsap.delayedCall(3.5, wander);
    }
  }
}

if (reduce || !html.classList.contains('intro')) staticMode();
else glMode().catch((err) => { console.warn('PINDAI: static fallback', err); staticMode(); d.querySelectorAll('[data-i]').forEach((e) => { e.style.opacity = 1; }); });
