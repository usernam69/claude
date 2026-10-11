/* Web Audio synth engine for the four pieces. Browser only: it runs inside an
 * OfflineAudioContext (see render-audio.mjs). Every random choice comes from a
 * seeded PRNG, so a render is repeatable byte for byte.
 *
 * Signal flow:  voices -> bus (drums | bass | chords | lead | vox | fx | sub)
 *               bass/chords/lead go through a sidechain "duck" gain
 *               -> master -> glue compressor -> destination
 *               sends: one convolution reverb, one feedback delay.
 */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const EPS = 0.0001;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Vowel formants (Hz) and bandwidths (Hz) for the formant voice.
  const VOWELS = {
    a: { f: [800, 1150, 2900], q: [6, 7, 9], g: [1.0, 0.55, 0.22] },
    e: { f: [480, 1800, 2600], q: [6, 8, 9], g: [1.0, 0.6, 0.25] },
    i: { f: [330, 2300, 3050], q: [6, 9, 10], g: [1.0, 0.45, 0.2] },
    o: { f: [480, 900, 2600], q: [6, 7, 9], g: [1.0, 0.5, 0.2] },
    u: { f: [330, 800, 2400], q: [6, 7, 9], g: [1.0, 0.4, 0.15] },
    m: { f: [260, 1100, 2300], q: [5, 6, 8], g: [1.0, 0.25, 0.1] }, // nasal hum
  };

  function createSynth(ctx, opts) {
    opts = opts || {};
    const R = mulberry32(opts.seed || 1);
    const SR = ctx.sampleRate;
    const rnd = (a, b) => a + (b - a) * R();

    /* ---------- noise sources ---------- */
    function makeNoise(seconds, kind) {
      const n = Math.floor(seconds * SR);
      const buf = ctx.createBuffer(1, n, SR);
      const d = buf.getChannelData(0);
      const r = mulberry32((opts.seed || 1) * 31 + (kind === 'pink' ? 7 : 3));
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = r() * 2 - 1;
        if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          d[i] = w;
        }
      }
      return buf;
    }
    const WHITE = makeNoise(4, 'white');
    const PINK = makeNoise(4, 'pink');

    /* ---------- output chain ---------- */
    const master = ctx.createGain();
    master.gain.value = opts.master == null ? 0.9 : opts.master;
    // master -> level (score-automated section gain) -> fade (end fade) -> glue -> out
    const level = ctx.createGain();
    level.gain.value = 1;
    const fadeN = ctx.createGain();
    fadeN.gain.value = 1;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = opts.glueThreshold == null ? -6 : opts.glueThreshold;
    glue.knee.value = 8;
    glue.ratio.value = 1.6;
    glue.attack.value = 0.012;
    glue.release.value = 0.25;
    master.connect(level);
    level.connect(fadeN);
    fadeN.connect(glue);
    glue.connect(ctx.destination);

    const duck = ctx.createGain();
    duck.gain.value = 1;
    duck.connect(master);

    const BUS = {};
    ['drums', 'sub', 'fx'].forEach((n) => {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(master);
      BUS[n] = g;
    });
    ['bass', 'chords', 'lead', 'vox'].forEach((n) => {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(duck);
      BUS[n] = g;
    });
    BUS.vox.gain.value = 1;

    /* ---------- reverb send ---------- */
    function makeIR(seconds, rt60) {
      const n = Math.floor(seconds * SR);
      const ir = ctx.createBuffer(2, n, SR);
      const k = 6.91 / rt60;
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        const r = mulberry32((opts.seed || 1) * 97 + ch * 13 + 5);
        let y = 0;
        for (let i = 0; i < n; i++) {
          const t = i / SR;
          const x = (r() * 2 - 1) * Math.exp(-k * t);
          const a = 0.18 + 0.82 * Math.exp(-t * 1.6); // darken as it decays
          y += (x - y) * a;
          d[i] = y * (t < 0.012 ? t / 0.012 : 1);
        }
      }
      return ir;
    }
    const revIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.normalize = true;
    conv.buffer = makeIR(opts.reverbSeconds || 4.2, opts.rt60 || 3.2);
    const revOut = ctx.createGain();
    revOut.gain.value = opts.reverbWet == null ? 0.32 : opts.reverbWet;
    revIn.connect(conv);
    conv.connect(revOut);
    revOut.connect(master);

    /* ---------- delay send (feedback, dark) ---------- */
    const dlIn = ctx.createGain();
    const dl = ctx.createDelay(2.5);
    dl.delayTime.value = opts.delayTime || 0.375;
    const dlFb = ctx.createGain();
    dlFb.gain.value = opts.delayFeedback == null ? 0.36 : opts.delayFeedback;
    const dlTone = ctx.createBiquadFilter();
    dlTone.type = 'lowpass';
    dlTone.frequency.value = 2600;
    const dlOut = ctx.createGain();
    dlOut.gain.value = opts.delayWet == null ? 0.3 : opts.delayWet;
    dlIn.connect(dl);
    dl.connect(dlTone);
    dlTone.connect(dlFb);
    dlFb.connect(dl);
    dlTone.connect(dlOut);
    dlOut.connect(master);

    /* ---------- routing ---------- */
    // route(node, {bus, pan, rev, dly}) — pans, sends and connects to a bus.
    function route(node, o) {
      o = o || {};
      const pan = ctx.createStereoPanner();
      pan.pan.value = o.pan || 0;
      node.connect(pan);
      pan.connect(BUS[o.bus || 'fx']);
      if (o.rev) {
        const s = ctx.createGain();
        s.gain.value = o.rev;
        pan.connect(s);
        s.connect(revIn);
      }
      if (o.dly) {
        const s = ctx.createGain();
        s.gain.value = o.dly;
        pan.connect(s);
        s.connect(dlIn);
      }
      return pan;
    }

    // ADSR on a gain param. Returns the time the note is fully released.
    function adsr(param, t, o) {
      o = o || {};
      const peak = o.peak == null ? 1 : o.peak;
      const a = o.a == null ? 0.005 : o.a;
      const d = o.d == null ? 0.1 : o.d;
      const s = Math.max(EPS, (o.s == null ? 0.7 : o.s) * peak);
      const hold = o.hold == null ? 0.2 : o.hold;
      const r = o.r == null ? 0.1 : o.r;
      param.setValueAtTime(EPS, t);
      param.exponentialRampToValueAtTime(peak, t + a);
      param.exponentialRampToValueAtTime(s, t + a + d);
      param.setValueAtTime(s, t + Math.max(hold, a + d));
      param.exponentialRampToValueAtTime(EPS, t + Math.max(hold, a + d) + r);
      return t + Math.max(hold, a + d) + r;
    }

    function noiseSrc(t, dur, o) {
      o = o || {};
      const src = ctx.createBufferSource();
      src.buffer = o.pink ? PINK : WHITE;
      src.loop = true;
      const off = o.offset == null ? rnd(0, 3.5) : o.offset;
      src.start(t, off);
      src.stop(t + dur + 0.1);
      return src;
    }

    /* ---------- drums ---------- */
    function kick(t, o) {
      o = o || {};
      const vel = o.vel == null ? 1 : o.vel;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(o.f0 || 165, t);
      osc.frequency.exponentialRampToValueAtTime(o.f1 || 44, t + (o.sweep || 0.05));
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel, t);
      g.gain.exponentialRampToValueAtTime(EPS, t + (o.dec || 0.42));
      osc.connect(g);
      route(g, { bus: o.bus || 'drums', rev: o.rev || 0 });
      osc.start(t);
      osc.stop(t + (o.dec || 0.42) + 0.05);
      // beater click
      const ns = noiseSrc(t, 0.03);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2400;
      const cg = ctx.createGain();
      adsr(cg.gain, t, { peak: 0.5 * vel, a: 0.001, d: 0.01, s: 0.1, hold: 0.012, r: 0.01 });
      ns.connect(hp);
      hp.connect(cg);
      route(cg, { bus: 'drums' });
    }

    function snare(t, o) {
      o = o || {};
      const vel = o.vel == null ? 1 : o.vel;
      const dec = o.dec || 0.2;
      const ns = noiseSrc(t, dec + 0.05, { pink: o.pink });
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = o.freq || 2100;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.75 * vel, a: 0.001, d: dec * 0.6, s: 0.05, hold: 0.03, r: dec * 0.5 });
      ns.connect(bp);
      bp.connect(g);
      route(g, { bus: 'drums', rev: o.rev == null ? 0.25 : o.rev, pan: o.pan || 0 });
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(230, t);
      body.frequency.exponentialRampToValueAtTime(170, t + 0.08);
      const bg = ctx.createGain();
      adsr(bg.gain, t, { peak: 0.5 * vel, a: 0.001, d: 0.06, s: 0.01, hold: 0.06, r: 0.06 });
      body.connect(bg);
      route(bg, { bus: 'drums' });
      body.start(t);
      body.stop(t + 0.2);
    }

    function hat(t, o) {
      o = o || {};
      const vel = o.vel == null ? 0.5 : o.vel;
      const dec = o.open ? 0.22 : 0.045;
      const ns = noiseSrc(t, dec + 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = o.freq || 7800;
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.22 * vel, a: 0.001, d: dec * 0.5, s: 0.02, hold: dec * 0.4, r: dec * 0.6 });
      ns.connect(hp);
      hp.connect(g);
      route(g, { bus: 'drums', pan: o.pan == null ? 0.35 : o.pan, rev: o.rev || 0.05 });
    }

    function clap(t, o) {
      o = o || {};
      const vel = o.vel == null ? 1 : o.vel;
      [0, 0.011, 0.023].forEach((dt) => {
        const ns = noiseSrc(t + dt, 0.2);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 1.1;
        const g = ctx.createGain();
        adsr(g.gain, t + dt, { peak: 0.45 * vel, a: 0.0005, d: 0.01, s: 0.05, hold: 0.01, r: 0.16 });
        ns.connect(bp);
        bp.connect(g);
        route(g, { bus: 'drums', rev: 0.3 });
      });
    }

    // Deep sine boom with a pitch drop and a touch of 2nd harmonic for small speakers.
    function sub(t, o) {
      o = o || {};
      const dur = o.dur || 1.2;
      const f0 = o.f0 || 60;
      const f1 = o.f1 || 28;
      const vel = o.vel == null ? 1 : o.vel;
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.9 * vel, a: 0.004, d: dur * 0.5, s: 0.3, hold: dur * 0.6, r: dur * 0.6 });
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(f0, t);
      o1.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(f0 * 2, t);
      o2.frequency.exponentialRampToValueAtTime(f1 * 2, t + dur);
      const g2 = ctx.createGain();
      g2.gain.value = 0.12;
      o1.connect(g);
      o2.connect(g2);
      g2.connect(g);
      route(g, { bus: 'sub' });
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur * 1.6 + 0.2);
      o2.stop(t + dur * 1.6 + 0.2);
    }

    // Big hit: sub + filtered noise crack + long reverb tail.
    function impact(t, o) {
      o = o || {};
      const vel = o.vel == null ? 1 : o.vel;
      const tail = o.tail || 4;
      sub(t, { dur: o.subDur || 1.6, f0: 70, f1: 30, vel: vel * 0.9 });
      const ns = noiseSrc(t, 0.8, { pink: true });
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(7000, t);
      lp.frequency.exponentialRampToValueAtTime(400, t + tail * 0.6);
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.9 * vel, a: 0.002, d: 0.2, s: 0.02, hold: 0.25, r: tail });
      ns.connect(lp);
      lp.connect(g);
      route(g, { bus: 'fx', rev: 1.0, dly: 0.2, pan: 0 });
      // a brief pitched body to make the hit read as a hit
      const b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.setValueAtTime(140, t);
      b.frequency.exponentialRampToValueAtTime(55, t + 0.25);
      const bg = ctx.createGain();
      adsr(bg.gain, t, { peak: 0.6 * vel, a: 0.001, d: 0.2, s: 0.02, hold: 0.2, r: 0.25 });
      b.connect(bg);
      route(bg, { bus: 'drums' });
      b.start(t);
      b.stop(t + 0.7);
    }

    // Rising filtered noise riser. dur seconds, ends at t+dur.
    function riser(t, dur, o) {
      o = o || {};
      const vel = o.vel == null ? 0.5 : o.vel;
      const ns = noiseSrc(t, dur, { pink: o.pink });
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = o.q || 1.4;
      bp.frequency.setValueAtTime(o.f0 || 320, t);
      bp.frequency.exponentialRampToValueAtTime(o.f1 || 9000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(EPS, t);
      g.gain.exponentialRampToValueAtTime(0.5 * vel, t + dur * 0.92);
      g.gain.exponentialRampToValueAtTime(EPS, t + dur + 0.05);
      ns.connect(bp);
      bp.connect(g);
      route(g, { bus: 'fx', rev: 0.35, pan: o.pan || 0 });
    }

    // Swept noise whoosh. dir: +1 rising, -1 falling.
    function whoosh(t, dur, o) {
      o = o || {};
      const dir = o.dir == null ? 1 : o.dir;
      const vel = o.vel == null ? 0.6 : o.vel;
      const ns = noiseSrc(t, dur + 0.1);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = o.q || 0.9;
      const lo = dir > 0 ? (o.lo || 500) : (o.hi || 7000);
      const hi = dir > 0 ? (o.hi || 7000) : (o.lo || 500);
      bp.frequency.setValueAtTime(lo, t);
      bp.frequency.exponentialRampToValueAtTime(hi, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(EPS, t);
      g.gain.exponentialRampToValueAtTime(0.9 * vel, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(EPS, t + dur);
      ns.connect(bp);
      bp.connect(g);
      route(g, { bus: 'fx', rev: 0.4, dly: 0.1, pan: o.pan == null ? (dir > 0 ? -0.2 : 0.2) : o.pan });
    }

    // Metallic tick / clink from inharmonic partials.
    function tick(t, o) {
      o = o || {};
      const f = o.f || 3100;
      const vel = o.vel == null ? 0.4 : o.vel;
      [1, 1.504, 2.317, 3.62].forEach((m, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * m;
        const g = ctx.createGain();
        adsr(g.gain, t, { peak: (0.3 / (i + 1)) * vel, a: 0.001, d: 0.03, s: 0.001, hold: 0.02, r: 0.12 + i * 0.03 });
        osc.connect(g);
        route(g, { bus: 'fx', rev: 0.25, dly: 0.05, pan: o.pan || 0.25 });
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }

    /* ---------- tonal voices ---------- */
    // Plucked pitched voice: detuned saws, filter drops fast.
    function pluck(t, midi, o) {
      o = o || {};
      const dur = o.dur || 0.3;
      const vel = o.vel == null ? 0.6 : o.vel;
      const f = mtof(midi);
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = o.q || 2.5;
      lp.frequency.setValueAtTime((o.bright || 3600) , t);
      lp.frequency.exponentialRampToValueAtTime(o.dark || 700, t + dur);
      [-6, 6].forEach((c) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = c;
        osc.connect(lp);
        osc.start(t);
        osc.stop(t + dur + (o.r || 0.4) + 0.05);
      });
      lp.connect(g);
      adsr(g.gain, t, { peak: 0.35 * vel, a: 0.002, d: dur, s: 0.12, hold: dur, r: o.r || 0.4 });
      route(g, { bus: o.bus || 'lead', pan: o.pan || 0, rev: o.rev == null ? 0.35 : o.rev, dly: o.dly || 0 });
    }

    // FM bell: inharmonic carrier/modulator, index decays for a bright attack.
    function bell(t, midi, o) {
      o = o || {};
      const f = mtof(midi);
      const vel = o.vel == null ? 0.5 : o.vel;
      const dur = o.dur || 1.2;
      const car = ctx.createOscillator();
      car.type = 'sine';
      car.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = f * 3.5;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * 1.6, t);
      idx.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.5);
      mod.connect(idx);
      idx.connect(car.frequency);
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.38 * vel, a: 0.002, d: dur * 0.6, s: 0.05, hold: dur * 0.5, r: dur * 0.6 });
      car.connect(g);
      route(g, { bus: o.bus || 'lead', pan: o.pan || 0, rev: o.rev == null ? 0.45 : o.rev, dly: o.dly == null ? 0.25 : o.dly });
      car.start(t);
      mod.start(t);
      car.stop(t + dur * 1.3 + 0.2);
      mod.stop(t + dur * 1.3 + 0.2);
    }

    // Sub-bass note: saw through a filter envelope plus a sine underneath.
    function bass(t, midi, o) {
      o = o || {};
      const dur = o.dur || 0.4;
      const vel = o.vel == null ? 0.8 : o.vel;
      const f = mtof(midi);
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = o.q || 3.2;
      lp.frequency.setValueAtTime(o.cut || 900, t);
      lp.frequency.exponentialRampToValueAtTime(o.cutLo || 180, t + dur * 0.8);
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = f;
      saw.connect(lp);
      lp.connect(g);
      const s = ctx.createOscillator();
      s.type = 'sine';
      s.frequency.value = f;
      const sg = ctx.createGain();
      sg.gain.value = 0.5;
      s.connect(sg);
      sg.connect(g);
      adsr(g.gain, t, { peak: 0.55 * vel, a: 0.003, d: dur * 0.5, s: 0.55, hold: dur, r: 0.06 });
      route(g, { bus: 'bass', pan: 0 });
      saw.start(t);
      s.start(t);
      saw.stop(t + dur + 0.15);
      s.stop(t + dur + 0.15);
    }

    // Detuned pad chord, slow attack. midis: array of midi notes.
    function pad(t, midis, o) {
      o = o || {};
      const dur = o.dur || 2;
      const vel = o.vel == null ? 0.35 : o.vel;
      const spread = o.spread == null ? 0.6 : o.spread;
      midis.forEach((m, i) => {
        const f = mtof(m);
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(o.cut || 1600, t);
        lp.frequency.linearRampToValueAtTime(o.cutTo || 2400, t + dur);
        const pan = (i / Math.max(1, midis.length - 1) - 0.5) * 2 * spread;
        [-9, 0, 9].forEach((c) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          osc.detune.value = c;
          osc.connect(lp);
          osc.start(t);
          osc.stop(t + dur + (o.r || 0.8) + 0.05);
        });
        lp.connect(g);
        adsr(g.gain, t, { peak: (0.18 * vel) / Math.sqrt(midis.length), a: o.a || 0.4, d: 0.2, s: 0.9, hold: dur, r: o.r || 0.8 });
        route(g, { bus: 'chords', pan, rev: o.rev == null ? 0.6 : o.rev });
      });
    }

    // Short stab chord: bright, fast decay.
    function stab(t, midis, o) {
      o = o || {};
      const dur = o.dur || 0.35;
      const vel = o.vel == null ? 0.5 : o.vel;
      midis.forEach((m, i) => {
        const f = mtof(m);
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.4;
        lp.frequency.setValueAtTime(o.bright || 4200, t);
        lp.frequency.exponentialRampToValueAtTime(o.dark || 650, t + dur);
        [-7, 7].forEach((c) => {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.value = f;
          osc.detune.value = c;
          osc.connect(lp);
          osc.start(t);
          osc.stop(t + dur + 0.5);
        });
        lp.connect(g);
        adsr(g.gain, t, { peak: (0.2 * vel) / Math.sqrt(midis.length), a: 0.002, d: dur, s: 0.2, hold: dur, r: 0.45 });
        route(g, { bus: 'chords', pan: (i / Math.max(1, midis.length - 1) - 0.5) * 0.9, rev: 0.4, dly: 0.12 });
      });
    }

    // Soft UI click for the ad: a tiny noise tick plus a short sine blip.
    function click(t, o) {
      o = o || {};
      const vel = o.vel == null ? 0.7 : o.vel;
      const ns = noiseSrc(t, 0.02);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3500;
      const g = ctx.createGain();
      adsr(g.gain, t, { peak: 0.35 * vel, a: 0.0005, d: 0.004, s: 0.01, hold: 0.004, r: 0.01 });
      ns.connect(hp);
      hp.connect(g);
      route(g, { bus: 'fx', pan: o.pan || 0 });
      const s = ctx.createOscillator();
      s.type = 'sine';
      s.frequency.setValueAtTime(o.f || 2200, t);
      s.frequency.exponentialRampToValueAtTime((o.f || 2200) * 0.6, t + 0.02);
      const sg = ctx.createGain();
      adsr(sg.gain, t, { peak: 0.25 * vel, a: 0.0005, d: 0.01, s: 0.01, hold: 0.01, r: 0.02 });
      s.connect(sg);
      route(sg, { bus: 'fx', pan: o.pan || 0 });
      s.start(t);
      s.stop(t + 0.05);
    }

    /* ---------- formant voice ----------
     * A sawtooth carrier shaped by three bandpass formants (the vowel), with
     * short noise consonants for s/t/k/h. Pitch glides, vibrato kicks in after a
     * beat, and the vowel morphs between syllables.
     * syllables: [{t, d, midi, v:'a'|'e'|'i'|'o'|'u'|'m', c:null|'s'|'t'|'k'|'h', vib:0..1}]
     */
    function sing(syllables, o) {
      o = o || {};
      const level = o.level == null ? 0.5 : o.level;
      const detunes = o.detunes || [-7, 7];
      const pan = o.pan || 0;
      const bus = BUS.vox;
      // one shared formant filter bank per call, per detune copy
      detunes.forEach((det, copy) => {
        const sum = ctx.createGain();
        sum.gain.value = level / detunes.length;
        const fb = [0, 1, 2].map((k) => {
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.Q.value = 3.2 + k * 0.8;
          f.frequency.value = 800;
          const g = ctx.createGain();
          g.gain.value = 1;
          f.connect(g);
          g.connect(sum);
          return { f, g };
        });
        const vibLfo = ctx.createOscillator();
        vibLfo.type = 'sine';
        vibLfo.frequency.value = 5.3 + copy * 0.2;
        const vibDepth = ctx.createGain();
        vibDepth.gain.value = 0;
        vibLfo.connect(vibDepth);
        const first = syllables[0];
        const tStart = first.t - 0.05;
        const tEnd = syllables[syllables.length - 1].t + syllables[syllables.length - 1].d + 0.4;
        vibLfo.start(tStart);
        vibLfo.stop(tEnd);

        // pitch / vowel automation timeline
        const car = ctx.createOscillator();
        car.type = 'sawtooth';
        car.detune.value = det;
        const vibSum = ctx.createGain();
        vibSum.gain.value = 1;
        car.connect(vibSum);
        const amp = ctx.createGain();
        amp.gain.value = 0;
        vibSum.connect(amp);
        const carFreq = car.frequency;
        let prevMidi = null;
        let prevV = null;
        let lastEnd = -1;
        syllables.forEach((s) => {
          const f = mtof(s.midi);
          const glide = prevMidi == null ? 0.001 : (o.glide == null ? 0.06 : o.glide);
          carFreq.setValueAtTime(prevMidi == null ? f : mtof(prevMidi), s.t - 0.001);
          carFreq.exponentialRampToValueAtTime(f, s.t + glide);
          // vowel morph
          const v = VOWELS[s.v || 'a'];
          fb.forEach((band, k) => {
            const pf = prevV ? VOWELS[prevV].f[k] : v.f[k];
            band.f.frequency.setValueAtTime(pf, s.t - 0.001);
            band.f.frequency.linearRampToValueAtTime(v.f[k], s.t + 0.05);
            band.f.Q.setValueAtTime(v.q[k], s.t);
            band.g.gain.setValueAtTime(v.g[k], s.t);
          });
          // vibrato: late-entering, a little deeper on long notes
          const vib = s.vib == null ? 1 : s.vib;
          vibDepth.gain.setValueAtTime(vibDepth.gain.value, s.t);
          vibDepth.gain.linearRampToValueAtTime(vib * f * 0.012, s.t + Math.min(0.6, s.d * 0.6));
          // amplitude envelope per syllable
          const a = amp.gain;
          const on = s.t;
          const off = s.t + s.d;
          a.setValueAtTime(EPS, on - 0.001 < 0 ? 0 : on - 0.001);
          a.exponentialRampToValueAtTime(1, on + 0.018);
          a.setValueAtTime(1, off);
          a.exponentialRampToValueAtTime(EPS, off + 0.07);
          lastEnd = off + 0.07;
          prevMidi = s.midi;
          prevV = s.v || 'a';
        });
        // vibrato: LFO -> depth (Hz) -> carrier frequency
        vibDepth.connect(carFreq);
        car.start(tStart);
        car.stop(tEnd);
        amp.connect(sum);
        // consonant noise bursts — sent to the bus directly, not through the formants
        syllables.forEach((s) => {
          if (!s.c) return;
          const c = s.c;
          const cg = ctx.createGain();
          const ns = noiseSrc(s.t - 0.05, 0.3, { pink: c === 'h' });
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          if (c === 's') { bp.frequency.value = 6800; bp.Q.value = 0.9; }
          else if (c === 't') { bp.frequency.value = 3800; bp.Q.value = 1.2; }
          else if (c === 'k') { bp.frequency.value = 2400; bp.Q.value = 1.0; }
          else { bp.frequency.value = 1100; bp.Q.value = 0.7; }
          const dur = c === 's' ? 0.11 : c === 'h' ? 0.07 : 0.018;
          const peak = c === 's' ? 0.2 : c === 'h' ? 0.1 : 0.35;
          adsr(cg.gain, s.t - 0.05, { peak, a: 0.002, d: dur * 0.5, s: 0.05, hold: dur, r: 0.01 });
          ns.connect(bp);
          bp.connect(cg);
          route(cg, { bus: 'vox', pan: pan, rev: 0.1 });
        });
        sum.connect(
          (function () {
            const p = ctx.createStereoPanner();
            p.pan.value = pan + (copy === 0 ? -0.12 : 0.12);
            p.connect(bus);
            return p;
          })()
        );
        // reverb/delay send for the whole voice
        const s1 = ctx.createGain();
        s1.gain.value = o.rev == null ? 0.22 : o.rev;
        sum.connect(s1);
        s1.connect(revIn);
        const s2 = ctx.createGain();
        s2.gain.value = o.dly == null ? 0.08 : o.dly;
        sum.connect(s2);
        s2.connect(dlIn);
      });
    }

    /* ---------- sidechain ---------- */
    // Duck the bass/chords/lead bus on each kick time. depth 0..1, rel seconds.
    function sidechain(times, depth, rel) {
      const ts = times.slice().sort((a, b) => a - b);
      duck.gain.setValueAtTime(1, 0);
      ts.forEach((t) => {
        duck.gain.setValueAtTime(1 - depth, t);
        duck.gain.exponentialRampToValueAtTime(1, t + rel);
      });
    }

    // Fade the whole mix out between t0 and t1 (seconds).
    function fadeOut(t0, t1) {
      fadeN.gain.setValueAtTime(1, t0);
      fadeN.gain.exponentialRampToValueAtTime(0.001, t1);
    }

    return {
      ctx,
      R,
      master,
      level,
      fadeOut,
      rnd,
      mtof,
      EPS,
      VOWELS,
      route,
      adsr,
      noiseSrc,
      kick,
      snare,
      hat,
      clap,
      sub,
      impact,
      riser,
      whoosh,
      tick,
      pluck,
      bell,
      bass,
      pad,
      stab,
      click,
      sing,
      sidechain,
      BUS,
    };
  }

  global.SynthLib = { mulberry32, mtof, createSynth, VOWELS };
})(typeof window !== 'undefined' ? window : globalThis);
