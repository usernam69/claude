// Claude Opus 5.5 — 30 s ad. One script drives both cuts (1080×1920 and 1920×1080);
// layout adapts to the root composition size. Every frame is a pure function of t.
const __adStart = () => {
const { clamp, lerp, prog, ease, ep, mulberry32, drift, splitChars, charsInOut } = M;
const W = window.AD_W, H = window.AD_H, PORTRAIT = H > W, DUR = 30, BEAT = 0.5;
const CREAM = '#F0EEE6', INK = '#1F1E1D', CLAY = '#D97757', PAPER = '#FBFAF6', GREEN = '#6E9A5A', TEAL = '#2f5d62';
const SANS = 'Inter, sans-serif', MONO = '"DejaVu Sans Mono", "Liberation Mono", monospace';
const $ = (id) => document.getElementById(id);
const cv = $('ui'), g = cv.getContext('2d');
const bgc = $('bg').getContext('2d');

// ---------- layout (safe zones: portrait keeps content between y≈260 and y≈1560)
const L = PORTRAIT
  ? { cap: { x: 80, y: 290, w: 920, size: 112, align: 'center' }, card: { x: 80, y: 640, w: 920, h: 860 }, lock: { y: 0 } }
  : { cap: { x: 110, y: 0, w: 720, size: 104, align: 'left' }, card: { x: 900, y: 150, w: 900, h: 780 }, lock: { y: 0 } };
const VW = 900, VH = 800; // virtual card space
const cs = Math.min(L.card.w / VW, L.card.h / VH);
const cox = L.card.x + (L.card.w - VW * cs) / 2, coy = L.card.y + (L.card.h - VH * cs) / 2;

// ---------- captions (DOM, serif)
const capWrap = $('caps');
Object.assign(capWrap.style, { left: L.cap.x + 'px', top: (PORTRAIT ? L.cap.y : 0) + 'px', width: L.cap.w + 'px', height: PORTRAIT ? '300px' : H + 'px', textAlign: L.cap.align, fontSize: L.cap.size + 'px' });
const CAPS = [
  { lines: ['47 tabs open.'], tIn: 0.25, tOut: 3.62, row: 0 },
  { lines: ['Still stuck.'], tIn: 1.2, tOut: 3.66, row: 1, clay: true },
  { lines: ['Just ask.'], tIn: 4.55, tOut: 8.1, row: 0 },
  { lines: ['Untangle the mess.'], tIn: 8.55, tOut: 12.75, row: 0 },
  { lines: ['Fix the bug.'], tIn: 13.25, tOut: 17.75, row: 0 },
  { lines: ['Find the words.'], tIn: 18.25, tOut: 22.75, row: 0 },
  { lines: ['One conversation.'], tIn: 23.2, tOut: 25.55, row: 0 },
  { lines: ['Less stuck.'], tIn: 24.2, tOut: 25.6, row: 1, clay: true },
];
CAPS.forEach((c, i) => {
  const el = document.createElement('div'); el.className = 'cap serif';
  const rowH = L.cap.size * 1.12;
  if (PORTRAIT) el.style.top = (c.row * rowH) + 'px';
  else el.style.top = (H / 2 - rowH + c.row * rowH - 10) + 'px';
  el.textContent = c.lines[0]; if (c.clay) el.style.color = '#BF5B3A';
  capWrap.appendChild(el); c.el = el; c.chars = splitChars(el);
});

// ---------- end card
const lock = $('lock');
const lockA = splitChars($('lockA')), lockB = splitChars($('lockBText'));

// ---------- seeded data
const R = mulberry32(3030);
const TAB_COLS = [CLAY, TEAL, INK, '#8a8f98', '#c9a227', '#5d7f86', '#b05a3c'];
const tabs = [];
for (let i = 0; i < 47; i++) {
  const w = 250 + R() * 150, h = 62;
  tabs.push({ w, h, x: 10 + R() * (VW - w - 20), y: 30 + R() * (VH - h - 60), rot: (R() - 0.5) * 0.5, col: TAB_COLS[Math.floor(R() * TAB_COLS.length)], tl: 0.4 + R() * 0.5, t0: 0.04 + i * 0.028, sx: (R() - 0.5) * 300, active: i === 46 });
}
const INPUT = { x: 40, y: 352, w: 820, h: 96 };
const ASK = 'Help me make sense of all this.';
const REPLY = 'Okay. Let’s take it one piece at a time.'.split(' ');
const rows = [['Online', 'Web', 58], ['West', 'Store', 17], ['North', 'Store', 42], ['Retail', 'Partner', 12], ['South', 'Store', 31], ['East', 'Store', 25]];
const sorted = rows.map((r, i) => i).sort((a, b) => rows[b][2] - rows[a][2]);
const messy = rows.map(() => ({ dx: (R() - 0.5) * 90, dy: (R() - 0.5) * 18, rot: (R() - 0.5) * 0.08, red: R() < 0.45 }));
const CODE = [
  [['kw', 'function '], ['fn', 'total'], ['p', '(items) {']],
  [['p', '  '], ['kw', 'let '], ['p', 'sum = '], ['num', '0'], ['p', ';']],
  [['p', '  '], ['kw', 'for '], ['p', '('], ['kw', 'let '], ['p', 'i = '], ['num', '0'], ['p', '; i '], ['bug', '<='], ['p', ' items.length; i++) {']],
  [['p', '    sum += items[i].price;']],
  [['p', '  }']],
  [['p', '  '], ['kw', 'return '], ['p', 'sum;']],
  [['p', '}']],
];
const DRAFT = 'Hi! So, um, I was just wondering if maybe you might possibly have some time this week to sort of talk about the project?'.split(' ');
const FILLER = new Set([1, 2, 5, 8, 10, 11, 13, 18, 19]); // So, um, just, maybe, might, possibly, some, sort, of
// sanity: the kept words read "Hi! I was wondering if you have time this week to talk about the project?"

// ---------- helpers
function rr(x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function shadow(on, blur = 30, a = 0.1, oy = 10) { if (on) { g.shadowColor = `rgba(60,40,20,${a})`; g.shadowBlur = blur * cs; g.shadowOffsetY = oy * cs; } else { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; } }
function font(px, w = 500, fam = SANS) { g.font = `${w} ${px}px ${fam}`; }
function card(x, y, w, h, fill = PAPER, r = 28, sh = true) { shadow(sh, 40, 0.12, 14); g.fillStyle = fill; rr(x, y, w, h, r); g.fill(); shadow(false); }
const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

// card container rectangles for each scene (virtual space)
const RECT = { chat: { x: 40, y: 80, w: 820, h: 640 }, big: { x: 10, y: 30, w: 880, h: 740 } };

function render(t) {
  t = clamp(t, 0, DUR);
  // ---------- background (cream paper, drifting soft blobs, grain)
  bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.fillStyle = CREAM; bgc.fillRect(0, 0, W, H);
  [[0.2, 0.25, CLAY, 0.10, 1], [0.85, 0.7, TEAL, 0.06, 2], [0.6, 0.15, '#c9a227', 0.06, 3]].forEach(([fx, fy, col, a, s]) => {
    const x = W * fx + drift(t, s, 0.25) * 80, y = H * fy + drift(t, s + 5, 0.25) * 80, r = Math.max(W, H) * 0.45;
    const gr = bgc.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0)); bgc.fillStyle = gr; bgc.fillRect(0, 0, W, H); });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.setTransform(cs, 0, 0, cs, cox, coy);

  // ===== S1 tabs (0–4.4)
  if (t < 4.45) {
    const jit = (k) => { const bt = (t % BEAT) / BEAT; return t > 1.5 && t < 3.8 ? Math.sin(k * 3.1 + Math.floor(t / BEAT)) * 3 * Math.exp(-bt * 6) : 0; };
    tabs.forEach((tb, i) => {
      const pf = prog(t, tb.t0, tb.t0 + 0.38); if (pf <= 0) return;
      const fall = ease('power2.in', pf);
      let x = lerp(tb.x + tb.sx, tb.x, fall), y = lerp(-900 - i * 10, tb.y, fall);
      const land = t - (tb.t0 + 0.38); let rot = tb.rot + (land > 0 ? Math.sin(land * 22) * 0.08 * Math.exp(-land * 7) : (1 - fall) * 0.6);
      let sy = land > 0 ? 1 - 0.12 * Math.exp(-land * 14) * Math.cos(land * 30) : 1;
      x += jit(i); y += jit(i + 9) * 0.6;
      // collapse into the input box
      const pc = ep(t, 3.78 + (i % 12) * 0.008, 4.22 + (i % 12) * 0.008, 'power3.in');
      let r = { x, y, w: tb.w, h: tb.h }; r = lerpRect(r, INPUT, pc); rot = lerp(rot, 0, pc);
      const alpha = 1 - ep(t, 4.1, 4.3);
      g.save(); g.globalAlpha = alpha; g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(rot); g.scale(1, sy);
      shadow(true, 18, 0.08, 6); g.fillStyle = tb.active ? '#fff' : PAPER; rr(-r.w / 2, -r.h / 2, r.w, r.h, 18); g.fill(); shadow(false);
      g.strokeStyle = tb.active ? CLAY : 'rgba(31,30,29,0.12)'; g.lineWidth = tb.active ? 3 : 1.5; g.stroke();
      if (pc < 0.6) {
        g.fillStyle = tb.col; g.beginPath(); g.arc(-r.w / 2 + 30, 0, 11, 0, 7); g.fill();
        g.fillStyle = 'rgba(31,30,29,0.28)'; rr(-r.w / 2 + 54, -7, (r.w - 110) * tb.tl, 14, 7); g.fill();
        g.strokeStyle = 'rgba(31,30,29,0.3)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(r.w / 2 - 34, -7); g.lineTo(r.w / 2 - 20, 7); g.moveTo(r.w / 2 - 20, -7); g.lineTo(r.w / 2 - 34, 7); g.stroke();
      }
      g.restore();
    });
    // clock chip
    const pcl = ep(t, 1.6, 1.95, 'back.out') * (1 - ep(t, 3.6, 3.85));
    if (pcl > 0) { g.save(); g.globalAlpha = clamp(pcl); g.translate(VW / 2, -40); g.scale(pcl, pcl); shadow(true, 20, 0.12, 6); g.fillStyle = INK; rr(-110, -34, 220, 68, 34); g.fill(); shadow(false);
      font(34, 600); g.fillStyle = CREAM; g.textAlign = 'center'; g.textBaseline = 'middle'; const mins = 47 + Math.floor(prog(t, 2.0, 3.6) * 0); g.fillText(`11:${mins} PM`, 0, 2); g.restore(); }
  }

  // ===== S3 chat (4.1–8.6)
  if (t >= 4.1 && t < 8.7) {
    const appear = ep(t, 4.1, 4.4, 'power2.out');
    const toBubble = ep(t, 6.6, 7.0, 'power3.inOut');
    const USER = { x: 120, y: 100, w: 740, h: 104 };
    let r = lerpRect(INPUT, USER, toBubble);
    const grow = ep(t, 8.25, 8.65, 'power3.inOut'); // reply bubble → table card
    g.save(); g.globalAlpha = appear * (1 - grow);
    card(r.x, r.y, r.w, r.h, toBubble > 0.5 ? '#ECE7DA' : '#fff', 48, toBubble < 0.5);
    if (toBubble < 0.5) { g.strokeStyle = 'rgba(31,30,29,0.14)'; g.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 48); g.stroke(); }
    // typed text
    const n = Math.floor(clamp((t - 4.55) / 0.055, 0, ASK.length));
    font(44, 500); g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    const txt = n > 0 ? ASK.slice(0, n) : '';
    if (!txt && t < 4.6) { g.fillStyle = 'rgba(31,30,29,0.35)'; g.fillText('Ask anything', r.x + 36, r.y + r.h / 2); }
    else { g.save(); const tw = g.measureText(ASK).width; const sc2 = Math.min(1, (r.w - 130) / tw); g.translate(r.x + 36, r.y + r.h / 2); g.scale(sc2, sc2); g.fillText(txt, 0, 0);
      if (toBubble < 0.1 && Math.floor(t / 0.5) % 2 === 0) { g.fillStyle = CLAY; g.fillRect(g.measureText(txt).width + 4, -26, 5, 52); } g.restore(); }
    // send button
    if (toBubble < 0.9) { const press = t > 6.35 ? 1 - 0.18 * Math.exp(-(t - 6.35) * 12) * Math.cos((t - 6.35) * 30) : 1; const bx = r.x + r.w - 56, by = r.y + r.h / 2;
      g.save(); g.globalAlpha *= 1 - toBubble; g.translate(bx, by); g.scale(press, press); g.fillStyle = n >= ASK.length ? CLAY : 'rgba(31,30,29,0.15)'; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 12); g.lineTo(0, -12); g.moveTo(-10, -2); g.lineTo(0, -12); g.lineTo(10, -2); g.stroke(); g.restore(); }
    g.restore();
    // reply bubble with streamed words
    const ra = ep(t, 6.95, 7.25, 'back.out');
    if (ra > 0) {
      const REP = { x: 40, y: 250, w: 820, h: 180 };
      const rb = lerpRect(REP, RECT.big, grow);
      g.save(); g.globalAlpha = clamp(ra); card(rb.x, rb.y, rb.w, rb.h, '#fff', 32);
      g.globalAlpha = clamp(ra) * (1 - grow);
      g.fillStyle = CLAY; g.beginPath(); g.arc(rb.x + 46, rb.y + 60, 15, 0, 7); g.fill();
      font(44, 500); g.fillStyle = INK; g.textBaseline = 'middle';
      let x = rb.x + 84, y = rb.y + 60; const nw = Math.floor(clamp((t - 7.15) / 0.11, 0, REPLY.length));
      REPLY.forEach((w, i) => { const ww = g.measureText(w + ' ').width; if (x + ww > rb.x + rb.w - 30) { x = rb.x + 84; y += 60; } if (i < nw) { const pa = clamp((t - 7.15 - i * 0.11) / 0.12); g.globalAlpha = (1 - grow) * pa; g.fillText(w, x, y + (1 - pa) * 8); } x += ww; });
      g.restore();
    }
  }

  // ===== S4 table → chart (8.4–13.4)
  if (t >= 8.4 && t < 13.45) {
    const toCode = ep(t, 12.95, 13.4, 'power3.inOut');
    const C = RECT.big; const fill = mixHex(PAPER, INK, toCode);
    card(C.x, C.y, C.w, C.h, fill, 32);
    const a = ep(t, 8.5, 8.8) * (1 - ep(t, 12.85, 13.05));
    if (a > 0) {
      g.save(); g.globalAlpha = a;
      const snap = ep(t, 9.5, 9.95, 'back.out'), sortP = ep(t, 9.9, 10.5, 'power3.inOut'), toBars = ep(t, 11.1, 11.8, 'power3.inOut');
      const x0 = C.x + 56, rowH = 88, y0 = C.y + 140;
      font(30, 600); g.fillStyle = 'rgba(31,30,29,0.5)'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.globalAlpha = a * (1 - toBars); ['Channel', 'Type', 'Sales'].forEach((h, k) => g.fillText(h.toUpperCase(), x0 + [0, 280, 560][k], C.y + 80)); g.globalAlpha = a;
      rows.forEach((row, i) => {
        const rank = sorted.indexOf(i); const yi = lerp(y0 + i * rowH, y0 + rank * rowH, sortP);
        const m = messy[i]; const dx = m.dx * (1 - snap), dy = m.dy * (1 - snap), rot = m.rot * (1 - snap);
        g.save(); g.translate(x0 + dx, yi + dy); g.rotate(rot);
        // row background / red flags
        const redA = m.red ? 0.22 * (1 - ep(t, 9.6, 10.0)) : 0;
        g.fillStyle = `rgba(217,119,87,${redA})`; rr(-16, -34, 800, 68, 12); g.fill();
        if (i % 2 === 0) { g.fillStyle = `rgba(31,30,29,${0.04 * (1 - toBars)})`; rr(-16, -34, 800, 68, 12); g.fill(); }
        font(40, 500); g.fillStyle = INK;
        g.globalAlpha = a; g.fillText(row[0], 0, 0);
        g.globalAlpha = a * (1 - toBars); g.fillStyle = 'rgba(31,30,29,0.6)'; g.fillText(row[1], 280, 0);
        // sales: number → bar
        const maxV = 58, bw = lerp(0, 430 * row[2] / maxV, toBars);
        g.globalAlpha = a; g.fillStyle = rank === 0 ? CLAY : `rgba(31,30,29,${lerp(0, 0.75, toBars)})`;
        if (toBars > 0) { rr(lerp(560, 220, toBars), -22, bw, 44, 10); g.fill(); }
        font(40, 600); g.fillStyle = INK; g.fillText(String(row[2]), lerp(560, 220 + bw + 16, toBars), 0);
        g.restore();
      });
      // total row
      const tot = ep(t, 10.55, 10.9, 'back.out') * (1 - toBars);
      if (tot > 0) { g.globalAlpha = a * clamp(tot); g.strokeStyle = 'rgba(31,30,29,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 16, y0 + 6 * rowH - 34); g.lineTo(x0 + 784, y0 + 6 * rowH - 34); g.stroke();
        font(40, 700); g.fillStyle = INK; g.fillText('Total', x0, y0 + 6 * rowH + 8 - (1 - tot) * 20); g.fillText('185', x0 + 560, y0 + 6 * rowH + 8 - (1 - tot) * 20); }
      g.restore();
    }
  }

  // ===== S5 code (13.0–18.4)
  if (t >= 13.3 && t < 18.45) {
    const C = RECT.big; const toDoc = ep(t, 17.95, 18.4, 'power3.inOut');
    card(C.x, C.y, C.w, C.h, mixHex(INK, PAPER, toDoc), 32);
    const a = ep(t, 13.35, 13.65) * (1 - ep(t, 17.8, 18.0));
    if (a > 0) {
      g.save(); g.globalAlpha = a;
      // window dots
      [CLAY, '#c9a227', GREEN].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(C.x + 44 + k * 30, C.y + 44, 9, 0, 7); g.fill(); });
      font(24, 500, MONO); g.fillStyle = 'rgba(240,238,230,0.45)'; g.fillText('total.js', C.x + 150, C.y + 46);
      const x0 = C.x + 66, y0 = C.y + 130, lh = 66; font(30, 500, MONO); g.textBaseline = 'middle';
      const fix = ep(t, 15.0, 15.25), flashG = Math.exp(-Math.max(0, t - 15.1) * 3) * (t > 15.1 ? 1 : 0);
      let bugX = 0, bugW = 0;
      CODE.forEach((line, li) => {
        const ly = y0 + li * lh; const la = ep(t, 13.45 + li * 0.07, 13.75 + li * 0.07);
        g.globalAlpha = a * la;
        if (li === 2 && flashG > 0) { g.fillStyle = `rgba(110,154,90,${0.35 * flashG})`; g.fillRect(C.x + 20, ly - 26, C.w - 40, 52); }
        g.fillStyle = 'rgba(240,238,230,0.3)'; g.textAlign = 'right'; g.fillText(String(li + 1), x0 - 18, ly); g.textAlign = 'left';
        let x = x0 + (1 - la) * 30;
        line.forEach(([k, s]) => {
          let str = s; if (k === 'bug') str = fix > 0.5 ? '<' : '<=';
          g.fillStyle = k === 'kw' ? CLAY : k === 'fn' ? '#e8c27a' : k === 'num' ? '#9fc3c7' : k === 'bug' ? (fix > 0.5 ? '#a6d08f' : '#ff9b85') : CREAM;
          if (k === 'bug') { bugX = x; bugW = g.measureText(str).width; if (t > 14.75 && t < 15.0) { g.fillStyle = 'rgba(217,119,87,0.45)'; g.fillRect(x - 3, ly - 20, g.measureText('<=').width + 6, 40); g.fillStyle = '#ff9b85'; } }
          g.fillText(str, x, ly); x += g.measureText(str).width;
        });
        if (li === 2) {
          // squiggle under "<="
          const sq = ep(t, 14.0, 14.4) * (1 - ep(t, 14.95, 15.05));
          if (sq > 0) { g.strokeStyle = '#ff7a62'; g.lineWidth = 3; g.beginPath(); const sw = g.measureText('<=').width + 6;
            for (let k = 0; k <= 24 * sq; k++) { const xx = bugX - 3 + (k / 24) * sw; const yy = ly + 22 + Math.sin(k * 1.3) * 3; k === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy); } g.stroke(); }
          // label chip
          const lc = ep(t, 14.25, 14.55, 'back.out') * (1 - ep(t, 14.9, 15.05));
          if (lc > 0) { g.save(); g.globalAlpha = a * clamp(lc); g.translate(C.x + C.w - 250, ly - lh); g.scale(lc, lc); g.fillStyle = '#ff7a62'; rr(-12, -26, 220, 52, 26); g.fill(); font(26, 600, SANS); g.fillStyle = INK; g.textAlign = 'left'; g.fillText('off-by-one', 14, 1); g.restore(); font(30, 500, MONO); }
        }
      });
      // tests bar
      g.globalAlpha = a;
      const tb = ep(t, 15.9, 16.7, 'power2.inOut'), tbA = ep(t, 15.7, 15.95);
      if (tbA > 0) { const bx = C.x + 50, by = C.y + C.h - 110, bw = C.w - 100; g.globalAlpha = a * tbA;
        g.fillStyle = 'rgba(240,238,230,0.08)'; rr(bx, by, bw, 64, 32); g.fill(); g.fillStyle = GREEN; rr(bx, by, Math.max(64, bw * tb), 64, 32); g.fill();
        font(28, 600, SANS); g.fillStyle = tb > 0.98 ? '#fff' : 'rgba(255,255,255,0.8)'; g.textBaseline = 'middle'; g.fillText(tb > 0.98 ? '✓  Tests passing' : 'Running tests…', bx + 34, by + 33); }
      g.restore();
    }
  }

  // ===== S6 words (18.2–23.4)
  if (t >= 18.3 && t < 23.6) {
    const C = RECT.big; const toThread = ep(t, 22.9, 23.5, 'power3.inOut');
    const r = lerpRect(C, { x: 230, y: 300, w: 440, h: 300 }, toThread);
    card(r.x, r.y, r.w, r.h, PAPER, 32);
    const a = ep(t, 18.4, 18.7) * (1 - ep(t, 22.8, 23.0));
    if (a > 0) {
      g.save(); g.globalAlpha = a;
      font(26, 600); g.fillStyle = 'rgba(31,30,29,0.5)'; g.textBaseline = 'middle'; g.fillText('DRAFT', C.x + 56, C.y + 74);
      g.fillStyle = 'rgba(31,30,29,0.1)'; g.fillRect(C.x + 56, C.y + 108, C.w - 112, 2);
      font(48, 500); const lh = 74, maxW = C.w - 112;
      // layout A (all words) and layout B (kept words only)
      const layout = (keepOnly) => { const pos = []; let x = 0, y = 0; DRAFT.forEach((w, i) => { const ww = g.measureText(w).width, sp = g.measureText(' ').width;
        if (keepOnly && FILLER.has(i)) { pos.push({ x, y, w: ww, hidden: true }); return; } if (x + ww > maxW) { x = 0; y += lh; } pos.push({ x, y, w: ww }); x += ww + sp; }); return pos; };
      const A = layout(false), B = layout(true);
      const strike = (i) => ep(t, 19.3 + [...FILLER].indexOf(i) * 0.11, 19.5 + [...FILLER].indexOf(i) * 0.11, 'power2.out');
      const reflow = ep(t, 20.7, 21.5, 'power3.inOut');
      const bx = C.x + 56, by = C.y + 170;
      DRAFT.forEach((w, i) => {
        const filler = FILLER.has(i); const p = A[i], q = B[i];
        const x = lerp(p.x, q.x, reflow), y = lerp(p.y, q.y, reflow);
        const fa = filler ? 1 - ep(t, 20.5, 20.9) : 1;
        if (fa <= 0.001) return;
        g.globalAlpha = a * fa * clamp((t - 18.5 - i * 0.02) / 0.2);
        g.fillStyle = filler && t > 19.3 ? 'rgba(31,30,29,0.45)' : INK; g.fillText(w, bx + x, by + y);
        if (filler) { const s = strike(i); if (s > 0) { g.strokeStyle = CLAY; g.lineWidth = 4; g.beginPath(); g.moveTo(bx + x - 2, by + y + 2); g.lineTo(bx + x - 2 + (p.w + 4) * s, by + y + 2); g.stroke(); } }
      });
      // sent chip
      const sc = ep(t, 21.7, 22.05, 'back.out');
      if (sc > 0) { g.globalAlpha = a * clamp(sc); g.save(); g.translate(C.x + C.w - 170, C.y + C.h - 90); g.scale(sc, sc); g.fillStyle = INK; rr(-110, -36, 220, 72, 36); g.fill(); font(30, 600); g.fillStyle = CREAM; g.textAlign = 'center'; g.fillText('Send →', 0, 2); g.restore(); }
      g.restore();
    }
  }

  // ===== S7 thread (23.0–26.0): three mini cards stack into one conversation
  if (t >= 23.0 && t < 26.1) {
    const out = ep(t, 25.45, 25.95, 'power3.in');
    const minis = [{ k: 'chart', d: 0 }, { k: 'code', d: 0.1 }, { k: 'doc', d: 0.2 }];
    minis.forEach((mm, i) => {
      const pin = ep(t, 23.2 + mm.d, 23.65 + mm.d, 'back.out');
      const tx = 230, ty = 70 + i * 230; const w = 440, h = 200;
      let x = lerp(i === 2 ? 230 : (i === 0 ? -400 : 1100), tx, i === 2 ? 1 : pin), y = lerp(i === 2 ? 300 : ty, ty, i === 2 ? ep(t, 23.3, 23.8, 'power3.inOut') : 1);
      let hh = i === 2 ? lerp(300, h, ep(t, 23.3, 23.8, 'power3.inOut')) : h;
      if (i !== 2 && pin <= 0) return;
      // collapse toward the end-card cursor at the centre
      const cx = VW / 2, cy = VH / 2; x = lerp(x, cx, out); y = lerp(y, cy, out); const ww = lerp(w, 0, out); hh = lerp(hh, 0, out);
      g.save(); g.globalAlpha = 1 - out * 0.8;
      card(x, y, ww, hh, mm.k === 'code' ? INK : PAPER, 24);
      if (out < 0.5) {
        if (mm.k === 'chart') [58, 42, 31, 25].forEach((v, j) => { g.fillStyle = j === 0 ? CLAY : 'rgba(31,30,29,0.6)'; rr(x + 40, y + 36 + j * 36, 320 * v / 58, 22, 8); g.fill(); });
        if (mm.k === 'code') [0.5, 0.75, 0.6, 0.4].forEach((v, j) => { g.fillStyle = j === 2 ? GREEN : 'rgba(240,238,230,0.5)'; rr(x + 40 + (j % 2) * 30, y + 40 + j * 34, 330 * v, 16, 8); g.fill(); });
        if (mm.k === 'doc') [0.9, 0.8, 0.55].forEach((v, j) => { g.fillStyle = 'rgba(31,30,29,0.55)'; rr(x + 40, y + 50 + j * 40, 360 * v, 18, 9); g.fill(); });
      }
      g.restore();
    });
  }
  // the clay cursor that bridges into the end card
  if (t >= 25.75 && t < 26.25) { const p = ep(t, 25.75, 26.1, 'back.out'); g.fillStyle = CLAY; rr(VW / 2 - 7, VH / 2 - 60 * p, 14, 120 * p, 4); g.fill(); }

  // ---------- captions
  CAPS.forEach((c) => {
    const on = t >= c.tIn - 0.01 && t < c.tOut + 0.4; c.el.style.visibility = on ? 'visible' : 'hidden';
    if (on) { charsInOut(c.chars, t, c.tIn, c.tOut, { stagger: 0.022, dur: 0.45, dy: 46, blur: 12 }); c.el.style.transform = `scale(${(1 + 0.02 * prog(t, c.tIn, c.tOut)).toFixed(4)})`; }
  });
  // ---------- end card (26–30)
  {
    const on = t >= 25.95; lock.style.opacity = on ? 1 : 0;
    if (on) {
      charsInOut(lockA, t, 26.05, null, { stagger: 0.04, dur: 0.6, dy: 70, blur: 16, easeIn: 'expo.out' });
      charsInOut(lockB, t, 26.3, null, { stagger: 0.04, dur: 0.55, dy: 50, blur: 12, easeIn: 'expo.out' });
      const cta = ep(t, 26.75, 27.2, 'back.out'); const ctaEl = $('cta');
      ctaEl.style.opacity = clamp(cta * 1.5); ctaEl.style.transform = `translateY(${((1 - cta) * 40).toFixed(1)}px) scale(${(0.9 + 0.1 * cta + 0.012 * Math.sin((t - 27) * Math.PI)).toFixed(4)})`;
      lock.style.transform = `scale(${(1 + 0.03 * ep(t, 26, 30, 'sine.out')).toFixed(4)})`;
      const cur = $('cur'); cur.style.opacity = t < 26.5 ? 1 : (Math.floor((t - 26) / BEAT) % 2 === 0 ? 1 : 0.15);
    }
  }
  // ---------- grain
  const f = Math.floor(t * 30), rg = mulberry32(f + 7);
  g.setTransform(2, 0, 0, 2, -rg() * 256, -rg() * 256); g.globalAlpha = 0.035; g.globalCompositeOperation = 'multiply';
  g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, p) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = (s) => Math.round(lerp((x >> s) & 255, (y >> s) & 255, p)); return `rgb(${c(16)},${c(8)},${c(0)})`; }
const GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256;
{ const gg = GRAIN.getContext('2d'), im = gg.createImageData(256, 256), r = mulberry32(99); for (let i = 0; i < im.data.length; i += 4) { const v = 120 + r() * 135; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gg.putImageData(im, 0, 0); }

const P = { t: 0 };
const tl = gsap.timeline({ paused: true });
tl.to(P, { t: DUR, duration: DUR, ease: 'none', onUpdate: () => render(P.t) }, 0);
window.__timelines = window.__timelines || {};
window.__timelines.main = tl;
window.__render = render;
document.fonts.ready.then(() => render(P.t));
render(0);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __adStart); else __adStart();
