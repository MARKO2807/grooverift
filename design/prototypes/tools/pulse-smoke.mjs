// Usage: node design/prototypes/tools/pulse-smoke.mjs   (set CHROME to override the Chrome path)
// Smoke test for the refined prototype (design/prototypes/pulse) via the Chrome DevTools Protocol.
// Node 22, no dependencies, offline (the live catalog is not used). Runs the whole flow at 360 px,
// then checks the catalog-failure state, reduced motion (OS and the in-app setting), the Music DNA helix,
// the review pages, and that the decided Daily Drop heading has no middle dot.
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
  expect($('main h1 .wm .wm-rift'), 'brand name set like the wordmark');
  expect($('.topbar .wordmark .wm-bolt') && !$('main .wm-bolt'), 'bolt under rift in the top bar only (D-055)');
  { const gl = getComputedStyle($('.topbar .wm-bolt .glint')).animationName; expect(document.documentElement.dataset.motion === 'reduced' ? gl === 'none' : gl === 'wm-glint', 'bolt glint follows the motion setting'); }
  await click('[data-a="next"]'); expect(scr() === 'age', 'age');
  expect(getComputedStyle($('.center-block h1')).textAlign === 'center', 'age centred');
  await click('[data-a="next"]'); expect($('#err-age'), 'age error shown');
  expect(document.activeElement && document.activeElement.name === 'age', 'focus moved to age group');
  await click('input[name="age"][value="adult"]'); expect(!$('#err-age'), 'age error cleared');
  await click('[data-a="next"]'); expect(scr() === 'account', 'account');
  expect($('[data-a="showpw"] svg.pi'), 'eye icon next to show password');
  expect($('#help-pw').textContent === 'Najmanje 15 znakova. Odaberi sigurnu lozinku.', 'password help text (D-054)');
  await type('#f-pw', 'kratko'); expect($('#pw-meter .pw-count').textContent.includes('6 od 15'), 'counter counts');
  await click('[data-a="next"]'); expect($('#err-pw') && $('#err-pw').textContent.includes('najmanje 15'), 'pw error');
  await type('#f-pw', 'iloveyou1234567'); expect($('#pw-meter .pw-count.ok'), 'counter reaches 15');
  await click('[data-a="next"]'); expect($('#err-pw') && $('#err-pw').textContent.includes('curenjima'), 'breached password rejected with the reason');
  await type('#f-pw', 'ovo je dovoljno duga lozinka'); await click('[data-a="next"]'); expect(scr() === 'username', 'username');
  expect($('main h1').textContent === 'Kako se zoveš?', 'name question');
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
  expect(getComputedStyle($('.vis-opt-priv'), '::before').boxShadow !== 'none' && getComputedStyle($('.vis-opt-pub'), '::before').boxShadow === 'none', 'chosen column highlighted');
  await click('[data-a="next"]'); expect(scr() === 'dna', 'dna');
  expect(!$('[data-a="skip"]'), 'no skip: genres are required');
  expect($$('#genre-chips .chip-genre').length === 20 && $('#genre-chips .chip-more'), '20 main genres and the more chip');
  await click('[data-a="next"]'); expect($('#err-genres'), 'min 2 error');
  await click('[data-g="Jazz"]'); expect($('#err-genres'), 'one genre is not enough');
  await click('[data-g="Soul"]'); expect(!$('#err-genres'), 'error cleared at 2');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Techno', 'Funk', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  expect($$('.chips-genres [aria-pressed="true"]').length === 10, 'ten picked');
  expect($('[data-g="Punk"]').getAttribute('aria-disabled') === 'true', 'eleventh disabled');
  await click('[data-g="Punk"]'); expect($('[data-g="Punk"]').getAttribute('aria-pressed') === 'false', 'max 10 holds');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  await click('[data-a="more-genres"]'); await type('#f-genre', 'klap'); await click('#genre-results [data-g="Klapa"]');
  expect($('#genre-chips [data-g="Klapa"][aria-pressed="true"]'), 'extra genre joins the picked chips');
  expect(!$('.traits'), 'no trait tags');
  expect(getComputedStyle($('[data-g="Jazz"] .gdot')).display !== 'none' && getComputedStyle($('[data-g="Pop"] .gdot')).display === 'none', 'genre colour dot on picked chips only');
  await type('#f-artist', 'metalica'); expect($('#artist-results [data-a="artist-add"] .r-title').textContent === 'Metallica', 'typo finds Metallica');
  expect($('#artist-results [data-a="artist-add"] .r-meta').textContent === 'SAD', 'country only');
  await type('#f-artist', 'nirv'); expect($$('#artist-results [data-a="artist-add"]').length === 2, 'two Nirvanas');
  await click('#artist-results [data-a="artist-add"]'); expect(document.activeElement.id === 'f-artist', 'focus back to search');
  expect($$('#picked .portraits li').length === 1, 'portrait added');
  await click('[data-a="next"]'); expect(scr() === 'dnavis', 'dnavis');
  expect(fits(), 'dnavis fits the 360x640 screen without scrolling');
  await click('[data-a="back"]'); expect(scr() === 'dna' && $('[data-g="Jazz"]').getAttribute('aria-pressed') === 'true', 'back keeps picks');
  await click('[data-a="next"]');
  await click('input[name="dnaVis"][value="followers"]'); await click('[data-a="next"]'); expect(scr() === 'how', 'how');
  expect($$('.how-card').length === 4 && !$('.how-badge') && $('main h1 .wm') && $$('.how-vis svg.pi').length === 3, 'four how cards, library icons, wordmark');
  await click('[data-a="next"]'); expect(scr() === 'reminder', 'reminder');
  expect($('.notif') && $('.foot-row.equal'), 'notification preview and equal buttons');
  await click('[data-a="remind-on"]'); expect($('.perm'), 'perm dialog'); await click('[data-a="perm-block"]'); expect($('.notice'), 'denied notice');
  await click('[data-a="next"]'); expect(scr() === 'done', 'done');
  expect(document.body.textContent.includes('Privatni') && document.body.textContent.includes('Samo pratitelji'), 'done summary');
  expect($$('.facts-grid > div').length === 4 && $('.dna-card canvas.dna'), 'done tiles and DNA');
  expect(!$('.dna-genres') && !$('.traits') && $('.dna-card .sr-only'), 'no visible tags under DNA, text for screen readers');
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
  expect($('.dock-field canvas.orbit') && $('.dock-field canvas.orbit').width > 0, 'dock orbit drawn');
  const sort = $('.sort'); expect(sort.scrollWidth <= sort.clientWidth + 1, 'sort pills in one row without scrolling');
  await click('input[name="sort"][value="discussed"]');
  expect($('.ans-list article').getAttribute('aria-labelledby') === 'h-a3', 'most discussed first');
  expect($('.ans-list .avatar').style.getPropertyValue('--ring').includes('conic-gradient'), 'avatar DNA ring');
  expect($$('.ans-list article').every(a => a.querySelectorAll('.react').length === 1), 'one reaction per answer (D-056)');
  const r = $('[data-a="react"]'); const k = r.dataset.k; const n0 = +r.querySelector('.n').textContent;
  expect(r.querySelector('svg.wave-ic') && !r.textContent.replace(/\\d/g, '').trim() && r.getAttribute('aria-label').startsWith('Sviđa mi se'), 'icon only, named for screen readers');
  r.click(); await sleep(80); const r2 = $('[data-k="' + k + '"]');
  expect(r2.getAttribute('aria-pressed') === 'true' && +r2.querySelector('.n').textContent === n0 + 1, 'reaction toggled and counted');
  { const an = getComputedStyle(r2.querySelector('.wave')).animationName; expect(document.documentElement.dataset.motion === 'reduced' ? an === 'none' : an === 'gr-beat', 'beat follows the motion setting'); }
  await click('[data-a="expand"]'); expect($('[data-a="expand"]').getAttribute('aria-expanded') === 'true', 'expanded');
  await click('[data-a="more"]'); expect($('.menu'), 'menu'); await click('[data-a="menu"]'); expect(!$('.menu'), 'menu closed');
  await click('[data-a="comments"]'); expect(scr() === 'answer', 'comments screen');
  await type('#f-com', 'Testni komentar'); await submit('form[data-form="comment"]'); expect(document.body.textContent.includes('Testni komentar'), 'comment posted');
  await click('[data-t="profile"]'); expect(scr() === 'profile' && $('.dna-card canvas.dna'), 'profile with DNA');
  const calmBefore = $('[data-a="calm"]').getAttribute('aria-checked');
  await click('[data-a="calm"]'); expect($('[data-a="calm"]').getAttribute('aria-checked') !== calmBefore, 'motion setting toggles');
  expect(document.documentElement.dataset.motion === 'reduced', 'motion reduced after setting');
  await click('[data-a="calm"]');
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
  { name: 'flow reduced motion (OS)', url: `${base}`, test: FLOW, reduce: true },
  { name: 'flow calm setting', url: `${base}?calm=1`, test: FLOW.replace("expect(document.documentElement.dataset.motion === 'reduced', 'motion reduced after setting');", '') },
  { name: 'catalog failure', url: `${base}?at=dna&catalog=fail`, test: CATALOG_FAIL },
  { name: 'dna helix', url: `${base}?at=dnavis`, test: VARIANTS },
  { name: 'daily drop heading', url: `${base}?flow=drop`, test: `(async () => {${HELPERS} expect($('.dd-name').textContent === 'Daily Drop' && $('.dd-date time').textContent === 'Nedjelja, 1. studenoga', 'name and date'); expect(!$('.dd-top').textContent.includes('·'), 'no middle dot'); return 'ok'; })()` },
  { name: 'choices page', url: base.replace('index.html', 'choices.html'), test: `(async () => {${HELPERS} await sleep(400); expect($$('#gallery canvas.dna').length === 8 && $$('#gallery canvas.dna').every(c => c.width > 0), 'gallery drawn'); return 'ok'; })()` },
  { name: 'wordmark page', url: base.replace('index.html', 'wordmark.html'), test: `(async () => {${HELPERS} expect($$('#grid .card').length === 4 && $$('#grid-live .card').length === 3, 'four options and three live intensities'); expect(getComputedStyle($('.live-1 .glint')).animationName === 'glint9', 'live bolt animates'); return 'ok'; })()` },
  { name: 'wordmark page calm', url: base.replace('index.html', 'wordmark.html?calm=1'), test: `(async () => {${HELPERS} expect(getComputedStyle($('.live-1 .glint')).animationName === 'none' && getComputedStyle($('.live-1 .glint')).opacity === '0', 'live bolt still with reduced motion'); return 'ok'; })()` },
  { name: 'password page', url: base.replace('index.html', 'password.html'), test: `(async () => {${HELPERS}
    expect($$('.card').length === 12, 'twelve option cards');
    expect(!$('#live').checked, 'live HIBP check is off by default');
    await click('[data-ex="Zagreb2024!"]'); expect($('#f-la').value === 'Zagreb2024!' && $('#f-hc').value === 'Zagreb2024!', 'example fills every field');
    await click('[data-submit="la"]'); expect($('#err-la') && $('#err-la').textContent.includes('najmanje 15'), 'short error at 15');
    await click('[data-submit="lc"]'); await sleep(50); expect(!$('#err-lc') && $('#st-lc .ok'), '11 chars pass at 8');
    await click('[data-ex="iloveyou1234567"]'); await click('[data-submit="ha"]'); await sleep(50); expect($('#err-ha') && $('#err-ha').textContent.includes('curenjima'), 'simulated breach rejected with the reason');
    await click('[data-ex="plavi kit pjeva u kadi"]'); expect($('#cnt-fa').classList.contains('ok'), 'counter reaches 15');
    expect($('#met-fb').dataset.s === '4', 'simulated meter high for a passphrase');
    await click('[data-ex="lozinka1"]'); expect($('#met-fb').dataset.s === '1', 'simulated meter low for a common word');
    $('[data-down="hb"]').checked = true; await click('[data-ex="plavi kit pjeva u kadi"]'); await click('[data-submit="hb"]'); await sleep(50); expect($('#err-hb') && $('#err-hb').textContent.includes('ne možemo'), 'fail closed blocks');
    $('[data-down="ha"]').checked = true; await click('[data-submit="ha"]'); await sleep(50); expect(!$('#err-ha') && $('#st-ha .ok'), 'fail open continues');
    await click('[data-show="la"]'); expect($('#f-la').type === 'text', 'show password');
    return 'ok'; })()`, w: 1100, h: 900 },
  { name: 'reactions page', url: base.replace('index.html', 'reactions.html'), test: `(async () => {${HELPERS}
    expect($$('.card').length === 18, 'eighteen option cards');
    expect($$('#g-name .card').length === 3 && $$('#g-name .spot').length === 12, 'three names in four places each');
    await click('[data-card="ma"][data-r="same"]'); expect($('[data-card="ma"][data-r="same"]').getAttribute('aria-pressed') === 'true', 'single: pressed');
    await click('[data-card="ma"][data-r="good"]'); expect($('[data-card="ma"][data-r="same"]').getAttribute('aria-pressed') === 'false' && $('[data-card="ma"][data-r="good"]').getAttribute('aria-pressed') === 'true', 'single: switches');
    await click('[data-card="mb"][data-r="same"]'); await click('[data-card="mb"][data-r="good"]'); expect($$('[data-card="mb"][aria-pressed="true"]').length === 2, 'multi: both pressed');
    expect(!$('#rx-cb .n'), 'counts hidden before reacting'); await click('[data-card="cb"][data-r="new"]'); expect($('#rx-cb .n'), 'counts shown after reacting');
    expect(!$('#rx-cc .n') && $('#rx-cc').parentElement.parentElement.querySelector('.who-link'), 'no counts variant has the who link');
    expect($$('#rx-fb .pi').length === 3 && $$('#rx-fc .pi').length === 3 && !$('#rx-fc span:not(.n)'), 'icon variants');
    expect($$('#g-hit .card').length === 4, 'four looks for the single reaction');
    await click('[data-hit="v2"]'); expect($('[data-hit="v2"]').getAttribute('aria-pressed') === 'true' && $('#hx-v2 .n').textContent === '10', 'hit: pressed and counted');
    expect(getComputedStyle($('[data-hit="v2"] .bolt')).animationName === 'pop', 'hit: press feedback animates');
    await click('[data-hit="v2"]'); expect($('[data-hit="v2"]').getAttribute('aria-pressed') === 'false' && $('#hx-v2 .n').textContent === '9', 'hit: released');
    return 'ok'; })()`, w: 1100, h: 900 },
  { name: 'reactions page calm', url: base.replace('index.html', 'reactions.html?calm=1'), test: `(async () => {${HELPERS}
    await click('[data-hit="v3"]'); expect($('[data-hit="v3"]').getAttribute('aria-pressed') === 'true', 'hit pressed under reduced motion');
    expect(getComputedStyle($('[data-hit="v3"] .wave')).animationName === 'none' && getComputedStyle($('#hx-v3 .n')).animationName === 'none', 'no press animation under reduced motion');
    return 'ok'; })()`, w: 1100, h: 900 },
  { name: 'viewer page', url: base.replace('index.html', 'viewer.html'), test: `(async () => {${HELPERS} expect($('#f') && $('#f').getAttribute('src'), 'viewer frame'); return 'ok'; })()` }
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
