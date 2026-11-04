// font-lab shared runtime: ?f=<sans slug>&s=<serif slug>. Applies CSS vars, fits [data-fit] words, verifies fonts, sets window.__ready.
(function () {
  const q = new URLSearchParams(location.search);
  const F = FONTS.find(x => x.slug === (q.get('f') || 'inter-display')) || FONTS[0];
  const S = SERIFS.find(x => x.slug === (q.get('s') || 'instrument-serif')) || SERIFS[0];
  window.F = F; window.S = S;
  const r = document.documentElement.style;
  r.setProperty('--fd', F.d.fam); r.setProperty('--fdw', F.d.w); r.setProperty('--fds', F.d.st); r.setProperty('--fdt', F.d.tr + 'em');
  r.setProperty('--ft', F.t.fam); r.setProperty('--ftw', F.t.w); r.setProperty('--fts', F.t.st);
  r.setProperty('--fs', S.fam); r.setProperty('--fsw', S.w); r.setProperty('--fsst', S.style); r.setProperty('--fst', S.tr + 'em');
  document.documentElement.dataset.font = F.slug;
  document.querySelectorAll('[data-fontname]').forEach(e => e.textContent = F.name);
  document.querySelectorAll('[data-serifname]').forEach(e => e.textContent = S.name);
  document.querySelectorAll('[data-lic]').forEach(e => e.textContent = F.lic);

  // fit: make the element's ink width equal data-fit px (font-size scales linearly), capped by data-max
  window.fitAll = function () {
    document.querySelectorAll('[data-fit]').forEach(el => {
      const target = +el.dataset.fit, max = +(el.dataset.max || 2000);
      el.style.whiteSpace = 'nowrap'; el.style.display = 'inline-block'; el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      el.style.fontSize = Math.min(max, 100 * target / w).toFixed(2) + 'px';
    });
  };
  window.__ready = false;
  const fams = [F.d.fam, F.t.fam, S.fam].map(x => x.replace(/'/g, ''));
  Promise.all(fams.map(f => document.fonts.load(`700 40px "${f}"`, 'abc'))).then(() => document.fonts.ready).then(() => {
    fitAll();
    window.__fontReport = fams.map(f => ({ family: f, ok: document.fonts.check(`700 40px "${f}"`, 'abc'),
      loaded: [...document.fonts].filter(x => x.family.replace(/"/g, '') === f).map(x => x.status) }));
    if (window.afterFit) window.afterFit();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
  });
})();
