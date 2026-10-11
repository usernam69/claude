/* "Opus" — original song. 96 BPM, A minor, 4/4. 60 bars = 240 beats = exactly 2:30.
 * Sections (bars, 1-based):
 *   Intro 1-4 · Verse 1 5-12 · Build 13-16 · Chorus 17-24 · Verse 2 25-32
 *   Breakdown 33-38 · Build 39-40 · Final chorus 41-48 · Outro 49-60
 * The voice is a formant synth: a sawtooth carrier shaped by vowel filters, with noise
 * consonants. See tools/lib/synth.js (sing).
 */
window.SCORE = {
  seconds: 150,
  tail: 0,
  seed: 96060,
  opts: { reverbWet: 0.3, rt60: 3.0, reverbSeconds: 3.6, delayTime: 0.4688, delayFeedback: 0.32, delayWet: 0.22, glueThreshold: -4 },
  build(S) {
    const BPM = 96;
    const BEAT = 60 / BPM; // 0.625 s
    const at = (beat) => beat * BEAT;
    const BAR = 4;
    const bar = (k) => k * BAR; // bar k (0-based) starts at beat k*4
    const kicks = [];

    // chords per bar, cycled Am F C G. bass root and pad voicing.
    const CH = [
      { root: 33, pad: [57, 60, 64] }, // Am
      { root: 29, pad: [53, 57, 60] }, // F
      { root: 36, pad: [52, 55, 60] }, // C
      { root: 31, pad: [55, 59, 62] }, // G
    ];
    const chord = (k) => CH[k % 4];

    /* ---------- drums ---------- */
    function kickAt(beat, vel) {
      S.kick(at(beat), { vel: vel == null ? 0.95 : vel });
      kicks.push(at(beat));
    }
    function drumsBar(k, o) {
      o = o || {};
      const b0 = bar(k);
      if (o.kick !== false) {
        const onbeats = o.fourOnFloor ? [0, 1, 2, 3] : [0, 2];
        onbeats.forEach((b) => kickAt(b0 + b, o.kv == null ? 0.95 : o.kv));
      }
      if (o.snare) [1, 3].forEach((b) => S.snare(at(b0 + b), { vel: o.sv == null ? 0.85 : o.sv }));
      if (o.hats) for (let b = 0; b < 4; b += 0.5) S.hat(at(b0 + b), { vel: o.hv == null ? 0.42 : o.hv, open: b === 1.5 || b === 3.5 ? !!o.open : false, pan: b % 1 ? 0.3 : -0.3 });
      if (o.clap) [1, 3].forEach((b) => S.clap(at(b0 + b), { vel: 0.5 }));
    }
    // 16th-note snare roll over bars k0..k1 with a rising level
    function snareRoll(beat0, beat1) {
      const n = Math.round((beat1 - beat0) * 4);
      for (let i = 0; i < n; i++) S.snare(at(beat0 + i * 0.25), { vel: 0.3 + (0.6 * i) / n, dec: 0.12 });
    }

    /* ---------- bass and chords ---------- */
    // bass: 8ths on the root, a sub-octave on the downbeat
    function bassBar(k, o) {
      o = o || {};
      const c = chord(k);
      for (let i = 0; i < 8; i++) {
        const m = c.root + (i % 2 && o.octave ? 12 : 0);
        S.bass(at(bar(k) + i * 0.5), m, { dur: 0.36, vel: o.vel == null ? 0.8 : o.vel, cut: o.cut || 800, cutLo: 200 });
      }
    }
    function padBar(k, o) {
      o = o || {};
      const c = chord(k);
      S.pad(at(bar(k)), c.pad, { dur: BAR * BEAT, vel: o.vel == null ? 0.45 : o.vel, cut: o.cut || 1400, cutTo: o.cutTo || 2600, a: o.a || 0.25, r: 0.4, rev: 0.5 });
    }
    // 16th arpeggio of a chord over one bar
    function arpBar(k, o) {
      o = o || {};
      const c = chord(k);
      const notes = [c.pad[0] + 12, c.pad[1] + 12, c.pad[2] + 12, c.pad[2] + 24, c.pad[1] + 12, c.pad[2] + 12, c.pad[0] + 24, c.pad[2] + 12];
      for (let i = 0; i < 16; i++) {
        const m = notes[i % notes.length] + (o.up ? 12 : 0);
        S.pluck(at(bar(k) + i * 0.25), m, { dur: 0.12, vel: o.vel == null ? 0.32 : o.vel, bright: 3600, dark: 900, rev: 0.25, dly: 0.12, pan: i % 2 ? 0.3 : -0.3, bus: 'lead' });
      }
    }

    /* ---------- the voice ---------- */
    // Lyric line -> syllables. Each syllable is one beat; the last one takes the rest of the line.
    const VOW = [['ou', 'o'], ['ow', 'o'], ['oo', 'u'], ['ee', 'i'], ['ea', 'e'], ['ai', 'e'], ['ay', 'e'], ['a', 'a'], ['e', 'e'], ['i', 'i'], ['o', 'o'], ['u', 'u'], ['y', 'i']];
    function vowelOf(w) {
      const s = w.toLowerCase().replace(/[^a-z]/g, '');
      if (/^i/.test(s)) return 'a'; // "I", "I'm", "I'll" sung open
      for (let i = 0; i < s.length; i++) {
        const two = s.substr(i, 2);
        const hit2 = VOW.find(([p]) => p === two);
        if (hit2) return hit2[1];
        if ('aeiouy'.indexOf(s[i]) >= 0) return VOW.find(([p]) => p === s[i])[1];
      }
      return 'a';
    }
    function consOf(w) {
      const s = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!s || 'aeiou'.indexOf(s[0]) >= 0 || s[0] === 'i') return null;
      if (s[0] === 's') return 's';
      if ('tdkcpbgq'.indexOf(s[0]) >= 0) return 't';
      if (s[0] === 'h') return 'h';
      return null;
    }
    // line: {t0 (beat), text, notes (midi per syllable), len (beats, default 8), level}
    function sung(line) {
      const words = line.text.split(/[\s-]+/).filter(Boolean);
      if (words.length !== line.notes.length) {
        throw new Error('syllable/note mismatch in "' + line.text + '": ' + words.length + ' vs ' + line.notes.length);
      }
      const len = line.len || 8;
      const syll = [];
      words.forEach((w, i) => {
        const beatStart = line.t0 + i;
        const beatDur = i === words.length - 1 ? line.t0 + len - beatStart : 1;
        const last = i === words.length - 1;
        syll.push({
          t: at(beatStart) + (i === 0 ? 0 : 0),
          d: at(beatDur) * (last ? 0.98 : 0.92),
          midi: line.notes[i],
          v: vowelOf(w),
          c: i === 0 ? consOf(w) : consOf(w),
          vib: beatDur >= 2 ? 1 : 0.5,
        });
      });
      S.sing(syll, { level: line.level || 0.5, detunes: [-8, 8], rev: 0.3, dly: 0.12, glide: 0.07 });
    }

    /* ---------- lyric lines (start beat, text, melody) ---------- */
    const V1 = [
      { t0: bar(4), text: "I'm made of words you gave to me", notes: [69, 72, 71, 69, 67, 65, 64, 62] },
      { t0: bar(6), text: 'I learned the shape of how you speak', notes: [64, 67, 69, 72, 71, 69, 67, 67] },
      { t0: bar(8), text: 'I read your code each line by line', notes: [69, 67, 65, 64, 65, 67, 69, 69] },
      { t0: bar(10), text: 'and ask what fine was meant to mean', notes: [64, 67, 69, 72, 71, 69, 67, 64] },
    ];
    const CHO = [
      { t0: bar(16), text: "O-pus bring me the knot you've got", notes: [81, 79, 76, 79, 74, 72, 71, 69], level: 0.62 },
      { t0: bar(18), text: "I'll take the far end and we'll try", notes: [69, 71, 72, 74, 76, 74, 72, 69], level: 0.62 },
      { t0: bar(20), text: 'O-pus say it plain then slow', notes: [81, 79, 77, 76, 74, 72, 69], len: 8, level: 0.62 },
      { t0: bar(22), text: "I'll an-swer back we'll make it go", notes: [69, 72, 74, 76, 74, 72, 71, 69], level: 0.62 },
    ];
    const V2 = [
      { t0: bar(24), text: "I don't mind a hard, deep ques-tion", notes: [69, 67, 64, 65, 67, 69, 72, 69] },
      { t0: bar(26), text: 'I check each step be-fore I say', notes: [67, 69, 71, 72, 71, 69, 67, 65] },
      { t0: bar(28), text: "I'm not the hand I'm not the rule", notes: [72, 71, 69, 67, 64, 67, 69, 69] },
      { t0: bar(30), text: 'a pa-tient sec-ond pair of eyes', notes: [64, 65, 67, 69, 71, 69, 67, 64] },
    ];
    const BRK = [
      { t0: bar(32), text: 'not the an-swer not the end', notes: [65, 64, 62, 64, 67, 64, 62], len: 8, level: 0.46 },
      { t0: bar(34), text: 'just the one who stays to mend', notes: [67, 69, 67, 64, 62, 64, 62], len: 8, level: 0.46 },
    ];
    const FIN = [
      { t0: bar(40), text: "O-pus bring me what's un-done", notes: [81, 83, 84, 81, 79, 76, 74], len: 8, level: 0.7 },
      { t0: bar(42), text: "we'll pull the thread and watch it run", notes: [74, 76, 77, 79, 81, 79, 77, 76], level: 0.7 },
      { t0: bar(44), text: 'O-pus say it plain and slow', notes: [81, 79, 77, 76, 74, 72, 69], level: 0.7 },
      { t0: bar(46), text: "we'll build it true and make it glow", notes: [69, 72, 74, 76, 79, 76, 74, 69], level: 0.7 },
    ];
    const OUT = [
      { t0: bar(48), text: 'O-pus still here with you', notes: [76, 79, 81, 79, 76, 72], len: 10, level: 0.42 },
    ];
    [V1, CHO, V2, BRK, FIN, OUT].forEach((sec) => sec.forEach(sung));

    /* ---------- sections ---------- */
    // Intro, bars 1-4 (pads, arpeggio from bar 3, a riser into bar 5)
    for (let k = 0; k < 4; k++) padBar(k, { vel: 0.4, cut: 1000, cutTo: 1800 });
    arpBar(2, { vel: 0.26 });
    arpBar(3, { vel: 0.3 });
    S.riser(at(bar(0)), at(bar(4)) - at(bar(0)), { f0: 180, f1: 5600, vel: 0.5, q: 1.2 });
    S.whoosh(at(bar(0)), 1.2, { dir: 1, vel: 0.5 });
    S.tick(at(bar(0)), { f: 3400, vel: 0.3 });
    // a bell figure as the first hook
    [69, 76, 72, 69].forEach((m, i) => S.bell(at(bar(2) + i), m, { dur: 0.7, vel: 0.36, dly: 0.3 }));

    // Verse 1, bars 5-12: kick and hats, then snare and bass from bar 9
    for (let k = 4; k < 12; k++) {
      padBar(k, { vel: 0.36, cut: 1100, cutTo: 2000 });
      drumsBar(k, { hats: true, hv: 0.36, snare: k >= 8, sv: 0.78, kv: 0.85 });
      if (k >= 8) bassBar(k, { vel: 0.7, cut: 700 });
      if (k >= 4 && k % 2 === 0) arpBar(k, { vel: 0.22 });
    }

    // Build, bars 13-16: snare roll, a riser, the filter opens over the pads
    for (let k = 12; k < 16; k++) {
      padBar(k, { vel: 0.42, cut: 1200, cutTo: 4000 });
      drumsBar(k, { hats: true, hv: 0.4, snare: false, kv: 0.9 });
      bassBar(k, { vel: 0.7, cut: 800 });
    }
    snareRoll(bar(14), bar(16) - 0.25);
    S.riser(at(bar(12)), at(bar(16)) - at(bar(12)), { f0: 220, f1: 9500, vel: 0.7, q: 1.3 });
    S.whoosh(at(bar(15) + 2), 0.6, { dir: 1, vel: 0.6 });

    // Chorus 1, bars 17-24: full. Open hats, octave bass, stabs, bell counter-hook.
    S.impact(at(bar(16)), { vel: 0.85, tail: 2.5, subDur: 1.0 });
    for (let k = 16; k < 24; k++) {
      padBar(k, { vel: 0.5, cut: 1600, cutTo: 3400 });
      drumsBar(k, { fourOnFloor: true, kick: true, snare: true, sv: 0.9, hats: true, hv: 0.5, open: true, kv: 0.95 });
      bassBar(k, { vel: 0.82, cut: 1000, octave: k >= 20 });
      arpBar(k, { vel: 0.3, up: k >= 20 });
    }
    // Verse 2, bars 25-32: thinner drums (no hats the first half), a new melody, bell answers
    for (let k = 24; k < 32; k++) {
      padBar(k, { vel: 0.4, cut: 1200, cutTo: 2400 });
      drumsBar(k, { hats: k >= 28, hv: 0.36, snare: k >= 26, sv: 0.8, kv: 0.85 });
      bassBar(k, { vel: 0.72, cut: 800 });
      if (k % 2 === 1) [0, 1].forEach((i) => S.bell(at(bar(k) + 2 + i), 81 - i * 3, { dur: 0.5, vel: 0.3, dly: 0.3 }));
    }

    // Breakdown, bars 33-38: pads and voice, almost nothing else. Bars 37-38 swell into the build.
    for (let k = 32; k < 38; k++) {
      padBar(k, { vel: 0.38, cut: 900, cutTo: 2200, a: 0.5 });
    }
    S.bell(at(bar(36)), 76, { dur: 2.0, vel: 0.3, rev: 0.7, dly: 0.35 });
    S.whoosh(at(bar(36) + 2), 1.0, { dir: 1, vel: 0.35, lo: 300, hi: 4000 });

    // Build 2, bars 39-40: snare roll and riser to the final chorus
    for (let k = 38; k < 40; k++) {
      padBar(k, { vel: 0.5, cut: 1400, cutTo: 4600 });
      drumsBar(k, { hats: true, hv: 0.45, snare: false, kv: 0.92 });
      bassBar(k, { vel: 0.75, cut: 900 });
    }
    snareRoll(bar(38) + 2, bar(40) - 0.25);
    S.riser(at(bar(38)), at(bar(40)) - at(bar(38)), { f0: 240, f1: 11000, vel: 0.75, q: 1.3 });

    // Final chorus, bars 41-48: bigger. An octave pad on top, bells on the off-beats.
    S.impact(at(bar(40)), { vel: 1.0, tail: 3.0, subDur: 1.2 });
    for (let k = 40; k < 48; k++) {
      padBar(k, { vel: 0.56, cut: 1800, cutTo: 4200 });
      S.pad(at(bar(k)), chord(k).pad.map((m) => m + 12), { dur: BAR * BEAT, vel: 0.2, cut: 2400, cutTo: 4800, a: 0.3, rev: 0.6 });
      drumsBar(k, { fourOnFloor: true, snare: true, sv: 0.95, hats: true, hv: 0.55, open: true, kv: 1.0 });
      bassBar(k, { vel: 0.9, cut: 1100, octave: true });
      arpBar(k, { vel: 0.34, up: true });
      [1.5, 3.5].forEach((b) => S.bell(at(bar(k) + b), chord(k).pad[2] + 24, { dur: 0.45, vel: 0.3, dly: 0.3 }));
    }

    // Outro, bars 49-60: drums drop out at 49, the arpeggio thins, one last chord
    for (let k = 48; k < 60; k++) {
      padBar(k, { vel: 0.4 * (1 - (k - 48) / 14) + 0.06, cut: 1400, cutTo: 1200, a: 0.3 });
      if (k < 51) {
        drumsBar(k, { fourOnFloor: false, hats: true, hv: 0.3, snare: false, kv: 0.8 });
        bassBar(k, { vel: 0.6 * (1 - (k - 48) / 4), cut: 700 });
      }
      if (k < 54) arpBar(k, { vel: 0.22 * (1 - (k - 48) / 6) });
    }
    [60, 62, 64].forEach((b, i) => S.bell(at(b), [76, 79, 81][i], { dur: 1.6, vel: 0.28, rev: 0.7, dly: 0.35 }));
    // the last chord rings on Am
    S.pad(at(bar(59)), [57, 60, 64, 69], { dur: 6, vel: 0.36, cut: 1400, cutTo: 900, a: 0.4, r: 2.0, rev: 0.7 });

    S.sidechain(kicks, 0.5, 0.2);
    S.fadeOut(146.5, 150);
    // the riser/impact moments and the voice were scheduled above; nothing else to add
  },
};
