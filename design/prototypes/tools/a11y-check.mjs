// Usage: node design/prototypes/tools/a11y-check.mjs [--w=360] [--h=740] [--fc] [--no-keys] [--shots=<dir outside the repo>] [query ...]
// Screen reader, keyboard and forced-colours check for the refined prototype (design/prototypes/pulse).
// What Narrator reads comes from Chrome's accessibility tree, so the check reads that tree over CDP (Accessibility.getFullAXTree)
// and walks the page with real Tab key presses. For each screen it reports:
//   - structure: one main, one h1, no skipped heading levels, named navigation landmarks, unique ids, aria-* references that resolve,
//     no tabindex above 0, no focusable element under aria-hidden, a lang on <html>;
//   - names: every focusable or interactive node (button, link, field, tab, menu item, switch...), every image and dialog has an
//     accessible name; nothing exposed is named by a lone icon;
//   - keyboard: the skip link is the first tab stop; every tab stop is visible and shows a focus ring (:focus-visible);
//     while a sheet or dialog is open, focus starts inside it and Tab never leaves it (the shell is inert);
//     the tab order follows the reading order (a jump back up the page is reported; a new column to the right is fine);
//   - with --fc: Windows high contrast (forced colours) is emulated; the page must switch to system colours, visible text must not
//     match its background, and SVG shapes that keep a hard-coded colour (not currentColor) are listed for a look.
//     --shots then saves a screenshot per screen, for the owner's or Claude's eyes.
// Desktop: --w=1366 --h=800 (the rail with labels and two columns), --w=800 (the collapsed rail).
// Node 22, no dependencies, offline. Exit code 1 if any screen has a finding.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCREENS } from './screens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(resolve(here, '../pulse/index.html')).href;
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const W = +opt('w', '360'), H = +opt('h', '740'), shots = opt('shots', ''), FC = args.includes('--fc'), KEYS = !args.includes('--no-keys');
const queries = args.filter(a => !a.startsWith('--'));
const list = queries.length ? queries : SCREENS;

const port = 9337;
const profile = mkdtempSync(join(tmpdir(), 'gr-a11y-'));
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

// Shared in-page helpers (installed once per navigation).
const HELPERS = `
  window.__a = {
    label(el) { if (!el || el === document.body) return 'body'; const c = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''; const k = el.dataset && (el.dataset.k || el.dataset.a) ? '[' + (el.dataset.k || el.dataset.a) + ']' : ''; const t = (el.getAttribute && (el.getAttribute('aria-label') || el.textContent) || '').trim().replace(/\\s+/g, ' ').slice(0, 40); return el.tagName.toLowerCase() + c + k + ' "' + t + '"'; },
    shown(el) { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; },
    // Does the focused element (or the box that carries its ring) show a visible indicator?
    ring(el) {
      const box = s => s.boxShadow !== 'none' || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || /underline/.test(s.textDecorationLine);
      // A visually hidden radio (1 px, opacity 0) cannot show its own ring; only the visible box that carries it counts
      // (step 3.6: in forced colours these had lost their ring while the 1 px input's outline still passed).
      const r = el.getBoundingClientRect(), tiny = el.matches('input') && (r.width <= 2 || getComputedStyle(el).opacity === '0');
      if (!tiny && box(getComputedStyle(el))) return true;
      const host = el.closest('.choice, .vis-opt, .vrow, .sort label, label');
      if (host && box(getComputedStyle(host))) return true;
      const pill = host && host.matches('.sort label') && host.querySelector(':scope > span');
      if (pill && box(getComputedStyle(pill))) return true;
      if (host && host.matches('.vis-opt') && box(getComputedStyle(host, '::before'))) return true;
      return false;
    }
  };`;

const STRUCTURE = `(() => {
  const out = [], A = window.__a;
  if (!document.documentElement.lang) out.push('html has no lang');
  const mains = [...document.querySelectorAll('main')]; if (mains.length !== 1) out.push(mains.length + ' main landmarks');
  const h1 = [...document.querySelectorAll('h1')].filter(A.shown); if (h1.length !== 1) out.push(h1.length + ' visible h1: ' + h1.map(A.label).join(' | '));
  // heading levels in reading order (hidden headings and the inert shell behind an overlay are skipped)
  let prev = 0;
  for (const h of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) { if (!A.shown(h) || h.closest('[inert]')) continue; const l = +h.tagName[1]; if (prev && l > prev + 1) out.push('heading level jumps h' + prev + ' -> h' + l + ' at ' + A.label(h)); prev = l; }
  for (const n of document.querySelectorAll('nav')) { if (A.shown(n) && !n.getAttribute('aria-label') && !n.getAttribute('aria-labelledby')) out.push('nav without a label: ' + A.label(n)); }
  const navNames = [...document.querySelectorAll('nav')].filter(A.shown).map(n => n.getAttribute('aria-label')).filter(Boolean);
  const dupNav = navNames.filter((n, i) => navNames.indexOf(n) !== i); if (dupNav.length) out.push('two navs share a label: ' + [...new Set(dupNav)].join(', '));
  const ids = new Map(); for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) out.push('duplicate id "' + id + '" (' + n + ')');
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) for (const el of document.querySelectorAll('[' + attr + ']')) for (const id of el.getAttribute(attr).split(/\\s+/)) if (id && !document.getElementById(id)) out.push(attr + ' points to a missing id "' + id + '" on ' + A.label(el));
  for (const el of document.querySelectorAll('[tabindex]')) if (+el.getAttribute('tabindex') > 0) out.push('tabindex above 0 on ' + A.label(el));
  for (const el of document.querySelectorAll('[aria-hidden="true"]')) { const f = el.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') ? el : el.querySelector('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'); if (f && A.shown(f)) out.push('focusable element under aria-hidden: ' + A.label(f)); }
  for (const el of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) { if (!A.shown(el)) continue; const ok = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) || el.closest('label') || el.getAttribute('title'); if (!ok) out.push('field without a label: ' + A.label(el)); }
  for (const el of document.querySelectorAll('[role]')) { const r = el.getAttribute('role'); if (!/^(alert|alertdialog|application|article|banner|button|cell|checkbox|columnheader|combobox|complementary|contentinfo|dialog|document|feed|figure|form|grid|gridcell|group|heading|img|link|list|listbox|listitem|log|main|marquee|math|menu|menubar|menuitem|menuitemcheckbox|menuitemradio|navigation|none|note|option|presentation|progressbar|radio|radiogroup|region|row|rowgroup|rowheader|scrollbar|search|searchbox|separator|slider|spinbutton|status|switch|tab|table|tablist|tabpanel|term|textbox|timer|toolbar|tooltip|tree|treegrid|treeitem)$/.test(r)) out.push('unknown role "' + r + '" on ' + A.label(el)); }
  const dlg = document.querySelector('[role="dialog"], [role="alertdialog"]');
  if (dlg) { if (dlg.getAttribute('aria-modal') !== 'true') out.push('dialog without aria-modal'); const shell = document.querySelector('.shell'); if (shell && !shell.hasAttribute('inert')) out.push('shell is not inert behind the dialog'); if (!dlg.contains(document.activeElement)) out.push('focus is not inside the open dialog: ' + A.label(document.activeElement)); }
  return out;
})()`;

const TAB_STEP = `(() => {
  const A = window.__a, el = document.activeElement;
  if (!el || el === document.body) return { body: true };
  const r = el.getBoundingClientRect();
  const dlg = document.querySelector('[role="dialog"], [role="alertdialog"]');
  return { label: A.label(el), skip: el.matches('.skip'), vis: A.shown(el), fv: el.matches(':focus-visible'), ring: A.ring(el), inDlg: dlg ? dlg.contains(el) : null, top: r.top + scrollY, left: r.left, right: r.right, inert: !!el.closest('[inert]'), hidden: !!el.closest('[aria-hidden="true"]') };
})()`;

const FORCED = `(() => {
  const out = [], A = window.__a;
  if (!matchMedia('(forced-colors: active)').matches) return ['forced colours are not active'];
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  if (bodyBg !== 'rgb(0, 0, 0)' && bodyBg !== 'rgb(255, 255, 255)') out.push('body background is not a system colour: ' + bodyBg);
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b; } return bodyBg; };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only, canvas, svg, [aria-hidden="true"]') || !A.shown(el)) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const s = getComputedStyle(el);
    if (s.color === bgOf(el) || s.color === 'rgba(0, 0, 0, 0)' || s.opacity === '0') { const k = 'text matches its background: ' + A.label(el); if (!seen.has(k)) { seen.add(k); out.push(k); } }
  }
  // State marks the system flattens: the current tab or rail item must differ from its siblings, a switch must show its knob
  // and its on state (the Ember colours become Canvas, so a mark drawn only with them disappears).
  const pseudoMark = el => ['::before', '::after'].some(p => { const s = getComputedStyle(el, p); return s.content !== 'none' && s.backgroundColor !== bodyBg && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(s.width) > 0; });
  for (const el of document.querySelectorAll('[aria-current="page"]')) {
    if (!A.shown(el) || el.closest('[inert]')) continue;
    const sib = [...el.parentElement.children].find(x => x !== el && x.matches(':not([aria-current])') && A.shown(x));
    if (!sib) continue;
    const a = getComputedStyle(el), b = getComputedStyle(sib);
    const differs = a.color !== b.color || a.borderColor !== b.borderColor || a.outlineStyle !== 'none' || a.textDecorationLine !== b.textDecorationLine || pseudoMark(el);
    if (!differs) out.push('current item looks like the others: ' + A.label(el));
  }
  for (const sw of document.querySelectorAll('[role="switch"]')) {
    if (!A.shown(sw) || sw.closest('[inert]')) continue;
    const knob = sw.querySelector('span');
    if (knob && getComputedStyle(knob).backgroundColor === bgOf(sw)) out.push('switch knob is invisible: ' + A.label(sw));
  }
  const on = [...document.querySelectorAll('[role="switch"][aria-checked="true"]')].find(A.shown), off = [...document.querySelectorAll('[role="switch"][aria-checked="false"]')].find(A.shown);
  if (on && off) { const a = getComputedStyle(on), b = getComputedStyle(off), ka = getComputedStyle(on.querySelector('span')), kb = getComputedStyle(off.querySelector('span')); if (a.borderColor === b.borderColor && a.backgroundColor === b.backgroundColor && ka.backgroundColor === kb.backgroundColor && ka.transform === kb.transform) out.push('a switch that is on looks like one that is off'); }
  // SVG shapes that keep their own colour are not adjusted by the system; list the ones that do not follow currentColor.
  for (const el of document.querySelectorAll('svg *')) {
    const svg = el.closest('svg'); if (!svg || !A.shown(svg) || svg.closest('[aria-hidden="true"]') || svg.closest('.sr-only')) continue;
    const s = getComputedStyle(el), col = getComputedStyle(el).color;
    for (const p of ['fill', 'stroke']) { const v = s[p]; if (!v || v === 'none' || v === col || v === 'rgba(0, 0, 0, 0)') continue; if (/url\\(|rgb/.test(v)) { const k = 'svg ' + p + ' keeps ' + v + ' in ' + A.label(svg) + ' (' + el.tagName + (el.getAttribute('class') ? '.' + el.getAttribute('class') : '') + ')'; if (!seen.has(k)) { seen.add(k); out.push(k); } } }
  }
  return out;
})()`;

const INTERACTIVE = /^(button|link|textbox|searchbox|checkbox|radio|switch|tab|combobox|menuitem|menuitemcheckbox|menuitemradio|slider|spinbutton|option|listbox|menubutton|disclosuretriangle|togglebutton|popupbutton)$/i;
const NAMED = /^(image|img|dialog|alertdialog|heading|progressbar|region|figure|navigation)$/i;

let bad = 0;
try {
  const t = await cdpTarget();
  const { send, ws } = await connect(t.webSocketDebuggerUrl);
  await send('Page.enable'); await send('DOM.enable'); await send('Accessibility.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const features = [{ name: 'prefers-reduced-motion', value: 'reduce' }];
  if (FC) features.push({ name: 'forced-colors', value: 'active' }, { name: 'prefers-color-scheme', value: 'dark' });
  await send('Emulation.setEmulatedMedia', { features });
  if (shots) mkdirSync(shots, { recursive: true });
  const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods }); };
  const nodeLabel = async (backendNodeId) => { try { const r = await send('DOM.resolveNode', { backendNodeId }); const o = r.result && r.result.object; if (!o) return '?'; const f = await send('Runtime.callFunctionOn', { objectId: o.objectId, functionDeclaration: 'function() { return window.__a.label(this); }', returnByValue: true }); return f.result.result.value; } catch { return '?'; } };

  for (const q of list) {
    const name = q || 'invite';
    const out = [];
    await send('Page.navigate', { url: base + (q ? '?' + q : '') });
    await sleep(1400);
    await send('DOM.getDocument', { depth: 0 });
    await evaluate(HELPERS);

    // 1. structure
    const st = await evaluate(STRUCTURE);
    if (!st) { console.log(`${name}: probe failed`); bad++; continue; }
    out.push(...st);

    // 2. names from the accessibility tree (what Narrator reads)
    const tree = await send('Accessibility.getFullAXTree');
    const nodes = (tree.result && tree.result.nodes) || [];
    for (const n of nodes) {
      if (n.ignored) continue;
      const role = n.role ? String(n.role.value) : '';
      const nm = n.name ? String(n.name.value || '').trim() : '';
      const props = Object.fromEntries((n.properties || []).map(p => [p.name, p.value && p.value.value]));
      const focusable = props.focusable === true;
      // A text block that takes programmatic focus (tabindex -1: a confirmation line, an alert) is read by its content.
      const textBlock = !INTERACTIVE.test(role) && focusable && n.childIds && n.childIds.length;
      if ((INTERACTIVE.test(role) || focusable) && !nm && !textBlock && role !== 'main' && role !== 'RootWebArea' && role !== 'canvas' && role !== 'dialog' && role !== 'alertdialog') {
        out.push(`no accessible name: ${role} ${await nodeLabel(n.backendDOMNodeId)}`);
      } else if (NAMED.test(role) && !nm) {
        out.push(`no accessible name: ${role} ${await nodeLabel(n.backendDOMNodeId)}`);
      }
      if (INTERACTIVE.test(role) && nm && /^[^\p{L}\p{N}]+$/u.test(nm)) out.push(`name is only symbols: ${role} "${nm}"`);
    }

    // 3. keyboard: Tab through the page
    if (KEYS) {
      const stops = [];
      const first = await evaluate(TAB_STEP);
      const dialogOpen = await evaluate(`!!document.querySelector('[role="dialog"], [role="alertdialog"]')`);
      for (let i = 0; i < 160; i++) {
        await key('Tab', 'Tab', 9);
        const s = await evaluate(TAB_STEP);
        if (!s || s.body) break;
        if (stops.length && stops[0].label === s.label && stops[0].top === s.top && i > 0) break; // cycled (a dialog loop)
        stops.push(s);
      }
      if (!stops.length) out.push('nothing is reachable with Tab');
      if (!dialogOpen && stops.length && !stops[0].skip) out.push('the first tab stop is not the skip link: ' + stops[0].label);
      if (dialogOpen && first && first.body) out.push('a dialog is open but nothing inside it has focus');
      let lastRow = null;
      for (const s of stops) {
        if (!s.vis) out.push('tab stop is not visible: ' + s.label);
        if (s.inert || s.hidden) out.push('tab stop is inert or aria-hidden: ' + s.label);
        if (s.vis && !s.fv) out.push('focused without :focus-visible: ' + s.label);
        if (s.vis && s.fv && !s.ring) out.push('no visible focus ring: ' + s.label);
        if (dialogOpen && s.inDlg === false) out.push('Tab left the open dialog: ' + s.label);
        if (!dialogOpen && lastRow && s.top < lastRow.top - 40 && s.left < lastRow.right - 8 && !s.skip) out.push(`tab order jumps back up the page: ${lastRow.label} -> ${s.label}`);
        lastRow = s;
      }
    }

    // 4. forced colours
    if (FC) { const fc = await evaluate(FORCED); out.push(...(fc || ['forced-colour probe failed'])); }

    if (shots) {
      const fname = name.replace(/[^a-z0-9]+/gi, '-');
      await evaluate('scrollTo(0, 0); document.activeElement && document.activeElement.blur && document.activeElement.blur()');
      await sleep(150);
      const top = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shots, fname + '-1top.png'), Buffer.from(top.result.data, 'base64'));
      const tall = await evaluate('document.documentElement.scrollHeight > innerHeight + 40');
      if (tall) { await evaluate('scrollTo(0, document.documentElement.scrollHeight)'); await sleep(200); const end = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shots, fname + '-2end.png'), Buffer.from(end.result.data, 'base64')); }
    }

    const uniq = [...new Set(out)];
    if (uniq.length) { bad++; console.log(`${name}: ${uniq.length} finding(s)`); uniq.slice(0, 20).forEach(o => console.log('   - ' + o)); if (uniq.length > 20) console.log(`   … and ${uniq.length - 20} more`); }
    else console.log(`${name}: ok`);
  }
  ws.close();
} finally { proc.kill(); }
console.log(bad ? `\n${bad} of ${list.length} screens need attention (${W}×${H}${FC ? ', forced colours' : ''}).` : `\nAll ${list.length} screens pass (${W}×${H}${FC ? ', forced colours' : ''}).`);
process.exit(bad ? 1 : 0);
