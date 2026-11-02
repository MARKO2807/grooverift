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
  await type('#f-dname', 'ana mari horvat kovač'); expect($('#f-dname').value === 'Ana Mari Horvat ', 'name: three words, each capitalised (D-067)');
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
  expect($$('.how-card').length === 4 && !$('.how-badge') && $('main h1 .wm') && $$('.how-vis svg.pi').length === 4, 'four how cards, library icons, wordmark');
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
  await type('#f-com', 'Testni komentar'); await submit('form[data-form="comment"]'); expect(document.body.textContent.includes('Testni komentar'), 'comment posted');
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
  await click('[data-t="activity"]'); expect($$('.act').length === 7 && $('.act-new') && $('.act-btns'), 'activity with sample items (D-067)');
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
  { name: 'r10 notifications push only', url: `${base}?flow=drop&at=setsub&s=notifications`, test: `(async () => {${HELPERS} expect(!document.body.textContent.includes('Sažetak') && !$('.ntf-table') && $$('.switch').length === 5, 'push switches only, no social email (D-070, OQ-32)'); return 'ok'; })()` },
  { name: 'round 10 page', url: base.replace('index.html', 'round10.html'), test: `(async () => { const n = document.querySelectorAll('iframe').length; if (n !== 43) throw new Error(43 + ' frames, got ' + n); return 'ok'; })()`, w: 1600, h: 900 },
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
