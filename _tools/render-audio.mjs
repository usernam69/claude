// Renders a Web Audio score offline (OfflineAudioContext) in headless Chrome
// and writes a WAV. Usage:
//   node render-audio.mjs <score.js> <out.wav> [--gain 1.0] [--sr 48000] [--bits 24]
// The score file sets window.SCORE = { duration, channels?, seed?, build(E, ctx, opts) }.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const scorePath = path.resolve(args[0]);
const outPath = path.resolve(args[1]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const gain = parseFloat(opt('gain', '1'));
const sr = parseInt(opt('sr', '48000'));
const bits = parseInt(opt('bits', '24'));
const stem = opt('stem', 'all');

const chrome = execSync('npx --prefix ' + path.dirname(new URL(import.meta.url).pathname) + ' hyperframes browser path 2>/dev/null').toString().trim().split('\n').pop();
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 3600000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exitCode = 1; });
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: fs.readFileSync(new URL('./lib/synth.js', import.meta.url), 'utf8') });
await page.evaluate((s) => { window.__STEM = s; }, stem);
await page.addScriptTag({ content: fs.readFileSync(scorePath, 'utf8') });
const t0 = Date.now();
const info = await page.evaluate(async (sr, gain, bits) => {
  const S = window.SCORE;
  const ctx = new OfflineAudioContext(S.channels || 2, Math.ceil(S.duration * sr), sr);
  const E = new Synth.Engine(ctx, S.seed || 1);
  E.master.gain.value = gain;
  await S.build(E, ctx, {});
  const buf = await ctx.startRendering();
  // tail fade to avoid end clicks
  const fade = Math.floor(sr * 0.05);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade; }
  let peak = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
  window.__wav = Synth.encodeWAV(buf, bits);
  return { len: window.__wav.length, peak, dur: buf.duration };
}, sr, gain, bits);
const chunks = [];
const CH = 4 * 1024 * 1024;
for (let o = 0; o < info.len; o += CH) {
  const b64 = await page.evaluate((o, CH) => {
    const s = window.__wav.subarray(o, o + CH); let bin = '';
    for (let i = 0; i < s.length; i += 0x8000) bin += String.fromCharCode.apply(null, s.subarray(i, i + 0x8000));
    return btoa(bin);
  }, o, CH);
  chunks.push(Buffer.from(b64, 'base64'));
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.concat(chunks));
await browser.close();
console.log(JSON.stringify({ out: outPath, seconds: info.dur, samplePeak: +info.peak.toFixed(4), renderMs: Date.now() - t0 }));
