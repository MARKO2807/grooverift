// Usage: node design/prototypes/tools/smoke.mjs   (set CHROME to override the Chrome path)
// Smoke test for the step 3.5 direction prototypes via the Chrome DevTools Protocol (Node 22, no dependencies).
// Clicks through onboarding and the Daily Drop in each direction and reports JS exceptions and failed checks.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as rpath } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = pathToFileURL(rpath(here, '../directions')).href;
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), 'gr-smoke-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=360,780', 'about:blank'], { stdio: 'ignore' });
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
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method) events.push(d);
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  return new Promise(res => { ws.onopen = () => res({ send, events, ws }); });
}

const TEST = `(async () => {
  const cfg = window.GR_DIRECTION;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const scr = () => document.getElementById('app').dataset.screen;
  const fail = m => { throw new Error(m + ' [screen ' + scr() + ']'); };
  const click = async s => { const el = $(s); if (!el) fail('missing ' + s); el.click(); await sleep(70); };
  const type = async (s, v) => { const el = $(s); if (!el) fail('missing ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await sleep(70); };
  const submit = async s => { $(s).requestSubmit(); await sleep(90); };
  const expect = (c, m) => { if (!c) fail(m); };
  const log = [];
  await click('[data-a="next"]'); expect(scr() === 'age', 'age');
  await click('[data-a="next"]'); expect($('#err-age'), 'age error shown');
  expect(document.activeElement && document.activeElement.name === 'age', 'focus moved to age group');
  await click('input[name="age"][value="adult"]'); expect(!$('#err-age'), 'age error cleared');
  await click('[data-a="next"]'); expect(scr() === 'account', 'account');
  await type('#f-pw', 'kratko'); await click('[data-a="next"]'); expect($('#err-pw'), 'pw error');
  await type('#f-pw', 'ovo je dovoljno duga lozinka'); await click('[data-a="next"]'); expect(scr() === 'username', 'username');
  expect(!$('[data-a="back"]'), 'no back after account creation');
  await click('[data-a="next"]'); expect($('#err-dname') && $('#err-uname'), 'username errors');
  await type('#f-dname', 'Ana'); await type('#f-uname', 'ana'); await sleep(600);
  expect($('[data-a="pickuser"]'), 'username suggestions');
  await click('[data-a="pickuser"]'); await click('[data-a="next"]'); expect(scr() === 'language', 'language');
  await click('[data-a="next"]'); expect(scr() === 'visibility', 'visibility');
  expect(!document.querySelector('input[name="vis"]:checked'), 'nothing pre-selected');
  await click('[data-a="next"]'); expect($('#err-vis'), 'vis error');
  await click('input[name="vis"][value="private"]');
  await click('[data-a="next"]'); expect(scr() === 'dna', 'dna');
  await click('[data-g="Jazz"]'); await click('[data-g="Soul"]');
  expect($('[data-g="Jazz"]').getAttribute('aria-pressed') === 'true', 'chip pressed');
  expect($('[data-a="skip"]').hidden, 'skip hidden after picks');
  await type('#f-artist', 'nirv'); expect(document.querySelectorAll('#artist-results [data-a="artist-add"]').length === 2, 'two Nirvanas');
  await click('#artist-results [data-a="artist-add"]'); expect(document.activeElement.id === 'f-artist', 'focus back to search');
  await click('[data-a="next"]'); expect(scr() === 'dnavis', 'dnavis');
  await click('[data-a="back"]'); expect(scr() === 'dna' && $('[data-g="Jazz"]').getAttribute('aria-pressed') === 'true', 'back keeps picks');
  await click('[data-a="next"]');
  await click('input[name="dnaVis"][value="followers"]'); await click('[data-a="next"]'); expect(scr() === 'how', 'how');
  await click('[data-a="next"]'); expect(scr() === 'reminder', 'reminder');
  await click('[data-a="remind-on"]'); expect($('.perm'), 'perm dialog'); await click('[data-a="perm-block"]'); expect($('.notice'), 'denied notice');
  await click('[data-a="next"]'); expect(scr() === 'done', 'done');
  expect(document.body.textContent.includes('Privatni') && document.body.textContent.includes('Samo pratitelji'), 'done summary');
  await click('[data-a="finish"]'); expect(scr() === 'home', 'home');
  await click('[data-a="open-drop"]'); expect(scr() === 'drop', 'drop');
  if (cfg.composer === 'inline') await click('#f-ans'); else await click('[data-a="compose"]');
  expect(cfg.composer !== 'page' || scr() === 'compose', 'compose page');
  expect(cfg.composer !== 'dock' || $('.sheet-compose'), 'compose sheet');
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
  if (cfg.sort === 'select') { const s = $('#sort'); s.value = 'discussed'; s.dispatchEvent(new Event('change', { bubbles: true })); await sleep(70); }
  else await click('input[name="sort"][value="discussed"]');
  expect($('.ans-list article').getAttribute('aria-labelledby') === 'h-a3', 'most discussed first');
  const r = $('[data-a="react"]'); const k = r.dataset.k; r.click(); await sleep(70); expect($('[data-k="' + k + '"]').getAttribute('aria-pressed') === 'true', 'reaction toggled');
  await click('[data-a="expand"]'); expect($('[data-a="expand"]').getAttribute('aria-expanded') === 'true', 'expanded');
  await click('[data-a="more"]'); expect($('.menu'), 'menu'); await click('[data-a="menu"]'); expect(!$('.menu'), 'menu closed');
  await click('[data-a="comments"]'); expect(scr() === 'answer', 'comments screen');
  await type('#f-com', 'Testni komentar'); await submit('form[data-form="comment"]'); expect(document.body.textContent.includes('Testni komentar'), 'comment posted');
  await click('[data-t="profile"]'); expect(scr() === 'profile', 'profile');
  await click('[data-t="activity"]'); await click('[data-t="hub"]'); expect(scr() === 'hub', 'hub');
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  expect(!dup.length, 'duplicate ids: ' + dup.join(','));
  return 'ok';
})()`;

let failed = false;
try {
  for (const dir of ['a-quiet', 'b-cards', 'c-pulse']) {
    const t = await cdpTarget();
    const c = await connect(t.webSocketDebuggerUrl);
    await c.send('Runtime.enable'); await c.send('Page.enable');
    await c.send('Page.navigate', { url: `${base}/${dir}/index.html` });
    await sleep(1200);
    const r = await c.send('Runtime.evaluate', { expression: TEST, awaitPromise: true, returnByValue: true });
    const exc = c.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
    const errs = c.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map(e => e.params.args.map(a => a.value).join(' '));
    const res = r.result.exceptionDetails ? 'FAIL: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) : r.result.result.value;
    if (res !== 'ok' || exc.length || errs.length) failed = true;
    console.log(`${dir}: ${res}${exc.length ? ' | exceptions: ' + exc.join(' / ') : ''}${errs.length ? ' | console errors: ' + errs.join(' / ') : ''}`);
    c.ws.close();
  }
} finally {
  proc.kill();
}
process.exit(failed ? 1 : 0);
