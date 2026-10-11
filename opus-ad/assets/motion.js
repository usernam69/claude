// Shared motion helpers. Everything is a pure function of time t.
(function () {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {};
  ['power1', 'power2', 'power3', 'power4', 'expo', 'sine', 'circ', 'back', 'elastic'].forEach((n) => {
    ['in', 'out', 'inOut'].forEach((m) => { E[n + '.' + m] = gsap.parseEase(n + '.' + m); });
  });
  E['back.out2'] = gsap.parseEase('back.out(2.2)');
  E['back.in2'] = gsap.parseEase('back.in(2.2)');
  E['elastic.soft'] = gsap.parseEase('elastic.out(1, 0.55)');
  E.none = (p) => p;
  const ease = (name, p) => (E[name] || E['power3.out'])(clamp(p));
  // eased progress between a and b
  const ep = (t, a, b, name = 'power3.out') => ease(name, prog(t, a, b));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth deterministic noise (sum of sines) for idle drift
  const drift = (t, seed = 0, f = 1) => Math.sin(t * 1.3 * f + seed * 12.9898) * 0.6 + Math.sin(t * 2.7 * f + seed * 78.233) * 0.3 + Math.sin(t * 5.1 * f + seed * 3.17) * 0.1;
  // split element text into per-character spans (keeps spaces)
  function splitChars(el) {
    const text = el.textContent; el.textContent = '';
    return [...text].map((ch) => {
      const s = document.createElement('span'); s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); return s;
    });
  }
  // standard in/out animation for a set of character spans
  function charsInOut(chars, t, tIn, tOut, o = {}) {
    const { stagger = 0.03, dur = 0.5, dy = 60, blur = 14, easeIn = 'back.out', outDur = 0.3, outStagger = 0.012, dyOut = -40, rot = 0, scaleFrom = 1 } = o;
    chars.forEach((c, i) => {
      const pin = ep(t, tIn + i * stagger, tIn + i * stagger + dur, easeIn);
      const praw = prog(t, tIn + i * stagger, tIn + i * stagger + dur);
      const pout = tOut == null ? 0 : ep(t, tOut + i * outStagger, tOut + i * outStagger + outDur, 'power3.in');
      const op = clamp(praw * 2.5) * (1 - pout);
      const y = (1 - pin) * dy + pout * dyOut;
      const b = (1 - clamp(praw * 1.6)) * blur + pout * blur;
      const sc = lerp(scaleFrom, 1, pin);
      c.style.opacity = op.toFixed(4);
      c.style.transform = `translateY(${y.toFixed(2)}px) rotate(${((1 - pin) * rot).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      c.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
    });
  }
  window.M = { clamp, lerp, prog, ease, ep, mulberry32, drift, splitChars, charsInOut };
})();
