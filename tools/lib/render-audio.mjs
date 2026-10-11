#!/usr/bin/env node
// Renders a score with the Web Audio API (OfflineAudioContext in headless Chromium),
// then masters it in Node and writes a WAV.
//
//   node tools/lib/render-audio.mjs <score.js> <out.wav> [--lufs -14] [--tp -1] [--bits 24] [--raw raw.wav]
//
// A score file sets window.SCORE = { seconds, tail, seed, opts, build(S) } where
// S is the synth object from tools/lib/synth.js and build schedules everything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SR, master, writeWav, integratedLoudness, truePeakDb, maxShortTerm } from './dsp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const positional = [];
const opts = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) opts[a] = process.argv[++i];
  else positional.push(a);
}
const arg = (name, def) => (opts[name] === undefined ? def : opts[name]);
const [scorePath, outPath] = positional;
if (!scorePath || !outPath) {
  console.error('usage: render-audio.mjs <score.js> <out.wav> [--lufs N] [--tp N] [--bits 24|16] [--raw file.wav]');
  process.exit(1);
}
const lufs = arg('--lufs', null) == null ? null : Number(arg('--lufs'));
const tp = Number(arg('--tp', '-1'));
const bits = Number(arg('--bits', '24'));
const rawPath = arg('--raw', null);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = ['/opt/pw-browsers', path.join(process.env.HOME || '/root', '.cache/hyperframes')];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const d = stack.pop();
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name === 'chrome' || e.name === 'chrome-headless-shell') return p;
      }
    }
  }
  throw new Error('no Chrome found; set CHROME_PATH');
}

const synthSrc = fs.readFileSync(path.join(here, 'synth.js'), 'utf8');
const scoreSrc = fs.readFileSync(path.resolve(scorePath), 'utf8');

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  protocolTimeout: 0,
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio=false'],
});

let chs;
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: synthSrc });
  await page.addScriptTag({ content: scoreSrc });

  const info = await page.evaluate(async (sr) => {
    const score = window.SCORE;
    const total = score.seconds + (score.tail || 0);
    const ctx = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
    const S = window.SynthLib.createSynth(ctx, Object.assign({ seed: score.seed || 1 }, score.opts || {}));
    S.seconds = score.seconds;
    score.build(S);
    window.__buf = await ctx.startRendering();
    return { length: window.__buf.length, sampleRate: window.__buf.sampleRate, channels: window.__buf.numberOfChannels };
  }, SR);

  chs = [new Float32Array(info.length), new Float32Array(info.length)];
  const CH = SR * 8;
  for (let c = 0; c < 2; c++) {
    for (let from = 0; from < info.length; from += CH) {
      const b64 = await page.evaluate(
        (ch, a, b) => {
          const arr = window.__buf.getChannelData(ch).subarray(a, b);
          const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
          let s = '';
          for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return btoa(s);
        },
        c,
        from,
        Math.min(info.length, from + CH)
      );
      const bytes = Buffer.from(b64, 'base64');
      const f = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
      chs[c].set(f, from);
    }
  }
} finally {
  await browser.close();
}

const rawLevels = { lufs: integratedLoudness(chs), tp: truePeakDb(chs) };
if (rawPath) writeWav(rawPath, chs, 24);

let out = chs;
if (lufs != null || tp != null) {
  out = master(chs, { lufs, ceiling: tp, monoBassHz: 120 });
} else {
  out = master(chs, { lufs: null, ceiling: tp, monoBassHz: 120 });
}
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
writeWav(outPath, out, bits);

const L = integratedLoudness(out);
console.log(
  JSON.stringify(
    {
      out: outPath,
      seconds: +(out[0].length / SR).toFixed(3),
      raw: { lufs: +rawLevels.lufs.toFixed(2), truePeakDb: +rawLevels.tp.toFixed(2) },
      mastered: {
        lufsIntegrated: +L.toFixed(2),
        shortTermMax: +maxShortTerm(out).toFixed(2),
        truePeakDb: +truePeakDb(out).toFixed(2),
        bits,
      },
    },
    null,
    2
  )
);
