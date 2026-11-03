/* kampanye.ai hero-arrival. One clock: gsap.ticker drives Lenis, the depth/parallax system, the follower,
   the scroll hand-off and the theatre progress. No own rAF loops, no scroll listeners.
   Motion verb: glide in, settle with weight. Eases: expo.out for entrances, expo.inOut only for covering
   elements (slats, bloom, theatre frame). Big things slower than small things; staggers 18 to 90 ms. */
(() => {
  const H = document.documentElement;
  H.classList.add('is-run');
  const RM = !H.classList.contains('motion');
  const TOUCH = H.classList.contains('touch');
  const PORTRAIT_PHONE = matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
  const VARIANT = H.dataset.intro;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const E = { out: 'expo.out', io: 'expo.inOut', soft: 'power3.out' };
  const qa = (window.__qa = { marks: {}, variant: VARIANT });
  const mark = (k) => { if (!(k in qa.marks)) qa.marks[k] = Math.round(performance.now()); };

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: E.out });

  /* ---------------- footage ---------------- */
  const video = $('[data-video]');
  const poster = $('.film__poster');
  // src + autoplay are set by the inline script under the <video> (parse time); here we only listen
  qa.videoSrc = video.src;
  const onPlaying = () => { video.classList.add('is-on'); mark('videoPlaying'); };
  if (!video.paused && video.readyState > 2) onPlaying(); else video.addEventListener('playing', onPlaying, { once: true });

  // Now-playing credit follows the loop's own edit (shot starts from tools/ha-footage.py, loop 16.783 s).
  const SHOTS = [
    [0.0, 'Musisi', 'Video musik'],
    [7.308, 'Jaka Tingkir Saga', 'Serial orisinal'],
    [8.617, 'Lembaga pemerintah', 'Film kampanye'],
    [11.217, 'Musisi', 'Video musik'],
  ];
  const nowA = $('[data-now-a]'), nowB = $('[data-now-b]');
  let shotIdx = 0;
  function setShot(i) {
    if (i === shotIdx) return;
    shotIdx = i;
    const [, a, b] = SHOTS[i];
    if (RM) { nowA.textContent = a; nowB.textContent = b; return; }
    gsap.timeline()
      .to([nowA, nowB], { yPercent: -110, duration: 0.45, ease: 'power3.in', stagger: 0.04 })
      .add(() => { nowA.textContent = a; nowB.textContent = b; })
      .fromTo([nowA, nowB], { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: E.out, stagger: 0.05 });
  }

  /* ---------------- smooth scroll on the one clock ---------------- */
  let lenis = null;
  if (!RM) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, anchors: { offset: 0, duration: 1.6 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  qa.lenis = !!lenis;
  const scrollY_ = () => (lenis ? lenis.scroll : window.scrollY);

  /* ---------------- depth system: one pointer, five planes ---------------- */
  // k = per-frame lerp at 60 Hz (heavier planes follow slower). x/y in px at the viewport edge.
  const LAYERS = {
    film:   { k: 0.045, x: -22, y: -14, rx: -1.3, ry: 2.0 },
    head:   { k: 0.07,  x: 30,  y: 16 },
    side:   { k: 0.09,  x: 14,  y: 8 },
    credit: { k: 0.1,   x: 10,  y: 6 },
    nav:    { k: 0.12,  x: 4,   y: 2 },
  };
  // the nav plane stays put on small screens: a transformed header would trap the fixed phone menu
  const layers = Object.entries(LAYERS).filter(([n]) => !(n === 'nav' && innerWidth < 768)).map(([name, c]) => {
    const el = $(`[data-depth="${name}"]`);
    const L = { name, el, ...c, cx: 0, cy: 0 };
    L.sx = gsap.quickSetter(el, 'x', 'px');
    L.sy = gsap.quickSetter(el, 'y', 'px');
    if (c.rx) { L.srx = gsap.quickSetter(el, 'rotationX', 'deg'); L.sry = gsap.quickSetter(el, 'rotationY', 'deg'); L.ss = gsap.quickSetter(el, 'scale'); }
    if (name !== 'film' && name !== 'nav') L.so = gsap.quickSetter(el, 'opacity');
    return L;
  });
  const filmL = layers[0];
  gsap.set(filmL.el, { transformPerspective: 1700, force3D: true });
  const filmClip = $('[data-film-clip]');
  const setClipY = gsap.quickSetter(filmClip, 'y', 'px');
  const setClipS = gsap.quickSetter(filmClip, 'scale');
  const setDim = gsap.quickSetter($('.dim'), 'opacity');
  gsap.set(filmClip, { transformOrigin: '50% 0%' });

  const ptr = { x: 0, y: 0, moved: false };
  const state = { theatre: 0, ui: 1 };        // theatre: 0..1 flattens the depth; tweened
  const hero = $('[data-hero]');
  let lastY = 0, heroH = hero.offsetHeight;
  addEventListener('resize', () => { heroH = hero.offsetHeight; }, { passive: true });

  if (!RM && !TOUCH) {
    addEventListener('pointermove', (e) => {
      ptr.x = (e.clientX / innerWidth) * 2 - 1;
      ptr.y = (e.clientY / innerHeight) * 2 - 1;
      ptr.moved = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { ptr.x = 0; ptr.y = 0; });
  }
  // Phone: permission-free device orientation only (Android); iOS needs a permission prompt, so it is skipped.
  const orient = { x: 0, y: 0 };
  if (!RM && TOUCH && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    let base = null;
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      if (!base) base = { g: e.gamma, b: e.beta };
      orient.x = clamp((e.gamma - base.g) / 25, -1, 1);
      orient.y = clamp((e.beta - base.b) / 25, -1, 1);
    }, { passive: true });
  }

  /* ---------------- the ticker: depth + hand-off + header + credit ---------------- */
  const top = $('[data-top]');
  let heroVisible = true;
  function tick(time, dt) {
    const r = Math.min(dt, 64) / 16.667;
    const y = scrollY_();
    const p = clamp(y / heroH, 0, 1);                       // hero hand-off progress
    // idle drift: always a little; on touch it is the main life (no hover there)
    const A = TOUCH ? 0.5 : 0.1;
    const dx = A * Math.sin(time * 0.21) + (TOUCH ? orient.x * 0.8 : 0);
    const dy = A * 0.7 * Math.sin(time * 0.17 + 1.3) + (TOUCH ? orient.y * 0.6 : 0);
    const f = 1 - state.theatre;
    const tx = (ptr.x + dx) * f, ty = (ptr.y + dy) * f;
    for (const L of layers) {
      const k = 1 - Math.pow(1 - L.k, r);
      L.cx += (tx - L.cx) * k; L.cy += (ty - L.cy) * k;
      let sy = 0, op = 1;
      if (L.name === 'head') { sy = -y * 0.42; op = 1 - p * 2.3; }
      else if (L.name === 'side' || L.name === 'credit') { sy = -y * 0.22; op = 1 - p * 2.1; }
      L.sx(L.cx * L.x);
      L.sy(L.cy * L.y + sy);
      if (L.srx) { L.srx(L.cy * L.rx); L.sry(L.cx * L.ry); L.ss(1 + p * 0.1); }
      if (L.so) L.so(clamp(op, 0, 1) * state.ui);
    }
    // film settles into a frame as the page moves on: it scales down and lags the scroll (no pin, no jacking)
    setClipS(1 - p * 0.12);
    setClipY(y * 0.34);
    setDim(p * 0.6);
    // header steps aside on scroll down past the hero, returns on scroll up
    if (Math.abs(y - lastY) > 3) { H.classList.toggle('top-away', y > heroH * 0.85 && y > lastY && !theatreOpen); lastY = y; }
    // footage: credit follows the edit; pause when out of view
    if (!video.paused) {
      const t = video.currentTime;
      let i = 0; for (let j = 0; j < SHOTS.length; j++) if (t >= SHOTS[j][0]) i = j;
      setShot(i);
    }
    const vis = p < 0.999;
    if (vis !== heroVisible && !RM) { heroVisible = vis; if (vis && !theatreOpen) video.play().catch(() => {}); else video.pause(); }
    if (theatreOpen && reel.duration) progress(reel.currentTime / reel.duration);
  }
  if (!RM) gsap.ticker.add(tick);
  else {
    // reduced motion: credit still follows the footage if the visitor plays it in the theatre; nothing else moves
    gsap.ticker.add(() => { if (theatreOpen && reel.duration) progress(reel.currentTime / reel.duration); });
  }

  // CTA band: the rule is the band squeezed to the label width (transform-only hover)
  const sizeBands = () => $$('.cta').forEach((a) => { const w = a.offsetWidth; a.style.setProperty('--sx', (w / (w + 24)).toFixed(4)); });
  sizeBands(); document.fonts.ready.then(sizeBands); addEventListener('resize', sizeBands, { passive: true });

  /* ---------------- magnetic targets (pull + counter-moving label) ---------------- */
  const cur = $('[data-cursor-el]'), curLabel = $('[data-cursor-label]');
  const mags = $$('[data-magnetic]').map((el) => {
    const inner = el.querySelector('span');
    const o = { duration: 0.8, ease: E.soft };
    return { el, s: parseFloat(el.dataset.magnetic) || 0.3, on: false,
      x: gsap.quickTo(el, 'x', o), y: gsap.quickTo(el, 'y', o),
      ix: inner ? gsap.quickTo(inner, 'x', o) : null, iy: inner ? gsap.quickTo(inner, 'y', o) : null };
  });
  qa.magnetic = { radiusPad: 46, strengths: mags.map((m) => m.s), counter: 0.35 };
  function magnet(e) {
    let any = false;
    for (const m of mags) {
      const r = m.el.getBoundingClientRect();
      const gx = gsap.getProperty(m.el, 'x'), gy = gsap.getProperty(m.el, 'y');
      const cx = r.left - gx + r.width / 2, cy = r.top - gy + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const R = Math.max(r.width, r.height) / 2 + 46;
      if (r.width && Math.hypot(dx, dy) < R && !(theatreOpen && !m.el.closest('[data-theatre]'))) {
        m.on = true; any = true;
        m.x(dx * m.s); m.y(dy * m.s);
        if (m.ix) { m.ix(-dx * m.s * 0.35); m.iy(-dy * m.s * 0.35); }
      } else if (m.on) {
        m.on = false; m.x(0); m.y(0); if (m.ix) { m.ix(0); m.iy(0); }
      }
    }
    return any;
  }

  /* ---------------- cursor follower: augments the native cursor ---------------- */
  if (!RM && !TOUCH) {
    const fx = gsap.quickTo(cur, 'x', { duration: 0.55, ease: E.soft });
    const fy = gsap.quickTo(cur, 'y', { duration: 0.55, ease: E.soft });
    addEventListener('pointermove', (e) => {
      fx(e.clientX); fy(e.clientY);
      cur.classList.add('is-ready');
      const onMag = magnet(e);
      const t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      const label = !onMag && !theatreOpen && t ? t.dataset.cursor : '';
      if (label && curLabel.textContent !== label) curLabel.textContent = label;
      cur.classList.toggle('is-label', !!label);
      cur.classList.toggle('is-mag', onMag);
    }, { passive: true });
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => cur.classList.remove('is-ready', 'is-label'));
    // pointerleave never fires when the page scrolls under a still pointer: re-check on scroll
    if (lenis) lenis.on('scroll', () => {
      if (!cur.classList.contains('is-label')) return;
      const el = document.elementFromPoint(gsap.getProperty(cur, 'x'), gsap.getProperty(cur, 'y'));
      if (!el || !el.closest('[data-cursor]')) cur.classList.remove('is-label');
    });
  }

  /* ---------------- arrival ---------------- */
  const h1 = $('[data-h1]');
  const lines = $$('.ln', h1);
  const lede = $('[data-lede]');
  const navItems = [...$$('.nav li'), $('[data-menu]')];
  const items = $$('[data-intro-item]');
  const rules = $$('.hero .cta__r');
  const master = gsap.timeline({ paused: true });
  qa.intro = master;

  // headline needs only Bodoni; the lede (split into lines) waits for Mona Sans as well
  function headPart(at) {
    gsap.set(h1, { visibility: 'visible' });
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    const t = gsap.timeline();
    if (VARIANT === 'b') {
      const chars = lines.flatMap((ln) => SplitText.create(ln, { type: 'chars', charsClass: 'ch', aria: 'hidden' }).chars);
      t.fromTo(chars, { yPercent: 108 }, { yPercent: 0, duration: 0.85, ease: E.out, stagger: 0.016 }, 0);
    } else {
      t.fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 1.35, ease: E.out, stagger: 0.09 }, 0);
    }
    t.fromTo(navItems, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.04 }, VARIANT === 'b' ? 0.15 : 0.38)
      .fromTo(items.filter((i) => !i.closest('.credit')), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: VARIANT === 'b' ? 0.8 : 1.0, stagger: 0.06 }, VARIANT === 'b' ? 0.3 : 0.62)
      // b: the credit waits for the wordmark to land in the header (it flies over the credit on phones)
      .fromTo(items.filter((i) => i.closest('.credit')), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, stagger: 0.06 }, VARIANT === 'b' ? 0.62 : 0.66)
      .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: VARIANT === 'b' ? 0.8 : 1.1, stagger: 0.08 }, VARIANT === 'b' ? 0.4 : 0.74);
    master.add(t, at);
  }
  function ledePart(at) {
    const lsplit = SplitText.create(lede, { type: 'lines', mask: 'lines', linesClass: 'lede-l', aria: 'none' });
    gsap.set(lede, { opacity: 1 });
    master.add(gsap.fromTo(lsplit.lines, { yPercent: 100 }, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: E.out }), at);
  }

  function filmPartA() {
    const slats = $$('[data-slats] i');
    gsap.set('[data-film-intro]', { scale: 1.24 });
    master
      .fromTo(slats, { scaleX: 0.9 }, { scaleX: 0, duration: 1.15, ease: E.io, stagger: { each: 0.04, from: 'center' } }, 0)
      .to('[data-film-intro]', { scale: 1, duration: 2.2, ease: E.out }, 0)
      .fromTo('.scrim', { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0.15)
      .set('[data-slats]', { display: 'none' });
    return 0.38;  // headline starts here
  }

  function filmPartB() {
    const mk = $('[data-mark] img'), logo = $('[data-logo]');
    const a = mk.getBoundingClientRect(), b = logo.querySelector('img').getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    // a small 16:9 window opens behind the held wordmark (wordmark over motion), then blooms to full bleed
    const vw = innerWidth, vh = innerHeight;
    const w = Math.min(vw * (vw < 768 ? 0.64 : 0.3), 540), h = w * 9 / 16;
    const win = `inset(${(vh - h) / 2}px ${(vw - w) / 2}px ${(vh - h) / 2}px ${(vw - w) / 2}px)`;
    gsap.set('[data-film-intro]', { scale: 1.45 });
    master
      .fromTo('.film', { clipPath: `inset(${vh / 2}px ${vw / 2}px ${vh / 2}px ${vw / 2}px)` }, { clipPath: win, duration: 0.6, ease: E.out }, 0)
      .to('.film', { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.1, ease: E.io }, 0.55)
      .to('[data-film-intro]', { scale: 1, duration: 1.9, ease: E.out }, 0)
      .fromTo('.scrim', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0.8)
      .to(mk, { x: dx, y: dy, scale: b.height / a.height, duration: 1.15, ease: E.io }, 0.55)
      .set(logo, { opacity: 1 }, 1.7)
      .set(mk, { autoAlpha: 0 }, 1.71)
      .set('.film', { clipPath: 'none' });
    return 0.75;
  }

  async function arrive() {
    mark('jsStart');
    if (RM) { mark('introDone'); return; }
    // reflect real loading: hold for the first frame (poster) to decode; b also holds the wordmark for a beat
    const decoded = poster.complete && poster.naturalWidth ? Promise.resolve() : poster.decode().catch(() => {});
    const minHold = VARIANT === 'b' ? 380 : 0;
    const since = performance.now() - window.__t0;
    await Promise.race([Promise.all([decoded, wait(Math.max(0, minHold - since))]), wait(VARIANT === 'b' ? 1000 : 450)]);
    mark('introStart');
    const textAt = VARIANT === 'b' ? filmPartB() : filmPartA();
    master.play(0);
    const bodoni = Promise.all([document.fonts.load('400 96px "Bodoni Moda"'), document.fonts.load('italic 400 96px "Bodoni Moda"')]);
    await Promise.race([bodoni, wait(900)]);
    mark('displayFontReady');
    headPart(Math.max(master.time(), textAt));
    await Promise.race([document.fonts.ready, wait(1200)]);
    mark('fontsReady');
    ledePart(Math.max(master.time(), textAt + (VARIANT === 'b' ? 0.25 : 0.52)));
    loadKarya();
    master.eventCallback('onComplete', () => { mark('introDone'); ScrollTrigger.refresh(); });
  }

  // karya posters load after the first screen has what it needs (fonts), or on the first scroll
  let karyaLoaded = false;
  function loadKarya() {
    if (karyaLoaded) return; karyaLoaded = true;
    $$('img[data-src]').forEach((i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
  }
  if (lenis) lenis.on('scroll', loadKarya); else addEventListener('scroll', loadKarya, { once: true, passive: true });
  if (RM) setTimeout(loadKarya, 400);

  /* ---------------- karya: strip reveals + layered scroll parallax ---------------- */
  function karya() {
    if (RM) return;
    const h2 = $('#karya-h');
    const s = SplitText.create(h2, { type: 'lines', mask: 'lines', aria: 'none' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.3, stagger: 0.08, scrollTrigger: { trigger: h2, start: 'top 88%', once: true } });
    gsap.from('.karya__note', { y: 20, opacity: 0, duration: 1.1, scrollTrigger: { trigger: h2, start: 'top 85%', once: true } });
    const cards = $$('.card');
    gsap.set(cards.map((c) => c.querySelector('.card__f')), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(cards.flatMap((c) => [c.querySelector('.card__t'), c.querySelector('.card__m')]), { opacity: 0 });
    cards.forEach((c) => {
      const sp = parseFloat(getComputedStyle(c).getPropertyValue('--speed')) || 0;
      gsap.fromTo(c, { y: sp * 260 }, { y: -sp * 260, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(c.querySelector('img'), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    ScrollTrigger.batch('.card', {
      start: 'top 92%', once: true,
      onEnter: (b) => gsap.timeline()
        .fromTo(b.map((c) => c.querySelector('.card__f')), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, stagger: 0.09 }, 0)
        .fromTo(b.flatMap((c) => [c.querySelector('.card__t'), c.querySelector('.card__m')]), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.05 }, 0.25),
    });
    gsap.from('.close .h3, .close__acts', { y: 28, opacity: 0, duration: 1.2, stagger: 0.08, scrollTrigger: { trigger: '.close', start: 'top 85%', once: true } });
  }

  /* ---------------- theatre: the film opens into a dark room and closes back ---------------- */
  const th = $('[data-theatre]'), stage = $('[data-stage]'), snap = $('[data-snap]'), reel = $('[data-reel]'),
    bar = $('[data-progress]'), closeBtn = $('[data-close]'), playBtn = $('[data-play]'), film = $('[data-film]');
  const setBar = gsap.quickSetter(bar, 'scaleX');
  const progress = (v) => setBar(clamp(v || 0, 0, 1));
  let theatreOpen = false, busy = false, lastFocus = null;
  const heroUI = () => [lines, $('[data-depth="side"]'), $('[data-depth="credit"]')];

  // hero loop shot -> same moment in the reel (tools/ha-footage.py edit): [captionStart, untrimmedOffset, srcIn, slow, reelOffset, reelSrcIn, reelSlow, reelDur]
  const REELMAP = [[0, 0, 6.2, 1, 0, 5.8, 1, 4.0], [2.067, 2.517, 10.8, 1, 3.3, 10.4, 1, 4.833], [4.792, 5.242, 18.5, 1, 7.433, 18.5, 1, 3.417],
    [7.308, 7.758, 41.06, 2.6, 12.158, 41.06, 2.6, 2.208], [8.617, 9.067, 3.5, 1, 13.666, 3.4, 1, 4.208], [11.217, 11.667, 3.9, 1.3, 19.483, 3.9, 1.3, 2.292],
    [12.608, 13.058, 59.0, 1, 24.582, 57.3, 1, 6.333]];
  function reelTimeFor(th) {
    let k = REELMAP[0]; for (const row of REELMAP) if (th >= row[0]) k = row;
    const [, oh, inn, sl, or, rin, rsl, rd] = k;
    const src = inn + (th + 0.9 - oh) / sl;
    return clamp(or + (src - rin) * rsl, or, or + rd - 0.75);
  }
  function containRect() {
    const vw = innerWidth, vh = innerHeight, ar = 16 / 9;
    const mw = vw * (vw > 767 ? 0.9 : 1), mh = vh * (vw > 767 ? 0.84 : 1);
    let w = mw, h = mw / ar; if (h > mh) { h = mh; w = mh * ar; }
    return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
  }
  const insetOf = (r) => `inset(${r.y}px ${innerWidth - r.x - r.w}px ${innerHeight - r.y - r.h}px ${r.x}px)`;
  // draw what the hero shows right now (cover-fit), so the theatre's first frame is identical to the hero
  function drawSnap() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    snap.width = Math.round(innerWidth * dpr); snap.height = Math.round(innerHeight * dpr);
    const ctx = snap.getContext('2d');
    const src = video.readyState >= 2 && video.classList.contains('is-on') ? video : poster;
    const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
    const fr = $('[data-film-intro]').getBoundingClientRect();
    const s = Math.max(fr.width / sw, fr.height / sh);
    const w = sw * s, h = sh * s;
    ctx.fillStyle = '#0B0B0A'; ctx.fillRect(0, 0, snap.width, snap.height);
    try { ctx.drawImage(src, (fr.left + (fr.width - w) / 2) * dpr, (fr.top + (fr.height - h) / 2) * dpr, w * dpr, h * dpr); } catch (e) {}
    return { w, h, sameAspect: Math.abs(sw / sh - 16 / 9) < 0.02 };
  }
  function placeReel(c) { Object.assign(reel.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${c.w}px`, height: `${c.h}px` }); }

  async function openTheatre() {
    if (theatreOpen || busy) return;
    busy = true; theatreOpen = true;
    lastFocus = document.activeElement && document.activeElement.matches('a,button') ? document.activeElement : playBtn;
    lenis && lenis.stop();
    cur.classList.remove('is-label');
    reel.preload = 'auto';
    if (reel.readyState === 0) reel.load();
    const c = containRect(); placeReel(c);
    if (RM) {
      th.hidden = false; gsap.set(stage, { clipPath: 'none' }); gsap.set(snap, { opacity: 0 }); gsap.set(reel, { opacity: 1 });
      reel.currentTime = reelTimeFor(video.currentTime);
      reel.play().catch(() => {}); closeBtn.focus(); busy = false; return;
    }
    // phase 1: the hero clears (lines leave through their masks, the depth flattens)
    const out = gsap.timeline();
    out.to(lines, { yPercent: -108, duration: 0.55, ease: E.io, stagger: 0.04 }, 0)
      .to(state, { theatre: 1, ui: 0, duration: 0.55, ease: E.io }, 0)
      .to('.scrim', { opacity: 0, duration: 0.55, ease: E.io }, 0)
      .to('[data-top]', { autoAlpha: 0, duration: 0.45, ease: E.io }, 0)
      .to(filmL, { cx: 0, cy: 0, duration: 0.55, ease: E.io }, 0);
    await out;
    // phase 2: the frame lifts off the page and settles into the dark room
    const fr = filmClip.getBoundingClientRect();
    const vis = { x: Math.max(0, fr.left), y: Math.max(0, fr.top), w: Math.min(innerWidth, fr.right) - Math.max(0, fr.left), h: Math.min(innerHeight, fr.bottom) - Math.max(0, fr.top) };
    const sn = drawSnap();
    th.hidden = false;
    const endScale = sn.sameAspect ? c.w / sn.w : 1;
    gsap.set(snap, { opacity: 1, scale: 1, transformOrigin: `${c.x + c.w / 2}px ${c.y + c.h / 2}px` });
    gsap.set(reel, { opacity: 0 });
    gsap.set('.theatre__bg', { opacity: 0 });
    gsap.set([closeBtn, '.theatre__bar'], { opacity: 0 });
    video.pause();
    const startAt = reelTimeFor(video.currentTime);
    qa.reelStartAt = +startAt.toFixed(2);
    const tl = gsap.timeline();
    // the reel seeks to the very moment the hero is showing, so the hand-over is a dissolve within one shot
    const seeked = new Promise((r) => { reel.addEventListener('seeked', r, { once: true }); });
    reel.currentTime = startAt;
    tl.fromTo(stage, { clipPath: insetOf(vis) }, { clipPath: insetOf(c), duration: 1.0, ease: E.io }, 0)
      .to(snap, { scale: endScale, duration: 1.0, ease: E.io }, 0)
      .to('.theatre__bg', { opacity: 1, duration: 0.8, ease: E.out }, 0.1)
      .to([closeBtn, '.theatre__bar'], { opacity: 1, duration: 0.8, stagger: 0.06 }, 0.7);
    await Promise.race([seeked, wait(2500)]);
    await tl;
    closeBtn.focus({ preventScroll: true });
    await reel.play().catch(() => {});
    gsap.to(reel, { opacity: 1, duration: 0.6, ease: 'none' });
    mark('theatreOpen');
    busy = false;
  }

  async function closeTheatre() {
    if (!theatreOpen || busy) return;
    busy = true;
    if (RM) { reel.pause(); th.hidden = true; theatreOpen = false; busy = false; lastFocus && lastFocus.focus(); return; }
    const c = containRect();
    const fr = filmClip.getBoundingClientRect();
    const vis = { x: Math.max(0, fr.left), y: Math.max(0, fr.top), w: Math.min(innerWidth, fr.right) - Math.max(0, fr.left), h: Math.min(innerHeight, fr.bottom) - Math.max(0, fr.top) };
    const sn = drawSnap();
    const endScale = sn.sameAspect ? c.w / sn.w : 1;
    gsap.set(snap, { scale: endScale, opacity: 1 });
    video.play().catch(() => {});
    const tl = gsap.timeline();
    tl.to([closeBtn, '.theatre__bar'], { opacity: 0, duration: 0.4, ease: E.out }, 0)
      .to(reel, { opacity: 0, duration: 0.45, ease: 'none' }, 0)
      .to(stage, { clipPath: insetOf(vis), duration: 1.0, ease: E.io }, 0.3)
      .to(snap, { scale: 1, duration: 1.0, ease: E.io }, 0.3)
      .to('.theatre__bg', { opacity: 0, duration: 0.7, ease: E.io }, 0.45);
    await tl;
    reel.pause();
    th.hidden = true;
    theatreOpen = false;
    gsap.timeline()
      .to(state, { theatre: 0, ui: 1, duration: 1.0, ease: E.out }, 0)
      .to('.scrim', { opacity: 1, duration: 1.0 }, 0)
      .fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 1.2, stagger: 0.08 }, 0.05)
      .to('[data-top]', { autoAlpha: 1, duration: 0.8 }, 0.2);
    lenis && lenis.start();
    (lastFocus && lastFocus !== document.body ? lastFocus : playBtn).focus({ preventScroll: true });
    busy = false;
  }
  film.addEventListener('click', (e) => { if (!e.target.closest('a,button')) openTheatre(); });
  playBtn.addEventListener('click', openTheatre);
  closeBtn.addEventListener('click', closeTheatre);
  addEventListener('keydown', (e) => {
    if (!theatreOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeTheatre(); }
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }   // the dialog has one control
  });
  qa.openTheatre = openTheatre; qa.closeTheatre = closeTheatre;

  /* ---------------- phone menu ---------------- */
  const menuBtn = $('[data-menu]');
  menuBtn.addEventListener('click', () => {
    const open = !H.classList.contains('menu-open');
    H.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('span').textContent = open ? 'Tutup' : 'Menu';
    open ? lenis && lenis.stop() : lenis && lenis.start();
    if (open && !RM) gsap.fromTo('.nav .nl', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.05 });
    if (open) $('.nav .nl').focus();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && H.classList.contains('menu-open')) menuBtn.click(); });
  $$('.nav .nl').forEach((a) => a.addEventListener('click', () => { if (H.classList.contains('menu-open')) menuBtn.click(); }));

  arrive();
  karya();
})();
