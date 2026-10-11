// Clawd and the rocket. Three.js scene. Every frame is a pure function of t:
// draw(t) sets every transform from t, so seeking to any time gives the same picture.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './assets/three/RoundedBoxGeometry.js';

const M = window.Motion;
const W = 1920, H = 1080;
const TAU = Math.PI * 2;

/* ---------- helpers ---------- */
// Keyframe track: keys = [[t, value, easeFn?], ...]. Eases the segment that ends at each key.
function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (e ? e(p) : M.inOutCubic(p));
    }
  }
  return keys[keys.length - 1][1];
}
// Gravity fall that lands and bounces a little. Before t0 it stays at y0.
function fall(t, t0, y0, y1, dur) {
  dur = dur || 0.24;
  const d = t - t0;
  if (d <= 0) return y0;
  if (d < dur) return y1 + (y0 - y1) * (1 - (d / dur) * (d / dur));
  const dd = d - dur;
  return y1 + 0.12 * Math.exp(-7 * dd) * Math.abs(Math.cos(15 * dd));
}
// Squash and stretch as scale factors, volume roughly kept.
const squash = (s) => [1 + s, 1 - s * 1.1, 1 + s];
// Seeded values
const R = M.rng(4242);
const rnd = (a, b) => a + (b - a) * R();

/* ---------- renderer and scene ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14141c);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 80);

/* ---------- materials ---------- */
const mClay = new THREE.MeshStandardMaterial({ color: 0xd97757, roughness: 0.9, metalness: 0 });
const mCream = new THREE.MeshStandardMaterial({ color: 0xf0eee6, roughness: 0.75 });
const mInk = new THREE.MeshStandardMaterial({ color: 0x1f1e1d, roughness: 0.5 });
// soft round sprite for the particles
const dotTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const mWood = new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 0.92 });
const mWallM = new THREE.MeshStandardMaterial({ color: 0x3a3340, roughness: 0.96 });
const mFloorM = new THREE.MeshStandardMaterial({ color: 0x2b2326, roughness: 0.95 });
const mMetal = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.42, metalness: 0.25 });
const mCard = new THREE.MeshStandardMaterial({ color: 0xb08660, roughness: 0.95 });
const mTape = new THREE.MeshStandardMaterial({ color: 0xe8dfc9, roughness: 0.8 });
const mWick = new THREE.MeshStandardMaterial({ color: 0xc8b38a, roughness: 0.9 });
const mGlass = new THREE.MeshStandardMaterial({
  color: 0xa9c4ff, roughness: 0.2, transparent: true, opacity: 0.22, emissive: 0x5a78b8, emissiveIntensity: 0.35, depthWrite: false,
});
const mShard = new THREE.MeshStandardMaterial({ color: 0xc8dcff, roughness: 0.15, transparent: true, opacity: 0.6, emissive: 0x3c5a96, emissiveIntensity: 0.4 });

function add(mesh, parent, shadow) {
  mesh.castShadow = shadow !== false;
  mesh.receiveShadow = true;
  (parent || scene).add(mesh);
  return mesh;
}
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return add(m, parent);
}

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0x3b4a6b, 0x2a1f1a, 0.8);
// warm key from the front-left, so Clawd's face reads
const keyFront = new THREE.PointLight(0xffa860, 3.2, 0, 1.4);
keyFront.position.set(-0.3, 1.5, 2.4);
scene.add(keyFront);
scene.add(hemi);
// Cool moonlight through the skylight: the ceiling casts a shadow everywhere except the opening.
const moon = new THREE.DirectionalLight(0xa9c4ff, 1.9);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: 1, far: 30 });
moon.shadow.bias = -0.0008;
moon.shadow.normalBias = 0.02;
scene.add(moon);
scene.add(moon.target);
moon.target.position.set(0.6, 0, 0);
// Warm desk lamp at the bench
const lamp = new THREE.PointLight(0xffb06b, 7, 0, 1.6);
lamp.position.set(2.5, 1.05, 0.5);
lamp.castShadow = true;
lamp.shadow.mapSize.set(512, 512);
scene.add(lamp);
// Flashes from the fireworks
const bursts = [
  { tb: 18.5, c: [0.9, 3.9, 0.1], col: 0xd97757 },
  { tb: 19.0, c: [0.4, 3.7, -0.3], col: 0xffd59a },
  { tb: 19.5, c: [1.5, 4.0, 0.2], col: 0xbfd4ff },
];
const burstLights = bursts.map((b) => {
  const l = new THREE.PointLight(b.col, 0, 0, 1.2);
  l.position.set(b.c[0], b.c[1], b.c[2]);
  scene.add(l);
  return l;
});

/* ---------- workshop ---------- */
// floor, walls
const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), mFloorM);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -1.8, 0);
add(floor, scene, false);
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.6), mWallM);
backWall.position.set(0, 1.4, -1.5);
add(backWall, scene, false);
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), mWallM);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-3.5, 1.4, 0);
add(leftWall, scene, false);
const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), mWallM);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(3.5, 1.4, 0);
add(rightWall, scene, false);

// ceiling, with the skylight opening at x in [-0.4, 2.2]
box(3.1, 0.2, 3.0, mWood, -1.95, 3.3, 0);
box(1.3, 0.2, 3.0, mWood, 2.85, 3.3, 0);
// the sky, far above, and its stars
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 512;
skyCanvas.height = 256;
(function () {
  const g = skyCanvas.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#0b0d1f');
  gr.addColorStop(0.7, '#1b2140');
  gr.addColorStop(1, '#3a2e3e');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 256);
})();
const skyTex = new THREE.CanvasTexture(skyCanvas);
const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: skyTex, color: 0xffffff }));
sky.rotation.x = Math.PI / 2;
sky.position.set(0.6, 5.2, 0);
scene.add(sky);
{
  const n = 260;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd(-6, 6);
    pos[i * 3 + 1] = 5.15;
    pos[i * 3 + 2] = rnd(-3, 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf0eee6, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
}
const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), mGlass);
glass.rotation.x = Math.PI / 2;
glass.position.set(0.9, 3.2, 0);
scene.add(glass);

// the bench
box(6.0, 0.24, 1.6, mWood, 0, -0.12, 0);
box(5.6, 0.12, 1.2, mWood, 0, -0.36, 0);
// shelf on the back wall, with the big booster on it
box(1.5, 0.08, 0.6, mWood, -2.8, 1.2, -1.2);
const booster = new THREE.Group();
(function () {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 28), mMetal);
  add(body, booster);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 28), mClay);
  band.position.y = 0.1;
  add(band, booster);
  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 28), mClay);
  band2.position.y = -0.2;
  add(band2, booster);
})();
booster.position.set(-2.8, 1.2 + 0.04 + 0.35, -1.2);
scene.add(booster);
// cans and boxes on the shelf and bench
const can = (x, y, z, r, h) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mMetal);
  m.position.set(x, y + h / 2, z);
  return add(m);
};
can(-3.25, 1.24, -1.2, 0.12, 0.3);
can(-2.5, 1.24, -1.2, 0.1, 0.22);
box(0.42, 0.3, 0.36, mCard, -2.1, 0.12, -0.2);
box(0.36, 0.22, 0.3, mCard, -3.0, 0.08, 0.5);
const tapeRoll = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 14, 28), mTape);
tapeRoll.rotation.x = Math.PI / 2;
tapeRoll.position.set(-1.6, 0.17, 0.65);
add(tapeRoll);
// desk lamp
(function () {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 24), mInk);
  base.position.set(2.5, 0.025, 0.5);
  add(base);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 12), mInk);
  arm.position.set(2.4, 0.55, 0.5);
  arm.rotation.z = 0.25;
  add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 28, 1, true), mClay);
  shade.position.set(2.27, 1.15, 0.5);
  shade.rotation.z = 0.25;
  shade.material = new THREE.MeshStandardMaterial({ color: 0xd97757, side: THREE.DoubleSide, roughness: 0.8 });
  add(shade);
})();

// the ceiling beams cast the moonlight shadows, so they are above
// (they were added above with box(); the glass sits in the opening)

/* ---------- Clawd ---------- */
const clawd = new THREE.Group(); // root: stands on the bench at (CLAWD_X, 0, 0)
const CLAWD_X0 = -0.8;
clawd.position.set(CLAWD_X0, 0, 0);
scene.add(clawd);
const squashG = new THREE.Group(); // scales about the feet
clawd.add(squashG);
const bodyG = new THREE.Group();
squashG.add(bodyG);

const bodyMesh = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.0, 1.0, 7, 0.22), mClay);
bodyMesh.position.y = 0.35 + 0.5;
add(bodyMesh, bodyG);
const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.42, 20);
[-0.55, -0.18, 0.18, 0.55].forEach((x) => {
  const leg = new THREE.Mesh(legGeo, mClay);
  leg.position.set(x, 0.19, 0.0);
  add(leg, squashG);
});
// arm nubs
function arm(x, side) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0.86, 0);
  squashG.add(pivot);
  const nub = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 16), mClay);
  nub.position.set(side * 0.12, 0, 0);
  nub.rotation.z = side * Math.PI / 2;
  add(nub, pivot);
  return pivot;
}
const armL = arm(-0.8, -1);
const armR = arm(0.8, 1);
// eyes: two tall slit eyes on the front face
const eyeGroup = new THREE.Group();
eyeGroup.position.set(0, 0.85, 0.5);
squashG.add(eyeGroup);
const eyeGeo = new THREE.SphereGeometry(1, 20, 14);
const eyeL = new THREE.Mesh(eyeGeo, mInk);
eyeL.scale.set(0.065, 0.2, 0.04);
eyeL.position.set(-0.3, 0, 0.01);
const eyeR = eyeL.clone();
eyeR.position.set(0.3, 0, 0.01);
eyeGroup.add(eyeL, eyeR);

/* ---------- the rocket (built on the bench, then launched) ---------- */
const ROCKET_X = 0.9;
const rocket = new THREE.Group(); // origin at the base, on the bench
rocket.position.set(ROCKET_X, 0, 0);
scene.add(rocket);
const rocketTilt = new THREE.Group(); // tips over about the base
rocket.add(rocketTilt);
const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 28), mMetal);
tube.position.y = 0.5;
add(tube, rocketTilt);
const tubeBand = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.16, 28), mClay);
tubeBand.position.y = 0.66;
add(tubeBand, rocketTilt);
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 28), mCream);
nose.position.y = 1.22 + 0.225;
add(nose, rocketTilt);
const window_ = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), mInk);
window_.position.set(0, 0.8, 0.202);
rocketTilt.add(window_);
const fins = new THREE.Group();
rocketTilt.add(fins);
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * TAU;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.3), mClay);
  fin.position.set(Math.sin(a) * 0.23, 0.21, Math.cos(a) * 0.23);
  fin.rotation.y = a;
  add(fin, fins);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.02), mTape);
  tape.position.set(Math.sin(a) * 0.205, 0.3, Math.cos(a) * 0.205);
  tape.rotation.y = a;
  add(tape, fins, false);
}
const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), mWick);
fuse.rotation.x = Math.PI / 2;
fuse.position.set(0, 0.1, 0.34);
add(fuse, rocketTilt);
const fuseTip = new THREE.Object3D();
fuseTip.position.set(0, 0.1, 0.5);
rocketTilt.add(fuseTip);
// the booster lives in the rocket group once it arrives; before that it is in the scene
booster.userData.home = 'shelf';

/* ---------- sparks, fireworks, shards ---------- */
const SPARKS = 180;
const sparkPos = new Float32Array(SPARKS * 3);
const sparkCol = new Float32Array(SPARKS * 3);
const sparkVel = new Float32Array(SPARKS * 3);
for (let i = 0; i < SPARKS; i++) {
  const a = rnd(0, TAU), s = rnd(0.25, 1.0);
  sparkVel[i * 3] = Math.cos(a) * s * 0.9;
  sparkVel[i * 3 + 1] = rnd(0.4, 1.6);
  sparkVel[i * 3 + 2] = Math.sin(a) * s * 0.6;
}
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.06, map: dotTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
sparks.frustumCulled = false; // bounds are set once from the first frame, so turn culling off
scene.add(sparks);

const PER = 140;
const fwPos = new Float32Array(bursts.length * PER * 3);
const fwCol = new Float32Array(bursts.length * PER * 3);
const fwDir = [];
bursts.forEach((b, bi) => {
  for (let k = 0; k < PER; k++) {
    // seeded directions on a sphere
    const u = rnd(-1, 1), a = rnd(0, TAU), r = Math.sqrt(1 - u * u);
    fwDir.push([r * Math.cos(a) * rnd(0.6, 1.0), u * rnd(0.6, 1.0), r * Math.sin(a) * rnd(0.6, 1.0), rnd(0.8, 1.2)]);
  }
});
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3));
fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.11, map: dotTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
fireworks.frustumCulled = false;
scene.add(fireworks);

const shards = [];
for (let i = 0; i < 16; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.012), mShard);
  scene.add(m);
  shards.push({ m, sx: rnd(-0.7, 1.6) + 0.9 - 0.9, sz: rnd(-0.9, 0.9), vx: rnd(-0.6, 0.6), vy: rnd(-0.4, 0.2), vz: rnd(-0.5, 0.5), rx: rnd(-4, 4), rz: rnd(-4, 4) });
}

/* ---------- camera ---------- */
// [t0, t1, pos0, pos1, look0, look1, easeFn]
const CAM = [
  [0, 2.0, [-0.6, 1.1, 4.1], [-0.5, 1.05, 3.9], [-0.8, 0.7, 0], [-0.8, 0.7, 0], M.inOutCubic],
  [2.0, 6.0, [-0.5, 1.05, 3.9], [0.0, 1.0, 3.4], [-0.8, 0.7, 0], [0.0, 0.6, 0], M.inOutCubic],
  [6.0, 8.0, [-0.1, 1.0, 3.4], [-0.1, 0.9, 3.2], [-0.2, 0.6, 0], [-0.2, 0.55, 0], M.inOutCubic],
  [8.0, 10.0, [-0.1, 0.9, 3.2], [-0.1, 1.0, 3.2], [-0.2, 0.55, 0], [-0.2, 0.6, 0], M.inOutCubic],
  [10.0, 11.5, [-0.1, 1.0, 3.2], [-0.5, 1.0, 3.5], [-0.2, 0.6, 0], [-0.9, 0.8, 0], M.inOutCubic],
  [11.5, 11.95, [-0.5, 1.0, 3.5], [-1.2, 1.3, 2.9], [-0.9, 0.8, 0], [-2.8, 1.5, -1.1], M.outExpo],
  [11.95, 12.25, [-1.2, 1.3, 2.9], [0.1, 0.95, 3.2], [-2.8, 1.5, -1.1], [0.5, 0.7, 0], M.outExpo],
  [12.25, 14.0, [0.1, 0.95, 3.2], [0.1, 1.0, 3.1], [0.5, 0.7, 0], [0.5, 0.8, 0], M.inOutCubic],
  [14.0, 16.0, [0.1, 1.0, 3.1], [0.2, 0.9, 2.9], [0.5, 0.8, 0], [0.6, 1.0, 0], M.inOutCubic],
  [16.0, 18.0, [0.2, 0.9, 2.9], [0.5, 1.2, 3.0], [0.6, 1.0, 0], [0.9, 3.4, 0], M.inOutCubic],
  [18.0, 20.0, [0.5, 1.2, 3.0], [-0.3, 1.6, 5.2], [0.9, 3.4, 0], [0.5, 2.6, 0], M.inOutCubic],
  [20.0, 22.0, [-0.3, 1.6, 5.2], [-0.8, 0.95, 3.5], [0.5, 2.6, 0], [-0.8, 0.85, 0], M.inOutCubic],
];
function camAt(t) {
  let seg = CAM[CAM.length - 1];
  for (const s of CAM) if (t <= s[1]) { seg = s; break; }
  const [t0, t1, p0, p1, l0, l1, e] = seg;
  const p = e(M.clamp((t - t0) / (t1 - t0), 0, 1));
  const pos = p0.map((v, i) => M.lerp(v, p1[i], p));
  const look = l0.map((v, i) => M.lerp(v, l1[i], p));
  // a little handheld drift, seeded by time, so the camera is never still
  pos[0] += 0.012 * Math.sin(t * 0.9) + 0.006 * Math.sin(t * 2.3);
  pos[1] += 0.008 * Math.sin(t * 1.1);
  // the tip-over shake
  if (t > 8.5 && t < 9.1) {
    const k = Math.exp(-(t - 8.5) * 9) * 0.05;
    pos[0] += Math.sin(t * 70) * k;
    pos[1] += Math.cos(t * 63) * k;
  }
  // the lift-off judder
  if (t > 16.0 && t < 16.6) {
    const k = Math.exp(-(t - 16.0) * 4) * 0.03;
    pos[0] += Math.sin(t * 80) * k;
  }
  return { pos, look };
}

/* ---------- Clawd's acting ---------- */
// Eyes lead: gaze targets are offsets on the face. Body and posture follow.
function clawdPose(t) {
  const p = {
    x: CLAWD_X0,
    jump: 0,
    sx: 1, sy: 1, sz: 1,
    tiltX: 0,
    armL: 0.25, armR: -0.25,
    eyeY: 1, eyeX: 0, lookY: 0, lookX: 0,
    droop: 0,
  };
  // breathing
  const breath = Math.sin(t * 2.2) * 0.008;
  p.sy += breath;
  p.sx -= breath * 0.5;
  // shot 1: eyes shut, open on 1.0 with a little overshoot
  p.eyeY = track(t, [[0, 0.02], [0.9, 0.02], [1.15, 1.2, M.outBack], [1.45, 1]]);
  // shot 2: lift the can (arm up), set it down with a clank on 2.5
  p.armR = track(t, [[1.8, -0.25], [2.0, -2.4, M.outBack], [2.5, -2.4], [2.9, -0.25, M.inOutCubic]]);
  const clank = t > 2.5 && t < 2.8 ? Math.exp(-(t - 2.5) * 9) : 0;
  p.sy -= 0.07 * clank; p.sx += 0.07 * clank;
  // the tube set in with a clunk on 3.0, the nose on 3.5, the tape on 4.0 (busy hands)
  const clunk3 = t > 3.0 && t < 3.3 ? Math.exp(-(t - 3.0) * 8) : 0;
  p.sy -= 0.05 * clunk3;
  p.sx += 0.05 * clunk3;
  const taping = t > 4.0 && t < 4.5 ? Math.sin((t - 4.0) * 40) * 0.5 : 0;
  p.armL = track(t, [[3.6, 0.25], [4.0, -0.5 + taping, M.inOutCubic], [4.5, 0.25, M.inOutCubic]]);
  // step back and look up at the rocket on 4.5 (eyes lead)
  p.eyeX = track(t, [[4.4, 0], [4.9, 0.05], [6.0, 0]]);
  p.lookY = track(t, [[4.4, 0], [4.9, 0.05], [6.0, 0]]);
  // shot 3: lean in, match up on 6.0, the spark on 6.5
  p.tiltX = track(t, [[5.8, 0], [6.1, 0.12, M.outBack], [6.8, 0.12], [7.3, 0.05, M.inOutCubic]]);
  p.armR = t > 5.8 && t < 6.7 ? track(t, [[5.8, p.armR], [6.1, -2.1, M.outBack], [6.6, -2.1], [6.8, -0.25, M.inOutCubic]]) : p.armR;
  p.lookY = track(t, [[5.9, 0.05], [6.2, -0.1], [7.8, -0.1], [8.3, 0.06]]);
  p.eyeY = track(t, [[6.2, 1], [6.5, 1.25, M.outBack], [7.7, 1.2], [8.0, 0.8]]);
  // shot 4: the fizzle (8.0). The rocket tips (8.5). Clawd slumps (9.0).
  const slump = track(t, [[8.4, 0], [9.0, 1, M.outBack], [10.0, 1]]);
  p.tiltX = M.lerp(p.tiltX, -0.14, slump);
  p.sy -= 0.16 * slump; p.sx += 0.1 * slump; p.sz += 0.05 * slump;
  p.armL = M.lerp(p.armL, 0.7, slump);
  p.armR = M.lerp(p.armR, -0.7, slump);
  p.eyeY = M.lerp(p.eyeY, 0.5, slump);
  p.lookY = M.lerp(p.lookY, -0.12, slump);
  // shot 5: the idea. Eyes widen and lead toward the shelf (up-left). Pop up.
  const idea = track(t, [[9.9, 0], [10.0, 1, M.outBack], [10.9, 1], [11.0, 0]]);
  p.eyeY = M.lerp(p.eyeY, 1.3, idea);
  p.lookX = M.lerp(0, -0.09, idea);
  p.lookY = M.lerp(p.lookY, 0.07, idea);
  p.tiltX = M.lerp(p.tiltX, 0.0, idea);
  // the pop: anticipation squash, jump, land squash, recovery
  const ax = track(t, [[10.2, 0], [10.4, 1, M.inOutCubic], [10.85, 1], [11.05, 0, M.outBack]]);
  p.sy -= 0.18 * ax; p.sx += 0.12 * ax;
  const jt = M.clamp((t - 10.4) / 0.5, 0, 1);
  if (t >= 10.4 && t <= 10.9) p.jump = 0.4 * 4 * jt * (1 - jt);
  if (t > 10.9 && t < 11.1) {
    const k = Math.exp(-(t - 10.9) * 14);
    p.sy -= 0.15 * k; p.sx += 0.15 * k;
  }
  // shot 6: booster thump on 12.0 (shake), tape wraps 12.5, 13.0, 13.4 (flick the arm on each rip)
  const thump = t > 12.0 && t < 12.3 ? Math.exp(-(t - 12.0) * 10) : 0;
  p.sy -= 0.08 * thump; p.sx += 0.08 * thump;
  [12.5, 13.0, 13.4].forEach((r) => {
    if (t > r && t < r + 0.2) p.armL = M.lerp(p.armL, -1.4, Math.exp(-(t - r) * 9));
  });
  p.armL = track(t, [[11.8, p.armL], [12.1, 0.3, M.outBack], [13.5, p.armL]]);
  // stand the rocket up: arms up in a cheer on 13.5
  const cheer = track(t, [[13.5, 0], [13.9, 1, M.outBack], [14.6, 1], [15.0, 0, M.inOutCubic]]);
  p.armL = M.lerp(p.armL, -2.5, cheer);
  p.armR = M.lerp(p.armR, 2.5, cheer);
  p.eyeY = M.lerp(p.eyeY, 1.15, cheer);
  p.lookY = M.lerp(p.lookY, 0.08, cheer);
  // shot 7: relight. Lean in (14.3), eyes on the fuse, step back on 15.5.
  const lean = track(t, [[14.2, 0], [14.5, 1, M.outBack], [15.2, 1], [15.6, 0, M.inOutCubic]]);
  p.tiltX = M.lerp(p.tiltX, 0.12, lean);
  p.lookY = M.lerp(p.lookY, -0.15, lean);
  p.x = track(t, [[15.4, CLAWD_X0], [15.55, CLAWD_X0 - 0.12, M.anticipate], [15.9, CLAWD_X0 - 0.5, M.outBack], [17.0, CLAWD_X0 - 0.5]]);
  // shot 8: the launch on 16.0 (startled, eyes wide), then stare up
  const startle = t > 16.0 ? Math.exp(-(t - 16.0) * 3) : 0;
  p.eyeY = M.lerp(p.eyeY, 1.35, Math.max(startle, track(t, [[16.0, 0], [16.1, 1]])));
  p.tiltX = M.lerp(p.tiltX, -0.3, track(t, [[16.0, 0], [16.6, 1, M.outBack]]));
  p.sy -= 0.12 * startle; p.sx += 0.06 * startle;
  p.lookY = M.lerp(p.lookY, 0.22, track(t, [[16.2, 0], [17.0, 1]]));
  p.armL = M.lerp(p.armL, -2.2, track(t, [[16.0, 0], [16.5, 1, M.outBack]]));
  p.armR = M.lerp(p.armR, 2.2, track(t, [[16.0, 0], [16.5, 1, M.outBack]]));
  // shot 9: the bursts light the room. Clawd keeps looking up, a small flinch each burst.
  bursts.forEach((b) => {
    const k = t > b.tb && t < b.tb + 0.25 ? Math.exp(-(t - b.tb) * 14) : 0;
    p.sy -= 0.05 * k; p.sx += 0.05 * k;
    p.eyeY = M.lerp(p.eyeY, 1.4, k);
  });
  p.lookY = M.lerp(p.lookY, 0.24, track(t, [[18.0, 0], [18.6, 1]]));
  // shot 10: back home (19.0 to 20.0), look up at the sky, eyes settle
  p.x = track(t, [[18.9, CLAWD_X0 - 0.5], [19.9, CLAWD_X0, M.inOutCubic], [22.0, CLAWD_X0]]);
  p.tiltX = M.lerp(p.tiltX, -0.4, track(t, [[19.5, 0], [20.5, 1, M.inOutCubic]]));
  p.lookY = M.lerp(p.lookY, 0.3, track(t, [[19.5, 0], [20.5, 1, M.inOutCubic]]));
  p.eyeY = M.lerp(p.eyeY, 1.0, track(t, [[19.7, 0], [20.5, 1]]));
  p.armL = M.lerp(p.armL, 0.25, track(t, [[19.5, 0], [20.4, 1, M.inOutCubic]]));
  p.armR = M.lerp(p.armR, -0.25, track(t, [[19.5, 0], [20.4, 1, M.inOutCubic]]));
  // blinks, a few, seeded in time
  const blink = [2.5, 7.4, 13.1, 21.3].reduce((acc, bt) => acc + (Math.abs(t - bt) < 0.07 ? 1 : 0), 0);
  p.eyeY *= blink ? 0.12 : 1;
  return p;
}

/* ---------- the rocket's motion ---------- */
function rocketPose(t) {
  // parts fall into place (the tube at 3.0, the nose at 3.5), fins scale in on 4.0
  const tubeY = fall(t, 3.0, 2.8, 0.5, 0.26);
  const noseY = fall(t, 3.5, 3.2, 1.445, 0.24);
  const finS = t < 4.0 ? 0.001 : M.outBack(M.clamp((t - 4.0) / 0.35, 0, 1), 2.2);
  // tipping over: fall on 8.5, stood up on 13.6
  const tilt = track(t, [[8.0, 0], [8.5, -1.57, (p) => M.outCubic(p)], [9.0, -1.57], [13.2, -1.57], [13.6, 0, M.outBack]]);
  // launch: a shake from 16.0, then accelerate upward
  const shake = t > 16.0 && t < 16.3 ? Math.sin((t - 16.0) * 90) * 0.02 * Math.exp(-(t - 16.0) * 5) : 0;
  const lift = t < 16.3 ? 0 : 6.9 * (t - 16.3) * (t - 16.3);
  const sway = track(t, [[16.3, 0], [17.4, 0.05]]);
  return { tubeY, noseY, finS, tilt, shake, lift, sway };
}

/* ---------- draw ---------- */
const eyeScratch = new THREE.Vector3();
function draw(t) {
  // lighting that moves: the lamp flickers, the moon drifts, the bursts flash
  lamp.intensity = 7 * (1 + 0.03 * Math.sin(t * 31) + 0.02 * Math.sin(t * 57));
  moon.position.set(-1.6 + 0.1 * Math.sin(t * 0.4), 8.5, 2.4);
  // Clawd
  const cp = clawdPose(t);
  clawd.position.set(cp.x, cp.jump, 0);
  squashG.scale.set(cp.sx, cp.sy, cp.sz);
  squashG.rotation.x = cp.tiltX;
  armL.rotation.z = cp.armL;
  armR.rotation.z = cp.armR;
  eyeGroup.position.set(0, 0.85 + cp.lookY * 0.18, 0.5);
  eyeGroup.position.x = cp.lookX * 0.12;
  eyeL.scale.set(0.065, 0.2 * cp.eyeY, 0.04);
  eyeR.scale.set(0.065, 0.2 * cp.eyeY, 0.04);
  // rocket
  const rp = rocketPose(t);
  rocket.position.set(ROCKET_X + rp.shake, rp.lift, 0);
  rocketTilt.rotation.z = rp.tilt + rp.sway;
  tube.visible = t >= 3.0;
  tube.position.y = rp.tubeY;
  tubeBand.position.y = 0.66 + (rp.tubeY - 0.5);
  window_.position.y = 0.8 + (rp.tubeY - 0.5);
  nose.visible = t >= 3.5;
  nose.position.y = rp.noseY;
  fins.visible = t >= 4.0;
  fins.scale.set(rp.finS, rp.finS, rp.finS);
  fuse.visible = t >= 3.0;
  // the booster: on the shelf, then dragged over, then fitted under the tube
  const boosterStart = new THREE.Vector3(-2.8, 1.2 + 0.04 + 0.35, -1.2);
  const boosterEnd = new THREE.Vector3(0.0, 0.25, 0.0); // local to the rocket
  if (t < 11.9) {
    if (booster.parent !== scene) scene.add(booster);
    booster.position.copy(boosterStart);
    booster.visible = true;
  } else {
    const onBench = track(t, [[11.9, 0], [12.5, 1, M.inOutCubic]]);
    rocket.updateMatrixWorld(true);
    // world position along the drag, through the bench
    const worldFrom = boosterStart.clone();
    const worldTo = new THREE.Vector3(ROCKET_X, 0.25, 0);
    const mid = worldFrom.clone().lerp(worldTo, onBench);
    mid.y += Math.sin(onBench * Math.PI) * 0.6;
    if (t < 12.5) {
      if (booster.parent !== scene) scene.add(booster);
      booster.position.copy(mid);
      booster.visible = true;
    } else {
      // attached: sits in the rocket's frame, so it tips and lifts with it
      if (booster.parent !== rocketTilt) rocketTilt.add(booster);
      booster.position.copy(boosterEnd);
      booster.visible = true;
    }
  }
  if (t >= 12.5 && booster.parent === rocketTilt) booster.position.set(0, 0.25, 0);
  // spark origin from the rocket's fuse tip, in world space
  rocket.updateMatrixWorld(true);
  const tipW = fuseTip.getWorldPosition(new THREE.Vector3());
  // sparks
  for (let i = 0; i < SPARKS; i++) {
    const birth = i / SPARKS;
    // windows: [6.5, 8.0] and [14.5, 15.9]; births spread through the window
    let age = -1;
    const w0 = 6.5, w1 = 8.0, w2 = 14.5, w3 = 15.9;
    if (t >= w0) {
      const b = w0 + birth * (w1 - w0);
      if (t >= b && t - b < 0.45) age = t - b;
    }
    if (age < 0 && t >= w2) {
      const b = w2 + birth * (w3 - w2);
      if (t >= b && t - b < 0.45) age = t - b;
    }
    if (age < 0) {
      sparkPos[i * 3 + 1] = -99;
      continue;
    }
    const k = 1 - age / 0.45;
    sparkPos[i * 3] = tipW.x + sparkVel[i * 3] * age;
    sparkPos[i * 3 + 1] = tipW.y + sparkVel[i * 3 + 1] * age - 1.8 * age * age;
    sparkPos[i * 3 + 2] = tipW.z + sparkVel[i * 3 + 2] * age;
    sparkCol[i * 3] = 1.0 * k;
    sparkCol[i * 3 + 1] = (0.6 + 0.35 * birth) * k;
    sparkCol[i * 3 + 2] = 0.25 * k;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
  // fireworks
  bursts.forEach((b, bi) => {
    const tau = t - b.tb;
    const base = bi * PER;
    for (let k = 0; k < PER; k++) {
      const i = (base + k) * 3;
      if (tau < 0 || tau > 2.2) {
        fwPos[i + 1] = -99;
        fwCol[i] = fwCol[i + 1] = fwCol[i + 2] = 0;
        continue;
      }
      const d = fwDir[base + k];
      const sp = 1.1 * d[3];
      const drag = 1 - Math.exp(-2.4 * tau);
      const grav = -0.45 * tau * tau;
      fwPos[i] = b.c[0] + d[0] * sp * drag * 0.4;
      fwPos[i + 1] = b.c[1] + d[1] * sp * drag * 0.4 + grav;
      fwPos[i + 2] = b.c[2] + d[2] * sp * drag * 0.4;
      const life = Math.max(0, 1 - tau / 2.0);
      const c = new THREE.Color(b.col);
      fwCol[i] = c.r * life;
      fwCol[i + 1] = c.g * life;
      fwCol[i + 2] = c.b * life;
    }
    const flash = tau > 0 && tau < 1.5 ? 9 * Math.exp(-tau * 3.2) : 0;
    burstLights[bi].intensity = flash;
  });
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.color.needsUpdate = true;
  // glass: the skylight breaks on 17.0, shards fall into the room
  const broken = t >= 17.0;
  glass.visible = !broken;
  shards.forEach((s, i) => {
    const d = t - 17.0;
    if (!broken || d < 0) {
      s.m.visible = false;
      return;
    }
    s.m.visible = true;
    const x = 0.9 + s.sx * 0.9 + s.vx * d;
    const y = 3.2 + s.vy * d - 2.2 * d * d;
    const z = s.sz * 0.9 + s.vz * d;
    s.m.position.set(x, Math.max(y, -0.2), z);
    s.m.rotation.set(s.rx * d, 0, s.rz * d);
  });
  // camera
  const cam = camAt(t);
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  renderer.render(scene, camera);
}

// The timeline in index.html calls this on every seek.
window.drawClawd = draw;
draw(0);
