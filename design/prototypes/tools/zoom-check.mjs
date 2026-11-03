// Usage: node design/prototypes/tools/zoom-check.mjs [--scale=2] [--w=360] [--h=740] [--shots=<dir outside the repo>] [query ...]
// 200 % text zoom check for the refined prototype (design/prototypes/pulse), WCAG 2.2 SC 1.4.4.
// Raises the browser's default font size (CDP Page.setFontSizes, the same thing as the Chrome text-size setting),
// so every rem-based size doubles while the viewport stays a phone. For each screen it reports:
//   - horizontal scrolling of the page,
//   - clipped text (an element with hidden overflow whose content is wider or taller than its box),
//   - visible text that runs past the right edge of the viewport,
//   - fixed bars (top bar, tab bar, dock) that cover more than half of the viewport.
// Node 22, no dependencies, offline. Exit code 1 if any screen has a finding.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(resolve(here, '../pulse/index.html')).href;
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const scale = +opt('scale', '2'), W = +opt('w', '360'), H = +opt('h', '740'), shots = opt('shots', '');
const SUBS = ['profile', 'account', 'email', 'password', 'username', 'security', 'twofa', 'privacy', 'blocked', 'notifications', 'language', 'status', 'help', 'rules', 'terms', 'about', 'delete'];
const DEFAULT = [
  '', 'at=age', 'at=uilang', 'at=account', 'at=username', 'at=language', 'at=visibility', 'at=dna', 'at=dna&picks=1', 'at=dnavis', 'at=how', 'at=reminder', 'at=done',
  'flow=drop&at=home', 'flow=drop&at=drop', 'flow=drop&at=drop&open=compose', 'flow=drop&at=answer', 'flow=drop&at=hub', 'flow=drop&at=activity', 'flow=drop&at=profile', 'flow=drop&at=settings',
  ...SUBS.map(s => `flow=drop&at=setsub&s=${s}`),
  'flow=drop&at=setsub&s=delete&step=confirm', 'flow=drop&at=settings&show=logout',
  'at=signin', 'at=pending', 'flow=drop&at=member&as=blocker',
  'flow=drop&at=home&state=loading', 'flow=drop&at=drop&state=error', 'flow=drop&at=drop&state=empty', 'flow=drop&at=home&state=nodrop', 'flow=drop&at=drop&state=long', 'flow=drop&at=home&net=off'
];
const queries = args.filter(a => !a.startsWith('--'));
const list = queries.length ? queries : DEFAULT;

const port = 9336;
const profile = mkdtempSync(join(tmpdir(), 'gr-zoom-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=800,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cdpTarget() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }); if (r.ok) return r.json(); } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome DevTools not reachable');
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  return new Promise(res => { ws.onopen = () => res({ send, ws }); });
}

const PROBE = `(() => {
  const out = [], vw = innerWidth, vh = innerHeight;
  const label = el => { const c = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''; const k = el.dataset && el.dataset.k ? '[' + el.dataset.k + ']' : ''; return el.tagName.toLowerCase() + c + k + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"'; };
  const shown = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const srOnly = el => el.closest('.sr-only');
  if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth + ' px wide');
  for (const el of document.querySelectorAll('body *')) {
    if (srOnly(el) || !shown(el) || el.closest('canvas, svg')) continue;
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const clipX = /hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const clipY = /hidden|clip/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2 && s.webkitLineClamp === 'none';
    if ((clipX || clipY) && (el.textContent || '').trim() && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { const er = el.getBoundingClientRect(); const cul = clipX ? [...el.querySelectorAll('*')].find(d => d.getBoundingClientRect().right > er.right + 1) : null; out.push('clipped ' + (clipX ? 'width ' + el.scrollWidth + '/' + el.clientWidth : 'height ' + el.scrollHeight + '/' + el.clientHeight) + ': ' + label(el) + (cul ? ' (by ' + label(cul) + ')' : '')); }
    if (hasText) { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && !el.closest('[class*="scroll"], .portraits')) out.push('past the right edge (' + Math.round(r.right) + '): ' + label(el)); }
  }
  let fixed = 0;
  for (const el of document.querySelectorAll('.topbar, .tabbar, .dock, nav[aria-label]')) { if (!shown(el)) continue; const s = getComputedStyle(el); if (s.position === 'fixed' || s.position === 'sticky') fixed += el.getBoundingClientRect().height; }
  if (fixed > vh / 2) out.push('fixed bars cover ' + Math.round(fixed) + ' of ' + vh + ' px');
  const fs = parseFloat(getComputedStyle(document.body).fontSize);
  return { fs, out: [...new Set(out)] };
})()`;

let bad = 0;
try {
  const t = await cdpTarget();
  const { send, ws } = await connect(t.webSocketDebuggerUrl);
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * scale), fixed: Math.round(13 * scale) } });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if (shots) mkdirSync(shots, { recursive: true });
  for (const q of list) {
    await send('Page.navigate', { url: base + (q ? '?' + q : '') });
    await sleep(1400);
    const r = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const v = r.result.result.value;
    if (!v) { console.log(`${q || 'invite'}: probe failed`); bad++; continue; }
    if (Math.abs(v.fs - 16 * scale) > 0.5) { console.log(`${q || 'invite'}: body font is ${v.fs}px, expected ${16 * scale}px (text does not follow the browser setting)`); bad++; }
    if (v.out.length) { bad++; console.log(`${q || 'invite'}: ${v.out.length} finding(s)`); v.out.slice(0, 12).forEach(o => console.log('   - ' + o)); }
    else console.log(`${q || 'invite'}: ok`);
    if (shots) {
      // What a member sees: the first screen, then the bottom of the page (fixed bars stay where they are).
      const name = (q || 'invite').replace(/[^a-z0-9]+/gi, '-');
      const top = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shots, name + '-1top.png'), Buffer.from(top.result.data, 'base64'));
      await send('Runtime.evaluate', { expression: 'scrollTo(0, document.documentElement.scrollHeight)' });
      await sleep(250);
      const end = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shots, name + '-2end.png'), Buffer.from(end.result.data, 'base64'));
    }
  }
  ws.close();
} finally { proc.kill(); }
console.log(bad ? `\n${bad} of ${list.length} screens need attention at ${scale * 100} % text.` : `\nAll ${list.length} screens pass at ${scale * 100} % text.`);
process.exit(bad ? 1 : 0);
