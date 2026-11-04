// Interim wordmark (D-011): "groove" + "rift" set in Sora Bold, converted to outlines, with the N2 bolt (D-058) under "rift".
// Zero dependencies. Glyph outlines come from the static Sora Bold TTF (OFL, see design/fonts/README.md);
// pen positions (advances, kerning, letter-spacing -0.02em) are measured in headless Chrome so they match the prototype.
// INTERIM: a professional designer produces the final vector wordmark before public launch (D-011, X-04).
// Usage: node docs/brand/derived/tools/wordmark.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const fontPath = resolve(repo, 'design/fonts/sora/static/sora-bold.ttf');
const outDir = resolve(here, '../wordmark');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TEXT = 'grooverift', RIFT_FROM = 6, TRACK = -0.02; // letter-spacing in em, as .wordmark in style.css
const COL = { light: '#F1F3F7', void: '#0B0D12', coral: '#FF586B', amber: '#FFCB69' }; // text-primary, Void, Coral, Amber
const BOLT_PTS = '0,3.2 22,3 27,1.6 31,3.4 36,0 41,9.5 46,1.2 50,6.5 54,3 72,3 76,1.8 79,3.6 82,3 100,3'; // app.js, D-058

// ---------- minimal TrueType reader (cmap 4, head, loca, glyf incl. composites) ----------
const f = readFileSync(fontPath);
const tables = {};
for (let i = 0, n = f.readUInt16BE(4); i < n; i++) { const o = 12 + i * 16; tables[f.toString('ascii', o, o + 4)] = { off: f.readUInt32BE(o + 8), len: f.readUInt32BE(o + 12) }; }
const head = tables.head.off, upem = f.readUInt16BE(head + 18), locFmt = f.readInt16BE(head + 50);
const loca = i => locFmt ? f.readUInt32BE(tables.loca.off + i * 4) : f.readUInt16BE(tables.loca.off + i * 2) * 2;
function glyphId(cp) {
  const c = tables.cmap.off; const n = f.readUInt16BE(c + 2);
  for (let i = 0; i < n; i++) {
    const st = c + f.readUInt32BE(c + 4 + i * 8 + 4); if (f.readUInt16BE(st) !== 4) continue;
    const seg = f.readUInt16BE(st + 6) / 2, ends = st + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
    for (let s = 0; s < seg; s++) {
      if (cp > f.readUInt16BE(ends + s * 2) || cp < f.readUInt16BE(starts + s * 2)) continue;
      const ro = f.readUInt16BE(ranges + s * 2), d = f.readInt16BE(deltas + s * 2);
      if (!ro) return (cp + d) & 0xffff;
      const g = f.readUInt16BE(ranges + s * 2 + ro + (cp - f.readUInt16BE(starts + s * 2)) * 2); return g ? (g + d) & 0xffff : 0;
    }
  }
  throw new Error('no cmap 4 entry for ' + cp);
}
function contours(gid, m = [1, 0, 0, 1, 0, 0]) { // [[{x,y,on}]] in font units, transformed by m
  const o = tables.glyf.off + loca(gid); if (loca(gid + 1) === loca(gid)) return [];
  const nc = f.readInt16BE(o); let p = o + 10; const tf = (x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  if (nc >= 0) {
    const ends = []; for (let i = 0; i < nc; i++) { ends.push(f.readUInt16BE(p)); p += 2; }
    p += 2 + f.readUInt16BE(p); const np = ends[nc - 1] + 1, flags = [];
    while (flags.length < np) { const fl = f[p++]; flags.push(fl); if (fl & 8) { let k = f[p++]; while (k--) flags.push(fl); } }
    const xs = [], ys = []; let v = 0;
    for (const fl of flags) { if (fl & 2) { const d = f[p++]; v += fl & 16 ? d : -d; } else if (!(fl & 16)) { v += f.readInt16BE(p); p += 2; } xs.push(v); }
    v = 0;
    for (const fl of flags) { if (fl & 4) { const d = f[p++]; v += fl & 32 ? d : -d; } else if (!(fl & 32)) { v += f.readInt16BE(p); p += 2; } ys.push(v); }
    const out = []; let s = 0;
    for (const e of ends) { const c = []; for (let i = s; i <= e; i++) c.push({ ...tf(xs[i], ys[i]), on: !!(flags[i] & 1) }); out.push(c); s = e + 1; }
    return out;
  }
  const out = []; let more = true;
  while (more) {
    const fl = f.readUInt16BE(p), g = f.readUInt16BE(p + 2); p += 4; let dx, dy;
    if (fl & 1) { dx = f.readInt16BE(p); dy = f.readInt16BE(p + 2); p += 4; } else { dx = f.readInt8(p); dy = f.readInt8(p + 1); p += 2; }
    if (!(fl & 2)) throw new Error('point-matched composites are not supported');
    let a = 1, b = 0, c = 0, d = 1; const f2 = q => f.readInt16BE(q) / 16384;
    if (fl & 8) { a = d = f2(p); p += 2; } else if (fl & 0x40) { a = f2(p); d = f2(p + 2); p += 4; } else if (fl & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
    const mm = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * dx + m[2] * dy + m[4], m[1] * dx + m[3] * dy + m[5]];
    out.push(...contours(g, mm)); more = !!(fl & 0x20);
  }
  return out;
}
const r = n => +n.toFixed(2);
function pathData(cs, ox, oy, s) { // quadratic contours -> SVG path; y flipped, scaled by s, pen origin (ox, oy) on the baseline
  const P = q => `${r(ox + q.x * s)} ${r(oy - q.y * s)}`; let d = '';
  for (const c of cs) {
    const n = c.length; const start = c.findIndex(q => q.on);
    const pts = start < 0 ? [{ x: (c[0].x + c[n - 1].x) / 2, y: (c[0].y + c[n - 1].y) / 2, on: true }, ...c] : [...c.slice(start), ...c.slice(0, start)];
    d += `M${P(pts[0])}`; let i = 1;
    while (i <= pts.length) {
      const q = pts[i % pts.length];
      if (q.on) { if (i < pts.length) d += `L${P(q)}`; i++; continue; }
      const nx = pts[(i + 1) % pts.length]; const end = nx.on ? nx : { x: (q.x + nx.x) / 2, y: (q.y + nx.y) / 2, on: true };
      d += `Q${P(q)} ${P(end)}`; i += nx.on ? 2 : 1;
    }
    d += 'Z';
  }
  return d;
}

// ---------- measure pen positions in Chrome (font-size 1000 px, letter-spacing -0.02em) ----------
const FS = 1000;
const tmp = mkdtempSync(join(tmpdir(), 'gr-wm-'));
const html = join(tmp, 'm.html');
writeFileSync(html, `<!doctype html><style>@font-face{font-family:SB;src:url("${pathToFileURL(fontPath).href}")}body{margin:0}#t{font:700 ${FS}px/1 SB;letter-spacing:${TRACK}em;white-space:nowrap;position:absolute;left:0;top:0}</style>
<span id="t">${TEXT}</span><pre id="o"></pre><script>document.fonts.load('700 ${FS}px SB').then(()=>{const t=document.getElementById('t').firstChild,g=document.createRange(),xs=[];
for(let i=0;i<${TEXT.length};i++){g.setStart(t,i);g.setEnd(t,i+1);const b=g.getBoundingClientRect();xs.push([b.left,b.right]);}
document.getElementById('o').textContent='POS'+JSON.stringify({xs,ok:document.fonts.check('700 ${FS}px SB')})+'END';});</script>`);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=3000', '--dump-dom', pathToFileURL(html).href], { encoding: 'utf8' });
rmSync(tmp, { recursive: true, force: true });
const mt = /POS(.*?)END/.exec(dom); if (!mt) throw new Error('Chrome measurement failed');
const { xs, ok } = JSON.parse(mt[1]); if (!ok) throw new Error('Sora Bold did not load in Chrome');

// ---------- assemble ----------
const s = FS / upem, base = 0.84 * FS; // Sora: baseline at 0.84em with line-height 1 (style.css note on the bolt)
let groove = '', rift = '';
for (let i = 0; i < TEXT.length; i++) { const d = pathData(contours(glyphId(TEXT.charCodeAt(i))), xs[i][0], base, s); if (i < RIFT_FROM) groove += d; else rift += d; }
// the bolt, as .wm-bolt in style.css: left -0.03em, top 0.86em, width rift + 0.06em, height 0.3em;
// the top bar draws a 1.15 px stroke at any size (non-scaling); a scaled-up logo needs a thinner line to stay a hairline (D-058 "Nit"), so the stroke is 0.75/20 em, the core 0.35/20 em, the glow 1.6/20 em
const rx0 = xs[RIFT_FROM][0], rx1 = xs[TEXT.length - 1][1];
const bx = rx0 - 0.03 * FS, bw = rx1 - rx0 + 0.06 * FS, by = 0.86 * FS, bh = 0.3 * FS, u = FS / 20;
const pts = BOLT_PTS.split(' ').map(p => p.split(',').map(Number)).map(([x, y]) => `${r(bx + x / 100 * bw)},${r(by + y / 10 * bh)}`).join(' ');
const x0 = -0.02 * FS, W = Math.ceil(Math.max(xs[TEXT.length - 1][1], bx + bw) + 0.04 * FS - x0), H = Math.ceil(by + bh + 0.08 * FS);
function svg(theme) {
  const dark = theme === 'dark';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 0 ${W} ${H}" width="${r(W / 5)}" height="${r(H / 5)}" role="img" aria-label="GrooveRift">
<!-- GrooveRift INTERIM wordmark (D-011) for ${theme} backgrounds. Not the final logo: a designer delivers the final vector wordmark (X-04).
     Type: Sora Bold, outlined (SIL Open Font License 1.1, Copyright 2019 The Sora Project Authors). Accent: bolt N2 "Nit s iskrama" (D-058), static.
     Generated by docs/brand/derived/tools/wordmark.mjs. -->
<title>GrooveRift</title>
<defs><linearGradient id="bolt" gradientUnits="userSpaceOnUse" x1="${r(bx)}" y1="0" x2="${r(bx + bw)}" y2="0"><stop offset="0" stop-color="${COL.coral}"/><stop offset="1" stop-color="${COL.amber}"/></linearGradient>${dark ? `<filter id="glow" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="${r(1.2 * u / 2)}"/></filter>` : ''}</defs>
<path fill="${dark ? COL.light : COL.void}" d="${groove}"/>
<path fill="${COL.coral}" d="${rift}"/>
<g fill="none" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="round">
${dark ? `<polyline points="${pts}" stroke="#FF7864" stroke-width="${r(1.6 * u)}" opacity=".85" filter="url(#glow)"/>
<polyline points="${pts}" stroke="url(#bolt)" stroke-width="${r(0.75 * u)}"/>
<polyline points="${pts}" stroke="#FFF4E6" stroke-width="${r(0.35 * u)}" opacity=".5"/>` : `<polyline points="${pts}" stroke="${COL.coral}" stroke-width="${r(0.85 * u)}"/>`}
</g>
</svg>
`;
}
mkdirSync(outDir, { recursive: true });
for (const t of ['dark', 'light']) writeFileSync(join(outDir, `grooverift-wordmark-interim-${t}.svg`), svg(t));
// PNG exports (transparent background) for places that take no SVG, such as e-mail. Rendered by headless Chrome.
for (const t of ['dark', 'light']) for (const pw of [1200, 600]) {
  const ph = Math.round(pw * H / W), dir = mkdtempSync(join(tmpdir(), 'gr-wm-')), page = join(dir, 'p.html');
  writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:${pw}px;height:${ph}px}</style><img src="${pathToFileURL(join(outDir, `grooverift-wordmark-interim-${t}.svg`)).href}">`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--default-background-color=00000000', `--window-size=${pw},${ph}`,
    `--screenshot=${join(outDir, `grooverift-wordmark-interim-${t}-${pw}.png`)}`, pathToFileURL(page).href], { stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
}
console.log(`upem ${upem}; viewBox ${x0} 0 ${W} ${H}; rift ${r(rx0)}..${r(rx1)}; pens ${xs.map(x => r(x[0])).join(' ')}`);
