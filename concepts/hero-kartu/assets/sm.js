// Direction C "Siang Malam" + deck. See sm.css for the design notes.
// ?ground=night shows the scrolled (night) state, ?clip=jaka opens a clip (both for stills).
(() => {
  const sec = document.querySelector('.sm');
  if (!sec) return;
  const stage = sec.querySelector('.sm-stage');
  const base = stage.querySelector('.sm-layer');                 // in the HTML: the day (first screen)
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const q = new URLSearchParams(location.search);
  const phone = () => innerWidth < 900;
  const KINGS = [
    { k: 'jaka', name: 'jaka tingkir', series: 'Jaka Tingkir Saga' },
    { k: 'siliwangi', name: 'prabu siliwangi', series: 'Sang Sinatria Sunda' },
    { k: 'pranaseta', name: 'prabu pranaseta', series: 'Sang Sinatria Sunda' },
    { k: 'arya', name: 'arya penangsang', series: 'Jaka Tingkir Saga' },   // owner: Arya at the very back
  ];
  const N = KINGS.length;

  // ---- build: backdrop + giant name into the night layer, then clone it as the day layer
  const back = document.createElement('div'); back.className = 'sm-back'; back.setAttribute('aria-hidden', 'true');
  KINGS.forEach((K) => { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.dataset.src = `assets/clips/${K.k}-poster.avif`; back.appendChild(im); });
  const giant = document.createElement('p'); giant.className = 'sm-giant'; giant.setAttribute('aria-hidden', 'true'); giant.innerHTML = '<span></span>';
  base.prepend(giant); base.prepend(back);

  const rise = base.cloneNode(true);                              // the night, brought up by the scroll
  rise.dataset.ground = base.dataset.ground === 'day' ? 'night' : 'day'; rise.classList.add('sm-rise'); rise.setAttribute('aria-hidden', 'true');
  const FROM = '/' + base.dataset.ground + '-', TO = '/' + rise.dataset.ground + '-';
  rise.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', '-1'));
  const h1 = rise.querySelector('h1'); const ph = document.createElement('p'); ph.className = 'h1'; ph.innerHTML = h1.innerHTML; h1.replaceWith(ph);
  rise.querySelectorAll('.card img').forEach((im) => { im.dataset.src = (im.getAttribute('src') || im.dataset.src).replace(FROM, TO); if (im.srcset) { im.dataset.srcset = im.getAttribute('srcset').replaceAll(FROM, TO); im.removeAttribute('srcset'); } im.removeAttribute('src'); im.removeAttribute('fetchpriority'); });
  // night back cards wait for the load event too, so only the front card competes for the first paint
  
  stage.appendChild(rise);
  const layers = [base, rise];

  const lazyLoad = () => stage.querySelectorAll('img[data-src]').forEach((im) => { if (im.dataset.srcset) { im.srcset = im.dataset.srcset; im.removeAttribute('data-srcset'); } im.src = im.dataset.src; im.removeAttribute('data-src'); });
  if (document.readyState === 'complete') setTimeout(lazyLoad, 200); else addEventListener('load', () => setTimeout(lazyLoad, 200));

  // ---- deck state
  let a = 0, busy = false, touched = false;
  const cardsOf = (L) => [...L.querySelectorAll('.card')];
  const slotOf = (i) => (i - a + N) % N;

  function paint() {
    layers.forEach((L) => {
      cardsOf(L).forEach((c, i) => { c.dataset.slot = slotOf(i); c.setAttribute('aria-hidden', slotOf(i) === 0 ? 'false' : 'true'); });
      L.querySelectorAll('.sm-names button').forEach((b, i) => b.setAttribute('aria-current', i === a ? 'true' : 'false'));
      L.querySelectorAll('.sm-back img').forEach((im, i) => im.classList.toggle('on', i === a));
    });
    setGiant(KINGS[a].name);
  }
  let gt;
  function setGiant(text) {
    const spans = stage.querySelectorAll('.sm-giant span');
    if (RM.matches || !spans[0].textContent) { spans.forEach((s) => (s.textContent = text)); return; }
    spans.forEach((s) => s.classList.add('out'));
    clearTimeout(gt); gt = setTimeout(() => spans.forEach((s) => { s.textContent = text; s.classList.remove('out'); }), 240);
  }

  // The swap never clips: the outgoing card lifts and slides a little to the left, fading out before it can reach
  // the screen edge or the headline; it changes layer only while invisible, then fades in at the back of the deck.
  const arc = (far) => phone()
    ? (far ? 'translate(-36%, 3%) rotate(-11deg) scale(.98)' : 'translate(-22%, 1%) rotate(-6deg) scale(1.02)')
    : (far ? 'translate(-46%, 3%) rotate(-11deg) scale(.98)' : 'translate(-26%, 1%) rotate(-6deg) scale(1.02)');
  const DUR = 760, EASE = 'cubic-bezier(.22, .8, .24, 1)';
  function go(n, dir) {
    n = (n + N) % N;
    if (n === a || busy) return;
    if (RM.matches) { a = n; paint(); return; }
    busy = true;
    const oldFront = a;
    const fwd = dir ? dir > 0 : slotOf(n) <= N / 2;
    const moving = [];
    layers.forEach((L) => {
      const cs = cardsOf(L);
      const c = fwd ? cs[oldFront] : cs[n];
      const from = getComputedStyle(c).transform, fromF = getComputedStyle(c).filter;
      moving.push({ c, from, fromF });
    });
    a = n; paint();                                                   // the rest of the deck moves by CSS transition
    moving.forEach(({ c, from, fromF }) => {
      c.style.transition = 'none';
      const to = getComputedStyle(c).transform, toF = getComputedStyle(c).filter;
      const back = (t) => `${t === 'none' ? '' : t} translate(9%, -1%) scale(.94)`;
      const frames = fwd ? [
        { transform: from, filter: fromF, opacity: 1, zIndex: 9, offset: 0 },
        { transform: arc(false), filter: 'none', opacity: 1, zIndex: 9, offset: .34 },
        { transform: arc(true), filter: 'none', opacity: 0, zIndex: 9, offset: .5 },
        { transform: back(to), filter: toF, opacity: 0, zIndex: 0, offset: .5001 },
        { transform: to, filter: toF, opacity: 1, zIndex: 0, offset: 1 },
      ] : [
        { transform: from, filter: fromF, opacity: 1, zIndex: 0, offset: 0 },
        { transform: back(from), filter: fromF, opacity: 0, zIndex: 0, offset: .4 },
        { transform: arc(true), filter: 'none', opacity: 0, zIndex: 9, offset: .4001 },
        { transform: arc(false), filter: 'none', opacity: 1, zIndex: 9, offset: .64 },
        { transform: to, filter: toF, opacity: 1, zIndex: 9, offset: 1 },
      ];
      c.animate(frames, { duration: DUR, easing: EASE }).finished.then(() => { c.style.transition = ''; });
    });
    setTimeout(() => { busy = false; }, 420);
  }

  // ---- controls (both layers: the day layer is on top below the edge)
  stage.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.go !== undefined) { user(); go(+t.dataset.go); }
    else if (t.dataset.step) { user(); go(a + +t.dataset.step, +t.dataset.step); }
    else if (t.hasAttribute('data-play')) { user(); openClip(); }
    else if (t.classList.contains('card')) {
      if (swiped) return;
      user();
      const i = +t.dataset.i;
      if (i === a) openClip(); else go(i);
    }
  });
  addEventListener('keydown', (e) => {
    if (!clip.hidden) { if (e.key === 'Escape') closeClip(); return; }
    if (progress() > .5) return;
    if (e.key === 'ArrowRight') { user(); go(a + 1, 1); } else if (e.key === 'ArrowLeft') { user(); go(a - 1, -1); }
  });
  // swipe on the deck
  let sx = 0, sy = 0, swiped = false;
  stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('.sm-deck')) return; sx = e.clientX; sy = e.clientY; swiped = false; }, { passive: true });
  stage.addEventListener('pointerup', (e) => {
    if (!e.target.closest('.sm-deck') || !sx) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = 0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; user(); go(a + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); setTimeout(() => (swiped = false), 60); }
  }, { passive: true });

  // ---- the deck deals itself while nobody touches it
  let timer;
  function user() { touched = true; clearInterval(timer); }
  function auto() {
    clearInterval(timer);
    if (RM.matches || touched || q.has('ground') || q.has('clip')) return;
    timer = setInterval(() => { if (document.hidden || !clip.hidden || progress() > .15) return; go(a + 1, 1); }, 5200);
  }

  // ---- the second ground rises as the page scrolls
  function progress() {
    if (q.get('ground') === 'night') return 1;
    const r = sec.getBoundingClientRect(), travel = sec.offsetHeight - stage.offsetHeight;
    return travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0;
  }
  // The day-to-night edge is a band of squares on a fixed screen grid, and every square ANIMATES on its own as the
  // band passes over it (owner, 18 Nov). Scroll decides which squares belong to the night; each square then moves
  // there in time, with easing, and keeps moving for a moment after the scroll stops. Three motions, ?edge=:
  //   grow     each square grows out from its centre (and shrinks back on the way up)       [default]
  //   rise     each square fills from the bottom of its cell, like a column filling up
  //   twinkle  grow, plus squares inside the band keep blinking in and out while it is on screen
  const MODE = ['grow', 'rise', 'twinkle'].includes(q.get('edge')) ? q.get('edge') : 'twinkle';   // owner picked twinkle
  // the overall line the band follows, ?shape=: skyline (stepped columns, default), diagonal, wave
  const SHAPE = ['skyline', 'diagonal', 'wave'].includes(q.get('shape')) ? q.get('shape') : 'skyline';
  const ROWS = 3, TAU = MODE === 'rise' ? 120 : 95;                   // ms time constant of each square's move
  const rnd = (a, b, k = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7 + 7.7) * 43758.5453; return x - Math.floor(x); };
  let B = 40, nC = 0, nR = 0, sq = [], lastT = 0, anim = 0, lastClip = '';
  function grid() {
    const W = stage.clientWidth, H = stage.clientHeight;
    B = phone() ? Math.round(W / 10) : Math.max(28, Math.round(W / 32));
    nC = Math.ceil(W / B); nR = Math.ceil(H / B) + 1;
    sq = Array.from({ length: nC * nR }, (_, k) => ({ c: k % nC, r: Math.floor(k / nC), s: 0, j: rnd(k % nC, Math.floor(k / nC)) }));
  }
  function edgeFrame(now) {
    anim = 0;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!sq.length || nC !== Math.ceil(W / B)) grid();
    const dt = lastT ? Math.min(64, now - lastT) : 16; lastT = now;
    let e = Math.max(0, Math.min(1, (progress() - .04) / .82));
    const BH = ROWS * B;
    const EX = SHAPE === 'diagonal' ? H * .21 : SHAPE === 'wave' ? 2.2 * B : 10 * B;  // extra travel for the shape's relief
    const F = H + BH + EX - e * (H + 2 * BH + 2 * EX);                  // the front: fully night below it
    const k = RM.matches ? 1 : 1 - Math.exp(-dt / TAU);
    // skyline: every column its own height (0 to 10 blocks, skewed low, with the odd tall tower), so the line reads
    // like a city skyline, never a uniform row
    const off = (c) => SHAPE === 'skyline' ? (Math.floor(Math.pow(rnd(c, 0, 5), 1.4) * 7) + (rnd(c, 0, 11) > .82 ? 3 : 0)) * B
      : SHAPE === 'diagonal' ? (c / Math.max(1, nC - 1) - .5) * H * .42
      : Math.sin(c / Math.max(1, nC - 1) * Math.PI * 2.2) * B * 2.2;
    const colF = Array.from({ length: nC }, (_, c) => F - off(c));     // the front, per column
    const colSolid = new Array(nC).fill(Infinity);
    const tick = Math.floor(now / 170);
    let moving = false, parts = [];
    for (const q2 of sq) {
      const y = q2.r * B, x = q2.c * B;
      const Fc = colF[q2.c];
      const BHc = SHAPE === 'skyline' ? B * (1 + Math.floor(rnd(q2.c, 0, 13) * 4)) : BH;   // ragged depth per column
      let on = y + B >= Fc - q2.j * BHc;                                   // the band: each square has its own threshold
      if (MODE === 'twinkle' && !RM.matches && y + B > Fc - BHc && y < Fc) { // inside the band, keep it alive
        if (rnd(q2.c, q2.r, tick) > .72) on = !on;
      }
      const tgt = on ? 1 : 0;
      // only the band itself animates: squares well inside the night or well inside the day snap, so a fast scroll
      // never shows a uniform grid of half-grown squares
      if (y >= Fc + B) q2.s = 1;
      else if (y + B < Fc - BHc - B) q2.s = 0;
      else q2.s += (tgt - q2.s) * k;
      if (Math.abs(tgt - q2.s) < .01) q2.s = tgt; else moving = true;
      if (q2.s <= 0.001) continue;
      if (y >= Fc + B && q2.s === 1) { colSolid[q2.c] = Math.min(colSolid[q2.c], y); continue; }   // merged into the solid part
      const sz = B * q2.s;
      if (MODE === 'rise') parts.push(`M${x} ${y + B}h${B}v${-sz.toFixed(1)}h${-B}Z`);
      else { const o = (B - sz) / 2; parts.push(`M${(x + o).toFixed(1)} ${(y + o).toFixed(1)}h${sz.toFixed(1)}v${sz.toFixed(1)}h${-sz.toFixed(1)}Z`); }
    }
    colSolid.forEach((y, c) => { if (y < Infinity) parts.push(`M${c * B} ${y}h${B}V${H + B}h${-B}Z`); });
    let c;
    if (!parts.length) c = 'none-hidden';
    else if (e >= 1 && !moving) c = 'none';
    else c = `path('${parts.join('')}')`;
    if (c !== lastClip) {
      if (c === 'none-hidden') { rise.style.visibility = 'hidden'; }
      else { rise.style.visibility = 'visible'; rise.style.clipPath = c; }
      lastClip = c;
    }
    base.style.visibility = c === 'none' ? 'hidden' : '';
    if (moving) anim = requestAnimationFrame(edgeFrame); else lastT = 0;
    if (MODE === 'twinkle' && parts.length && c !== 'none' && !RM.matches) { if (!anim) anim = requestAnimationFrame(edgeFrame); }
  }
  function wipe() { if (!anim) anim = requestAnimationFrame(edgeFrame); }
  function edge() {}
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; wipe(); }); }, { passive: true });
  addEventListener('resize', () => { sq = []; lastClip = ''; wipe(); });

  // ---- the clip: the front card grows into the player
  const clip = document.querySelector('.clip');
  const frame = clip.querySelector('.clip-frame'), video = frame.querySelector('video');
  const bg = clip.querySelector('.clip-bg'), meta = clip.querySelector('.clip-meta'), closeBtn = clip.querySelector('.clip-close');
  const still = new Image(); still.alt = ''; still.className = 'clip-still';
  Object.assign(still.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 320ms' });
  frame.appendChild(still);
  video.loop = true;
  video.addEventListener('playing', () => { still.style.opacity = '0'; });
  let opener = null;

  const frontIn = () => (progress() > .5 ? rise : base).querySelector(`.card[data-slot="0"] .card-in`);
  function flip(fromRect) {
    const to = frame.getBoundingClientRect();
    return `translate(${fromRect.left - to.left}px, ${fromRect.top - to.top}px) scale(${fromRect.width / to.width}, ${fromRect.height / to.height})`;
  }
  function openClip() {
    if (!clip.hidden) return;
    const K = KINGS[a];
    const ci = frontIn(), r = ci.getBoundingClientRect();
    opener = ci.parentElement;
    clearInterval(timer);
    still.src = ci.querySelector('img').currentSrc || ci.querySelector('img').src; still.style.opacity = '1';
    video.src = `assets/clips/${K.k}.mp4`; video.poster = '';
    meta.querySelector('.clip-name').textContent = K.name; meta.querySelector('.clip-series').textContent = K.series;
    clip.hidden = false; document.documentElement.style.overflow = 'hidden';
    video.muted = false; video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
    layers.forEach((L) => (L.querySelector('.card[data-slot="0"]').style.visibility = 'hidden'));
    const d = RM.matches ? 0 : 560;
    frame.animate([{ transform: flip(r), borderRadius: '14px' }, { transform: 'none', borderRadius: phone() ? '0px' : '14px' }], { duration: d, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d * .7, fill: 'both' });
    [meta, closeBtn].forEach((el) => el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: d * .6, delay: d * .5, fill: 'both', easing: 'cubic-bezier(.16, 1, .3, 1)' }));
    setTimeout(() => closeBtn.focus({ preventScroll: true }), d);
  }
  function closeClip() {
    if (clip.hidden) return;
    const ci = frontIn(), r = ci.getBoundingClientRect();
    const d = RM.matches ? 0 : 460;
    still.style.opacity = '1'; video.pause();
    [meta, closeBtn].forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'both' }));
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, fill: 'both' });
    frame.animate([{ transform: 'none' }, { transform: flip(r), borderRadius: '14px' }], { duration: d, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' }).finished.then(() => {
      clip.hidden = true; document.documentElement.style.overflow = '';
      layers.forEach((L) => (L.querySelector('.card[data-slot="0"]').style.visibility = ''));
      video.removeAttribute('src'); video.load();
      frame.getAnimations().forEach((x) => x.cancel());
      if (opener && !opener.closest('.sm-rise')) opener.focus({ preventScroll: true });
      auto();
    });
  }
  closeBtn.addEventListener('click', closeClip);
  clip.addEventListener('click', (e) => { if (e.target === bg) closeClip(); });
  clip.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); } });

  // the giant name sits in the band right above the headline, whatever the screen height
  function placeGiant() {
    const sr = stage.getBoundingClientRect();
    const top = base.querySelector('.sm-copy').getBoundingClientRect().top - sr.top;
    stage.querySelectorAll('.sm-giant').forEach((g) => { g.style.top = 'auto'; g.style.bottom = (sr.height - top + (phone() ? 8 : 14)) + 'px'; });
  }
  addEventListener('resize', placeGiant);
  document.fonts && document.fonts.ready.then(placeGiant);

  // ---- start
  paint(); wipe(); edge(); auto(); placeGiant();
  if (q.get('ground') === 'night') { lazyLoad(); }
  if (q.has('clip')) { const i = KINGS.findIndex((K) => K.k === q.get('clip')); if (i > 0) { a = i; paint(); } addEventListener('load', () => setTimeout(openClip, 1200)); }
})();
