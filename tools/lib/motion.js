/* Motion helpers. Every function is pure: the value depends only on its inputs,
 * so a frame at time t is always the same picture. Randomness comes from rng(seed). */
(function (g) {
  'use strict';
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  // Eases. "out" eases have a soft landing, "back" eases overshoot.
  const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t, 0, 1)));
  const outCubic = (t) => {
    t = clamp(t, 0, 1) - 1;
    return t * t * t + 1;
  };
  const inOutCubic = (t) => {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  const outBack = (t, s) => {
    s = s == null ? 1.70158 : s;
    t = clamp(t, 0, 1) - 1;
    return 1 + (s + 1) * t * t * t + s * t * t;
  };
  // Anticipation: dips below 0 first, then goes to 1 with overshoot.
  const anticipate = (t) => {
    t = clamp(t, 0, 1);
    const s = 1.70158 * 1.525;
    return t * t * ((s + 1) * t - s);
  };
  // Damped spring step response (0 -> 1), starting at 0 for t <= 0.
  const spring = (t, zeta, w) => {
    if (t <= 0) return 0;
    zeta = zeta == null ? 0.42 : zeta;
    w = w == null ? 14 : w;
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  };
  // Seeded PRNG (mulberry32). rng(seed)() -> [0,1)
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Window helper: 0 before a, 1 after b, eased in between.
  const window_ = (t, a, b, ease) => {
    const p = clamp((t - a) / (b - a), 0, 1);
    return ease ? ease(p) : p;
  };
  g.Motion = { clamp, lerp, smooth, outExpo, outCubic, inOutCubic, outBack, anticipate, spring, rng, window: window_ };
})(typeof window !== 'undefined' ? window : globalThis);
