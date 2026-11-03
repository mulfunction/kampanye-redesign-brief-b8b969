// PINDAI: the depth scan. One full-plate fragment shader (three.js WebGLRenderer + ShaderMaterial, GLSL, WebGL2).
// mountPindai(plate, opts) -> controller. The page owns choreography (GSAP); this module owns pixels.
// Rendering runs on gsap.ticker (ONE clock); it pauses when the plate is off screen or the tab is hidden.
import * as THREE from 'three';

/* ---- tuning (all in one place) ---- */
export const CFG = {
  FRONT_EDGE: 0.0045,   // softness of the scan front in depth units (0 near .. 1 far)
  BAND: 0.085,          // width of the 'Kedalaman' band that runs just ahead of the line
  DOT_CELL: 5.0,        // dot grid cell, CSS px (scaled by DPR in the shader)
  DOT_TRAIL: 0.038,     // how far behind the line the red dots linger (depth units)
  DOT_GAIN: 0.85,       // dot brightness at the front (1 = ScanEffect loud, we stay quieter)
  CONTOURS: 34,         // iso-depth lines across the whole depth range; every 4th is a major line
  PARALLAX: 0.010,      // max image-uv shift for the nearest plane at full pointer deflection
  ZOOM: 1.035,          // overscan so parallax never shows an edge
  LENS_R: 128,          // lens radius, CSS px (pointer)
  LENS_R_TOUCH: 92,     // lens radius, CSS px (touch)
  DPR_MAX: 2,
};

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tImage, tDepth, tSketch;
uniform float uProgress, uContour, uMode, uPulse, uTime, uDpr, uDots, uLensMix;
uniform vec2 uPointer, uRes, uImageRes, uFocus;
uniform vec3 uLens;               // device px, origin bottom-left; z = radius (device px)
#define FRONT_EDGE ${CFG.FRONT_EDGE.toFixed(5)}
#define BAND ${CFG.BAND.toFixed(4)}
#define DOT_CELL ${CFG.DOT_CELL.toFixed(2)}
#define DOT_TRAIL ${CFG.DOT_TRAIL.toFixed(4)}
#define DOT_GAIN ${CFG.DOT_GAIN.toFixed(3)}
#define CONTOURS ${CFG.CONTOURS.toFixed(1)}
#define PARALLAX ${CFG.PARALLAX.toFixed(4)}
#define ZOOM ${CFG.ZOOM.toFixed(4)}
const vec3 RED    = vec3(1.0, 0.2314, 0.1882);   // #FF3B30
const vec3 INK    = vec3(0.1020);                // #1A1A1A
const vec3 GROUND = vec3(0.0431, 0.0431, 0.0392); // #0B0B0A
const vec3 BONE   = vec3(0.9255, 0.9216, 0.9020); // #ECEBE6

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 cover(vec2 uv){
  float ra = uRes.x / uRes.y, ri = uImageRes.x / uImageRes.y;
  vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  return uv * s + (1.0 - s) * vec2(uFocus.x, 1.0 - uFocus.y);
}
float depthZ(vec2 uv){ vec4 t = texture2D(tDepth, uv); return (t.r * 65280.0 + t.g * 255.0) / 65535.0; }
// anti-aliased iso line at integer values of x; fades out where the depth jumps (silhouettes)
float iso(float x, float w){
  float fw = max(fwidth(x), 1e-4);
  float d = abs(fract(x - 0.5) - 0.5);
  float l = 1.0 - smoothstep(w * fw * 0.5, w * fw * 0.5 + fw, d);
  return l * (1.0 - smoothstep(0.22, 0.55, fw));
}
vec3 screenB(vec3 a, vec3 b){ return 1.0 - (1.0 - a) * (1.0 - b); }

void main(){
  vec2 uv = (vUv - 0.5) / ZOOM + 0.5;
  vec2 base = cover(uv);
  float near = texture2D(tDepth, base).b;                    // blurred nearness: parallax only
  vec2 par = uPointer * PARALLAX * (near - 0.45) * vec2(1.0, uImageRes.x / uImageRes.y);
  vec2 iuv = base + par;

  // lens: slight magnification toward its centre
  float ld = distance(gl_FragCoord.xy, uLens.xy);
  float R = uLens.z;
  float inside = (1.0 - smoothstep(R - 1.5, R + 0.5, ld)) * step(0.5, R);
  vec2 lc = cover((uLens.xy / uRes / uDpr - 0.5) / ZOOM + 0.5) + par;
  vec2 luv = mix(iuv, lc, 0.07 * inside);

  float z  = depthZ(luv);
  vec3 fin = texture2D(tImage, iuv).rgb;
  vec3 sk  = texture2D(tSketch, luv).rgb;

  // finished frame: a quiet grade, slightly cooler shadows, soft vignette
  fin = pow(fin, vec3(1.05)) * 0.96;
  fin = mix(fin, fin * vec3(0.96, 0.98, 1.03), 0.5 * (1.0 - dot(fin, vec3(0.333))));
  float vig = smoothstep(1.15, 0.30, length((vUv - 0.5) * vec2(1.0, 0.85)));
  fin *= mix(0.80, 1.0, vig);

  // depth contours (topographic)
  float zc = z * CONTOURS;
  float lines = max(iso(zc, 1.0) * 0.55, iso(zc * 0.25, 1.6));

  // making layers
  vec3 dv = GROUND + vec3(0.20) * pow(1.0 - z, 1.6);
  dv = mix(dv, BONE, lines * 0.42);
  float creveal = smoothstep(uContour * 1.15 - 0.10, uContour * 1.15 - 0.16, z);   // contours draw in near -> far
  vec3 sketch = mix(sk, INK, lines * 0.30 * creveal);
  vec3 making = mix(sketch, dv, uMode);

  // the scan
  float f = mix(-0.10, 1.14, uProgress);
  float s = z - f;                                     // > 0 ahead of the line, < 0 behind it
  float done = smoothstep(FRONT_EDGE, -FRONT_EDGE, s);
  float band = smoothstep(BAND, BAND * 0.2, s) * smoothstep(-FRONT_EDGE, FRONT_EDGE, s);
  // ahead of the line the machine reads depth: the contour net doubles in density over the making layer,
  // and its lines turn red as they reach the front (a wireframe, never a dark fill)
  float dense = max(iso(zc * 2.0, 0.9) * 0.7, lines);
  vec3 wire = mix(INK, BONE, uMode);
  vec3 col = mix(making, wire, dense * band * 0.62);
  col = mix(col, RED, dense * band * smoothstep(BAND * 0.55, 0.0, s) * 0.9);
  col = mix(col, fin, done);

  // procedural dot grid (cell-noise brightness), only around the front
  vec2 g = gl_FragCoord.xy / (DOT_CELL * uDpr);
  vec2 cell = floor(g);
  vec2 q = fract(g) - 0.5;
  float n = hash(cell);
  float tw = hash(cell + floor(uTime * 7.0) * 1.37);
  float b = pow(n, 2.4) * (0.6 + 0.4 * tw);
  float r = 0.12 + 0.24 * b;
  float aa = 1.2 / (DOT_CELL * uDpr);
  float dotm = (1.0 - smoothstep(r - aa, r + aa, length(q))) * b;
  float trail = exp(-abs(s) / (s < 0.0 ? DOT_TRAIL : DOT_TRAIL * 0.22));
  float zw = max(fwidth(z), 1e-5);
  float line = (1.0 - smoothstep(zw * 0.6, zw * 1.8, abs(s))) * (1.0 - smoothstep(0.012, 0.05, zw));
  float act = step(-0.05, f) * step(f, 1.09);
  col = screenB(col, RED * dotm * trail * DOT_GAIN * 1.6 * uDots * act);
  col = mix(col, RED, line * 0.9 * act);
  col += RED * 0.035 * exp(min(s, 0.0) / 0.012) * step(s, 0.0) * act;   // min(): exp overflow -> inf * 0 = NaN (black)   // faint warmth just behind the line

  // idle pulse: a faint red sweep, dots + line + a contour echo, never changes the layer
  float sp = z - uPulse;
  float pon = step(-0.2, uPulse);
  float ptrail = exp(-abs(sp) / (sp < 0.0 ? DOT_TRAIL * 1.4 : DOT_TRAIL * 0.3));
  col = screenB(col, RED * dotm * ptrail * 0.55 * uDots * pon);
  col = mix(col, RED, lines * exp(-abs(sp) / 0.03) * 0.22 * pon);
  col = mix(col, RED, (1.0 - smoothstep(zw * 0.6, zw * 1.8, abs(sp))) * (1.0 - smoothstep(0.012, 0.05, zw)) * 0.16 * pon);

  // lens: the making layer under the pointer, its rim shows depth, its edge is the scan line
  float ring = smoothstep(R * 0.86, R * 0.975, ld) * inside;
  vec3 lensCol = mix(sk, INK, lines * 0.32);
  lensCol = mix(lensCol, dv, ring * 0.95);
  lensCol = screenB(lensCol, RED * dotm * ring * 0.9);
  col = mix(col, lensCol, inside * uLensMix);
  col = mix(col, RED, (1.0 - smoothstep(0.4, 1.6, abs(ld - R))) * step(0.5, R) * 0.95 * uLensMix);

  // film grain, same on every layer so they read as one picture
  col += (hash(gl_FragCoord.xy + fract(uTime * 0.37) * 811.0) - 0.5) * 0.032;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
}

/**
 * @param {HTMLElement} plate  element with data-still, data-depth, data-sketch, data-focus="x y", data-focus-m="x y"
 * @param {{gsap:any, touch?:boolean, dots?:number}} o
 */
export async function mountPindai(plate, o) {
  const { gsap } = o;
  const canvas = document.createElement('canvas');
  canvas.className = 'pd-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  plate.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, CFG.DPR_MAX);
  renderer.setPixelRatio(dpr);
  const loader = new THREE.TextureLoader();
  const load = (src) => loader.loadAsync(src).then((t) => {
    t.colorSpace = THREE.NoColorSpace;          // we work in display values; depth must stay bit-exact
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
  const [tImage, tDepth, tSketch] = await Promise.all([load(plate.dataset.still), load(plate.dataset.depth), load(plate.dataset.sketch)]);
  const U = {
    tImage: { value: tImage }, tDepth: { value: tDepth }, tSketch: { value: tSketch },
    uProgress: { value: 0 }, uContour: { value: 0 }, uMode: { value: 0 }, uPulse: { value: -1 }, uDots: { value: o.dots ?? 1 },
    uLensMix: { value: 1 }, uTime: { value: 0 }, uDpr: { value: dpr },
    uPointer: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
    uImageRes: { value: new THREE.Vector2(tImage.image.width, tImage.image.height) },
    uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uLens: { value: new THREE.Vector3(-999, -999, 0) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: U, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const phone = matchMedia('(max-width: 860px)');
  const focus = () => {
    const f = ((phone.matches && plate.dataset.focusM) || plate.dataset.focus || '0.5 0.5').split(' ').map(Number);
    U.uFocus.value.set(f[0], f[1]);
  };
  let w = 1, h = 1;
  const size = () => {
    const r = plate.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    U.uRes.value.set(w, h);
    focus();
  };
  size();
  new ResizeObserver(size).observe(plate);

  // pointer: smoothed parallax + lens (pointer devices); tap + slow auto path (touch)
  const touch = o.touch ?? !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ptr = { tx: 0, ty: 0, x: 0, y: 0 };
  const lens = { tx: w / 2, ty: h / 2, x: w / 2, y: h / 2, r: 0, auto: false };
  const R = touch ? CFG.LENS_R_TOUCH : CFG.LENS_R;
  let lensListener = () => {};
  const openLens = (on) => { gsap.to(lens, { r: on ? R : 0, duration: on ? 0.7 : 0.5, ease: on ? 'expo.out' : 'power3.inOut', overwrite: 'auto' }); lensListener(on); };
  const local = (e) => { const r = plate.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let lensEnabled = false;
  if (!touch) {
    plate.addEventListener('pointermove', (e) => {
      const [x, y] = local(e);
      ptr.tx = (x / w) * 2 - 1; ptr.ty = -((y / h) * 2 - 1);
      lens.tx = x; lens.ty = y;
      if (lensEnabled && lens.r === 0 && !lens.opening) { lens.opening = true; openLens(true); }
    });
    plate.addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; lens.opening = false; if (lensEnabled) openLens(false); });
    plate.addEventListener('pointerenter', (e) => { const [x, y] = local(e); lens.x = lens.tx = x; lens.y = lens.ty = y; if (lensEnabled) { lens.opening = true; openLens(true); } });
  } else {
    let closeCall;
    plate.addEventListener('pointerdown', (e) => {
      if (!lensEnabled) return;
      const [x, y] = local(e);
      lens.auto = false; lens.tx = x; lens.ty = y;
      if (lens.r < 1) { lens.x = x; lens.y = y; }
      openLens(true);
      closeCall?.kill();
      closeCall = gsap.delayedCall(2.8, () => openLens(false));
      lastTap = performance.now();
    });
  }
  let lastTap = 0;

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(plate);

  let frames = 0;
  const tick = (time) => {
    if (!visible || document.hidden) return;
    U.uTime.value = time;
    // touch: the scene breathes with a slow drift instead of the pointer
    if (touch) { ptr.tx = Math.sin(time * 0.31) * 0.55; ptr.ty = Math.sin(time * 0.23 + 1.3) * 0.35; }
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    if (lens.auto) { // slow lissajous over the subject
      lens.tx = w * (0.62 + 0.20 * Math.sin(time * 0.35)); lens.ty = h * (0.42 + 0.16 * Math.sin(time * 0.53 + 0.8));
    }
    lens.x += (lens.tx - lens.x) * 0.16; lens.y += (lens.ty - lens.y) * 0.16;
    U.uPointer.value.set(ptr.x, ptr.y);
    U.uLens.value.set(lens.x * dpr, (h - lens.y) * dpr, lens.r * dpr);
    renderer.render(scene, cam);
    frames++;
  };
  gsap.ticker.add(tick);
  tick(gsap.ticker.time);   // first frame now, so the canvas can fade in over an identical poster

  return {
    U, canvas, renderer, touch,
    get frames() { return frames; },
    enableLens(on = true) { lensEnabled = on; },
    onLens(fn) { lensListener = fn; },
    autoLens(on) { if (on) { lens.auto = true; lens.x = lens.tx = w * 0.62; lens.y = lens.ty = h * 0.42; openLens(true); } else { lens.auto = false; openLens(false); } },
    sinceTap() { return performance.now() - lastTap; },
    lensOpen() { return lens.r > 1; },
  };
}
