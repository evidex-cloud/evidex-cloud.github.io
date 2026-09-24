/* Droplet Labs · Paths — the 3D world behind the page.
   A night sky over a sea of clouds; a river of stardust spirals out of the
   Droplet mark, and every course is a glowing droplet riding that river.
   The camera is driven by scroll: each [data-shot] element is an anchor. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const P = window.PATHS;
const courses = P.courses;
const canvas = document.getElementById('world');
const small = () => innerWidth <= 760;
const coarse = matchMedia('(pointer: coarse)').matches;
const LOW = small() || coarse;
const Q = new URLSearchParams(location.search);
const SY = () => (window.__fakeY != null ? window.__fakeY : scrollY);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-webgl');
  window.dispatchEvent(new CustomEvent('dl:ready'));
  throw e;
}
const DPR = Math.min(devicePixelRatio || 1, LOW ? 1.5 : 1.75);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x141a3e, 0.019);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1500);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const lin = (hex) => new THREE.Color(hex);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const f = (x) => x.toFixed(5);

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ------------------------------------------------------------------ */
/* river geometry (same maths on CPU and GPU)                          */
/* ------------------------------------------------------------------ */
const RIVER = { turns: 1.55, r0: 1.9, r1: 22, th0: -Math.PI * 0.5 };
function riverPos(u, out = new THREE.Vector3()) {
  const th = RIVER.th0 + u * RIVER.turns * Math.PI * 2;
  const r = RIVER.r0 + (RIVER.r1 - RIVER.r0) * Math.pow(Math.max(u, 0), 0.95);
  const y = 0.9 * Math.sin(th * 0.7 + 0.8) * u + 0.1 - 1.3 * u;
  return out.set(Math.cos(th) * r, y, Math.sin(th) * r);
}
const GLSL_RIVER = `
  const float TAU = 6.28318530718;
  vec3 riverPos(float u, float arm){
    float th = ${f(RIVER.th0)} + u * ${f(RIVER.turns)} * TAU + arm * 3.14159265;
    float r = ${f(RIVER.r0)} + ${f(RIVER.r1 - RIVER.r0)} * pow(max(u, 0.0), 0.95);
    float y = 0.9 * sin(th * 0.7 + 0.8) * u + 0.1 - 1.3 * u;
    return vec3(cos(th) * r, y, sin(th) * r);
  }`;

const slots = courses.length + (P.showNext ? 1 : 0);
const slotU = (i) => (slots <= 1 ? 0.3 : 0.15 + 0.72 * (i / (slots - 1)));

/* ------------------------------------------------------------------ */
/* sky dome                                                            */
/* ------------------------------------------------------------------ */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 48, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: lin('#040716') }, uMid: { value: lin('#141c46') }, uHor: { value: lin('#34488a') },
      uLow: { value: lin('#1a2150') }, uGlow: { value: lin('#b784b8') }, uTime: { value: 0 }
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uTop,uMid,uHor,uLow,uGlow; uniform float uTime; varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float noise(vec3 p){ vec3 i=floor(p), fr=fract(p); fr=fr*fr*(3.0-2.0*fr);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),fr.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),fr.x),fr.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),fr.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),fr.x),fr.y),fr.z); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.28, y));
        col = mix(col, uTop, smoothstep(0.25, 0.9, y));
        col = mix(col, uLow, smoothstep(0.0, -0.3, y));
        vec3 hz = normalize(vec3(d.x, 0.0, d.z) + 1e-5);
        float g = pow(max(dot(hz, vec3(0.0,0.0,-1.0)), 0.0), 3.0) * exp(-abs(y - 0.03) * 7.0);
        col += uGlow * g * 0.32;
        float n = noise(d * 3.0 + vec3(0.0, 0.0, uTime * 0.01)) * 0.6 + noise(d * 7.0) * 0.4;
        col *= 0.9 + 0.22 * n * smoothstep(-0.05, 0.4, y);
        gl_FragColor = vec4(col, 1.0);
      }`
  })
);
sky.renderOrder = -10;
scene.add(sky);

/* ------------------------------------------------------------------ */
/* stars                                                               */
/* ------------------------------------------------------------------ */
{
  const n = LOW ? 1600 : 3200, pos = new Float32Array(n * 3), aS = new Float32Array(n), aSeed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const th = rand() * Math.PI * 2, y = Math.pow(rand(), 0.8) * 0.98 + 0.02, r = 600 + rand() * 200, h = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * h * r, y * r, Math.sin(th) * h * r], i * 3);
    aS[i] = rand() < 0.04 ? 2.6 + rand() * 1.8 : 0.8 + rand() * 1.3; aSeed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: DPR } },
    vertexShader: `uniform float uTime,uPR; attribute float aSize,aSeed; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.4) + aSeed * 60.0);
        vA = tw * smoothstep(0.0, 0.25, normalize(position).y);
        gl_PointSize = aSize * uPR * (0.8 + tw * 0.5); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * a * vA * 1.3, 1.0); }`
  });
  const stars = new THREE.Points(g, m); stars.renderOrder = -9; stars.frustumCulled = false;
  scene.add(stars);
  scene.userData.stars = { mesh: stars, mat: m };
}

/* ------------------------------------------------------------------ */
/* cloud sea                                                           */
/* ------------------------------------------------------------------ */
const clouds = new THREE.Group(); scene.add(clouds);
{
  const tex = [0, 1, 2].map((k) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 128 + gauss() * 42, y = 140 + gauss() * 20 - (i / 26) * 16, r = 26 + rand() * 52;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const n = LOW ? 55 : 110, lav = lin('#4f63a6'), pink = lin('#8a74a8'), deep = lin('#26336e');
  for (let i = 0; i < n; i++) {
    const r = 5 + Math.pow(rand(), 0.75) * 60, th = rand() * Math.PI * 2;
    const col = lav.clone().lerp(rand() < 0.35 ? pink : deep, rand() * 0.8);
    const mat = new THREE.SpriteMaterial({ map: tex[i % 3], color: col, transparent: true, opacity: 0.16 + rand() * 0.22, depthWrite: false, fog: true });
    const s = new THREE.Sprite(mat), sc = 8 + rand() * 18 + r * 0.12;
    s.scale.set(sc, sc * 0.5, 1);
    s.position.set(Math.cos(th) * r, -3.8 - rand() * 2.6 + Math.min(r, 40) * 0.02, Math.sin(th) * r);
    s.userData.bob = rand() * 10;
    clouds.add(s);
  }
}

/* big soft glows: the bright core behind the mark and a horizon band */
const glowTex = radialTexture([[0, 'rgba(255,236,242,0.75)'], [0.2, 'rgba(236,190,215,0.35)'], [0.5, 'rgba(140,150,230,0.1)'], [1, 'rgba(0,0,0,0)']]);
const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4, fog: false }));
coreGlow.scale.set(13, 13, 1); coreGlow.position.set(0, 0.1, -4); scene.add(coreGlow);
const band = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22, color: lin('#d99ab8'), fog: false }));
band.scale.set(90, 16, 1); band.position.set(0, -2.2, -30); scene.add(band);

/* ------------------------------------------------------------------ */
/* stardust river                                                      */
/* ------------------------------------------------------------------ */
const riverMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 }, uScale: { value: 1 }, uFlow: { value: 1 },
    uCore: { value: lin('#fff2e6') }, uPink: { value: lin('#f5bcd6') }, uLav: { value: lin('#a8b6ff') }, uCyan: { value: lin('#7fe6ff') }
  },
  vertexShader: `
    uniform float uTime, uScale, uFlow; uniform vec3 uCore,uPink,uLav,uCyan;
    attribute float aU, aSpeed, aSize, aSeed, aArm; attribute vec2 aOff;
    varying vec3 vCol; varying float vA;
    ${GLSL_RIVER}
    void main(){
      float u = fract(aU + uTime * aSpeed * uFlow);
      vec3 p = riverPos(u, aArm);
      vec3 rad = normalize(vec3(p.x, 0.0, p.z) + 1e-4);
      float w = (0.16 + 1.55 * u) * (aArm > 0.5 ? 1.7 : 1.0);
      float sw = aSeed * TAU + uTime * 0.25;
      vec2 o = aOff + 0.06 * vec2(sin(sw), cos(sw * 1.3));
      p += rad * o.x * w + vec3(0.0, 1.0, 0.0) * o.y * w * 0.3;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float tw = 0.6 + 0.4 * sin(uTime * (1.2 + aSeed * 3.5) + aSeed * 40.0);
      gl_PointSize = clamp(aSize * uScale * tw / -mv.z, 0.0, 70.0);
      float core = exp(-dot(o, o) * 1.8);
      vec3 edge = aSeed < 0.14 ? uCyan : mix(uPink, uLav, fract(aSeed * 7.13));
      vCol = mix(edge, uCore, core * 0.85);
      float life = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.8, 1.0, u));
      vA = life * (0.3 + 0.7 * core) * (aArm > 0.5 ? 0.42 : 1.0) * smoothstep(0.25, 1.2, -mv.z);
    }`,
  fragmentShader: `varying vec3 vCol; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d); a = a * a;
      gl_FragColor = vec4(vCol * a * vA, 1.0); }`
});
{
  const n = LOW ? 14000 : 30000;
  const aU = new Float32Array(n), aSpeed = new Float32Array(n), aSize = new Float32Array(n), aSeed = new Float32Array(n), aArm = new Float32Array(n), aOff = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    aU[i] = rand(); aSpeed[i] = 0.004 + rand() * 0.006; aSeed[i] = rand(); aArm[i] = rand() < 0.28 ? 1 : 0;
    const wide = rand() < 0.2 ? 2.4 : 1;
    aOff[i * 2] = gauss() * 0.55 * wide; aOff[i * 2 + 1] = gauss() * 0.55 * wide;
    const big = rand();
    aSize[i] = (big > 0.985 ? 0.16 : big > 0.9 ? 0.08 : 0.028 + rand() * 0.035);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  [['aU', aU, 1], ['aSpeed', aSpeed, 1], ['aSize', aSize, 1], ['aSeed', aSeed, 1], ['aArm', aArm, 1], ['aOff', aOff, 2]]
    .forEach(([k, v, s]) => g.setAttribute(k, new THREE.BufferAttribute(v, s)));
  const river = new THREE.Points(g, riverMat); river.frustumCulled = false; scene.add(river);
}

/* floating motes / bokeh (foreground softness, like out-of-focus flowers) */
const bokehMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
  vertexShader: `uniform float uTime,uScale; attribute float aSize,aSeed; attribute vec3 aCol; varying vec3 vCol; varying float vA;
    void main(){ vec3 p = position; p.y += sin(uTime * 0.3 + aSeed * 20.0) * 0.25; p.x += cos(uTime * 0.2 + aSeed * 13.0) * 0.3;
      vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(aSize * uScale / -mv.z, 0.0, 220.0); vCol = aCol;
      vA = smoothstep(0.4, 2.5, -mv.z) * (0.55 + 0.45 * sin(uTime * 0.5 + aSeed * 30.0)); }`,
  fragmentShader: `varying vec3 vCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.36, d) * 0.55 + smoothstep(0.5, 0.0, d) * 0.45; gl_FragColor = vec4(vCol * a * vA * 0.17, 1.0); }`
});
{
  const n = LOW ? 50 : 100, pos = new Float32Array(n * 3), aS = new Float32Array(n), aSeed = new Float32Array(n), aCol = new Float32Array(n * 3);
  const cols = ['#c9c2ff', '#f3c3da', '#ffffff', '#9fc7ff'].map(lin);
  for (let i = 0; i < n; i++) {
    if (i < n * 0.45) pos.set([(rand() - 0.5) * 22, -3.2 + rand() * 2.6, 4 + rand() * 7.5], i * 3); // hero foreground
    else { const u = rand(); const p = riverPos(u); pos.set([p.x + gauss() * 3, p.y + gauss() * 1.5 + 0.4, p.z + gauss() * 3], i * 3); }
    aS[i] = 0.25 + rand() * 0.7; aSeed[i] = rand(); const c = cols[(rand() * cols.length) | 0]; aCol.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  g.setAttribute('aCol', new THREE.BufferAttribute(aCol, 3));
  const b = new THREE.Points(g, bokehMat); b.frustumCulled = false; scene.add(b);
}

/* ------------------------------------------------------------------ */
/* the Droplet mark, in 3D                                             */
/* geometry from the brand raster (512 space): circle (256,256) r142.5, */
/* apex (256,55), nodes r31.5 at the four corners, X strokes width 28.  */
/* ------------------------------------------------------------------ */
const mark = new THREE.Group();
const MARK_Y = 0.35;
mark.position.set(0, MARK_Y, 0);
mark.scale.setScalar(1.25);
scene.add(mark);
const pieces = [], nodes = [];
{
  const S = 142.5, U = (x, y) => new THREE.Vector2((x - 256) / S, -(y - 256) / S);
  // drop outline: apex -> right tangent -> arc under -> left tangent
  const drop = [U(256, 55)];
  const a0 = Math.PI / 4, a1 = -5 * Math.PI / 4;
  for (let i = 0; i <= 72; i++) { const a = a0 + (a1 - a0) * (i / 72); drop.push(new THREE.Vector2(Math.cos(a), Math.sin(a))); }
  const c = U(256, 264.5).set(0, (U(127.5, 136.5).y + U(127.5, 392.5).y) / 2);
  const hw = 14 / S;
  const n1 = new THREE.Vector2(1, 1).normalize(), n2 = new THREE.Vector2(-1, 1).normalize();
  const clip = (poly, n, s) => { // keep s*n·(p-c) >= hw
    const out = [], val = (p) => s * n.dot(p.clone().sub(c)) - hw;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], va = val(A), vb = val(B);
      if (va >= 0) out.push(A);
      if ((va >= 0) !== (vb >= 0)) out.push(A.clone().lerp(B, va / (va - vb)));
    }
    return out;
  };
  const quads = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top, right, bottom, left
  const pieceMat = new THREE.MeshPhysicalMaterial({
    color: 0x2595d0, metalness: 0.1, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.2,
    emissive: 0x0a4a7a, emissiveIntensity: 0.55, envMapIntensity: 0.16
  });
  const nodeMat = new THREE.MeshPhysicalMaterial({ color: 0x2595d0, emissive: 0x1a86c8, emissiveIntensity: 0.8, envMapIntensity: 0.16, roughness: 0.3, metalness: 0.1, clearcoat: 0.4 });
  if (Q.has('mkbasic')) { pieceMat.dispose(); }
  const PM = Q.has('mkbasic') ? new THREE.MeshBasicMaterial({ color: 0x2e9fd6 }) : pieceMat;
  quads.forEach(([s1, s2], qi) => {
    const poly = clip(clip(drop, n1, s1), n2, s2);
    const shape = new THREE.Shape(poly);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelSegments: 5, curveSegments: 8 });
    geo.translate(0, 0, -0.17);
    const cen = poly.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(poly.length);
    geo.translate(-cen.x, -cen.y, 0);
    const m = new THREE.Mesh(geo, PM);
    m.userData.home = new THREE.Vector3(cen.x, cen.y, 0);
    m.userData.from = new THREE.Vector3(cen.x * 4 + gauss(), cen.y * 4 + gauss(), -2 - rand() * 3);
    m.userData.rot = new THREE.Euler(gauss() * 1.4, gauss() * 1.4, gauss() * 1.4);
    m.userData.delay = qi * 0.08;
    mark.add(m); pieces.push(m);
  });
  [[127.5, 136.5], [383.5, 136.5], [127.5, 392.5], [383.5, 392.5]].forEach(([x, y], i) => {
    const p = U(x, y), m = new THREE.Mesh(new THREE.SphereGeometry(31.5 / S, 40, 28), nodeMat);
    m.userData.home = new THREE.Vector3(p.x, p.y, 0.02); m.userData.delay = 0.7 + i * 0.09;
    m.scale.setScalar(0.001); m.position.copy(m.userData.home);
    mark.add(m); nodes.push(m);
  });
  // centre the mark's bounding box on the group origin
  const yMid = (U(256, 55).y + (U(127.5, 392.5).y - 31.5 / S)) / 2;
  mark.children.forEach((m) => { m.userData.home.y -= yMid; });
  mark.userData.hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  mark.add(mark.userData.hit);
}
const rim = new THREE.PointLight(0xffc4dc, 14, 18, 1.6); rim.position.set(0, 1.2, -2.6); scene.add(rim);
const fill = new THREE.PointLight(0x8fb8ff, 9, 20, 1.6); fill.position.set(3, 2, 5); scene.add(fill);

/* halo rings + ripples around the mark */
const ringMat = (op) => new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const halo1 = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.006, 8, 180), ringMat(0.55));
const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.004, 8, 180), ringMat(0.3));
halo1.rotation.x = 1.25; halo2.rotation.set(1.05, 0.4, 0);
mark.add(halo1, halo2);
const ripples = [0, 1].map(() => {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), ringMat(0));
  r.userData.t = -1; mark.add(r); return r;
});
let nextRipple = 2.9;
function fireRipple(now) { const r = ripples.find((x) => x.userData.t < 0) || ripples[0]; r.userData.t = now; }

/* ------------------------------------------------------------------ */
/* course orbs                                                         */
/* ------------------------------------------------------------------ */
const orbGeo = new THREE.SphereGeometry(0.46, 64, 48);
const haloTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,0.5)'], [0.4, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
const orbs = [];
function makeOrb(color, i, isNext) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: lin(color) }, uTime: { value: 0 }, uBoost: { value: 1 }, uSeed: { value: i * 1.7 } },
    vertexShader: `varying vec3 vN, vV, vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0);
      vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime, uBoost, uSeed; varying vec3 vN, vV, vP;
      void main(){ float fr = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
        float b = 0.5 + 0.5 * sin(vP.y * 11.0 + uTime * 1.3 + uSeed + sin(vP.x * 7.0 + uTime * 0.8) * 1.6);
        float spec = pow(max(dot(normalize(vN), normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 24.0);
        vec3 col = uColor * (0.22 + 0.3 * b) + uColor * fr * 1.7 + vec3(1.0) * (pow(fr, 5.0) * 0.5 + spec * 0.55);
        gl_FragColor = vec4(col * uBoost, 1.0); }`
  });
  const core = new THREE.Mesh(orbGeo, mat);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: lin(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8, fog: false }));
  halo.scale.set(3.2, 3.2, 1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.007, 8, 120), new THREE.MeshBasicMaterial({ color: lin(color), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  ring.rotation.set(1.2 + gauss() * 0.2, gauss() * 0.4, 0);
  // orbiting sparks
  const sn = 60, sp = new Float32Array(sn * 3);
  for (let k = 0; k < sn; k++) { const a = rand() * Math.PI * 2, r = 0.95 + rand() * 0.35; sp.set([Math.cos(a) * r, gauss() * 0.06, Math.sin(a) * r], k * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ map: haloTex, color: lin(color), size: 0.11, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparks.rotation.x = ring.rotation.x - Math.PI / 2 + 0.1;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  g.add(halo, core, ring, sparks, hit);
  const u = slotU(i), base = riverPos(u).add(new THREE.Vector3(0, 0.35, 0));
  g.position.copy(base);
  if (isNext) { mat.uniforms.uBoost.value = 0.6; halo.material.opacity = 0.35; ring.material.opacity = 0.25; g.scale.setScalar(0.7); }
  scene.add(g);
  return { g, core, mat, halo, ring, sparks, hit, base, u, isNext, act: 0, id: isNext ? null : courses[i].id, i };
}
courses.forEach((c, i) => orbs.push(makeOrb(c.color, i, false)));
if (P.showNext) orbs.push(makeOrb('#dfe4ff', courses.length, true));

/* ------------------------------------------------------------------ */
/* post-processing                                                     */
/* ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), LOW ? 0.7 : 0.85, 0.7, 0.7);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ */
/* camera shots, anchored to scroll                                    */
/* ------------------------------------------------------------------ */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
const orbById = (id) => orbs.find((o) => o.id === id);
const heroStage = () => document.querySelector('.hero-stage');

function riverShot(u) {
  const p = riverPos(u), ahead = riverPos(u + 0.012), T = ahead.sub(p).normalize();
  const out = V(p.x, 0, p.z).normalize();
  const orbP = p.clone().add(V(0, 0.35, 0));
  const pos = orbP.clone().addScaledVector(T, -4.6).addScaledVector(out, 2.1).add(V(0, 1.35, 0));
  return { pos, target: orbP, sx: small() ? 0 : 0.2, sy: small() ? 0.24 : 0 };
}
function shotFor(name, time) {
  const m = small();
  switch (name) {
    case 'hero': {
      const d = m ? 25 : 17;
      let sy = 0; const el = heroStage();
      if (el) { const r = el.getBoundingClientRect(); sy = (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight; }
      return { pos: V(0, MARK_Y + (m ? 3.6 : 2.6), d), target: V(0, MARK_Y, 0), sx: 0, sy };
    }
    case 'rise': return { pos: V(0, m ? 17 : 12, m ? 20 : 15), target: V(0, -1.2, 0), sx: 0, sy: m ? 0.3 : 0.27 };
    case 'overview': case 'orbit': case 'orbit2': {
      const base = name === 'overview' ? V(-14, 21, 27) : name === 'orbit' ? V(20, 8, 20) : V(0, 5.5, 25);
      base.applyAxisAngle(V(0, 1, 0), time * 0.035);
      if (m) base.multiplyScalar(1.25);
      return { pos: base, target: V(0, -1.2, 0), sx: 0, sy: 0 };
    }
    case 'labs': return { pos: V(-1.5, MARK_Y + 1.1, m ? 13 : 10.5), target: V(0, MARK_Y, 0), sx: m ? 0 : 0.24, sy: m ? 0.27 : 0 };
    default: {
      if (name.startsWith('course:')) { const o = orbById(name.slice(7)); if (o) return riverShot(o.u); }
      return { pos: V(0, 3, 14), target: V(0, 0, 0), sx: 0, sy: 0 };
    }
  }
}

let anchors = [];
function measure() {
  const maxS = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  anchors = Array.from(document.querySelectorAll('[data-shot]')).map((el) => {
    const r = el.getBoundingClientRect(), top = r.top + SY();
    const at = Math.min(maxS, Math.max(0, top + r.height / 2 - innerHeight / 2));
    return { name: el.dataset.shot, at };
  }).sort((a, b) => a.at - b.at);
}
window.addEventListener('dl:layout', () => requestAnimationFrame(measure));
if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.body);

const cur = { pos: V(0, 6, 30), target: V(0, 0, 0), sx: 0, sy: 0 };
let activeId = null;
const forced = Q.get('shot');
function desiredShot(time) {
  if (forced) { activeId = forced.startsWith('course:') ? forced.slice(7) : null; return shotFor(forced, time); }
  if (!anchors.length) measure();
  const s = SY();
  let i = 0; while (i < anchors.length - 1 && anchors[i + 1].at <= s) i++;
  const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
  const span = Math.max(1, B.at - A.at);
  const t = A === B ? 0 : smooth(0.12, 0.88, (s - A.at) / span);
  activeId = null;
  const nearest = t < 0.5 ? A.name : B.name;
  if (nearest.startsWith('course:')) activeId = nearest.slice(7);
  // glide along the river between two courses
  if (A.name.startsWith('course:') && B.name.startsWith('course:')) {
    const oa = orbById(A.name.slice(7)), ob = orbById(B.name.slice(7));
    if (oa && ob) return riverShot(oa.u + (ob.u - oa.u) * t);
  }
  const a = shotFor(A.name, time), b = shotFor(B.name, time);
  return { pos: a.pos.lerp(b.pos, t), target: a.target.lerp(b.target, t), sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t };
}

/* ------------------------------------------------------------------ */
/* pointer: parallax + orb picking                                     */
/* ------------------------------------------------------------------ */
const ptr = { x: 0, y: 0, sx: 0, sy: 0, cx: -1, cy: -1, over: false };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const tip = document.getElementById('orbTip');
let hovered = null;
const blocked = (el) => el && el.closest && el.closest('a, button, input, label, .glass, .nav, .rail, .marquee, p, h1, h2, h3, .foot');
window.addEventListener('pointermove', (e) => {
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1;
  ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.over = e.pointerType === 'mouse' && !blocked(e.target);
}, { passive: true });
window.addEventListener('click', (e) => {
  if (blocked(e.target)) return;
  const h = pick(e.clientX, e.clientY);
  if (!h) return;
  if (h === 'mark') window.dispatchEvent(new CustomEvent('dl:pick-mark'));
  else if (h.id) window.dispatchEvent(new CustomEvent('dl:pick', { detail: { id: h.id } }));
});
window.addEventListener('dl:pick-mark', () => { const el = document.getElementById('labs'); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const targets = orbs.filter((o) => !o.isNext).map((o) => o.hit).concat([mark.userData.hit]);
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return null;
  if (hit.object === mark.userData.hit) return 'mark';
  return orbs.find((o) => o.hit === hit.object);
}
function updateHover() {
  if (!ptr.over) { if (hovered) { hovered = null; tip.hidden = true; document.body.classList.remove('orb-hover'); } return; }
  const h = pick(ptr.cx, ptr.cy);
  if (h !== hovered) {
    hovered = h;
    document.body.classList.toggle('orb-hover', !!h);
    if (h && h !== 'mark') {
      const c = courses[h.i], D = window.DLPaths;
      tip.style.setProperty('--c', c.color);
      tip.innerHTML = '<small>' + D.L(c.subject) + '</small><b>' + D.L(c.name) + '</b>';
      tip.hidden = false;
    } else if (h === 'mark') {
      tip.style.setProperty('--c', '#2E9FD6'); tip.innerHTML = '<small>dropletlabs.xyz</small><b>Droplet Labs</b>'; tip.hidden = false;
    } else tip.hidden = true;
  }
  if (!tip.hidden) tip.style.transform = `translate(${ptr.cx + 16}px, ${ptr.cy + 16}px)`;
}

/* ------------------------------------------------------------------ */
/* resize + loop                                                       */
/* ------------------------------------------------------------------ */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.fov = w / h < 0.8 ? 62 : 50; camera.updateProjectionMatrix();
  const s = (h * DPR * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  riverMat.uniforms.uScale.value = s; bokehMat.uniforms.uScale.value = s;
  measure();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const t0 = performance.now() / 1000;
let frame = 0, lastHover = 0;
const up = V(0, 1, 0), right = new THREE.Vector3(), fwd = new THREE.Vector3();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = performance.now() / 1000 - t0;

  // uniforms
  riverMat.uniforms.uTime.value = time; bokehMat.uniforms.uTime.value = time;
  sky.material.uniforms.uTime.value = time; scene.userData.stars.mat.uniforms.uTime.value = time;

  // camera
  const want = desiredShot(time);
  const k = frame < 2 || Q.has('snap') ? 1 : 1 - Math.exp(-dt * 3.2);
  if (frame < 2) { cur.pos.set(0, 5, 34); cur.target.set(0, 0, 0); cur.sy = want.sy; }
  cur.pos.lerp(want.pos, frame < 2 && !Q.has('snap') ? 0 : k);
  cur.target.lerp(want.target, k);
  cur.sx += (want.sx - cur.sx) * k; cur.sy += (want.sy - cur.sy) * k;
  ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 2.5); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 2.5);
  fwd.subVectors(cur.target, cur.pos).normalize(); right.crossVectors(fwd, up).normalize();
  const px = coarse ? Math.sin(time * 0.23) * 0.5 : ptr.sx, py = coarse ? Math.sin(time * 0.17) * 0.3 : ptr.sy;
  camera.position.copy(cur.pos).addScaledVector(right, px * 0.55).addScaledVector(up, -py * 0.35);
  camera.lookAt(cur.target);
  const W = innerWidth, H = innerHeight;
  if (Math.abs(cur.sx) > 0.001 || Math.abs(cur.sy) > 0.001) camera.setViewOffset(W, H, -cur.sx * W, cur.sy * H, W, H);
  else camera.clearViewOffset();
  sky.position.copy(camera.position);
  scene.userData.stars.mesh.position.copy(camera.position);

  // mark: assemble, float, sway
  const intro = time - 0.35;
  pieces.forEach((m) => {
    const e = easeOutExpo(clamp01((intro - m.userData.delay) / 2.1));
    m.position.lerpVectors(m.userData.from, m.userData.home, e);
    m.rotation.set(m.userData.rot.x * (1 - e), m.userData.rot.y * (1 - e), m.userData.rot.z * (1 - e));
  });
  nodes.forEach((m) => {
    const e = clamp01((intro - m.userData.delay) / 0.9), s = e <= 0 ? 0.001 : 1 + Math.sin(e * Math.PI) * 0.35 * (1 - e) + 0 * e;
    m.scale.setScalar(Math.max(0.001, e < 1 ? easeOutExpo(e) * s : 1 + Math.sin(time * 2 + m.userData.delay * 9) * 0.04));
    m.position.copy(m.userData.home);
  });
  mark.position.y = MARK_Y + Math.sin(time * 0.8) * 0.08;
  mark.rotation.y = Math.sin(time * 0.35) * 0.38 + ptr.sx * 0.35;
  mark.rotation.x = ptr.sy * 0.18 + Math.sin(time * 0.5) * 0.04;
  halo1.rotation.z = time * 0.12; halo2.rotation.z = -time * 0.08;
  if (time > nextRipple) { fireRipple(time); nextRipple = time + 6.5; }
  ripples.forEach((r) => {
    if (r.userData.t < 0) return;
    const e = (time - r.userData.t) / 2.6;
    if (e >= 1) { r.userData.t = -1; r.material.opacity = 0; return; }
    r.scale.setScalar(1.4 + easeOutExpo(e) * 7); r.material.opacity = 0.55 * (1 - e) * (1 - e);
    r.lookAt(camera.position);
  });

  // orbs
  orbs.forEach((o, i) => {
    const on = o.id && o.id === activeId ? 1 : 0;
    o.act += (on - o.act) * Math.min(1, dt * 3);
    o.g.position.set(o.base.x, o.base.y + Math.sin(time * 0.9 + i) * 0.1, o.base.z);
    const pulse = o.isNext ? 0.55 + 0.45 * Math.sin(time * 1.6) : 1;
    const hov = hovered === o ? 0.25 : 0;
    o.g.scale.setScalar((o.isNext ? 0.7 : 1) * (1 + o.act * 0.22 + hov) * (o.isNext ? 0.85 + pulse * 0.15 : 1));
    o.mat.uniforms.uTime.value = time;
    o.mat.uniforms.uBoost.value = o.isNext ? 0.45 + pulse * 0.3 : 1 + o.act * 0.5 + hov;
    o.halo.material.opacity = o.isNext ? 0.2 + pulse * 0.2 : 0.65 + o.act * 0.35;
    o.ring.rotation.z = time * (0.35 + i * 0.03); o.sparks.rotation.y = time * (0.25 + i * 0.02);
  });

  clouds.rotation.y = time * 0.006;
  clouds.children.forEach((s) => { s.position.y += Math.sin(time * 0.25 + s.userData.bob) * 0.0009; });
  coreGlow.material.opacity = 0.5 + Math.sin(time * 0.6) * 0.06;

  if (!coarse && time - lastHover > 0.06) { updateHover(); lastHover = time; }
  composer.render();
  if (frame === 3) window.dispatchEvent(new CustomEvent('dl:ready'));
  frame++;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
