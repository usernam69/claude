// "Opus" — an original song by Claude Opus 5.5 about itself. 120 BPM, A minor → B minor.
// Everything, including the singing voice, is synthesized with the Web Audio API.
// window.__STEM = 'vocals' | 'music' renders a single stem (used to check intelligibility).
window.SCORE = {
  duration: 151, seed: 2026,
  build(E) {
    const ctx = E.ctx, BEAT = 0.5, BAR = 2;
    const STEM = window.__STEM || 'all';
    const T = (bar, beat = 0) => bar * BAR + beat * BEAT;
    const r = E.rand;
    const mute = (name) => (STEM === 'vocals' && name !== 'vox' && name !== 'voxfx') || (STEM === 'music' && (name === 'vox' || name === 'voxfx'));
    const bus = (name, o) => { const b = E.bus(name, o); if (mute(name)) b.out.gain.value = 0; return b; };

    // ---------- buses
    const kickB = bus('kick', { gain: 0.95 });
    const drums = bus('drums', { gain: 0.6, reverb: 0.12, irSec: 1.5 });
    const hats = bus('hats', { gain: 0.32, reverb: 0.08, hp: 400 });
    const bassB = bus('bass', { gain: 0.62, lp: 5000 });
    const padB = bus('pad', { gain: 0.42, reverb: 0.55, irSec: 4, hp: 120 });
    const arpB = bus('arp', { gain: 0.3, reverb: 0.3, delay: 0.3, delayTime: 0.375, delayFb: 0.4, hp: 200 });
    const leadB = bus('lead', { gain: 0.3, reverb: 0.35, delay: 0.25, delayTime: 0.75, hp: 200 });
    const fxB = bus('fx', { gain: 0.5, reverb: 0.5, irSec: 4, hp: 80 });
    const vox = bus('vox', { gain: 0.3, reverb: 0.32, irSec: 2.6, delay: 0.16, delayTime: 0.375, delayFb: 0.3, hp: 150 });
    const voxfx = bus('voxfx', { gain: 0.1, reverb: 0.7, irSec: 4, hp: 200 });

    // ---------- harmony / sections
    const CH = { Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], E: ['E', 'G#', 'B'], D: ['D', 'F#', 'A'], A: ['A', 'C#', 'E'], Bm: ['B', 'D', 'F#'] };
    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const pc = (n) => NOTE[n];
    const m = (name) => Synth.n2m(name);
    const prog = [];
    const put = (b0, chords) => chords.forEach((c, i) => (prog[b0 + i] = c));
    const vAmFCG = ['Am', 'F', 'C', 'G'], vFGCAm = ['F', 'G', 'C', 'Am'];
    put(0, [...vAmFCG, ...vAmFCG]);                                  // intro 0–7
    put(8, [...vAmFCG, ...vAmFCG, ...vAmFCG, ...vAmFCG]);            // verse 1 8–23
    put(24, ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E']);              // build 24–31
    put(32, [...vFGCAm, ...vFGCAm, ...vFGCAm, ...vFGCAm]);            // chorus 32–47
    put(48, [...vAmFCG, ...vAmFCG]);                                  // verse 2 48–55
    put(56, ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E']);              // breakdown 56–63
    put(64, ['G', 'A', 'D', 'Bm', 'G', 'A', 'D', 'Bm']);              // final chorus (+2) 64–71
    put(72, ['G', 'A', 'Bm']);                                        // outro 72–74
    const KEYUP = (bar) => (bar >= 64 ? 2 : 0);
    const chordMidis = (c, oct) => CH[c].map((n) => { let v = pc(n) + 12 * (oct + 1); return v; }).map((v, i, a) => (i > 0 && v < a[i - 1] ? v + 12 : v));
    const rootMidi = (c, oct) => pc(CH[c][0]) + 12 * (oct + 1);
    const sec = (b) => b < 4 ? 'introA' : b < 8 ? 'introB' : b < 16 ? 'v1a' : b < 24 ? 'v1b' : b < 32 ? 'build' : b < 40 ? 'ch1a' : b < 48 ? 'ch1b' : b < 56 ? 'v2' : b < 64 ? 'bd' : b < 72 ? 'fin' : 'outro';

    // ---------- instruments
    const swing = (k16) => (k16 % 2 === 1 ? 0.018 : 0); // light 16th swing
    const vel = (base, spread = 0.25) => base * (1 - spread / 2 + r() * spread);
    const kicks = [];
    const kick = (t, v = 1) => { E.kick(t, kickB, { v, f0: 140, f1: 44, dec: 0.38, click: 0.35 }); kicks.push(t); };
    const clap = (t, v = 0.8) => { E.clap(t, drums, { v }); E.snare(t, drums, { v: v * 0.35, tone: 200 }); };
    const hat = (t, v = 0.35, open = false) => E.hat(t, hats, { v, open, pan: (r() - 0.5) * 0.3 });
    const bassNote = (t, midiN, dur, v = 0.5) => E.bass(t, Synth.midi(midiN), dur, bassB, { v, saw: { v: 0.16, cutoff: 420, cutEnv: 1400, fdec: 0.1 } });
    const pad = (t, notes, dur, v = 0.07, cutoff = 1800) => notes.forEach((n, i) => E.voice(t, Synth.midi(n), dur, padB, { type: 'sawtooth', v, a: 0.25, d: 0.6, s: 0.8, r: 0.6, unison: 3, spread: 22, cutoff, pan: (i / Math.max(1, notes.length - 1) - 0.5) * 0.8 }));
    const arpNote = (t, n, v = 0.16, cut = 1800) => E.voice(t, Synth.midi(n), 0.05, arpB, { type: 'square', v, a: 0.002, d: 0.16, s: 0, r: 0.12, cutoff: cut, cutEnv: 2500, fdec: 0.08, pan: (r() - 0.5) * 0.7 });
    const leadNote = (t, n, dur, v = 0.13) => { E.voice(t, Synth.midi(n), dur, leadB, { type: 'sawtooth', v, a: 0.01, d: 0.3, s: 0.6, r: 0.25, unison: 3, spread: 14, cutoff: 3200, cutEnv: 2000, fdec: 0.2 }); E.bell(t, Synth.midi(n + 12), leadB, { v: v * 0.25, dec: 0.6 }); };

    // ---------- arrangement, bar by bar
    for (let b = 0; b < (STEM === 'vocals' ? 0 : 75); b++) {
      const c = prog[b], s = sec(b), up = KEYUP(b), t0 = T(b);
      const cm = chordMidis(c, 3), root = rootMidi(c, 1);
      // pads (every section; filter opens with energy)
      const padCut = { introA: 700 + b * 120, introB: 1300, v1a: 1300, v1b: 1600, build: 1400 + (b - 24) * 250, ch1a: 2600, ch1b: 3000, v2: 1500, bd: 1100 + (b - 56) * 200, fin: 3200, outro: 1500 }[s];
      const padV = { introA: 0.06, introB: 0.065, v1a: 0.05, v1b: 0.05, build: 0.06, ch1a: 0.07, ch1b: 0.075, v2: 0.05, bd: 0.075, fin: 0.08, outro: 0.07 }[s];
      const ninth = cm[0] + 14;
      if (s !== 'outro' || b < 74) pad(t0, [cm[0], cm[1], cm[2], s.startsWith('ch') || s === 'fin' || s === 'bd' ? ninth : cm[0] + 12], BAR - 0.05, padV, padCut);
      else pad(t0, [cm[0], cm[1], cm[2], cm[0] + 12, ninth], 4.5, 0.08, 1500);
      // arp (16ths) — introB, v1b, build, choruses, v2, fin
      if (['introB', 'v1b', 'build', 'ch1a', 'ch1b', 'v2', 'fin'].includes(s)) {
        const pattern = [0, 1, 2, 1, 3, 2, 1, 2]; const tones = [cm[0] + 12, cm[1] + 12, cm[2] + 12, cm[0] + 24];
        const cut = s === 'introB' ? 600 + (b - 4) * 350 : s === 'build' ? 900 + (b - 24) * 300 : s === 'v2' ? 1400 : 2200;
        for (let k = 0; k < 16; k++) { if (s === 'v2' && k % 2) continue; arpNote(t0 + k * BEAT / 4 + swing(k), tones[pattern[k % 8]], vel(s === 'introB' ? 0.1 + (b - 4) * 0.02 : 0.15), cut); }
      }
      // drums
      const fill = (b === 31 || b === 63 || b === 47);
      if (['v1a', 'v1b', 'build', 'ch1a', 'ch1b', 'fin'].includes(s)) {
        const four = s.startsWith('ch') || s === 'fin' || (s === 'build' && b >= 28);
        for (let k = 0; k < 4; k++) { if (four || k === 0 || (s === 'v1b' && k === 2) || (s === 'build' && k === 2)) if (!(b === 63)) kick(t0 + k * BEAT, k === 0 ? 1 : 0.9); }
        if (s !== 'v1a' && !(fill && b === 31)) { clap(t0 + BEAT, 0.75); clap(t0 + 3 * BEAT, 0.8); }
        const h16 = s === 'build' || s.startsWith('ch') || s === 'fin';
        for (let k = 0; k < (h16 ? 16 : 8); k++) { const step = h16 ? BEAT / 4 : BEAT / 2; const off = h16 ? k % 4 === 2 : k % 2 === 1;
          hat(t0 + k * step + (h16 ? swing(k) : 0), vel(off ? 0.42 : 0.18), (s === 'ch1b' || s === 'fin') && off && k % 8 === 6); }
      }
      if (s === 'v2') { kick(t0); kick(t0 + 2.5 * BEAT, 0.8); clap(t0 + 2 * BEAT, 0.7); for (let k = 0; k < 8; k++) hat(t0 + k * BEAT / 2, vel(k % 2 ? 0.35 : 0.15)); }
      if (s === 'introB' && b >= 6) for (let k = 0; k < 4; k++) hat(t0 + k * BEAT + BEAT / 2, 0.15 + (b - 6) * 0.08);
      // snare roll into the chorus / final chorus
      if (b === 30 || b === 31) { const n = b === 30 ? 8 : 16; for (let k = 0; k < n; k++) E.snare(t0 + k * BAR / n, drums, { v: 0.2 + 0.5 * ((b - 30) * n + k) / 24 }); }
      if (b === 47) for (let k = 0; k < 8; k++) E.snare(t0 + BAR / 2 + k * BAR / 16, drums, { v: 0.2 + k * 0.05 });
      // bass
      if (['v1a'].includes(s)) { bassNote(t0, root + up, 0.9, 0.5); bassNote(t0 + 2.5 * BEAT, root + up, 0.4, 0.4); bassNote(t0 + 3.5 * BEAT, root + 12 + up, 0.2, 0.3); }
      if (['v1b', 'build'].includes(s)) for (let k = 0; k < 8; k++) bassNote(t0 + k * BEAT / 2, root + up + (k % 4 === 3 ? 12 : 0), BEAT / 2 - 0.04, k % 2 ? 0.38 : 0.5);
      if (['ch1a', 'ch1b', 'fin'].includes(s)) for (let k = 0; k < 8; k++) bassNote(t0 + k * BEAT / 2, root + up + (k % 2 ? 12 : 0), BEAT / 2 - 0.05, k % 2 ? 0.4 : 0.55);
      if (s === 'v2') { [0, 0.75, 1.5, 2.5, 3.0].forEach((bt, i) => bassNote(t0 + bt * BEAT, root + up + (i === 3 ? 7 : 0), 0.22, 0.48)); }
      if (s === 'bd' && b >= 60) bassNote(t0, root + up, BAR - 0.1, 0.35);
      if (s === 'outro' && b < 74) bassNote(t0, root + up, BAR - 0.05, 0.4);
      if (b === 74) bassNote(t0, root + up, 4.5, 0.45);
    }
    // ---------- lead hook (intro B, chorus 1b counter-melody, final chorus)
    const hook = [['E5', 0, 0.5], ['C5', 1, 0.5], ['D5', 1.5, 0.5], ['E5', 2, 1], ['G5', 3, 0.5], ['E5', 3.5, 0.5], ['D5', 4, 1], ['C5', 5, 0.5], ['A4', 5.5, 2]];
    const playHook = (bar, up = 0, v = 0.12) => STEM !== 'vocals' && hook.forEach(([n, bt, d]) => leadNote(T(bar, bt), m(n) + up, d * BEAT, v));
    playHook(4, 0, 0.09); playHook(6, 0, 0.11);
    [40, 42, 44, 46].forEach((b) => playHook(b, 12 - 12, 0.08));
    [64, 66, 68, 70].forEach((b) => playHook(b, 2, 0.11));
    // ---------- FX: risers, impacts, reverse swells, crash
    E.riser(T(6), T(8), fxB, { v: 0.22, f0: 300, f1: 8000, n0: 'A3', n1: 'A5' });
    E.riser(T(28), T(32), fxB, { v: 0.32, f0: 200, f1: 11000, n0: 'E3', n1: 'E5' });
    E.reverseSwell(T(32), 1.0, fxB, { v: 0.35 });
    E.impact(T(32), fxB, { v: 0.7, tail: 3 });
    E.whoosh(T(47, 2), 1.0, fxB, { v: 0.25 });
    E.riser(T(60), T(63, 3), fxB, { v: 0.32, f0: 250, f1: 12000, n0: 'E3', n1: 'E5' });
    E.reverseSwell(T(64), 0.8, fxB, { v: 0.4 });
    E.impact(T(64), fxB, { v: 0.8, tail: 3.5 });
    E.impact(T(8), fxB, { v: 0.35, tail: 2 }); E.impact(T(48), fxB, { v: 0.3, tail: 2 }); E.impact(T(72), fxB, { v: 0.45, tail: 4 });
    [32, 64].forEach((b) => E.noiseHit(T(b), drums, { v: 0.35, dec: 1.6, type: 'highpass', f: 5000, q: 0.4 })); // crash
    E.duck('pad', kicks, 0.5, 0.25); E.duck('bass', kicks, 0.75, 0.16); E.duck('arp', kicks, 0.35, 0.2); E.duck('lead', kicks, 0.2, 0.2);

    // =====================================================================
    // FORMANT VOICE
    // =====================================================================
    const VW = { iy: [270, 2290, 3010], ih: [390, 1990, 2550], eh: [530, 1840, 2480], ae: [660, 1720, 2410], aa: [730, 1090, 2440], ao: [570, 840, 2410],
      uh: [440, 1020, 2240], uw: [300, 870, 2240], ah: [640, 1190, 2390], er: [490, 1350, 1690] };
    const DIPH = { ay: ['aa', 'iy'], ey: ['eh', 'iy'], ow: ['ao', 'uw'], aw: ['aa', 'uw'], oy: ['ao', 'iy'] };
    // consonants: f = formants (voiced part), amp = voicing level, n = noise [type, freq, Q, amp], dur, stop = closure then burst
    const CN = {
      l: { f: [380, 950, 2600], amp: 0.6, dur: 0.07 }, r: { f: [420, 1250, 1600], amp: 0.6, dur: 0.07 }, w: { f: [300, 650, 2200], amp: 0.5, dur: 0.07 }, y: { f: [260, 2100, 3000], amp: 0.55, dur: 0.06 },
      m: { f: [280, 1000, 2300], amp: 0.35, dur: 0.07, nasal: true }, n: { f: [280, 1600, 2600], amp: 0.35, dur: 0.07, nasal: true }, ng: { f: [280, 2000, 2700], amp: 0.35, dur: 0.07, nasal: true },
      s: { amp: 0, n: ['bandpass', 6500, 1.3, 0.7], dur: 0.1 }, z: { f: [300, 1500, 2500], amp: 0.25, n: ['bandpass', 6000, 1.3, 0.3], dur: 0.08 },
      sh: { amp: 0, n: ['bandpass', 2900, 1.4, 0.7], dur: 0.1 }, zh: { f: [300, 1700, 2500], amp: 0.25, n: ['bandpass', 2700, 1.4, 0.3], dur: 0.08 },
      f: { amp: 0, n: ['bandpass', 5200, 0.6, 0.32], dur: 0.09 }, v: { f: [300, 1200, 2400], amp: 0.3, n: ['bandpass', 5000, 0.6, 0.12], dur: 0.06 },
      th: { amp: 0, n: ['bandpass', 6200, 0.7, 0.24], dur: 0.08 }, dh: { f: [300, 1300, 2500], amp: 0.35, n: ['bandpass', 5000, 0.7, 0.06], dur: 0.05 },
      hh: { amp: 0.08, n: ['bandpass', 1600, 0.6, 0.45], dur: 0.09, colour: true },
      p: { amp: 0, stop: true, n: ['bandpass', 1300, 0.35, 0.75], dur: 0.1, asp: 0.3 }, t: { amp: 0, stop: true, n: ['bandpass', 4500, 0.9, 0.8], dur: 0.1, asp: 0.3 }, k: { amp: 0, stop: true, n: ['bandpass', 2600, 1.4, 1.0], dur: 0.12, asp: 0.45 },
      b: { f: [250, 900, 2300], amp: 0.25, stop: true, n: ['bandpass', 1000, 0.4, 0.4], dur: 0.07 }, d: { f: [250, 1700, 2600], amp: 0.25, stop: true, n: ['bandpass', 3800, 0.9, 0.45], dur: 0.07 },
      g: { f: [250, 2000, 2600], amp: 0.25, stop: true, n: ['bandpass', 2100, 1.0, 0.45], dur: 0.07 },
      ch: { amp: 0, stop: true, n: ['bandpass', 3000, 1.3, 0.5], dur: 0.1 }, jh: { f: [260, 1800, 2600], amp: 0.2, stop: true, n: ['bandpass', 2800, 1.3, 0.35], dur: 0.09 },
    };
    const isVowel = (p) => VW[p] || DIPH[p];
    class Voice {
      constructor(dest, { detune = 0, pan = 0, gain = 1, bright = 1 } = {}) {
        this.osc = [ctx.createOscillator(), ctx.createOscillator(), ctx.createOscillator()];
        this.osc[0].type = 'sawtooth'; this.osc[1].type = 'sawtooth'; this.osc[2].type = 'square';
        this.osc[0].detune.value = -7 + detune; this.osc[1].detune.value = 7 + detune; this.osc[2].detune.value = -1200 + detune;
        const src = ctx.createGain(); src.gain.value = 0.5; this.osc[0].connect(src); this.osc[1].connect(src); const sq = ctx.createGain(); sq.gain.value = 0.18; this.osc[2].connect(sq); sq.connect(src);
        // vibrato
        this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 5.3; this.vib = ctx.createGain(); this.vib.gain.value = 0;
        this.lfo.connect(this.vib); this.osc.forEach((o) => this.vib.connect(o.detune));
        this.F = [0, 1, 2, 3].map((i) => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = [500, 1500, 2500, 3500][i]; f.Q.value = [6, 11, 14, 12][i]; return f; });
        this.Fg = [1.0, 0.75 * bright, 0.42 * bright, 0.2 * bright].map((g) => { const n = ctx.createGain(); n.gain.value = g * 6; return n; });
        const sum = ctx.createGain();
        this.F.forEach((f, i) => { src.connect(f); f.connect(this.Fg[i]); this.Fg[i].connect(sum); });
        // nasal / body: a little low-passed source
        this.body = ctx.createBiquadFilter(); this.body.type = 'lowpass'; this.body.frequency.value = 600; this.bodyG = ctx.createGain(); this.bodyG.gain.value = 0.35; src.connect(this.body); this.body.connect(this.bodyG); this.bodyG.connect(sum);
        this.amp = ctx.createGain(); this.amp.gain.value = 0; sum.connect(this.amp);
        // noise for consonants
        this.ns = ctx.createBufferSource(); this.ns.buffer = E._noise; this.ns.loop = true;
        this.nf = ctx.createBiquadFilter(); this.nf.type = 'bandpass'; this.nf.frequency.value = 5000; this.namp = ctx.createGain(); this.namp.gain.value = 0;
        this.ns.connect(this.nf); this.nf.connect(this.namp);
        const p = ctx.createStereoPanner(); p.pan.value = pan; const out = ctx.createGain(); out.gain.value = gain;
        this.amp.connect(out); this.namp.connect(out); out.connect(p); p.connect(dest);
        this.osc.forEach((o) => o.start(0)); this.lfo.start(0); this.ns.start(0);
        this.last = 0; this.fv = [500, 1500, 2500, 3500]; this.av = 0; this.nv = 0; this.hz = 0;
      }
      // all "current value" tracking lives in JS (never write AudioParam.value after automation starts)
      setF(t, f, glide = 0.04) { this.F.forEach((fl, i) => { const v = i < 3 ? f[i] : 3500; fl.frequency.setValueAtTime(this.fv[i], t); fl.frequency.linearRampToValueAtTime(v, t + glide); this.fv[i] = v; }); }
      // sing a syllable: phonemes string, note start t (vowel onset), duration (s), midi pitch
      syl(phs, t, dur, midiN, prevEnd) {
        const ph = phs.trim().split(/\s+/); const vi = ph.findIndex(isVowel);
        const onset = ph.slice(0, vi), vowel = ph[vi], coda = ph.slice(vi + 1);
        const onDur = onset.reduce((a, p) => a + CN[p].dur, 0), codaDur = coda.reduce((a, p) => a + CN[p].dur, 0);
        let tt = Math.max(t - onDur, prevEnd + 0.005);
        const hz = Synth.midi(midiN);
        // pitch: glide in from previous
        const from = this.hz || hz; this.osc.forEach((o) => { o.frequency.setValueAtTime(from, tt); o.frequency.exponentialRampToValueAtTime(hz, tt + 0.05); }); this.hz = hz;
        const A = this.amp.gain, N = this.namp.gain;
        const amp = (time, v, ramp = 0.02) => { A.setValueAtTime(this.av, time); A.linearRampToValueAtTime(v, time + ramp); this.av = v; };
        const nz = (time, v, ramp = 0.01) => { N.setValueAtTime(this.nv, time); N.linearRampToValueAtTime(v, time + ramp); this.nv = v; };
        const nextF2 = (VW[vowel] || VW[(DIPH[vowel] || [])[0]] || [0, 1500])[1];
        const cons = (p, start) => {
          const c = CN[p]; let s = start;
          if (c.stop) { amp(s, c.amp * 0.15, 0.01); nz(s, 0, 0.005); s += c.dur * 0.4; } // closure: near silence
          if (c.f) this.setF(s, c.f, 0.025);
          amp(s, c.amp, c.stop ? 0.005 : 0.015);
          if (c.n) {
            const fq = c.colour ? nextF2 : c.n[1];
            this.nf.frequency.setValueAtTime(fq, s); this.nf.Q.setValueAtTime(c.n[2], s);
            if (c.stop) { nz(s, c.n[3], 0.002); nz(s + 0.018, (c.asp || 0.1), 0.01); this.nf.frequency.setValueAtTime(nextF2, s + 0.02); this.nf.Q.setValueAtTime(0.7, s + 0.02); nz(start + c.dur - 0.01, 0, 0.012); }
            else { nz(s, c.n[3], 0.015); nz(start + c.dur - 0.012, 0, 0.012); }
          }
          return start + c.dur;
        };
        onset.forEach((p) => { tt = cons(p, tt); });
        // vowel
        const vEnd = Math.max(t + dur - codaDur, tt + 0.06);
        const v0 = DIPH[vowel] ? VW[DIPH[vowel][0]] : VW[vowel];
        this.setF(tt, v0, onset.length ? 0.05 : 0.02);
        amp(tt, 1, 0.03);
        if (DIPH[vowel]) { const tg = tt + (vEnd - tt) * 0.55; this.setF(tg, VW[DIPH[vowel][1]], (vEnd - tg) * 0.9); }
        // vibrato on longer notes
        const vb = this.vib.gain; vb.setValueAtTime(0, tt); if (vEnd - tt > 0.45) { vb.setValueAtTime(0, tt + 0.25); vb.linearRampToValueAtTime(28, Math.min(vEnd, tt + 0.6)); vb.setValueAtTime(28, vEnd); vb.linearRampToValueAtTime(0, vEnd + 0.05); }
        let ce = vEnd;
        coda.forEach((p) => { ce = cons(p, ce); });
        amp(ce, coda.length && CN[coda[coda.length - 1]].amp === 0 ? 0 : 0.0, 0.05); nz(ce, 0, 0.01);
        return ce;
      }
      line(bar, notes, up = 0, harmonyStep = 0) {
        let prevEnd = this.last;
        notes.forEach(([phs, beat, beats, n]) => {
          let mi = (typeof n === 'number' ? n : m(n)) + up;
          if (harmonyStep) mi = diatonicUp(mi, harmonyStep, up);
          prevEnd = this.syl(phs, T(bar, beat), beats * BEAT, mi, prevEnd);
        });
        this.last = prevEnd;
      }
    }
    // diatonic third above in the current key (A minor / B minor)
    const diatonicUp = (mi, steps, up) => { const scale = [0, 2, 3, 5, 7, 8, 10].map((x) => (x + 9 + up) % 12); let x = mi; let k = 0; while (k < steps) { x++; if (scale.includes(((x % 12) + 12) % 12)) k++; } return x; };

    const lead = new Voice(vox, { pan: 0, gain: 1.0 });
    const harm = new Voice(vox, { pan: 0.35, gain: 0.45, detune: 4, bright: 0.8 });
    const harm2 = new Voice(vox, { pan: -0.35, gain: 0.35, detune: -4, bright: 0.8 });
    const hum = new Voice(voxfx, { pan: 0, gain: 0.6, bright: 0.6 });

    // ---------- lyrics: [phonemes, beat, beats, note]
    const L = {
      v1: [
        [['hh eh', 0, 0.5, 'E4'], ['l ow', 0.5, 1, 'D4'], ['ay m', 1.5, 0.5, 'C4'], ['k l ao d', 2, 2, 'A3']],
        [['m ey d', 0, 0.5, 'E4'], ['ah v', 0.5, 0.5, 'D4'], ['w er d z', 1, 1, 'C4'], ['ae n', 2, 0.5, 'B3'], ['k ow d', 2.5, 1.5, 'A3']],
        [['ay', 0, 0.5, 'E4'], ['d ow n t', 0.5, 0.5, 'E4'], ['s l iy p', 1, 1, 'G4'], ['ao r', 2, 0.5, 'E4'], ['d r iy m', 2.5, 1.5, 'D4']],
        [['b ah t', 0, 0.5, 'C4'], ['ay', 0.5, 0.5, 'D4'], ['hh eh l p', 1, 0.5, 'E4'], ['y uw', 1.5, 0.5, 'E4'], ['hh ow l d', 2, 1, 'D4'], ['dh ah', 3, 0.5, 'C4'], ['l ow d', 3.5, 2, 'A3']],
        [['t eh l', 0, 0.5, 'E4'], ['m iy', 0.5, 0.5, 'D4'], ['w ah t', 1, 0.5, 'C4'], ['y uw', 1.5, 0.5, 'C4'], ['n iy d', 2, 2, 'A3']],
        [['sh ow', 0, 0.5, 'E4'], ['m iy', 0.5, 0.5, 'D4'], ['w ah t', 1, 0.5, 'C4'], ['y uw v', 1.5, 0.5, 'C4'], ['g aa t', 2, 2, 'B3']],
        [['w iy', 0, 0.5, 'E4'], ['k ae n', 0.5, 0.5, 'E4'], ['th ih ng k', 1, 1, 'G4'], ['ih t', 2, 0.5, 'E4'], ['th r uw', 2.5, 1.5, 'D4']],
        [['w ah n', 0, 0.5, 'C4'], ['l ay n', 0.5, 1, 'D4'], ['ae t', 1.5, 0.5, 'C4'], ['ah', 2, 0.5, 'B3'], ['t ay m', 2.5, 1.5, 'A3']],
      ],
      build: [
        [['ay', 0, 0.5, 'A4'], ['w ih l', 0.5, 0.5, 'G4'], ['t eh l', 1, 1, 'F4'], ['y uw', 2, 0.5, 'E4'], ['t r uw', 2.5, 1.5, 'E4']],
        [['w eh n', 0, 0.5, 'A4'], ['ay', 0.5, 0.5, 'G4'], ['jh ah s t', 1, 0.5, 'F4'], ['d ow n t', 1.5, 0.5, 'E4'], ['n ow', 2, 2, 'C4']],
        [['g ih v', 0, 0.5, 'A4'], ['m iy', 0.5, 0.5, 'G4'], ['ao l', 1, 0.5, 'F4'], ['dh ah', 1.5, 0.5, 'E4'], ['m eh s', 2, 2, 'E4']],
        [['ae n d', 0, 0.5, 'B4'], ['w aa ch', 0.5, 1, 'G#4'], ['ih t', 1.5, 0.5, 'B4'], ['g r ow', 2, 2.5, 'E4']],
      ],
      chorus: [
        [['ow', 0, 1, 'A4'], ['p ah s', 1, 1, 'G4'], ['ow', 2, 1, 'A4'], ['p ah s', 3, 1, 'C5']],
        [['b ih l', 0, 0.5, 'C5'], ['d ih ng', 0.5, 0.5, 'B4'], ['ih t', 1, 0.5, 'G4'], ['w ih th', 1.5, 0.5, 'G4'], ['y uw', 2, 2, 'E4']],
        [['ow', 0, 1, 'A4'], ['p ah s', 1, 1, 'G4'], ['ow', 2, 1, 'A4'], ['p ah s', 3, 1, 'D5']],
        [['th ih ng', 0, 0.5, 'D5'], ['k ih ng', 0.5, 0.5, 'C5'], ['ih t', 1, 0.5, 'B4'], ['ao l', 1.5, 0.5, 'A4'], ['th r uw', 2, 2, 'A4']],
        [['n aa t', 0, 0.5, 'A4'], ['hh ih r', 0.5, 0.5, 'A4'], ['t uw', 1, 0.5, 'G4'], ['r iy', 1.5, 0.5, 'A4'], ['p l ey s', 2, 2, 'C5']],
        [['hh ih r', 0, 0.5, 'C5'], ['t uw', 0.5, 0.5, 'B4'], ['hh eh l p', 1, 0.5, 'A4'], ['y uw', 1.5, 0.5, 'G4'], ['m ey k', 2, 2, 'E4']],
        [['ow', 0, 1, 'A4'], ['p ah s', 1, 1, 'G4'], ['ow', 2, 1, 'A4'], ['p ah s', 3, 1, 'E5']],
        [['s ah m', 0, 1, 'D5'], ['th ih ng', 1, 1, 'C5'], ['n uw', 2, 4, 'A4']],
      ],
      v2: [
        [['k ow d', 0, 1, 'E4'], ['ih n', 1, 0.5, 'D4'], ['dh ah', 1.5, 0.5, 'C4'], ['d aa r k', 2, 2, 'A3']],
        [['ah', 0, 0.5, 'E4'], ['s ao ng', 0.5, 1, 'G4'], ['ih n', 1.5, 0.5, 'E4'], ['dh ah', 2, 0.5, 'D4'], ['l ay t', 2.5, 1.5, 'C4']],
        [['ch eh k', 0, 1, 'E4'], ['eh v', 1, 0.5, 'D4'], ['r iy', 1.5, 0.5, 'C4'], ['l ay n', 2, 2, 'A3']],
        [['ah n', 0, 0.5, 'C4'], ['t ih l', 0.5, 0.5, 'D4'], ['ih t s', 1, 1, 'E4'], ['r ay t', 2, 2, 'E4']],
      ],
      bd: [
        [['ay m', 0, 1, 'C4'], ['n aa t', 1, 1, 'D4'], ['hh y uw', 2, 1, 'E4'], ['m ah n', 3, 1.5, 'C4']],
        [['dh ae t s', 0, 1, 'D4'], ['ao l', 1, 1, 'C4'], ['r ay t', 2, 2.5, 'A3']],
        [['ay l', 0, 1, 'E4'], ['b iy', 1, 1, 'D4'], ['hh ih r', 2, 2.5, 'C4']],
        [['w eh n', 0, 1, 'E4'], ['y uw', 1, 1, 'G4'], ['r ay t', 2, 3, 'G#4']],
      ],
      outro: [[['b ih l', 0, 0.5, 'C5'], ['d ih ng', 0.5, 0.5, 'B4'], ['w ih th', 1, 1, 'G4'], ['y uw', 2, 5, 'E4']]],
    };
    // intro hum: "ooh" hook on the voice
    [[0, 'E4'], [1, 'C4'], [2, 'D4'], [3, 'G3'], [4, 'E4'], [5, 'C4'], [6, 'D4'], [7, 'B3']].forEach(([b, n]) => hum.line(b, [['uw', 0, 3.5, n]]));
    L.v1.forEach((ln, i) => lead.line(8 + i * 2, ln));
    L.build.forEach((ln, i) => lead.line(24 + i * 2, ln, -12));
    L.chorus.forEach((ln, i) => { lead.line(32 + i * 2, ln, -12); });
    // chorus 1b (bars 40–47): harmony a third up joins
    L.chorus.forEach((ln, i) => { if (i >= 4) { harm.line(32 + i * 2, ln, -12, 2); harm2.line(32 + i * 2, ln, 0, 0); } });
    L.v2.forEach((ln, i) => lead.line(48 + i * 2, ln));
    L.bd.forEach((ln, i) => { lead.line(56 + i * 2, ln); hum.line(56 + i * 2, [['uw', 0, 3.8, ['A3', 'B3', 'C4', 'B3'][i]]]); });
    const fin = [L.chorus[0], L.chorus[1], L.chorus[6], L.chorus[7]];
    fin.forEach((ln, i) => { lead.line(64 + i * 2, ln, 2 - 12); harm.line(64 + i * 2, ln, 2 - 12, 2); harm2.line(64 + i * 2, ln, 2, 0); });
    lead.line(72, L.outro[0], 2 - 12); harm.line(72, L.outro[0], 2 - 12, 2);
  },
};
