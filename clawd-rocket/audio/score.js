/* Clawd and the rocket: score and effects. 120 BPM. One beat = 0.5 s.
 * The plucky score sits under the effects. Every clank, rip, hiss, fizzle, roar,
 * break and burst is placed on the same time as its picture (see STORYBOARD.md).
 */
window.SCORE = {
  seconds: 22,
  tail: 0,
  seed: 4242,
  opts: { reverbWet: 0.26, rt60: 2.6, reverbSeconds: 3.2, delayTime: 0.5, delayFeedback: 0.3, delayWet: 0.2 },
  build(S) {
    const B = 0.5;
    const at = (beat) => beat * B;
    const ctx = S.ctx;

    // Inline helpers for effects the synth does not cover directly.
    // A tape rip: bright noise, very fast attack, a rough tail.
    const rip = (t, dur, vel) => {
      const ns = S.noiseSrc(t, dur + 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4200;
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      S.adsr(g.gain, t, { peak: 0.7 * vel, a: 0.001, d: dur * 0.4, s: 0.1, hold: dur * 0.5, r: dur * 0.5 });
      ns.connect(hp);
      hp.connect(bp);
      bp.connect(g);
      S.route(g, { bus: 'fx', pan: 0.15, rev: 0.12 });
    };
    // A fuse hiss: band-passed noise that swells and then dies with the spark.
    const hiss = (t0, t1, vel) => {
      const ns = S.noiseSrc(t0, t1 - t0 + 0.1, { pink: true });
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(5200, t0);
      bp.frequency.linearRampToValueAtTime(7400, t1);
      bp.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12 * vel, t0 + 0.25);
      g.gain.setValueAtTime(0.12 * vel, t1 - 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      ns.connect(bp);
      bp.connect(g);
      S.route(g, { bus: 'fx', pan: 0.25, rev: 0.2 });
    };
    // A crackle: a short cluster of ticks, like sparks.
    const crackle = (t0, n, span, vel) => {
      for (let i = 0; i < n; i++) {
        const t = t0 + (span * i) / n + S.rnd(0, span / n);
        S.tick(t, { f: 2600 + S.rnd(0, 2400), vel: vel * S.rnd(0.5, 1), pan: S.rnd(-0.4, 0.4) });
      }
    };
    // The sad fizzle: a sawtooth sliding down, a lowpass closing, the hiss dying out.
    const fizzle = (t, dur, vel) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + dur);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2.5;
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(260, t + dur);
      const g = ctx.createGain();
      S.adsr(g.gain, t, { peak: 0.32 * vel, a: 0.01, d: dur * 0.6, s: 0.2, hold: dur, r: 0.2 });
      osc.connect(lp);
      lp.connect(g);
      S.route(g, { bus: 'fx', pan: -0.2, rev: 0.25 });
      osc.start(t);
      osc.stop(t + dur + 0.3);
      // the hiss dies out with the spark
      hiss(t, t + dur * 0.7, 0.35);
    };

    /* ---------- score: plucky, under the effects ---------- */
    // Shot 1 (0-2): D major motif, soft and bright
    const motifA = [62, 69, 66, 69, 67, 71, 69, 66];
    const motifB = [62, 69, 67, 74, 71, 69, 66, 67];
    const bassRoot = (b0, b1, root) => {
      for (let b = b0; b < b1; b += 2) S.bass(at(b), root, { dur: 0.7, vel: 0.5, cut: 500, cutLo: 160 });
    };
    // one bar = 2 s = 4 beats. Plucks on 8ths.
    const pluckBar = (startBeat, notes, vel) => {
      notes.forEach((m, i) => S.pluck(at(startBeat + i * 0.5), m, { dur: 0.22, vel, bright: 3000, dark: 900, rev: 0.25, dly: 0.12, pan: i % 2 ? 0.25 : -0.25 }));
    };
    pluckBar(0, motifA, 0.5);
    pluckBar(4, motifB, 0.5);
    bassRoot(0, 8, 38);

    // Shot 2 (2-6): the build, plucks thicken, hats on 8ths
    const hatsRange = (b0, b1) => { for (let b = b0; b < b1; b += 0.5) S.hat(at(b), { vel: 0.25, pan: (b % 1) ? 0.35 : -0.35 }); };
    hatsRange(4, 12);
    S.clap(at(8), { vel: 0.45 });
    pluckBar(8, [62, 66, 69, 74, 71, 69, 67, 66], 0.46);
    S.kick(at(8), { vel: 0.4, f0: 130, f1: 46, dec: 0.3 });
    S.kick(at(10), { vel: 0.4, f0: 130, f1: 46, dec: 0.3 });
    S.tick(at(4), { f: 2400, vel: 0.5, pan: -0.3 }); // can clank
    S.tick(at(5), { f: 2000, vel: 0.5, pan: -0.3 }); // can clank on the bench
    S.tick(at(6), { f: 1700, vel: 0.3, pan: -0.2 }); // tube set
    S.tick(at(7), { f: 2800, vel: 0.35, pan: 0.1 }); // nose cone
    rip(at(8), 0.18, 0.9); // tape rip for the fins

    // the tube clunk, nose clink and fins: low wood and metal
    S.kick(at(6), { vel: 0.55, f0: 110, f1: 52, dec: 0.2 });
    S.click(at(7), { f: 2600, vel: 0.5, pan: 0.1 });
    S.click(at(9), { f: 1400, vel: 0.2, pan: 0 });

    // Shot 3 (6-8): fuse. Match scratch, spark, hiss.
    rip(at(12), 0.12, 0.55);
    crackle(at(13), 8, 0.4, 0.4);
    hiss(at(13), at(16), 0.9);

    // Shot 4 (8-10): fizzle, rocket tips over, slump thud
    fizzle(at(16), 0.9, 1.0);
    S.kick(at(17), { vel: 0.8, f0: 120, f1: 40, dec: 0.25 }); // rocket tip
    S.sub(at(18), { dur: 0.7, f0: 48, f1: 24, vel: 0.9 }); // slump thud
    pluckBar(16, [57, 62, 66, 62, 59, 57, 54, 57], 0.36); // quieter, minor shade
    bassRoot(16, 20, 33);

    // Shot 5 (10-12): the idea. Bell, arpeggio, pop.
    [62, 66, 69, 74].forEach((m, i) => S.bell(at(20) + i * 0.25, m + 12, { dur: 0.9, vel: 0.55, pan: i % 2 ? 0.25 : -0.25, dly: 0.25 }));
    S.bell(at(20), 74 + 12, { dur: 1.6, vel: 0.5, rev: 0.6, dly: 0.25 });
    S.kick(at(21), { vel: 0.5, f0: 140, f1: 52, dec: 0.22 }); // pop takeoff
    S.whoosh(at(23), 0.5, { dir: 1, vel: 0.5, lo: 400, hi: 4800 }); // whip pan to the shelf
    pluckBar(20, [69, 74, 78, 81, 78, 74, 71, 69], 0.42);
    bassRoot(20, 24, 38);

    // Shot 6 (12-14): booster thump, tape rips, the rocket goes up
    S.sub(at(24), { dur: 1.0, f0: 58, f1: 26, vel: 0.95 }); // booster thump
    S.kick(at(24), { vel: 0.7, f0: 150, f1: 42, dec: 0.25 });
    rip(at(25), 0.14, 0.8);
    rip(at(26), 0.14, 0.8);
    rip(at(26.8), 0.14, 0.8);
    S.tick(at(27), { f: 1800, vel: 0.35, pan: 0.2 });
    S.riser(at(26), at(27) - at(26), { f0: 300, f1: 2400, vel: 0.35, q: 1.1 }); // the lift
    pluckBar(24, [62, 66, 69, 74, 71, 69, 66, 62], 0.4);
    bassRoot(24, 28, 26);

    // Shot 7 (14-16): relight, fuse hiss, anticipation, launch roar at 16.0
    crackle(at(29), 8, 0.4, 0.45);
    hiss(at(29), at(31.5), 0.9);
    S.click(at(31), { f: 1100, vel: 0.2, pan: -0.2 }); // step back
    S.riser(at(29), 2.0, { f0: 180, f1: 7000, vel: 0.6, q: 1.3 });
    S.sub(at(32), { dur: 1.8, f0: 46, f1: 24, vel: 1 });
    S.whoosh(at(32), 1.2, { dir: 1, vel: 0.9, lo: 200, hi: 5200 }); // roar
    pluckBar(28, [66, 69, 74, 78, 74, 69, 66, 69], 0.4);
    bassRoot(28, 32, 31);

    // Shot 8 (16-17): skylight glass breaks at 17.0
    hatsRange(32, 34);
    S.impact(at(34), { vel: 0.5, tail: 1.2, subDur: 0.8 }); // hit as it rips up
    for (let k = 0; k < 9; k++) {
      const t = at(34) + k * 0.05;
      S.tick(t, { f: 3300 + S.rnd(0, 2400), vel: 0.28 + S.rnd(0, 0.15), pan: S.rnd(-0.6, 0.6) });
    }
    rip(at(34), 0.3, 0.9);

    // Shot 9 (18-20): three firework bursts
    [37, 38, 39].forEach((b, bi) => {
      S.impact(at(b), { vel: 0.7 - bi * 0.05, tail: 1.6, subDur: 0.6 });
      for (let k = 0; k < 14; k++) {
        const t = at(b) + 0.04 + k * 0.07 + S.rnd(0, 0.04);
        S.tick(t, { f: 2500 + S.rnd(0, 3800), vel: 0.22 * (1 - k / 22), pan: S.rnd(-0.7, 0.7) });
      }
    });
    pluckBar(36, [62, 69, 74, 78, 81, 78, 74, 69], 0.38);

    // Shot 10 (20-22): the calm returns. Iris closes on 22.0.
    pluckBar(40, [62, 66, 69, 66, 62, 66, 69, 74], 0.34);
    bassRoot(40, 44, 26);
    [62, 69, 74].forEach((m, i) => S.bell(at(40) + i * 0.5, m + 12, { dur: 1.4, vel: 0.36, rev: 0.6, dly: 0.2 }));
    S.whoosh(at(42), 1.0, { dir: -1, vel: 0.7, lo: 300, hi: 5000 }); // the iris closes
    S.fadeOut(21.6, 22.0);
  },
};
