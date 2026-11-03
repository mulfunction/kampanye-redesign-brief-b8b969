/* KAMAR GELAP: one script for both pages.
   Motion verb: cut like an edit. Content cuts on a 1/24 s beat; only film frames move (expo.inOut).
   One clock: gsap.ticker. */
(function () {
  'use strict';
  window.__kamar = true;
  var html = document.documentElement;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = typeof window.gsap !== 'undefined' ? window.gsap : null;
  var ST = G && window.ScrollTrigger ? window.ScrollTrigger : null;
  var BEAT = 1 / 24; // seconds
  var M = 'https://kampanye.ai/media/2026-10-01/';
  var theatre = { open: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var later = function (sec, fn) { if (G) G.delayedCall(sec, fn); else setTimeout(fn, sec * 1000); };
  var tick = function (fn) { if (G) G.ticker.add(fn); else { (function loop() { fn(); requestAnimationFrame(loop); })(); } };

  // Films (real kampanye.ai media). "in" = the preview in-point in seconds, picked like an editor picks a frame; never shown.
  var FILMS = {
    'showreel':       { f: 'showreel-1-6zxp5w', title: 'Showreel', sector: 'Studio', inp: 0 },
    'jaka-tingkir':   { f: 'jaka-tingkir-official-trailer-drama-kolo-m7m7jd', title: 'Jaka Tingkir Saga', sector: 'Serial orisinal', inp: 56, start: 9, still: 'assets/stills/jt-adipati.jpg', kasus: 'karya-jaka-tingkir.html' },
    'jalur-laut':     { f: 'bnn-etomidate-jalur-laut-d2z0d2', title: 'Etomidate: Jalur Laut', sector: 'Lembaga pemerintah', inp: 26 },
    'satu-kesalahan': { f: 'bnn-satu-kesalahan-saja-ee1ozu', title: 'Satu Kesalahan Saja', sector: 'Lembaga pemerintah', inp: 1 },
    'beranda':        { f: 'polda-kaltim-beranda-ibu-kota-rnjc4h', title: 'Beranda Ibu Kota', sector: 'Lembaga pemerintah', inp: 116, still: 'assets/stills/pk-sungai.jpg' },
    'bumper':         { f: '1080p-bumper-manji-1-d3ycx8', title: 'Bumper video musik', sector: 'Label musik', inp: 30 },
    'fashion':        { f: 'komersil-z32fus', title: 'Kampanye brand fashion', sector: 'Brand fashion', inp: 2 }
  };
  var poster = function (F) { return F.still || (M + F.f + '.jpg'); };
  var mp4 = function (F, t) { return M + F.f + '.mp4' + (t ? '#t=' + t : ''); };

  var setLabel = function (btn, text) {
    var a = $('[data-label]', btn), b = $('[data-label2]', btn);
    if (a) a.textContent = text; if (b) b.textContent = text;
  };
  var unload = function (v) { try { v.pause(); } catch (e) {} v.removeAttribute('src'); v.load(); };

  /* ---------------------------------------------------------------- smooth scroll */
  var lenis = null;
  if (G && ST) G.registerPlugin(ST);
  if (!RM && window.Lenis && G) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    if (ST) lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
  }
  var stopScroll = function () { if (lenis) lenis.stop(); html.style.overflow = 'hidden'; };
  var startScroll = function () { if (lenis) lenis.start(); html.style.overflow = ''; };

  // in-page anchors through Lenis (hard cut to the section would also be on-verb; smooth scroll keeps orientation)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    closeMenu(false);
    if (lenis) lenis.scrollTo(t, { offset: 0, duration: 1.1 });
    else t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------------- cuts (no fades) */
  var cutAll = function () { $$('[data-cut]').forEach(function (el) { el.classList.add('is-cut'); }); };
  if (!html.classList.contains('motion')) cutAll();
  else {
    // hero cold open: data-cut="N" = frame number on the 24 fps beat
    $$('[data-hero] [data-cut]').forEach(function (el) {
      var n = parseInt(el.getAttribute('data-cut'), 10) || 0;
      later(n * BEAT, function () { el.classList.add('is-cut'); });
    });
    if (ST) {
      $$('[data-cutgroup]').forEach(function (g) {
        var items = $$('[data-cut]', g);
        ST.create({ trigger: g, start: 'top 84%', once: true, onEnter: function () {
          items.forEach(function (el, i) { later(i * 2 * BEAT, function () { el.classList.add('is-cut'); }); });
        } });
      });
    } else cutAll();
    later(6, cutAll); // failsafe: nothing stays hidden
  }

  /* ---------------------------------------------------------------- header + menu */
  var head = $('[data-head]');
  if (head) {
    var lastY = 0;
    var onY = function (y) {
      head.classList.toggle('is-solid', y > 40);
      var away = y > lastY && y > innerHeight * 0.85 && !head.contains(document.activeElement);
      head.classList.toggle('is-away', away);
      lastY = y;
    };
    if (lenis) lenis.on('scroll', function (l) { onY(l.scroll); });
    else addEventListener('scroll', function () { onY(scrollY); }, { passive: true });
    onY(scrollY);
    head.addEventListener('focusin', function () { head.classList.remove('is-away'); });
  }
  var menu = $('#menu'), menuBtn = $('[data-menu-open]');
  function trap(root, e) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href], button:not([disabled]), input', root).filter(function (el) { return !el.hidden && el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openMenu() {
    if (!menu) return;
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); stopScroll();
    var a = $('a', menu); if (a) a.focus();
  }
  function closeMenu(refocus) {
    if (!menu || menu.hidden) return;
    menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); startScroll();
    if (refocus !== false) menuBtn.focus();
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', openMenu);
    $('[data-menu-close]', menu).addEventListener('click', function () { closeMenu(); });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); trap(menu, e); });
  }

  /* ---------------------------------------------------------------- hero: reel, sound, pause */
  var hero = $('[data-hero]');
  var reel = $('[data-reel]');
  var userPaused = false;
  var soundBtn = $('[data-sound]'), pauseBtn = $('[data-pause]');
  function syncHero() {
    if (!reel) return;
    if (soundBtn) { var on = !reel.muted; soundBtn.setAttribute('aria-pressed', String(on)); setLabel(soundBtn, on ? 'Matikan suara' : 'Nyalakan suara'); }
    if (pauseBtn) { var p = reel.paused; pauseBtn.setAttribute('aria-pressed', String(p)); setLabel(pauseBtn, p ? 'Putar' : 'Jeda'); }
  }
  if (reel) {
    reel.addEventListener('volumechange', syncHero);
    reel.addEventListener('play', syncHero);
    reel.addEventListener('pause', syncHero);
    if (!RM) { var pr = reel.play(); if (pr) pr.catch(function () {}); } else userPaused = true;
    if (soundBtn) soundBtn.addEventListener('click', function () {
      reel.muted = !reel.muted;
      if (!reel.muted) { reel.volume = 1; userPaused = false; var p = reel.play(); if (p) p.catch(function () {}); }
      syncHero();
    });
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      if (reel.paused) { userPaused = false; reel.play().catch(function () {}); } else { userPaused = true; reel.pause(); }
    });
    if (ST) ST.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: function (s) {
      if (theatre.open) return;
      if (!s.isActive) reel.pause(); else if (!userPaused) reel.play().catch(function () {});
    } });
    syncHero();
  }

  /* rail: hover cuts the room to that film (muted); the red playhead runs under what is playing */
  var alt = $('[data-alt]'), altImg = alt && $('img', alt), altVid = alt && $('video', alt);
  var railItems = $$('[data-rail]');
  var current = railItems[0] || null, altId = null;
  function setCurrent(item) { railItems.forEach(function (r) { r.classList.toggle('is-current', r === item); }); current = item; }
  function showAlt(id) {
    var F = FILMS[id]; if (!F || !alt) return;
    altId = id;
    alt.classList.remove('is-playing');
    altImg.src = poster(F);
    hero.classList.add('is-alt');
    altVid.src = mp4(F, F.inp); altVid.muted = true;
    altVid.play().catch(function () {});
  }
  function hideAlt() {
    if (!alt || !altId) return;
    altId = null; hero.classList.remove('is-alt'); alt.classList.remove('is-playing'); unload(altVid);
  }
  if (altVid) altVid.addEventListener('playing', function () { if (altId) alt.classList.add('is-playing'); });
  railItems.forEach(function (item) {
    var id = item.getAttribute('data-rail');
    item.addEventListener('click', function () { openTheatre(id, $('.rail__thumb', item), 'rect'); });
    if (FINE) item.addEventListener('pointerenter', function () {
      setCurrent(item);
      if (id === 'showreel') hideAlt(); else showAlt(id);
    });
  });
  var railEl = $('.rail');
  if (railEl && FINE) railEl.addEventListener('pointerleave', function () { hideAlt(); setCurrent(railItems[0]); });

  /* ---------------------------------------------------------------- LAMPU PADAM (theatre) */
  var th = $('[data-theatre]');
  var frame = th && $('[data-frame]', th), fImg = frame && $('img', frame), fVid = frame && $('video', frame);
  var thTitle = th && $('[data-th-title]', th), thSector = th && $('[data-th-sector]', th);
  var thSound = th && $('[data-th-sound]', th), thPause = th && $('[data-th-pause]', th);
  var thClose = th && $('[data-theatre-close]', th), thCase = th && $('[data-th-case]', th), seek = th && $('[data-seek]', th);
  var margin = function () { return Math.min(32, Math.max(20, innerWidth * 0.022)); };
  function stageRect() {
    var vw = innerWidth, vh = innerHeight, phone = vw <= 820;
    var top = phone ? 92 : 80, bottom = phone ? 150 : 118, side = phone ? 0 : margin();
    var aw = vw - side * 2, ah = vh - top - bottom;
    var w = aw, h = w * 9 / 16;
    if (h > ah) { h = ah; w = h * 16 / 9; }
    return { left: (vw - w) / 2, top: top + (ah - h) / 2, width: w, height: h };
  }
  function flipFrom(t, el, mode) {
    var vw = innerWidth, vh = innerHeight, s;
    if (mode === 'cover') {
      s = Math.max(vw / t.width, vh / t.height);
      return { x: (vw - t.width * s) / 2 - t.left, y: (vh - t.height * s) / 2 - t.top, scale: s };
    }
    var r = el && el.getBoundingClientRect();
    if (!r || !r.width || r.bottom < 0 || r.top > vh) {
      s = 0.22;
      return { x: (vw - t.width * s) / 2 - t.left, y: (vh - t.height * s) / 2 - t.top, scale: s };
    }
    s = r.width / t.width;
    return { x: r.left - t.left, y: r.top - t.top + (r.height - t.height * s) / 2, scale: s };
  }
  function syncTh() {
    if (!fVid) return;
    var on = !fVid.muted;
    thSound.setAttribute('aria-pressed', String(on)); setLabel(thSound, on ? 'Matikan suara' : 'Nyalakan suara');
    thPause.setAttribute('aria-pressed', String(fVid.paused)); setLabel(thPause, fVid.paused ? 'Putar' : 'Jeda');
  }
  function layoutFrame() {
    var t = stageRect();
    frame.style.left = t.left + 'px'; frame.style.top = t.top + 'px';
    frame.style.width = t.width + 'px'; frame.style.height = t.height + 'px';
    return t;
  }
  function chromeOn() {
    theatre.grown = true;
    if (theatre.ready) frame.classList.add('is-playing'); // the picture cuts in only when the push has landed
    th.classList.add('is-chrome'); thClose.focus({ preventScroll: true });
  }
  function openTheatre(id, srcEl, mode) {
    var F = FILMS[id]; if (!F || !th) return;
    theatre.open = true; theatre.id = id; theatre.src = srcEl; theatre.mode = mode;
    theatre.opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : srcEl;
    theatre.resume = reel && !reel.paused;
    hidePreview();
    var heroTime = reel ? reel.currentTime : 0;
    if (reel) reel.pause();
    hideAlt();
    // media first, inside the click (user activation allows sound)
    frame.classList.remove('is-playing');
    frame.style.viewTransitionName = '';
    var sImg = srcEl && (srcEl.tagName === 'IMG' ? srcEl : $('img', srcEl));
    fImg.src = (sImg && (sImg.currentSrc || sImg.src)) || poster(F);
    fVid.poster = poster(F);
    theatre.grown = false; theatre.ready = false;
    fVid.src = mp4(F, F.start || 0);
    fVid.muted = false; fVid.volume = 1;
    fVid.onloadedmetadata = function () { if (id === 'showreel' && heroTime) { try { fVid.currentTime = heroTime; } catch (e) {} } };
    var p = fVid.play();
    if (p) p.catch(function () { fVid.muted = true; fVid.play().catch(function () {}); syncTh(); });
    thTitle.textContent = F.title; thSector.textContent = F.sector;
    if (F.kasus && !document.body.classList.contains('case')) { thCase.hidden = false; thCase.href = F.kasus; } else thCase.hidden = true;
    syncTh();
    // the house lights cut: overlay at once, then only the frame moves
    var t = layoutFrame();
    th.hidden = false; th.classList.add('is-open'); stopScroll();
    if (RM || !G) { if (G) G.set(frame, { x: 0, y: 0, scale: 1 }); chromeOn(); return; }
    window.__kamarTween = G.fromTo(frame, flipFrom(t, srcEl, mode), { x: 0, y: 0, scale: 1, duration: 0.72, ease: 'expo.inOut', delay: 2 * BEAT, overwrite: true, onComplete: chromeOn });
  }
  function closeTheatre() {
    if (!theatre.open) return;
    th.classList.remove('is-chrome');
    var done = function () {
      th.classList.remove('is-open'); th.hidden = true;
      unload(fVid); frame.classList.remove('is-playing');
      startScroll(); theatre.open = false;
      if (theatre.resume && reel) reel.play().catch(function () {});
      var o = theatre.opener; if (o && o.focus) o.focus({ preventScroll: true });
    };
    fVid.muted = true;
    if (RM || !G) { done(); return; }
    var t = { left: parseFloat(frame.style.left), top: parseFloat(frame.style.top), width: parseFloat(frame.style.width), height: parseFloat(frame.style.height) };
    G.to(frame, Object.assign(flipFrom(t, theatre.src, theatre.mode), { duration: 0.56, ease: 'expo.inOut', overwrite: true, onComplete: done }));
  }
  if (th) {
    fVid.addEventListener('playing', function () { theatre.ready = true; if (theatre.grown) frame.classList.add('is-playing'); syncTh(); });
    fVid.addEventListener('pause', syncTh); fVid.addEventListener('volumechange', syncTh);
    thClose.addEventListener('click', closeTheatre);
    thSound.addEventListener('click', function () { fVid.muted = !fVid.muted; if (!fVid.muted && fVid.paused) fVid.play().catch(function () {}); });
    thPause.addEventListener('click', function () { if (fVid.paused) fVid.play().catch(function () {}); else fVid.pause(); });
    seek.addEventListener('input', function () { if (fVid.duration) fVid.currentTime = seek.value / 1000 * fVid.duration; });
    thCase.addEventListener('click', function () { frame.style.viewTransitionName = 'film'; });
    th.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeTheatre(); } trap(th, e); });
    addEventListener('resize', function () { if (theatre.open) { layoutFrame(); if (G) G.set(frame, { x: 0, y: 0, scale: 1 }); } });
  }
  $$('[data-theatre-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-theatre-open');
      if (b.getAttribute('data-from') === 'hero') return openTheatre(id, $('.hero__media', hero), 'rect');
      var src = null;
      if (preview && preview.classList.contains('is-on')) src = preview;
      else { var th2 = $('.row__thumb, .film__frame', b); if (th2 && th2.offsetParent) src = th2; }
      if (!src && b.getAttribute('data-src')) src = $(b.getAttribute('data-src'));
      openTheatre(id, src, 'rect');
    });
  });

  /* ---------------------------------------------------------------- karya index: the preview frame (dolly) */
  var preview = $('[data-preview]'), pImg = preview && $('img', preview), pVid = preview && $('video', preview), pLab = preview && $('[data-preview-label]', preview);
  var pOn = null, px = 0, py = 0, qx = null, qy = null;
  function placePreview(x, y, instant) {
    var w = preview.offsetWidth || 400, h = preview.offsetHeight || 225;
    var cx = Math.min(x + 28, innerWidth - w - 12);
    var cy = Math.min(Math.max(y - h - 18, 12), innerHeight - h - 12);
    if (!G) { preview.style.left = cx + 'px'; preview.style.top = cy + 'px'; return; }
    if (instant || RM) { G.set(preview, { x: cx, y: cy }); return; }
    qx(cx); qy(cy);
  }
  function showPreview(row) {
    var id = row.getAttribute('data-film'), F = FILMS[id]; if (!F) return;
    var list = row.closest('[data-index]');
    if (list) list.classList.add('is-hovering');
    $$('[data-index] [data-film]').forEach(function (r) { r.classList.toggle('is-on', r === row); });
    if (pOn === id) return;
    var first = !preview.classList.contains('is-on');
    pOn = id;
    preview.classList.remove('is-playing');
    pImg.src = poster(F);
    pLab.textContent = F.kasus ? 'Buka studi kasus' : 'Putar dengan suara';
    if (first) placePreview(px, py, true);
    preview.classList.add('is-on');
    if (!RM) { pVid.src = mp4(F, F.inp); pVid.muted = true; pVid.play().catch(function () {}); }
  }
  function hidePreview() {
    if (!preview) return;
    $$('[data-index]').forEach(function (l) { l.classList.remove('is-hovering'); });
    $$('[data-index] [data-film]').forEach(function (r) { r.classList.remove('is-on'); });
    if (!pOn) return;
    pOn = null; preview.classList.remove('is-on', 'is-playing'); unload(pVid);
  }
  if (preview && FINE) {
    if (G) { qx = G.quickTo(preview, 'x', { duration: 0.38, ease: 'power3.out' }); qy = G.quickTo(preview, 'y', { duration: 0.38, ease: 'power3.out' }); }
    pVid.addEventListener('playing', function () { if (pOn) preview.classList.add('is-playing'); });
    addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (pOn) placePreview(px, py); }, { passive: true });
    $$('[data-index]').forEach(function (list) {
      $$('[data-film]', list).forEach(function (row) { row.addEventListener('pointerenter', function () { showPreview(row); }); });
      list.addEventListener('pointerleave', hidePreview);
    });
    var check = function () { if (pOn) { var el = document.elementFromPoint(px, py); if (!el || !el.closest('[data-index]')) hidePreview(); } };
    if (lenis) lenis.on('scroll', check); else addEventListener('scroll', check, { passive: true });
  }
  // keyboard focus on a row: italic take + red rule come from CSS (:focus-visible), no preview needed
  $$('a.row[data-film]').forEach(function (a) {
    a.addEventListener('click', function () {
      // home to case: the film frame is the only thing that moves (View Transitions)
      var src = preview && preview.classList.contains('is-on') ? preview : $('.row__thumb', a);
      if (src && src.offsetParent !== null) src.style.viewTransitionName = 'film';
    });
  });
  addEventListener('pageshow', function () {
    hidePreview();
    $$('[style*="view-transition-name"]').forEach(function (el) { el.style.viewTransitionName = ''; });
  });

  /* ---------------------------------------------------------------- lembar kontak: the red pick */
  $$('[data-strip]').forEach(function (strip) {
    var pick = function (fig) { $$('figure', strip).forEach(function (f) { f.classList.toggle('is-pick', f === fig); }); };
    if (FINE) strip.addEventListener('pointerover', function (e) { var f = e.target.closest('figure'); if (f) pick(f); });
    else strip.addEventListener('click', function (e) { var f = e.target.closest('figure'); if (f) pick(f); });
  });

  /* ---------------------------------------------------------------- cara kerja: playhead scrubbed by scroll */
  var tl = $('[data-timeline]'), ph = $('[data-playhead]');
  if (tl && ph) {
    var hum = $$('.blk--m', tl), all = $$('.blk', tl);
    var setP = function (p) {
      var phone = innerWidth <= 820;
      if (!phone) {
        var x0 = Math.min.apply(null, all.map(function (b) { return b.offsetLeft; }));
        var x = x0 + p * (tl.clientWidth - x0 - 2);
        ph.style.transform = 'translateX(' + x + 'px)';
        hum.forEach(function (b) { b.classList.toggle('is-lit', x >= b.offsetLeft + 4); });
      } else {
        var y0 = Math.min.apply(null, all.map(function (b) { return b.offsetTop; }));
        var y = y0 + p * (tl.clientHeight - y0 - 2);
        ph.style.transform = 'translateY(' + y + 'px)';
        hum.forEach(function (b) { b.classList.toggle('is-lit', y >= b.offsetTop + 4); });
      }
    };
    if (ST && !RM) {
      ST.create({ trigger: tl, start: 'top 72%', end: 'bottom 38%', scrub: true, invalidateOnRefresh: true, onUpdate: function (s) { setP(s.progress); }, onRefresh: function (s) { setP(s.progress); } });
      setP(0);
    } else { setP(1); addEventListener('resize', function () { setP(1); }); }
  }

  /* ---------------------------------------------------------------- closing band: the red wipe */
  var cta = $('[data-cta]'), ctaLink = cta && $('[data-cta-link]', cta);
  if (cta && ctaLink) {
    var lit = function (fromRight) {
      cta.classList.toggle('from-right', !!fromRight);
      void cta.offsetWidth; // commit the start edge before the wipe
      cta.classList.add('is-lit');
    };
    var unlit = function () { cta.classList.remove('is-lit'); };
    ctaLink.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { var r = ctaLink.getBoundingClientRect(); lit(e.clientX > r.left + r.width / 2); } });
    ctaLink.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') unlit(); });
    ctaLink.addEventListener('pointerdown', function () { lit(false); });
    ctaLink.addEventListener('focus', function () { if (ctaLink.matches(':focus-visible')) lit(false); });
    ctaLink.addEventListener('blur', unlit);
  }

  /* ---------------------------------------------------------------- case page: process wipe (red cut line) */
  $$('[data-cutwipe]').forEach(function (c) {
    var r = $('input', c);
    var set = function () { c.style.setProperty('--p', r.value + '%'); };
    r.addEventListener('input', set); set();
  });

  /* ---------------------------------------------------------------- one clock: playheads */
  tick(function () {
    // rail playhead
    if (current) {
      var b = $('.ph b', current), v = null, inp = 0;
      if (altId && altVid && !altVid.paused) { v = altVid; inp = FILMS[altId].inp; }
      else if (current.getAttribute('data-rail') === 'showreel') v = reel;
      if (b && v && v.duration) b.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (v.currentTime - inp) / Math.max(1, v.duration - inp))) + ')';
      else if (b) b.style.transform = 'scaleX(0)';
    }
    if (theatre.open && fVid && fVid.duration) {
      var pc = fVid.currentTime / fVid.duration;
      if (document.activeElement !== seek) seek.value = Math.round(pc * 1000);
      seek.style.setProperty('--p', (pc * 100).toFixed(2) + '%');
    }
  });

  if (ST) addEventListener('load', function () { ST.refresh(); });
})();
