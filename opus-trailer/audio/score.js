/* Launch trailer score. 120 BPM, A minor. One beat = 0.5 s, one bar = 2 s.
 * Every hit lands on a beat or an 8th/16th of one, so every cut sits on the grid.
 *
 *  bar  time    what happens
 *  1    0.0     cold open: sub boom + metal tick on 0.0, pluck, kick on 1 and 3, whip at 1.0
 *  2    2.0     drums enter, bass 8ths, hats
 *  3    4.0     Am pad, bell hook, "Slower."
 *  4    6.0     F pad, bell hook, "Deeper."
 *  5    8.0     C pad, riser + whoosh, "Sharper."
 *  6   10.0     G pad, 16th snare roll, riser builds to 12.0
 *  7   12.0     DROP: sub, kick 4-on-floor, stabs, rolling bass, hook; reveal impact at 12.5
 *  8   14.0     F, hook answer
 *  9   16.0     Am, kicks thin out, reverse whoosh at 17.0, master fade 17.4 to 18.0
 */
window.SCORE = {
  seconds: 18,
  tail: 0,
  seed: 20261011,
  opts: { reverbWet: 0.3, rt60: 3.4, reverbSeconds: 4.6, delayTime: 0.375, delayFeedback: 0.34, delayWet: 0.26 },
  build(S) {
    const B = 0.5;
    const at = (beat) => beat * B;
    const kicks = [];

    // ---- bar 1: cold open -------------------------------------------------
    S.sub(at(0), { dur: 1.8, f0: 58, f1: 26, vel: 1 });
    S.tick(at(0), { f: 3100, vel: 0.75, pan: -0.2 });
    S.pluck(at(1), 81, { dur: 0.22, bright: 5200, dark: 1300, vel: 0.7, dly: 0.25, rev: 0.4, pan: 0.2 });
    [1, 3].forEach((b) => {
      S.kick(at(b), { vel: 0.85 });
      kicks.push(at(b));
    });
    S.whoosh(at(3.75), 0.5, { dir: 1, vel: 0.75 });
    S.click(at(4) - 0.005, { f: 1800, vel: 0.2, pan: 0 });

    // ---- bar 2: drums enter -----------------------------------------------
    for (let b = 4; b < 8; b++) {
      S.kick(at(b), { vel: 0.95 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { open: b % 2 === 1, vel: 0.5 });
    }
    S.snare(at(5), { vel: 0.9 });
    S.snare(at(7), { vel: 0.95 });
    S.tick(at(4), { f: 5200, vel: 0.22, pan: 0.3 });

    // ---- bars 3-4: Am and F, bass 8ths, bell hook -------------------------
    const bassAt = (b0, b1, root) => {
      for (let b = b0; b < b1; b += 0.5) S.bass(at(b), root, { dur: 0.42, vel: 0.85 });
    };
    S.pad(at(8), [57, 60, 64], { dur: 4.2, vel: 0.5, cut: 1300, cutTo: 2600 });
    bassAt(8, 12, 33);
    [8, 9, 10, 11].forEach((b) => {
      S.kick(at(b), { vel: 0.95 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.5, open: b === 9 });
    });
    S.snare(at(9), { vel: 0.95 });
    S.snare(at(11), { vel: 1 });
    // bell hook: A4 E5 C5 A4 | E5 C5 A4 C5
    [69, 76, 72, 69, 76, 72, 69, 72].forEach((m, i) => {
      S.bell(at(8 + i * 0.5), m, { dur: 0.9, vel: 0.5, pan: i % 2 ? 0.25 : -0.25 });
    });
    S.pad(at(12), [53, 57, 60], { dur: 4.2, vel: 0.5, cut: 1300, cutTo: 2600 });
    bassAt(12, 16, 29);
    [12, 13, 14, 15].forEach((b) => {
      S.kick(at(b), { vel: 0.9 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.45 });
    });
    S.snare(at(13), { vel: 0.95 });
    S.snare(at(15), { vel: 1 });
    [65, 69, 72, 69, 65, 69, 72, 77].forEach((m, i) => {
      S.bell(at(12 + i * 0.5), m, { dur: 0.9, vel: 0.5, pan: i % 2 ? 0.25 : -0.25 });
    });

    // ---- bar 5: C, cut on 8.0 with a whoosh; the riser starts -------------
    S.whoosh(at(16), 0.6, { dir: 1, vel: 0.9 });
    S.pad(at(16), [48, 52, 55], { dur: 4.2, vel: 0.55, cut: 1200, cutTo: 3000 });
    bassAt(16, 20, 36);
    [16, 17, 18, 19].forEach((b) => {
      S.kick(at(b), { vel: 0.95 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.5 });
    });
    S.snare(at(17), { vel: 0.95 });
    S.snare(at(19), { vel: 1 });

    // ---- bar 6: G, the build -------------------------------------------------
    S.pad(at(20), [55, 59, 62], { dur: 4.2, vel: 0.6, cut: 1200, cutTo: 3800 });
    S.riser(at(16), 4, { f0: 260, f1: 9000, vel: 0.7, q: 1.2 });
    bassAt(20, 24, 31);
    [20, 21, 22, 23].forEach((b) => {
      S.kick(at(b), { vel: 1 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.55, open: true });
    });
    // 16th snare roll from 10.0 to 12.0
    for (let k = 0; k < 16; k++) {
      const tt = at(20) + k * 0.125;
      S.snare(tt, { vel: 0.35 + (k / 16) * 0.65, dec: 0.12 });
    }
    S.whoosh(at(23.5), 0.5, { dir: 1, vel: 0.7 });

    // ---- bar 7: DROP at 12.0 -------------------------------------------------
    S.sub(at(24), { dur: 1.6, f0: 52, f1: 24, vel: 1 });
    S.stab(at(24), [57, 60, 64], { vel: 0.7, dur: 0.4 });
    S.whoosh(at(24), 0.7, { dir: -1, vel: 0.5 });
    S.pad(at(24), [57, 60, 64], { dur: 3.8, vel: 0.75, cut: 2400, cutTo: 4200, a: 0.02 });
    bassAt(24, 28, 33);
    S.kick(at(24), { vel: 1.1, f0: 175, f1: 40 });
    kicks.push(at(24));
    for (let b = 25; b < 28; b++) {
      S.kick(at(b), { vel: 1 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.6, open: true });
    }
    S.clap(at(25), { vel: 0.9 });
    S.clap(at(27), { vel: 1 });
    S.snare(at(25), { vel: 0.8 });
    S.snare(at(27), { vel: 1 });
    // stabs on the off-beats
    [25.5, 26.5, 27.5].forEach((b) => S.stab(at(b), [57, 60, 64], { vel: 0.4, dur: 0.22 }));
    // the hook, now full
    [69, 76, 72, 81, 76, 72, 76, 72].forEach((m, i) => {
      S.bell(at(24 + i * 0.5), m, { dur: 0.7, vel: 0.62, pan: i % 2 ? 0.3 : -0.3, dly: 0.3 });
    });
    S.pluck(at(24), 45, { dur: 0.3, vel: 0.5, bright: 1600, dark: 400, rev: 0.1 });

    // reveal impact at 12.5: sub + noise crack, long tail
    S.impact(at(25), { vel: 1, tail: 4.5, subDur: 2 });
    S.tick(at(25), { f: 2400, vel: 0.3, pan: 0 });

    // ---- bar 8: F, hook answer ---------------------------------------------
    S.pad(at(28), [53, 57, 60], { dur: 3.8, vel: 0.6, cut: 2400, cutTo: 4200, a: 0.02 });
    bassAt(28, 32, 29);
    [28, 29, 30, 31].forEach((b) => {
      S.kick(at(b), { vel: 0.95 });
      kicks.push(at(b));
      S.hat(at(b + 0.5), { vel: 0.5, open: b === 29 });
    });
    S.snare(at(29), { vel: 0.9 });
    S.snare(at(31), { vel: 1 });
    [65, 69, 72, 77, 72, 69, 72, 69].forEach((m, i) => {
      S.bell(at(28 + i * 0.5), m, { dur: 0.8, vel: 0.52, pan: i % 2 ? -0.3 : 0.3, dly: 0.25 });
    });

    // ---- bar 9: Am, thins out, reverse whoosh into the end ---------------
    S.pad(at(32), [57, 60, 64, 69], { dur: 4, vel: 0.55, cut: 2200, cutTo: 1200, r: 1.4 });
    bassAt(32, 34, 33);
    [32, 34].forEach((b) => {
      S.kick(at(b), { vel: 0.9 });
      kicks.push(at(b));
    });
    S.whoosh(at(34), 1.0, { dir: -1, vel: 0.6, lo: 300, hi: 6000 });
    S.bell(at(33), 81, { dur: 1.6, vel: 0.4, rev: 0.7, dly: 0.35 });

    S.sidechain(kicks, 0.55, 0.22);

    // section levels: the build sits lower so the drop lands with weight
    const lv = S.level.gain;
    lv.setValueAtTime(0.82, 0);
    lv.linearRampToValueAtTime(0.6, at(8));
    lv.linearRampToValueAtTime(0.72, at(16));
    lv.linearRampToValueAtTime(0.96, at(24) - 0.001);
    lv.setValueAtTime(1.0, at(24));
    lv.linearRampToValueAtTime(0.84, at(32));
    S.fadeOut(17.4, 18.0);
  },
};
