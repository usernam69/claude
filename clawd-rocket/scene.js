// Clawd and the rocket: a 22 s Three.js short. Every frame is a pure function of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const { clamp, lerp, prog, ease, ep, mulberry32 } = window.M;
const W = 1920, H = 1080, DUR = 22, FPS = 30;
const CLAY = 0xD97757, INK = 0x1F1E1D, CREAM = 0xF0EEE6;

// ---------------------------------------------------------------- keyframes
// keys: [[time, value, ease]] — ease applies to the segment arriving at that key
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const p = t1 <= t0 ? 1 : ease(e || 'power2.inOut', (t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], p)) : lerp(v0, v1, p);
      }
    }
    return keys[keys.length - 1][1];
  };
}
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const wob = (t, s, f = 1) => Math.sin(t * 7.1 * f + s * 1.7) * 0.5 + Math.sin(t * 13.3 * f + s * 4.1) * 0.3 + Math.sin(t * 23.9 * f + s * 2.3) * 0.2;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x0b0d14, 18, 60);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 200);

// ---------------------------------------------------------------- procedural textures
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...repeat); }
  return tx;
}
function noiseCanvas(seed, size, scale) {
  const r = mulberry32(seed), c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), im = g.createImageData(size, size);
  const grid = []; const N = Math.ceil(size / scale) + 1; for (let i = 0; i < N * N; i++) grid.push(r());
  const sm = (x) => x * x * (3 - 2 * x);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / scale, gy = y / scale, ix = Math.floor(gx), iy = Math.floor(gy), fx = sm(gx - ix), fy = sm(gy - iy);
    const v = (a, b) => grid[((b % (N - 1)) * N + (a % (N - 1)))];
    const n = lerp(lerp(v(ix, iy), v(ix + 1, iy), fx), lerp(v(ix, iy + 1), v(ix + 1, iy + 1), fx), fy);
    const v2 = n * 0.75 + r() * 0.25; const o = (y * size + x) * 4;
    im.data[o] = im.data[o + 1] = im.data[o + 2] = v2 * 255; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}
const clayBump = new THREE.CanvasTexture(noiseCanvas(7, 256, 9)); clayBump.wrapS = clayBump.wrapT = THREE.RepeatWrapping; clayBump.repeat.set(2, 2);
const woodTex = canvasTex(1024, 1024, (g, w, h) => {
  const r = mulberry32(21); const planks = 6;
  for (let p = 0; p < planks; p++) {
    const y0 = (p / planks) * h, ph = h / planks; const base = [120 + r() * 30, 78 + r() * 18, 48 + r() * 12];
    g.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`; g.fillRect(0, y0, w, ph);
    for (let k = 0; k < 70; k++) { const yy = y0 + r() * ph; g.strokeStyle = `rgba(${40 + r() * 30},${25 + r() * 15},${10},${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 3;
      g.beginPath(); g.moveTo(0, yy); for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x * 0.01 + k) * 3 * r()); g.stroke(); }
    g.fillStyle = 'rgba(20,10,5,0.6)'; g.fillRect(0, y0, w, 3);
    // knots and scuffs
    for (let k = 0; k < 2; k++) { const kx = r() * w, ky = y0 + r() * ph; g.fillStyle = 'rgba(60,35,18,0.35)'; g.beginPath(); g.ellipse(kx, ky, 18 + r() * 10, 7, 0, 0, 7); g.fill(); }
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255,230,200,${r() * 0.05})`; g.fillRect(r() * w, y0 + r() * ph, 20 + r() * 80, 1); }
  }
}, [2, 2]);
const pegTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6f5a44'; g.fillRect(0, 0, w, h);
  for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.fillStyle = '#2a2018'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
}, [6, 4]);
const wallTex = canvasTex(512, 512, (g, w, h) => {
  const r = mulberry32(31); g.fillStyle = '#3a3640'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 64) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.1})`; g.fillRect(x, 0, 3, h); g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(x + 3, 0, 61, h); }
}, [8, 4]);
const roofTex = canvasTex(512, 512, (g, w, h) => {
  const r = mulberry32(41); g.fillStyle = '#26232a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < w; x += 48) { g.fillStyle = `rgba(${40 + r() * 25},${36 + r() * 20},${44 + r() * 20},1)`; g.fillRect(x + 1, y + 1, 46, 30); }
}, [6, 6]);
const labelTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#F0EEE6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1F1E1D'; g.fillRect(0, 40, w, 18); g.fillRect(0, h - 58, w, 18);
  g.fillStyle = '#5d7f86'; g.fillRect(0, 90, w, 70);
});
const boosterTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#2f5d62'; g.fillRect(0, 0, w, h); g.fillStyle = '#F0EEE6';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 90 - 40, h); g.lineTo(i * 90 + 30, 0); g.lineTo(i * 90 + 60, 0); g.lineTo(i * 90 - 10, h); g.fill(); }
  g.fillStyle = '#1F1E1D'; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16);
});
function glowTex(inner = 'rgba(255,255,255,1)') {
  return canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
const GLOW = glowTex();

// ---------------------------------------------------------------- materials
const M_CLAY = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.82, metalness: 0, bumpMap: clayBump, bumpScale: 0.22 });
const M_EYE = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.25 });
const M_WOOD = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
const M_TIN = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.38, metalness: 0.85 });
const M_TIN_DARK = new THREE.MeshStandardMaterial({ color: 0x6d7175, roughness: 0.45, metalness: 0.8 });
const M_LABEL = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.55, metalness: 0.1 });
const M_BOOST = new THREE.MeshStandardMaterial({ map: boosterTex, roughness: 0.4, metalness: 0.3 });
const M_INK = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.6 });
const M_CREAM = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.7 });
const M_TEAL = new THREE.MeshStandardMaterial({ color: 0x2f5d62, roughness: 0.55 });
const M_FUSE = new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.95 });
const M_TAPE = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.6, side: THREE.DoubleSide });
const M_GLASS = new THREE.MeshStandardMaterial({ color: 0x9fb8d8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
const M_FRAME = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.7 });
const shadowAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

// ---------------------------------------------------------------- the world
const world = new THREE.Group(); scene.add(world);
// bench top (y=0 is the work surface)
const bench = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 4.8), M_WOOD); bench.position.set(0, -0.15, -0.1); bench.receiveShadow = true; world.add(bench);
const benchFront = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.8 })); benchFront.position.set(0, -0.9, 2.3); world.add(benchFront);
// walls
const back = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 })); back.position.set(0, 3.5, -2.5); back.receiveShadow = true; world.add(back);
const peg = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), new THREE.MeshStandardMaterial({ map: pegTex, roughness: 0.9 })); peg.position.set(0.6, 2.3, -2.46); peg.receiveShadow = true; world.add(peg);
[-1, 1].forEach((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 })); w.position.set(s * 7.5, 3.5, 1); w.rotation.y = -s * Math.PI / 2; w.receiveShadow = true; world.add(w); });
// tools on the pegboard
function tool(parts, x, y, rz) { const g = new THREE.Group(); parts.forEach(([w, h, d, px, py, mat]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py, 0); g.add(m); }); g.position.set(x, y, -2.4); g.rotation.z = rz; shadowAll(g); world.add(g); }
tool([[0.12, 1.1, 0.06, 0, 0, M_TIN_DARK], [0.38, 0.14, 0.08, 0, 0.6, M_TIN_DARK]], -1.8, 2.4, 0.15); // wrench-ish
tool([[0.1, 1.0, 0.08, 0, 0, M_CLAY], [0.5, 0.18, 0.16, 0, 0.55, M_TIN_DARK]], -0.9, 2.5, -0.1); // hammer
tool([[0.08, 0.6, 0.05, 0, 0.3, M_TEAL], [0.04, 0.6, 0.03, 0, -0.3, M_TIN]], 0.1, 2.6, 0.05); // screwdriver
tool([[1.4, 0.38, 0.03, 0, 0, M_TIN], [0.3, 0.42, 0.08, -0.82, 0, M_INK]], 1.6, 3.3, 0); // saw
tool([[0.09, 0.8, 0.06, 0, 0, M_INK], [0.3, 0.1, 0.07, 0, 0.42, M_INK]], 2.8, 2.3, -0.3);
tool([[0.06, 0.7, 0.05, -0.09, 0, M_TEAL], [0.06, 0.7, 0.05, 0.09, 0, M_TEAL]], 3.5, 2.5, 0.2);
// shelf with jars
const shelf = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 0.8), M_WOOD); shelf.position.set(-0.5, 4.3, -2.1); shadowAll(shelf); world.add(shelf);
{ const r = mulberry32(51); for (let i = 0; i < 9; i++) {
  const rad = 0.18 + r() * 0.15, h = 0.35 + r() * 0.5; const glassy = r() < 0.5;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 24), glassy ? new THREE.MeshStandardMaterial({ color: 0x8aa6a0, roughness: 0.15, transparent: true, opacity: 0.55 }) : [M_TIN, M_LABEL, M_TEAL][i % 3]);
  m.position.set(-3.2 + i * 0.66 + r() * 0.1, 4.35 + h / 2, -2.1 + (r() - 0.5) * 0.3); shadowAll(m); world.add(m); } }
// ceiling with skylight hole x∈[-0.9,2.1], z∈[-1.5,1.5]
const SKY = { x0: -0.9, x1: 2.1, z0: -1.5, z1: 1.5, y: 8 };
const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2b2830, roughness: 0.95 });
const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 });
function slab(x0, x1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0);
  const m = new THREE.Mesh(g, [ceilMat, ceilMat, roofMat, ceilMat, ceilMat, ceilMat]); m.position.set((x0 + x1) / 2, SKY.y + 0.15, (z0 + z1) / 2); m.receiveShadow = true; world.add(m); }
slab(-9, SKY.x0, -3, 6); slab(SKY.x1, 9, -3, 6); slab(SKY.x0, SKY.x1, -3, SKY.z0); slab(SKY.x0, SKY.x1, SKY.z1, 6);
// skylight frame (casts lovely mullion shadows)
const frame = new THREE.Group(); world.add(frame);
[[SKY.x0, SKY.x1, SKY.z0, SKY.z0], [SKY.x0, SKY.x1, SKY.z1, SKY.z1], [SKY.x0, SKY.x0, SKY.z0, SKY.z1], [SKY.x1, SKY.x1, SKY.z0, SKY.z1], [0.6, 0.6, SKY.z0, SKY.z1], [SKY.x0, 0.6, 0, 0]].forEach(([x0, x1, z0, z1]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0) + 0.12, 0.16, Math.abs(z1 - z0) + 0.12), M_FRAME); m.position.set((x0 + x1) / 2, SKY.y + 0.38, (z0 + z1) / 2); m.castShadow = true; frame.add(m); });
// pane A (closed, x∈[-0.9,0.6]) — the rocket will burst through it
const paneA = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), M_GLASS); paneA.rotation.x = -Math.PI / 2; paneA.position.set(-0.15, SKY.y + 0.36, 0); world.add(paneA);
// pane B (propped open, x∈[0.6,2.1]) — the camera enters here
const paneBPivot = new THREE.Group(); paneBPivot.position.set(0.6, SKY.y + 0.42, 0); world.add(paneBPivot);
const paneB = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3), M_GLASS); paneB.rotation.x = -Math.PI / 2; paneB.position.set(0.75, 0, 0); paneBPivot.add(paneB);
paneBPivot.rotation.z = 0.95;
// sky dome + stars + moon
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { flash: { value: new THREE.Color(0, 0, 0) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'varying vec3 vP; uniform vec3 flash; void main(){ float h = clamp(vP.y,0.,1.); vec3 c = mix(vec3(0.075,0.10,0.19), vec3(0.012,0.018,0.04), pow(h,0.6)); gl_FragColor = vec4(c + flash*(0.3+0.7*h), 1.); }' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), skyMat); world.add(sky);
{ const r = mulberry32(61), N = 1400, pos = new Float32Array(N * 3), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) { const u = r(), v = r() * 0.95 + 0.05; const th = u * Math.PI * 2, ph = Math.acos(v);
    pos.set([Math.sin(ph) * Math.cos(th) * 110, Math.cos(ph) * 110, Math.sin(ph) * Math.sin(th) * 110], i * 3); sz[i] = 0.4 + Math.pow(r(), 6) * 2.5; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float sz; void main(){ gl_PointSize = sz*2.2; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vec3(0.85,0.9,1.0), smoothstep(.5,0.,d)); }' });
  world.add(new THREE.Points(g, m)); }
const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 16), new THREE.MeshBasicMaterial({ color: 0xf3efe2, fog: false })); moon.position.set(-38, 70, -60); world.add(moon);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x8fa8ff, transparent: true, opacity: 0.45, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); moonGlow.scale.set(30, 30, 1); moonGlow.position.copy(moon.position); world.add(moonGlow);

// desk lamp
const lamp = new THREE.Group(); world.add(lamp);
{ const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 32), M_INK); base.position.set(-2.6, 0.07, -1.2); lamp.add(base);
  const seg = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), M_TIN_DARK);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); lamp.add(m); };
  const A = new THREE.Vector3(-2.6, 0.1, -1.2), B = new THREE.Vector3(-2.4, 2.7, -1.6), C = new THREE.Vector3(-1.75, 3.55, 1.25);
  seg(A, B, 0.06); seg(B, C, 0.055);
  [B, C].forEach((p) => { const j = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), M_INK); j.position.copy(p); lamp.add(j); }); }
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.75, 0.9, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f4a3f, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
const LAMP_POS = new THREE.Vector3(-1.45, 3.25, 1.55), LAMP_TGT = new THREE.Vector3(-0.15, 0, 0.0);
shade.position.copy(LAMP_POS); shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), LAMP_TGT.clone().sub(LAMP_POS).normalize()); shade.castShadow = true; world.add(shade);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); bulb.position.copy(LAMP_POS).addScaledVector(LAMP_TGT.clone().sub(LAMP_POS).normalize(), 0.35); world.add(bulb);

// clutter (seeded, kept out of the action lanes)
const clutter = new THREE.Group(); world.add(clutter);
{ const r = mulberry32(71);
  const lanes = (x, z) => (z > -1.5 && x > -2.2 && x < 4.8) || (x > -3.3 && x < -1.9 && z > -1.9 && z < -0.5) || (z > 0.6 && x > -3.5 && x < 6);
  const kinds = [
    () => new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 6), M_TIN_DARK), // nut
    () => new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), M_TIN), // bolt
    () => new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 16), M_TIN), // washer
    () => new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), M_CLAY), // bottle cap
    () => new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 24), [M_LABEL, M_TIN, M_TIN]), // can
    () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), M_CREAM), // paper ball
    () => new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.12), M_CREAM), // ruler
    () => new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), M_TEAL), // pencil
  ];
  let placed = 0, guard = 0;
  while (placed < 46 && guard++ < 2000) {
    const x = -5.5 + r() * 11, z = -2.2 + r() * 4.2;
    if (lanes(x, z)) continue;
    const k = Math.floor(r() * kinds.length), m = kinds[k]();
    const box = new THREE.Box3().setFromObject(m); m.position.set(x, -box.min.y, z);
    if (k === 1 || k === 7) { m.rotation.z = Math.PI / 2; m.position.y = 0.05; m.rotation.y = r() * 3; }
    else if (k === 6) m.rotation.y = r() * 3; else m.rotation.y = r() * 6;
    clutter.add(m); placed++;
  }
  // gear
  const gear = new THREE.Group(); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 32), M_TIN_DARK); gear.add(hub);
  for (let i = 0; i < 14; i++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), M_TIN_DARK); const a = i / 14 * Math.PI * 2; tth.position.set(Math.cos(a) * 0.47, 0, Math.sin(a) * 0.47); tth.rotation.y = -a; gear.add(tth); }
  gear.position.set(-4.0, 0.06, -0.4); clutter.add(gear);
  // mug
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.95, 32), M_CREAM); mug.position.set(4.9, 0.475, -1.2); clutter.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 20), M_CREAM); handle.position.set(5.32, 0.5, -1.2); clutter.add(handle);
  // tape roll (Clawd's tape)
  const tapeRoll = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 12, 28), M_TAPE); tapeRoll.rotation.x = Math.PI / 2; tapeRoll.position.set(2.0, 0.09, -1.75); clutter.add(tapeRoll);
  // matchbox (in front of Clawd's right)
  const mb = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34), M_TEAL); box.position.y = 0.08; mb.add(box);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 1 })); strip.position.set(0, 0.08, 0.175); mb.add(strip);
  mb.position.set(-0.05, 0, 0.95); mb.rotation.y = 0.25; clutter.add(mb);
  shadowAll(clutter);
}

// ---------------------------------------------------------------- Clawd
const clawd = new THREE.Group(); world.add(clawd);
const BODY = { w: 1.0, h: 0.72, d: 0.62, legH: 0.2 };
const bodyPivot = new THREE.Group(); bodyPivot.position.y = BODY.legH; clawd.add(bodyPivot);
const leanPivot = new THREE.Group(); bodyPivot.add(leanPivot);
const bodyMesh = new THREE.Mesh(new RoundedBoxGeometry(BODY.w, BODY.h, BODY.d, 5, 0.09), M_CLAY); bodyMesh.position.y = BODY.h / 2; leanPivot.add(bodyMesh);
const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.3, 0.06, 2, 0.035), M_EYE); e.position.set(s * 0.19, BODY.h * 0.6, BODY.d / 2); leanPivot.add(e); return e; });
const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * BODY.w / 2, BODY.h * 0.46, 0); leanPivot.add(p);
  const a = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.24, 3, 0.07), M_CLAY); a.position.set(s * 0.085, 0, 0); p.add(a); p.userData.s = s; return p; });
const legs = [-0.36, -0.12, 0.12, 0.36].map((x) => { const l = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.24, 0.2, 2, 0.05), M_CLAY); l.position.set(x, 0.12, 0); clawd.add(l); return l; });
shadowAll(clawd);
// match held in the right arm
const match = new THREE.Group(); arms[1].add(match);
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), new THREE.MeshStandardMaterial({ color: 0xe9d3a8, roughness: 0.8 }));
stick.rotation.z = -Math.PI / 2; stick.position.x = 0.18; match.add(stick);
const matchHead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7a2a1a, roughness: 0.7 })); matchHead.position.x = 0.37; match.add(matchHead);
match.position.set(0.16, 0, 0.06); match.rotation.y = -0.5; shadowAll(match);
const flame = new THREE.Group(); flame.position.x = 0.4; match.add(flame);
const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 12), new THREE.MeshBasicMaterial({ color: 0xffd28a })); flameCore.position.y = 0.06; flame.add(flameCore);
const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9a48, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flameGlow.scale.set(0.5, 0.5, 1); flameGlow.position.y = 0.05; flame.add(flameGlow);
const matchLight = new THREE.PointLight(0xff9a50, 0, 4, 2); flame.add(matchLight);

// ---------------------------------------------------------------- rocket (tin can + funnel + fins) and booster
const R = { r: 0.26, h: 0.9, noseH: 0.45 };
const rocketRoot = new THREE.Group(); world.add(rocketRoot);
const tipPivot = new THREE.Group(); tipPivot.position.z = -R.r; rocketRoot.add(tipPivot);
const rocket = new THREE.Group(); rocket.position.z = R.r; tipPivot.add(rocket);
const can = new THREE.Mesh(new THREE.CylinderGeometry(R.r, R.r, R.h, 32), [M_LABEL, M_TIN, M_TIN]); can.position.y = R.h / 2; rocket.add(can);
[0.06, R.h - 0.06].forEach((y) => { const rim = new THREE.Mesh(new THREE.TorusGeometry(R.r, 0.018, 8, 32), M_TIN); rim.rotation.x = Math.PI / 2; rim.position.y = y; rocket.add(rim); });
const nose = new THREE.Mesh(new THREE.ConeGeometry(R.r + 0.02, R.noseH, 32, 1, true), new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide })); rocket.add(nose);
const noseTip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), M_TIN_DARK); rocket.add(noseTip);
const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(0.3, -0.12); finShape.lineTo(0.3, 0.02); finShape.lineTo(0, 0.38); finShape.lineTo(0, 0);
const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.03, bevelEnabled: false });
const fins = [0, 1, 2].map((i) => { const f = new THREE.Mesh(finGeo, new THREE.MeshStandardMaterial({ color: [0x2f5d62, CREAM, 0x2f5d62][i], roughness: 0.5, metalness: 0.2 })); rocket.add(f); return f; });
const FIN_ANG = [Math.PI * 0.5 + 0.6, -0.6 + Math.PI * 0.5 + Math.PI, -Math.PI / 2 - 0.0]; // world-facing angles around the can
shadowAll(rocket);
// booster (spray can)
const BO = { r: 0.36, h: 1.25 };
const booster = new THREE.Group(); world.add(booster);
const bcan = new THREE.Mesh(new THREE.CylinderGeometry(BO.r, BO.r, BO.h, 32), [M_BOOST, M_TIN, M_TIN]); bcan.position.y = BO.h / 2; booster.add(bcan);
const bdome = new THREE.Mesh(new THREE.SphereGeometry(BO.r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M_TIN); bdome.scale.y = 0.35; bdome.position.y = BO.h; booster.add(bdome);
const bnozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.12, 24), M_INK); bnozzle.position.y = -0.0; booster.add(bnozzle);
shadowAll(booster);
// tape strips (unrolling rings)
const tapeGeo = new THREE.CylinderGeometry(BO.r + 0.012, BO.r + 0.012, 0.09, 48, 1, true);
const tapes = [0, 1].map((i) => { const m = new THREE.Mesh(tapeGeo, M_TAPE); m.position.y = BO.h + (i ? 0.1 : -0.04); m.rotation.y = i * 1.3; booster.add(m); return m; });
// exhaust
const exhaust = new THREE.Group(); exhaust.position.y = -0.05; booster.add(exhaust);
const exCone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); exCone.rotation.x = Math.PI; exCone.position.y = -0.7; exhaust.add(exCone);
const exCore = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3d8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); exCore.rotation.x = Math.PI; exCore.position.y = -0.4; exhaust.add(exCore);
const exGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff8a40, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); exGlow.scale.set(3, 3, 1); exGlow.position.y = -0.3; exhaust.add(exGlow);
const exLight = new THREE.PointLight(0xff9a50, 0, 18, 1.6); exLight.position.y = -0.3; exhaust.add(exLight);
// small fizzle flame at the rocket base
const fizz = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9a48, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fizz.scale.set(0.5, 0.5, 1); rocket.add(fizz);
const fizzLight = new THREE.PointLight(0xff8a40, 0, 3, 2); rocket.add(fizzLight);

// ---------------------------------------------------------------- choreography: Clawd
// beat = 0.6 s (100 BPM)
const CX = track([[0, -0.8], [12.62, -0.8], [12.95, 3.72, 'power2.inOut'], [13.2, 3.72], [14.0, 1.37, 'power1.inOut'], [15.1, 1.37], [15.55, -0.8, 'power2.inOut']]);
const CZ = track([[0, 0.3], [15.1, 0.3], [15.26, 1.0, 'power2.out'], [15.4, 1.0], [15.55, 0.3, 'power2.in']]);
const CYAW = track([[0, 0.4], [1.2, 0.55], [5.3, 0.55], [5.45, 0.1, 'back.out'], [5.9, 0.45], [8.3, 0.5], [9.6, 0.35], [10.4, 0.12], [12.6, 0.12], [12.95, -1.57, 'power2.inOut'], [15.1, -1.57], [15.5, -1.4], [15.66, 0.42, 'back.out'], [17.3, 0.42], [17.6, 0.2], [22, 0.2]]);
const CHOP = track([[0, 0], [5.3, 0], [5.5, 0.18, 'power2.out'], [5.7, 0, 'power2.in'], [9.55, 0], [9.68, 0.08, 'power2.out'], [9.8, 0, 'power2.in'],
  [11.95, 0], [12.15, 0.32, 'power2.out'], [12.4, 0, 'power2.in'], [12.7, 0], [12.8, 0.3, 'power2.out'], [12.95, 0, 'power2.in'],
  [20.35, 0], [20.55, 0.2, 'power2.out'], [20.75, 0, 'power2.in'], [21.15, 0], [21.3, 0.1, 'power2.out'], [21.45, 0, 'power2.in']]);
const CSQ = track([[0, 1], [1.75, 1], [1.8, 0.9, 'power4.in'], [1.98, 1, 'back.out'], [2.35, 1], [2.4, 0.9, 'power4.in'], [2.58, 1, 'back.out'], [2.95, 1], [3.0, 0.88, 'power4.in'], [3.2, 1, 'back.out'],
  [5.25, 1], [5.38, 0.88], [5.5, 1.12, 'power2.out'], [5.7, 0.86, 'power2.in'], [5.88, 1, 'back.out'],
  [8.95, 1], [9.05, 1.08, 'power2.out'], [9.3, 1], [10.2, 1], [10.8, 0.84, 'power2.inOut'], [11.7, 0.82], [11.95, 0.74, 'power2.in'], [12.08, 1.16, 'power2.out'], [12.4, 0.88, 'power2.in'], [12.58, 1, 'back.out'],
  [13.2, 1], [13.3, 0.95], [14.0, 0.95], [14.15, 0.88], [14.3, 1.08], [14.45, 1],
  [20.3, 1], [20.36, 0.9], [20.45, 1.1], [20.75, 0.88, 'power2.in'], [20.9, 1, 'back.out'], [22, 1]]);
const CLEAN = track([[0, 0], [1.75, 0], [1.8, 0.12, 'power4.in'], [2.0, 0.02], [2.4, 0.12, 'power4.in'], [2.6, 0.02], [3.0, 0.12, 'power4.in'], [3.3, 0],
  [6.6, 0], [7.0, -0.06], [7.2, 0.34, 'power3.in'], [7.65, 0.32], [8.0, 0, 'power2.out'], [9.5, 0], [9.65, -0.2, 'power2.out'], [9.95, 0],
  [10.2, 0], [10.9, 0.2], [11.85, 0.22], [12.05, -0.12, 'power2.out'], [12.4, 0], [13.2, 0], [13.35, 0.25], [14.0, 0.25], [14.15, -0.1], [14.4, 0],
  [15.9, 0], [16.0, -0.06], [16.2, 0.34, 'power3.in'], [16.45, 0.32], [16.75, -0.2, 'power2.out'], [17.4, -0.22], [17.8, -0.1], [19.8, -0.14], [22, -0.14]]);
const ARM_R = track([[0, 0.15], [1.3, 0.1], [1.6, 1.1, 'power2.out'], [1.8, -0.3, 'power4.in'], [2.1, 1.0, 'power2.out'], [2.4, -0.3, 'power4.in'], [2.7, 1.0, 'power2.out'], [3.0, -0.3, 'power4.in'], [3.35, 0.15],
  [5.3, 0.15], [5.5, 1.0, 'back.out'], [5.72, 0.6], [6.0, -0.45, 'power3.in'], [6.3, 0.7, 'back.out'], [6.9, 0.85], [7.2, -0.6, 'power3.in'], [7.65, -0.6], [8.0, 0.35, 'power2.out'],
  [8.95, 0.3], [9.05, 0.9, 'back.out'], [9.55, 0.9], [9.65, 1.3, 'power2.out'], [9.95, 0.3], [10.4, 0.2], [10.9, -0.5], [11.85, -0.55], [12.05, 1.4, 'back.out'], [12.45, 0.2],
  [13.2, 0.5], [14.0, 0.5], [14.15, 0.0], [14.3, 1.4, 'power3.out'], [14.5, 0.6], [15.1, 0.6], [15.45, 0.6], [15.6, -0.45, 'power3.in'], [15.8, 0.7, 'back.out'], [16.0, 0.85], [16.2, -0.6, 'power3.in'], [16.45, -0.6], [16.75, 1.0, 'power2.out'], [17.4, 1.15], [17.8, 0.7], [19.8, 0.45], [22, 0.45]]);
const ARM_L = track([[0, 0.1], [5.3, 0.1], [5.5, 1.0, 'back.out'], [5.9, 0.15], [8.95, 0.15], [9.05, 0.9, 'back.out'], [9.55, 0.9], [9.65, 1.3, 'power2.out'], [9.95, 0.3], [10.4, 0.2], [10.9, -0.5], [11.85, -0.55], [12.05, 1.4, 'back.out'], [12.45, 0.2],
  [13.2, 0.5], [14.0, 0.5], [14.15, 0.0], [14.3, 1.4, 'power3.out'], [14.5, 0.6], [15.1, 0.4], [16.5, 0.3], [16.75, 1.0, 'power2.out'], [17.4, 1.15], [17.8, 0.7], [19.8, 0.45], [22, 0.45]]);
const EYE_H = track([[0, 1], [8.95, 1], [9.05, 1.4, 'back.out'], [9.5, 1.35], [9.62, 0.5, 'power2.in'], [9.9, 1.0], [10.4, 1.0], [10.9, 0.55], [11.85, 0.5], [12.02, 1.45, 'back.out'], [12.5, 1.1], [13.0, 1.0],
  [16.7, 1.0], [16.85, 0.42], [17.35, 0.42], [17.48, 1.35, 'back.out'], [18.5, 1.2], [19.8, 1.15], [22, 1.15]]);
// eye look (x: right, y: up), eyes lead the body by ~0.1 s
const EYE_LOOK = track([[0, [0.03, -0.02]], [1.4, [0.05, -0.04]], [3.0, [0.05, -0.04]], [3.25, [0.0, -0.03]], [3.45, [0.04, 0.05]], [3.65, [0.05, 0.03]], [3.9, [0.02, -0.03]], [4.05, [0.05, 0.03]], [4.3, [0.05, 0.0]], [4.55, [0.0, -0.03]], [4.7, [0.05, 0.03]], [4.95, [0.04, 0.0]], [5.3, [0.0, 0.02]],
  [5.8, [0.04, -0.04]], [6.25, [0.0, 0.05]], [6.9, [0.04, -0.03]], [7.3, [0.05, -0.05]], [8.2, [0.06, -0.02]], [8.45, [0.05, 0.02]], [9.05, [0.04, 0.06]], [9.5, [0.03, -0.02]], [10.6, [0.0, -0.07]], [11.8, [0.0, -0.07]], [12.0, [0.0, 0.05]], [12.35, [0.0, 0.03]], [12.45, [0.08, 0.0], 'power4.out'],
  [12.95, [0.0, 0.0]], [14.1, [0.0, 0.06]], [14.5, [0.0, 0.0]], [15.15, [0.0, 0.0]], [15.6, [0.04, -0.03]], [16.25, [0.05, -0.05]], [16.6, [0.06, -0.01]], [17.4, [0.03, 0.05]], [17.6, [0.0, 0.08]], [22, [0.0, 0.08]]]);
const BLINKS = [1.05, 4.0, 7.85, 10.5, 14.7, 19.1, 21.6];
function blink(t) { let k = 1; for (const b of BLINKS) { const d = Math.abs(t - b); if (d < 0.07) k = Math.min(k, lerp(0.08, 1, d / 0.07)); } return k; }

// ---------------------------------------------------------------- choreography: rocket
const ROCKET_X = 0.45;
const BOOST_X = track([[0, 2.8], [13.2, 2.8], [14.0, ROCKET_X, 'power1.inOut']]);
const LAUNCH = 17.4, ACC = 38;
const liftY = (t) => (t < LAUNCH ? 0 : 0.5 * ACC * (t - LAUNCH) ** 2);
const NOSE_TOP = BO.h + R.h + R.noseH; // rocket nose height above the booster base
const T_SHATTER = LAUNCH + Math.sqrt((2 * (SKY.y - NOSE_TOP)) / ACC);
const T_BURST = [18.6, 19.2, 19.8];
// parts hop on: [start, land]
const PARTS = { nose: [3.0, 3.6], fin0: [3.75, 4.2], fin1: [4.35, 4.8] };
function hopPos(t, [a, b], from, to, h) { const p = prog(t, a, b), e = ease('power1.inOut', p); return [lerp(from[0], to[0], e), lerp(from[1], to[1], e) + Math.sin(Math.PI * p) * h, lerp(from[2], to[2], e)]; }

// fuse curves: the lighting end is wherever the match tip is when Clawd touches it
const tmpV = new THREE.Vector3();
function matchTipAt(t) { poseClawd(t); clawd.updateMatrixWorld(true); return flame.getWorldPosition(new THREE.Vector3()); }
let FUSE1, FUSE2;
function buildFuse(end, startX, startZ) {
  const pts = [new THREE.Vector3(startX, 0.06, startZ), new THREE.Vector3(startX - 0.15, 0.03, startZ + 0.3), new THREE.Vector3((startX + end.x) / 2, 0.025, end.z + 0.25), new THREE.Vector3(end.x + 0.05, 0.025, end.z + 0.08), new THREE.Vector3(end.x, Math.max(end.y - 0.02, 0.03), end.z)];
  const curve = new THREE.CatmullRomCurve3(pts); const geo = new THREE.TubeGeometry(curve, 96, 0.018, 8, false);
  const mesh = new THREE.Mesh(geo, M_FUSE); mesh.castShadow = true; world.add(mesh);
  const burnt = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x151210, roughness: 1 })); burnt.scale.setScalar(1); world.add(burnt);
  return { curve, mesh, burnt, segs: 96, radial: 8 };
}
function setFuse(F, uVisible, uBurnStart) { // show [0, uVisible] fresh; burnt remainder thin
  const per = F.radial * 6; const n = Math.floor(clamp(uVisible) * F.segs);
  F.mesh.geometry.setDrawRange(0, n * per);
}

// spark at the burning point
const spark = new THREE.Group(); world.add(spark);
const sparkGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparkGlow.scale.set(0.45, 0.45, 1); spark.add(sparkGlow);
const sparkLight = new THREE.PointLight(0xffa050, 0, 3.5, 2); spark.add(sparkLight);
const SPN = 40; const sparkPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPN * 3), 3)),
  new THREE.PointsMaterial({ color: 0xffd090, size: 0.035, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); spark.add(sparkPts);

// smoke puffs (fizzle + launch)
const SMOKE_N = 70; const smokeMat = new THREE.MeshStandardMaterial({ color: 0x8e8a86, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false });
const smoke = []; for (let i = 0; i < SMOKE_N; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat.clone()); m.visible = false; world.add(m); smoke.push(m); }
// glass shards
const SH_N = 60; const shards = []; { const r = mulberry32(81);
  for (let i = 0; i < SH_N; i++) { const g = new THREE.BufferGeometry(); const s = 0.08 + r() * 0.16;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, s, 0, r() * s, r() * s, 0, s]), 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xbfd4f0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    m.userData = { x: SKY.x0 + r() * 1.5, z: SKY.z0 + r() * 3, vx: (r() - 0.5) * 3, vy: 3 + r() * 6, vz: (r() - 0.5) * 3, rx: r() * 10, ry: r() * 10 }; m.visible = false; world.add(m); shards.push(m); } }

// fireworks
const FW_N = 300, FW_TRAIL = 4;
const fwBursts = [
  { t: T_BURST[0], c: null, cols: [0xff8a5c, 0xffd59a], speed: 15, size: 1.7 },
  { t: T_BURST[1], c: new THREE.Vector3(-0.6, 31, -1.6), cols: [0xfff3dc, 0xD97757], speed: 16, size: 1.8 },
  { t: T_BURST[2], c: new THREE.Vector3(1.8, 27, 0.4), cols: [0xffc96b, 0xff7a4a], speed: 14, size: 1.6 },
];
const fwPoints = fwBursts.map((b, bi) => {
  const r = mulberry32(91 + bi), N = FW_N * FW_TRAIL;
  const dir = new Float32Array(FW_N * 3), spd = new Float32Array(FW_N), col = [];
  for (let i = 0; i < FW_N; i++) { const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); dir.set([s * Math.cos(th), u, s * Math.sin(th)], i * 3); spd[i] = b.speed * (0.75 + r() * 0.35); col.push(new THREE.Color(b.cols[r() < 0.7 ? 0 : 1])); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N), 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { size: { value: 0.32 * b.size } },
    vertexShader: 'attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float size; void main(){ vA=alpha; vC=color; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size*1100./-mv.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vC*(1.2+2.*a*a), a*vA); }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; world.add(pts);
  return { pts, dir, spd, col, b };
});
const skyFlash = new THREE.PointLight(0xffc090, 0, 30, 1.2); skyFlash.position.set(0.3, 7.4, 0.2); world.add(skyFlash);

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0x5d70a0, 0x3a2616, 0.6); world.add(hemi);
const lampLight = new THREE.SpotLight(0xffb36b, 32, 14, 0.78, 0.55, 1.6);
lampLight.position.copy(LAMP_POS); lampLight.target.position.copy(LAMP_TGT); world.add(lampLight, lampLight.target);
lampLight.castShadow = true; lampLight.shadow.mapSize.set(2048, 2048); lampLight.shadow.bias = -0.0004; lampLight.shadow.normalBias = 0.02; lampLight.shadow.radius = 4; lampLight.shadow.camera.near = 0.5; lampLight.shadow.camera.far = 12;
const moonLight = new THREE.DirectionalLight(0x8fb0ff, 1.35); moonLight.position.set(2.2, 16, -2.8); moonLight.target.position.set(0.4, 0, 0.2); world.add(moonLight, moonLight.target);
moonLight.castShadow = true; moonLight.shadow.mapSize.set(2048, 2048); const sc = moonLight.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 2; sc.far = 30; moonLight.shadow.bias = -0.0005; moonLight.shadow.radius = 3;
const fill = new THREE.DirectionalLight(0x7d90c4, 0.55); fill.position.set(2.5, 2.5, 8); world.add(fill);
const rim = new THREE.PointLight(0x9fb6ff, 2.2, 8, 2); rim.position.set(-0.6, 3.2, -1.6); world.add(rim);

// ---------------------------------------------------------------- camera choreography
// position & target keys; the opening descends on a spline through the open pane
const openPath = new THREE.CatmullRomCurve3([new THREE.Vector3(1.35, 17, 0.25), new THREE.Vector3(1.35, 10.5, 0.3), new THREE.Vector3(1.3, 6.5, 0.6), new THREE.Vector3(0.9, 3.4, 2.4), new THREE.Vector3(0.2, 1.55, 5.0)]);
const openTgt = new THREE.CatmullRomCurve3([new THREE.Vector3(1.15, 0, -0.35), new THREE.Vector3(1.0, 0, -0.3), new THREE.Vector3(0.6, 0.2, -0.2), new THREE.Vector3(0.1, 0.5, 0), new THREE.Vector3(-0.1, 0.55, 0)]);
const CAM = track([[0, [0.2, 1.55, 5.0]], [3.0, [0.2, 1.55, 5.0]], [6.0, [0.0, 1.3, 4.1], 'sine.inOut'], [6.6, [-1.05, 0.5, 2.45], 'power3.inOut'], [8.3, [-0.95, 0.52, 2.35], 'sine.inOut'],
  [8.6, [0.0, 1.5, 5.4], 'expo.out'], [10.2, [0.1, 1.45, 5.2], 'sine.inOut'], [11.9, [-0.62, 1.08, 3.45], 'power2.inOut'], [12.6, [-0.6, 1.08, 3.35], 'sine.inOut'],
  [12.97, [2.1, 1.25, 4.6], 'expo.inOut'], [14.0, [1.6, 1.4, 4.8], 'sine.inOut'], [15.0, [1.0, 1.55, 5.0], 'sine.inOut'], [15.6, [-0.1, 1.4, 5.6], 'power2.inOut'], [17.4, [-0.1, 1.3, 5.3], 'sine.inOut'],
  [18.15, [0.6, 3.4, 1.05], 'expo.inOut'], [19.8, [0.55, 3.2, 1.1], 'sine.inOut']]);
const TGT = track([[0, [-0.1, 0.55, 0]], [3.0, [-0.1, 0.55, 0]], [6.0, [-0.1, 0.65, 0]], [6.6, [0.05, 0.3, 0.35], 'power3.inOut'], [8.3, [0.3, 0.32, 0.25], 'sine.inOut'],
  [8.6, [0.25, 0.8, 0], 'expo.out'], [10.2, [0.0, 0.75, 0.05]], [11.9, [-0.8, 0.72, 0.3], 'power2.inOut'], [12.6, [-0.8, 0.74, 0.3]],
  [12.97, [3.1, 0.7, 0.0], 'expo.inOut'], [14.0, [1.5, 0.95, 0.0], 'sine.inOut'], [15.0, [0.6, 1.35, 0.0], 'sine.inOut'], [15.6, [0.0, 1.0, 0.0], 'power2.inOut'], [17.4, [0.1, 1.05, 0.0]]]);
function cameraAt(t, out) {
  let pos, tgt;
  if (t < 3.0) { const u = ease('power2.inOut', prog(t, 0, 2.9)); pos = openPath.getPointAt(u); tgt = openTgt.getPointAt(u); }
  else if (t < 19.8) {
    pos = new THREE.Vector3(...CAM(t)); tgt = new THREE.Vector3(...TGT(t));
    if (t >= 17.4) { // whip tilt following the rocket up through the skylight
      const ry = liftY(t) + NOSE_TOP * 0.6; const fol = ease('expo.inOut', prog(t, 17.4, 18.15));
      const look = new THREE.Vector3(ROCKET_X, Math.min(ry, 26), 0); const up = new THREE.Vector3(0.45, 24, -0.2);
      tgt = tgt.clone().lerp(t < 18.15 ? look : up, fol);
      if (t >= 18.15) tgt = up.clone().add(new THREE.Vector3(Math.sin(t * 0.7) * 0.4, 0, 0));
    }
  } else { // S10 match cut: low angle on Clawd in his original spot, looking up; closing drift
    const u = ease('sine.inOut', prog(t, 19.8, 22));
    pos = new THREE.Vector3(lerp(-0.25, -0.15, u), lerp(0.38, 1.05, u), lerp(2.15, 2.75, u)); tgt = new THREE.Vector3(-0.8, lerp(0.92, 1.2, u), 0.25);
  }
  // handheld micro-drift + shake on the shudders
  const shake = 0.012 + 0.05 * (ep(t, 16.85, 17.35, 'power2.in') * (t < 17.6 ? 1 : 0)) + 0.025 * (t > 8.4 && t < 9.0 ? 1 : 0) + 0.04 * Math.exp(-Math.max(0, t - T_BURST[0]) * 4) * (t > T_BURST[0] ? 1 : 0);
  pos.x += wob(t, 1, 0.35) * shake; pos.y += wob(t, 2, 0.35) * shake;
  out.pos = pos; out.tgt = tgt; return out;
}

// ---------------------------------------------------------------- post: DOF, bloom, whip blur + grade
const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 4.0, aperture: 0.0016, maxblur: 0.006 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, fade: { value: 0 }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform float fade; uniform float seed; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = vec3(0.); float tot = 0.;
      for (int i = 0; i < 15; i++) { float k = float(i)/14. - .5; float w = 1. - abs(k)*1.2; c += texture2D(tDiffuse, vUv + dir*k).rgb * w; tot += w; }
      c /= tot;
      vec2 q = vUv - .5; float vig = smoothstep(0.95, 0.25, length(q*vec2(1.15,1.)));
      c *= mix(0.55, 1.0, vig);
      c += (h(vUv*1000.) - .5) * 0.035;
      c = mix(c, vec3(0.), fade);
      gl_FragColor = vec4(c, 1.);
    }` });
composer.addPass(grade);

// ---------------------------------------------------------------- pose + frame
function poseClawd(t) {
  const x = CX(t), z = CZ(t);
  // walking: legs step based on travel speed (finite difference — still a pure function of t)
  const dt = 1 / 60; const vx = (CX(t + dt) - CX(t - dt)) / (2 * dt), vz = (CZ(t + dt) - CZ(t - dt)) / (2 * dt); const speed = Math.hypot(vx, vz);
  const walk = clamp(speed * 0.6); const phase = (x * 9 + z * 9) * 1.0 + t * 0.0;
  const hustleHop = (t > 15.1 && t < 15.55) ? Math.abs(Math.sin((t - 15.1) * Math.PI / 0.15)) * 0.08 : 0;
  const pushHop = (t > 13.2 && t < 14.0) ? Math.abs(Math.sin((t - 13.2) * Math.PI / 0.2)) * 0.03 : 0;
  clawd.position.set(x, CHOP(t) + hustleHop + pushHop, z);
  clawd.rotation.y = CYAW(t);
  const breathe = 1 + Math.sin(t * 2.6) * 0.012;
  const sq = CSQ(t) * breathe;
  bodyPivot.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  leanPivot.rotation.x = CLEAN(t) + Math.sin(t * 1.9) * 0.012;
  leanPivot.rotation.z = Math.sin(t * 1.3) * 0.01 + (t > 13.2 && t < 14.0 ? Math.sin(t * 30) * 0.03 : 0);
  // overlapping action: arms trail the body slightly
  const ar = ARM_R(t - 0.03), al = ARM_L(t - 0.05);
  const tapeFlail = (t > 14.5 && t < 15.1) ? Math.sin((t - 14.5) * 26) * 0.7 : 0;
  arms[1].rotation.z = ar + tapeFlail + Math.sin(t * 2.2) * 0.04;
  arms[0].rotation.z = -(al + tapeFlail * 0.8) - Math.sin(t * 2.0 + 1) * 0.04;
  const eh = EYE_H(t) * blink(t); const look = EYE_LOOK(t + 0.08);
  eyes.forEach((e, i) => { e.scale.y = eh; e.position.x = (i ? 0.19 : -0.19) + look[0]; e.position.y = BODY.h * 0.6 + look[1] - (1 - EYE_H(t)) * 0.03; });
  legs.forEach((l, i) => { const s = Math.max(0, Math.sin(phase + i * Math.PI / 2)); l.position.y = 0.12 + s * 0.07 * walk; l.rotation.x = Math.sin(phase + i * Math.PI / 2) * 0.35 * walk; });
  // match visibility
  const matchOn = (t > 5.72 && t < 8.25) || (t > 15.42 && t < 16.75);
  match.visible = matchOn;
  const lit = (t > 6.02 && t < 8.2) || (t > 15.62 && t < 16.7);
  flame.visible = lit;
  const fl = 0.85 + 0.15 * Math.sin(t * 37) + 0.08 * Math.sin(t * 61);
  const ign = Math.max(ep(t, 6.0, 6.12, 'expo.out') * (t < 8.3 ? 1 : 0), ep(t, 15.6, 15.72, 'expo.out') * (t < 16.8 ? 1 : 0));
  const strikeFlare = Math.max(Math.exp(-Math.max(0, t - 6.02) * 6) * (t > 6.02 && t < 8 ? 1 : 0), Math.exp(-Math.max(0, t - 15.62) * 6) * (t > 15.62 && t < 16.5 ? 1 : 0));
  flame.scale.setScalar((0.8 + strikeFlare * 1.2) * fl * ign);
  matchLight.intensity = lit ? (1.6 + strikeFlare * 4) * fl : 0;
}

const camState = {};
function render(t) {
  t = clamp(t, 0, DUR);
  poseClawd(t);
  // ---- rocket
  const bx = BOOST_X(t); booster.position.set(bx, liftY(t), 0);
  booster.rotation.set(0, 0.4, 0);
  if (t > 13.2 && t < 14.0) booster.rotation.z = Math.sin(t * 31) * 0.025;
  rocketRoot.position.set(ROCKET_X, 0, 0); rocketRoot.rotation.set(0, 0, 0); tipPivot.rotation.set(0, 0, 0);
  let rShake = 0;
  if (t > 8.4 && t < 9.0) rShake = 0.05 * ep(t, 8.4, 8.9);
  if (t > 16.9 && t < 17.6) rShake = 0.06 * ep(t, 16.9, 17.35);
  // part landings squash
  let rsq = 1; [3.6, 4.2, 4.8].forEach((tl) => { const d = t - tl; if (d > 0 && d < 0.35) rsq *= 1 - 0.07 * Math.exp(-d * 14) * Math.cos(d * 40); });
  rocket.scale.set(1 / Math.sqrt(rsq), rsq, 1 / Math.sqrt(rsq));
  if (t < 9.0) { rocketRoot.rotation.z = Math.sin(t * 71) * rShake; rocketRoot.position.x += Math.sin(t * 53) * rShake * 0.4; }
  else if (t < 9.5) { rocketRoot.position.y = Math.sin(Math.PI * prog(t, 9.0, 9.35)) * 0.14 * (t < 9.35 ? 1 : 0); rocketRoot.rotation.z = Math.sin((t - 9) * 40) * 0.04 * (1 - prog(t, 9, 9.5)); }
  else if (t < 14.25) { tipPivot.rotation.x = -Math.PI / 2 * ease('bounce.out', prog(t, 9.5, 9.95)); }
  if (t >= 14.25 && t < 14.55) { // toss up onto the booster
    const p = prog(t, 14.25, 14.55), e = ease('power2.out', p);
    tipPivot.rotation.x = lerp(-Math.PI / 2, 0, e); rocketRoot.position.y = lerp(0, BO.h, ease('power1.inOut', p)) + Math.sin(Math.PI * p) * 0.7; rocketRoot.rotation.y = e * Math.PI * 2;
  }
  if (t >= 14.55) { // stacked on the booster
    const land = t - 14.55; const sq2 = land < 0.3 ? 1 - 0.08 * Math.exp(-land * 12) * Math.cos(land * 35) : 1; rocket.scale.set(1 / Math.sqrt(sq2), sq2, 1 / Math.sqrt(sq2));
    rocketRoot.position.set(ROCKET_X, BO.h + liftY(t), 0);
    if (t < 17.6) { rocketRoot.rotation.z = Math.sin(t * 71) * rShake; booster.rotation.z = Math.sin(t * 71) * rShake; }
  }
  const launched = t >= LAUNCH; const burstGone = t >= T_BURST[0];
  rocketRoot.visible = !burstGone; booster.visible = !burstGone;
  // nose + fins positions (hop on)
  const noseFrom = [-0.25, 0.08, 0.75], noseTo = [0, R.h + R.noseH / 2, 0];
  if (t < PARTS.nose[0]) { nose.position.set(...noseFrom); nose.rotation.set(Math.PI, 0, 0.3); }
  else { nose.position.set(...hopPos(t, PARTS.nose, noseFrom, noseTo, 0.9)); const p = ease('power2.out', prog(t, ...PARTS.nose)); nose.rotation.set(lerp(Math.PI, 0, p), p * Math.PI * 2, lerp(0.3, 0, p)); }
  noseTip.position.set(nose.position.x, nose.position.y + R.noseH / 2 + 0.02, nose.position.z); noseTip.visible = t >= PARTS.nose[1];
  // keep parts in world-ish place before they hop (they live in rocket space; rocket is upright & still then)
  fins.forEach((f, i) => {
    const ang = FIN_ANG[i]; const to = [Math.cos(ang) * R.r, 0.0, Math.sin(ang) * R.r];
    const key = i === 0 ? PARTS.fin0 : i === 1 ? PARTS.fin1 : null;
    const from = i === 0 ? [-0.55, 0.0, 0.55] : [0.75, 0.0, 0.7];
    if (!key) { f.position.set(...to); f.rotation.set(0, -ang, 0); return; }
    if (t < key[0]) { f.position.set(from[0], 0.0, from[2]); f.rotation.set(-Math.PI / 2, 0, 0.4 + i); return; }
    f.position.set(...hopPos(t, key, from, to, 0.7)); const p = ease('power2.out', prog(t, ...key)); f.rotation.set(lerp(-Math.PI / 2, 0, p), lerp(0, -ang, p) + (1 - p) * 3, 0);
  });
  // fizzle flame + smoke
  const fz = t > 8.85 && t < 9.4 ? Math.max(0, Math.sin(Math.PI * prog(t, 8.85, 9.4))) * (0.7 + 0.3 * Math.sin(t * 50)) : 0;
  fizz.visible = fz > 0.01; fizz.scale.setScalar(0.25 + fz * 0.5); fizz.position.set(0, 0.02, 0); fizzLight.intensity = fz * 3;
  // exhaust
  const ex = launched && !burstGone ? ep(t, LAUNCH - 0.05, LAUNCH + 0.15, 'expo.out') : (t > 17.1 && t < LAUNCH ? 0.25 * ep(t, 17.1, LAUNCH) * (0.6 + 0.4 * Math.sin(t * 60)) : 0);
  exhaust.visible = ex > 0.01; const exf = 0.85 + 0.15 * Math.sin(t * 47) + 0.1 * Math.sin(t * 83);
  exhaust.scale.set(1, (0.6 + 1.2 * ex) * exf, 1); exLight.intensity = ex * 45 * exf; exGlow.material.opacity = Math.min(1, ex * 1.2);
  // tapes unroll
  const per = tapeGeo.index.count / 48;
  tapes.forEach((tp, i) => { const p = ep(t, 14.6 + i * 0.25, 14.82 + i * 0.25, 'power2.out'); tp.visible = p > 0.01; tp.geometry = tapeGeo; tp.userData.p = p; });
  // two meshes share one geometry; draw range is set per-mesh in onBeforeRender
  // ---- fuses
  const showF1 = t < 9.0, showF2 = t >= 14.0 && t < LAUNCH + 0.2;
  FUSE1.mesh.visible = showF1; FUSE1.burnt.visible = t < 14.0; FUSE2.mesh.visible = showF2; FUSE2.burnt.visible = showF2 && t > 16.2;
  const u1 = 1 - ep(t, 7.25, 8.4, 'sine.in');
  FUSE1.mesh.geometry.setDrawRange(0, Math.floor(u1 * FUSE1.segs) * FUSE1.radial * 6);
  const grow2 = ep(t, 14.0, 14.45, 'power2.out'); const u2 = Math.min(grow2, 1 - ep(t, 16.22, 16.9, 'sine.in'));
  FUSE2.mesh.geometry.setDrawRange(0, Math.floor(u2 * FUSE2.segs) * FUSE2.radial * 6);
  FUSE1.burnt.material.opacity = 1; FUSE2.burnt.geometry.setDrawRange(Math.floor(u2 * FUSE2.segs) * FUSE2.radial * 6, Infinity);
  FUSE1.burnt.geometry.setDrawRange(Math.floor(u1 * FUSE1.segs) * FUSE1.radial * 6, Infinity);
  let sparkOn = false, sp = null;
  if (t > 7.22 && t < 8.42) { sparkOn = true; sp = FUSE1.curve.getPointAt(clamp(u1)); }
  if (t > 16.2 && t < 16.92) { sparkOn = true; sp = FUSE2.curve.getPointAt(clamp(u2)); }
  spark.visible = sparkOn;
  if (sparkOn) {
    spark.position.copy(sp); const fl = 0.8 + 0.2 * Math.sin(t * 71) + 0.15 * Math.sin(t * 113);
    sparkGlow.scale.setScalar(0.35 * fl + 0.1); sparkLight.intensity = 2.2 * fl;
    const arr = sparkPts.geometry.attributes.position.array; const f = Math.floor(t * FPS);
    for (let i = 0; i < SPN; i++) { const a = hash(f * 7.1 + i) * Math.PI * 2, e = hash(f * 3.3 + i * 1.7), r = 0.04 + e * 0.16; arr[i * 3] = Math.cos(a) * r; arr[i * 3 + 1] = 0.02 + hash(i + f) * 0.15; arr[i * 3 + 2] = Math.sin(a) * r; }
    sparkPts.geometry.attributes.position.needsUpdate = true;
  }
  // ---- smoke: fizzle puffs (9.0–) and launch trail (17.4–)
  smoke.forEach((m, i) => {
    let born, pos, life, size;
    if (i < 10) { born = 8.98 + i * 0.05; life = 1.6; const a = i * 2.4; pos = new THREE.Vector3(ROCKET_X + Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15); size = 0.12; }
    else { const k = i - 10; born = LAUNCH - 0.15 + k * 0.022; life = 2.4; pos = new THREE.Vector3(ROCKET_X, Math.max(0.05, liftY(born) - 0.2), 0); size = 0.22 + (k < 12 ? 0.25 : 0); }
    const age = t - born; if (age < 0 || age > life) { m.visible = false; return; }
    const p = age / life; m.visible = true;
    const spread = i < 10 ? 0.25 : (i - 10 < 12 ? 1.6 : 0.6);
    m.position.set(pos.x + Math.cos(i * 2.1) * spread * ease('power2.out', p), pos.y + age * (i < 10 ? 0.35 : 0.25), pos.z + Math.sin(i * 2.1) * spread * ease('power2.out', p));
    m.scale.setScalar(size * (1 + p * 3)); m.material.opacity = 0.5 * (1 - p) * Math.min(1, age * 8);
  });
  // ---- skylight shatter
  paneA.visible = t < T_SHATTER;
  shards.forEach((s) => { const age = t - T_SHATTER; s.visible = age > 0 && age < 3; if (!s.visible) return; const u = s.userData;
    s.position.set(u.x + u.vx * age, SKY.y + 0.36 + u.vy * age - 4.9 * age * age, u.z + u.vz * age); s.rotation.set(u.rx + age * 6, u.ry + age * 4, 0); });
  // ---- fireworks
  let flashCol = new THREE.Color(0, 0, 0), flashI = 0;
  const noseAt = (tt) => new THREE.Vector3(ROCKET_X, BO.h + R.h + R.noseH + liftY(tt), 0);
  fwPoints.forEach(({ pts, dir, spd, col, b }, bi) => {
    const c = b.c || noseAt(b.t); const age = t - b.t; pts.visible = age > 0 && age < 2.4;
    if (age > 0) { const env = Math.exp(-age * 2.2); flashI += env * (bi === 0 ? 1.0 : 0.8); flashCol.add(new THREE.Color(b.cols[0]).multiplyScalar(env)); }
    if (!pts.visible) return;
    const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, A = pts.geometry.attributes.alpha.array; const k = 1.5, g = 3.2;
    for (let i = 0; i < FW_N; i++) for (let tr = 0; tr < FW_TRAIL; tr++) {
      const a = Math.max(0, age - tr * 0.035); const d = (1 - Math.exp(-k * a)) / k * spd[i];
      const j = i * FW_TRAIL + tr; P[j * 3] = c.x + dir[i * 3] * d; P[j * 3 + 1] = c.y + dir[i * 3 + 1] * d - 0.5 * g * a * a; P[j * 3 + 2] = c.z + dir[i * 3 + 2] * d;
      const life = clamp(1 - age / (1.6 + hash(i) * 0.7)); const crackle = age > 1.0 ? (hash(i * 13 + Math.floor(t * 20)) > 0.5 ? 1 : 0.2) : 1;
      A[j] = life * crackle * (1 - tr / FW_TRAIL) * Math.min(1, age * 20);
      C[j * 3] = col[i].r; C[j * 3 + 1] = col[i].g; C[j * 3 + 2] = col[i].b;
    }
    pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; pts.geometry.attributes.alpha.needsUpdate = true;
  });
  // distant bursts that only light Clawd in the last shot
  [20.4, 21.0].forEach((tb, i) => { const age = t - tb; if (age > 0) { const env = Math.exp(-age * 2.5) * 0.8; flashI += env; flashCol.add(new THREE.Color([0xff9a6a, 0xffe2a8][i]).multiplyScalar(env)); } });
  if (flashI > 0) flashCol.multiplyScalar(1 / Math.max(flashI, 1e-3));
  skyFlash.color.copy(flashI > 0 ? flashCol : new THREE.Color(1, 1, 1)); skyFlash.intensity = flashI * 90;
  skyMat.uniforms.flash.value.copy(flashCol).multiplyScalar(Math.min(flashI, 1) * 0.35);
  // lamp breath (never fully still)
  lampLight.intensity = 32 * (1 + Math.sin(t * 3.1) * 0.01);
  // ---- camera
  cameraAt(t, camState); camera.position.copy(camState.pos); camera.up.set(0, 1, 0); camera.lookAt(camState.tgt);
  // focus: whatever matters in the shot
  let focusPt = clawd.position.clone().add(new THREE.Vector3(0, 0.5, 0));
  if (t > 3.0 && t < 6.0) focusPt = new THREE.Vector3(-0.2, 0.6, 0.1);
  if (t > 6.6 && t < 8.6 && sp) focusPt = sp.clone();
  if (t >= 8.6 && t < 10.2) focusPt = new THREE.Vector3(ROCKET_X, 0.5, 0);
  if (t >= 12.97 && t < 15.0) focusPt = booster.position.clone().add(new THREE.Vector3(0, 0.8, 0));
  if (t >= 17.4 && t < 19.8) focusPt = camera.position.clone().add(camera.getWorldDirection(tmpV).multiplyScalar(30));
  const fd = camera.position.distanceTo(focusPt);
  bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = t >= 17.4 && t < 19.8 ? 0.0001 : 0.0016;
  // whip blur: screen-space motion of the look direction between neighbouring frames
  const a = cameraAt(t - 1 / FPS, {}), b = cameraAt(t + 1 / FPS, {});
  const d0 = a.tgt.clone().sub(a.pos).normalize(), d1 = b.tgt.clone().sub(b.pos).normalize();
  const yaw = Math.atan2(d1.x, -d1.z) - Math.atan2(d0.x, -d0.z), pitch = Math.asin(clamp(d1.y, -1, 1)) - Math.asin(clamp(d0.y, -1, 1));
  const bk = t < 3.0 ? 0.25 : 0.9; let bx2 = yaw * bk, by2 = pitch * bk; const bl = Math.hypot(bx2, by2); if (bl > 0.12) { bx2 *= 0.12 / bl; by2 *= 0.12 / bl; }
  grade.uniforms.dir.value.set(bl > 0.004 ? bx2 : 0, bl > 0.004 ? by2 : 0);
  grade.uniforms.fade.value = Math.max(1 - ep(t, 0, 0.6, 'power2.out'), ep(t, 21.2, 22.0, 'power2.in'));
  grade.uniforms.seed.value = Math.floor(t * FPS) * 0.37;
  composer.render();
}

// tapes: per-mesh draw range (both share tapeGeo)
tapes.forEach((tp) => { tp.onBeforeRender = (r, s, c, geo) => { geo.setDrawRange(0, Math.floor((tp.userData.p || 0) * 48) * (geo.index.count / 48)); }; });

// build fuses from the match-tip positions at the two touch moments
{ const e1 = matchTipAt(7.2), e2 = matchTipAt(16.2);
  FUSE1 = buildFuse(e1, ROCKET_X - 0.2, 0.17);
  FUSE2 = buildFuse(e2, ROCKET_X - 0.26, 0.26); }

const P = { t: 0 };
const tl = gsap.timeline({ paused: true });
tl.to(P, { t: DUR, duration: DUR, ease: 'none', onUpdate: () => render(P.t) }, 0);
window.__timelines = window.__timelines || {};
window.__timelines.main = tl;
window.__render = render;
render(0);
