// Shared Web Audio synthesis library. Everything is built from oscillators,
// noise, filters and envelopes. All randomness is seeded (mulberry32).
// Loaded in a browser page; exposes window.Synth.
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const n2m = (s) => { const m = s.match(/^([A-G][#b]?)(-?\d)$/); return NOTE[m[1]] + (parseInt(m[2]) + 1) * 12; };
  const hz = (s) => (typeof s === 'number' ? s : midi(n2m(s)));

  class Engine {
    constructor(ctx, seed = 1) {
      this.ctx = ctx;
      this.rand = mulberry32(seed);
      this.sr = ctx.sampleRate;
      // master chain: bus -> glue comp -> limiter -> soft clip -> trim -> destination
      this.master = ctx.createGain();
      this.glue = ctx.createDynamicsCompressor();
      this.glue.threshold.value = -14; this.glue.ratio.value = 2.5; this.glue.attack.value = 0.02; this.glue.release.value = 0.2; this.glue.knee.value = 6;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -3; this.limiter.ratio.value = 20; this.limiter.attack.value = 0.001; this.limiter.release.value = 0.08; this.limiter.knee.value = 0;
      this.clip = ctx.createWaveShaper();
      const c = new Float32Array(4097);
      for (let i = 0; i < 4097; i++) { const x = (i / 2048) - 1; c[i] = Math.tanh(x * 1.1) / Math.tanh(1.1); }
      this.clip.curve = c; this.clip.oversample = '4x';
      this.trim = ctx.createGain(); this.trim.gain.value = 0.8;
      this.master.connect(this.glue); this.glue.connect(this.limiter); this.limiter.connect(this.clip); this.clip.connect(this.trim); this.trim.connect(ctx.destination);
      this._noise = this.noiseBuffer(4);
      this.buses = {};
    }
    noiseBuffer(sec, ch = 2) {
      const b = this.ctx.createBuffer(ch, Math.floor(sec * this.sr), this.sr);
      for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = this.rand() * 2 - 1; }
      return b;
    }
    // Algorithmic reverb impulse: exponentially decaying filtered stereo noise.
    reverbIR(sec = 3, decay = 3, bright = 0.5) {
      const len = Math.floor(sec * this.sr), b = this.ctx.createBuffer(2, len, this.sr);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c); let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len, w = this.rand() * 2 - 1;
          lp = lp + (w - lp) * (bright * (1 - t) + 0.05);
          d[i] = lp * Math.pow(1 - t, decay) * (i < this.sr * 0.01 ? i / (this.sr * 0.01) : 1);
        }
      }
      return b;
    }
    bus(name, { gain = 1, reverb = 0, irSec = 2.5, irDecay = 3, delay = 0, delayTime = 0.375, delayFb = 0.35, pan = 0, hp = 0, lp = 0 } = {}) {
      const ctx = this.ctx, inp = ctx.createGain(), out = ctx.createGain(); out.gain.value = gain;
      let node = inp;
      if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
      if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
      const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(out);
      if (reverb) { const cv = ctx.createConvolver(); cv.buffer = this.reverbIR(irSec, irDecay); const rg = ctx.createGain(); rg.gain.value = reverb; p.connect(cv); cv.connect(rg); rg.connect(out); }
      if (delay) {
        const d = ctx.createDelay(2); d.delayTime.value = delayTime; const fb = ctx.createGain(); fb.gain.value = delayFb;
        const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 3500;
        const dg = ctx.createGain(); dg.gain.value = delay;
        p.connect(d); d.connect(df); df.connect(fb); fb.connect(d); df.connect(dg); dg.connect(out);
      }
      out.connect(this.master);
      inp.out = out;
      this.buses[name] = inp;
      return inp;
    }
    // Sidechain-style ducking: automate a bus output gain dip on each time given.
    duck(busName, times, depth = 0.6, rel = 0.22) {
      const g = this.buses[busName].out.gain, base = g.value;
      for (const t of times) { g.setValueAtTime(base * (1 - depth), t); g.setTargetAtTime(base, t + 0.01, rel / 3); }
    }
    env(param, t, { a = 0.005, d = 0.1, s = 0, r = 0.1, peak = 1, len = 0, floor = 0.0001 }) {
      param.setValueAtTime(floor, t);
      param.linearRampToValueAtTime(peak, t + a);
      if (len > 0) {
        // decay toward sustain, then release from wherever the decay has reached
        // (no value jumps → no clicks)
        param.setTargetAtTime(Math.max(peak * s, floor), t + a, d / 3);
        param.setTargetAtTime(floor, t + Math.max(len, a + 0.001), r / 3);
      } else {
        param.setTargetAtTime(floor, t + a, d / 3);
      }
    }
    // ---------- drums ----------
    kick(t, dest, { v = 1, f0 = 150, f1 = 45, dec = 0.35, click = 0.4 } = {}) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.08);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.setTargetAtTime(0, t + 0.01, dec / 3.5);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec * 2);
      if (click) { this.noiseHit(t, dest, { v: v * click, dec: 0.012, type: 'highpass', f: 2500 }); }
    }
    noiseHit(t, dest, { v = 1, dec = 0.1, type = 'bandpass', f = 2000, q = 0.8, a = 0.001, pan = 0 } = {}) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this._noise;
      const off = this.rand() * 3;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setTargetAtTime(0, t + a, dec / 3);
      let last = g;
      if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
      s.connect(fl); fl.connect(g); last.connect(dest); s.start(t, off); s.stop(t + a + dec * 3);
    }
    snare(t, dest, { v = 1, tone = 190 } = {}) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(tone * 1.6, t); o.frequency.exponentialRampToValueAtTime(tone, t + 0.03);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.6, t + 0.002); g.gain.setTargetAtTime(0, t + 0.004, 0.04);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3);
      this.noiseHit(t, dest, { v: v * 0.8, dec: 0.18, type: 'highpass', f: 1800, q: 0.5 });
    }
    clap(t, dest, { v = 1 } = {}) {
      for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, dest, { v: v * 0.6, dec: 0.02, type: 'bandpass', f: 1300, q: 1.2 });
      this.noiseHit(t + 0.033, dest, { v: v * 0.8, dec: 0.22, type: 'bandpass', f: 1200, q: 1.0 });
    }
    hat(t, dest, { v = 0.4, open = false, pan = 0 } = {}) {
      this.noiseHit(t, dest, { v, dec: open ? 0.25 : 0.035, type: 'highpass', f: 7500, q: 0.7, pan });
    }
    // ---------- tonal ----------
    voice(t, freq, dur, dest, { type = 'sawtooth', v = 0.3, a = 0.01, d = 0.2, s = 0.6, r = 0.2, detune = 0, unison = 1, spread = 12, cutoff = 4000, cutEnv = 0, q = 0.7, fdec = 0.3, pan = 0, glideFrom = 0 } = {}) {
      const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = q;
      f.frequency.setValueAtTime(Math.min(cutoff + cutEnv, 20000), t);
      if (cutEnv) f.frequency.setTargetAtTime(cutoff, t + a, fdec / 3);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      f.connect(g); g.connect(p); p.connect(dest);
      this.env(g.gain, t, { a, d, s, r, peak: v / Math.sqrt(unison), len: dur });
      for (let u = 0; u < unison; u++) {
        const o = ctx.createOscillator(); o.type = type;
        const dt = unison > 1 ? (u / (unison - 1) - 0.5) * spread : 0;
        if (glideFrom) { o.frequency.setValueAtTime(glideFrom, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06); } else o.frequency.value = freq;
        o.detune.value = detune + dt;
        o.connect(f); o.start(t); o.stop(t + dur + r * 2 + 0.05);
      }
      return { gain: g, filter: f };
    }
    pluck(t, note, dest, opts = {}) {
      return this.voice(t, hz(note), opts.dur || 0.05, dest, Object.assign({ type: 'sawtooth', v: 0.25, a: 0.002, d: 0.35, s: 0, r: 0.3, cutoff: 900, cutEnv: 4000, fdec: 0.18, unison: 2, spread: 8 }, opts));
    }
    bell(t, note, dest, { v = 0.15, dec = 1.6, pan = 0 } = {}) {
      // simple 2-op FM bell
      const ctx = this.ctx, f = hz(note), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      car.frequency.value = f; mod.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 2.5, t); mg.gain.setTargetAtTime(f * 0.2, t, dec / 4);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g);
      const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, dec / 3);
      car.start(t); mod.start(t); car.stop(t + dec * 2); mod.stop(t + dec * 2);
    }
    pad(t, notes, dur, dest, opts = {}) {
      notes.forEach((n, i) => this.voice(t, hz(n), dur, dest, Object.assign({ type: 'sawtooth', v: 0.08, a: 0.6, d: 0.5, s: 0.9, r: 1.2, unison: 3, spread: 18, cutoff: 1400, pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.6 }, opts)));
    }
    bass(t, note, dur, dest, opts = {}) {
      const f = hz(note);
      this.voice(t, f, dur, dest, Object.assign({ type: 'sine', v: 0.45, a: 0.005, d: 0.2, s: 0.85, r: 0.08 }, opts));
      this.voice(t, f, dur, dest, Object.assign({ type: 'sawtooth', v: 0.12, a: 0.005, d: 0.15, s: 0.5, r: 0.06, cutoff: 350, cutEnv: 900, fdec: 0.12 }, opts.saw || {}));
    }
    // ---------- cinematic FX ----------
    subBoom(t, dest, { v = 1, f0 = 90, f1 = 28, dec = 2.2 } = {}) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.setTargetAtTime(0, t + 0.05, dec / 3.5);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec * 1.5);
      this.noiseHit(t, dest, { v: v * 0.35, dec: 0.25, type: 'lowpass', f: 400, q: 0.5 });
    }
    riser(t0, t1, dest, { v = 0.5, f0 = 300, f1 = 9000, q = 4, tonal = true, n0 = 'D3', n1 = 'D5' } = {}) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this._noise; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = q;
      fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t1);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1 + 0.02);
      s.connect(fl); fl.connect(g); g.connect(dest); s.start(t0); s.stop(t1 + 0.1);
      if (tonal) {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(hz(n0), t0); o.frequency.exponentialRampToValueAtTime(hz(n1), t1);
        const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.setValueAtTime(400, t0); of.frequency.exponentialRampToValueAtTime(6000, t1);
        og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(v * 0.25, t1 - 0.01); og.gain.linearRampToValueAtTime(0, t1 + 0.02);
        o.connect(of); of.connect(og); og.connect(dest); o.start(t0); o.stop(t1 + 0.1);
      }
    }
    whoosh(t, dur, dest, { v = 0.5, f0 = 400, f1 = 4000, pan0 = -0.6, pan1 = 0.6 } = {}) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this._noise;
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.5;
      fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); fl.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
      s.connect(fl); fl.connect(g); g.connect(p); p.connect(dest); s.start(t, this.rand() * 2); s.stop(t + dur + 0.05);
    }
    impact(t, dest, { v = 1, tail = 4 } = {}) {
      this.subBoom(t, dest, { v, f0: 110, f1: 30, dec: tail * 0.7 });
      this.noiseHit(t, dest, { v: v * 0.7, dec: tail * 0.35, type: 'lowpass', f: 2500, q: 0.4 });
      this.noiseHit(t, dest, { v: v * 0.5, dec: 0.08, type: 'highpass', f: 3000, q: 0.5 });
    }
    reverseSwell(t1, dur, dest, { v = 0.4, note = 'D4' } = {}) {
      // a swell that crescendos into t1 (reverse-cymbal feel)
      const ctx = this.ctx, t0 = t1 - dur, s = ctx.createBufferSource(); s.buffer = this._noise;
      const fl = ctx.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 3000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.005); g.gain.linearRampToValueAtTime(0, t1);
      s.connect(fl); fl.connect(g); g.connect(dest); s.start(t0, 0.3); s.stop(t1 + 0.02);
    }
    click(t, dest, { v = 0.3, f = 3000, pan = 0 } = {}) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f;
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.0008); g.gain.setTargetAtTime(0, t + 0.0008, 0.006);
      o.connect(g); g.connect(p); p.connect(dest); o.start(t); o.stop(t + 0.05);
      this.noiseHit(t, dest, { v: v * 0.5, dec: 0.01, type: 'highpass', f: 5000, pan });
    }
  }

  // 24-bit / 16-bit PCM WAV encoder
  function encodeWAV(buffer, bits = 24) {
    const ch = buffer.numberOfChannels, sr = buffer.sampleRate, n = buffer.length, bps = bits / 8;
    const data = new Uint8Array(44 + n * ch * bps), v = new DataView(data.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * bps, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bits, true);
    w(36, 'data'); v.setUint32(40, n * ch * bps, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
    let o = 44; const max = Math.pow(2, bits - 1) - 1;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      let s = Math.max(-1, Math.min(1, chans[c][i])); let x = Math.round(s * max);
      if (bits === 24) { data[o] = x & 255; data[o + 1] = (x >> 8) & 255; data[o + 2] = (x >> 16) & 255; o += 3; }
      else { v.setInt16(o, x, true); o += 2; }
    }
    return data;
  }

  window.Synth = { Engine, mulberry32, midi, n2m, hz, encodeWAV };
})();
