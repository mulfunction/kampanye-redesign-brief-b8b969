// Direction B "Kartu Jadi Layar": the pixel resolve.
// Each panel's canvas paints, on a 40 px grid, the king's footage over his painted card.
// Scroll position (stage held by position: sticky) is quantised into STEPS, so the move is stepped by design
// and repaints only when the step changes (about 14 repaints for the whole resolve).
// Options: ?p=0.5 freezes the resolve at that progress (for stills).
(() => {
  const sec = document.querySelector('.kb');
  if (!sec) return;
  const stage = sec.querySelector('.kb-stage');
  const panels = [...sec.querySelectorAll('.kb-panel')];
  const q = new URLSearchParams(location.search);
  const frozen = q.has('p') ? Math.max(0, Math.min(1, parseFloat(q.get('p')))) : null;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const STEPS = 14, FRONT = 0.16, START = 0.04, END = 0.82;
  const phone = () => innerWidth < 900;

  // deterministic noise so every visit resolves the same way
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  const state = panels.map((el) => ({ el, king: el.dataset.king, cv: el.querySelector('canvas'), img: null, ready: false, blocks: [], w: 0, h: 0, dpr: 1 }));
  let step = -1, loaded = false;

  function loadFootage() {
    if (loaded) return; loaded = true;
    const size = phone() ? 540 : 720;
    state.forEach((s) => {
      if (getComputedStyle(s.el).display === 'none') return;
      const im = new Image(); im.decoding = 'async';
      im.src = `assets/img/foot-${s.king}-${size}.avif`;
      im.decode().then(() => { s.img = im; s.ready = true; draw(true); }).catch(() => {});
    });
  }

  function layout() {
    const sr = stage.getBoundingClientRect();
    const B = phone() ? 36 : 40;
    state.forEach((s, pi) => {
      const r = s.el.getBoundingClientRect();
      if (!r.width) { s.blocks = []; return; }
      s.dpr = Math.min(devicePixelRatio || 1, 2);
      s.w = r.width; s.h = r.height;
      s.cv.width = Math.round(r.width * s.dpr); s.cv.height = Math.round(r.height * s.dpr);
      const cols = Math.ceil(r.width / B), rows = Math.ceil(r.height / B);
      s.blocks = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = pi * 10000 + y * 100 + x;
        const gx = (r.left - sr.left + x * B + B / 2) / sr.width;       // sweep left to right across the whole stage
        const gy = (y * B) / r.height;
        const t = 0.6 * gx + 0.12 * (1 - gy) + 0.28 * rnd(i, 1);         // a little earlier at the top, plus grain
        s.blocks.push({ x: x * B, y: y * B, w: B, h: B, t: Math.min(t, 0.999), c: rnd(i, 2) });
      }
    });
    step = -1;
  }

  function progress() {
    if (frozen !== null) return frozen;
    const r = sec.getBoundingClientRect();
    const travel = sec.offsetHeight - stage.offsetHeight;
    return travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0;
  }

  function coverMap(s) {           // footage drawn cover-fit into the panel
    const iw = s.img.naturalWidth, ih = s.img.naturalHeight;
    const k = Math.max(s.w / iw, s.h / ih);
    return { k, ox: (s.w - iw * k) / 2, oy: (s.h - ih * k) * 0.2 };
  }

  function draw(force) {
    const p = progress();
    const lin = Math.max(0, Math.min(1, (p - START) / (END - START)));
    const st = Math.round(lin * STEPS);
    if (!force && st === step) return;
    step = st;
    const qv = (st / STEPS) * (1 + FRONT);                                  // front position
    document.documentElement.style.setProperty('--kb-done', st >= STEPS ? 1 : 0);
    state.forEach((s) => {
      if (!s.blocks.length) return;
      const ctx = s.cv.getContext('2d');
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      if (RM.matches) {                                                  // reduced motion: one cut, cross-faded by CSS
        if (s.ready && lin > 0.4) { const m = coverMap(s); ctx.drawImage(s.img, m.ox, m.oy, s.img.naturalWidth * m.k, s.img.naturalHeight * m.k); }
        return;
      }
      const m = s.ready ? coverMap(s) : null;
      for (const b of s.blocks) {
        if (b.t < qv - FRONT) {                                           // resolved: footage
          if (m) ctx.drawImage(s.img, (b.x - m.ox) / m.k, (b.y - m.oy) / m.k, b.w / m.k, b.h / m.k, b.x, b.y, b.w + .5, b.h + .5);
        } else if (b.t < qv) {                                            // the front: red and paper blocks, growing
          const age = (qv - b.t) / FRONT;                                 // 0 at the leading edge, 1 when it resolves
          const sz = b.w * (0.45 + 0.55 * age);
          const off = (b.w - sz) / 2;
          if (b.c < 0.58) ctx.fillStyle = '#FF3B30';
          else if (b.c < 0.78) ctx.fillStyle = '#F2F2F2';
          else { if (m) ctx.drawImage(s.img, (b.x - m.ox) / m.k, (b.y - m.oy) / m.k, b.w / m.k, b.h / m.k, b.x, b.y, b.w + .5, b.h + .5); continue; }
          ctx.fillRect(b.x + off, b.y + off, sz, sz);
        }
      }
    });
  }

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(false); }); };
  addEventListener('scroll', () => { loadFootage(); onScroll(); }, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(true); }, 120); });
  if (document.readyState === 'complete') setTimeout(loadFootage, 300); else addEventListener('load', () => setTimeout(loadFootage, 300));
  if (frozen !== null) loadFootage();
  layout(); draw(true);
})();
