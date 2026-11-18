// kampanye AI nav prototype: full-width bar -> compact pill on scroll (desktop), pill -> panel on Menu (phone).
// Measures real element widths, writes the pill geometry into CSS variables; CSS does all the motion (transform,
// opacity, clip-path only). Options: ?pill=paper (light pill), ?slow=4 (slow motion for review).
(() => {
  const nav = document.querySelector('.nav');
    const row = nav.querySelector('.nav-row');
  const logo = nav.querySelector('.nav-logo');
  const links = nav.querySelector('.nav-links');
  const cta = nav.querySelector('.nav-cta');
  const menu = nav.querySelector('.nav-menu');
  const panel = nav.querySelector('#nav-panel');
  const q = new URLSearchParams(location.search);
  if (q.get('pill') === 'paper') nav.dataset.pill = 'paper';
  const slow = Math.max(1, Math.min(10, parseFloat(q.get('slow')) || 1));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const dur = () => reduce.matches ? 1 : 560 * slow;
  root.style.setProperty('--dur', dur() + 'ms');

  // pill paddings and gaps (px), from the reference: logo sits ~16 px in, CTA ~6 px from the pill edge
  const PAD_L = 18, PAD_R = 6, GAP = 28, GAP_PHONE = 16;

  function measure() {
    const vw = row.clientWidth;
    const m = parseFloat(getComputedStyle(row).paddingLeft);
    const phone = getComputedStyle(menu).display !== 'none';
    const lw = logo.offsetWidth;
    const right = phone ? menu.offsetWidth : cta.offsetWidth;
    const mid = phone ? 0 : links.offsetWidth;
    const W = phone ? PAD_L + lw + GAP_PHONE + right + PAD_R
                    : PAD_L + lw + GAP + mid + GAP + right + PAD_R;
    // phone: the bar tightens into a full-width floating pill (12 px from the edges), logo left, Menu right;
    // a centred mini pill would crowd the logo against Menu
    const ix = phone ? 12 : Math.max(8, (vw - W) / 2);
    root.style.setProperty('--ix', ix + 'px');
    root.style.setProperty('--gap', GAP + 'px');
    if (!phone) {   // centre the links between the logo and the CTA inside the pill (logo and CTA differ in width)
      const spanL = ix + PAD_L + lw, spanR = vw - ix - PAD_R - right;
      root.style.setProperty('--dxM', ((spanL + spanR) / 2 - vw / 2) + 'px');
    }
    root.style.setProperty('--dxL', (ix + PAD_L - m) + 'px');      // logo: margin -> inside the pill's left edge
    root.style.setProperty('--dxR', (m - ix - PAD_R) + 'px');      // CTA/menu: right margin -> inside the right edge
    const st = getComputedStyle(root);
    const navH = parseFloat(st.getPropertyValue('--nav-h')), top = parseFloat(st.getPropertyValue('--pill-top')), ph = parseFloat(st.getPropertyValue('--pill-h'));
    root.style.setProperty('--dy', (top + ph / 2 - navH / 2) + 'px');  // keep content centred in the pill
  }

  // scroll state with hysteresis, one rAF per frame
  let compact = false, ticking = false;
  function apply(next) {
    if (next === compact) return;
    compact = next;
    nav.dataset.state = compact ? 'compact' : 'rest';
    // the reference dips the links out while the bar contracts and brings them back as it settles
    if (!reduce.matches && links.offsetParent) {
      links.firstElementChild.animate(
        [{ opacity: 1 }, { opacity: .08, offset: .42 }, { opacity: 1 }],
        { duration: dur(), easing: 'cubic-bezier(.4,0,.2,1)' });
    }
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (nav.hasAttribute('data-open')) return;
      const y = scrollY;
      apply(compact ? y > 8 : y > 24);
    });
  }

  // phone menu: the pill grows into a full panel
  let lastFocus = null;
  function openMenu() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    panel.querySelectorAll('.panel-links li, .panel-feature, .panel-foot').forEach((el, i) => el.style.setProperty('--i', i));
    root.style.overflow = 'hidden';
    menu.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => requestAnimationFrame(() => nav.setAttribute('data-open', '')));
    setTimeout(() => panel.querySelector('a').focus({ preventScroll: true }), 60);
  }
  function closeMenu() {
    nav.removeAttribute('data-open');
    menu.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    setTimeout(() => { if (!nav.hasAttribute('data-open')) panel.hidden = true; }, dur());
    (lastFocus || menu).focus({ preventScroll: true });
    onScroll();
  }
  menu.addEventListener('click', () => nav.hasAttribute('data-open') ? closeMenu() : openMenu());
  panel.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  addEventListener('keydown', e => {
    if (!nav.hasAttribute('data-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key === 'Tab') {   // keep focus inside the open menu
      const f = [menu, ...panel.querySelectorAll('a')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  measure();
  apply(scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); if (innerWidth >= 900 && nav.hasAttribute('data-open')) closeMenu(); });
  document.fonts && document.fonts.ready.then(measure);   // widths change once Funnel loads
  reduce.addEventListener?.('change', () => root.style.setProperty('--dur', dur() + 'ms'));
})();
