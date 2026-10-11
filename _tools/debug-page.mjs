import puppeteer from 'puppeteer-core'; import { execSync } from 'node:child_process'; import path from 'node:path';
const chrome = execSync('npx --prefix /home/user/claude/_tools hyperframes browser path 2>/dev/null').toString().trim().split('\n').pop();
const b = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await b.newPage(); p.on('console', (m) => console.log('[console]', m.text())); p.on('pageerror', (e) => console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0,3).join(' | ')));
await p.goto('file://' + path.resolve(process.argv[2]), { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 1500));
console.log('timelines:', await p.evaluate(() => Object.keys(window.__timelines || {})));
await b.close();
