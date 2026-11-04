// font-lab candidate table: one entry per family. d = display role, t = text/UI role.
// Display is set at 800 for every family (the reel's heavy lowercase); medium connector words at 500.
window.FONTS = [
  { slug: 'inter-display', name: 'Inter Display', d: { fam: "'FL Inter'", w: 800, st: '100%', tr: -0.04 }, t: { fam: "'FL Inter'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Thin to Black, variable (wght + opsz)', src: 'https://github.com/rsms/inter', by: 'Rasmus Andersson' },
  { slug: 'geist', name: 'Geist', d: { fam: "'FL Geist'", w: 800, st: '100%', tr: -0.05 }, t: { fam: "'FL Geist'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Thin to Black, variable', src: 'https://github.com/vercel/geist-font', by: 'Vercel + Basement Studio' },
  { slug: 'host-grotesk', name: 'Host Grotesk', d: { fam: "'FL Host'", w: 800, st: '100%', tr: -0.045 }, t: { fam: "'FL Host'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Light to ExtraBold, variable', src: 'https://fonts.google.com/specimen/Host+Grotesk', by: 'Element Type' },
  { slug: 'schibsted-grotesk', name: 'Schibsted Grotesk', d: { fam: "'FL Schibsted'", w: 800, st: '100%', tr: -0.035 }, t: { fam: "'FL Schibsted'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Regular to Black, variable', src: 'https://fonts.google.com/specimen/Schibsted+Grotesk', by: 'Bakken & Baeck for Schibsted' },
  { slug: 'hanken-grotesk', name: 'Hanken Grotesk', d: { fam: "'FL Hanken'", w: 800, st: '100%', tr: -0.045 }, t: { fam: "'FL Hanken'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Thin to Black, variable', src: 'https://fonts.google.com/specimen/Hanken+Grotesk', by: 'Alfredo Marco Pradil' },
  { slug: 'archivo', name: 'Archivo (Expanded)', d: { fam: "'FL Archivo'", w: 800, st: '112%', tr: -0.04 }, t: { fam: "'FL Archivo'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Thin to Black, variable (wght + width 62 to 125)', src: 'https://fonts.google.com/specimen/Archivo', by: 'Omnibus-Type' },
  { slug: 'mona-sans', name: 'Mona Sans', d: { fam: "'FL Mona'", w: 800, st: '110%', tr: -0.025 }, t: { fam: "'FL Mona'", w: 400, st: '100%' },
    lic: 'OFL 1.1 (RFN "Mona")', weights: 'ExtraLight to Black, variable (wght + width 75 to 125 + opsz)', src: 'https://github.com/github/mona-sans', by: 'GitHub + Degarism' },
  { slug: 'funnel', name: 'Funnel Display + Sans', d: { fam: "'FL Funnel Display'", w: 800, st: '100%', tr: -0.035 }, t: { fam: "'FL Funnel Sans'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'Light to ExtraBold, variable (two families)', src: 'https://fonts.google.com/specimen/Funnel+Display', by: 'NORD ID / Dicotype' },
  { slug: 'bricolage-grotesque', name: 'Bricolage Grotesque', d: { fam: "'FL Bricolage'", w: 800, st: '100%', tr: -0.025 }, t: { fam: "'FL Bricolage'", w: 400, st: '100%' },
    lic: 'OFL 1.1', weights: 'ExtraLight to ExtraBold, variable (wght + width + opsz)', src: 'https://fonts.google.com/specimen/Bricolage+Grotesque', by: 'Mathieu Triay' },
  { slug: 'switzer', name: 'Switzer', d: { fam: "'FL Switzer'", w: 800, st: '100%', tr: -0.035 }, t: { fam: "'FL Switzer'", w: 400, st: '100%' },
    lic: 'ITF FFL 2.0 (not open source)', weights: 'Thin to Black, variable', src: 'https://www.fontshare.com/fonts/switzer', by: 'Jérémie Bayle, Indian Type Foundry' },
];
window.SERIFS = [
  { slug: 'instrument-serif', name: 'Instrument Serif', fam: "'FL Instrument Serif'", w: 400, style: 'normal', tr: -0.01, lic: 'OFL 1.1', weights: 'Regular + Italic only (static)', src: 'https://fonts.google.com/specimen/Instrument+Serif' },
  { slug: 'bodoni-moda', name: 'Bodoni Moda', fam: "'FL Bodoni'", w: 500, style: 'normal', tr: -0.01, lic: 'OFL 1.1', weights: 'Regular to Black + Italics, variable (wght + opsz 6 to 96)', src: 'https://fonts.google.com/specimen/Bodoni+Moda' },
  { slug: 'none-funnel', name: 'no serif (Funnel Display)', fam: "'FL Funnel Display'", w: 700, style: 'normal', tr: -0.02, lic: 'OFL 1.1', weights: 'n/a', src: '' },
  { slug: 'newsreader', name: 'Newsreader', fam: "'FL Newsreader'", w: 500, style: 'normal', tr: -0.01, lic: 'OFL 1.1', weights: 'ExtraLight to ExtraBold + Italics, variable (wght + opsz 6 to 72)', src: 'https://fonts.google.com/specimen/Newsreader' },
];
