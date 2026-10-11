// Claude Opus 5.5 ad — synthesized soundtrack + UI foley. 120 BPM (beat 0.5 s), B minor → D major.
// Every hit sits on the timestamps used in ad.js.
window.SCORE = {
  duration: 30, seed: 303,
  build(E) {
    const B = 0.5, BAR = 2, r = E.rand;
    const ui = E.bus('ui', { gain: 0.55, reverb: 0.12, irSec: 1.2, hp: 200 });
    const fx = E.bus('fx', { gain: 0.5, reverb: 0.4, irSec: 3, hp: 80 });
    const keys = E.bus('keys', { gain: 0.55, reverb: 0.35, irSec: 3, delay: 0.12, delayTime: 0.375 });
    const padB = E.bus('pad', { gain: 0.4, reverb: 0.5, irSec: 4, hp: 120 });
    const bassB = E.bus('bass', { gain: 0.6 });
    const drums = E.bus('drums', { gain: 0.55, reverb: 0.08 });
    const hats = E.bus('hats', { gain: 0.25, hp: 500 });
    const bells = E.bus('bells', { gain: 0.5, reverb: 0.6, irSec: 5, delay: 0.25, delayTime: 0.75 });
    const m = (n) => Synth.n2m(n);
    const ep = (t, n, v = 0.12, pan = 0) => { // electric-piano-ish: FM bell with low ratio + soft sine
      const ctx = E.ctx, f = Synth.hz(n), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), p = ctx.createStereoPanner();
      car.frequency.value = f; mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.4, t); mg.gain.setTargetAtTime(f * 0.15, t, 0.25);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g); p.pan.value = pan; g.connect(p); p.connect(keys);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, 0.6);
      car.start(t); mod.start(t); car.stop(t + 3); mod.stop(t + 3); };
    const chordEP = (t, notes, v = 0.07) => notes.forEach((n, i) => ep(t + i * 0.012, n, v, (i - 1.5) * 0.25));
    const pop = (t, v = 0.2, f = 900) => { E.voice(t, f, 0.01, ui, { type: 'sine', v, a: 0.001, d: 0.06, s: 0, r: 0.04, glideFrom: f * 1.8 }); };
    const thunk = (t, v = 0.15) => { E.noiseHit(t, ui, { v, dec: 0.05, type: 'lowpass', f: 700, q: 0.6, pan: (r() - 0.5) * 0.6 }); E.voice(t, 180 + r() * 60, 0.01, ui, { type: 'sine', v: v * 0.8, a: 0.001, d: 0.07, s: 0, r: 0.03 }); };
    const key = (t, v = 0.12) => E.click(t, ui, { v, f: 1800 + r() * 900, pan: (r() - 0.5) * 0.3 });

    // ---------------- 0–4: the problem (B minor, tense)
    for (let i = 0; i < 47; i++) thunk(0.04 + i * 0.028 + 0.38, 0.08 + r() * 0.06);
    E.pad(0, ['B1', 'F#2', 'B2'], 3.9, padB, { v: 0.08, a: 0.3, cutoff: 600, r: 0.4 });
    for (let t = 0; t < 3.8; t += B / 2) E.bass(t, Math.round(t / (B / 2)) % 2 ? 'B1' : 'B1', 0.18, bassB, { v: 0.32 });
    E.subBoom(0.25, fx, { v: 0.4, f0: 90, f1: 40, dec: 0.8 });
    E.subBoom(1.2, fx, { v: 0.35, f0: 80, f1: 38, dec: 0.8 }); ep(1.2, 'D4', 0.08); ep(1.2, 'B3', 0.08);
    for (let t = 1.6, k = 0; t < 3.8; t += B, k++) E.click(t, ui, { v: 0.1, f: k % 2 ? 2400 : 3000 }); // clock tick-tock
    pop(1.62, 0.12, 1200);
    // collapse into the input
    E.whoosh(3.55, 0.75, fx, { v: 0.5, f0: 300, f1: 4500, pan0: -0.4, pan1: 0.2 });
    E.reverseSwell(4.3, 0.6, fx, { v: 0.3 });
    pop(4.3, 0.18, 700);

    // ---------------- 4–8: just ask (D major, warm, no drums yet)
    const prog = ['D', 'A', 'Bm', 'G'];
    const V = { D: ['D3', 'F#3', 'A3', 'E4'], A: ['C#3', 'E3', 'A3', 'B3'], Bm: ['B2', 'D3', 'F#3', 'A3'], G: ['B2', 'D3', 'G3', 'A3'], Em: ['B2', 'E3', 'G3', 'D4'], A7: ['C#3', 'G3', 'A3', 'E4'] };
    const R = { D: 'D2', A: 'A1', Bm: 'B1', G: 'G1', Em: 'E2', A7: 'A1' };
    const kicks = [];
    for (let bar = 2; bar < 13; bar++) {
      const t0 = bar * BAR; const c = bar >= 12 ? (bar === 12 ? 'Em' : 'A7') : prog[(bar - 2) % 4];
      chordEP(t0, V[c], bar < 4 ? 0.13 : 0.07); if (bar < 4) chordEP(t0 + 1.5 * B, V[c], 0.09); if (bar >= 4) chordEP(t0 + 1.5 * B, V[c], 0.045);
      E.pad(t0, V[c], BAR - 0.05, padB, { v: bar < 4 ? 0.1 : 0.05, a: 0.2, cutoff: bar < 4 ? 1400 : 1800 }); if (bar < 4) E.bass(t0, R[c], BAR - 0.1, bassB, { v: 0.3 });
      if (bar >= 4 && bar < 13) for (let k = 0; k < 8; k++) { const t = t0 + k * B / 2; E.bass(t, R[c], B / 2 - 0.05, bassB, { v: k % 2 ? 0.3 : 0.42 }); }
      if (bar >= 4 && bar < 13) {
        for (let k = 0; k < 4; k++) { const t = t0 + k * B; if (t >= 25.5) break; E.kick(t, drums, { v: 0.85 }); kicks.push(t); }
        if (t0 + 1 * B < 25.5) E.clap(t0 + B, drums, { v: 0.5 }); if (t0 + 3 * B < 25.5) E.clap(t0 + 3 * B, drums, { v: 0.55 });
        for (let k = 0; k < 8; k++) { const t = t0 + k * B / 2; if (t < 25.5) E.hat(t, hats, { v: k % 2 ? 0.45 : 0.18, pan: 0.15 }); }
      }
    }
    E.duck('pad', kicks, 0.45); E.duck('bass', kicks, 0.65, 0.16); E.duck('keys', kicks, 0.15);
    // melodic hook (bells) answering each caption
    const hook = (t0, notes) => notes.forEach(([n, bt]) => E.bell(t0 + bt * B, n, bells, { v: 0.07, dec: 1.2, pan: 0.2 }));
    hook(8.5, [['F#5', 0], ['A5', 0.5], ['B5', 1], ['A5', 2]]);
    hook(13.25, [['F#5', 0], ['E5', 0.5], ['D5', 1], ['E5', 2]]);
    hook(18.25, [['A5', 0], ['B5', 0.5], ['D6', 1], ['B5', 2]]);
    // typing + send + reply
    for (let i = 0; i < 31; i++) key(4.55 + i * 0.055, 'Help me make sense of all this.'[i] === ' ' ? 0.05 : 0.11);
    pop(6.35, 0.25, 1100); E.whoosh(6.5, 0.4, fx, { v: 0.2, f0: 800, f1: 3000 });
    pop(6.98, 0.16, 800);
    for (let i = 0; i < 9; i++) E.click(7.15 + i * 0.11, ui, { v: 0.04, f: 3500 });
    // table: card grow, snap, sort, total, bars
    E.whoosh(8.1, 0.55, fx, { v: 0.3, f0: 500, f1: 3500 });
    for (let i = 0; i < 6; i++) E.click(9.5 + i * 0.02, ui, { v: 0.14, f: 1500 + i * 200 });
    E.whoosh(9.85, 0.6, fx, { v: 0.2, f0: 1000, f1: 4000, pan0: 0.3, pan1: -0.3 });
    pop(10.6, 0.2, 1000);
    ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'].forEach((n, i) => E.pluck(11.15 + i * 0.1, n, keys, { v: 0.09, pan: (i - 2.5) * 0.15 }));
    // code
    E.whoosh(12.85, 0.6, fx, { v: 0.3, f0: 400, f1: 3500 });
    for (let i = 0; i < 7; i++) E.click(13.45 + i * 0.07, ui, { v: 0.06, f: 2600 });
    E.voice(14.0, 110, 0.35, ui, { type: 'square', v: 0.07, a: 0.01, d: 0.1, s: 0.8, r: 0.05, cutoff: 900, unison: 2, spread: 40 }); // squiggle buzz
    pop(14.27, 0.16, 650);
    E.click(14.75, ui, { v: 0.12, f: 2000 }); key(15.0, 0.16); key(15.05, 0.12);
    ['D5', 'A5', 'D6'].forEach((n, i) => E.bell(15.1 + i * 0.05, n, bells, { v: 0.07, dec: 1 }));
    { const ctx = E.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(400, 15.9); o.frequency.exponentialRampToValueAtTime(1200, 16.7);
      g.gain.setValueAtTime(0, 15.9); g.gain.linearRampToValueAtTime(0.05, 16.0); g.gain.setValueAtTime(0.05, 16.65); g.gain.linearRampToValueAtTime(0, 16.72); o.connect(g); g.connect(ui); o.start(15.9); o.stop(16.8); }
    ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => E.bell(16.72 + i * 0.06, n, bells, { v: 0.09, dec: 1.6 }));
    // words
    E.whoosh(17.85, 0.6, fx, { v: 0.3, f0: 400, f1: 3500 });
    E.noiseHit(18.5, ui, { v: 0.1, dec: 0.2, type: 'bandpass', f: 2500, q: 0.6, a: 0.05 }); // page
    for (let k = 0; k < 9; k++) { const t = 19.3 + k * 0.11; for (let j = 0; j < 4; j++) E.noiseHit(t + j * 0.025, ui, { v: 0.06, dec: 0.02, type: 'bandpass', f: 3000 + j * 400, q: 2 }); } // pen scratches
    E.whoosh(20.65, 0.8, fx, { v: 0.2, f0: 700, f1: 3000 });
    pop(21.75, 0.22, 950); E.whoosh(21.8, 0.4, fx, { v: 0.15, f0: 1500, f1: 6000, pan0: -0.2, pan1: 0.8 });
    // thread + build
    E.whoosh(22.85, 0.6, fx, { v: 0.25, f0: 400, f1: 3000 });
    [23.3, 23.4, 23.5].forEach((t, i) => pop(t, 0.16, 800 + i * 150));
    E.bell(24.2, 'D5', bells, { v: 0.08, dec: 1.5 }); E.bell(24.2, 'F#5', bells, { v: 0.05, dec: 1.5 });
    E.riser(24.0, 25.9, fx, { v: 0.25, f0: 300, f1: 8000, n0: 'A3', n1: 'A5' });
    E.whoosh(25.4, 0.55, fx, { v: 0.35, f0: 3000, f1: 300 });
    for (let t = 24.0; t < 25.5; t += B / 4) E.snare(t, drums, { v: 0.12 + (t - 24) * 0.2 });
    E.reverseSwell(26.0, 0.5, fx, { v: 0.35 });
    // ---------------- 26–30: end card + sonic logo
    E.impact(26.0, fx, { v: 0.45, tail: 3.5 });
    E.pad(26.0, ['D2', 'A2', 'D3', 'F#3', 'A3', 'C#4', 'E4'], 3.8, padB, { v: 0.07, a: 0.05, d: 1.5, s: 0.7, cutoff: 2400, r: 0.4 });
    E.bass(26.0, 'D1', 3.6, bassB, { v: 0.35 });
    [['D5', 26.05], ['A5', 26.3], ['F#6', 26.55]].forEach(([n, t]) => { E.bell(t, n, bells, { v: 0.14, dec: 2.8 }); ep(t, n, 0.06); }); // sonic logo
    chordEP(26.8, ['D4', 'F#4', 'A4', 'E5'], 0.05);
    for (let t = 27.0; t < 29.6; t += 1.0) E.click(t, ui, { v: 0.04, f: 3200 }); // cursor blink
  },
};
