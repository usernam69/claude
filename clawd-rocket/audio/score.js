// Clawd and the rocket — synthesized score + foley. 100 BPM (beat 0.6 s), C major.
// Every effect is placed on the action timestamps used in scene.js.
window.SCORE = {
  duration: 22, seed: 9,
  build(E) {
    const B = 0.6, Q = B / 2;
    const music = E.bus('music', { gain: 0.9, reverb: 0.25, irSec: 2.2, delay: 0.12, delayTime: 0.45 });
    const bassB = E.bus('bass', { gain: 0.85 });
    const perc = E.bus('perc', { gain: 0.55, reverb: 0.1 });
    const foley = E.bus('foley', { gain: 1.0, reverb: 0.12, irSec: 1.2 });
    const fx = E.bus('fx', { gain: 0.75, reverb: 0.3, irSec: 2.5 });
    const boom = E.bus('boom', { gain: 0.9, reverb: 0.55, irSec: 4, irDecay: 2.5 });
    const bells = E.bus('bells', { gain: 0.6, reverb: 0.5, irSec: 3.5, delay: 0.25, delayTime: 0.6 });
    const r = E.rand;

    // instruments
    const pluck = (t, n, v = 0.22, pan = 0) => E.voice(t, Synth.hz(n), 0.04, music, { type: 'triangle', v, a: 0.002, d: 0.32, s: 0, r: 0.25, cutoff: 2400, cutEnv: 3000, fdec: 0.1, pan });
    const kal = (t, n, v = 0.1, pan = 0) => E.bell(t, n, bells, { v, dec: 0.9, pan });
    const bassP = (t, n, v = 0.4) => E.voice(t, Synth.hz(n), 0.12, bassB, { type: 'triangle', v, a: 0.003, d: 0.35, s: 0.1, r: 0.15, cutoff: 900 });
    const clank = (t, f = 1, v = 0.35, pan = 0) => { E.bell(t, Synth.midi(76 + 12 * Math.log2(f)), foley, { v: v * 0.6, dec: 0.5, pan }); E.bell(t, Synth.midi(83 + 12 * Math.log2(f)), foley, { v: v * 0.35, dec: 0.35, pan }); E.noiseHit(t, foley, { v: v * 0.8, dec: 0.06, type: 'bandpass', f: 3200 * f, q: 2, pan }); E.noiseHit(t, foley, { v: v * 0.5, dec: 0.12, type: 'lowpass', f: 600, pan }); };
    const boing = (t, up = true, v = 0.18) => { const ctx = E.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(up ? 300 : 900, t); o.frequency.exponentialRampToValueAtTime(up ? 900 : 300, t + 0.22);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setTargetAtTime(0, t + 0.12, 0.05); o.connect(g); g.connect(foley); o.start(t); o.stop(t + 0.5); };
    const scritch = (t) => { for (let i = 0; i < 5; i++) E.noiseHit(t - 0.1 + i * 0.022, foley, { v: 0.25, dec: 0.02, type: 'bandpass', f: 2500 + i * 500, q: 1.2 });
      E.noiseHit(t, foley, { v: 0.35, dec: 0.35, type: 'bandpass', f: 1400, q: 0.6, a: 0.03 }); };
    const hiss = (t0, t1, v = 0.18) => { const ctx = E.ctx, s = ctx.createBufferSource(); s.buffer = E._noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500; const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.05); g.gain.setValueAtTime(v, t1 - 0.05); g.gain.linearRampToValueAtTime(0, t1);
      s.connect(f); f.connect(g); g.connect(foley); s.start(t0); s.stop(t1 + 0.1);
      for (let t = t0; t < t1; t += 0.025 + r() * 0.05) E.noiseHit(t, foley, { v: 0.12 + r() * 0.15, dec: 0.006, type: 'highpass', f: 5000, pan: (r() - 0.5) * 0.4 }); };
    const rattle = (t0, t1, v0, v1) => { for (let t = t0; t < t1; t += 0.032) { const p = (t - t0) / (t1 - t0); E.noiseHit(t, foley, { v: (v0 + (v1 - v0) * p) * (0.6 + r() * 0.4), dec: 0.02, type: 'bandpass', f: 2200 + r() * 1800, q: 3, pan: (r() - 0.5) * 0.3 }); } };
    const tapeRip = (t0, dur) => { for (let t = t0; t < t0 + dur; t += 0.008) { const p = (t - t0) / dur; E.noiseHit(t, foley, { v: 0.16 * (0.5 + r()) * Math.sin(Math.PI * p), dec: 0.006, type: 'bandpass', f: 1500 + p * 3000, q: 1.5 }); } };
    const step = (t, v = 0.12) => { E.noiseHit(t, foley, { v, dec: 0.025, type: 'bandpass', f: 900 + r() * 300, q: 2 }); };
    const shaker = (t, v = 0.08) => E.noiseHit(t, perc, { v, dec: 0.04, type: 'highpass', f: 6000, a: 0.008 });
    const block = (t, v = 0.15, f = 1200) => { E.voice(t, f, 0.01, perc, { type: 'sine', v, a: 0.001, d: 0.05, s: 0, r: 0.03 }); };

    // ---------------- A: playful build (0 – 8.4)
    const chordsA = [['C3', 'E3', 'G3'], ['F2', 'A2', 'C3'], ['A2', 'C3', 'E3'], ['G2', 'B2', 'D3']];
    const arp = [['C4', 'E4', 'G4', 'E4'], ['F4', 'A4', 'C5', 'A4'], ['A3', 'C4', 'E4', 'C4'], ['G3', 'B3', 'D4', 'B3']];
    for (let bar = 0; bar < 4; bar++) { const t0 = bar * 4 * B; if (t0 >= 8.4) break;
      for (let k = 0; k < 8; k++) { const t = t0 + k * Q; if (t >= 7.2 && bar === 3 && k > 3) break; if (t < 0.3) continue; pluck(t, arp[bar][k % 4], 0.12 + (k % 2 ? 0 : 0.04), k % 2 ? 0.2 : -0.2); }
      for (let k = 0; k < 4; k++) { const t = t0 + k * B; if (t >= 8.4) break; bassP(t, chordsA[bar][0].replace(/\d/, (d) => d), k % 2 ? 0.25 : 0.38); }
    }
    // melody from bar 2 (2.4)
    const mel = [['C5', null, 'E5', 'G5', 'A5', 'G5', 'E5', null], ['D5', null, 'E5', 'C5', 'D5', null, null, null]];
    mel.forEach((ph, i) => ph.forEach((n, k) => { if (n) kal(2.4 + i * 2.4 + k * Q, n, 0.09, 0.15); }));
    for (let t = 1.2; t < 7.2; t += Q) block(t, (Math.round(t / Q) % 2 ? 0.05 : 0.09), 1500);
    // foley: taps, parts landing, ta-da
    [1.8, 2.4, 3.0].forEach((t, i) => clank(t, 0.9 + i * 0.05, 0.4, 0.15));
    [[3.0, 3.6], [3.75, 4.2], [4.35, 4.8]].forEach(([a, b], i) => { boing(a + 0.05, true, 0.12); clank(b, 1.1 + i * 0.12, 0.35, 0.3); });
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => pluck(5.4 + i * 0.07, n, 0.18, (i - 1.5) * 0.2)); kal(5.68, 'C6', 0.1);
    boing(5.38, true, 0.1);
    // match + fuse 1
    scritch(6.0); hiss(7.22, 8.42, 0.14);
    E.pad(7.2, ['G2', 'D3', 'G3'], 1.8, music, { v: 0.05, a: 0.4, cutoff: 900, r: 0.3 });
    // ---------------- tension → fizzle (8.4 – 10.2)
    rattle(8.4, 9.0, 0.08, 0.25);
    for (let t = 8.4; t < 9.0; t += 0.075) pluck(t, 'G4', 0.06 + (t - 8.4) * 0.12);
    { const ctx = E.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); // sad descending fizzle whistle
      o.type = 'sine'; o.frequency.setValueAtTime(1300, 9.02); o.frequency.exponentialRampToValueAtTime(260, 9.85);
      lfo.frequency.value = 9; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, 9.0); g.gain.linearRampToValueAtTime(0.13, 9.06); g.gain.setTargetAtTime(0, 9.6, 0.12);
      o.connect(g); g.connect(fx); o.start(9.0); lfo.start(9.0); o.stop(10.3); lfo.stop(10.3); }
    E.noiseHit(9.0, foley, { v: 0.35, dec: 0.5, type: 'lowpass', f: 900, q: 0.4, a: 0.02 });
    clank(9.66, 0.75, 0.45, 0.3); clank(9.82, 0.8, 0.2, 0.3); clank(9.92, 0.85, 0.1, 0.3);
    // ---------------- slump: two sad notes (10.2 – 12.0)
    E.pad(10.2, ['A2', 'C3', 'E3'], 1.7, music, { v: 0.05, a: 0.5, cutoff: 700, r: 0.4 });
    pluck(10.2, 'C4', 0.16); pluck(10.8, 'A3', 0.16); pluck(11.4, 'Ab3', 0.1);
    // ---------------- idea! (12.0)
    E.bell(12.0, 'C6', bells, { v: 0.18, dec: 1.8 }); E.bell(12.0, 'G6', bells, { v: 0.1, dec: 1.8 }); E.bell(12.02, 'E7', bells, { v: 0.05, dec: 1.2 });
    boing(11.95, true, 0.14);
    E.whoosh(12.62, 0.36, fx, { v: 0.4, f0: 500, f1: 5000, pan0: -0.7, pan1: 0.7 });
    // ---------------- C: busy fixing (12.6 – 16.2), brighter groove
    const chordsC = [['C3', 'E3', 'G3'], ['F2', 'A2', 'C3'], ['G2', 'B2', 'D3']];
    for (let t = 12.6; t < 16.2 - 0.01; t += Q) { const i = Math.round((t - 12.6) / Q); const bar = Math.min(2, Math.floor((t - 12.6) / (4 * B)));
      pluck(t, arp[[0, 1, 3][bar]][i % 4], 0.11, i % 2 ? 0.25 : -0.25); shaker(t + Q / 2, 0.06); if (i % 2 === 0) bassP(t, chordsC[bar][0], 0.32); }
    [['G5', 13.2], ['A5', 13.5], ['G5', 13.8], ['E5', 14.4], ['C5', 15.0], ['D5', 15.3], ['E5', 15.6]].forEach(([n, t]) => kal(t, n, 0.08));
    // scrape while pushing the booster
    for (let t = 13.2; t < 14.0; t += 0.02) E.noiseHit(t, foley, { v: 0.07 * (0.6 + r() * 0.4), dec: 0.02, type: 'bandpass', f: 700 + r() * 300, q: 2 });
    for (let t = 13.25; t < 14.0; t += 0.1) step(t, 0.08);
    clank(14.0, 0.7, 0.3, -0.1);
    boing(14.25, true, 0.16); clank(14.55, 0.95, 0.45, 0.1);
    tapeRip(14.6, 0.22); tapeRip(14.85, 0.22);
    for (let t = 15.12; t < 15.55; t += 0.075) step(t, 0.1);
    // match + fuse 2
    scritch(15.6); hiss(16.2, 16.92, 0.16);
    E.riser(16.2, 17.4, fx, { v: 0.32, f0: 300, f1: 7000, n0: 'G3', n1: 'G5' });
    E.pad(16.2, ['G2', 'D3', 'G3', 'B3'], 1.2, music, { v: 0.06, a: 0.3, cutoff: 1400, r: 0.1 });
    rattle(16.85, 17.4, 0.12, 0.4);
    // ---------------- D: launch + fireworks (17.4 – 19.8)
    { const ctx = E.ctx, s = ctx.createBufferSource(); s.buffer = E._noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(400, 17.4); f.frequency.exponentialRampToValueAtTime(2500, 17.6); f.frequency.exponentialRampToValueAtTime(500, 18.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, 17.38); g.gain.linearRampToValueAtTime(0.75, 17.45); g.gain.setTargetAtTime(0, 17.8, 0.35);
      s.connect(f); f.connect(g); g.connect(fx); s.start(17.38); s.stop(19.2); }
    E.subBoom(17.4, boom, { v: 0.8, f0: 70, f1: 30, dec: 1.4 });
    // glass crash
    { const T = 17.93; E.noiseHit(T, foley, { v: 0.5, dec: 0.4, type: 'highpass', f: 3000, q: 0.5 });
      for (let i = 0; i < 22; i++) E.bell(T + r() * 0.6, Synth.midi(88 + Math.floor(r() * 14)), foley, { v: 0.04 + r() * 0.05, dec: 0.25, pan: (r() - 0.5) * 0.9 }); }
    // bursts: boom + crackle
    [[18.6, 1.0], [19.2, 0.85], [19.8, 0.8]].forEach(([T, v]) => {
      E.subBoom(T, boom, { v: v * 0.9, f0: 95, f1: 32, dec: 1.8 }); E.noiseHit(T, boom, { v: v * 0.6, dec: 0.7, type: 'lowpass', f: 1800, q: 0.4 });
      for (let i = 0; i < 40; i++) { const t = T + 0.7 + r() * 1.3; E.noiseHit(t, foley, { v: 0.05 + r() * 0.07, dec: 0.008, type: 'highpass', f: 4000, pan: (r() - 0.5) * 1.2 }); } });
    // triumphant groove: C | G | Am F
    const chordsD = [['C3', 'E3', 'G3', 'C4'], ['G2', 'B2', 'D3', 'G3'], ['A2', 'C3', 'E3', 'A3'], ['F2', 'A2', 'C3', 'F3']];
    for (let i = 0; i < 4; i++) { const t = 17.4 + i * 2 * B; E.pad(t, chordsD[i], 2 * B, music, { v: 0.07, a: 0.02, cutoff: 2600, r: 0.3 }); bassP(t, chordsD[i][0], 0.42); bassP(t + B, chordsD[i][0], 0.3); }
    for (let t = 17.4; t < 21.0; t += B) { E.kick(t, perc, { v: 0.9 }); }
    for (let t = 18.0; t < 21.0; t += 2 * B) E.clap(t, perc, { v: 0.6 });
    for (let t = 17.4; t < 21.0; t += Q) shaker(t + Q / 2, 0.08);
    [['C5', 0], ['E5', 1], ['G5', 2], ['C6', 3], ['B5', 5], ['G5', 6], ['A5', 8], ['G5', 9], ['E5', 10], ['F5', 12], ['E5', 13], ['D5', 14], ['C5', 16]].forEach(([n, k]) => { const t = 17.4 + 1.2 + k * Q; if (t < 21.6) { kal(t, n, 0.11); pluck(t, n, 0.12); } });
    // ---------------- E: outro (19.8 – 22): distant booms, happy hop, final chord
    [[20.4, 0.35], [21.0, 0.3]].forEach(([T, v]) => E.subBoom(T, boom, { v, f0: 70, f1: 30, dec: 1.5 }));
    boing(20.38, true, 0.12);
    E.pad(21.0, ['C3', 'G3', 'C4', 'E4', 'D5'], 1.0, music, { v: 0.06, a: 0.05, d: 1, s: 0.6, cutoff: 2200, r: 0.6 });
    ['C5', 'G5', 'E6'].forEach((n, i) => kal(21.0 + i * 0.1, n, 0.08));
  },
};
