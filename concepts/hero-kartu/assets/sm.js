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
  // The edge between grounds is a STATIC dithered pixel band (owner's reference video, refs/owner-skyline/):
  // three rows of square blocks on a grid where the two grounds break into each other, loose islands included.
  // The pattern never changes; in the hero it travels with the scroll, below the work wall it simply sits there.
  const BLOCK = () => Math.max(26, Math.round(stage.clientWidth / 32)), ROWS = 3, P = [.22, .52, .82];
  const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7 + 7.7) * 43758.5453; return x - Math.floor(x); };
  // squares of the LOWER ground inside the band (row 0 = top row, mostly upper ground)
  function bandSquares(W, B, salt) {
    const n = Math.ceil(W / B), out = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < n; c++) {
      const bias = .18 * Math.sin(c * .7 + salt);                         // soft clusters, so it is not uniform noise
      if (rnd(c + salt * 101, r) < P[r] + bias) out.push([c * B, r * B]);
    }
    return out;
  }
  function maskSVG(W, H, B, squares) {                                   // transparent top H, band, opaque below
    const Bh = ROWS * B, total = H + Bh + H;
    const sq = squares.map(([x, y]) => `<rect x="${x}" y="${H + y}" width="${B}" height="${B}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${total}" shape-rendering="crispEdges"><g fill="#000">${sq}<rect x="0" y="${H + Bh}" width="${W}" height="${H}"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  let maskW = 0, maskH = 0, lastY = null;
  function buildMask() {
    const W = stage.clientWidth, H = stage.clientHeight, B = BLOCK();
    const m = maskSVG(W, H, B, bandSquares(W, B, 3));
    for (const p of ['maskImage', 'webkitMaskImage']) rise.style[p] = m;
    for (const p of ['maskSize', 'webkitMaskSize']) rise.style[p] = `${W}px ${H * 2 + ROWS * B}px`;
    for (const p of ['maskRepeat', 'webkitMaskRepeat']) rise.style[p] = 'no-repeat';
    rise.style.clipPath = 'none';
    maskW = W; maskH = H; lastY = null;
  }
  function wipe() {
    const p = progress();
    let e = Math.max(0, Math.min(1, (p - .06) / .8));
    if (RM.matches) e = e > .5 ? 1 : 0;
    if (stage.clientWidth !== maskW || stage.clientHeight !== maskH) buildMask();
    const H = maskH, Bh = ROWS * BLOCK();
    const Y = Math.round(H - e * (H + Bh));                                // top of the band, in stage pixels
    if (Y !== lastY) {
      for (const pr of ['maskPosition', 'webkitMaskPosition']) rise.style[pr] = `0px ${Y - H}px`;
      rise.style.visibility = e <= 0 ? 'hidden' : 'visible';
      lastY = Y;
    }
    base.style.visibility = e >= 1 ? 'hidden' : '';
  }

  // the same band where the dark work wall meets paper (static)
  const dayEdge = document.createElement('div'); dayEdge.className = 'day-edge'; dayEdge.setAttribute('aria-hidden', 'true');
  const daySec = document.querySelector('.day'); if (daySec) daySec.prepend(dayEdge);
  function edge() {
    if (!daySec) return;
    const W = daySec.clientWidth, B = BLOCK(), Bh = ROWS * B;
    const sq = bandSquares(W, B, 9).map(([x, y]) => `<rect x="${x}" y="${y}" width="${B}" height="${B}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Bh}" shape-rendering="crispEdges"><g fill="#000">${sq}</g></svg>`;
    const m = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    const wall = daySec.previousElementSibling; if (wall) wall.style.paddingBottom = (Bh + 48) + 'px';   // the band sits on flat dark, not on the tiles
    Object.assign(dayEdge.style, { height: Bh + 'px', top: -Bh + 'px', maskImage: m, webkitMaskImage: m,
      maskSize: `${W}px ${Bh}px`, webkitMaskSize: `${W}px ${Bh}px`, maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat' });
  }
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; wipe(); }); }, { passive: true });
  addEventListener('resize', () => { wipe(); edge(); });

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
