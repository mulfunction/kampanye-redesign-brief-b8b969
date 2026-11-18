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

  const ARC = phone() ? 'translate(-46%, 4%) rotate(-11deg) scale(.96)' : 'translate(-62%, 5%) rotate(-12deg) scale(.97)';
  function go(n, dir) {
    n = (n + N) % N;
    if (n === a || busy) return;
    if (RM.matches) { a = n; paint(); return; }
    busy = true;
    const oldFront = a;
    const fwd = dir ? dir > 0 : slotOf(n) <= N / 2;
    layers.forEach((L) => {
      const cs = cardsOf(L);
      if (fwd) {
        // the front card is thrown to the left and tucked to the back
        const c = cs[oldFront];
        c.style.transition = 'none';
        a = n; c.dataset.slot = slotOf(oldFront);
        const to = getComputedStyle(c).transform, toF = getComputedStyle(c).filter;
        c.animate([
          { transform: 'none', filter: 'none', zIndex: 9 },
          { transform: ARC, filter: 'brightness(.9)', zIndex: 9, offset: .45 },
          { transform: to, filter: toF, zIndex: 0 },
        ], { duration: 720, easing: 'cubic-bezier(.3, .7, .2, 1)' }).finished.then(() => { c.style.transition = ''; });
        a = oldFront;   // restored below for the other layer; final value set after the loop
      } else {
        // the chosen card is pulled from the stack around the left and laid on top
        const c = cs[n];
        const from = getComputedStyle(c).transform, fromF = getComputedStyle(c).filter;
        c.style.transition = 'none';
        a = n; c.dataset.slot = 0;
        c.animate([
          { transform: from, filter: fromF, zIndex: 0 },
          { transform: ARC, filter: 'brightness(.9)', zIndex: 9, offset: .5 },
          { transform: 'none', filter: 'none', zIndex: 9 },
        ], { duration: 720, easing: 'cubic-bezier(.3, .7, .2, 1)' }).finished.then(() => { c.style.transition = ''; });
        a = oldFront;
      }
    });
    a = n; paint();
    setTimeout(() => { busy = false; }, 380);
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
  // The edge is an ANIMATED stepped skyline. Every ~40 px column is its own little curtain: it has its own start
  // (a left-to-right wave plus a seeded offset), and it chases its target with spring-like inertia on every frame,
  // so the columns overtake each other while the night rises and settle one by one when the scroll stops.
  const COLW = () => (phone() ? 39 : 40), UNIT = 20, LEVELS = 5;
  const seed = (i, k = 0) => { const x = Math.sin(i * 91.7 + 13.1 + k * 57.3) * 43758.5453; return x - Math.floor(x); };
  const lvl = (i) => Math.floor(seed(i) * LEVELS);
  const smooth = (t) => t * t * (3 - 2 * t);
  let cols = [], lastW = 0;
  function makeCols(W) {
    const n = Math.ceil(W / COLW());
    cols = Array.from({ length: n }, (_, c) => ({ c, x0: c * COLW(), x1: Math.min(W, (c + 1) * COLW()), y: null, v: 0,
      lag: .55 * (c / Math.max(1, n - 1)) + .45 * seed(c, 1) }));            // when this column starts, 0..1
    lastW = W;
  }
  function targets(e, H) {                                                 // e = scroll progress of the wipe, 0..1
    const SPAN = .42;                                                       // how long one column takes, in progress
    return cols.map((col) => {
      const t = smooth(Math.max(0, Math.min(1, (e - col.lag * (1 - SPAN)) / SPAN)));
      return H * (1 - t) + (t > 0 && t < 1 ? lvl(col.c) * UNIT * Math.sin(Math.PI * t) : 0);  // a step of relief mid-flight
    });
  }
  let lastClip = '', anim = 0;
  function wipe() {
    const p = progress();
    let e = Math.max(0, Math.min(1, (p - .04) / .82));
    const W = stage.clientWidth, H = stage.clientHeight;
    if (W !== lastW) makeCols(W);
    const tg = targets(RM.matches ? (e > .5 ? 1 : 0) : e, H);
    let moving = false;
    cols.forEach((col, k) => {
      if (col.y === null || RM.matches) { col.y = tg[k]; col.v = 0; return; }
      const a = (tg[k] - col.y) * .16 - col.v * .32;                        // spring toward the target, damped
      col.v += a; col.y += col.v;
      if (Math.abs(tg[k] - col.y) < .4 && Math.abs(col.v) < .4) { col.y = tg[k]; col.v = 0; } else moving = true;
    });
    const top = Math.min(...cols.map((c) => c.y)), bottom = Math.max(...cols.map((c) => c.y));
    let c;
    if (top >= H - .5) c = 'inset(100% 0 0 0)';
    else if (bottom <= .5) c = 'none';
    else c = `polygon(0px ${H}px, ${cols.map((col) => `${col.x0}px ${col.y.toFixed(1)}px, ${col.x1}px ${col.y.toFixed(1)}px`).join(', ')}, ${W}px ${H}px)`;
    if (c !== lastClip) { rise.style.clipPath = c; lastClip = c; }
    base.style.visibility = bottom <= .5 ? 'hidden' : '';
    if (moving && !anim) anim = requestAnimationFrame(() => { anim = 0; wipe(); });
  }

  // the same skyline where the dark work wall meets paper: it builds up column by column when it comes into view
  const dayEdge = document.createElement('div'); dayEdge.className = 'day-edge'; dayEdge.setAttribute('aria-hidden', 'true');
  const daySec = document.querySelector('.day'); if (daySec) daySec.prepend(dayEdge);
  let edgeT0 = null;
  function edge(now) {
    if (!daySec) return;
    const W = daySec.clientWidth, J = (LEVELS - 1) * UNIT, H = J + 2, n = Math.ceil(W / COLW());
    dayEdge.style.height = H + 'px'; dayEdge.style.top = -H + 1 + 'px';
    const el = edgeT0 === null ? 0 : RM.matches ? 9999 : now - edgeT0;
    let done = true;
    const pts = [];
    for (let c = 0; c < n; c++) {
      const x0 = c * COLW(), x1 = Math.min(W, x0 + COLW());
      const d = 70 + 420 * (.6 * c / Math.max(1, n - 1) + .4 * seed(c, 2));   // staggered start, ms
      const t = Math.max(0, Math.min(1, (el - d) / 620));
      if (t < 1) done = false;
      const eased = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * .5);       // ease-out with a hint of overshoot
      const y = (H - 1) - lvl(c) * UNIT * eased;
      pts.push(`${x0}px ${y.toFixed(1)}px`, `${x1}px ${y.toFixed(1)}px`);
    }
    dayEdge.style.clipPath = `polygon(0px ${H}px, ${pts.join(', ')}, ${W}px ${H}px)`;
    if (edgeT0 !== null && !done) requestAnimationFrame(edge);
  }
  if (daySec) new IntersectionObserver((ents, ob) => { if (ents[0].isIntersecting) { edgeT0 = performance.now(); requestAnimationFrame(edge); ob.disconnect(); } },
    { rootMargin: '0px 0px -12% 0px' }).observe(daySec);
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; wipe(); }); }, { passive: true });
  addEventListener('resize', () => { lastClip = ''; lastW = 0; wipe(); edge(performance.now()); });

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
  paint(); wipe(); edge(0); auto(); placeGiant();
  if (q.get('ground') === 'night') { lazyLoad(); }
  if (q.has('clip')) { const i = KINGS.findIndex((K) => K.k === q.get('clip')); if (i > 0) { a = i; paint(); } addEventListener('load', () => setTimeout(openClip, 1200)); }
})();
