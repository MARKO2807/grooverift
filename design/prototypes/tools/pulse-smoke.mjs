// Usage: node design/prototypes/tools/pulse-smoke.mjs   (set CHROME to override the Chrome path)
// Smoke test for the refined prototype (design/prototypes/pulse) via the Chrome DevTools Protocol.
// Node 22, no dependencies, offline (the live catalog is not used). Runs the whole flow at 360 px,
// then checks the catalog-failure state, reduced motion (OS and the in-app setting), the Music DNA helix,
// the review pages, and that the decided Daily Drop heading has no middle dot. Desktop runs (session 17, D-080) check the
// rail, the columns, the settings split, the cards and dialogs at 1920, 1366, 1024, 800 and 599 px.
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
  expect($('canvas.ic[data-key="invite"][data-v="branch"]'), 'invite current I4 branch (D-058)');
  expect(document.documentElement.scrollHeight <= innerHeight + 1, 'invite fits the screen without scrolling');
  expect($('main h1 .wm .wm-rift'), 'brand name set like the wordmark');
  expect($('.topbar .wordmark .wm-bolt') && !$('main .wm-bolt'), 'bolt under rift in the top bar only (D-055)');
  expect($$('.topbar .wm-bolt .spark').length === 3, 'bolt has three sparks (D-058)');
  { const fl = getComputedStyle($('.topbar .wm-bolt .bolt')).animationName; expect(document.documentElement.dataset.motion === 'reduced' ? fl === 'none' : fl === 'wm-flick', 'bolt flicker follows the motion setting'); }
  await click('[data-a="next"]'); expect(scr() === 'age', 'age');
  expect(getComputedStyle($('.center-block h1')).textAlign === 'center', 'age centred');
  await click('[data-a="next"]'); expect($('#err-age'), 'age error shown');
  expect(document.activeElement && document.activeElement.name === 'age', 'focus moved to age group');
  await click('input[name="age"][value="adult"]'); expect(!$('#err-age'), 'age error cleared');
  expect(!$('main').textContent.includes('samo za odrasle'), 'softer 18+ wording (session 11)');
  await click('[data-a="next"]'); expect($('.dialog.age18') && document.activeElement.closest('.age18'), '18+ confirmation dialog with focus inside (D-068)');
  await click('[data-k="ov-cancel"]'); expect(scr() === 'age' && !$('.age18'), 'Natrag closes the confirmation');
  await click('[data-a="next"]'); await click('[data-k="ov-ok"]');
  expect(scr() === 'uilang', 'interface language right after the age step');
  expect($('input[name="lang"][value="hr"]') && $('input[name="lang"][value="en"]') && $$('input[name="lang"]').length === 2, 'HR and EN only');
  await click('[data-a="next"]'); expect(scr() === 'account', 'account');
  expect($('[data-a="showpw"] svg.pi'), 'eye icon next to show password');
  expect($('#help-pw').textContent === 'Najmanje 12 znakova, veliko i malo slovo te poseban znak.', 'password help text (D-061)');
  expect(!$('#pw-need'), 'no password line before typing');
  await type('#f-pw', 'kratko'); expect($('#pw-need:not(.ok)') && $('#pw-need').textContent.includes('Nedostaje: 6 znakova, veliko slovo i poseban znak.') && $('#f-pw').getAttribute('aria-describedby').includes('pw-need'), 'one red line names what is missing (D-062)');
  expect(getComputedStyle($('#pw-need')).color !== getComputedStyle($('.help')).color, 'missing line is coloured');
  expect($$('.fine-terms > span').length === 2 && getComputedStyle($('.fine-terms > span')).display === 'block', 'terms in two centred lines');
  await click('[data-a="next"]'); expect($('#err-pw') && $('#err-pw').textContent.includes('najmanje 12') && $('#err-pw').textContent.includes('poseban znak'), 'pw error names the missing rules');
  expect(!$('#pw-need'), 'the error replaces the line until the member types again');
  await type('#f-pw', 'Lozinka2024!'); expect($('#pw-need.ok') && !$('#err-pw'), 'line turns green when all rules are met');
  await click('[data-a="next"]'); expect($('#err-pw') && $('#err-pw').textContent.includes('curenjima'), 'breached password rejected with the reason');
  await type('#f-pw', 'Ovo je duga lozinka, 7 nota!'); await click('[data-a="next"]'); expect(scr() === 'username', 'username');
  expect($('main h1').textContent === 'Kako se zoveš?', 'name question');
  await click('[data-a="next"]'); expect($('#err-dname') && $('#err-uname'), 'username errors');
  await type('#f-dname', 'ana van der berg'); expect($('#f-dname').value === 'ana van der ', 'name: three words, written as typed (D-085, amends D-067)');
  await type('#f-dname', 'Ana'); await type('#f-uname', 'ana'); await sleep(600);
  expect($('[data-a="pickuser"]'), 'username suggestions');
  await click('[data-a="pickuser"]'); await click('[data-a="next"]'); expect(scr() === 'language', 'language');
  await click('[data-a="next"]'); expect(scr() === 'visibility', 'visibility');
  expect(!$('input[name="vis"]:checked'), 'nothing pre-selected');
  expect(fits(), 'visibility fits the 360x640 screen without scrolling');
  expect($$('.vrows-c .vrow').length === 2 && $$('.vrow-table tbody tr').length === 6, 'two short rows, six rows in the full comparison (D-060)');
  expect(getComputedStyle($('.vrow-table thead td')).borderTopStyle === 'none', 'no stray line over the empty corner cell (D-062)');
  await click('[data-a="next"]'); expect($('#err-vis'), 'vis error');
  await click('input[name="vis"][value="private"]');
  expect(getComputedStyle($('input[value="private"]').closest('.vrow')).boxShadow !== 'none' && getComputedStyle($('input[value="public"]').closest('.vrow')).boxShadow === 'none', 'chosen row highlighted');
  await click('[data-a="next"]'); expect(scr() === 'dna', 'dna');
  expect(!$('[data-a="skip"]'), 'no skip: genres are required');
  expect($$('#genre-chips .chip-genre').length === 20 && $('#genre-chips .chip-more'), '20 main genres and the more chip');
  expect($$('#genre-chips .chip-genre').slice(0, 5).map(b => b.dataset.g).join() === 'Pop,Rock,Rap,Elektronika,Latino', 'main genres in order of popularity (D-062)');
  await click('[data-a="next"]'); expect($('#err-genres'), 'min 2 error');
  await click('[data-g="Jazz"]'); expect($('#err-genres'), 'one genre is not enough');
  await click('[data-g="Soul"]'); expect(!$('#err-genres'), 'error cleared at 2');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Techno', 'Latino', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  expect($$('.chips-genres [aria-pressed="true"]').length === 10, 'ten picked');
  expect($('[data-g="Punk"]').getAttribute('aria-disabled') === 'true', 'eleventh disabled');
  await click('[data-g="Punk"]'); expect($('[data-g="Punk"]').getAttribute('aria-pressed') === 'false', 'max 10 holds');
  for (const g of ['Rock', 'Pop', 'Rap', 'Metal', 'Folk', 'Klasična']) await click('[data-g="' + g + '"]');
  await click('[data-a="more-genres"]');
  expect($('#genre-hint').textContent.includes('preko 2.000') && window.GR_DATA.moreGenres.length > 2000, 'search covers the MusicBrainz genre list, hint says "preko 2.000" (D-063)');
  expect($('#genre-results.g-grid') && !$('#more-genres').textContent.includes('Upiši više slova'), 'results in a two-column grid, no count line (D-063)');
  await type('#f-genre', 'metal'); expect(['Heavy metal', 'Black metal', 'Death metal'].every(n => $('#genre-results [data-g="' + n + '"]')) && $('#genre-results [data-g="Heavy metal"] .g-fam').textContent.endsWith('Metal'), 'metal finds the well-known subgenres with their family');
  await type('#f-genre', 'hip'); expect($('#genre-results .chip-genre').dataset.g === 'Rap', 'alias: hip finds Rap first');
  await type('#f-genre', 'klap'); await click('#genre-results [data-g="Klapa"]');
  expect($('#genre-chips [data-g="Klapa"][aria-pressed="true"]'), 'extra genre joins the picked chips');
  expect(!$('.traits'), 'no trait tags');
  { const j = getComputedStyle($('[data-g="Jazz"]')), p = getComputedStyle($('[data-g="Pop"]'));
    expect(!$('.gdot') && j.borderTopColor !== p.borderTopColor && getComputedStyle($('[data-g="Jazz"] .ck')).display !== 'none' && getComputedStyle($('[data-g="Pop"] .ck')).display === 'none', 'picked genre in its own colour with a tick, no dot (D-062)'); }
  await type('#f-artist', 'metalica'); expect($('#artist-results [data-a="artist-add"] .r-title').textContent === 'Metallica', 'typo finds Metallica');
  expect($('#artist-results [data-a="artist-add"] .r-meta').textContent === 'Metal', 'main genre under the name (D-060)');
  await type('#f-artist', 'nirv'); expect($$('#artist-results [data-a="artist-add"]').length === 2, 'two Nirvanas');
  await click('#artist-results [data-a="artist-add"]'); expect(document.activeElement.id === 'f-artist', 'focus back to search');
  expect($$('#picked .portraits li').length === 1, 'portrait added');
  await click('[data-a="next"]'); expect(scr() === 'dnavis', 'dnavis');
  expect(fits(), 'dnavis fits the 360x640 screen without scrolling');
  await click('[data-a="back"]'); expect(scr() === 'dna' && $('[data-g="Jazz"]').getAttribute('aria-pressed') === 'true', 'back keeps picks');
  await click('[data-a="next"]');
  await click('input[name="dnaVis"][value="followers"]'); await click('[data-a="next"]'); expect(scr() === 'how', 'how');
  expect($$('.how-card').length === 4 && !$('.how-badge') && $('main h1 .wm') && $$('.how-vis svg.pi').length === 3 && $('.how-k-row .how-k-tile svg') && $('.how-k-row .hv-name'), 'four how cards: the drawn Daily Drop tile beside its name (D-086), three library icons, wordmark');
  expect(document.body.textContent.includes('Podsjetnik stiže u 12:00') && document.body.textContent.includes('otkrivamo priče iza glazbe'), 'the D-086 copy');
  expect(!$('main canvas.current') && fits(), 'how: no current, fits the screen without scrolling (session 11)');
  await click('[data-a="next"]'); expect(scr() === 'reminder', 'reminder');
  expect($('.notif') && $('.foot-row.equal'), 'notification preview and equal buttons');
  expect($('.notif-q').textContent === 'Koja pjesma najbolje govori tko si?' && $('.rem-time') && $('.install [data-k="install"]'), 'personal example question (D-064), compact time, add to home screen (D-063)');
  await click('[data-a="remind-on"]'); expect($('.perm'), 'perm dialog'); await click('[data-a="perm-block"]'); expect($('.notice'), 'denied notice');
  await click('[data-a="next"]'); expect(scr() === 'done', 'done');
  expect(document.body.textContent.includes('Privatni') && document.body.textContent.includes('Samo pratitelji'), 'done summary');
  expect($$('.facts-grid > div').length === 4 && $('.dna-card canvas.dna'), 'done tiles and DNA');
  expect($('.lead-done').textContent.includes('Sad si dio Rifta.'), 'done: part of the Rift (D-063)');
  expect(!$('.dna-genres') && !$('.traits') && $('.dna-card .sr-only'), 'no visible tags under DNA, text for screen readers');
  await click('[data-a="finish"]'); expect(scr() === 'home', 'home');
  expect($('.dd-name') && $('.dd-date time') && !$('.dd-top').textContent.includes('·'), 'name and date apart, no middle dot');
  expect(!$('.dd-teaser canvas.current') && $$('.dd-c .peeks .peek').length === 2, 'Home: no current, the first two answers (D-060)');
  expect(document.documentElement.classList.contains('nav-glass'), 'glass tab bar (D-060)');
  expect($('.dd-e .btn-invite') && !$('.dd-e .read-link') && $('[data-k="all-ans"]') && document.documentElement.classList.contains('ddn-c'), 'Home e: one call to action, all-answers link, Strujica name (D-064)');
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
  await click('[data-a="comments"]'); expect(scr() === 'answer' && $('.live-field #f-com') && $('[data-a="com-cancel"]'), 'comments screen with Odustani and a living field (D-067)');
  await type('#f-com', 'nešto'); await click('[data-a="com-cancel"]'); expect(scr() === 'drop', 'Odustani goes back');
  await click('[data-a="comments"]');
  await type('#f-com', 'Testni komentar');
  await click('[data-k="ref-open-com"]'); expect(document.activeElement && document.activeElement.id === 'f-refq-com', 'comment card search opens with focus (D-068)');
  await type('#f-refq-com', 'take'); await click('#ref-results-com [data-a="ref-add"]');
  expect($('form[data-form="comment"] .ref-draft') && $('#f-com').value === 'Testni komentar', 'card added to the comment draft, text kept');
  expect(!$('form[data-form="answer"]') || !$('form[data-form="answer"] .ref-draft'), 'answer draft untouched by the comment picker');
  await submit('form[data-form="comment"]'); expect(document.body.textContent.includes('Testni komentar'), 'comment posted');
  { const last = $$('.com-list > li').pop(); expect(last && last.querySelector('.com-refs .ref-title') && last.querySelector('.com-refs .ref-title').textContent === 'Take Five', 'posted comment shows its catalogue card (D-068)'); }
  expect(!$('form[data-form="comment"] .ref-draft'), 'comment picker cleared after posting');
  await click('[data-t="profile"]'); expect(scr() === 'profile' && $('.pf-c-hero canvas.dna'), 'profile with the Music DNA on top (D-060)');
  expect(!$('[data-a="calm"]'), 'motion setting moved off the profile (D-063)');
  await click('[data-a="settings"]'); expect(scr() === 'settings' && $('.set-me') && $$('.set-group').length === 4 && $('[data-k="logout"]') && $('.set-status') && $('.set-body ~ .set-delete') && !document.body.textContent.includes('Preuzmi svoje podatke'), 'settings: status on top, four groups, log out, delete at the bottom (D-065)');
  const calmBefore = $('[data-a="calm"]').getAttribute('aria-checked');
  await click('[data-a="calm"]'); expect($('[data-a="calm"]').getAttribute('aria-checked') !== calmBefore, 'motion setting toggles');
  expect(document.documentElement.dataset.motion === 'reduced', 'motion reduced after setting');
  await click('[data-a="calm"]');
  await click('[data-k="set-1-0"]'); expect(scr() === 'setsub' && $('h1').textContent === 'Privatnost' && $$('[data-a="pick"]').length === 4, 'settings row opens its sub-screen (D-067), privacy as rows (D-070)');
  await click('[data-a="back"]'); await click('[data-k="set-delete"]'); expect(scr() === 'setsub' && !$('input[name="del"]:checked'), 'delete flow, nothing pre-selected'); await click('input[name="del"][value="del"]'); await click('[data-a="del-next"]'); expect($('[data-k="del-copy"]'), 'delete steps offer the data copy first (D-066, D-070)');
  await click('[data-a="back"]');
  await click('[data-a="back"]'); expect(scr() === 'profile', 'back from settings');
  await click('[data-t="activity"]'); expect($$('.act').length === 6 && $('.act-new') && !$('.act-btns') && $('.req-entry .req-n').textContent === '2', 'activity with sample items (D-067); the private profile of this flow gets a requests row on top (round 12a)');
  await click('[data-t="hub"]'); expect(scr() === 'hub' && !$('main canvas.current'), 'hub, no current under the name (D-063)');
  expect($$('.day-strip .day').length === 7 && $('.day[aria-pressed="true"]').textContent.includes('danas') && $$('.prog-card').length === 2 && $('[data-k="suggest"]'), 'hub: seven days, this week programme, suggest (D-064)');
  await click('[data-k="day-2026-10-30"]'); expect($('#h-teaser').textContent === 'Koji koncert pamtiš do danas?', 'a day opens its question');
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
  { name: 'flow 320x568', url: `${base}`, test: FLOW.replace("expect(fits(), 'visibility fits the 360x640 screen without scrolling');", '').replace("expect(fits(), 'dnavis fits the 360x640 screen without scrolling');", '').replace("expect(document.documentElement.scrollHeight <= innerHeight + 1, 'invite fits the screen without scrolling');", '').replace("expect(!$('main canvas.current') && fits(), 'how: no current, fits the screen without scrolling (session 11)');", "expect(!$('main canvas.current'), 'how: no current');"), w: 320, h: 568 },
  { name: 'flow reduced motion (OS)', url: `${base}`, test: FLOW, reduce: true },
  { name: 'flow calm setting', url: `${base}?calm=1`, test: FLOW.replace("expect(document.documentElement.dataset.motion === 'reduced', 'motion reduced after setting');", '') },
  { name: 'catalog failure', url: `${base}?at=dna&catalog=fail`, test: CATALOG_FAIL },
  { name: 'dna helix', url: `${base}?at=dnavis`, test: VARIANTS },
  { name: 'tab swipe', url: `${base}?flow=drop`, test: `(async () => {${HELPERS}
    const sw = async (pts) => { const m = $('main'); const ev = (t, [x, y]) => m.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true })); ev('pointerdown', pts[0]); for (const p of pts.slice(1)) { ev('pointermove', p); await sleep(16); } ev('pointerup', pts[pts.length - 1]); await sleep(120); };
    expect(scr() === 'home', 'starts on home');
    await sw([[300, 300], [260, 302], [180, 304], [120, 305]]); expect(scr() === 'hub', 'swipe left opens the next tab');
    await sw([[100, 300], [160, 302], [240, 304], [300, 305]]); expect(scr() === 'home', 'swipe right opens the previous tab');
    await sw([[100, 300], [160, 302], [240, 304], [300, 305]]); expect(scr() === 'home', 'no tab before home');
    await sw([[200, 200], [205, 260], [210, 340], [212, 420]]); expect(scr() === 'home', 'a vertical move does not switch');
    await sw([[300, 300], [285, 301], [275, 302]]); expect(scr() === 'home', 'a short move snaps back');
    return 'ok'; })()` },
  { name: 'daily drop heading', url: `${base}?flow=drop`, test: `(async () => {${HELPERS} expect($('.dd-name').textContent === 'Daily Drop' && $('.dd-date time').textContent === 'Nedjelja, 1. studenoga', 'name and date'); expect(!$('.dd-top').textContent.includes('·'), 'no middle dot'); return 'ok'; })()` },
  { name: 'choices page', url: base.replace('index.html', 'choices.html'), test: `(async () => {${HELPERS} await sleep(400); expect($$('#gallery canvas.dna').length === 8 && $$('#gallery canvas.dna').every(c => c.width > 0), 'gallery drawn'); return 'ok'; })()` },
  { name: 'wordmark page', url: base.replace('index.html', 'wordmark.html'), test: `(async () => {${HELPERS} expect($$('#grid .card').length === 4 && $$('#grid-live .card').length === 3, 'four options and three live intensities'); expect(getComputedStyle($('.live-1 .glint')).animationName === 'glint9', 'live bolt animates'); return 'ok'; })()` },
  { name: 'wordmark page calm', url: base.replace('index.html', 'wordmark.html?calm=1'), test: `(async () => {${HELPERS} expect(getComputedStyle($('.live-1 .glint')).animationName === 'none' && getComputedStyle($('.live-1 .glint')).opacity === '0', 'live bolt still with reduced motion'); return 'ok'; })()` },
  { name: 'wordmark round 2', url: base.replace('index.html', 'wordmark.html'), test: `(async () => {${HELPERS} expect($$('#grid-new .card').length === 5 && $$('#grid-new .n2 .sp').length === 6, 'four new bolts plus today, N2 sparks'); expect(getComputedStyle($('.n2 .all')).animationName === 'nb-flick', 'new bolt flickers'); return 'ok'; })()` },
  { name: 'invite current page', url: base.replace('index.html', 'invite-current.html'), test: `(async () => {${HELPERS} await sleep(700); const cs = $$('canvas.ic'); expect(cs.length === 4 && cs.every(c => c.height > 0), 'four invite variants drawn'); expect(cs.map(c => c.dataset.v).join() === 'spikes,arc,beat,branch', 'variant order'); return 'ok'; })()`, w: 1100, h: 900 },
  { name: 'invite current page calm', url: base.replace('index.html', 'invite-current.html?calm=1'), test: `(async () => {${HELPERS} await sleep(200); expect(document.documentElement.dataset.motion === 'reduced' && $$('canvas.ic').length === 4, 'still frames under reduced motion'); return 'ok'; })()`, w: 1100, h: 900 },
  { name: 'invite layouts', url: base.replace('index.html', 'invite-layout.html'), test: `(async () => {${HELPERS} await sleep(1500); const f = $$('.fit'); expect(f.length === 4 && f.every(e => e.dataset.over !== undefined && +e.dataset.over <= 1), 'all four invite layouts fit 360x640: ' + f.map(e => e.dataset.over).join()); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'invite layout B 320x568', url: base.replace('index.html', 'invite-layout.html?s=320x568'), test: `(async () => {${HELPERS} await sleep(1500); const b = $('#fit-b'); expect(b && b.dataset.over !== undefined && +b.dataset.over <= 1, 'the chosen layout B fits 320x568 (D-059)'); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 6 page', url: base.replace('index.html', 'round6.html'), test: `(async () => { const $ = s => [...document.querySelectorAll(s)]; const n = $('iframe').length; if (n !== 17) throw new Error('17 option frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 7 page', url: base.replace('index.html', 'round7.html'), test: `(async () => { const $ = s => [...document.querySelectorAll(s)]; const n = $('iframe').length; if (n !== 15) throw new Error('15 option frames, got ' + n); if ($('.notif').length !== 4 || $('.icon-tile svg path').length !== 3) throw new Error('static options'); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 8 page', url: base.replace('index.html', 'round8.html'), test: `(async () => { const $ = s => [...document.querySelectorAll(s)]; const n = $('iframe').length; if (n !== 4) throw new Error('4 settings frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 9 page', url: base.replace('index.html', 'round9.html'), test: `(async () => { const $ = s => [...document.querySelectorAll(s)]; const n = $('iframe').length; if (n !== 31) throw new Error('31 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
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
  /* Round 10 (session 12): key states and the settings flows. */
  { name: 'r10 loading', url: `${base}?flow=drop&at=drop&state=loading`, test: `(async () => {${HELPERS} expect($('.skel-wrap[aria-busy="true"] .skel-ans') && !$('.ans-list') && $('.dd-q'), 'answers load as placeholders, the question shows at once'); expect(document.documentElement.classList.contains('ld-b'), 'default look b'); return 'ok'; })()` },
  { name: 'r10 error and retry', url: `${base}?flow=drop&at=drop&state=error`, test: `(async () => {${HELPERS}
    expect($('.load-err[role="alert"]') && !$('.ans-list'), 'inline error with Retry');
    await click('[data-a="retry-load"]'); expect($('.ans-list'), 'Retry loads the answers');
    await click('[data-k="dock-field"]'); await type('#f-ans', 'Moj odgovor koji ne smije nestati'); await submit('form[data-form="answer"]');
    expect($('.post-err[role="alert"]') && $('#f-ans').value === 'Moj odgovor koji ne smije nestati' && $('[data-k="post"]').textContent === 'Pokušaj ponovno', 'failed post keeps the text (JR4)');
    await submit('form[data-form="answer"]'); expect(!$('.sheet') && $('.ans-mine'), 'retry posts'); return 'ok'; })()` },
  { name: 'r10 offline', url: `${base}?flow=drop&at=drop&net=off`, test: `(async () => {${HELPERS}
    expect($('.net-bar[role="status"]') && $('.net-hint') && !$('.ans-list'), 'offline bar, answers need the network');
    await click('[data-k="dock-field"]'); expect($('[data-k="post"]').disabled && $('#post-off'), 'Objavi disabled with the reason'); return 'ok'; })()` },
  { name: 'r10 empty', url: `${base}?flow=drop&at=drop&state=empty`, test: `(async () => {${HELPERS} expect($('.empty-b .empty-t').textContent === 'Još nema odgovora.' && $('.dd-meta').textContent.includes('Još nitko'), 'empty answers'); return 'ok'; })()` },
  { name: 'r10 missing question', url: `${base}?flow=drop&state=nodrop`, test: `(async () => {${HELPERS} expect($('.dd-late') && $('.dd-q').textContent === 'Koja pjesma je najbolje otvaranje albuma?' && $('.dd-date time').getAttribute('datetime') === '2026-10-31', 'yesterday with its date (J3 E2)'); return 'ok'; })()` },
  { name: 'r10 blocked', url: `${base}?flow=drop&at=member&as=blocker`, test: `(async () => {${HELPERS}
    expect($('.blk-card').textContent.includes('blokiran'), 'blocker sees the notice'); await click('[data-a="unblock"]'); expect($('.dialog') && document.activeElement.closest('.dialog'), 'unblock dialog');
    await click('[data-a="unblock-confirm"]'); expect($('.blk-card').textContent.includes('Odblokirano'), 'unblocked'); return 'ok'; })()` },
  { name: 'r10 blocked side', url: `${base}?flow=drop&at=member&as=blocked`, test: `(async () => {${HELPERS} expect($('.sys-na h1').textContent === 'Ova stranica nije dostupna' && !document.body.textContent.includes('blokiran'), 'neutral not-available page'); return 'ok'; })()` },
  { name: 'r10 comment placeholder', url: `${base}?flow=drop&at=answer&state=blocked`, test: `(async () => {${HELPERS} expect($('.com-gone'), 'placeholder in the thread'); return 'ok'; })()` },
  { name: 'r10 long text 320', url: `${base}?flow=drop&at=drop&state=long`, test: `(async () => {${HELPERS} await sleep(200); expect(document.documentElement.scrollWidth <= innerWidth, 'no sideways scroll: ' + document.documentElement.scrollWidth); return 'ok'; })()`, w: 320, h: 568 },
  { name: 'r10 long profile 320', url: `${base}?flow=drop&at=profile&state=long`, test: `(async () => {${HELPERS} expect(document.documentElement.scrollWidth <= innerWidth, 'no sideways scroll'); return 'ok'; })()`, w: 320, h: 568 },
  { name: 'r10 sign-in', url: `${base}?at=signin&pw=breached`, test: `(async () => {${HELPERS}
    await click('[data-a="signin"]'); expect($('#err-pwin'), 'empty password error');
    await type('#f-pwin', 'kriva'); await click('[data-a="signin"]'); expect($('#err-signin') && document.activeElement.id === 'err-signin', 'one generic error');
    await type('#f-pwin', 'Bilo-koja-lozinka1'); await click('[data-a="signin"]'); expect(scr() === 'home' && $('.pw-banner'), 'breach banner on Home (D-054)');
    await click('[data-a="pw-later"]'); expect(!$('.pw-banner'), 'Kasnije hides it'); return 'ok'; })()` },
  { name: 'r10 pending deletion', url: `${base}?at=signin&acct=pending`, test: `(async () => {${HELPERS}
    await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'pending', 'grace-period screen');
    await click('[data-a="pend-restore"]'); expect(scr() === 'home', 'restored'); return 'ok'; })()` },
  { name: 'r10 username change', url: `${base}?flow=drop&at=setsub&s=username`, test: `(async () => {${HELPERS}
    await type('#f-uname2', 'luka'); expect($('#uname2-status .bad'), 'taken name');
    await type('#f-uname2', 'ana.zvuk'); expect($('#uname2-status .ok'), 'free name');
    await click('[data-a="uname-save"]'); expect($('.dialog'), 'confirm dialog'); await click('[data-a="uname-confirm"]');
    expect($('.sub-hero-t').textContent === '@ana.zvuk' && $('.set-row-plain .set-t').textContent === '@ana.slusa', 'locked for 30 days, old name reserved (D-069)'); return 'ok'; })()` },
  { name: 'r10 password change', url: `${base}?flow=drop&at=setsub&s=password`, test: `(async () => {${HELPERS}
    await click('[data-a="pw-save"]'); expect($('#err-pwold') && $('#err-pw'), 'both errors');
    await type('#f-pwold', 'stara'); await type('#f-pw', 'Lozinka2024!'); await click('[data-a="pw-save"]'); expect($('#err-pw').textContent.includes('curenjima'), 'breached rejected');
    await type('#f-pwold', 'stara'); await type('#f-pw', 'Nova duga lozinka 7!'); await click('[data-a="pw-save"]'); expect(scr() === 'settings', 'saved, back'); return 'ok'; })()` },
  { name: 'r10 2FA', url: `${base}?flow=drop&at=setsub&s=twofa`, test: `(async () => {${HELPERS}
    await click('[data-a="otp-ok"]'); expect($('#err-otp'), 'code needed'); await type('#f-otp', '123456'); await click('[data-a="otp-ok"]'); expect($$('.codes li').length === 8, 'recovery codes'); return 'ok'; })()` },
  { name: 'r10 delete steps', url: `${base}?flow=drop&at=setsub&s=delete&del=b`, test: `(async () => {${HELPERS}
    expect(!$('input[name="del"]:checked'), 'nothing pre-selected'); await click('[data-a="del-next"]'); expect($('#err-del'), 'choose first');
    await click('input[name="del"][value="del"]'); await click('[data-a="del-next"]'); expect($('.sub-step'), 'data copy step');
    await click('[data-a="del-next"]'); expect($('#f-delpw'), 'confirm step'); await click('[data-a="del-go"]'); expect($('#err-delpw'), 'password needed');
    await type('#f-delpw', 'x'); await click('[data-a="del-go"]'); expect($('.sub-hero-t').textContent.startsWith('Brisanje je zakazano'), 'scheduled');
    await click('[data-a="to-signin"]'); expect(scr() === 'signin', 'signed out'); return 'ok'; })()` },
  { name: 'r10 delete typed', url: `${base}?flow=drop&at=setsub&s=delete&del=c`, test: `(async () => {${HELPERS}
    await click('input[name="del"][value="del"]'); await type('#f-delpw', 'x'); await click('[data-a="del-one"]');
    expect($('.dialog [data-k="ov-ok"]').disabled && document.activeElement.id === 'f-deltype', 'typed confirmation');
    await type('#f-deltype', 'OBRIŠI'); expect(!$('.dialog [data-k="ov-ok"]').disabled, 'enabled after OBRIŠI'); await click('[data-a="del-type-go"]'); expect($('.sub-hero-wait'), 'scheduled'); return 'ok'; })()` },
  { name: 'r10 logout dialog', url: `${base}?flow=drop&at=settings&out=b`, test: `(async () => {${HELPERS} await click('[data-a="logout"]'); expect($('.dialog'), 'dialog'); await click('[data-a="logout-confirm"]'); expect(scr() === 'signin', 'signed out'); return 'ok'; })()` },
  { name: 'r10 privacy sheet', url: `${base}?flow=drop&at=setsub&s=privacy&prv=b`, test: `(async () => {${HELPERS}
    expect($('[data-k="pick-hist2"] .set-d').textContent === 'Kao profil', 'history same as profile (D-032)');
    await click('[data-k="pick-vis2"]'); await click('input[name="vis2"][value="private"]'); await click('[data-k="ov-done"]');
    await click('[data-k="pick-lists2"]'); await click('input[name="lists2"][value="all"]'); expect($('input[name="lists2"][value="followers"]').checked, 'private caps lists at followers (D-033)'); return 'ok'; })()` },
  { name: 'r10 notifications push only', url: `${base}?flow=drop&at=setsub&s=notifications`, test: `(async () => {${HELPERS}
    expect(!document.body.textContent.includes('Sažetak') && !$('.ntf-table') && $('.ntf-dev'), 'push only, this device on top (D-070, D-071)');
    await click('[data-k="pause-3h"]'); expect($('#n-dev-d').textContent.includes('21:40') && $('fieldset.ntf-types').disabled && document.activeElement.dataset.k === 'pause-end', 'pause for 3 hours (D-072)');
    await click('[data-a="pause-end"]'); expect(!$('fieldset.ntf-types').disabled, 'resume');
    await click('[data-a="push-dev"]'); expect($('fieldset.ntf-types').disabled && $('.ntf-dev.is-off'), 'device switch quiets the types'); return 'ok'; })()` },
  /* Round 12a (session 14): other members' profiles, lists and follow requests. */
  { name: 'r12 follow public', url: `${base}?flow=drop&at=member&who=petra.zvuk&rel=none`, test: `(async () => {${HELPERS}
    expect($('.pm-head') && $('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Prati' && $('[data-k="cnt-ans"]') && !$('[data-k="cnt-fo"]'), 'public profile: Prati, answers count, no list counts for a non-follower (D-033)');
    expect($('canvas.dna[data-genres]') && $('#h-mdd'), 'DNA and answer history visible on a public profile');
    await click('[data-k="rel-petra.zvuk"]'); expect($('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Pratiš' && $('[data-k="cnt-fo"]'), 'one tap follows, list counts appear');
    await click('[data-k="rel-petra.zvuk"]'); expect($('.dialog') && document.activeElement.closest('.dialog'), 'unfollow is a confirmed action (J4)');
    await click('[data-k="ov-cancel"]'); expect(!$('.dialog') && $('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Pratiš', 'cancel keeps the follow');
    await click('[data-k="rel-petra.zvuk"]'); await click('[data-a="unfollow-confirm"]'); expect($('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Prati', 'unfollowed'); return 'ok'; })()` },
  { name: 'r12 mutual chip', url: `${base}?flow=drop&at=member&who=petra.zvuk&rel=mut`, test: `(async () => {${HELPERS}
    expect($('.rel-chip.is-mut') && $('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Pratiš', 'default b: Pratiš plus an Uzajamni chip'); return 'ok'; })()` },
  { name: 'r12 mutual button', url: `${base}?flow=drop&at=member&who=petra.zvuk&rel=mut&mutual=a`, test: `(async () => {${HELPERS}
    expect(!$('.rel-chip') && $('[data-k="rel-petra.zvuk"]').textContent.trim() === 'Povezani', 'option a: the button says Uzajamni'); return 'ok'; })()` },
  { name: 'r12 follows you', url: `${base}?flow=drop&at=member&who=lukabass&rel=fy`, test: `(async () => {${HELPERS}
    expect($('.rel-chip').textContent === 'Prati te' && !$('#h-mdna'), 'Prati te chip; DNA for followers only is omitted, not locked'); return 'ok'; })()` },
  { name: 'r12 private request', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none`, test: `(async () => {${HELPERS}
    expect($('.empty-b .empty-t').textContent === 'Ovaj profil je privatan.' && !$('#h-mdna') && !$('#h-mdd') && !$('.prow-b'), 'P state: header only, no sections, no counts');
    expect($('[data-k="rel-mia_vinyl"]').textContent.trim() === 'Zatraži praćenje', 'private asks for a request');
    await click('[data-k="rel-mia_vinyl"]'); expect($('[data-k="rel-mia_vinyl"]').textContent.trim() === 'Zatraženo', 'requested');
    await click('[data-k="rel-mia_vinyl"]'); expect($('.dialog'), 'cancel is confirmed'); await click('[data-a="req-cancel-confirm"]'); expect($('[data-k="rel-mia_vinyl"]').textContent.trim() === 'Zatraži praćenje', 'request withdrawn'); return 'ok'; })()` },
  { name: 'r12 private follower', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=fol`, test: `(async () => {${HELPERS}
    expect($('#h-mdna') && $('#h-mdd') && $('[data-k="cnt-fo"]'), 'an approved follower sees the private profile in full'); return 'ok'; })()` },
  { name: 'r12 verified', url: `${base}?flow=drop&at=member&who=nika.rework&rel=none&rbtn=b`, test: `(async () => {${HELPERS}
    expect($('.vbadge') && $('.pm-head .meta').textContent.includes('Verificirano') && $('.pm-head-b > .btn') && $('.topbar [data-a="pmenu"]'), 'verified badge named in text; option b puts the button by the name and the menu in the top bar'); return 'ok'; })()` },
  { name: 'r12 profile menu', url: `${base}?flow=drop&at=member&who=petra.zvuk&rel=mut&show=menu`, test: `(async () => {${HELPERS}
    expect($('.sheet .menu') && $$('.sheet .menu-item').length === 4 && $('[data-k="m-share"]'), 'profile menu: share, mute, block, report'); return 'ok'; })()` },
  { name: 'r12 history', url: `${base}?flow=drop&at=mdrops&who=petra.zvuk&rel=fol`, test: `(async () => {${HELPERS}
    expect($$('.hist-c .hrow').length === 5 && $('.hrow-q time').getAttribute('datetime') === '2026-11-01', 'five answers, today first (PROF-03)');
    await click('[data-k="hist-0"]'); expect(scr() === 'drop', "today's answer opens the question page"); return 'ok'; })()` },
  { name: 'r12 own counts and lists', url: `${base}?flow=drop&at=profile`, test: `(async () => {${HELPERS}
    expect($('[data-k="cnt-fo"] b').textContent === '7' && $('[data-k="cnt-fi"] b').textContent === '10', 'counts come from the follow graph');
    await click('[data-k="cnt-fo"]'); expect(scr() === 'follows' && $('input[name="fl"][value="followers"]').checked && $$('.fl-row').length === 7 && !$('[data-a="rm-follower"]'), 'followers list, no Ukloni on a public profile');
    await click('input[name="fl"][value="following"]'); expect($$('.fl-row').length === 10 && $$('[data-a="unfollow"]').length === 10, 'following tab, each row can unfollow');
    await click('[data-k="fl-petra.zvuk"]'); expect(scr() === 'member' && $('.pm-name').textContent.includes('Petra'), 'a row opens the profile'); return 'ok'; })()` },
  { name: 'r12 remove follower (option a)', url: `${base}?flow=drop&at=follows&list=followers&private=1&rm=a`, test: `(async () => {${HELPERS}
    expect($$('[data-a="rm-follower"]').length === 7, 'Ukloni on every row of a private profile (D-069)');
    await click('[data-k="rm-lukabass"]'); expect($('.dialog [data-a="rm-confirm"]'), 'removal is confirmed'); await click('[data-a="rm-confirm"]');
    expect($$('.fl-row').length === 6 && !$('[data-k="fl-lukabass"]') && $('.fl-tabs input:checked + span b').textContent === '6', 'removed, count updated'); return 'ok'; })()` },
  { name: 'r12 remove via menu (chosen)', url: `${base}?flow=drop&at=follows&list=followers&private=1`, test: `(async () => {${HELPERS}
    await click('[data-k="rmm-lukabass"]'); expect($('.sheet [data-a="rm-from-menu"]'), 'menu per row'); await click('[data-a="rm-from-menu"]'); expect($('.dialog [data-a="rm-confirm"]'), 'then the dialog'); return 'ok'; })()` },
  { name: 'r12 requests', url: `${base}?flow=drop&at=activity&private=1`, test: `(async () => {${HELPERS}
    expect($('.req-entry .req-n').textContent === '2' && !$('.act-btns'), 'default a: one row on top, no inline requests');
    await click('[data-a="open-requests"]'); expect(scr() === 'requests' && $$('.req-list .fl-row').length === 2, 'ACT-02 lists the requests');
    await click('[data-k="req-ok-mia_vinyl"]'); expect($('.req-done') && $('.req-done').textContent.includes('Mia'), 'accepted');
    await click('[data-k="req-no-roko.riff"]'); expect(!$('[data-k="req-roko.riff"]'), 'declined row disappears, silently');
    await click('[data-a="back"]'); expect(scr() === 'activity' && !$('.req-entry'), 'no pending requests left, the row is gone'); return 'ok'; })()` },
  { name: 'r12 requests inline', url: `${base}?flow=drop&at=activity&private=1&req=b`, test: `(async () => {${HELPERS}
    expect(!$('.req-entry') && $('.act-btns'), 'option b: inline only'); await click('[data-k="act-ok-2"]'); expect(!$('.act-btns'), 'accepted inline'); return 'ok'; })()` },
  { name: 'r12 requests public', url: `${base}?flow=drop&at=requests`, test: `(async () => {${HELPERS}
    expect($('.empty-b') && !$('.req-list'), 'a public profile has no requests'); return 'ok'; })()` },
  { name: 'r12 name opens profile', url: `${base}?flow=drop&at=drop`, test: `(async () => {${HELPERS}
    await click('[data-k="who-a1"]'); expect(scr() === 'member' && $('.pm-name').textContent.includes('Petra'), 'the name in an answer opens the profile'); await click('[data-a="back"]'); expect(scr() === 'drop', 'back'); return 'ok'; })()` },
  { name: 'r12 blocked keeps relation button', url: `${base}?flow=drop&at=member&as=blocker`, test: `(async () => {${HELPERS}
    await click('[data-a="unblock"]'); await click('[data-a="unblock-confirm"]'); expect($('.blk-card [data-a="follow"]'), 'after unblocking, the real follow button'); return 'ok'; })()` },
  /* Round 12b (session 14): member safety. */
  { name: 'r12b report sheet', url: `${base}?flow=drop&at=drop`, test: `(async () => {${HELPERS}
    await click('[data-k="more-a3"]'); await click('[data-k="m-report"]'); expect($('.sheet-report') && $$('input[name="repcat"]').length === 11, 'report sheet with the category list (J5)');
    await click('[data-a="rep-next"]'); expect($('#err-repcat'), 'a category is required');
    await click('input[name="repcat"][value="harass"]'); await click('[data-a="rep-next"]'); expect($('#f-rep') && $('.rep-quote').textContent.includes('Kamasija'), 'step 2 shows the reported answer');
    await type('#f-rep', 'Ponavlja se.'); await click('[data-a="rep-send"]'); expect($('.sub-hero-t').textContent === 'Prijava je primljena.' && $('[data-k="rep-mute"]') && $('[data-k="rep-block"]'), 'step 3 offers mute and block');
    await click('[data-k="rep-mute"]'); expect(!$('.sheet-report') && $('.dialog [data-a="mute-confirm"]'), 'mute from the report asks first (D-075 B)');
    await click('[data-a="mute-confirm"]'); await sleep(120); expect($('.ans-muted') && $('.toast-btn'), 'then collapses the answer, with Undo');
    return 'ok'; })()` },
  { name: 'r12b report full screen', url: `${base}?flow=drop&at=drop&show=report&rep=b`, test: `(async () => {${HELPERS}
    expect(scr() === 'report' && $$('input[name="repcat"]').length === 11, 'report as its own screen');
    await click('input[name="repcat"][value="copyright"]'); await click('[data-a="rep-next"]'); expect($('[data-k="rep-copy"]') && !$('[data-a="rep-send"]'), 'copyright routes to the notice form (PUB-11)');
    await click('[data-a="rep-back"]'); await click('input[name="repcat"][value="spam"]'); await click('[data-a="rep-next"]'); await click('[data-a="rep-send"]'); await click('[data-a="rep-done"]'); expect(scr() === 'drop', 'done returns to the question'); return 'ok'; })()` },
  { name: 'r12b block from profile', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none&show=block`, test: `(async () => {${HELPERS}
    expect($('.sheet .facts') && $$('.facts li').length === 5 && $('#f-blkrep'), 'block sheet lists the facts (J5) and offers a report');
    $('#f-blkrep').click(); await sleep(50); await click('[data-a="block-confirm"]'); expect($('.sheet-report') && $('.rep-step'), 'also report opens the report');
    await click('[data-k="ov-x"]'); expect($('.blk-card').textContent.includes('blokiran') && !$('[data-a="follow"]'), 'the profile shows the blocker state (D-019)');
    await click('[data-a="unblock"]'); await click('[data-a="unblock-confirm"]'); expect($('.blk-card').textContent.includes('Odblokirano') && $('.blk-card [data-a="follow"]'), 'unblocked, follows not restored'); return 'ok'; })()` },
  { name: 'r12b block dialog b', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none&show=block&blk=b`, test: `(async () => {${HELPERS}
    expect($('.dialog .blk-more') && $$('.blk-more .facts li').length === 5, 'short dialog with the facts under details'); await click('[data-a="block-confirm"]'); expect($('.blk-card'), 'blocked'); return 'ok'; })()` },
  { name: 'r12b block from the thread', url: `${base}?flow=drop&at=answer`, test: `(async () => {${HELPERS}
    await click('[data-k="more-a1"]'); await click('[data-k="m-block"]'); await click('[data-a="block-confirm"]');
    expect(scr() === 'drop' && !$('[data-k="more-a1"]') && $('.dd-meta').textContent.includes('6 odgovora'), "the blocked member's answer and thread are gone, the count follows"); return 'ok'; })()` },
  { name: 'r12b mute at once a (rejected)', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none&show=mute&mute=a`, test: `(async () => {${HELPERS}
    await sleep(200); expect($('.toast-btn') && $('.toast-in').textContent.includes('Utišano'), 'muted at once with Undo'); $('.toast-btn').click(); await sleep(150);
    await click('[data-k="pmenu"]'); expect($('[data-k="m-mute"]').textContent.startsWith('Utišaj'), 'undo restored the state'); return 'ok'; })()` },
  { name: 'r12b mute confirm (D-075 default)', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none&show=mute`, test: `(async () => {${HELPERS}
    expect($('.dialog [data-a="mute-confirm"]') && !$('.rel-chip.is-muted'), 'confirmation first, no mark yet'); await click('[data-a="mute-confirm"]'); await sleep(150); expect($('.toast-btn'), 'then the toast with Undo');
    expect($('.pm-id .rel-chip.is-muted') && $('.rel-chip.is-muted').textContent.startsWith('Utišano'), 'the profile shows the quiet "Utišano" mark (D-075)');
    await click('[data-k="pmenu"]'); expect($('[data-k="m-mute"]').textContent.startsWith('Poništi'), 'menu offers unmute');
    await click('[data-k="m-mute"]'); await sleep(150); expect(!$('.rel-chip.is-muted'), 'unmute removes the mark'); return 'ok'; })()` },
  { name: 'r12b muted profile mark', url: `${base}?flow=drop&at=member&who=mia_vinyl&rel=none&show=muted`, test: `(async () => {${HELPERS}
    expect($('.pm-id .rel-chip.is-muted') && $('.rel-chip.is-muted .sr-only'), 'muted mark with a screen-reader note'); return 'ok'; })()` },
  { name: 'r12b muted answer and comment', url: `${base}?flow=drop&at=drop&show=muted`, test: `(async () => {${HELPERS}
    expect($('.ans-muted') && !$('#t-a3'), 'muted answer collapsed'); await click('[data-k="showm-a3"]'); expect($('#t-a3') && !$('.ans-muted'), 'shown on request');
    await click('[data-k="com-a2"]'); expect($('.com-muted'), 'muted comment collapsed in a thread'); return 'ok'; })()` },
  { name: 'r12b blocked and muted lists', url: `${base}?flow=drop&at=setsub&s=blocked&bl=1`, test: `(async () => {${HELPERS}
    expect($$('[data-a="unblock"]').length === 2 && $$('[data-a="unmute"]').length === 1, 'real lists (SAFE-08)');
    await click('[data-k="bl-lukabass"]'); expect(!$('[data-a="unmute"]') && $('.set-empty'), 'unmuted');
    await click('[data-k="bl-mia_vinyl"]'); expect($('.dialog'), 'unblock is confirmed'); await click('[data-a="unblock-confirm"]'); expect($$('[data-a="unblock"]').length === 1, 'unblocked'); return 'ok'; })()` },
  { name: 'r12b status, notice and appeal', url: `${base}?flow=drop&at=setsub&s=status`, test: `(async () => {${HELPERS}
    expect($('.sub-hero-t').textContent === 'Račun je u redu' && $('[data-k="st-not"]') && $('[data-k="st-rep"]'), 'status hub');
    await click('[data-k="st-not"]'); expect($$('[data-a="open-notice"]').length === 2, 'two notices'); await click('[data-k="nt-n1"]');
    expect($$('.sor-list > div').length === 5 && $('.sor-item') && $('[data-k="appeal-n1"]'), 'statement of reasons with five parts and an appeal (R-07)');
    await click('[data-k="appeal-n1"]'); await click('[data-a="appeal-send"]'); expect($('#err-appeal'), 'an empty appeal is refused');
    await type('#f-appeal', 'Citirao sam tuđi komentar, nije moj.'); await click('[data-a="appeal-send"]'); expect($('.sub-hero-t').textContent === 'Žalba je poslana', 'appeal sent');
    await click('[data-a="back"]'); expect($('.sor-appeal') && !$('[data-k="appeal-n1"]'), 'the notice shows the appeal as sent'); return 'ok'; })()` },
  { name: 'r12b statement as a letter', url: `${base}?flow=drop&at=setsub&s=notice&n=n2&sor=b`, test: `(async () => {${HELPERS} expect($('.sor-letter') && $('.sor-item') && document.body.textContent.includes('Rok za žalbu je istekao'), 'letter form, expired appeal window'); return 'ok'; })()` },
  { name: 'r12b my reports', url: `${base}?flow=drop&at=setsub&s=reports`, test: `(async () => {${HELPERS}
    expect($$('.status-pill').length === 3 && $('.status-pill.is-rev'), 'own reports with status'); await click('[data-k="rp-r1"]'); expect($$('.rep-steps li.on').length === 3 && document.body.textContent.includes('Poduzete su mjere'), 'decided report, no detail about the other person');
    await click('[data-a="back"]'); await click('[data-k="rp-r3"]'); expect($$('.rep-steps li.on').length === 2, 'report in review'); return 'ok'; })()` },
  { name: 'r12b restricted while browsing', url: `${base}?flow=drop&at=drop&acct=restricted`, test: `(async () => {${HELPERS}
    expect($('.dock-locked') && !$('[data-k="dock-field"]') && !$('.rst-bar'), 'default a: the dock says it, no bar'); await click('[data-k="dock-why"]'); expect(scr() === 'setsub' && $('.sor') && document.body.textContent.includes('6. studenoga'), 'why opens the statement of reasons');
    await click('[data-a="back"]'); await click('[data-k="com-a1"]'); expect($('form[data-form="comment"][hidden]') && $('[data-k="com-why"]'), 'the comment form is replaced by the reason'); return 'ok'; })()` },
  { name: 'r12b restricted bar b', url: `${base}?flow=drop&at=drop&acct=restricted&rst=b`, test: `(async () => {${HELPERS} expect($('.rst-bar') && $('.dock-locked'), 'option b: bar plus the dock'); return 'ok'; })()` },
  { name: 'r12b restricted at sign-in', url: `${base}?at=signin&acct=restricted`, test: `(async () => {${HELPERS}
    await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'restricted' && $('main h1').textContent.includes('ograničeno'), 'SAFE-07 interstitial'); await click('[data-a="rst-go"]'); expect(scr() === 'home' && $('.set-status-warn, .dd-q'), 'continues to Home'); return 'ok'; })()` },
  { name: 'r12b suspended at sign-in', url: `${base}?at=signin&acct=suspended`, test: `(async () => {${HELPERS}
    await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'suspended' && $('.sor-list') && !$('.tabbar'), 'suspended: statement of reasons, no app');
    await click('[data-k="appeal-n4"]'); expect($('#f-appeal'), 'appeal inline'); await type('#f-appeal', 'To nije bila prijetnja nego dogovor za koncert.'); await click('[data-a="appeal-send"]'); expect($('.sor-appeal'), 'appeal sent');
    await click('[data-k="sus-out"]'); expect(scr() === 'signin', 'signed out'); return 'ok'; })()` },
  /* Round 12c (session 15): signed-out visitors and sign-in. */
  { name: 'r12c landing', url: `${base}?at=landing`, test: `(async () => {${HELPERS}
    expect(scr() === 'landing' && $('.h-hero') && !$('.tabbar') && $('canvas.ic.inv-wide'), 'landing with the invite current (b, D-076), no tabs');
    expect(document.body.textContent.includes('Nema liste čekanja') && $('[data-k="l-notice"]'), 'no waitlist; the DSA notice form is reachable');
    expect($('.foot [data-a="pub-signin"]') && !$('.top-signin').offsetParent, 'sign-in in the foot on the phone (pub=b); the top-bar button is for desktop only (D-080)');
    await click('[data-a="pub-signin"]'); expect(scr() === 'signin' && !$('.ret-line'), 'to sign-in, no return line'); return 'ok'; })()` },
  { name: 'r12c landing a (rejected)', url: `${base}?at=landing&land=a`, test: `(async () => {${HELPERS} expect(!$('canvas.ic'), 'a: no current'); return 'ok'; })()` },
  { name: 'r12c sign-in wall soft', url: `${base}?at=share&wall=soft&wallnow=1`, test: `(async () => {${HELPERS}
    await sleep(250); expect($('.sheet.wall') && $('.wall [data-k="ov-x"]') && $('.shell[inert]'), 'soft: a sheet that can be closed');
    await click('[data-k="ov-x"]'); expect(!$('.wall'), 'closed'); await sleep(300); expect(!$('.wall'), 'and it does not come back');
    return 'ok'; })()` },
  { name: 'r12c sign-in wall hard (rejected in D-085) on a profile', url: `${base}?at=pubprofile&who=petra.zvuk&wall=hard&wallnow=1`, test: `(async () => {${HELPERS}
    await sleep(250); expect($('.dialog.wall') && $('.scrim-blur') && !$('.wall [data-k="ov-x"]') && !$('.scrim[data-a]'), 'hard: no close button, no scrim close, blurred');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(100); expect($('.wall'), 'Escape does not close it');
    await click('[data-k="wall-signin"]'); expect(scr() === 'signin' && $('.ret-line'), 'to sign-in with the return line'); return 'ok'; })()` },
  { name: 'r12c no wall on the landing', url: `${base}?at=landing&wallnow=1`, test: `(async () => {${HELPERS} await sleep(300); expect(!$('.wall'), 'the landing never gets a wall'); return 'ok'; })()` },
  { name: 'r12c no wall (default since D-085)', url: `${base}?at=share&wallnow=1`, test: `(async () => {${HELPERS} await sleep(300); expect(!$('.wall'), 'wall=none'); return 'ok'; })()` },
  { name: 'r12c landing c', url: `${base}?at=landing&land=c`, test: `(async () => {${HELPERS} expect($('.pub-dd-card .dd-q-sm') && !$('.ans') && !$('.dd-meta'), 'c: today\\'s question, no answers or counts'); return 'ok'; })()` },
  { name: 'r12c share view returns to the question', url: `${base}?at=share`, test: `(async () => {${HELPERS}
    expect(scr() === 'share' && $('h1.dd-q') && !$('canvas.current') && !$('.ans') && !$('.dd-meta') && !$('.stack'), 'question only, no current under the date: no answers, counts or faces (D-022)');
    expect(!document.body.textContent.includes('Mia') && !document.body.textContent.includes('Petra'), 'no member names');
    expect($('[data-k="what"]') && !$('.pub-intro'), 'a: the link to the landing, no intro block');
    await sleep(5300); expect(!$('.wall') && !$('.shell[inert]'), 'no wall, also after five seconds (D-085)');
    await click('[data-k="pub-signin"]'); expect(scr() === 'signin' && $('.ret-line').textContent.includes('pitanje'), 'sign-in says it returns to the question');
    await type('#f-pwin', 'bilo koja'); await click('[data-a="signin"]'); expect(scr() === 'drop' && $('.ans'), 'back on the question, answers visible as a member');
    await click('[data-a="back"]'); expect(scr() === 'home', 'Back leads Home, not to the signed-out view'); return 'ok'; })()` },
  { name: 'r12c share b and the answer link', url: `${base}?at=share&share=b&a=1`, test: `(async () => {${HELPERS}
    expect($('.pub-intro .how-rows') && !$('[data-k="what"]'), 'b: intro block'); expect(!document.body.textContent.includes('Mia'), 'an answer link never hints at the author');
    await click('[data-a="pub-signin"]'); expect($('.ret-line').textContent.includes('odgovor'), 'returns to the answer');
    await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'answer', 'the answer thread after sign-in'); return 'ok'; })()` },
  { name: 'r12c older question', url: `${base}?at=share&day=2026-10-30`, test: `(async () => {${HELPERS} expect($('h1.dd-q').textContent.includes('koncert') && $('time[datetime="2026-10-30"]'), 'an older question by date'); return 'ok'; })()` },
  { name: 'r12c top-bar sign-in (pub=a)', url: `${base}?at=share&pub=a`, test: `(async () => {${HELPERS} expect($('.topbar .top-signin') && !$('.foot'), 'a: top-bar button, no foot'); await click('.top-signin'); expect(scr() === 'signin', 'to sign-in'); return 'ok'; })()` },
  { name: 'r12c public profile', url: `${base}?at=pubprofile&who=petra.zvuk`, test: `(async () => {${HELPERS}
    expect($('.pm-name').textContent.includes('Petra') && $('.pf-bio') && !$('.cnt') && !$('.dna-card') && !$('.hist') && !$('.rel-chip') && !$('[data-k="pmenu"]'), 'name, handle, bio only (PUB-08)');
    await click('[data-a="pub-signin"]'); expect($('.ret-line').textContent.includes('profil'), 'returns to the profile'); await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'member' && $('.cnt'), 'the full profile as a member'); return 'ok'; })()` },
  { name: 'r12c verified public profile', url: `${base}?at=pubprofile&who=nika.rework`, test: `(async () => {${HELPERS} expect($('.pm-name .vbadge, .pm-name svg') && document.body.textContent.includes('Verificirano'), 'verified mark'); return 'ok'; })()` },
  { name: 'r12c private and unknown profiles are not available', url: `${base}?at=pubprofile&who=mia_vinyl`, test: `(async () => {${HELPERS}
    expect($('.sys-na') && !document.body.textContent.includes('Mia'), 'private profile: not available, no name (IA8)'); return 'ok'; })()` },
  { name: 'r12c unknown profile', url: `${base}?at=pubprofile&who=nobody`, test: `(async () => {${HELPERS} expect($('.sys-na'), 'unknown profile: the same page'); await click('[data-k="na-home"]'); expect(scr() === 'landing', 'to the landing'); return 'ok'; })()` },
  { name: 'r12c sign-in states', url: `${base}?at=signin&lock=1`, test: `(async () => {${HELPERS}
    expect($('#err-lock') && $('[data-k="signin"]').disabled && $('[data-k="google"]').disabled && $('[data-k="forgot"]'), 'lockout: both ways disabled, reset offered');
    await click('[data-k="forgot"]'); expect(scr() === 'reset', 'forgot leads to the reset request'); return 'ok'; })()` },
  { name: 'r12c reset request', url: `${base}?at=signin`, test: `(async () => {${HELPERS}
    await type('#f-email', ''); await click('[data-k="forgot"]'); expect(scr() === 'reset', 'reset screen'); await click('[data-a="reset-send"]'); expect($('#err-remail'), 'address required'); // an empty sign-in address: nothing to carry over (step 3.9)
    await type('#f-remail', 'ana@therift.com'); await click('[data-a="reset-send"]'); expect(scr() === 'resetsent' && document.body.textContent.includes('ana@therift.com') && document.body.textContent.includes('30 minuta'), 'neutral sent page with the address and the validity');
    await click('[data-k="sent-signin"]'); expect(scr() === 'signin', 'back to sign-in'); return 'ok'; })()` },
  { name: 'r12c new password (D-061 rules, b)', url: `${base}?at=resetnew`, test: `(async () => {${HELPERS}
    await click('[data-a="reset-save"]'); expect($('#err-pw'), 'password required');
    await type('#f-pw', 'kratka'); await click('[data-a="reset-save"]'); expect($('#err-pw').textContent.includes('još treba'), 'missing rules named');
    await type('#f-pw', 'Lozinka2024!'); await click('[data-a="reset-save"]'); expect($('#err-pw').textContent.includes('curenjima'), 'breached password rejected');
    await type('#f-pw', 'Primjer!Lozinka9'); expect($('#pw-need.ok'), 'rules met'); await click('[data-a="reset-save"]'); await sleep(150);
    expect(scr() === 'signin' && $('.toast-in').textContent.includes('Prijavi se novom'), 'b: back to sign-in with the toast'); return 'ok'; })()` },
  { name: 'r12c new password a (signed in at once)', url: `${base}?at=resetnew&done=1&reset=a`, test: `(async () => {${HELPERS} await sleep(150); expect(scr() === 'home' && $('.toast-in').textContent.includes('promijenjena'), 'a: Home with the toast'); return 'ok'; })()` },
  { name: 'r12c second factor', url: `${base}?at=signin&twofa=1`, test: `(async () => {${HELPERS}
    await type('#f-pwin', 'x'); await click('[data-a="signin"]'); expect(scr() === 'twofa' && $('#f-code') && !$('#f-tfarem'), 'code step after the password (a: no remember box)');
    await click('[data-a="tfa-ok"]'); expect($('#err-code'), 'six digits required'); await type('#f-code', '000000'); await click('[data-a="tfa-ok"]'); expect($('#err-code').textContent.includes('nije točan'), 'wrong code');
    await click('[data-a="tfa-toggle"]'); expect($('#f-rcode') && !$('#f-code'), 'recovery code instead'); await type('#f-rcode', 'ABCD-EFGH-12'); await click('[data-a="tfa-ok"]'); await sleep(150);
    expect(scr() === 'home' && $('.toast-in').textContent.includes('oporavak'), 'signed in with a recovery code'); return 'ok'; })()` },
  { name: 'r12c second factor b', url: `${base}?at=twofa&tfa=b`, test: `(async () => {${HELPERS} expect($('#f-tfarem'), 'b: remember this device'); await type('#f-code', '123456'); await click('[data-a="tfa-ok"]'); expect(scr() === 'home', 'signed in'); return 'ok'; })()` },
  { name: 'r12c links that cannot be used', url: `${base}?at=linkbad&kind=invite`, test: `(async () => {${HELPERS}
    const t = document.body.textContent; expect($('main h1').textContent === 'Pozivnica se ne može iskoristiti' && !/iskorištena|istekla|povučena/.test($('main .lead').textContent), 'invite: no reason given (J1 E1)');
    await click('[data-k="lb-go"]'); expect(scr() === 'landing', 'to the landing'); return 'ok'; })()` },
  { name: 'r12c reset link expired', url: `${base}?at=linkbad&kind=reset`, test: `(async () => {${HELPERS} expect(document.body.textContent.includes('30 minuta')); await click('[data-k="lb-go"]'); expect(scr() === 'reset', 'request a new one'); return 'ok'; })()` },
  { name: 'r12c verified', url: `${base}?at=verified`, test: `(async () => {${HELPERS} expect($('main h1').textContent === 'Adresa je potvrđena'); await click('[data-k="ver-go"]'); expect(scr() === 'signin'); return 'ok'; })()` },
  /* Round 12d (session 16): the Music DNA editor, edit profile with a photo, help and feedback, SYS-02, SYS-04, before the first Drop, J1 E3/E4. */
  { name: 'r12d editor rows, move, remove and undo', url: `${base}?flow=drop&at=setsub&s=dna`, test: `(async () => {${HELPERS}
    expect($$('.dna-rows-genre .dna-row').length === 4 && $$('.dna-rows-artist .dna-row').length === 3 && $('.dna-live-edit canvas.dna') && $('.aud-line b').textContent === 'svi članovi', 'rows for genres and artists, the live Spirala and the audience line (J2)');
    expect($('[data-k="up-genre-Jazz"]').disabled && !$('[data-k="down-genre-Jazz"]').disabled, 'the first row cannot move up');
    await click('[data-k="down-genre-Jazz"]'); expect($$('.dna-rows-genre .dna-name')[1].textContent.startsWith('Jazz') && $('#dna-msg').textContent.includes('Jazz je sad na 2. mjestu') && document.activeElement.dataset.k === 'down-genre-Jazz', 'moved down, announced, focus stays on the moved item');
    await click('[data-k="rm-genre-Soul"]'); await sleep(120); expect($$('.dna-rows-genre .dna-row').length === 3 && $('.toast-btn') && $('#dna-msg').textContent.includes('Uklonjeno: Soul'), 'removed with Undo in the toast');
    $('.toast-btn').click(); await sleep(120); expect($$('.dna-rows-genre .dna-row').length === 4 && $$('.dna-rows-genre .dna-name')[0].textContent.startsWith('Soul'), 'undo puts it back where it was');
    return 'ok'; })()` },
  { name: 'r12d add a genre', url: `${base}?flow=drop&at=setsub&s=dna`, test: `(async () => {${HELPERS}
    await click('[data-k="dna-add-genre"]'); expect($('#dna-add') && document.activeElement.id === 'f-genre', 'the add panel opens on the search field');
    await type('#f-genre', 'heavy'); const chip = $$('#genre-results .chip-genre').find(c => c.dataset.g === 'Heavy metal'); expect(chip, 'search finds Heavy metal');
    chip.click(); await sleep(120); expect($$('.dna-rows-genre .dna-row').length === 5 && $$('.dna-rows-genre .dna-name')[4].textContent.startsWith('Heavy metal') && $('#dna-msg').textContent === 'Dodano: Heavy metal.' && $('#dna-add'), 'added at the end, announced, the panel stays open');
    await click('[data-k="dna-add-close"]'); expect(!$('#dna-add') && document.activeElement.dataset.k === 'dna-add-genre', 'closed, focus back on the button'); return 'ok'; })()` },
  { name: 'r12d add an artist, no duplicates', url: `${base}?flow=drop&at=setsub&s=dna&q=nin`, test: `(async () => {${HELPERS}
    await sleep(900); const res = $$('#artist-results [data-a="artist-add"]'); expect(res.length >= 2 && res.some(r => r.getAttribute('aria-disabled') === 'true'), 'results, and the one already in the DNA is marked');
    expect(!document.body.textContent.includes('ne odgovara'), 'catalog wording per D-078 ("ne radi")');
    const add = res.find(r => r.getAttribute('aria-disabled') !== 'true'); add.click(); await sleep(150); expect($$('.dna-rows-artist .dna-row').length === 4 && $('#dna-msg').textContent.startsWith('Dodano'), 'added as a fourth artist');
    await click('[data-k="rm-artist-' + add.dataset.id + '"]'); await sleep(120); expect($$('.dna-rows-artist .dna-row').length === 3 && $('.toast-btn'), 'artist removed with Undo'); return 'ok'; })()` },
  { name: 'r12d at least two genres (a, default)', url: `${base}?flow=drop&at=setsub&s=dna&picks=min`, test: `(async () => {${HELPERS}
    expect($$('.dna-rows-genre .dna-row').length === 2 && $('[data-k="rm-genre-Jazz"]').getAttribute('aria-disabled') === 'true', 'remove is off at two genres (D-046)');
    await click('[data-k="rm-genre-Jazz"]'); await sleep(120); expect($$('.dna-rows-genre .dna-row').length === 2 && $('.toast-in').textContent.includes('najmanje'), 'the tap explains, nothing is removed'); return 'ok'; })()` },
  { name: 'r12d may be emptied (b)', url: `${base}?flow=drop&at=setsub&s=dna&picks=min&dnamin=b`, test: `(async () => {${HELPERS}
    await click('[data-k="rm-genre-Jazz"]'); await click('[data-k="rm-genre-Soul"]'); await sleep(120); expect(!$('.dna-rows-genre') && $('.dna-sec .set-empty') && !$('.dna-live-edit canvas.dna') && $('.dna-empty'), 'emptied: no Spirala');
    await click('[data-k="top-back"]'); expect(scr() === 'profile' && $('.pf-dna-empty [data-k="pf-dna-add"]'), 'the profile offers to add genres'); return 'ok'; })()` },
  { name: 'r12d full lists', url: `${base}?flow=drop&at=setsub&s=dna&picks=full`, test: `(async () => {${HELPERS} expect($$('.dna-rows-genre .dna-row').length === 10 && $$('.dna-rows-artist .dna-row').length === 10 && !$('[data-k="dna-add-genre"]') && !$('[data-k="dna-add-artist"]') && document.body.textContent.includes('Najviše 10 žanrova'), 'caps reached: no add buttons, the hint says why'); return 'ok'; })()` },
  { name: 'r12d chips editor (b)', url: `${base}?flow=drop&at=setsub&s=dna&dnae=b`, test: `(async () => {${HELPERS}
    expect($('#genre-chips') && $('#picked .portraits') && !$('.dna-rows'), 'chips as in onboarding');
    await click('[data-k="g-Jazz"]'); await sleep(120); expect($('[data-k="g-Jazz"]').getAttribute('aria-pressed') === 'false' && $('#dna-count').textContent.startsWith('3 od 10') && $('.toast-btn'), 'a tap removes, with Undo');
    await click('[data-k="g-Rock"]'); expect($('[data-k="g-Rock"]').getAttribute('aria-pressed') === 'true' && $('#dna-count').textContent.startsWith('4 od 10'), 'a tap adds'); return 'ok'; })()` },
  { name: 'r12d audience from the editor', url: `${base}?flow=drop&at=setsub&s=dna`, test: `(async () => {${HELPERS}
    await click('[data-k="dna-aud"]'); expect($('.sheet-pick input[name="dnaVis2"]'), 'the same sheet as in Privacy (SET-05)'); await click('[data-k="dnaVis2-me"]'); await click('[data-k="ov-done"]'); expect($('.aud-line b').textContent === 'samo ja', 'the audience line follows'); return 'ok'; })()` },
  { name: 'r12d profile edit: drafts, discard dialog, save', url: `${base}?flow=drop&at=setsub&s=profile`, test: `(async () => {${HELPERS}
    await type('#f-dname2', 'Ana nova bell hooks'); expect($('#f-dname2').value === 'Ana nova bell ', 'name rule (D-085): three words, as typed');
    await click('[data-k="top-back"]'); expect($('.dialog') && $('[data-a="prof-discard"]'), 'back with unsaved changes asks'); await click('[data-k="ov-cancel"]'); expect(scr() === 'setsub' && $('#f-dname2').value === 'Ana nova bell ', 'keeps editing with the draft');
    await type('#f-bio', 'Novi bio.'); await click('[data-k="sub-save"]'); await sleep(120); expect(scr() === 'settings' && $('.set-me .set-t').textContent.trim() === 'Ana nova bell' && $('.toast-in').textContent.includes('spremljen'), 'saved and back');
    await click('[data-k="top-back"]'); expect(scr() === 'profile' && $('.pf-bio').textContent === 'Novi bio.', 'the profile shows the new bio'); return 'ok'; })()` },
  { name: 'r12d photo sheet, crop and remove (a, a)', url: `${base}?flow=drop&at=setsub&s=profile`, test: `(async () => {${HELPERS}
    expect($('#f-file') && !$('.avatar.has-photo'), 'file input present, no photo yet'); await click('[data-k="sub-photo"]'); expect($('.sheet [data-k="ph-gal"]') && $('[data-k="ph-cam"]') && $('[data-k="ph-sample"]') && !$('[data-k="ph-rm"]'), 'sheet: gallery, camera, sample, no remove yet');
    await click('[data-k="ph-sample"]'); expect($('.crop-circ .crop-img') && $('#f-zoom'), 'the crop step'); await type('#f-zoom', '1.5'); expect($('.crop-img').style.transform === 'scale(1.5)', 'zoom moves the preview');
    await click('[data-k="ov-ok"]'); await sleep(120); expect($('.avatar.has-photo .av-sample') && $('.toast-in').textContent.includes('postavljena'), 'photo set inside the ring');
    await click('[data-k="sub-photo"]'); await click('[data-k="ph-rm"]'); await sleep(120); expect(!$('.avatar.has-photo') && $('.toast-in').textContent.includes('uklonjena'), 'removed'); return 'ok'; })()` },
  { name: 'r12d photo direct (b) and a bad file', url: `${base}?flow=drop&at=setsub&s=profile&pic=sample&photo=b&show=badfile`, test: `(async () => {${HELPERS}
    expect($('#photo-err') && $('#photo-err').textContent.includes('5 MB') && $('[data-k="sub-photo-rm"]') && $('.avatar.has-photo'), 'b: remove as a second button; the rejected file is explained (5 MB, D-078)'); await click('[data-k="sub-photo-rm"]'); expect(!$('.avatar.has-photo') && !$('#photo-err'), 'removed'); return 'ok'; })()` },
  { name: 'r12d feedback form (a)', url: `${base}?flow=drop&at=setsub&s=help`, test: `(async () => {${HELPERS}
    expect($$('input[name="fbtype"]').length === 3 && $('#f-fb') && $('[data-k="fb-shot"]') && $('.fb-info') && $('#f-fbinfo').checked && $('#f-fbmail').checked, 'one form: type, text, screenshot, the listed details');
    await click('[data-k="fb-send"]'); expect($('#err-fbtype') && $('#err-fb'), 'type and text are required');
    await click('input[name="fbtype"][value="bug"]'); await type('#f-fb', 'Gumb Odgovori ne reagira.'); await click('[data-k="fb-send"]'); expect($('.sub-hero-t').textContent.startsWith('Hvala') && document.body.textContent.includes('you@therift.com'), 'sent, reply by email allowed');
    await click('[data-k="fb-done"]'); expect(scr() === 'settings', 'done returns to Settings'); return 'ok'; })()` },
  { name: 'r12d feedback rows (b) and no details (c)', url: `${base}?flow=drop&at=setsub&s=help&fb=b`, test: `(async () => {${HELPERS}
    expect($('[data-k="h-bug"]') && $('[data-k="h-idea"]') && !$('#f-fb'), 'b: two rows'); await click('[data-k="h-idea"]'); expect(scr() === 'setsub' && $('.top-title').textContent === 'Pošalji prijedlog' && !$('input[name="fbtype"]') && $('#f-fb'), 'its own form without the type');
    await type('#f-fb', 'Neka Hub pamti dan.'); await click('[data-k="fb-send"]'); expect($('.sub-hero-t'), 'sent'); return 'ok'; })()` },
  { name: 'r12d feedback c', url: `${base}?flow=drop&at=setsub&s=help&fb=c&shot=1`, test: `(async () => {${HELPERS} expect(!$('.fb-info') && !$('#f-fbinfo') && $('.fb-shot') && $('[data-k="fb-shot-rm"]'), 'c: no technical details; a screenshot attached'); await click('[data-k="fb-shot-rm"]'); expect(!$('.fb-shot') && $('[data-k="fb-shot"]'), 'screenshot removed'); return 'ok'; })()` },
  { name: 'r12d something went wrong (SYS-02)', url: `${base}?flow=drop&at=hub&state=fail`, test: `(async () => {${HELPERS}
    expect($('.sys-fail') && $('.tabbar') && $('.topbar .top-title') && !$('.day-strip') && !/[A-Z0-9]{4}-/.test($('.sys-fail').textContent), 'a: inside the shell, no code'); await click('[data-k="fail-retry"]'); expect($('.day-strip') && !$('.sys-fail'), 'retry loads the Hub'); return 'ok'; })()` },
  { name: 'r12d SYS-02 bare (b) and with a code (c)', url: `${base}?flow=drop&at=home&state=fail&fail=b`, test: `(async () => {${HELPERS} expect($('.sys-fail') && !$('.tabbar') && $('.topbar .wordmark'), 'b: nothing but the page'); await click('[data-k="fail-help"]'); expect(scr() === 'setsub' && $('#f-fb'), 'help still reachable'); return 'ok'; })()` },
  { name: 'r12d SYS-02 c', url: `${base}?flow=drop&at=drop&state=fail&fail=c`, test: `(async () => {${HELPERS} expect($('.fail-code code') && $('.tabbar'), 'c: a support code'); return 'ok'; })()` },
  { name: 'r12d Daily Drop paused (SYS-04)', url: `${base}?flow=drop&at=drop&state=paused`, test: `(async () => {${HELPERS}
    expect($('.dd-paused') && $('h1.dd-q') && $('.dock-locked') && !$('.ans-list') && !$('[data-k="dock-field"]'), 'a: the question stays, answers and the composer wait');
    await click('[data-k="tab-home"]'); expect($('.dd-paused') && $('.dd-paused-q .dd-q') && !$('[data-a="open-compose"]'), 'Home: the card above the question, no answer button'); return 'ok'; })()` },
  { name: 'r12d paused b and the generic page', url: `${base}?flow=drop&at=drop&state=paused&paused=b`, test: `(async () => {${HELPERS}
    expect($('.dd-paused') && !$('.dd-q') && !$('.dock'), 'b: the card alone'); await click('[data-k="paused-home"]'); expect(scr() === 'home' && $('.dd-paused') && !$('.dd-paused-q'), 'to Home, the card alone there too'); return 'ok'; })()` },
  { name: 'r12d feature paused page', url: `${base}?flow=drop&at=featoff&f=comments`, test: `(async () => {${HELPERS} expect($('main h1').textContent.includes('Komentari') && !document.body.textContent.includes('greška'), 'brief, no blame'); await click('[data-k="fo-home"]'); expect(scr() === 'home', 'points to Home'); return 'ok'; })()` },
  { name: 'r12d before the first Drop', url: `${base}?flow=drop&at=hub&state=first`, test: `(async () => {${HELPERS}
    expect(!$('.day-strip') && $('#h-first').textContent.includes('u nedjelju, 1. studenoga') && document.body.textContent.includes('01:00 po tvom vremenu') && !$('canvas.current') && $('[data-k="suggest"]'), 'the date, the local time, no current, suggesting a question still possible');
    expect($('.first-count[aria-hidden="true"]') && $$('.first-n').length === 3 && $$('.first-n')[0].textContent === '6', 'b (chosen, D-078): the countdown with seconds, hidden from screen readers');
    { const s0 = $$('.first-n')[2].textContent; await sleep(1100); expect($$('.first-n')[2].textContent !== s0, 'the seconds tick'); }
    await click('[data-k="fw-dna"]'); expect(scr() === 'setsub' && $('.dna-rows-genre'), 'leads to the editor'); await click('[data-k="top-back"]'); expect(scr() === 'hub', 'and back');
    await click('[data-k="tab-home"]'); expect($('.dd-first') && !$('.past') && $('.empty-b'), 'Home: the same card, no archive yet'); return 'ok'; })()` },
  { name: 'r12d first a (rejected) and the calm countdown', url: `${base}?flow=drop&at=hub&state=first&first=a`, test: `(async () => {${HELPERS} expect(!$('.first-count'), 'a: no countdown'); return 'ok'; })()` },
  { name: 'r12d countdown under reduced motion', url: `${base}?flow=drop&at=home&state=first&calm=1`, test: `(async () => {${HELPERS} expect($$('.first-n').length === 2, 'minutes only, no seconds, when motion is reduced'); return 'ok'; })()` },
  { name: 'r12d first c', url: `${base}?flow=drop&at=drop&state=first&first=c`, test: `(async () => {${HELPERS} expect($('.dd-first canvas.current') && $('h1#h-first') && !$('.dock'), 'c: the current under the name; no dock before the first question'); return 'ok'; })()` },
  { name: 'r12d invite opened while signed in (J1 E3, E4)', url: `${base}?flow=drop&at=invsigned`, test: `(async () => {${HELPERS}
    expect($('main h1').textContent.includes('novu osobu') && $('[data-k="inv-out"]') && $('[data-k="inv-stay"]'), 'another account: sign out or stay'); await click('[data-k="inv-out"]'); await sleep(120); expect(scr() === 'signin' && $('.toast-in').textContent.includes('pozivnice'), 'signed out with the hint'); return 'ok'; })()` },
  { name: 'r12d invite same email', url: `${base}?flow=drop&at=invsigned&same=1`, test: `(async () => {${HELPERS} expect($('main h1').textContent === 'Već imaš račun'); await click('[data-k="inv-home"]'); expect(scr() === 'home'); return 'ok'; })()` },
  { name: 'r12d Google address differs', url: `${base}?at=invmail`, test: `(async () => {${HELPERS} expect($('main h1').textContent.includes('jednu adresu') && document.body.textContent.includes('you@therift.com'), 'E4: the invite address is named'); await click('[data-k="inv-email"]'); expect(scr() === 'account', 'back to the account step'); return 'ok'; })()` },
  /* Desktop (session 17, D-079 and D-080): the rail, the columns, cards and dialogs. Sizes: 1920×1080 (Full HD, two
     columns, the settings split), 1366×800 (the rail with labels), 1024×768 (one column), 800×800 (the collapsed rail),
     599 px (the phone layout stays). */
  { name: 'desktop 1920 rail, skip link, two-column Home', url: `${base}?flow=drop`, w: 1920, h: 1080, test: `(async () => {${HELPERS}
    const h = document.documentElement, cs = el => getComputedStyle(el);
    expect(h.dataset.kind === 'app' && cs($('.rail')).display === 'flex' && cs($('.tabbar')).display === 'none', 'the rail shows, the tab bar is hidden');
    expect($$('.rail > .rail-list .rail-item').length === 4 && $$('.rail-foot .rail-item').length === 2 && $('.rail-foot .alpha-tag'), 'four destinations, settings, help and the alpha mark');
    expect($$('.rail-item').map(b => b.textContent.trim()).join() === 'Početna,Hub,Aktivnost,Profil,Postavke,Pomoć', 'same order as the tab bar (WCAG 3.2.3)');
    expect(Math.round($('.rail').getBoundingClientRect().width) === 272 && $('.rail').getBoundingClientRect().height >= innerHeight - 1, 'rail 16 rem (17 px root) wide and full height at 1920');
    expect(cs($('.rail-brand')).display !== 'none' && !$('.topbar').offsetParent && cs($('.topbar .alpha-tag')).display === 'none', 'wordmark and alpha in the rail; Home has no top bar (the rail names it)');
    expect(cs($('.home-side')).display === 'flex' && cs($('.home-side')).gridColumnStart === '2' && $('.home-side').getBoundingClientRect().left > $('.dd-teaser').getBoundingClientRect().right, 'Home: people and past days in the right column');
    { const m = $('main'), r = m.getBoundingClientRect(); const inner = r.width - parseFloat(cs(m).paddingLeft) - parseFloat(cs(m).paddingRight); expect(Math.abs(inner - 79.5 * 17) < 1, 'two columns 50 + 3.5 + 26 rem at 17 px, got ' + inner); expect(Math.abs((r.left + r.right) / 2 - (272 + (innerWidth - 272) / 2)) < 1, 'columns centred beside the rail'); }
    const ids = $$('[id]').map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); expect(!dup.length, 'duplicate ids with the rail wordmark: ' + dup.join(','));
    expect($('.skip') && $('.skip').getAttribute('href') === '#main' && ($('.skip').compareDocumentPosition($('.rail')) & Node.DOCUMENT_POSITION_FOLLOWING), 'skip link comes first');
    $('.skip').click(); await sleep(50); expect(document.activeElement === $('#main'), 'skip link focuses the content');
    await click('[data-k="rail-hub"]'); expect(scr() === 'hub' && $('[data-k="rail-hub"]').getAttribute('aria-current') === 'page', 'rail opens the Hub and marks it');
    await click('[data-k="rail-settings"]'); expect(scr() === 'settings' && $('[data-k="rail-settings"]').getAttribute('aria-current') === 'page' && !$('[data-k="rail-profile"]').hasAttribute('aria-current'), 'settings marked in the rail, not Profile');
    await click('[data-k="rail-help"]'); expect(scr() === 'setsub' && $('[data-k="rail-help"]').getAttribute('aria-current') === 'page' && !$('[data-k="rail-settings"]').hasAttribute('aria-current'), 'help marked in the rail');
    await click('[data-k="rail-home"]'); expect(scr() === 'home', 'back Home from the rail');
    /* A mouse drag selects text; a finger still swipes between tabs (tablet). */
    const drag = async type => { const m = $('main'), o = { bubbles: true, pointerType: type, pointerId: 7, button: 0, isPrimary: true }; m.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ clientX: 400, clientY: 300 }, o))); await sleep(30); m.dispatchEvent(new PointerEvent('pointermove', Object.assign({ clientX: 300, clientY: 302 }, o))); await sleep(30); m.dispatchEvent(new PointerEvent('pointerup', Object.assign({ clientX: 300, clientY: 302 }, o))); await sleep(120); };
    await drag('mouse'); expect(scr() === 'home', 'a mouse drag does not switch tabs on desktop');
    await drag('touch'); expect(scr() === 'hub', 'a touch swipe still switches tabs');
    return 'ok';
  })()` },
  { name: 'desktop 1920 question page, dock at the foot, sheet as a dialog', url: `${base}?flow=drop&at=drop`, w: 1920, h: 1080, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el), m = $('main').getBoundingClientRect(), b = $('.bottom').getBoundingClientRect();
    expect(Math.abs(b.bottom - innerHeight) < 1 && cs($('.bottom')).position === 'sticky' && Math.abs(b.width - m.width) < 1, 'the dock stays at the foot of the column as on the phone (owner): ' + [b.bottom, b.width, m.width].map(Math.round).join());
    expect(cs($('.dock')).flexDirection === 'row' && $('canvas.orbit'), 'dock with the orbit');
    { const inner = m.width - parseFloat(cs($('main')).paddingLeft) - parseFloat(cs($('main')).paddingRight); expect(Math.abs(inner - 50 * 17) < 1, 'one 50 rem column at 17 px, got ' + inner); }
    await click('[data-k="dock-field"]'); const s = $('.sheet'); expect(s && $('.shell[inert]'), 'compose sheet open');
    const r = s.getBoundingClientRect(); expect(r.top > 24 && r.bottom < innerHeight - 24 && r.left > 272 && Math.abs((r.left + r.right) / 2 - (272 + (innerWidth - 272) / 2)) < 1 && r.width <= 36 * 17, 'sheet centred over the content as a dialog: ' + [r.top, r.bottom, r.left, r.right].map(Math.round).join());
    expect(parseFloat(cs(s).borderBottomLeftRadius) > 0, 'all corners rounded');
    expect(document.activeElement === $('[data-k="f-ans"]'), 'focus in the field as on the phone');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(100); expect(!$('.sheet') && document.activeElement === $('[data-k="dock-field"]'), 'Escape closes and focus returns');
    await click('[data-k="more-a3"]'); const mn = $('.sheet'); expect(mn && mn.getBoundingClientRect().top > 24 && mn.getBoundingClientRect().left > 272, 'answer menu as a dialog');
    await click('[data-k="m-mute"]'); const d = $('.dialog'); expect(d, 'mute dialog');
    const e = d.getBoundingClientRect(); expect(Math.abs((e.left + e.right) / 2 - (272 + (innerWidth - 272) / 2)) < 1, 'dialog centred over the content');
    return 'ok';
  })()` },
  { name: 'desktop 1920 Hub and profiles in two columns', url: `${base}?flow=drop&at=hub`, w: 1920, h: 1080, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(cs($('.hub-side')).gridColumnStart === '2' && $('.hub-side').getBoundingClientRect().left > $('#h-teaser').getBoundingClientRect().right && $('.hub-side').getBoundingClientRect().top < 200, 'the week and archives in the right column');
    await click('[data-k="day-2026-10-30"]'); expect($('#h-teaser').textContent === 'Koji koncert pamtiš do danas?' && cs($('.hub-side')).gridColumnStart === '2', 'a past day keeps the column');
    await click('[data-k="rail-profile"]'); expect(scr() === 'profile', 'profile');
    { const c = $('.pf-c').getBoundingClientRect(), a = $('.pf-main').getBoundingClientRect(), b = $('.pf-side').getBoundingClientRect(); expect(cs($('.pf-side')).gridColumnStart === '2' && b.left > a.right && c.left < b.left && c.right > a.right && c.width <= 60 * 17 + 1, 'profile: Spirala across the top but capped at 60 rem, identity left, artists and answers right'); }
    await click('[data-k="rail-home"]'); await click('[data-a="open-drop"]'); await click('[data-a="open-member"]'); expect(scr() === 'member', 'another member');
    expect(cs($('.pm-side')).gridColumnStart === '2' && $('.pm-side').getBoundingClientRect().left > $('.pm-main').getBoundingClientRect().right, 'member profile in two columns');
    return 'ok';
  })()` },
  { name: 'desktop 1920 settings list beside the detail', url: `${base}?flow=drop&at=setsub&s=account`, w: 1920, h: 1080, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(cs($('.set-nav')).display === 'flex' && $('.set-nav [aria-current="page"]') && $('.set-nav [aria-current="page"]').dataset.s === 'account', 'settings list on the left with Account marked');
    expect($('.set-detail').getBoundingClientRect().left > $('.set-nav').getBoundingClientRect().right, 'detail on the right');
    expect(cs($('.topbar [data-a="back"]')).display === 'none', 'no back arrow: the list is the way back');
    await click('.set-nav [data-s="privacy"]'); expect(scr() === 'setsub' && $('.set-nav [aria-current="page"]').dataset.s === 'privacy' && $('.set-detail .set-row'), 'the list opens another sub-screen and marks it');
    const ids = $$('[id]').map(e => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i); expect(!dup.length, 'duplicate ids in the split: ' + dup.join(','));
    return 'ok';
  })()` },
  { name: 'desktop 1366 rail with labels, one column where there is one part', url: `${base}?flow=drop&at=activity`, w: 1366, h: 800, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(Math.round($('.rail').getBoundingClientRect().width) === 240 && cs($('.rail-item')).flexDirection === 'row' && cs($('.rail-brand')).display !== 'none', 'rail 15 rem with labels and the wordmark');
    { const m = $('main'), r = m.getBoundingClientRect(); const inner = r.width - parseFloat(cs(m).paddingLeft) - parseFloat(cs(m).paddingRight); expect(Math.abs(inner - 704) < 1, 'reading column 44 rem, got ' + inner); expect(Math.abs((r.left + r.right) / 2 - (240 + (innerWidth - 240) / 2)) < 1, 'column centred beside the rail'); }
    { const t = $('.topbar'), r = t.getBoundingClientRect(); expect(Math.abs(r.width - parseFloat(cs(t).paddingLeft) - parseFloat(cs(t).paddingRight) - 720) < 1, 'top bar keeps the phone geometry round the column'); }
    await click('[data-k="rail-home"]'); expect(cs($('.home-side')).gridColumnStart === '2', 'two columns from 1280 px');
    return 'ok';
  })()` },
  { name: 'desktop 1024 one column', url: `${base}?flow=drop`, w: 1024, h: 768, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(cs($('.rail-item')).flexDirection === 'row' && Math.round($('.rail').getBoundingClientRect().width) === 225, 'rail with labels, clamped to 22vw');
    expect(cs($('main')).display === 'flex' && cs($('.home-side')).display === 'contents', 'one column below 1280 px');
    await click('[data-a="open-drop"]'); expect(scr() === 'drop' && cs($('.bottom')).position === 'sticky' && $('.bottom').getBoundingClientRect().bottom === innerHeight, 'the dock stays at the foot below 1280 px');
    return 'ok';
  })()` },
  { name: 'desktop 800 collapsed rail', url: `${base}?flow=drop`, w: 800, h: 800, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(Math.round($('.rail').getBoundingClientRect().width) === 80 && cs($('.rail-item')).flexDirection === 'column', 'rail 80 px, icon over label');
    expect(cs($('.rail-brand')).display === 'none' && cs($('.topbar > .wordmark')).display !== 'none' && !$('.topbar .top-home').offsetParent, 'wordmark stays in the top bar');
    expect(cs($('.topbar .alpha-tag')).display === 'none' && $('.rail-foot .alpha-tag').offsetParent, 'alpha mark in the rail footer');
    { const m = $('main'), r = m.getBoundingClientRect(); const inner = r.width - parseFloat(cs(m).paddingLeft) - parseFloat(cs(m).paddingRight); expect(Math.abs(inner - 640) < 1, 'reading column 40 rem at 800 px, got ' + inner); }
    await click('[data-a="open-drop"]'); expect(scr() === 'drop', 'drop page'); await click('[data-k="dock-field"]'); const s = $('.sheet'); const r = s.getBoundingClientRect(); expect(r.left > 80 && r.top > 24 && r.width <= 576, 'dialog beside the collapsed rail');
    return 'ok';
  })()` },
  { name: 'desktop keeps the phone layout at 599', url: `${base}?flow=drop`, w: 599, h: 800, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect(cs($('.rail')).display === 'none' && cs($('.tabbar')).display === 'flex', 'tab bar, no rail');
    expect(Math.round($('#app').getBoundingClientRect().width) === 480 && $('.topbar .alpha-tag').offsetParent, '30 rem column, alpha in the top bar');
    await click('[data-a="open-drop"]'); expect(scr() === 'drop', 'drop page'); await click('[data-k="dock-field"]'); await sleep(300); const r = $('.sheet').getBoundingClientRect(); expect(Math.abs(r.bottom - innerHeight) < 1 && parseFloat(cs($('.sheet')).borderBottomLeftRadius) === 0, 'bottom sheet at 599 px: ' + Math.round(r.bottom) + '/' + innerHeight);
    return 'ok';
  })()` },
  { name: 'desktop onboarding and sign-in as a centred card', url: `${base}?at=account`, w: 1366, h: 800, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el), r = $('.page').getBoundingClientRect();
    expect(Math.round(r.width) === 544 && Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 1 && Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) < 2, 'card 34 rem, centred both ways: ' + [r.width, r.left, r.top].map(Math.round).join());
    expect(cs($('.foot')).position === 'static' && parseFloat(cs($('.page')).borderTopLeftRadius) > 0, 'the button follows the form inside the card');
    await click('[data-a="next"]'); expect($('#err-email') || $('.field-err'), 'validation still runs');
    return 'ok';
  })()` },
  { name: 'desktop 1920 visitor landing', url: `${base}?at=landing`, w: 1920, h: 1080, test: `(async () => {${HELPERS}
    const cs = el => getComputedStyle(el);
    expect($('.top-signin-desk').offsetParent && cs($('.foot')).display === 'none', 'sign-in in the top bar, no sticky foot');
    expect(cs($('.how-rows')).gridTemplateColumns.split(' ').length === 3 && Math.round($('#app').getBoundingClientRect().width) === 64 * 17, 'three feature cards in a 64 rem page (17 px root)');
    await click('[data-k="top-signin"]'); expect(scr() === 'signin' && Math.round($('.page').getBoundingClientRect().width) === 38 * 17, 'sign-in opens as a 38 rem card');
    return 'ok';
  })()` },
  /* Step 3.9 (session 21): the fixes from the closing accessibility review. */
  { name: 'step 3.9 mute keeps focus, the toast waits while focused', url: `${base}?flow=drop&at=drop`, test: `(async () => {${HELPERS}
    const m = $$('[data-a="more"]')[1]; expect(m, 'an answer menu'); m.scrollIntoView({ block: 'center' }); await sleep(100); const y = scrollY;
    m.click(); await sleep(150); await click('.sheet [data-a="mute"]'); await click('[data-a="mute-confirm"]'); await sleep(150);
    const a = document.activeElement; expect(a && a.dataset.a === 'show-muted', 'focus on the collapsed line, got ' + (a && a.outerHTML.slice(0, 80)));
    const r = a.getBoundingClientRect(); expect(r.top >= 0 && r.bottom <= innerHeight && Math.abs(scrollY - y) < 300, 'the collapsed line is in view');
    expect(a.getAttribute('aria-describedby') === 'h-' + a.dataset.id, 'Prikaži names the muted answer');
    const id = a.dataset.id; const tb = $('#toast .toast-btn'); expect(tb, 'Undo toast'); tb.focus(); await sleep(5600);
    expect($('#toast .toast-btn'), 'the toast stays while it has focus'); tb.click(); await sleep(150);
    expect(document.activeElement && document.activeElement.id === 'h-' + id, 'Undo returns focus to the answer');
    return 'ok';
  })()` },
  { name: 'step 3.9 verified tip opens in place', url: `${base}?flow=drop&at=member&who=nika.rework`, test: `(async () => {${HELPERS}
    expect($('#vtip') && $('#vtip').hidden, 'tip closed'); await click('.vbadge'); expect(!$('#vtip').hidden && $('.vbadge').getAttribute('aria-expanded') === 'true' && document.activeElement === $('.vbadge'), 'tip open, focus kept');
    return 'ok';
  })()` },
  { name: 'step 3.9 private profile caps the lists', url: `${base}?flow=drop&at=setsub&s=privacy`, test: `(async () => {${HELPERS}
    const pickIn = async (p, v) => { await click('[data-k="pick-' + p + '"]'); await sleep(100); const i = $('.sheet input[name="' + p + '"][value="' + v + '"]'); expect(i, 'picker ' + p); i.click(); await sleep(150); if ($('.sheet')) { const x = $('.sheet [data-a="overlay-close"]'); if (x) { x.click(); await sleep(100); } } };
    const listsAll = async () => { await click('[data-k="pick-lists2"]'); await sleep(100); const a = $('.sheet input[name="lists2"][value="all"]'), f = $('.sheet input[name="lists2"][value="followers"]'); const r = { dis: a.disabled, all: a.checked, fol: f.checked }; $('.sheet [data-a="overlay-close"]').click(); await sleep(100); return r; };
    await pickIn('lists2', 'all'); expect((await listsAll()).all, 'all members chosen');
    await pickIn('vis2', 'private'); { const r = await listsAll(); expect(r.dis && r.fol, 'disabled while private: ' + JSON.stringify(r)); }
    await pickIn('vis2', 'public'); expect((await listsAll()).all, 'the earlier choice comes back');
    return 'ok';
  })()` },
  { name: 'step 3.9 pause button before sign-in', url: `${base}?at=landing&smo=b`, test: `(async () => {${HELPERS}
    expect($('.top-calm') && $('.top-calm').getAttribute('aria-pressed') === 'false', 'pause button'); await click('.top-calm');
    expect(document.documentElement.dataset.motion === 'reduced' && $('.top-calm').getAttribute('aria-pressed') === 'true', 'motion stopped');
    return 'ok';
  })()` },
  { name: 'step 3.9 spaced code and Enter on two-step sign-in', url: `${base}?at=twofa`, test: `(async () => {${HELPERS}
    await type('#f-code', '123 456'); $('#f-code').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(200);
    expect(!$('#err-code') && scr() !== 'twofa', 'a pasted "123 456" signs in with Enter, now on ' + scr());
    return 'ok';
  })()` },
  { name: 'step 3.9 reset takes the sign-in address', url: `${base}?at=signin`, test: `(async () => {${HELPERS}
    await type('#f-email', 'ivo@primjer.hr'); await click('[data-k="forgot"]'); expect(scr() === 'reset' && $('#f-remail').value === 'ivo@primjer.hr', 'address carried over');
    await type('#f-remail', 'ivo@primjer'); await click('[data-a="reset-send"]'); expect(/ime@primjer/.test(($('#err-remail') || {}).textContent || ''), 'the error suggests the form');
    return 'ok';
  })()` },
  { name: 'step 3.9 review page', url: base.replace('index.html', 'review39.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 15) throw new Error('15 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'D-086 how-drop page', url: base.replace('index.html', 'how-drop.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 9) throw new Error('9 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'D-086 drop-card page', url: base.replace('index.html', 'drop-card.html'), test: `(async () => { const n = document.querySelectorAll('.ddc').length; if (n !== 23) throw new Error('23 cards, got ' + n); if (!document.querySelector('#c-hk.hk-play .hk-bolt')) throw new Error('chosen card'); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'desktop page', url: base.replace('index.html', 'desktop.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 51) throw new Error('51 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 12d page', url: base.replace('index.html', 'round12d.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 47) throw new Error('47 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 12c page', url: base.replace('index.html', 'round12c.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 33) throw new Error('33 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 12b page', url: base.replace('index.html', 'round12b.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 34) throw new Error('34 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 12a page', url: base.replace('index.html', 'round12a.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 35) throw new Error('35 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 11 page', url: base.replace('index.html', 'round11.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 4) throw new Error('4 frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'round 10 page', url: base.replace('index.html', 'round10.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 43) throw new Error(43 + ' frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
  { name: 'viewer page', url: base.replace('index.html', 'viewer.html'), test: `(async () => {${HELPERS} expect($('#f') && $('#f').getAttribute('src'), 'viewer frame'); return 'ok'; })()` }
];

let failed = false;
try {
  for (const run of runs.filter(r => !process.env.ONLY || r.name.includes(process.env.ONLY))) { // ONLY=<text> runs the matching runs only
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
