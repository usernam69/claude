// Offline mastering and measurement for the rendered stereo buffers.
// Everything here is deterministic: same input floats, same output bytes.
import fs from 'node:fs';

export const SR = 48000;

/* ---------- biquads ---------- */
// RBJ cookbook lowpass / highpass, returned as {b, a} with a[0] = 1.
export function lowpassCoef(f0, q, sr = SR) {
  const w = (2 * Math.PI * f0) / sr;
  const c = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  const a0 = 1 + al;
  return {
    b: [(1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0],
    a: [1, (-2 * c) / a0, (1 - al) / a0],
  };
}

export function runBiquad(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    y[i] = yi;
  }
  return y;
}

/* ---------- mono bass (below ~120 Hz) ---------- */
// Splits each channel with a 4th-order (two cascaded Butterworth) lowpass, sums the
// low band to mono, and keeps the stereo complement above it.
export function monoBass(L, R, f = 120) {
  const lp = lowpassCoef(f, 0.7071);
  const lpL = runBiquad(runBiquad(L, lp), lp);
  const lpR = runBiquad(runBiquad(R, lp), lp);
  const outL = new Float32Array(L.length);
  const outR = new Float32Array(R.length);
  for (let i = 0; i < L.length; i++) {
    const m = 0.5 * (lpL[i] + lpR[i]);
    outL[i] = L[i] - lpL[i] + m;
    outR[i] = R[i] - lpR[i] + m;
  }
  return [outL, outR];
}

/* ---------- BS.1770-4 loudness (48 kHz coefficients) ---------- */
const K_PRE = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const K_RLB = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

export function integratedLoudness(chs) {
  const kw = chs.map((x) => runBiquad(runBiquad(x, K_PRE), K_RLB));
  const n = kw[0].length;
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const ms = [];
  for (let s = 0; s + block <= n; s += hop) {
    let sum = 0;
    for (const ch of kw) {
      let acc = 0;
      for (let i = s; i < s + block; i++) acc += ch[i] * ch[i];
      sum += acc / block;
    }
    ms.push(sum);
  }
  const lk = (e) => -0.691 + 10 * Math.log10(e);
  const abs = ms.filter((e) => lk(e) > -70);
  if (!abs.length) return -Infinity;
  const meanAbs = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = lk(meanAbs) - 10;
  const gated = abs.filter((e) => lk(e) > rel);
  return lk(gated.reduce((a, b) => a + b, 0) / gated.length);
}

// Short-term (3 s) loudness, max over the file.
export function maxShortTerm(chs) {
  const kw = chs.map((x) => runBiquad(runBiquad(x, K_PRE), K_RLB));
  const n = kw[0].length, win = 3 * SR, hop = SR / 2;
  let best = -Infinity;
  for (let s = 0; s + win <= n; s += hop) {
    let sum = 0;
    for (const ch of kw) {
      let acc = 0;
      for (let i = s; i < s + win; i++) acc += ch[i] * ch[i];
      sum += acc / win;
    }
    best = Math.max(best, -0.691 + 10 * Math.log10(sum));
  }
  return best;
}

/* ---------- true peak (4x oversampled, cubic interpolation) ---------- */
function cubic(p0, p1, p2, p3, t) {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

export function truePeakOfChannel(x) {
  let best = 0;
  for (let i = 0; i < x.length - 1; i++) {
    const p0 = x[i - 1] ?? 0, p1 = x[i], p2 = x[i + 1], p3 = x[i + 2] ?? 0;
    const a = Math.abs(p1);
    if (a > best) best = a;
    for (let k = 1; k < 4; k++) {
      const v = Math.abs(cubic(p0, p1, p2, p3, k / 4));
      if (v > best) best = v;
    }
  }
  return best;
}

export function truePeakDb(chs) {
  return 20 * Math.log10(Math.max(1e-12, ...chs.map(truePeakOfChannel)));
}

/* ---------- limiter ---------- */
// Lookahead brick-wall limiter on the true-peak estimate. Required gain per sample is
// min-filtered over +-H samples, then box-smoothed over the same +-H, so every peak
// is held at or under the ceiling. No overshoot by construction.
export function limit(chs, ceilingDb, lookaheadMs = 4) {
  const ceil = Math.pow(10, ceilingDb / 20);
  const n = chs[0].length;
  const H = Math.max(1, Math.round((lookaheadMs / 1000) * SR));
  // per-sample peak estimate over both channels, using the 4x interpolation
  const req = new Float64Array(n).fill(1);
  for (const x of chs) {
    for (let i = 0; i < n; i++) {
      let pk = Math.abs(x[i]);
      if (i + 1 < n) {
        const p0 = x[i - 1] ?? 0, p1 = x[i], p2 = x[i + 1], p3 = x[i + 2] ?? 0;
        for (let k = 1; k < 4; k++) {
          const v = Math.abs(cubic(p0, p1, p2, p3, k / 4));
          if (v > pk) pk = v;
        }
      }
      if (pk > ceil) {
        const g = ceil / pk;
        if (g < req[i]) req[i] = g;
      }
    }
  }
  // sliding minimum over [i-H, i+H] (monotonic deque, O(n))
  const minF = new Float64Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0;
  const W = 2 * H + 1;
  for (let i = 0; i < n + H; i++) {
    if (i < n) {
      while (tail > head && req[dq[tail - 1]] >= req[i]) tail--;
      dq[tail++] = i;
    }
    const center = i - H;
    if (center < 0) continue;
    while (dq[head] < center - H) head++;
    minF[center] = req[dq[head]];
  }
  // box average of minF over the in-range part of [i-H, i+H] (prefix sums).
  // Each minF value in that window is <= req at any peak inside it, so the
  // average is too, and the peak is held under the ceiling.
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + minF[i];
  const gain = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - H), hi = Math.min(n, i + H + 1);
    gain[i] = (pre[hi] - pre[lo]) / (hi - lo);
  }
  return chs.map((x) => {
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = x[i] * Math.min(gain[i], minF[i]);
    return y;
  });
}

export function applyGainDb(chs, db) {
  const g = Math.pow(10, db / 20);
  return chs.map((x) => {
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
    return y;
  });
}

/* ---------- full master: mono bass, loudness target, true-peak ceiling ---------- */
export function master(chs, { lufs, ceiling = -1, monoBassHz = 120, maxIter = 6 } = {}) {
  let out = chs;
  if (monoBassHz) out = monoBass(out[0], out[1], monoBassHz);
  if (lufs == null) return limit(out, ceiling);
  let g = 0;
  let best = null;
  for (let it = 0; it < maxIter; it++) {
    const scaled = applyGainDb(out, g);
    const lim = limit(scaled, ceiling);
    const meas = integratedLoudness(lim);
    best = { chs: lim, measured: meas, gain: g };
    const err = lufs - meas;
    if (Math.abs(err) < 0.05) break;
    g += err;
  }
  return best.chs;
}

/* ---------- WAV ---------- */
export function writeWav(path, chs, bits = 24) {
  const nch = chs.length;
  const n = chs[0].length;
  const bps = bits / 8;
  const dataBytes = n * nch * bps;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nch * bps, 28);
  buf.writeUInt16LE(nch * bps, 32);
  buf.writeUInt16LE(bits, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  const scale = bits === 24 ? 8388607 : 32767;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      let v = Math.round(Math.max(-1, Math.min(1, chs[c][i])) * scale);
      if (bits === 24) {
        buf.writeIntLE(v, o, 3);
        o += 3;
      } else {
        buf.writeInt16LE(v, o);
        o += 2;
      }
    }
  }
  fs.writeFileSync(path, buf);
}

export function readWav(path) {
  const buf = fs.readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV');
  let p = 12, fmt = null, data = null;
  while (p < buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const sz = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(p + 10), sr: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') data = buf.subarray(p + 8, p + 8 + sz);
    p += 8 + sz + (sz & 1);
  }
  const bps = fmt.bits / 8;
  const n = data.length / (fmt.ch * bps);
  const chs = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  const scale = fmt.bits === 24 ? 8388608 : 32768;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < fmt.ch; c++) {
      const o = (i * fmt.ch + c) * bps;
      const v = fmt.bits === 24 ? data.readIntLE(o, 3) : data.readInt16LE(o);
      chs[c][i] = v / scale;
    }
  }
  return { chs, sr: fmt.sr, bits: fmt.bits };
}
