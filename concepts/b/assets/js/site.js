/* kampanye.ai, concept B "Kartu Judul". One motion verb: slam (fast in), hold, cut.
   One clock: GSAP ticker drives Lenis and every tween. No custom rAF loops, no scroll listeners. */
(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopStage = () => matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  const params = new URLSearchParams(location.search);

  /* ---------- smooth scroll on the GSAP clock ---------- */
  let lenis = null;
  if (!reduce && window.Lenis && G) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    if (ST) lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const stopScroll = () => { if (lenis) lenis.stop(); };
  const startScroll = () => { if (lenis) lenis.start(); };

  /* ---------- header colour follows the section under it ---------- */
  const sections = [...document.querySelectorAll('[data-head]')];
  const setHead = (v) => { if (html.dataset.head !== v) html.dataset.head = v; };
  if (ST) {
    sections.forEach((sec) => ST.create({
      trigger: sec, start: 'top 36px', end: 'bottom 36px',
      onToggle: (s) => { if (s.isActive) setHead(sec.dataset.head); },
    }));
  }
  if (sections[0]) setHead(sections[0].dataset.head);

  /* ---------- the title card cut (signature) ---------- */
  const cardRoot = document.querySelector('[data-cardroot]');
  let cutDone = !html.classList.contains('is-card');
  let cutTl = null;

  function cut() {
    if (cutDone) return cutTl;
    cutDone = true;
    const card = document.querySelector('.card');
    const title = document.querySelector('[data-card-title]');
    const target = document.querySelector('[data-card-target]');
    const after = [...document.querySelectorAll('[data-after]')];
    const media = document.querySelector('[data-cut-media]');
    const video = document.querySelector('[data-cut-video]');
    if (!G || !card || !title || !target) { html.classList.remove('is-card'); startScroll(); return null; }

    // FIRST: the title as the card shows it.
    const first = title.getBoundingClientRect();
    html.classList.remove('is-card');
    html.classList.add('is-cut');
    // LAST: the title where it lives after the cut.
    const last = title.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    const toInset = `inset(${Math.max(0, box.top)}px ${Math.max(0, vw - box.right)}px ${Math.max(0, vh - box.bottom)}px ${Math.max(0, box.left)}px)`;

    G.set(title, { x: first.left - last.left, y: first.top - last.top, scale: first.width / last.width, transformOrigin: '0 0' });
    G.set(card, { visibility: 'visible', clipPath: 'inset(0px 0px 0px 0px)' });

    if (video) { try { video.currentTime = 0; } catch (e) { /* not ready yet */ } const p = video.play(); if (p) p.catch(() => {}); }

    cutTl = G.timeline({ onComplete: () => { if (ST) ST.refresh(); } });
    const settle = () => {
      G.set(card, { visibility: 'hidden', clearProps: 'clipPath' });
      G.set(title, { clearProps: 'transform' });
      html.classList.remove('is-cut');   // header cuts from the red card theme to the section theme
      startScroll();
    };
    cutTl
      .to(card, { clipPath: toInset, duration: 0.62, ease: 'power4.inOut' }, 0)
      .to(title, { x: 0, y: 0, scale: 1, duration: 0.62, ease: 'power4.inOut' }, 0)
      .add(settle, 0.62)
      .fromTo(after, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3, ease: 'power4.out', stagger: 0.06, clearProps: 'clipPath' }, 0.5);
    if (media) cutTl.fromTo(media, { scale: 1.07 }, { scale: 1, duration: 1.5, ease: 'expo.out', clearProps: 'transform' }, 0);
    return cutTl;
  }
  window.__cb = { cut: () => cut(), get tl() { return cutTl; } };

  if (cardRoot && !cutDone) {
    stopScroll();
    const hold = Number(cardRoot.dataset.hold || 1600);
    const manual = params.has('hold');
    const video = document.querySelector('[data-cut-video]');
    const t0 = performance.now();
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((res) => {
        if (!video || video.readyState >= 3) return res();
        video.addEventListener('canplay', res, { once: true });
        setTimeout(res, 2600);
      }),
    ]);
    if (!manual) {
      ready.then(() => {
        const wait = Math.max(0, hold - (performance.now() - t0));
        setTimeout(cut, wait);
      });
      // any intent to move on cuts at once
      const skip = () => { ready.then(cut); off(); };
      const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
      const off = () => evs.forEach((e) => removeEventListener(e, skip));
      evs.forEach((e) => addEventListener(e, skip, { passive: true }));
    }
  }

  /* ---------- page transition: the next page's title card slams in ---------- */
  const xcard = document.querySelector('.xcard');
  const xtitle = xcard && xcard.querySelector('.xcard__t');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-card-to]');
    if (!a || !xcard || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    const lines = ((matchMedia('(max-width: 899px)').matches && a.dataset.cardToM) || a.dataset.cardTo || '').split('|');
    xtitle.innerHTML = '';
    lines.forEach((l) => { const s = document.createElement('span'); s.className = 'ln'; s.textContent = l; xtitle.appendChild(s); });
    xtitle.style.setProperty('--lines', lines.length);
    xtitle.classList.toggle('two', lines.length <= 2);
    closeMenu(true);
    html.classList.add('is-leaving');
    try { sessionStorage.setItem('cb-arrive', '1'); } catch (err) { /* private mode */ }
    if (reduce || !G) { location.href = href; return; }
    stopScroll();
    G.timeline({ onComplete: () => { location.href = href; } })
      .fromTo(xcard, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.34, ease: 'power4.out' })
      .fromTo(xtitle, { scale: 1.06, transformOrigin: '0% 50%' }, { scale: 1, duration: 0.42, ease: 'power4.out' }, 0.08)
      .to({}, { duration: 0.22 });
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted && xcard) { html.classList.remove('is-leaving'); if (G) G.set(xcard, { clipPath: 'inset(100% 0% 0% 0%)' }); startScroll(); }
  });

  /* ---------- reel controls: sound and pause ---------- */
  document.querySelectorAll('[data-sound]').forEach((btn) => {
    const v = document.getElementById(btn.getAttribute('aria-controls'));
    if (!v) return;
    const label = btn.querySelector('.lbl');
    const sync = () => {
      const on = !v.muted;
      btn.setAttribute('aria-pressed', String(on));
      label.textContent = on ? 'Matikan suara' : 'Nyalakan suara';
    };
    btn.addEventListener('click', () => {
      v.muted = !v.muted;
      if (!v.muted) { v.volume = 1; if (v.paused) { const p = v.play(); if (p) p.catch(() => {}); } }
      sync();
      const pb = document.querySelector(`[data-pause][aria-controls="${v.id}"]`);
      if (pb) pb.dispatchEvent(new Event('sync'));
    });
    v.addEventListener('volumechange', sync);
    sync();
  });
  document.querySelectorAll('[data-pause]').forEach((btn) => {
    const v = document.getElementById(btn.getAttribute('aria-controls'));
    if (!v) return;
    const label = btn.querySelector('.lbl');
    const words = (btn.dataset.pause || 'Jeda|Putar').split('|');
    const sync = () => { label.textContent = v.paused ? words[1] : words[0]; };
    btn.addEventListener('click', () => {
      if (v.paused) { v.dataset.userPaused = ''; const p = v.play(); if (p) p.catch(() => {}); }
      else { v.dataset.userPaused = '1'; v.pause(); }
    });
    btn.addEventListener('sync', sync);
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    sync();
  });
  document.querySelectorAll('[data-restart]').forEach((btn) => {
    const v = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => { v.currentTime = 0; v.muted = false; v.volume = 1; const p = v.play(); if (p) p.catch(() => {}); });
  });

  // autoplay videos only while on screen (and never under reduced motion)
  const autoVids = [...document.querySelectorAll('video[data-auto]')];
  if (reduce) {
    autoVids.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) { if (!v.dataset.userPaused && !html.classList.contains('is-card')) { const p = v.play(); if (p) p.catch(() => {}); } }
      else v.pause();
    }), { threshold: 0.15 });
    autoVids.forEach((v) => io.observe(v));
  }

  /* ---------- karya: hover / focus a title, its card slams and the screen cuts to the film ---------- */
  function stage(root, items, opts = {}) {
    if (!root) return;
    const scr = root.querySelector('[data-screen]');
    const img = scr && scr.querySelector('img');
    const vid = scr && scr.querySelector('video');
    // warm the posters so the cut shows a picture at once
    items.forEach((a) => { if (a.dataset.poster) { const i = new Image(); i.src = a.dataset.poster; } });
    const on = (a) => {
      if (!desktopStage()) return;
      root.classList.add('is-on');
      items.forEach((x) => x.classList.toggle('is-active', x === a));
      if (img && a.dataset.poster) img.src = a.dataset.poster;
      if (vid && a.dataset.loop && !reduce) {
        if (vid.getAttribute('src') !== a.dataset.loop) vid.src = a.dataset.loop;
        vid.currentTime = 0; const p = vid.play(); if (p) p.catch(() => {});
      }
    };
    const off = () => {
      root.classList.remove('is-on');
      items.forEach((x) => x.classList.remove('is-active'));
      if (vid) vid.pause();
    };
    items.forEach((a) => {
      a.addEventListener('pointerenter', () => { stopAuto(); on(a); });
      a.addEventListener('focus', () => { stopAuto(); on(a); });
      a.addEventListener('blur', () => { setTimeout(() => { if (!root.contains(document.activeElement)) { off(); startAuto(1.2); } }, 0); });
    });
    (opts.leaveEl || root).addEventListener('pointerleave', () => { off(); startAuto(1.2); });
    // idle: with nobody pointing, the index runs its own programme, one title card after another
    let autoCall = null, autoI = -1, inView = false, pointerIn = false;
    const zone = opts.leaveEl || root;
    zone.addEventListener('pointerenter', () => { pointerIn = true; });
    zone.addEventListener('pointerleave', () => { pointerIn = false; });
    function stopAuto() { if (autoCall) { autoCall.kill(); autoCall = null; } }
    function step() {
      if (!inView || pointerIn || root.contains(document.activeElement)) { autoCall = null; return; }
      autoI = (autoI + 1) % items.length;
      on(items[autoI]);
      autoCall = G.delayedCall(opts.every || 4.2, step);
    }
    function startAuto(delay) {
      if (!opts.auto || reduce || !G || !desktopStage()) return;
      stopAuto();
      autoCall = G.delayedCall(delay || 0, step);
    }
    // pointerleave never fires when the page scrolls out from under a still pointer
    if (ST) ST.create({
      trigger: root, start: 'top 60%', end: 'bottom 40%',
      onToggle: (s) => { inView = s.isActive; if (inView) startAuto(0.3); else { stopAuto(); off(); } },
    });
  }
  const karya = document.querySelector('[data-stage="karya"]');
  if (karya) stage(karya, [...karya.querySelectorAll('.row')], { leaveEl: karya.querySelector('.karya__list'), auto: true });
  const next = document.querySelector('[data-stage="next"]');
  if (next) stage(next, [...next.querySelectorAll('.next__link')], { leaveEl: next.querySelector('.next__link') });

  // phone: each card slams in as it arrives
  const rows = [...document.querySelectorAll('.karya .row')];
  if (reduce || !ST) rows.forEach((r) => r.classList.add('is-in'));
  else rows.forEach((r) => ST.create({ trigger: r, start: 'top 70%', once: true, onEnter: () => r.classList.add('is-in') }));

  // untuk agensi: your name gets the title card when it arrives
  const ag = document.querySelector('.agensi');
  if (ag) {
    if (reduce || !ST) ag.classList.add('is-in');
    else ST.create({ trigger: ag.querySelector('.agensi__word'), start: 'top 72%', once: true, onEnter: () => ag.classList.add('is-in') });
  }

  /* ---------- credits toggle ---------- */
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const words = btn.dataset.toggle.split('|');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? words[0] : words[1];
      panel.hidden = open;
      if (!open && G && !reduce) G.fromTo(panel.children, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.28, ease: 'power4.out', stagger: 0.02, clearProps: 'clipPath' });
      if (ST) ST.refresh();
    });
  });

  /* ---------- menu (phone): a red card wipes down ---------- */
  const menu = document.getElementById('menu');
  const menuBtn = document.querySelector('[aria-controls="menu"]');
  let lastFocus = null;
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    stopScroll();
    if (G && !reduce) {
      G.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.36, ease: 'power4.out' });
      G.fromTo(menu.querySelectorAll('ul a'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3, ease: 'power4.out', stagger: 0.05, delay: 0.12, clearProps: 'clipPath' });
    }
    const first = menu.querySelector('ul a');
    if (first) first.focus();
  }
  function closeMenu(silent) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (!silent) { startScroll(); if (lastFocus) lastFocus.focus(); }
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', openMenu);
    menu.querySelector('[data-close]').addEventListener('click', () => closeMenu());
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
      if (e.key === 'Tab') {
        const f = [...menu.querySelectorAll('a, button')];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => closeMenu(true)));
    menu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => startScroll()));
  }

  /* ---------- in-page anchors go through Lenis ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      if (lenis) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.1 }); history.replaceState(null, '', id); }
    });
  });
})();
