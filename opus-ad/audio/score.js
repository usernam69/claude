/* Opus ad: 30 s, 120 BPM (one beat = 0.5 s). Works with the sound off as a picture,
 * and with sound on as a hook: a warm C major loop, UI clicks on every card action,
 * whooshes on every card change, and a sonic logo on the end card at 22.0.
 *
 *  0.0-1.5   hook: sub hit, typing clicks, the error line
 *  1.5-4.5   tension: riser, pulses, two problem lines (kick on 1.5 and 3.0)
 *  4.5-22.0  loop: C-Am-F-G, four-on-the-floor, hook melody, UI clicks at 8.0 / 12.4 / 17.5
 *  7.0, 12.0, 17.0: whooshes on card changes. 22.0: sonic logo, pad, sub hit. Tail to 30.
 */
window.SCORE = {
  seconds: 30,
  tail: 0,
  seed: 3030,
  opts: { reverbWet: 0.26, rt60: 2.6, reverbSeconds: 3.2, delayTime: 0.5, delayFeedback: 0.28, delayWet: 0.18, glueThreshold: -6 },
  build(S) {
    const B = 0.5;
    const at = (beat) => beat * B;
    const kicks = [];

    // ---- hook, 0.0-1.5 ----
    S.sub(0, { dur: 1.4, f0: 60, f1: 30, vel: 0.9 });
    S.tick(0, { f: 3000, vel: 0.5, pan: -0.2 });
    for (let i = 0; i < 9; i++) S.click(0.2 + i * 0.1, { f: 2100, vel: 0.5, pan: i % 2 ? 0.2 : -0.2 });
    S.click(1.1, { f: 1400, vel: 0.35 });

    // ---- tension, 1.5-4.5 ----
    S.kick(at(3), { vel: 0.9 });
    kicks.push(at(3));
    S.whoosh(1.5, 0.5, { dir: 1, vel: 0.7 }); // the error line gives way
    S.riser(1.5, 3.0, { f0: 200, f1: 8000, vel: 0.55, q: 1.2 });
    S.kick(at(5), { vel: 0.8 }); kicks.push(at(5));
    S.kick(at(7), { vel: 0.85 }); kicks.push(at(7));
    S.click(3.0, { f: 2000, vel: 0.3 }); // the second problem line
    S.snare(at(7), { vel: 0.5 });
    S.kick(at(8), { vel: 0.7 }); kicks.push(at(8));

    // ---- the loop, 4.5-22.0. Beat 9 = 4.5 s. Four bars of C, Am, F, G (2 s each) ----
    const CH = [
      { root: 36, pad: [48, 52, 55] }, // C
      { root: 33, pad: [45, 48, 52] }, // Am
      { root: 29, pad: [41, 45, 48] }, // F
      { root: 31, pad: [43, 47, 50] }, // G
    ];
    // The hook: 8ths, two bars, then the same notes an octave-up variation on the second pass
    const HOOK_A = [76, 79, 81, 79, 76, 74, 72, 74];
    const HOOK_B = [76, 79, 84, 81, 79, 76, 74, 72];
    const LOOP_BARS = 8; // 16 s
    const BAR = 2.0;
    for (let j = 0; j < 9; j++) {
      const t0 = 4.5 + j * BAR; // 4.5 .. 22.5
      if (t0 >= 22.0) break;
      const c = CH[j % 4];
      const end = Math.min(22.0, t0 + BAR);
      S.pad(t0, c.pad, { dur: end - t0, vel: 0.36, cut: 1300, cutTo: 2200, a: 0.12, r: 0.5, rev: 0.45 });
      for (let i = 0; i < 8; i++) S.bass(t0 + i * 0.25, c.root, { dur: 0.22, vel: 0.7, cut: 700, cutLo: 180 });
      for (let i = 0; i < 4; i++) {
        const tk = t0 + i * 0.5;
        S.kick(tk, { vel: 0.9 });
        kicks.push(tk);
        if (i % 2 === 1) S.snare(tk, { vel: 0.7 });
      }
      for (let i = 0; i < 8; i++) S.hat(t0 + i * 0.25, { vel: 0.22 + (i % 2) * 0.1, open: i === 7, pan: i % 2 ? 0.3 : -0.3 });
    }
    // melody: 8ths, starts at 4.5, every two bars, first and second pass
    for (let p = 0; p < 4; p++) {
      const base = 4.5 + p * 4.0;
      const notes = p % 2 === 0 ? HOOK_A : HOOK_B;
      notes.forEach((m, i) => {
        const t = base + i * 0.25;
        if (t > 22.0) return;
        S.pluck(t, m - 12, { dur: 0.22, vel: 0.44, bright: 4200, dark: 1100, rev: 0.3, dly: 0.16, pan: i % 2 ? 0.25 : -0.25, bus: 'lead' });
        if (i % 4 === 0) S.bell(t, m, { dur: 0.6, vel: 0.22, dly: 0.2, rev: 0.4 });
      });
    }
    // card-change whooshes and UI clicks
    S.whoosh(7.0, 0.6, { dir: 1, vel: 0.75 });
    [8.0, 8.5, 9.0, 9.5, 10.0].forEach((t, i) => S.click(t, { f: 2600, vel: 0.45, pan: i % 2 ? 0.3 : -0.3 }));
    S.whoosh(12.0, 0.6, { dir: -1, vel: 0.75 });
    S.click(12.4, { f: 2400, vel: 0.5, pan: 0.3 });
    [13.2, 13.45, 13.7, 13.95, 14.2, 14.45, 14.7].forEach((t, i) => S.click(t, { f: 1900 + i * 80, vel: 0.28, pan: i % 2 ? -0.2 : 0.2 }));
    S.whoosh(17.0, 0.6, { dir: 1, vel: 0.75 });
    [17.5, 18.0, 18.5].forEach((t, i) => S.click(t, { f: 2500, vel: 0.42, pan: i % 2 ? 0.25 : -0.25 }));
    S.bell(20.6, 84, { dur: 0.9, vel: 0.5, rev: 0.5, dly: 0.2 }); // the check

    // answer: a clay sweep when the answer comes in (4.5)
    S.whoosh(4.4, 0.5, { dir: 1, vel: 0.6 });
    S.impact(4.5, { vel: 0.35, tail: 1.6, subDur: 0.6 });

    // ---- sonic logo, 22.0 ----
    S.impact(22.0, { vel: 0.9, tail: 4, subDur: 1.4 });
    [72, 76, 79, 84].forEach((m, i) => S.bell(22.0 + i * 0.22, m, { dur: 1.8, vel: 0.5 - i * 0.04, rev: 0.6, dly: 0.25 }));
    S.pad(22.0, [60, 64, 67, 72], { dur: 7.0, vel: 0.42, cut: 2400, cutTo: 2400, a: 0.05, r: 1.6, rev: 0.6 });
    S.whoosh(21.8, 0.4, { dir: 1, vel: 0.55 });
    S.fadeOut(27.2, 30.0);
    S.sidechain(kicks.filter((t) => t < 22.0), 0.45, 0.2);
  },
};
