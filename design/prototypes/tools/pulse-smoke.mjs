// Usage: node design/prototypes/tools/pulse-smoke.mjs   (set CHROME to override the Chrome path)
// Smoke test for the refined prototype (design/prototypes/pulse) via the Chrome DevTools Protocol.
// Node 22, no dependencies, offline (the live catalog is not used). Runs the whole flow at 360 px,
// then checks the catalog-failure state, reduced motion, the three Music DNA variants and the date styles.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(resolve(here, '../pulse/index.html')).href;
const port = 9334;
const profile = mkdtempSync(join(tmpdir(), 'gr-pulse-smoke-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=800,900', 'about:blank'], { stdio: 'ignore' });
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
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d);
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  return new Promise(res => { ws.onopen = () => res({ send, events, ws }); });
}

const HELPERS = `
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const scr = () => document.getElementById('app').dataset.screen;
  const fail = m => { throw new Error(m + ' [screen ' + scr() + ']'); };
  const click = async s => { const el = $(s); if (!el) fail('missing ' + s); el.click(); await sleep(80); };
  const type = async (s, v) => { const el = $(s); if (!el) fail('missing ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(80); };
  const submit = async s => { $(s).requestSubmit(); await sleep(100); };
  const expect = (c, m) => { if (!c) fail(m); };
  const fits = () => { const m = $('main').getBoundingClientRect(), f = $('.foot').getBoundingClientRect(); return document.documentElement.scrollHeight <= innerHeight + 1 || m.bottom <= f.top + 1; };`;

const FLOW = `(async () => {${HELPERS}
  expect($('canvas.current[data-cur="invite"]'), 'invite current');
  await click('[data-a="next"]'); expect(scr() === 'age', 'age');
  expect(getComputedStyle($('.center-block h1')).textAlign === 'center', 'age centred');
  await click('[data-a="next"]'); expect($('#err-age'), 'age error shown');
  expect(document.activeElement && document.activeElement.name === 'age', 'focus moved to age group');
  await click('input[name="age"][value="adult"]'); expect(!$('#err-age'), 'age error cleared');
  await click('[data-a="next"]'); expect(scr() === 'account', 'account');
  await type('#f-pw', 'kratko'); await click('[data-a="next"]'); expect($('#err-pw'), 'pw error');
  await type('#f-pw', 'ovo je dovoljno duga lozinka'); await click('[data-a="next"]'); expect(scr() === 'username', 'username');
  await click('[data-a="next"]'); expect($('#err-dname') && $('#err-uname'), 'username errors');
  await type('#f-dname', 'Ana'); await type('#f-uname', 'ana'); await sleep(600);
  expect($('[data-a="pickuser"]'), 'username suggestions');
  await click('[data-a="pickuser"]'); await click('[data-a="next"]'); expect(scr() === 'language', 'language');
  await click('[data-a="next"]'); expect(scr() === 'visibility', 'visibility');
  expect(!$('input[name="vis"]:checked'), 'nothing pre-selected');
  expect(fits(), 'visibility fits the 360x640 screen without scrolling');
  expect($$('.vis-table tbody tr').length === 6, 'six comparison rows');
  await click('[data-a="next"]'); expect($('#err-vis'), 'vis error');
  await click('input[name="vis"][value="private"]');
  expect(getComputedStyle($('.c-priv')).backgroundColor !== getComputedStyle($('.c-pub')).backgroundColor, 'chosen column highlighted');
  await click('[data-a="next"]'); expect(scr() === 'dna', 'dna');
  expect(!$('[data-a="skip"]'), 'no skip: genres are required');
  expect($$('.chips-genres .chip').length === 24, '24 main genres');
  await click('[data-a="next"]'); expect($('#err-genres'), 'min 2 error');
  await click('[data-g="Jazz"]'); expect($('#err-genres'), 'one genre is not enough');
  await click('[data-g="Soul"]'); expect(!$('#err-genres'), 'error cleared at 2');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Techno', 'Funk', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  expect($$('.chips-genres [aria-pressed="true"]').length === 10, 'ten picked');
  expect($('[data-g="Punk"]').getAttribute('aria-disabled') === 'true', 'eleventh disabled');
  await click('[data-g="Punk"]'); expect($('[data-g="Punk"]').getAttribute('aria-pressed') === 'false', 'max 10 holds');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  await click('[data-a="more-genres"]'); await type('#f-genre', 'klap'); await click('#genre-results [data-g="Klapa"]');
  expect($('#more-genres [data-g="Klapa"][aria-pressed="true"]'), 'extra genre picked');
  expect($('#dna-traits .traits'), 'trait words shown');
  await type('#f-artist', 'metalica'); expect($('#artist-results [data-a="artist-add"] .r-title').textContent === 'Metallica', 'typo finds Metallica');
  await type('#f-artist', 'nirv'); expect($$('#artist-results [data-a="artist-add"]').length === 2, 'two Nirvanas');
  await click('#artist-results [data-a="artist-add"]'); expect(document.activeElement.id === 'f-artist', 'focus back to search');
  expect($$('#picked .portraits li').length === 1, 'portrait added');
  await click('[data-a="next"]'); expect(scr() === 'dnavis', 'dnavis');
  expect(fits(), 'dnavis fits the 360x640 screen without scrolling');
  await click('[data-a="back"]'); expect(scr() === 'dna' && $('[data-g="Jazz"]').getAttribute('aria-pressed') === 'true', 'back keeps picks');
  await click('[data-a="next"]');
  await click('input[name="dnaVis"][value="followers"]'); await click('[data-a="next"]'); expect(scr() === 'how', 'how');
  expect($$('.how-card').length === 4, 'four how cards');
  await click('[data-a="next"]'); expect(scr() === 'reminder', 'reminder');
  expect($('.notif') && $('.foot-row.equal'), 'notification preview and equal buttons');
  await click('[data-a="remind-on"]'); expect($('.perm'), 'perm dialog'); await click('[data-a="perm-block"]'); expect($('.notice'), 'denied notice');
  await click('[data-a="next"]'); expect(scr() === 'done', 'done');
  expect(document.body.textContent.includes('Privatni') && document.body.textContent.includes('Samo pratitelji'), 'done summary');
  expect($$('.facts-grid > div').length === 4 && $('.dna-card canvas.dna'), 'done tiles and DNA');
  await click('[data-a="finish"]'); expect(scr() === 'home', 'home');
  expect($('.dd-name') && $('.dd-date time') && !$('.dd-top').textContent.includes('·'), 'name and date apart, no middle dot');
  expect($('.dd-actions [data-a="open-compose"]').textContent.trim() === 'Odgovori', 'button says Odgovori');
  await click('[data-a="open-compose"]'); expect(scr() === 'drop' && $('.sheet-compose'), 'answer sheet from home');
  expect($('.notice#aud'), 'private notice before posting');
  expect($('[data-k="post"]').getAttribute('aria-describedby') === 'aud', 'post button described by notice');
  await submit('form[data-form="answer"]'); expect($('#err-ans'), 'empty answer error');
  await type('#f-ans', 'Testni odgovor');
  await click('[data-a="ref-open"]'); await type('#f-refq', 'miles'); await click('#ref-results [data-a="ref-add"]');
  await submit('form[data-form="answer"]');
  expect(scr() === 'drop' && $('#h-mine'), 'answer posted'); expect(document.activeElement.id === 'h-mine', 'focus on posted answer');
  await click('[data-k="edit"]'); await type('#f-ans', 'Uređeni odgovor'); await submit('form[data-form="answer"]');
  expect(document.body.textContent.includes('uređeno'), 'edited indicator');
  await click('[data-k="delete"]'); expect($('[role="alertdialog"]'), 'delete dialog'); await click('[data-a="delete-confirm"]'); expect(!$('#h-mine'), 'deleted');
  expect($('.dock-field svg.spark rect[width]'), 'dock spark sized');
  const sort = $('.sort'); expect(sort.scrollWidth <= sort.clientWidth + 1, 'sort pills in one row without scrolling');
  await click('input[name="sort"][value="discussed"]');
  expect($('.ans-list article').getAttribute('aria-labelledby') === 'h-a3', 'most discussed first');
  expect($('.ans-list .avatar').style.getPropertyValue('--ring').includes('conic-gradient'), 'avatar DNA ring');
  const r = $('[data-a="react"]'); const k = r.dataset.k; r.click(); await sleep(80); expect($('[data-k="' + k + '"]').getAttribute('aria-pressed') === 'true', 'reaction toggled');
  await click('[data-a="expand"]'); expect($('[data-a="expand"]').getAttribute('aria-expanded') === 'true', 'expanded');
  await click('[data-a="more"]'); expect($('.menu'), 'menu'); await click('[data-a="menu"]'); expect(!$('.menu'), 'menu closed');
  await click('[data-a="comments"]'); expect(scr() === 'answer', 'comments screen');
  await type('#f-com', 'Testni komentar'); await submit('form[data-form="comment"]'); expect(document.body.textContent.includes('Testni komentar'), 'comment posted');
  await click('[data-t="profile"]'); expect(scr() === 'profile' && $('.dna-card canvas.dna'), 'profile with DNA');
  await click('[data-t="activity"]'); await click('[data-t="hub"]'); expect(scr() === 'hub', 'hub');
  const ids = $$('[id]').map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  expect(!dup.length, 'duplicate ids: ' + dup.join(','));
  return 'ok';
})()`;

const CATALOG_FAIL = `(async () => {${HELPERS}
  await type('#f-artist', 'metallica'); await sleep(900);
  expect($('.cat-err [data-a="artist-retry"]'), 'catalog error with retry');
  return 'ok';
})()`;

const VARIANTS = `(async () => {${HELPERS}
  await sleep(300);
  const c = $('canvas.dna'); expect(c && c.width > 0, 'dna canvas drawn');
  const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) lit++;
  expect(lit > 500, 'dna canvas has pixels');
  return 'ok';
})()`;

const runs = [
  { name: 'flow 360x640', url: `${base}`, test: FLOW },
  { name: 'flow 320x568', url: `${base}`, test: FLOW.replace("expect(fits(), 'visibility fits the 360x640 screen without scrolling');", '').replace("expect(fits(), 'dnavis fits the 360x640 screen without scrolling');", ''), w: 320, h: 568 },
  { name: 'flow reduced motion', url: `${base}`, test: FLOW, reduce: true },
  { name: 'catalog failure', url: `${base}?at=dna&catalog=fail`, test: CATALOG_FAIL },
  ...['helix', 'map', 'signal'].map(v => ({ name: 'dna ' + v, url: `${base}?at=dnavis&dna=${v}`, test: VARIANTS })),
  ...['classic', 'today', 'calendar', 'edition', 'short'].map(v => ({ name: 'date ' + v, url: `${base}?flow=drop&date=${v}`, test: `(async () => {${HELPERS} expect($('.dd-top time'), 'date'); expect(!$('.dd-top').textContent.includes('·'), 'no middle dot'); return 'ok'; })()` }))
];

let failed = false;
try {
  for (const run of runs) {
    const t = await cdpTarget();
    const c = await connect(t.webSocketDebuggerUrl);
    await c.send('Runtime.enable'); await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: run.w || 360, height: run.h || 640, deviceScaleFactor: 2, mobile: true });
    if (run.reduce) await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.send('Page.navigate', { url: run.url });
    await sleep(1200);
    const r = await c.send('Runtime.evaluate', { expression: run.test, awaitPromise: true, returnByValue: true });
    const exc = c.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
    const errs = c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map(e => e.params.args.map(a => a.value).join(' '));
    const res = r.result.exceptionDetails ? 'FAIL: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result.result.value;
    if (res !== 'ok' || exc.length || errs.length) failed = true;
    console.log(`${run.name}: ${res}${exc.length ? ' | exceptions: ' + exc.join(' / ') : ''}${errs.length ? ' | console errors: ' + errs.join(' / ') : ''}`);
    c.ws.close();
  }
} finally {
  proc.kill();
}
process.exit(failed ? 1 : 0);
