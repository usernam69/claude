// Opus 5.5 launch trailer — synthesized score. 120 BPM, D minor. Every hit is
// placed on the same timestamps the picture uses (see BEATSHEET.md).
window.SCORE = {
  duration: 18, seed: 55,
  build(E) {
    const B = 0.5, BAR = 2;
    const sub = E.bus('sub', { gain: 0.9 });
    const fx = E.bus('fx', { gain: 0.7, reverb: 0.35, irSec: 3.5 });
    const ui = E.bus('ui', { gain: 0.5, reverb: 0.15, hp: 300 });
    const drums = E.bus('drums', { gain: 0.8, reverb: 0.06 });
    const hats = E.bus('hats', { gain: 0.35, reverb: 0.1 });
    const bass = E.bus('bass', { gain: 0.7 });
    const pad = E.bus('pad', { gain: 0.55, reverb: 0.5, irSec: 4 });
    const lead = E.bus('lead', { gain: 0.42, reverb: 0.3, delay: 0.22, delayTime: 0.375 });
    const bells = E.bus('bells', { gain: 0.45, reverb: 0.6, irSec: 5, delay: 0.3, delayTime: 0.75 });
    const blead = E.bus('blead', { gain: 0.95, reverb: 0.35, delay: 0.25, delayTime: 0.375 });
    const tail = E.bus('tail', { gain: 0.9, reverb: 0.9, irSec: 6, irDecay: 2.2 });

    // ---- 0.0 cold open: slam
    E.subBoom(0.0, sub, { v: 0.75, f0: 120, f1: 32, dec: 2.0 });
    E.noiseHit(0.0, fx, { v: 0.6, dec: 0.12, type: 'highpass', f: 2500 });
    E.pad(0.0, ['D2', 'A2'], 2.1, pad, { v: 0.09, a: 0.05, cutoff: 500, r: 0.6 });
    // typing ticks (13 chars from 0.55, every 65 ms) + blink ticks
    for (let i = 0; i < 13; i++) if (i !== 1 && i !== 7) E.click(0.55 + i * 0.065, ui, { v: 0.22, f: 2600 + (i % 3) * 300, pan: (i / 12 - 0.5) * 0.4 });
    [0.5, 1.5].forEach((t) => E.bell(t, 'D6', bells, { v: 0.05, dec: 0.6 }));

    // ---- 2.0 line stretch whoosh; hook enters
    E.whoosh(1.62, 0.5, fx, { v: 0.6, f0: 300, f1: 5000 });
    E.reverseSwell(2.0, 0.6, fx, { v: 0.22 });

    // hook (8ths), per bar, D minor: Dm | Bb | F | C
    const hook = [
      ['D5', null, 'A4', 'C5', 'D5', null, 'F5', 'E5'],
      ['D5', null, 'A4', 'C5', 'Bb4', null, 'A4', 'F4'],
      ['C5', null, 'A4', 'C5', 'F5', null, 'E5', 'C5'],
      ['E5', null, 'D5', 'C5', 'G4', null, 'A4', 'C5'],
    ];
    const chords = [['D3', 'F3', 'A3', 'E4'], ['Bb2', 'D3', 'F3', 'A3'], ['F2', 'A2', 'C3', 'G3'], ['C3', 'E3', 'G3', 'D4']];
    const roots = ['D2', 'Bb1', 'F1', 'C2'];
    // build section 2.0–7.75: filtered plucks, opening up
    for (let bar = 0; bar < 3; bar++) {
      const t0 = 2 + bar * BAR;
      hook[bar].forEach((n, k) => {
        const t = t0 + k * (B / 2); if (!n || t >= 7.75) return;
        const open = (t - 2) / 5.75;
        E.pluck(t, n, blead, { v: 0.36, a: 0.004, cutoff: 700 + open * 1600, cutEnv: 1200 + open * 3000, pan: k % 2 ? 0.25 : -0.25 });
      });
      E.pad(t0, chords[bar], BAR - 0.05, pad, { v: 0.085, cutoff: 600 + bar * 300, a: 0.3 });
    }
    E.pad(7.0, ['C3', 'E3', 'G3', 'D4'], 0.75, pad, { v: 0.06, cutoff: 1200, a: 0.1, r: 0.15 });

    // 4.0 graph: low boom + soft whoosh; riser 4.0 → 7.75
    E.subBoom(4.0, sub, { v: 0.38, f0: 80, f1: 34, dec: 1.4 });
    E.whoosh(3.7, 0.55, fx, { v: 0.35, f0: 800, f1: 3000, pan0: 0.5, pan1: -0.5 });
    E.riser(4.0, 7.75, fx, { v: 0.35, f0: 250, f1: 9000, n0: 'D3', n1: 'D5' });
    // pulse blips on the graph pulses
    [4.5, 5.0, 5.5].forEach((t, i) => E.bell(t, ['A5', 'C6', 'D6'][i], bells, { v: 0.09, dec: 0.5, pan: (i - 1) * 0.4 }));
    // heartbeat kick: 1 & 3 (4–6), every beat (6–7.5)
    for (let t = 4.0; t < 6.0; t += 1.0) E.kick(t, drums, { v: 0.6, dec: 0.3 });
    for (let t = 6.0; t < 7.5; t += 0.5) E.kick(t, drums, { v: 0.75, dec: 0.3 });
    // 6.0 build: whoosh + block pops (15 blocks, 30 ms stagger)
    E.whoosh(5.72, 0.4, fx, { v: 0.35, f0: 500, f1: 4000 });
    for (let i = 0; i < 15; i++) E.click(6.0 + i * 0.03 + 0.12, ui, { v: 0.16, f: 1400 + (i % 5) * 220, pan: ((i * 7) % 15 / 14 - 0.5) * 0.8 });
    // 7.0 check: bell chord ding + swish
    ['D5', 'A5', 'E6'].forEach((n, i) => E.bell(7.02 + i * 0.012, n, bells, { v: 0.11, dec: 1.4, pan: (i - 1) * 0.3 }));
    E.whoosh(6.95, 0.35, fx, { v: 0.25, f0: 1500, f1: 7000, pan0: -0.3, pan1: 0.4 });
    // snare roll 7.0 → 7.75, accelerating
    { let t = 7.0, step = 0.125; let i = 0; while (t < 7.74) { E.snare(t, drums, { v: 0.25 + 0.5 * (t - 7) / 0.75 }); t += step; step = Math.max(0.03, step * 0.85); i++; } }
    // 7.5 suck-in: reverse swell into the drop, silence 7.75–8.0 (only the swell)
    E.reverseSwell(8.0, 0.5, fx, { v: 0.45 });

    // ---- 8.0 DROP
    E.impact(8.0, tail, { v: 0.9, tail: 2.5 });
    E.subBoom(8.0, sub, { v: 0.9, f0: 100, f1: 30, dec: 1.6 });
    const dropEnd = 13.0;
    const kicks = [];
    for (let t = 8.0; t < dropEnd - 0.01; t += B) { E.kick(t, drums, { v: 0.95 }); kicks.push(t); }
    for (let t = 8.5; t < dropEnd; t += 1.0) E.clap(t, drums, { v: 0.7 });
    for (let t = 8.0; t < dropEnd; t += B / 2) { const off = Math.round((t - 8) / (B / 2)) % 2 === 1; E.hat(t, hats, { v: off ? 0.5 : 0.2, open: off && Math.round((t - 8) / (B / 2)) % 4 === 3, pan: off ? 0.2 : -0.2 }); }
    // bass 8ths with octave bounce, sidechained
    const dropChords = [0, 1, 2, 3]; // Dm(8–10) Bb(10–12) F(12–13) C(13–14 tension, drums out)
    for (let t = 8.0; t < dropEnd; t += B / 2) {
      const bar = t < 10 ? 0 : t < 12 ? 1 : 2; const k = Math.round((t - 8) / (B / 2));
      const r = roots[bar]; const n = Synth.n2m(r) + (k % 2 ? 12 : 0);
      E.bass(t, Synth.midi(n), B / 2 - 0.03, bass, { v: 0.5 });
    }
    E.pad(8.0, chords[0], 2, pad, { v: 0.1, cutoff: 2600, a: 0.02 });
    E.pad(10.0, chords[1], 2, pad, { v: 0.1, cutoff: 2600, a: 0.02 });
    E.pad(12.0, chords[2], 1, pad, { v: 0.1, cutoff: 2600, a: 0.02 });
    E.duck('pad', kicks, 0.55); E.duck('bass', kicks, 0.7, 0.18); E.duck('lead', kicks, 0.25);
    // lead hook, brighter, an octave up on the second pass
    for (let bar = 0; bar < 3; bar++) {
      const t0 = 8 + bar * BAR; const ph = bar === 2 ? hook[2] : hook[bar];
      ph.forEach((n, k) => { if (!n) return; const t = t0 + k * (B / 2); if (t >= dropEnd) return;
        E.voice(t, Synth.hz(n), B / 2 * 0.8, lead, { type: 'sawtooth', v: 0.18, a: 0.004, d: 0.18, s: 0.5, r: 0.12, unison: 3, spread: 16, cutoff: 2800, cutEnv: 2500, fdec: 0.15 });
        E.bell(t, n, bells, { v: 0.05, dec: 0.5 }); });
    }
    // whips on word changes
    [8.4, 9.33, 10.33, 11.33].forEach((t, i) => E.whoosh(t - 0.05, 0.3, fx, { v: 0.38, f0: 600, f1: 6000, pan0: 0.7, pan1: -0.7 }));
    // 12.0 "is code." accent
    E.subBoom(12.0, sub, { v: 0.5, f0: 90, f1: 40, dec: 0.8 });
    E.bell(12.0, 'A5', bells, { v: 0.12, dec: 1.2 }); E.bell(12.0, 'D6', bells, { v: 0.08, dec: 1.2 });

    // ---- 13.0 → 14.0: drums out, C chord tension, riser, takeover whoosh
    E.pad(13.0, chords[3], 1.0, pad, { v: 0.1, cutoff: 1800, a: 0.05, r: 0.2 });
    E.bass(13.0, 'C2', 0.9, bass, { v: 0.45 });
    E.riser(13.0, 13.92, fx, { v: 0.4, f0: 500, f1: 12000, n0: 'G3', n1: 'G5' });
    E.whoosh(12.9, 0.62, fx, { v: 0.5, f0: 200, f1: 3500, pan0: -0.2, pan1: 0.2 });
    E.whoosh(13.45, 0.45, fx, { v: 0.4, f0: 3000, f1: 400, pan0: 0.3, pan1: -0.3 });
    E.reverseSwell(14.0, 0.5, fx, { v: 0.5 });

    // ---- 14.0 REVEAL: big impact, long tail, pad bloom, soft hook on bells
    E.impact(14.0, tail, { v: 1.0, tail: 4.5 });
    E.subBoom(14.0, sub, { v: 1.0, f0: 110, f1: 28, dec: 3.5 });
    E.pad(14.0, ['D2', 'A2', 'D3', 'F3', 'A3', 'E4'], 3.6, pad, { v: 0.11, a: 0.04, d: 1.5, s: 0.7, cutoff: 2200, r: 0.5 });
    E.bass(14.0, 'D1', 3.4, bass, { v: 0.4 });
    ['D5', 'A4', 'C5', 'D5', 'F5', 'E5'].forEach((n, i) => E.bell(14.5 + [0, 0.25, 0.5, 0.75, 1.0, 1.5][i], n, bells, { v: 0.085, dec: 1.8, pan: (i % 2 ? 0.3 : -0.3) }));
    E.bell(16.5, 'D5', bells, { v: 0.1, dec: 2.5 }); E.bell(16.5, 'A5', bells, { v: 0.06, dec: 2.5 });
    // cursor blink ticks on the beat during the hold
    for (let t = 15.0; t < 17.6; t += 1.0) E.click(t, ui, { v: 0.06, f: 3200 });
  },
};
