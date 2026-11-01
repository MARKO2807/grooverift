/* GrooveRift step 3.5 direction prototypes: shared engine.
   One state machine for onboarding (J1) and the Daily Drop (J3). Each direction differs in
   layout and CSS, and in a few structural choices set in window.GR_DIRECTION:
     progress: 'bar' | 'sections' | 'pulse'   onboarding progress indicator
     composer: 'page' | 'inline' | 'dock'     where the Daily Drop answer is written
     sort:     'select' | 'segmented' | 'pills'
     footBack: true adds a Back button next to Continue in onboarding
     motif:    true enables the rift line and the Music DNA pulse strip (identity art only)
     homeActions: 'two' | 'one'               actions on the Home Daily Drop card
   Static prototype: no network, nothing stored, all data fictional (see data.js).
   URL parameters: ?flow=drop starts signed in on Home; &private=1 simulates a private profile. */
(function () {
  'use strict';
  const cfg = window.GR_DIRECTION;
  const D = window.GR_DATA;
  const ic = window.GR_ICON;
  const root = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const P = new URLSearchParams(location.search);
  const START_DROP = P.get('flow') === 'drop';
  const PRIV = P.get('private') === '1';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
  function pl(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  const plAns = n => pl(n, 'odgovor', 'odgovora', 'odgovora');

  const ONB = ['age', 'account', 'username', 'language', 'visibility', 'dna', 'dnavis', 'how', 'reminder'];
  const SECTIONS = [
    { label: 'Ti', steps: ['age', 'account', 'username', 'language'] },
    { label: 'Privatnost', steps: ['visibility'] },
    { label: 'Music DNA', steps: ['dna', 'dnavis'] },
    { label: 'Daily Drop', steps: ['how', 'reminder'] }
  ];
  const VIS_LABEL = { public: 'Javni', private: 'Privatni' };
  const DNA_LABEL = { all: 'Svi članovi', followers: 'Samo pratitelji', me: 'Samo ja' };
  const READ_LANGS = ['Hrvatski', 'English', 'Deutsch', 'Italiano', 'Slovenščina'];
  const ENVELOPE = [0.45, 0.7, 0.9, 1, 0.8, 0.6, 0.85, 0.65, 0.5, 0.75, 0.55, 0.4, 0.7, 0.5, 0.35];

  const cloneAnswer = a => ({ ...a, reacts: { ...a.reacts }, refs: [...a.refs], myReacts: [] });
  const st = {
    screen: START_DROP ? 'home' : 'invite',
    hist: [],
    err: {},
    age: null, pw: '', showPw: false,
    displayName: START_DROP ? 'Ana' : '', username: START_DROP ? 'ana.slusa' : '', userState: START_DROP ? 'ok' : 'idle',
    lang: 'hr', readLangs: new Set(['Hrvatski']),
    vis: START_DROP ? (PRIV ? 'private' : 'public') : null,
    genres: new Set(START_DROP ? ['Jazz', 'Soul', 'Kantautorska'] : []),
    artists: START_DROP ? [11, 0, 15] : [],
    artistQ: '',
    dnaVis: START_DROP ? 'all' : null,
    reminder: START_DROP ? 'off' : null, remTime: '09:00',
    answers: D.answers.map(cloneAnswer),
    comments: JSON.parse(JSON.stringify(D.comments)),
    sort: 'foryou', mine: null, draft: '', draftRefs: [], refQ: '', refOpen: false, editing: false,
    expanded: new Set(), pending: null, newTimer: null,
    ctx: null, commentDraft: '',
    overlay: null
  };
  const picks = () => st.genres.size + st.artists.length;

  /* ---------- small builders ---------- */
  const motif = () => (cfg.motif ? '<div class="rift" aria-hidden="true"></div>' : '');
  const fieldErr = (id, msg) => `<p class="field-err" id="err-${id}">${ic('alert')}<span>${msg}</span></p>`;

  function field(o) {
    const err = st.err[o.id];
    const desc = [o.help ? `help-${o.id}` : '', err ? `err-${o.id}` : ''].filter(Boolean).join(' ');
    return `<div class="field">
      <label class="label" for="f-${o.id}">${o.label}</label>
      ${o.help ? `<p class="help" id="help-${o.id}">${o.help}</p>` : ''}
      <div class="input-wrap${o.prefix ? ' has-prefix' : ''}${o.after ? ' has-after' : ''}">
        ${o.prefix ? `<span class="prefix" aria-hidden="true">${o.prefix}</span>` : ''}
        <input class="input" id="f-${o.id}" data-k="f-${o.id}" type="${o.type || 'text'}" value="${esc(o.value || '')}"${desc ? ` aria-describedby="${desc}"` : ''}${err ? ' aria-invalid="true"' : ''} ${o.attrs || ''}>
        ${o.after || ''}
      </div>
      ${err ? fieldErr(o.id, err) : ''}
    </div>`;
  }

  function choices(name, legend, opts, val) {
    const err = st.err[name];
    return `<fieldset class="choices"${err ? ` aria-describedby="err-${name}"` : ''}>
      <legend class="choices-legend">${legend}</legend>
      ${opts.map(o => `<label class="choice">
        <input type="radio" name="${name}" value="${o.v}" data-k="${name}-${o.v}"${val === o.v ? ' checked' : ''}>
        <span class="choice-mark" aria-hidden="true">${ic('check')}</span>
        <span class="choice-body">
          <span class="choice-title">${o.icon ? ic(o.icon, 'choice-ic') : ''}<span${o.lang ? ` lang="${o.lang}"` : ''}>${o.t}</span></span>
          ${o.d ? `<span class="choice-desc">${o.d}</span>` : ''}
        </span></label>`).join('')}
    </fieldset>${err ? fieldErr(name, err) : ''}`;
  }

  function nextBtn(label) {
    const back = cfg.footBack && st.hist.length ? '<button class="btn btn-secondary" data-a="back" data-k="foot-back">Natrag</button>' : '';
    return `<div class="foot-row">${back}<button class="btn btn-primary btn-grow" data-a="next" data-k="next">${label || 'Nastavi'}</button></div>`;
  }

  function progress() {
    const i = ONB.indexOf(st.screen);
    const text = `<p class="progress-text" id="prog-text">Korak ${i + 1} od ${ONB.length}</p>`;
    if (cfg.progress === 'sections') {
      const cur = SECTIONS.findIndex(s => s.steps.includes(st.screen));
      return `<div class="progress progress-sections">
        <ol class="sections" aria-label="Dijelovi postavljanja">${SECTIONS.map((s, j) =>
          `<li class="${j < cur ? 'done' : j === cur ? 'now' : ''}"${j === cur ? ' aria-current="step"' : ''}><span class="sec-bar" aria-hidden="true"></span><span class="sec-label">${s.label}</span></li>`).join('')}</ol>
        ${text}</div>`;
    }
    if (cfg.progress === 'pulse') {
      return `<div class="progress progress-pulse">${text}<div class="pulse-progress" aria-hidden="true">${ONB.map((_, j) =>
        `<i class="${j < i ? 'done' : j === i ? 'now' : ''}" style="--i:${j};--n:${ONB.length}"></i>`).join('')}</div></div>`;
    }
    return `<div class="progress progress-bar">${text}<div class="track" aria-hidden="true"><i style="width:${((i + 1) / ONB.length) * 100}%"></i></div></div>`;
  }

  function dnaStrip() {
    if (!cfg.motif) return '';
    const n = Math.min(picks(), ENVELOPE.length);
    if (!n) return '<div class="dna-strip is-empty" aria-hidden="true"><span class="flat"></span></div>';
    return `<div class="dna-strip" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
      `<i style="--h:${ENVELOPE[i]};--i:${i};--n:${Math.max(n, 2)}"></i>`).join('')}</div>`;
  }
  function dnaCountText() {
    const n = picks();
    if (!n) return 'Još ništa nije odabrano. Ovaj korak možeš i preskočiti.';
    return `Odabrano: ${n}. Oko 5 do 10 je dovoljno, a više je u redu.`;
  }
  function updateDna() {
    const c = root.querySelector('#dna-count'); if (c) c.textContent = dnaCountText();
    const s = root.querySelector('.dna-strip'); if (s) s.outerHTML = dnaStrip();
    const skip = root.querySelector('[data-a="skip"]'); if (skip) skip.hidden = picks() > 0;
  }

  function artistResults() {
    const q = fold(st.artistQ.trim());
    if (q.length < 2) return '<li class="hint">Upiši barem dva slova.</li>';
    const hits = D.artists.map((a, i) => ({ a, i })).filter(x => !st.artists.includes(x.i) && fold(x.a.name).includes(q)).slice(0, 5);
    if (!hits.length) return '<li class="hint">Nema rezultata. Ne nalaziš nekoga? Možeš ga dodati i kasnije.</li>';
    return hits.map(x => `<li><button type="button" class="result" data-a="artist-add" data-i="${x.i}" data-k="art-${x.i}">
      <span class="r-title">${esc(x.a.name)}</span><span class="r-meta">${esc(x.a.meta)}</span><span class="r-add">${ic('plus', 'sm')}<span class="sr-only">Dodaj</span></span></button></li>`).join('');
  }
  function refResults() {
    const q = fold(st.refQ.trim());
    if (q.length < 2) return '<li class="hint">Upiši barem dva slova.</li>';
    const hits = D.refs.map((r, i) => ({ r, i })).filter(x => !st.draftRefs.includes(x.i) && (fold(x.r.title).includes(q) || fold(x.r.by).includes(q))).slice(0, 5);
    if (!hits.length) return '<li class="hint">Nema rezultata u katalogu.</li>';
    return hits.map(x => `<li><button type="button" class="result" data-a="ref-add" data-i="${x.i}" data-k="ref-${x.i}">
      <span class="r-title">${esc(x.r.title)}</span><span class="r-meta">${x.r.type} · ${esc(x.r.by)}</span><span class="r-add">${ic('plus', 'sm')}<span class="sr-only">Dodaj</span></span></button></li>`).join('');
  }

  /* ---------- username check (simulated) ---------- */
  let userTimer;
  function suggest(u) { const b = (u || 'glazba').replace(/[^a-z0-9._]/g, '').slice(0, 12) || 'glazba'; return [`${b}.slusa`, `${b}_26`, `${b}.fm`]; }
  function userStatusHtml() {
    switch (st.userState) {
      case 'checking': return '<p class="status-line">Provjeravam…</p>';
      case 'ok': return `<p class="status-line ok">${ic('check')}<span>@${esc(st.username)} je slobodno.</span></p>`;
      case 'taken': return `${st.err.uname ? '' : `<p class="status-line bad">${ic('alert')}<span>Ovo korisničko ime nije dostupno.</span></p>`}
        <p class="help">Slobodna su, na primjer:</p><div class="chips">${suggest(st.username).map(u =>
          `<button type="button" class="chip" data-a="pickuser" data-u="${u}" data-k="sug-${u}">@${u}</button>`).join('')}</div>`;
      case 'invalid': return st.err.uname ? '' : `<p class="status-line bad">${ic('alert')}<span>Koristi samo mala slova, brojke, točku i donju crtu.</span></p>`;
      default: return '';
    }
  }
  function updateUserStatus() { const el = root.querySelector('#uname-status'); if (el) el.innerHTML = userStatusHtml(); }
  function checkUser(immediate) {
    const u = st.username;
    clearTimeout(userTimer);
    if (!u) st.userState = 'idle';
    else if (!/^[a-z0-9._]+$/.test(u)) st.userState = 'invalid';
    else if (u.length < 3) st.userState = 'short';
    else if (immediate) st.userState = D.takenUsernames.includes(u) ? 'taken' : 'ok';
    else {
      st.userState = 'checking';
      userTimer = setTimeout(() => { st.userState = D.takenUsernames.includes(u) ? 'taken' : 'ok'; updateUserStatus(); }, 450);
    }
    updateUserStatus();
  }

  /* ---------- Daily Drop pieces ---------- */
  const allAnswers = () => (st.mine ? [st.mine] : []).concat(st.answers);
  const findAnswer = id => allAnswers().find(a => a.id === id);
  const refLabel = r => `<span class="ref-type">${r.type}</span><span class="ref-title">${esc(r.title)}</span><span class="ref-by">${esc(r.by)}</span>`;

  function react(a, r) {
    const on = a.myReacts.includes(r.id);
    const n = a.reacts[r.id] + (on ? 1 : 0);
    return `<button class="react" data-a="react" data-id="${a.id}" data-r="${r.id}" data-k="r-${a.id}-${r.id}" aria-pressed="${on}" aria-label="${r.label}, ${n} ${pl(n, 'reakcija', 'reakcije', 'reakcija')}">
      ${on ? ic('check', 'sm') : ''}<span>${r.label}</span>${n ? `<span class="n">${n}</span>` : ''}</button>`;
  }

  function answerItem(a, o) {
    o = o || {};
    const hl = o.hl || 3;
    const isLong = a.text.length > 220 && !o.full;
    const open = st.expanded.has(a.id);
    return `<article class="ans${a.mine ? ' ans-mine' : ''}" aria-labelledby="h-${a.id}">
      ${a.mine && !o.full ? '<p class="ans-label">Tvoj odgovor</p>' : ''}
      <header class="ans-head">
        <span class="avatar" aria-hidden="true">${esc(a.who[0])}</span>
        <h${hl} class="ans-who" id="h-${a.id}" tabindex="-1"><span class="name">${esc(a.who)}</span> <span class="handle">@${esc(a.handle)}</span><span class="sr-only">, </span> <span class="ans-time">${a.time}${a.edited ? ' · uređeno' : ''}</span></h${hl}>
        ${a.mine ? '' : `<button class="iconbtn ans-more" data-a="more" data-id="${a.id}" data-k="more-${a.id}" aria-label="Više opcija: odgovor korisnika ${esc(a.who)}">${ic('more')}</button>`}
      </header>
      <div class="ans-text${isLong && !open ? ' clamp' : ''}" id="t-${a.id}"${a.lang ? ` lang="${a.lang}"` : ''}><p>${esc(a.text)}</p></div>
      ${isLong ? `<button class="link more-link" data-a="expand" data-id="${a.id}" data-k="exp-${a.id}" aria-controls="t-${a.id}" aria-expanded="${open}">${open ? 'Prikaži manje' : 'Pročitaj više'}</button>` : ''}
      ${a.refs.length ? `<ul class="refs">${a.refs.map(i => `<li><button class="ref" data-a="toast" data-msg="Ovdje bi se otvorila stranica izdanja iz kataloga, s vanjskim poveznicama za slušanje (nema reprodukcije u aplikaciji)." data-k="ref-${a.id}-${i}">${refLabel(D.refs[i])}</button></li>`).join('')}</ul>` : ''}
      <div class="ans-actions">
        <div class="reacts" role="group" aria-label="Reakcije">${D.reactions.map(r => react(a, r)).join('')}</div>
        ${o.full ? '' : `<button class="comments-btn" data-a="comments" data-id="${a.id}" data-k="com-${a.id}">${ic('comment', 'sm')}<span>${a.comments ? `Komentari <span class="n">${a.comments}</span>` : 'Komentiraj'}</span></button>`}
      </div>
      ${a.mine && !o.full ? `<div class="ans-own"><button class="btn btn-secondary btn-sm" data-a="edit" data-k="edit">${ic('edit', 'sm')}Uredi</button><button class="btn btn-danger btn-sm" data-a="delete" data-k="delete">${ic('trash', 'sm')}Obriši</button></div>` : ''}
    </article>`;
  }

  function sortCtl() {
    const opts = [['foryou', 'Za tebe'], ['recent', 'Najnovije'], ['discussed', 'Najviše rasprave']];
    if (cfg.sort === 'select') {
      return `<div class="sort sort-select"><label for="sort" class="label-inline">Poredaj</label>
        <select id="sort" class="select" data-k="sort">${opts.map(([v, l]) => `<option value="${v}"${st.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
    }
    return `<fieldset class="sort sort-${cfg.sort}"><legend class="sr-only">Poredaj odgovore</legend>${opts.map(([v, l]) =>
      `<label><input type="radio" name="sort" value="${v}" data-k="sort-${v}"${st.sort === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>`;
  }

  function ordered() {
    const list = st.answers.slice();
    if (st.sort === 'recent') list.sort((x, y) => y.min - x.min);
    else if (st.sort === 'discussed') list.sort((x, y) => y.comments - x.comments || y.min - x.min);
    return list;
  }

  function audience(kind) {
    const id = kind === 'answer' ? 'aud' : 'aud-c';
    if (st.vis === 'private') {
      const msg = kind === 'answer'
        ? '<b>Tvoj profil je privatan</b>, ali odgovore na Daily Drop vide svi članovi.'
        : '<b>Tvoj profil je privatan</b>, ali komentar vide svi koji vide ovaj odgovor.';
      return `<div class="notice" id="${id}">${ic('lock')}<p>${msg}</p></div>`;
    }
    return `<p class="aud" id="${id}">${ic('users', 'sm')}<span>${kind === 'answer' ? 'Vidljivo svim članovima.' : 'Vidljivo svima koji vide ovaj odgovor.'}</span></p>`;
  }

  function refsEditor() {
    const chips = st.draftRefs.map((ri, j) => `<li class="ref-draft"><span class="ref ref-static">${refLabel(D.refs[ri])}</span>
      <button type="button" class="iconbtn sm" data-a="ref-remove" data-i="${j}" data-k="refrm-${j}" aria-label="Ukloni ${esc(D.refs[ri].title)}">${ic('x', 'sm')}</button></li>`).join('');
    let more = '';
    if (st.refOpen) {
      more = `<div class="ref-search"><label class="label-sm" for="f-refq">Traži album, pjesmu ili izvođača</label>
        <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-refq" data-k="f-refq" type="search" autocomplete="off" value="${esc(st.refQ)}"></div>
        <ul class="results" id="ref-results">${refResults()}</ul>
        <button type="button" class="link" data-a="ref-close" data-k="ref-close">Gotovo</button></div>`;
    } else if (st.draftRefs.length < 3) {
      more = `<button type="button" class="add-ref" data-a="ref-open" data-k="ref-open">${ic('plus', 'sm')}<span>Dodaj album, pjesmu ili izvođača</span></button>`;
    }
    return `${chips ? `<ul class="refs refs-draft">${chips}</ul>` : ''}${more}`;
  }

  function composerForm(where) {
    const err = st.err.ans;
    const cancel = st.editing || where !== 'inline';
    return `<form class="composer composer-${where}" data-form="answer" novalidate>
      <label class="composer-label${where === 'page' || where === 'sheet' ? ' sr-only' : ''}" for="f-ans">${st.editing ? 'Uredi svoj odgovor' : 'Tvoj odgovor'}</label>
      <textarea class="textarea" id="f-ans" data-k="f-ans" rows="${where === 'inline' ? 3 : 6}" placeholder="Napiši odgovor…"${err ? ' aria-invalid="true" aria-describedby="err-ans"' : ''}>${esc(st.draft)}</textarea>
      ${err ? fieldErr('ans', err) : ''}
      ${refsEditor()}
      ${audience('answer')}
      <div class="composer-actions">
        ${cancel ? '<button type="button" class="btn btn-secondary" data-a="cancel-compose" data-k="cancel">Odustani</button>' : ''}
        <button type="submit" class="btn btn-primary" data-k="post" aria-describedby="aud">${st.editing ? 'Spremi' : 'Objavi'}</button>
      </div>
    </form>`;
  }

  function dropTeaser() {
    const n = allAnswers().length;
    let actions;
    if (st.mine) actions = '<button class="btn btn-secondary" data-a="open-drop" data-k="open-drop">Otvori odgovore</button>';
    else if (cfg.homeActions === 'one') actions = '<button class="btn btn-primary" data-a="open-drop" data-k="open-drop">Otvori pitanje</button>';
    else actions = '<button class="btn btn-primary" data-a="open-compose" data-k="open-compose">Odgovori</button><button class="btn btn-secondary" data-a="open-drop" data-k="open-drop">Pročitaj odgovore</button>';
    return `<section class="teaser" aria-labelledby="h-teaser">
      <p class="eyebrow eyebrow-drop">Daily Drop · ${D.drop.eyebrowDate}</p>
      <h2 id="h-teaser" class="teaser-q">${esc(D.drop.question)}</h2>
      ${motif()}
      <p class="meta">${n} ${plAns(n)}${st.mine ? ' · uključujući tvoj' : ''}</p>
      <div class="teaser-actions">${actions}</div>
    </section>`;
  }

  function pastList(title) {
    return `<section class="section" aria-labelledby="h-past">
      <h2 id="h-past" class="section-title">${title}</h2>
      <ul class="past">${D.pastDrops.map((d, i) => `<li><button class="past-item" data-a="toast" data-msg="Arhiva (HUB-04) nije dio ove skice." data-k="past-${i}">
        <span class="past-date">${d.date}</span><span class="past-q">${esc(d.q)}</span>${ic('chevron', 'past-ic')}</button></li>`).join('')}</ul>
    </section>`;
  }

  function dock() {
    if (st.mine) {
      return `<div class="dock"><p class="dock-done">${ic('check', 'sm')}<span>Tvoj odgovor je objavljen.</span></p>
        <button class="btn btn-secondary btn-sm" data-a="edit" data-k="dock-edit">Uredi</button></div>`;
    }
    const label = st.draft.trim() ? esc(st.draft.trim().slice(0, 48)) + (st.draft.trim().length > 48 ? '…' : '') : 'Napiši svoj odgovor…';
    return `<div class="dock"><button class="dock-field${st.draft.trim() ? ' has-draft' : ''}" data-a="compose" data-k="dock-field">${ic('edit', 'sm')}<span>${label}</span></button></div>`;
  }

  /* ---------- screens ---------- */
  const PUBLIC_POINTS = ['Svi članovi vide tvoj profil, Music DNA i povijest Daily Drop odgovora. Music DNA možeš suziti u sljedećim koracima.', 'Popise pratitelja vide tvoji pratitelji.', 'Možeš se pojaviti u Otkrivanju i prijedlozima kompatibilnosti.', 'Neprijavljeni posjetitelji vide samo ime, @korisničko ime, avatar i bio.'];
  const PRIVATE_POINTS = ['Profil, Music DNA i povijest odgovora vide samo pratitelji koje odobriš.', 'Tvoje Daily Drop odgovore i dalje vide svi članovi na stranici pitanja.', 'Komentare u javnim raspravama vide svi koji vide raspravu.', 'Ne pojavljuješ se u Otkrivanju i prijedlozima kompatibilnosti.'];
  const ul = pts => `<ul class="points">${pts.map(p => `<li>${p}</li>`).join('')}</ul>`;

  const S = {
    invite: () => ({
      kind: 'bare',
      body: `<div class="hero">
        ${motif()}
        <p class="eyebrow">Pozivnica</p>
        <h1 class="h-hero">Imaš pozivnicu za GrooveRift</h1>
        <p class="tagline" lang="en">Where musical worlds collide.</p>
        <p class="lead">Ovdje se razgovara o glazbi: svaki dan jedno pitanje za sve, tvoj Music DNA i ljudi sličnog ili sasvim drukčijeg ukusa.</p>
      </div>
      <div class="info">${ic('info')}<p>Ovo je zatvorena alfa. Neke stvari još nedostaju i mogu se promijeniti. <button class="link" data-a="toast" data-msg="Ovdje bi se otvorila stranica o alfi (PUB-12)." data-k="alpha-more">Više o alfi</button></p></div>`,
      foot: `<button class="btn btn-primary btn-block" data-a="next" data-k="next">Prihvati pozivnicu</button><p class="fine">Pozivnica vrijedi za ${esc(D.email)}.</p>`
    }),
    age: () => ({
      kind: 'onb', back: true,
      body: `<h1>Je li ti 18 ili više godina?</h1>
        <p class="lead">GrooveRift je samo za odrasle. Ne tražimo datum rođenja.</p>
        ${choices('age', 'Odaberi što vrijedi za tebe.', [{ v: 'adult', t: 'Imam 18 ili više godina' }, { v: 'minor', t: 'Imam manje od 18 godina' }], st.age)}`,
      foot: nextBtn()
    }),
    minor: () => ({
      kind: 'onb', back: true, noProgress: true,
      body: `<h1>GrooveRift je samo za odrasle</h1>
        <p class="lead">Hvala na iskrenom odgovoru. Ništa nismo spremili, a pozivnica je ostala netaknuta.</p>
        <p>Ako je odgovor bio greška, vrati se korak natrag.</p>
        <p><button class="link" data-a="toast" data-msg="Pravila zajednice (PUB-11) nisu dio skice." data-k="rules">Pravila zajednice</button></p>`,
      foot: '<button class="btn btn-secondary btn-block" data-a="back" data-k="minor-back">Natrag</button>'
    }),
    account: () => ({
      kind: 'onb', back: true,
      body: `<h1>Napravi račun</h1>
        ${field({ id: 'email', label: 'E-pošta', help: 'Pozivnica je vezana uz ovu adresu.', type: 'email', value: D.email, attrs: 'readonly autocomplete="email"' })}
        ${field({ id: 'pw', label: 'Lozinka', help: 'Najmanje 15 znakova. Najlakše je nekoliko riječi zaredom.', type: st.showPw ? 'text' : 'password', value: st.pw,
          attrs: 'autocomplete="new-password" autocapitalize="none" spellcheck="false"',
          after: `<button type="button" class="input-btn" data-a="showpw" data-k="showpw" aria-label="${st.showPw ? 'Sakrij lozinku' : 'Prikaži lozinku'}">${st.showPw ? 'Sakrij' : 'Prikaži'}</button>` })}
        <p class="or"><span>ili</span></p>
        <button class="btn btn-secondary btn-block" data-a="google" data-k="google">Nastavi s Google računom</button>
        <p class="fine">Nastavkom prihvaćaš <button class="link" data-a="toast" data-msg="Uvjeti korištenja (PUB-10) nisu dio skice." data-k="terms">Uvjete korištenja</button>. Kako koristimo podatke piše u <button class="link" data-a="toast" data-msg="Pravila privatnosti (PUB-10) nisu dio skice." data-k="privacy">Pravilima privatnosti</button>.</p>`,
      foot: nextBtn('Napravi račun')
    }),
    username: () => ({
      kind: 'onb',
      body: `<h1>Kako da te zovemo?</h1>
        ${field({ id: 'dname', label: 'Ime za prikaz', help: 'Tako te drugi vide. Pravo ime ili nadimak, kako ti odgovara.', value: st.displayName, attrs: 'autocomplete="nickname" maxlength="40"' })}
        ${field({ id: 'uname', label: 'Korisničko ime', help: '3 do 20 znakova: mala slova, brojke, točka i donja crta.', value: st.username, prefix: '@', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"' })}
        <div id="uname-status" class="status" aria-live="polite">${userStatusHtml()}</div>`,
      foot: nextBtn()
    }),
    language: () => ({
      kind: 'onb', back: true,
      body: `<h1>Jezik</h1>
        ${choices('lang', 'Jezik sučelja', [{ v: 'hr', t: 'Hrvatski' }, { v: 'en', t: 'English', lang: 'en' }], st.lang)}
        <div class="group" role="group" aria-labelledby="rl-label" aria-describedby="rl-help">
          <p class="group-label" id="rl-label">Na kojim jezicima rado čitaš odgovore? <span class="opt">Neobavezno</span></p>
          <p class="help" id="rl-help">Takve odgovore češće vidiš u poretku „Za tebe”. Ništa se ne skriva.</p>
          <div class="chips">${READ_LANGS.map(l => `<button class="chip" data-a="readlang" data-l="${l}" data-k="rl-${l}" aria-pressed="${st.readLangs.has(l)}"><span class="ck">${ic('check', 'sm')}</span>${l}</button>`).join('')}</div>
        </div>`,
      foot: nextBtn()
    }),
    visibility: () => ({
      kind: 'onb', back: true,
      body: `<h1>Tko vidi tvoj profil?</h1>
        ${choices('vis', 'Odaberi jedno. Možeš promijeniti bilo kad u postavkama privatnosti.', [
          { v: 'public', icon: 'globe', t: 'Javno', d: ul(PUBLIC_POINTS) },
          { v: 'private', icon: 'lock', t: 'Privatno', d: ul(PRIVATE_POINTS) }], st.vis)}`,
      foot: nextBtn()
    }),
    dna: () => ({
      kind: 'onb', back: true,
      body: `<h1>Što slušaš?</h1>
        <p class="lead">Odaberi nekoliko žanrova i izvođača. Od njih nastaje tvoj Music DNA, a koristimo ga za Otkrivanje i kompatibilnost. Možeš ga mijenjati kad god želiš.</p>
        ${dnaStrip()}
        <p class="dna-count" id="dna-count" aria-live="polite">${dnaCountText()}</p>
        <div class="group" role="group" aria-labelledby="g-label">
          <h2 class="group-title" id="g-label">Žanrovi</h2>
          <div class="chips">${D.genres.map(g => `<button class="chip" data-a="genre" data-g="${g}" data-k="g-${g}" aria-pressed="${st.genres.has(g)}"><span class="ck">${ic('check', 'sm')}</span>${g}</button>`).join('')}</div>
        </div>
        <div class="group">
          <h2 class="group-title">Izvođači</h2>
          ${st.artists.length ? `<ul class="picked" aria-label="Odabrani izvođači">${st.artists.map(i => `<li><span>${esc(D.artists[i].name)}</span><button class="iconbtn sm" data-a="artist-remove" data-i="${i}" data-k="artrm-${i}" aria-label="Ukloni ${esc(D.artists[i].name)}">${ic('x', 'sm')}</button></li>`).join('')}</ul>` : ''}
          <label class="label-sm" for="f-artist">Traži izvođača</label>
          <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-artist" data-k="f-artist" type="search" autocomplete="off" value="${esc(st.artistQ)}" aria-describedby="artist-hint"></div>
          <p class="help" id="artist-hint">Npr. „Arsen”, „Nirvana” ili „Björk”. Podaci iz otvorenog kataloga, bez slika.</p>
          <ul class="results" id="artist-results">${artistResults()}</ul>
        </div>`,
      foot: `<div class="foot-row">${cfg.footBack ? '<button class="btn btn-secondary" data-a="back" data-k="foot-back">Natrag</button>' : ''}<button class="btn btn-primary btn-grow" data-a="next" data-k="next">Nastavi</button></div>
        <button class="btn btn-tertiary btn-block" data-a="skip" data-k="skip"${picks() ? ' hidden' : ''}>Preskoči za sada</button>`
    }),
    dnavis: () => ({
      kind: 'onb', back: true,
      body: `<h1>Tko vidi tvoj Music DNA?</h1>
        ${dnaStrip()}
        ${choices('dnaVis', 'Odaberi jedno. Neprijavljeni posjetitelji ga nikad ne vide.', [
          { v: 'all', icon: 'users', t: 'Svi članovi', d: 'Svi prijavljeni članovi ga vide. Koristi se u objašnjenjima kompatibilnosti i u Otkrivanju.' },
          { v: 'followers', icon: 'user', t: 'Samo pratitelji', d: 'Vide ga samo ljudi koji te prate. Drugima se ne prikazuje.' },
          { v: 'me', icon: 'lock', t: 'Samo ja', d: 'Vidiš ga samo ti. Ne prikazuje se drugima ni u objašnjenjima kompatibilnosti.' }], st.dnaVis)}`,
      foot: nextBtn()
    }),
    how: () => ({
      kind: 'onb', back: true,
      body: `<h1>Kako GrooveRift radi</h1>
        <section class="how" aria-labelledby="how-1"><h2 id="how-1" class="group-title">Daily Drop</h2>
          <p>Svaki dan u ponoć po UTC-u (kod tebe u 01:00) stiže jedno pitanje o glazbi, isto za sve.</p>
          <p>Možeš samo čitati tuđe odgovore. Odgovoriti nije obavezno, a stara pitanja ostaju otvorena u arhivi.</p></section>
        <section class="how" aria-labelledby="how-2"><h2 id="how-2" class="group-title">Kompatibilnost</h2>
          <p>Prema Music DNA pokazujemo s kim dijeliš ukus i s kim možeš otkriti nešto novo.</p>
          <p>Uvijek objasnimo zašto, riječima, bez postotaka.</p></section>`,
      foot: nextBtn()
    }),
    reminder: () => {
      const denied = st.reminder === 'denied';
      return {
        kind: 'onb', back: true,
        body: `<h1>Podsjetnik za Daily Drop?</h1>
          <p class="lead">Jedna obavijest dnevno, u vrijeme koje odabereš, nakon što izađe novo pitanje. Ništa drugo. Isključuješ ga u postavkama.</p>
          ${denied ? `<div class="notice" role="status">${ic('alert')}<p>Preglednik je blokirao obavijesti, pa je podsjetnik isključen. Možeš ga uključiti kasnije u postavkama preglednika i GrooveRifta.</p></div>` : `
          <div class="field"><label class="label" for="f-time">Vrijeme podsjetnika</label>
            <select class="select" id="f-time" data-k="f-time">${['07:00', '08:00', '09:00', '12:00', '17:00', '20:00', '22:00'].map(t => `<option${st.remTime === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <p class="meta">${ic('clock', 'sm')} Vremenska zona: Zagreb. <button class="link" data-a="toast" data-msg="Promjena vremenske zone nije dio skice." data-k="tz">Promijeni</button></p>`}`,
        foot: denied ? nextBtn() : `<div class="foot-row equal">
          <button class="btn btn-secondary" data-a="remind-off" data-k="remind-off">Ne sada</button>
          <button class="btn btn-secondary" data-a="remind-on" data-k="remind-on">${ic('bell', 'sm')}Uključi</button></div>`
      };
    },
    done: () => ({
      kind: 'bare',
      body: `<div class="hero hero-done">
        ${motif()}
        <h1 class="h-hero">Spremno.</h1>
        <p class="lead">Današnje pitanje te čeka. Sve ovo možeš promijeniti u postavkama.</p>
        ${dnaStrip()}
        <dl class="facts">
          <div><dt>Profil</dt><dd>${VIS_LABEL[st.vis] || 'Privatni'}</dd></div>
          <div><dt>Music DNA</dt><dd>${picks() ? `${picks()} ${pl(picks(), 'odabir', 'odabira', 'odabira')}` : 'Prazan, dodaš ga kad želiš'}</dd></div>${picks() ? `<div><dt>Music DNA vide</dt><dd>${DNA_LABEL[st.dnaVis] || 'Samo ja'}</dd></div>` : ''}
          <div><dt>Podsjetnik</dt><dd>${st.reminder === 'on' ? `Svaki dan u ${st.remTime}` : 'Isključen'}</dd></div>
        </dl></div>`,
      foot: '<button class="btn btn-primary btn-block" data-a="finish" data-k="finish">Na početnu</button>'
    }),

    home: () => ({
      kind: 'app', tab: 'home',
      body: `<h1 class="sr-only">Početna</h1>
        ${dropTeaser()}
        <section class="section" aria-labelledby="h-follow">
          <h2 id="h-follow" class="section-title">Od ljudi koje pratiš</h2>
          <div class="empty"><p>Još nikoga ne pratiš. Ljude možeš pronaći kroz odgovore na Daily Drop.</p></div>
        </section>
        ${pastList('Prethodni Daily Dropovi')}`
    }),
    hub: () => ({
      kind: 'app', tab: 'hub', topTitle: 'Hub', topH1: true,
      body: `${dropTeaser()}${pastList('Arhiva')}
        <button class="btn btn-secondary btn-block" data-a="toast" data-msg="Predlaganje pitanja (HUB-09) nije dio ove skice." data-k="suggest">Predloži pitanje</button>`
    }),
    drop: () => {
      scheduleNew();
      const n = allAnswers().length;
      const inlineOpen = cfg.composer === 'inline' && (!st.mine || st.editing);
      return {
        kind: 'app', tab: 'hub', back: true, topTitle: 'Daily Drop',
        topActions: `<button class="iconbtn" data-a="toast" data-msg="Poveznica kopirana (simulacija). Neprijavljeni vide samo pitanje i poziv da se pridruže (D-022)." data-k="share" aria-label="Podijeli pitanje">${ic('share')}</button>`,
        body: `<header class="q-head">
            <p class="eyebrow eyebrow-drop">Daily Drop · ${D.drop.eyebrowDate}</p>
            <h1 class="q-title">${esc(D.drop.question)}</h1>
            ${motif()}
            <p class="meta">${n} ${plAns(n)}</p>
          </header>
          ${cfg.composer === 'page' && !st.mine ? `<button class="btn btn-primary btn-block compose-btn" data-a="compose" data-k="compose">${ic('edit', 'sm')}${st.draft.trim() ? 'Nastavi odgovor' : 'Odgovori'}</button>` : ''}
          ${inlineOpen ? `<div class="composer-card">${composerForm('inline')}</div>` : ''}
          ${st.mine && !inlineOpen ? `<div class="mine-wrap">${answerItem(st.mine)}</div>` : ''}
          <div class="list-head"><h2 class="section-title" id="h-answers">Odgovori</h2>${sortCtl()}</div>
          ${st.pending ? `<button class="new-pill" data-a="show-new" data-k="show-new">${st.pending.length} ${pl(st.pending.length, 'novi odgovor', 'nova odgovora', 'novih odgovora')}</button>` : ''}
          <ul class="ans-list" aria-labelledby="h-answers">${ordered().map(a => `<li>${answerItem(a)}</li>`).join('')}</ul>`,
        dock: cfg.composer === 'dock' ? dock() : ''
      };
    },
    compose: () => ({
      kind: 'task', close: true, topTitle: st.editing ? 'Uredi odgovor' : 'Odgovor',
      body: `<p class="eyebrow eyebrow-drop">Daily Drop · ${D.drop.eyebrowDate}</p>
        <h1 class="compose-q">${esc(D.drop.question)}</h1>
        ${composerForm('page')}`
    }),
    answer: () => {
      const a = findAnswer(st.ctx);
      const cs = st.comments[a.id] || [];
      return {
        kind: 'app', tab: 'hub', back: true, topTitle: 'Komentari',
        body: `<h1 class="sr-only">Komentari na odgovor korisnika ${esc(a.who)}</h1>
          <p class="ctx">Na pitanje: ${esc(D.drop.question)}</p>
          ${answerItem(a, { full: true, hl: 2 })}
          <section class="section" aria-labelledby="h-com">
            <h2 id="h-com" class="section-title">Komentari</h2>
            ${cs.length ? `<ul class="com-list">${cs.map((c, i) => `<li><article class="com" aria-labelledby="hc-${i}">
              <header class="ans-head"><span class="avatar sm" aria-hidden="true">${esc(c.who[0])}</span>
              <h3 class="ans-who" id="hc-${i}" tabindex="-1"><span class="name">${esc(c.who)}</span> <span class="handle">@${esc(c.handle)}</span><span class="sr-only">, </span> <span class="ans-time">${c.time}</span></h3></header>
              <p${c.lang ? ` lang="${c.lang}"` : ''}>${esc(c.text)}</p></article></li>`).join('')}</ul>`
              : '<p class="empty">Još nema komentara. Započni razgovor.</p>'}
          </section>
          <form class="composer composer-comment" data-form="comment" novalidate>
            <label class="composer-label" for="f-com">Tvoj komentar</label>
            <textarea class="textarea" id="f-com" data-k="f-com" rows="2"${st.err.com ? ' aria-invalid="true" aria-describedby="err-com"' : ''}>${esc(st.commentDraft)}</textarea>
            ${st.err.com ? fieldErr('com', st.err.com) : ''}
            ${audience('comment')}
            <div class="composer-actions"><button type="submit" class="btn btn-primary" data-k="com-post" aria-describedby="aud-c">Komentiraj</button></div>
          </form>`
      };
    },
    activity: () => ({
      kind: 'app', tab: 'activity', topTitle: 'Aktivnost', topH1: true,
      body: `<div class="empty"><p>Još ništa novo. Ovdje stižu komentari na tvoje odgovore i zahtjevi za praćenje.</p><p class="meta">Ekran nije dio ove skice.</p></div>`
    }),
    profile: () => ({
      kind: 'app', tab: 'profile', topTitle: 'Profil',
      body: `<div class="prof-head"><span class="avatar lg" aria-hidden="true">${esc((st.displayName || 'T')[0])}</span>
          <div><h1 class="prof-name">${esc(st.displayName || 'Ti')}</h1><p class="meta">@${esc(st.username || 'ti')}</p></div></div>
        <dl class="facts">
          <div><dt>Profil</dt><dd>${VIS_LABEL[st.vis] || 'Privatni (nije odabrano)'}</dd></div>
          <div><dt>Music DNA vide</dt><dd>${DNA_LABEL[st.dnaVis] || 'Samo ja'}</dd></div>
        </dl>
        <section class="section" aria-labelledby="h-pdna"><h2 id="h-pdna" class="section-title">Music DNA</h2>
          ${dnaStrip()}
          ${picks() ? `<ul class="tags">${[...st.genres].map(g => `<li>${esc(g)}</li>`).join('')}${st.artists.map(i => `<li>${esc(D.artists[i].name)}</li>`).join('')}</ul>` : '<p class="empty">Još nema odabira.</p>'}
        </section>
        <section class="section" aria-labelledby="h-pdd"><h2 id="h-pdd" class="section-title">Daily Drop odgovori</h2>
          ${st.mine ? `<ul class="past"><li><button class="past-item" data-a="open-drop" data-k="prof-ans"><span class="past-date">${D.drop.eyebrowDate}</span><span class="past-q">${esc(D.drop.question)}</span>${ic('chevron', 'past-ic')}</button></li></ul>` : '<p class="empty">Još nema odgovora.</p>'}
        </section>
        <p class="meta">Ostatak profila (J4) nije dio ove skice.</p>`
    })
  };

  /* ---------- shell ---------- */
  function topbar(s) {
    let left = '';
    if (s.close) left = `<button class="iconbtn" data-a="cancel-compose" data-k="top-close" aria-label="Zatvori">${ic('x')}</button>`;
    else if (s.back && st.hist.length) left = `<button class="iconbtn" data-a="back" data-k="top-back" aria-label="Natrag">${ic('back')}</button>`;
    const mid = s.topTitle
      ? (s.topH1 ? `<h1 class="top-title">${esc(s.topTitle)}</h1>` : `<span class="top-title">${esc(s.topTitle)}</span>`)
      : '<span class="wordmark">groove<span class="wm-rift">rift</span></span>';
    const onb = s.kind === 'onb' || s.kind === 'bare';
    return `<header class="topbar">${left}${mid}<div class="top-right">${s.topActions || ''}<span class="alpha-tag">Alfa</span>${onb ? '<button class="lang-btn" data-a="lang" data-k="lang" aria-label="HR, promijeni jezik">HR</button>' : ''}</div></header>`;
  }

  function tabbar(active) {
    const T = [['home', 'Početna', 'home'], ['hub', 'Hub', 'hub'], ['activity', 'Aktivnost', 'bell'], ['profile', 'Profil', 'user']];
    return `<nav class="tabbar" aria-label="Glavna navigacija">${T.map(([id, l, i]) =>
      `<button class="tab" data-a="tab" data-t="${id}" data-k="tab-${id}"${active === id ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
  }

  function overlayHtml() {
    const o = st.overlay;
    if (!o) return '';
    if (o.type === 'menu') {
      const a = findAnswer(o.id);
      return `<div class="scrim" data-a="overlay-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div class="sheet-head"><h2 id="ov-title" class="sheet-title">Odgovor: ${esc(a.who)}</h2><button class="iconbtn" data-a="overlay-close" data-k="ov-x" aria-label="Zatvori">${ic('x')}</button></div>
        <ul class="menu">
          <li><button class="menu-item" data-a="menu" data-msg="Poveznica kopirana (simulacija)." data-k="m-share">${ic('share')}Podijeli poveznicu</button></li>
          <li><button class="menu-item" data-a="menu" data-msg="Utišavanje, blokiranje i prijava (J5) nisu dio ove skice." data-k="m-mute">${ic('bell')}Utišaj @${esc(a.handle)}</button></li>
          <li><button class="menu-item" data-a="menu" data-msg="Utišavanje, blokiranje i prijava (J5) nisu dio ove skice." data-k="m-block">${ic('x')}Blokiraj @${esc(a.handle)}</button></li>
          <li><button class="menu-item" data-a="menu" data-msg="Utišavanje, blokiranje i prijava (J5) nisu dio ove skice." data-k="m-report">${ic('alert')}Prijavi odgovor</button></li>
        </ul></div>`;
    }
    if (o.type === 'delete') {
      return `<div class="scrim" data-a="overlay-close"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
        <h2 id="ov-title" class="dialog-title">Obrisati odgovor?</h2>
        <p id="ov-desc">Odgovor nestaje s pitanja i s tvog profila. To se ne može vratiti.</p>
        <div class="dialog-actions"><button class="btn btn-secondary" data-a="overlay-close" data-k="ov-cancel">Odustani</button>
        <button class="btn btn-danger" data-a="delete-confirm" data-k="ov-delete">${ic('trash', 'sm')}Obriši</button></div></div>`;
    }
    if (o.type === 'sheet') {
      return `<div class="scrim" data-a="overlay-close"></div><div class="sheet sheet-compose" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div class="sheet-head"><h2 id="ov-title" class="sheet-title">${st.editing ? 'Uredi odgovor' : 'Tvoj odgovor'}</h2><button class="iconbtn" data-a="cancel-compose" data-k="ov-x" aria-label="Zatvori">${ic('x')}</button></div>
        <p class="sheet-q">${esc(D.drop.question)}</p>
        ${composerForm('sheet')}</div>`;
    }
    if (o.type === 'perm') {
      return `<div class="scrim"></div><div class="dialog perm" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <p class="perm-tag">Simulacija preglednika</p>
        <h2 id="ov-title" class="perm-title">grooverift.com želi slati obavijesti</h2>
        <div class="dialog-actions"><button class="btn btn-secondary" data-a="perm-block" data-k="ov-block">Blokiraj</button><button class="btn btn-secondary" data-a="perm-allow" data-k="ov-allow">Dopusti</button></div></div>`;
    }
    return '';
  }

  function snapshot() {
    const a = document.activeElement;
    if (!a || !root.contains(a)) return { y: window.scrollY };
    return { k: a.dataset.k, s: a.selectionStart, e: a.selectionEnd, y: window.scrollY };
  }
  function restore(f) {
    window.scrollTo(0, f.y);
    if (!f.k) return;
    const el = root.querySelector(`[data-k="${CSS.escape(f.k)}"]`);
    if (!el) return;
    el.focus({ preventScroll: true });
    if (f.s != null && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(f.s, f.e); } catch (e) { /* not a text field */ } }
  }

  function render(opt) {
    opt = opt || {};
    const keep = opt.keep ? snapshot() : null;
    const s = S[st.screen]();
    const standalone = window.top === window;
    let shell = '';
    if (standalone) shell += `<p class="proto-note">Skica 3.5 · ${esc(cfg.name)} · izmišljeni podaci, ništa se ne sprema · wordmark je tekstualna aproksimacija (D-011)</p>`;
    shell += topbar(s);
    if (s.kind === 'onb' && !s.noProgress) shell += progress();
    shell += `<main id="main" class="screen screen-${st.screen} kind-${s.kind}">${s.body}</main>`;
    if (s.foot) shell += `<div class="foot">${s.foot}</div>`;
    if (s.kind === 'app') shell += `<div class="bottom">${s.dock || ''}${tabbar(s.tab)}</div>`;
    root.innerHTML = `<div class="shell"${st.overlay ? ' inert' : ''}>${shell}</div>${overlayHtml()}`;
    root.dataset.screen = st.screen;
    if (s.kind === 'onb' && !s.noProgress) { const h = root.querySelector('main h1'); if (h) h.setAttribute('aria-describedby', 'prog-text'); }
    if (keep) return restore(keep);
    if (st.overlay) {
      for (const sel of ['.sheet [data-k="f-ans"]', '.sheet .menu-item', '.dialog .btn', '.sheet .iconbtn']) {
        const f = root.querySelector(sel);
        if (f) { f.focus(); break; }
      }
    }
  }

  function focusSel(sel) { const el = root.querySelector(sel); if (el) { if (!el.hasAttribute('tabindex') && !/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus(); } }
  function focusH1() { const h = root.querySelector('.shell h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }

  function go(screen, o) {
    o = o || {};
    if (o.reset) st.hist = [];
    else st.hist.push({ screen: st.screen, y: window.scrollY });
    st.screen = screen; st.err = {}; st.overlay = null;
    render(); window.scrollTo(0, 0);
    if (o.focus) focusSel(o.focus); else focusH1();
  }
  function back() {
    const h = st.hist.pop();
    if (!h) return;
    if (st.screen === 'compose') st.editing = false;
    st.screen = h.screen; st.err = {}; st.overlay = null;
    render(); window.scrollTo(0, h.y || 0); focusH1();
  }

  let toastTimer;
  function toast(m) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = '';
    setTimeout(() => { toastEl.innerHTML = `<div class="toast-in">${esc(m)}</div>`; }, 40);
    toastTimer = setTimeout(() => { toastEl.innerHTML = ''; }, 5000);
  }

  function openOverlay(o, opener) { st.overlay = Object.assign({ ret: opener && opener.dataset.k }, o); render(); }
  function closeOverlay() {
    const ret = st.overlay && st.overlay.ret;
    st.overlay = null; render();
    if (ret) { const el = root.querySelector(`[data-k="${CSS.escape(ret)}"]`); if (el) el.focus(); }
  }

  function scheduleNew() {
    if (st.newTimer) return;
    st.newTimer = setTimeout(() => {
      st.pending = D.laterAnswers.map(cloneAnswer);
      if (st.screen === 'drop' && !st.overlay) render({ keep: true });
    }, 20000);
  }

  function focusFirstError() {
    const el = root.querySelector('[aria-invalid="true"], fieldset[aria-describedby^="err-"] input');
    if (el) el.focus();
  }

  function next() {
    const err = {};
    switch (st.screen) {
      case 'invite': return go('age');
      case 'age':
        if (!st.age) { err.age = 'Odaberi jedan odgovor.'; break; }
        return go(st.age === 'adult' ? 'account' : 'minor');
      case 'account':
        if (st.pw.length < 15) { err.pw = st.pw ? `Lozinka ima ${st.pw.length} ${pl(st.pw.length, 'znak', 'znaka', 'znakova')}. Treba ih najmanje 15.` : 'Upiši lozinku.'; break; }
        go('username', { reset: true }); toast('Račun je napravljen.'); return;
      case 'username':
        if (st.userState === 'checking') checkUser(true);
        if (!st.displayName.trim()) err.dname = 'Upiši ime za prikaz.';
        if (!st.username) err.uname = 'Upiši korisničko ime.';
        else if (st.userState === 'invalid') err.uname = 'Koristi samo mala slova, brojke, točku i donju crtu.';
        else if (st.userState === 'short') err.uname = 'Korisničko ime treba imati barem 3 znaka.';
        else if (st.userState === 'taken') err.uname = 'Ovo korisničko ime nije dostupno.';
        if (Object.keys(err).length) break;
        return go('language');
      case 'language': return go('visibility');
      case 'visibility':
        if (!st.vis) { err.vis = 'Odaberi tko vidi tvoj profil.'; break; }
        return go('dna');
      case 'dna': return go(picks() ? 'dnavis' : 'how');
      case 'dnavis':
        if (!st.dnaVis) { err.dnaVis = 'Odaberi tko vidi tvoj Music DNA.'; break; }
        return go('how');
      case 'how': return go('reminder');
      case 'reminder': return go('done', { reset: true });
    }
    st.err = err; render(); focusFirstError();
  }

  function submitAnswer() {
    const t = st.draft.trim();
    if (!t) {
      st.err = { ans: 'Napiši nešto prije objave.' }; render({ keep: true });
      focusSel('[data-k="f-ans"]'); return;
    }
    let msg;
    if (st.editing) {
      Object.assign(st.mine, { text: t, refs: st.draftRefs.slice(), edited: true });
      st.editing = false; msg = 'Izmjene su spremljene.';
    } else {
      st.mine = { id: 'mine', who: st.displayName || 'Ti', handle: st.username || 'ti', time: 'upravo', min: 9999, text: t, refs: st.draftRefs.slice(), reacts: { same: 0, new: 0, good: 0 }, myReacts: [], comments: 0, mine: true };
      msg = 'Odgovor je objavljen.';
    }
    st.draft = ''; st.draftRefs = []; st.refOpen = false; st.refQ = ''; st.err = {}; st.overlay = null;
    if (st.screen === 'compose') {
      const prev = st.hist.pop();
      if (prev && prev.screen !== 'drop') st.hist.push(prev);
      st.screen = 'drop';
    }
    render(); window.scrollTo(0, 0);
    focusSel('#h-mine');
    toast(msg);
  }

  function startEdit(opener) {
    st.editing = true; st.draft = st.mine.text; st.draftRefs = st.mine.refs.slice(); st.err = {};
    if (cfg.composer === 'page') return go('compose', { focus: '[data-k="f-ans"]' });
    if (cfg.composer === 'dock') return openOverlay({ type: 'sheet' }, opener);
    render(); focusSel('[data-k="f-ans"]');
  }
  function openCompose(opener) {
    if (cfg.composer === 'page') return go('compose', { focus: '[data-k="f-ans"]' });
    if (cfg.composer === 'dock') return openOverlay({ type: 'sheet' }, opener);
    focusSel('[data-k="f-ans"]');
  }
  function cancelCompose() {
    if (st.overlay && st.overlay.type === 'sheet') { if (st.editing) { st.editing = false; st.draft = ''; st.draftRefs = []; } st.err = {}; return closeOverlay(); }
    if (st.screen === 'compose') { if (st.editing) { st.editing = false; st.draft = ''; st.draftRefs = []; } return back(); }
    st.editing = false; st.draft = ''; st.draftRefs = []; st.err = {}; render(); focusSel('#h-mine');
  }

  /* ---------- events ---------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || !root.contains(b)) return;
    const a = b.dataset.a;
    switch (a) {
      case 'next': return next();
      case 'back': return back();
      case 'skip': st.genres.clear(); st.artists = []; return go('how');
      case 'lang': return toast('U skici je samo hrvatski tekst. U aplikaciji se jezik mijenja ovdje na svakom koraku.');
      case 'toast': return toast(b.dataset.msg);
      case 'showpw': st.showPw = !st.showPw; return render({ keep: true });
      case 'google': toast('Simulacija: Google račun s istom adresom kao pozivnica. Račun je napravljen.'); return go('username', { reset: true });
      case 'pickuser': st.username = b.dataset.u; st.userState = 'ok'; delete st.err.uname; render(); return focusSel('#f-uname');
      case 'readlang': { const l = b.dataset.l; st.readLangs.has(l) ? st.readLangs.delete(l) : st.readLangs.add(l); return b.setAttribute('aria-pressed', st.readLangs.has(l)); }
      case 'genre': { const g = b.dataset.g; st.genres.has(g) ? st.genres.delete(g) : st.genres.add(g); b.setAttribute('aria-pressed', st.genres.has(g)); return updateDna(); }
      case 'artist-add': { const i = +b.dataset.i; st.artists.push(i); render(); focusSel('#f-artist'); return; }
      case 'artist-remove': { const i = +b.dataset.i; st.artists = st.artists.filter(x => x !== i); render(); focusSel('#f-artist'); return; }
      case 'remind-off': st.reminder = 'off'; return go('done', { reset: true });
      case 'remind-on': return openOverlay({ type: 'perm' }, b);
      case 'perm-allow': st.reminder = 'on'; st.overlay = null; return go('done', { reset: true });
      case 'perm-block': st.reminder = 'denied'; st.overlay = null; render(); return focusSel('.notice');
      case 'finish': return go('home', { reset: true });
      case 'tab': return go(b.dataset.t, { reset: true });
      case 'open-drop': return go('drop');
      case 'open-compose':
        if (cfg.composer === 'page') { go('drop'); return go('compose', { focus: '[data-k="f-ans"]' }); }
        go('drop'); return openCompose(root.querySelector('[data-k="dock-field"]'));
      case 'compose': return openCompose(b);
      case 'cancel-compose': return cancelCompose();
      case 'ref-open': st.refOpen = true; render({ keep: true }); return focusSel('#f-refq');
      case 'ref-close': st.refOpen = false; st.refQ = ''; render({ keep: true }); return focusSel('[data-k="ref-open"], [data-k="f-ans"]');
      case 'ref-add': st.draftRefs.push(+b.dataset.i); if (st.draftRefs.length >= 3) { st.refOpen = false; st.refQ = ''; } render({ keep: true }); return focusSel(st.refOpen ? '#f-refq' : '[data-k="f-ans"]');
      case 'ref-remove': st.draftRefs.splice(+b.dataset.i, 1); render({ keep: true }); return focusSel('[data-k="ref-open"], #f-refq, [data-k="f-ans"]');
      case 'react': { const x = findAnswer(b.dataset.id); const r = b.dataset.r; const i = x.myReacts.indexOf(r); i >= 0 ? x.myReacts.splice(i, 1) : x.myReacts.push(r); return render({ keep: true }); }
      case 'expand': { const id = b.dataset.id; st.expanded.has(id) ? st.expanded.delete(id) : st.expanded.add(id); return render({ keep: true }); }
      case 'comments': st.ctx = b.dataset.id; st.commentDraft = ''; return go('answer');
      case 'more': return openOverlay({ type: 'menu', id: b.dataset.id }, b);
      case 'menu': { const m = b.dataset.msg; closeOverlay(); return toast(m); }
      case 'overlay-close': return closeOverlay();
      case 'edit': return startEdit(b);
      case 'delete': return openOverlay({ type: 'delete' }, b);
      case 'delete-confirm':
        st.mine = null; st.overlay = null; render();
        focusSel(cfg.composer === 'page' ? '[data-k="compose"]' : cfg.composer === 'dock' ? '[data-k="dock-field"]' : '[data-k="f-ans"]');
        return toast('Odgovor je obrisan.');
      case 'show-new': {
        const first = st.pending[0].id;
        st.answers = st.pending.concat(st.answers); st.pending = null;
        render({ keep: true }); return focusSel(`#h-${first}`);
      }
    }
  });

  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.dataset.form;
    if (f === 'answer') return submitAnswer();
    if (f === 'comment') {
      const t = st.commentDraft.trim();
      if (!t) { st.err = { com: 'Napiši komentar prije objave.' }; render({ keep: true }); return focusSel('#f-com'); }
      const list = st.comments[st.ctx] || (st.comments[st.ctx] = []);
      list.push({ who: st.displayName || 'Ti', handle: st.username || 'ti', time: 'upravo', text: t });
      findAnswer(st.ctx).comments += 1;
      st.commentDraft = ''; st.err = {};
      render(); focusSel(`#hc-${list.length - 1}`); toast('Komentar je objavljen.');
    }
  });

  function clearErr(k, input) {
    if (!st.err[k]) return;
    delete st.err[k];
    const el = root.querySelector('#err-' + k); if (el) el.remove();
    if (input) {
      input.removeAttribute('aria-invalid');
      const d = (input.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== 'err-' + k).join(' ');
      d ? input.setAttribute('aria-describedby', d) : input.removeAttribute('aria-describedby');
    }
  }

  root.addEventListener('input', e => {
    const t = e.target;
    switch (t.id) {
      case 'f-pw': st.pw = t.value; return clearErr('pw', t);
      case 'f-dname': st.displayName = t.value; return clearErr('dname', t);
      case 'f-uname': st.username = t.value.trim(); clearErr('uname', t); return checkUser();
      case 'f-artist': { st.artistQ = t.value; const r = root.querySelector('#artist-results'); if (r) r.innerHTML = artistResults(); return; }
      case 'f-refq': { st.refQ = t.value; const r = root.querySelector('#ref-results'); if (r) r.innerHTML = refResults(); return; }
      case 'f-ans': st.draft = t.value; return clearErr('ans', t);
      case 'f-com': st.commentDraft = t.value; return clearErr('com', t);
    }
  });

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'radio') {
      const n = t.name;
      if (n === 'sort') { st.sort = t.value; return render({ keep: true }); }
      if (n === 'age') st.age = t.value;
      else if (n === 'vis') st.vis = t.value;
      else if (n === 'dnaVis') st.dnaVis = t.value;
      else if (n === 'lang') { st.lang = t.value; if (t.value === 'en') toast('U skici je samo hrvatski tekst. U aplikaciji bi se sučelje odmah prebacilo na engleski.'); }
      if (st.err[n]) { delete st.err[n]; const er = root.querySelector('#err-' + n); if (er) er.remove(); const fs = t.closest('fieldset'); if (fs) fs.removeAttribute('aria-describedby'); }
    } else if (t.id === 'sort') { st.sort = t.value; render({ keep: true }); }
    else if (t.id === 'f-time') st.remTime = t.value;
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !st.overlay || st.overlay.type === 'perm') return;
    if (st.overlay.type === 'sheet') cancelCompose(); else closeOverlay();
  });

  /* ?at=<screen> opens a given screen with earlier steps filled in, so the comparison page
     can show the same step in all three directions. */
  const ORDER = ['invite', 'age', 'account', 'username', 'language', 'visibility', 'dna', 'dnavis', 'how', 'reminder', 'done'];
  const AT = P.get('at');
  if (AT && !START_DROP && ORDER.includes(AT)) {
    const k = ORDER.indexOf(AT);
    const before = s => ORDER.indexOf(s) < k;
    if (before('age')) st.age = 'adult';
    if (before('account')) st.pw = 'primjer lozinke za skicu';
    if (before('username')) { st.displayName = 'Ana'; st.username = 'ana.slusa'; st.userState = 'ok'; }
    if (before('visibility')) st.vis = PRIV ? 'private' : 'public';
    if (before('dna')) { st.genres = new Set(['Jazz', 'Soul', 'Kantautorska']); st.artists = [11, 0, 15]; }
    if (before('dnavis')) st.dnaVis = 'all';
    if (before('reminder')) st.reminder = 'off';
    st.screen = AT;
    const from = k < 3 ? 0 : 3;
    st.hist = AT === 'username' || AT === 'done' ? [] : ORDER.slice(from, k).map(s => ({ screen: s, y: 0 }));
  } else if (AT && START_DROP && ['hub', 'drop', 'answer', 'activity', 'profile'].includes(AT)) {
    st.screen = AT;
    if (AT === 'drop') st.hist = [{ screen: 'home', y: 0 }];
    if (AT === 'answer') { st.ctx = 'a1'; st.hist = [{ screen: 'home', y: 0 }, { screen: 'drop', y: 0 }]; }
    if (AT === 'drop' && P.get('open') === 'compose') {
      if (cfg.composer === 'page') { st.hist.push({ screen: 'drop', y: 0 }); st.screen = 'compose'; }
      else if (cfg.composer === 'dock') st.overlay = { type: 'sheet', ret: 'dock-field' };
    }
  }

  render();
})();
