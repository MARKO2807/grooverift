/* GrooveRift refined prototype (step 3.5, direction C "Pulse", D-042/D-043): engine.
   One state machine for onboarding (J1) and the Daily Drop (J3), refined after the owner's review
   of 2026-11-01 (session 9). Static prototype: nothing is stored, all data is fictional (data.js).
   URL parameters:
     ?flow=drop                 start signed in on Home          &private=1   simulate a private profile
     ?at=<step>                 open an onboarding step with earlier steps filled in
     ?flow=drop&at=drop|answer|hub|profile|activity   &open=compose (with at=drop) opens the composer
     ?calm=1                    start with "Smanji pokrete" on (the setting is also on the Profile screen)
     ?live=1                    real artist search (catalog.js)   ?catalog=fail  simulate a catalog outage
   Owner decisions in session 9: date style A and the name "Daily Drop" (D-047), Music DNA "Spirala" (D-048),
   motifs stay alive with a "Smanji pokrete" setting (D-049). */
(function () {
  'use strict';
  const D = window.GR_DATA;
  const ic = window.GR_ICON;
  const pic = window.GR_PICON;
  const CUR = window.GR_CURRENT;
  const DNA = window.GR_DNA;
  const INV = window.GR_INVITE;
  const CAT = window.GR_CATALOG;
  const root = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const P = new URLSearchParams(location.search);
  const START_DROP = P.get('flow') === 'drop';
  const PRIV = P.get('private') === '1';
  const MOT = window.GR_MOTION;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pl(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  const plAns = n => pl(n, 'odgovor', 'odgovora', 'odgovora');

  /* Croatian dates, fixed tables so the output never depends on the browser's locale data. */
  const WD = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
  const WD3 = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub'];
  const MG = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
  const MN = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function dparts(iso) {
    const d = new Date(iso + 'T12:00:00Z');
    return { iso, day: d.getUTCDate(), month: d.getUTCMonth() + 1, wd: WD[d.getUTCDay()], wd3: WD3[d.getUTCDay()], mg: MG[d.getUTCMonth()], mn: MN[d.getUTCMonth()] };
  }
  const longDate = iso => { const d = dparts(iso); return `${cap(d.wd)}, ${d.day}. ${d.mg}`; };

  const ONB = ['age', 'uilang', 'account', 'username', 'language', 'visibility', 'dna', 'dnavis', 'how', 'reminder'];
  const VIS_LABEL = { public: 'Javni', private: 'Privatni' };
  const DNA_LABEL = { all: 'Svi članovi', followers: 'Samo pratitelji', me: 'Samo ja' };
  const READ_LANGS = ['English', 'Hrvatski']; // only these two for now (owner, session 11)
  const OFF_ARTISTS = D.artists.map((a, i) => ({ id: 'fx' + i, name: a.name, meta: a.meta, g: a.g }));
  const fx = name => OFF_ARTISTS.find(a => a.name === name);

  const cloneAnswer = a => ({ ...a, reacts: { like: Object.values(a.reacts).reduce((s, n) => s + n, 0) }, refs: [...a.refs], myReacts: [] });
  const st = {
    screen: START_DROP ? 'home' : 'invite',
    hist: [],
    err: {},
    age: null, pw: '', showPw: false,
    displayName: START_DROP ? 'Ana' : '', username: START_DROP ? 'ana.slusa' : '', userState: START_DROP ? 'ok' : 'idle',
    lang: 'hr', readLangs: new Set(['English', 'Hrvatski']),
    vis: START_DROP ? (PRIV ? 'private' : 'public') : null,
    genres: START_DROP ? ['Jazz', 'Soul', 'Kantautorska', 'Elektronika'] : [],
    moreOpen: false, genreQ: '',
    artists: START_DROP ? [fx('Nina Simone'), fx('Arsen Dedić'), fx('Massive Attack')] : [],
    artistQ: '', artistRes: { state: 'idle', items: [] },
    dnaVis: START_DROP ? 'all' : null,
    reminder: START_DROP ? 'off' : null, remTime: '09:00',
    answers: D.answers.map(cloneAnswer),
    comments: JSON.parse(JSON.stringify(D.comments)),
    sort: 'foryou', mine: null, draft: '', draftRefs: [], refQ: '', refOpen: false, editing: false,
    expanded: new Set(), pending: null, newTimer: null,
    ctx: null, commentDraft: '',
    overlay: null
  };
  DNA.setSource(() => ({ genres: st.genres.slice(), artists: st.artists.map(a => ({ name: a.name, g: a.g || [] })) }));

  /* ---------- small builders ---------- */
  const current = (key, size, cls) => `<canvas class="current${cls ? ' ' + cls : ''}" data-cur="${key}" data-size="${size || 'md'}" aria-hidden="true"></canvas>`;
  const dnaCanvas = (key, h, cls) => `<canvas class="dna${cls ? ' ' + cls : ''}" data-dna="${key}" data-h="${h}" aria-hidden="true"></canvas>`;
  /* The brand name in running text is set like the wordmark: lowercase, Sora, "rift" in Coral (owner, session 9). */
  const wm = lg => `<span class="wm${lg ? ' wm-lg' : ''}">groove<span class="wm-rift">rift</span></span>`; // lg: a larger brand name in a sentence (owner, session 11), never with the bolt
  /* Wordmark accent (D-055, redone by D-058): a hairline bolt that hangs from the baseline of "rift", with a
     white-hot core and a soft glow. Every 4.5 s it flickers and three small sparks jump off its tips (N2). Only on
     the standalone wordmark in the top bar, never on the brand name inside sentences. Motion stops with
     "Smanji pokrete" or the OS setting (style.css). */
  const BOLT_PTS = '0,3.2 22,3 27,1.6 31,3.4 36,0 41,9.5 46,1.2 50,6.5 54,3 72,3 76,1.8 79,3.6 82,3 100,3';
  const BOLT_SPARKS = ['36,0 38.5,-2.4 40,-2', '41,9.5 39,13 40.5,14.5', '50,6.5 53,10 55,9.6 57,12.5'];
  const bolt = () => `<svg class="wm-bolt" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="wm-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#FF586B"/><stop offset="1" stop-color="#FFCB69"/></linearGradient></defs><g class="bolt"><polyline class="bolt-line" points="${BOLT_PTS}" stroke="url(#wm-g)"/><polyline class="bolt-core" points="${BOLT_PTS}"/>${BOLT_SPARKS.map(p => `<polyline class="spark" points="${p}"/>`).join('')}</g></svg>`;
  const fieldErr = (id, msg) => `<p class="field-err" id="err-${id}">${ic('alert')}<span>${msg}</span></p>`;

  /* Password rules (D-061, amends D-054 at the owner's request): 12 code points minimum plus an upper-case letter, a
     lower-case letter and a special character, each ticked while typing. Breached passwords are still rejected with
     the reason. PW_BREACHED is a SIMULATED stand-in for the HIBP range check (server-side in the app); it holds
     passwords that pass the composition rules, because those are the predictable ones attackers try first. */
  const PW_MIN = 12;
  const PW_BREACHED = new Set(['Lozinka2024!', 'Password123!', 'Zagreb2024!!', 'Qwerty12345!']);
  const pwLen = s => Array.from(s).length;
  const PW_RULES = [
    ['len', s => pwLen(s) >= PW_MIN, `Najmanje ${PW_MIN} znakova`, `najmanje ${PW_MIN} znakova`],
    ['up', s => /\p{Lu}/u.test(s), 'Veliko slovo', 'veliko slovo'],
    ['low', s => /\p{Ll}/u.test(s), 'Malo slovo', 'malo slovo'],
    ['sym', s => /[^\p{L}\p{N}\s]/u.test(s), 'Poseban znak, npr. ! ? # %', 'poseban znak']
  ];
  const pwMissing = s => PW_RULES.filter(r => !r[1](s));
  function pwMeter() {
    const n = pwLen(st.pw), miss = pwMissing(st.pw);
    return `<ul class="pw-rules" aria-label="Pravila za lozinku">${PW_RULES.map(([k, f, t]) => { const ok = f(st.pw); return `<li class="${ok ? 'ok' : ''}" data-r="${k}"><span class="pw-tick" aria-hidden="true">${ok ? ic('check', 'sm') : ''}</span><span>${t}${k === 'len' && n && !ok ? ` (${n})` : ''}</span><span class="sr-only">${ok ? ', ispunjeno' : ', nije ispunjeno'}</span></li>`; }).join('')}</ul>
      <p class="sr-only" role="status">${st.pw && !miss.length ? 'Lozinka ispunjava sva pravila.' : ''}</p>`;
  }

  function avatar(handle, who, size) {
    const m = D.members[handle];
    const dna = handle === st.username ? st.genres : (m ? m.dna : []);
    return `<span class="avatar${size ? ' ' + size : ''}" style="--ring:${DNA.ring(dna)}" aria-hidden="true"><span>${esc((who || '?')[0])}</span></span>`;
  }

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

  function choices(name, legend, opts, val, cls) {
    const err = st.err[name];
    return `<fieldset class="choices${cls ? ' ' + cls : ''}"${err ? ` aria-describedby="err-${name}"` : ''}>
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

  const nextBtn = label => `<div class="foot-row"><button class="btn btn-primary btn-grow" data-a="next" data-k="next">${label || 'Nastavi'}</button></div>`;

  function progress() {
    const i = ONB.indexOf(st.screen);
    return `<div class="progress">
      <p class="progress-text" id="prog-text">Korak ${i + 1} od ${ONB.length}</p>
      <div class="pulse-progress" aria-hidden="true">${ONB.map((_, j) => `<i class="${j < i ? 'done' : j === i ? 'now' : ''}" style="--i:${j};--n:${ONB.length}"></i>`).join('')}</div></div>`;
  }

  /* ---------- Music DNA pieces ---------- */
  function dnaCountText() {
    const g = st.genres.length, a = st.artists.length;
    const gs = `${g} od ${D.genreMax} ${pl(D.genreMax, 'žanra', 'žanra', 'žanrova')}`;
    const as = a ? `, ${a} ${pl(a, 'izvođač', 'izvođača', 'izvođača')}` : '';
    if (!g) return `Odaberi barem ${D.genreMin} žanra.`;
    if (g < D.genreMin) return `${gs}${as}. Još ${D.genreMin - g} za početak.`;
    return `${gs}${as}.`;
  }
  /* No visible tag list under Music DNA (owner, session 9). Screen readers get the list; sighted members tap the helix. */
  const dnaText = () => st.genres.length ? `<p class="sr-only">Žanrovi: ${st.genres.map(esc).join(', ')}.${st.artists.length ? ` Izvođači: ${st.artists.map(a => esc(a.name)).join(', ')}.` : ''}</p>` : '';
  function genreChip(name) {
    const on = st.genres.includes(name);
    const full = !on && st.genres.length >= D.genreMax;
    return `<button type="button" class="chip chip-genre" data-a="genre" data-g="${esc(name)}" data-k="g-${esc(name)}" aria-pressed="${on}"${full ? ' aria-disabled="true"' : ''} style="--dot:${DNA.colorOf(name)}"><span class="gdot" aria-hidden="true"></span>${esc(name)}</button>`;
  }
  /* Main 20 genres (D-053), then any picked genre from search, then the "+ Još žanrova" chip. */
  function genreChips() {
    const extra = st.genres.filter(g => !D.mainGenres.includes(g));
    return D.mainGenres.concat(extra).map(genreChip).join('')
      + (st.moreOpen ? '' : `<button type="button" class="chip chip-more" data-a="more-genres" data-k="more-genres">${ic('plus', 'sm')}Još žanrova</button>`);
  }
  function moreGenres() {
    if (!st.moreOpen) return '';
    const q = CAT.fold(st.genreQ.trim());
    const pool = D.genres.map(g => g.n).filter(n => !D.mainGenres.includes(n)).concat(D.moreGenres.map(x => x[0]));
    const hits = pool.filter(n => !st.genres.includes(n) && (!q || CAT.fold(n).includes(q))).slice(0, q ? 12 : 10);
    return `<div class="more-genres"><label class="label-sm" for="f-genre">Traži žanr</label>
        <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-genre" data-k="f-genre" type="search" autocomplete="off" value="${esc(st.genreQ)}"></div>
        <div class="chips" id="genre-results">${hits.length ? hits.map(genreChip).join('') : '<p class="hint">Nema tog žanra na popisu. U aplikaciji bi ga mogao predložiti.</p>'}</div></div>`;
  }
  function artistTile(a, cls) {
    if (a.img) return `<span class="art${cls ? ' ' + cls : ''}"><img src="${esc(a.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
    const t = CAT.tile(a.name);
    return `<span class="art art-gen${cls ? ' ' + cls : ''}" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span>`;
  }
  function artistResults() {
    const r = st.artistRes;
    const sel = new Set(st.artists.map(a => a.id));
    if (r.state === 'idle') return `<li class="hint">Upiši barem dva slova.</li>`;
    if (r.state === 'loading') return [0, 1, 2].map(() => '<li class="result-skel" aria-hidden="true"><span></span><span></span></li>').join('') + '<li class="sr-only">Tražim u katalogu…</li>';
    if (r.state === 'error') return `<li class="cat-err">${ic('alert')}<div><p><b>Katalog trenutačno ne odgovara.</b> Tvoji odabiri su sačuvani.</p>
      <button type="button" class="btn btn-secondary btn-sm" data-a="artist-retry" data-k="artist-retry">Pokušaj ponovno</button></div></li>`;
    if (r.state === 'empty') return `<li class="hint">Nema rezultata za „${esc(st.artistQ.trim())}”. Provjeri pisanje ili dodaj izvođača kasnije.</li>`;
    return r.items.map(a => {
      const on = sel.has(a.id);
      return `<li><button type="button" class="result" data-a="artist-add" data-id="${esc(a.id)}" data-k="art-${esc(a.id)}"${on ? ' aria-disabled="true"' : ''}>
        ${artistTile(a)}
        <span class="r-body"><span class="r-title">${esc(a.name)}</span>${artistMeta(a, r.items) ? `<span class="r-meta">${esc(artistMeta(a, r.items))}</span>` : ''}${a.credit ? `<span class="r-credit">${esc(a.credit)}</span>` : ''}</span>
        <span class="r-add">${on ? `${ic('check', 'sm')}<span class="sr-only">Dodano</span>` : `${ic('plus', 'sm')}<span class="sr-only">Dodaj</span>`}</span></button></li>`;
    }).join('');
  }
  function pickedArtists() {
    if (!st.artists.length) return '';
    return `<ul class="portraits" aria-label="Odabrani izvođači">${st.artists.map(a => `<li>
      ${artistTile(a, 'lg')}<span class="p-name">${esc(a.name)}</span>
      <button type="button" class="p-x" data-a="artist-remove" data-id="${esc(a.id)}" data-k="artrm-${esc(a.id)}" aria-label="Ukloni ${esc(a.name)}">${ic('x', 'sm')}</button></li>`).join('')}</ul>`;
  }
  let cancelSearch = () => {};
  function runArtistSearch() {
    cancelSearch();
    cancelSearch = CAT.search(st.artistQ, res => {
      st.artistRes = res;
      const el = root.querySelector('#artist-results');
      if (el) { el.innerHTML = artistResults(); el.setAttribute('aria-busy', res.state === 'loading'); }
      const live = root.querySelector('#artist-live');
      if (live) live.textContent = res.state === 'ok' ? `${res.items.length} ${pl(res.items.length, 'rezultat', 'rezultata', 'rezultata')}` : res.state === 'empty' ? 'Nema rezultata' : res.state === 'error' ? 'Katalog ne odgovara' : '';
    });
  }
  function updateDnaStep() {
    const c = root.querySelector('#dna-count'); if (c) c.textContent = dnaCountText();
    root.querySelectorAll('.chips [data-a="genre"]').forEach(b => {
      const on = st.genres.includes(b.dataset.g);
      b.setAttribute('aria-pressed', on);
      if (!on && st.genres.length >= D.genreMax) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    const pk = root.querySelector('#picked'); if (pk) pk.innerHTML = pickedArtists();
    const rs = root.querySelector('#artist-results'); if (rs) rs.innerHTML = artistResults();
    DNA.refresh();
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

  /* Name on top, date under it (style A, D-047), then the live current. */
  function ddHead(where, noCur) {
    return `<div class="dd-top"><p class="dd-name">Daily Drop</p>
      <p class="dd-date"><time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>${noCur ? '' : current('dd-' + where, 'md', 'dd-current')}</div>`;
  }
  function people(n) {
    const hs = allAnswers().slice(0, 3);
    return `<p class="dd-meta"><span class="stack" aria-hidden="true">${hs.map(a => avatar(a.handle, a.who, 'xs')).join('')}</span><span>${n} ${plAns(n)}${st.mine ? ', uključujući tvoj' : ''}</span></p>`;
  }

  /* D-056: one reaction, icon only (audio wave), count visible to all. Own answers show the count without a button. */
  const WAVE = '<svg class="wave-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polyline class="wave" points="2,12 7,12 9.5,5 12,19 14.5,8 16,12 22,12"/></svg>';
  function react(a, r) {
    const on = a.myReacts.includes(r.id);
    const n = a.reacts[r.id] + (on ? 1 : 0);
    const name = `${r.label}, ${n} ${pl(n, 'reakcija', 'reakcije', 'reakcija')}`;
    if (a.mine) return `<span class="react react-like is-own" role="img" aria-label="${name}">${WAVE}<span class="n">${n}</span></span>`;
    return `<button class="react react-like" data-a="react" data-id="${a.id}" data-r="${r.id}" data-k="r-${a.id}-${r.id}" aria-pressed="${on}" aria-label="${name}${on ? ', ti' : ''}" title="${r.label}">${WAVE}<span class="n">${n}</span></button>`;
  }
  function refCard(r, aid, i) {
    const t = CAT.tile(r.title);
    return `<li><button class="ref" data-a="toast" data-msg="Ovdje bi se otvorila stranica izdanja iz kataloga, s vanjskim poveznicama za slušanje (nema reprodukcije u aplikaciji)." data-k="ref-${aid}-${i}">
      <span class="ref-art" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span>
      <span class="ref-body"><span class="ref-title">${esc(r.title)}</span><span class="ref-by">${r.type}, ${esc(r.by)}</span></span>${ic('chevron', 'sm ref-go')}</button></li>`;
  }
  function commentsBtn(a) {
    const cs = st.comments[a.id] || [];
    if (!a.comments) return `<button class="comments-btn" data-a="comments" data-id="${a.id}" data-k="com-${a.id}">${ic('comment', 'sm')}<span>Komentiraj</span></button>`;
    const who = [...new Map(cs.map(c => [c.handle, c])).values()].slice(0, 3);
    return `<button class="comments-btn" data-a="comments" data-id="${a.id}" data-k="com-${a.id}">${who.length ? `<span class="stack" aria-hidden="true">${who.map(c => avatar(c.handle, c.who, 'xxs')).join('')}</span>` : ic('comment', 'sm')}<span>${a.comments} ${pl(a.comments, 'komentar', 'komentara', 'komentara')}</span></button>`;
  }

  function answerItem(a, o) {
    o = o || {};
    const hl = o.hl || 3;
    const isLong = a.text.length > 220 && !o.full;
    const open = st.expanded.has(a.id);
    return `<article class="ans${a.mine ? ' ans-mine' : ''}${a.refs.length ? ' has-ref' : ''}" aria-labelledby="h-${a.id}">
      ${a.mine && !o.full ? '<p class="ans-label">Tvoj odgovor</p>' : ''}
      <header class="ans-head">
        ${avatar(a.handle, a.who)}
        <h${hl} class="ans-who" id="h-${a.id}" tabindex="-1"><span class="name">${esc(a.who)}</span><span class="sr-only">, </span><span class="handle">@${esc(a.handle)}</span></h${hl}>
        <span class="ans-time"><time>${a.time}</time>${a.edited ? '<span class="edited">uređeno</span>' : ''}</span>
        ${a.mine ? '' : `<button class="iconbtn ans-more" data-a="more" data-id="${a.id}" data-k="more-${a.id}" aria-label="Više opcija: odgovor korisnika ${esc(a.who)}">${ic('more')}</button>`}
      </header>
      <div class="ans-text${isLong && !open ? ' clamp' : ''}" id="t-${a.id}"${a.lang ? ` lang="${a.lang}"` : ''}><p>${esc(a.text)}</p></div>
      ${isLong ? `<button class="link more-link" data-a="expand" data-id="${a.id}" data-k="exp-${a.id}" aria-controls="t-${a.id}" aria-expanded="${open}">${open ? 'Prikaži manje' : 'Pročitaj više'}</button>` : ''}
      ${a.refs.length ? `<ul class="refs">${a.refs.map((r, i) => refCard(D.refs[r], a.id, i)).join('')}</ul>` : ''}
      <div class="ans-actions">
        <div class="reacts" role="group" aria-label="Reakcije">${D.reactions.map(r => react(a, r)).join('')}</div>
        ${o.full ? '' : commentsBtn(a)}
      </div>
      ${a.mine && !o.full ? `<div class="ans-own"><button class="btn btn-secondary btn-sm" data-a="edit" data-k="edit">${ic('edit', 'sm')}Uredi</button><button class="btn btn-danger btn-sm" data-a="delete" data-k="delete">${ic('trash', 'sm')}Obriši</button></div>` : ''}
    </article>`;
  }

  function sortCtl() {
    const opts = [['foryou', 'Za tebe'], ['recent', 'Najnovije'], ['discussed', 'Najviše rasprave']];
    return `<fieldset class="sort"><legend class="sr-only">Poredaj odgovore</legend>${opts.map(([v, l]) =>
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

  function refResults() {
    const q = CAT.fold(st.refQ.trim());
    if (q.length < 2) return '<li class="hint">Upiši barem dva slova.</li>';
    const hits = D.refs.map((r, i) => ({ r, i })).filter(x => !st.draftRefs.includes(x.i) && (CAT.fold(x.r.title).includes(q) || CAT.fold(x.r.by).includes(q))).slice(0, 5);
    if (!hits.length) return '<li class="hint">Nema rezultata u katalogu.</li>';
    return hits.map(x => { const t = CAT.tile(x.r.title); return `<li><button type="button" class="result" data-a="ref-add" data-i="${x.i}" data-k="ref-${x.i}">
      <span class="art art-gen" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span>
      <span class="r-body"><span class="r-title">${esc(x.r.title)}</span><span class="r-meta">${x.r.type}, ${esc(x.r.by)}</span></span><span class="r-add">${ic('plus', 'sm')}<span class="sr-only">Dodaj</span></span></button></li>`; }).join('');
  }
  function refsEditor() {
    const chips = st.draftRefs.map((ri, j) => { const r = D.refs[ri]; const t = CAT.tile(r.title); return `<li class="ref-draft"><span class="ref ref-static"><span class="ref-art" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span><span class="ref-body"><span class="ref-title">${esc(r.title)}</span><span class="ref-by">${r.type}, ${esc(r.by)}</span></span></span>
      <button type="button" class="iconbtn sm" data-a="ref-remove" data-i="${j}" data-k="refrm-${j}" aria-label="Ukloni ${esc(r.title)}">${ic('x', 'sm')}</button></li>`; }).join('');
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
  function composerForm() {
    const err = st.err.ans;
    return `<form class="composer" data-form="answer" novalidate>
      <label class="composer-label sr-only" for="f-ans">${st.editing ? 'Uredi svoj odgovor' : 'Tvoj odgovor'}</label>
      <textarea class="textarea" id="f-ans" data-k="f-ans" rows="6" placeholder="Napiši odgovor…"${err ? ' aria-invalid="true" aria-describedby="err-ans"' : ''}>${esc(st.draft)}</textarea>
      ${err ? fieldErr('ans', err) : ''}
      ${refsEditor()}
      ${audience('answer')}
      <div class="composer-actions">
        <button type="button" class="btn btn-secondary" data-a="cancel-compose" data-k="cancel">Odustani</button>
        <button type="submit" class="btn btn-primary" data-k="post" aria-describedby="aud">${st.editing ? 'Spremi' : 'Objavi'}</button>
      </div>
    </form>`;
  }

  function teaserActions() {
    return st.mine
      ? '<button class="btn btn-secondary btn-cta" data-a="open-drop" data-k="open-drop">Pogledaj odgovore</button>'
      : `<button class="btn btn-primary btn-cta" data-a="open-compose" data-k="open-compose">Odgovori</button>
         <button class="link read-link" data-a="open-drop" data-k="open-drop">Prvo pročitaj odgovore</button>`;
  }
  function dropTeaser(noCur) {
    const n = allAnswers().length, actions = teaserActions();
    return `<section class="dd dd-teaser" aria-labelledby="h-teaser">
      ${ddHead('home', noCur)}
      <h2 id="h-teaser" class="dd-q">${esc(D.drop.question)}</h2>
      ${people(n)}
      <div class="dd-actions">${actions}</div>
    </section>`;
  }
  function pastList(title) {
    return `<section class="section" aria-labelledby="h-past">
      <h2 id="h-past" class="section-title">${title}</h2>
      <ul class="past">${D.pastDrops.map((d, i) => `<li><button class="past-item" data-a="toast" data-msg="Arhiva (HUB-04) nije dio ove skice." data-k="past-${i}">
        <span class="past-date"><time datetime="${d.date}">${longDate(d.date)}</time></span><span class="past-q">${esc(d.q)}</span>${ic('chevron', 'past-ic')}</button></li>`).join('')}</ul>
    </section>`;
  }
  function dock() {
    if (st.mine) {
      return `<div class="dock"><p class="dock-done">${ic('check', 'sm')}<span>Tvoj odgovor je objavljen.</span></p>
        <button class="btn btn-secondary btn-sm" data-a="edit" data-k="dock-edit">Uredi</button></div>`;
    }
    const d = st.draft.trim();
    const label = d ? esc(d.slice(0, 48)) + (d.length > 48 ? '…' : '') : 'Napiši svoj odgovor…';
    return `<div class="dock"><button class="dock-field${d ? ' has-draft' : ''}" data-a="compose" data-k="dock-field">
      <canvas class="orbit" aria-hidden="true"></canvas>
      ${ic('edit', 'sm')}<span>${label}</span></button></div>`;
  }

  /* ---------- screens ---------- */
  function visibilityStep() {
    /* Values that differ between the two options are emphasised; shared ones stay quiet. */
    const yes = `${ic('check', 'sm v-ic')}Da`, no = `${ic('x', 'sm v-ic')}Ne`;
    const rows = [
      ['Profil i Music DNA', 'Svi članovi', 'Samo pratitelji'],
      ['Povijest odgovora', 'Svi članovi', 'Samo pratitelji'],
      ['Odgovori i komentari', 'Svi članovi', 'Svi članovi'],
      ['Popis pratitelja', 'Samo pratitelji', 'Samo pratitelji'],
      ['Otkrivanje i kompatibilnost', yes, no],
      ['Neprijavljeni', 'Ime, avatar, bio', 'Ništa']
    ];
    const err = st.err.vis;
    return `<h1>Tko vidi tvoj profil?</h1>
      <p class="lead lead-sm" id="vis-help">Odaberi jedno. Možeš promijeniti bilo kad.</p>
      <div class="vis">
        <fieldset class="vis-opts"${err ? ' aria-describedby="err-vis"' : ''}>
          <legend class="sr-only">Vidljivost profila</legend>
          ${[['public', 'globe', 'Javno', 'pub'], ['private', 'lock', 'Privatno', 'priv']].map(([v, i, t, c]) => `<label class="vis-opt vis-opt-${c}">
            <input type="radio" name="vis" value="${v}" data-k="vis-${v}" aria-describedby="vis-sum-${v}"${st.vis === v ? ' checked' : ''}>
            <span class="vis-badge" aria-hidden="true">${ic(i, 'vis-ic')}</span><span class="vis-name"><span class="vis-t">${t}</span><span class="vis-mark" aria-hidden="true">${ic('check')}</span></span></label>`).join('')}
        </fieldset>
        <table class="vis-table">
          <caption class="sr-only">Što vide drugi, usporedba</caption>
          <thead class="vis-head"><tr><td></td><th scope="col"><span class="sr-only">Javno</span></th><th scope="col"><span class="sr-only">Privatno</span></th></tr></thead>
          <tbody>${rows.map(([k, a, b]) => `<tr class="${a === b ? 'same' : 'diff'}"><th scope="row">${k}</th><td class="c-pub">${a}</td><td class="c-priv">${b}</td></tr>`).join('')}</tbody>
        </table>
        <p class="sr-only" id="vis-sum-public">Svi članovi vide profil, Music DNA i povijest odgovora. Pojavljuješ se u Otkrivanju. Neprijavljeni vide ime, avatar i bio.</p>
        <p class="sr-only" id="vis-sum-private">Profil, Music DNA i povijest odgovora vide samo pratitelji koje odobriš. Odgovore na pitanje i komentare i dalje vide svi članovi. Ne pojavljuješ se u Otkrivanju.</p>
      </div>
      ${err ? fieldErr('vis', err) : ''}
      <p class="fine fine-left">Music DNA možeš dodatno suziti u sljedećim koracima.</p>`;
  }

  function howStep() {
    return `<h1>Kako ${wm()} radi</h1>
      <ol class="how">
        <li class="how-card how-main" style="--d:0">
          <div class="how-vis" aria-hidden="true">${pic('calendar-dots', 'how-ic')}</div>
          <div><h2 class="how-t"><span class="hv-name">Daily Drop</span></h2><p>Svaki dan u 01:00 jedno glazbeno pitanje, isto za sve.</p></div>
        </li>
        <li class="how-card" style="--d:1">
          <div class="how-vis" aria-hidden="true">${pic('chart-bar-horizontal', 'how-ic')}</div>
          <div><h2 class="how-t" lang="en">Weekly Poll</h2><p>Tjedna anketa za sve. Rezultate vidiš kad glasaš.</p></div>
        </li>
        <li class="how-card" style="--d:2">
          <div class="how-vis" aria-hidden="true">${pic('lightbulb-filament', 'how-ic')}</div>
          <div><h2 class="how-t" lang="en">Did You Know?</h2><p>Dvaput tjedno provjerena glazbena priča, uz izvore.</p></div>
        </li>
        <li class="how-card" style="--d:3">
          <div class="how-vis" aria-hidden="true">${pic('users-three', 'how-ic')}</div>
          <div><h2 class="how-t">Ljudi po ukusu</h2><p>Music DNA pokazuje s kim dijeliš ukus. Bez postotaka.</p></div>
        </li>
      </ol>`;
  }

  /* Invite layout (owner, session 11): the whole invite fits the viewport with no scrolling, and the current is
     smaller. The owner chose B (D-059): a 56 px current under the tagline. ?inv=a|c|d still shows the other layouts
     compared in invite-layout.html. */
  const INV_AT = ['a', 'b', 'c', 'd'].includes(P.get('inv')) ? P.get('inv') : 'b';
  const invCur = (h, cls) => `<canvas class="ic inv-cur${cls ? ' ' + cls : ''}" data-v="branch" data-key="invite" data-h="${h}" aria-hidden="true"></canvas>`;

  /* ---------- Round 6 (owner, session 11; D-060). The chosen option is the default; the URL still shows the others,
     compared side by side in round6.html.
     ?vis=cols|rows|compact   profile visibility step; chosen: compact (cols was the D-053 card)
     ?art=country|smart|genre artist results; chosen: genre (country was the D-053 rule)
     ?home=a|b|c|d            Daily Drop on Home; chosen: c, with the name and date set as in b
     ?prof=a|b|c              profile page; chosen: c, the Music DNA on top
     ?nav=solid|glass|float|ember  tab bar background; chosen: glass, a little clearer than first shown */
  const pick = (k, list, def) => list.includes(P.get(k)) ? P.get(k) : def;
  const VIS_AT = pick('vis', ['cols', 'rows', 'compact'], 'compact');
  const ART_AT = pick('art', ['country', 'smart', 'genre'], 'genre');
  const HOME_AT = pick('home', ['a', 'b', 'c', 'd'], 'c');
  const PROF_AT = pick('prof', ['a', 'b', 'c'], 'c');
  const NAV_AT = pick('nav', ['solid', 'glass', 'float', 'ember'], 'glass');
  if (NAV_AT !== 'solid') document.documentElement.classList.add('nav-' + NAV_AT);

  /* Artist result meta line. country: the country, plus a short description only for same-name artists.
     smart: nothing at all unless two results share a name. genre: main genres, plus the country for same-name artists. */
  function artistMeta(a, items) {
    const dup = items.filter(x => x.name === a.name).length > 1;
    if (ART_AT === 'smart') return dup ? a.meta : '';
    if (ART_AT === 'genre') {
      const g = (a.g || []).join(', ');
      if (!g) return a.meta;
      if (!dup) return g;
      const yrs = (a.meta.match(/\(([^)]*)\)/) || [])[1];
      return `${g}. ${a.meta.split(',')[0]}${yrs ? ', ' + yrs : ''}`;
    }
    return a.meta;
  }

  /* Visibility as two rows (owner: "u dva reda"). The same facts as the table; the rules both options share are said once. */
  const VIS_ROWS = [
    ['public', 'globe', 'Javno', ['Profil, Music DNA i povijest odgovora vide svi članovi.', 'Pojavljuješ se u Otkrivanju i kompatibilnosti.', 'Neprijavljeni vide ime, avatar i bio.']],
    ['private', 'lock', 'Privatno', ['Profil, Music DNA i povijest odgovora vide samo pratitelji koje odobriš.', 'Ne pojavljuješ se u Otkrivanju.', 'Neprijavljeni ne vide ništa.']]
  ];
  const VIS_TABLE = [
    ['Profil i Music DNA', 'Svi članovi', 'Samo pratitelji'], ['Povijest odgovora', 'Svi članovi', 'Samo pratitelji'],
    ['Odgovori i komentari', 'Svi članovi', 'Svi članovi'], ['Popis pratitelja', 'Samo pratitelji', 'Samo pratitelji'],
    ['Otkrivanje i kompatibilnost', 'Da', 'Ne'], ['Neprijavljeni', 'Ime, avatar, bio', 'Ništa']
  ];
  function visibilityRows(compact) {
    const err = st.err.vis;
    return `<h1>Tko vidi tvoj profil?</h1>
      <p class="lead lead-sm" id="vis-help">Odaberi jedno. Možeš promijeniti bilo kad.</p>
      <fieldset class="vrows${compact ? ' vrows-c' : ''}"${err ? ' aria-describedby="err-vis"' : ''}>
        <legend class="sr-only">Vidljivost profila</legend>
        ${VIS_ROWS.map(([v, i, t, lines]) => `<label class="vrow">
          <input type="radio" name="vis" value="${v}" data-k="vis-${v}"${st.vis === v ? ' checked' : ''}>
          <span class="vrow-head"><span class="vis-badge" aria-hidden="true">${ic(i, 'vis-ic')}</span><span class="vis-t">${t}</span><span class="vis-mark" aria-hidden="true">${ic('check')}</span></span>
          <span class="vrow-list">${(compact ? lines.slice(0, 1) : lines).map(l => `<span>${l}</span>`).join('')}</span>
        </label>`).join('')}
      </fieldset>
      ${err ? fieldErr('vis', err) : ''}
      <p class="vrow-same">${ic('users', 'sm')}<span>U oba slučaja odgovore i komentare vide svi članovi, a popis pratitelja samo pratitelji.</span></p>
      ${compact ? `<details class="vrow-more"><summary>Usporedi sve razlike</summary>
        <table class="vrow-table"><thead><tr><td></td><th scope="col">Javno</th><th scope="col">Privatno</th></tr></thead>
        <tbody>${VIS_TABLE.map(([k, a, b]) => `<tr><th scope="row">${k}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></details>` : ''}
      <p class="fine fine-left">Music DNA možeš dodatno suziti u sljedećim koracima.</p>`;
  }

  /* Home: the Daily Drop in four arrangements. */
  function answerPeek(a) {
    return `<li><button class="peek" data-a="open-drop" data-k="peek-${a.id}">${avatar(a.handle, a.who, 'xs')}<span class="peek-body"><span class="peek-who">${esc(a.who)}</span><span class="peek-text"${a.lang ? ` lang="${a.lang}"` : ''}>${esc(a.text)}</span></span></button></li>`;
  }
  function homeBody() {
    const follow = `<section class="section" aria-labelledby="h-follow"><h2 id="h-follow" class="section-title">Od ljudi koje pratiš</h2>
      <div class="empty"><p>Još nikoga ne pratiš. Ljude možeš pronaći kroz odgovore na Daily Drop.</p></div></section>`;
    const past = pastList('Prethodni Daily Dropovi');
    if (HOME_AT === 'a') return dropTeaser() + follow + past;
    if (HOME_AT === 'b') return dropTeaser(true) + follow + past;
    const n = allAnswers().length, peeks = allAnswers().slice(0, HOME_AT === 'c' ? 2 : 3);
    const eyebrow = `<p class="dd-eyebrow"><span class="dd-name dd-name-sm">Daily Drop</span><time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>`;
    if (HOME_AT === 'c') return `<section class="dd dd-teaser dd-c" aria-labelledby="h-teaser">
        ${ddHead('home', true)}
        <h2 id="h-teaser" class="dd-q">${esc(D.drop.question)}</h2>
        <div class="dd-actions">${teaserActions()}</div>
        <ul class="peeks" aria-label="Prvi odgovori">${peeks.map(answerPeek).join('')}</ul>
        <button class="link" data-a="open-drop" data-k="all-ans">Pogledaj sve odgovore (${n})</button>
      </section>` + follow + past;
    return `<section class="dd-card" aria-labelledby="h-teaser">
        ${eyebrow}
        <h2 id="h-teaser" class="dd-q dd-q-sm">${esc(D.drop.question)}</h2>
        <div class="dd-actions dd-actions-row">${teaserActions()}</div>
      </section>
      <section class="section" aria-labelledby="h-peek"><h2 id="h-peek" class="section-title">Odgovori zajednice <span class="count">${n}</span></h2>
        <ul class="peeks">${peeks.map(answerPeek).join('')}</ul>
        <button class="link" data-a="open-drop" data-k="all-ans">Pogledaj sve odgovore</button></section>` + follow + past;
  }

  /* Profile page in three arrangements. Counts and the bio are fictional placeholders. */
  const profDna = h => st.genres.length ? `<figure class="dna-card">${dnaCanvas('profile', h)}<figcaption><span class="dna-hint" aria-hidden="true">Dodirni spiralu</span>${dnaText()}</figcaption></figure>` : '<p class="empty">Još nema odabira.</p>';
  const profArtists = () => st.artists.length ? `<ul class="portraits portraits-sm" aria-label="Izvođači">${st.artists.map(a => `<li>${artistTile(a)}<span class="p-name">${esc(a.name)}</span></li>`).join('')}</ul>` : '';
  const profSettings = () => `<section class="section" aria-labelledby="h-set"><h2 id="h-set" class="section-title">Prikaz</h2>
      <div class="setting"><div><p class="set-t" id="calm-l">Smanji pokrete</p><p class="help" id="calm-d">Struja, iskra i Music DNA miruju. Isto vrijedi ako je to uključeno na uređaju.</p></div>
      <button type="button" class="switch" role="switch" aria-checked="${MOT.calm()}" aria-labelledby="calm-l" aria-describedby="calm-d" data-a="calm" data-k="calm"><span></span></button></div>
    </section>`;
  const profAnswers = () => `<section class="section" aria-labelledby="h-pdd"><h2 id="h-pdd" class="section-title">Daily Drop odgovori</h2>
      ${st.mine ? `<ul class="past"><li><button class="past-item" data-a="open-drop" data-k="prof-ans"><span class="past-date">${longDate(D.drop.date)}</span><span class="past-q">${esc(D.drop.question)}</span>${ic('chevron', 'past-ic')}</button></li></ul>` : '<p class="empty">Još nema odgovora.</p>'}
    </section>`;
  const profVis = () => `<p class="pf-vis">${ic(st.vis === 'public' ? 'globe' : 'lock', 'sm')}<span>${VIS_LABEL[st.vis] || 'Privatni'} profil. Music DNA vide: ${(DNA_LABEL[st.dnaVis] || 'Samo ja').toLowerCase()}.</span></p>`;
  const profBtns = () => `<div class="foot-row equal pf-btns"><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Uređivanje profila (J4) nije dio skice." data-k="pf-edit">Uredi profil</button>
      <button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Dijeljenje profila nije dio skice." data-k="pf-share">${ic('share', 'sm')}Podijeli</button></div>`;
  const BIO = 'Jazz ujutro, techno navečer.';
  function profileBody() {
    const name = esc(st.displayName || 'Ti'), handle = esc(st.username || 'ti');
    if (PROF_AT === 'b') return `<div class="pf-b">${avatar(st.username, st.displayName || 'T', 'lg')}
        <dl class="pf-stats"><div><dt>Odgovori</dt><dd>${st.mine ? 1 : 0}</dd></div><div><dt>Pratitelji</dt><dd>12</dd></div><div><dt>Prati</dt><dd>18</dd></div></dl></div>
      <div class="pf-id"><h1 class="prof-name">${name}</h1><p class="meta">@${handle}</p><p class="pf-bio">${BIO}</p>${profVis()}</div>
      ${profBtns()}
      <section class="section" aria-labelledby="h-pdna"><h2 id="h-pdna" class="section-title">Music DNA</h2>${profDna(170)}${profArtists()}</section>
      ${profAnswers()}${profSettings()}
      <p class="meta">Brojke i bio su izmišljeni. Ostatak profila (J4) nije dio ove skice.</p>`;
    if (PROF_AT === 'c') return `<div class="pf-c">
        ${st.genres.length ? `<figure class="pf-c-hero">${dnaCanvas('profile', 200)}<figcaption>${dnaText()}</figcaption></figure>` : ''}
        <div class="pf-c-id">${avatar(st.username, st.displayName || 'T', 'lg')}<div><h1 class="prof-name">${name}</h1><p class="meta">@${handle}</p></div></div></div>
      <p class="pf-bio">${BIO}</p>
      <p class="pf-c-stats"><span><b>12</b> pratitelja</span><span>prati <b>18</b></span><span><b>${st.mine ? 1 : 0}</b> ${plAns(st.mine ? 1 : 0)}</span></p>
      ${profVis()}${profBtns()}
      ${st.artists.length ? `<section class="section" aria-labelledby="h-part"><h2 id="h-part" class="section-title">Izvođači</h2>${profArtists()}</section>` : ''}
      ${profAnswers()}${profSettings()}
      <p class="meta">Brojke i bio su izmišljeni. Ostatak profila (J4) nije dio ove skice.</p>`;
    return `<div class="prof-head">${avatar(st.username, st.displayName || 'T', 'lg')}
        <div><h1 class="prof-name">${name}</h1><p class="meta">@${handle}</p></div></div>
      <section class="section" aria-labelledby="h-pdna"><h2 id="h-pdna" class="section-title">Music DNA</h2>${profDna(184)}${profArtists()}</section>
      <dl class="facts-grid">
        <div>${ic(st.vis === 'public' ? 'globe' : 'lock', 'ft-ic')}<dt>Profil</dt><dd>${VIS_LABEL[st.vis] || 'Privatni (nije odabrano)'}</dd></div>
        <div>${ic('users', 'ft-ic')}<dt>DNA vide</dt><dd>${DNA_LABEL[st.dnaVis] || 'Samo ja'}</dd></div>
      </dl>
      ${profSettings()}${profAnswers()}
      <p class="meta">Ostatak profila (J4) nije dio ove skice.</p>`;
  }

  const S = {
    invite: () => ({
      kind: 'bare',
      body: `<div class="hero">
        ${INV_AT === 'a' ? invCur(64) : ''}
        <p class="eyebrow">Pozivnica</p>
        <h1 class="h-hero">Imaš pozivnicu za ${wm()}</h1>
        <p class="tagline" lang="en">Where musical worlds collide.</p>
        ${INV_AT === 'b' ? invCur(window.matchMedia('(max-height: 600px)').matches ? 40 : 56) : INV_AT === 'c' ? invCur(56, 'inv-wide') : ''}
        <p class="lead">Ovdje se razgovara o glazbi: svaki dan jedno pitanje za sve, tvoj Music DNA i ljudi sličnog ili sasvim drukčijeg ukusa.</p>
      </div>
      <div class="info info-stack">
        <p>${ic('info')}<span>Zatvorena alfa: neke stvari još nedostaju i mogu se promijeniti. <button class="link" data-a="toast" data-msg="Ovdje bi se otvorila stranica o alfi (PUB-12)." data-k="alpha-more">Više o alfi</button></span></p>
        <p>${pic('device-mobile', 'pwa-ic')}<span>Dodaj ${wm(true)} na početni zaslon: otvara se kao aplikacija, uz podsjetnike. <button class="link" data-a="toast" data-msg="Ovdje bi se otvorile kratke upute za iPhone i Android (Dodaj na početni zaslon)." data-k="pwa-how">Kako?</button></span></p>
      </div>`,
      foot: `${INV_AT === 'd' ? invCur(48, 'inv-foot') : ''}<button class="btn btn-primary btn-block" data-a="next" data-k="next">Prihvati pozivnicu</button><p class="fine">Pozivnica vrijedi za ${esc(D.email)}.</p>`
    }),
    age: () => ({
      kind: 'onb', back: true,
      body: `<div class="center-block">
        <span class="step-ic" aria-hidden="true">${pic('users-three')}</span>
        <h1>Imaš li 18 ili više godina?</h1>
        <p class="lead">${wm(true)} je zajednica punoljetnih ljubitelja glazbe. Ne tražimo datum rođenja, samo tvoj odgovor.</p>
        ${choices('age', 'Odaberi što vrijedi za tebe.', [{ v: 'adult', t: 'Da, imam 18 ili više' }, { v: 'minor', t: 'Ne, imam manje od 18' }], st.age, 'choices-center')}
      </div>`,
      foot: nextBtn()
    }),
    uilang: () => ({
      kind: 'onb', back: true,
      body: `<div class="center-block">
        <span class="step-ic" aria-hidden="true">${pic('translate')}</span>
        <h1>Odaberi jezik</h1>
        <p class="lead" lang="en">Choose your language</p>
        ${choices('lang', 'Jezik sučelja', [{ v: 'en', t: 'English', lang: 'en' }, { v: 'hr', t: 'Hrvatski' }], st.lang, 'choices-center')}
        <p class="fine">Možeš ga promijeniti bilo kad u postavkama.</p>
      </div>`,
      foot: nextBtn()
    }),
    minor: () => ({
      kind: 'onb', back: true, noProgress: true,
      body: `<div class="center-block">
        <h1>${wm()} je zasad samo za punoljetne</h1>
        <p class="lead">Hvala na iskrenom odgovoru. Ništa nismo spremili, a pozivnica je ostala netaknuta.</p>
        <p>Ako je odgovor bio greška, vrati se korak natrag.</p>
        <p><button class="link" data-a="toast" data-msg="Pravila zajednice (PUB-11) nisu dio skice." data-k="rules">Pravila zajednice</button></p></div>`,
      foot: '<button class="btn btn-secondary btn-block" data-a="back" data-k="minor-back">Natrag</button>'
    }),
    account: () => ({
      kind: 'onb', back: true,
      body: `<h1>Napravi račun</h1>
        ${field({ id: 'email', label: 'E-pošta', help: 'Pozivnica je vezana uz ovu adresu.', type: 'email', value: D.email, attrs: 'readonly autocomplete="email"' })}
        ${field({ id: 'pw', label: 'Lozinka', help: `Najmanje ${PW_MIN} znakova, veliko i malo slovo te poseban znak.`, type: st.showPw ? 'text' : 'password', value: st.pw,
          attrs: 'autocomplete="new-password" autocapitalize="none" spellcheck="false"',
          after: `<button type="button" class="input-btn" data-a="showpw" data-k="showpw" aria-label="${st.showPw ? 'Sakrij lozinku' : 'Prikaži lozinku'}">${pic(st.showPw ? 'eye-slash' : 'eye', 'pw-ic')}<span>${st.showPw ? 'Sakrij' : 'Prikaži'}</span></button>` })}
        <div class="pw-meter" id="pw-meter">${pwMeter()}</div>
        <p class="or"><span>ili</span></p>
        <button class="btn btn-secondary btn-block" data-a="google" data-k="google">Nastavi s Google računom</button>
        <p class="fine">Nastavkom prihvaćaš <button class="link" data-a="toast" data-msg="Uvjeti korištenja (PUB-10) nisu dio skice." data-k="terms">Uvjete korištenja</button>. Kako koristimo podatke piše u <button class="link" data-a="toast" data-msg="Pravila privatnosti (PUB-10) nisu dio skice." data-k="privacy">Pravilima privatnosti</button>.</p>`,
      foot: nextBtn('Napravi račun')
    }),
    username: () => ({
      kind: 'onb',
      body: `<h1>Kako se zoveš?</h1>
        ${field({ id: 'dname', label: 'Ime za prikaz', help: 'Tako te drugi vide. Pravo ime ili nadimak, kako ti odgovara.', value: st.displayName, attrs: 'autocomplete="nickname" maxlength="40"' })}
        ${field({ id: 'uname', label: 'Korisničko ime', help: '3 do 20 znakova: mala slova, brojke, točka i donja crta.', value: st.username, prefix: '@', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"' })}
        <div id="uname-status" class="status" aria-live="polite">${userStatusHtml()}</div>`,
      foot: nextBtn()
    }),
    language: () => ({
      kind: 'onb', back: true,
      body: `<h1 id="rl-label">Na kojim jezicima rado čitaš odgovore?</h1>
        <div class="group" role="group" aria-labelledby="rl-label" aria-describedby="rl-help">
          <p class="help" id="rl-help"><span class="opt">Neobavezno.</span> Takve odgovore češće vidiš u poretku „Za tebe”. Ništa se ne skriva.</p>
          <div class="chips">${READ_LANGS.map(l => `<button class="chip" data-a="readlang" data-l="${l}" data-k="rl-${l}" aria-pressed="${st.readLangs.has(l)}"><span class="ck">${ic('check', 'sm')}</span>${l}</button>`).join('')}</div>
        </div>`,
      foot: nextBtn()
    }),
    visibility: () => ({ kind: 'onb', back: true, body: VIS_AT === 'cols' ? visibilityStep() : visibilityRows(VIS_AT === 'compact'), foot: nextBtn() }),
    dna: () => ({
      kind: 'onb', back: true,
      body: `<h1>Što slušaš?</h1>
        <p class="lead lead-sm">Odaberi 2 do 10 žanrova, a ako želiš i izvođače. Od toga nastaje tvoj Music DNA.</p>
        <div class="dna-live">
          ${dnaCanvas('onb', 176)}
          <p class="dna-count" id="dna-count" aria-live="polite">${dnaCountText()}</p>
        </div>
        <div class="group" role="group" aria-labelledby="g-label"${st.err.genres ? ' aria-describedby="err-genres"' : ''}>
          <h2 class="group-title" id="g-label">Žanrovi <span class="opt">2 do 10</span></h2>
          ${st.err.genres ? fieldErr('genres', st.err.genres) : ''}
          <div class="chips chips-genres" id="genre-chips">${genreChips()}</div>
          <div id="more-genres">${moreGenres()}</div>
          <p class="sr-only" id="genre-max" aria-live="polite"></p>
        </div>
        <div class="group">
          <h2 class="group-title">Izvođači <span class="opt">neobavezno, do ${D.artistMax}</span></h2>
          <div id="picked">${pickedArtists()}</div>
          <label class="label-sm" for="f-artist">Traži izvođača</label>
          <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-artist" data-k="f-artist" type="search" autocomplete="off" value="${esc(st.artistQ)}" aria-describedby="artist-hint" aria-controls="artist-results"></div>
          <p class="help" id="artist-hint">${CAT.LIVE ? 'Pravi katalog: MusicBrainz. Fotografije s Wikimedia Commonsa, uz autora i licencu.' : 'Npr. „Metallica”, „Let 3” ili „Björk”. Ogledni popis bez mreže.'}</p>
          <ul class="results" id="artist-results" aria-live="off">${artistResults()}</ul>
          <p class="sr-only" id="artist-live" aria-live="polite"></p>
        </div>`,
      foot: nextBtn()
    }),
    dnavis: () => ({
      kind: 'onb', back: true,
      body: `<h1>Tko vidi tvoj Music DNA?</h1>
        <div class="dna-mini">${dnaCanvas('vis', 116)}</div>
        ${choices('dnaVis', 'Odaberi jedno. Neprijavljeni ga nikad ne vide.', [
          { v: 'all', icon: 'users', t: 'Svi članovi', d: 'Svi prijavljeni. Koristi se za Otkrivanje i kompatibilnost.' },
          { v: 'followers', icon: 'user', t: 'Samo pratitelji', d: 'Vide ga samo ljudi koji te prate.' },
          { v: 'me', icon: 'lock', t: 'Samo ja', d: 'Nitko drugi, ni u kompatibilnosti.' }], st.dnaVis, 'choices-compact')}`,
      foot: nextBtn()
    }),
    how: () => ({ kind: 'onb', back: true, body: howStep(), foot: nextBtn() }),
    reminder: () => {
      const denied = st.reminder === 'denied';
      return {
        kind: 'onb', back: true,
        body: `<h1>Ne propusti Daily Drop</h1>
          <p class="lead">Daily Drop je srce zajednice. Jedna obavijest dnevno, kad izađe novo pitanje. Ništa drugo.</p>
          <div class="notif" role="img" aria-label="Primjer obavijesti: Daily Drop je stigao. Koji album bi dao nekome tko misli da ne voli jazz?">
            <span class="notif-app" aria-hidden="true">${current('notif', 'sm')}</span>
            <span class="notif-body" aria-hidden="true"><span class="notif-top"><b>${wm()}</b><span>sada</span></span>
            <span class="notif-t">Daily Drop je stigao</span><span class="notif-q">${esc(D.drop.question)}</span></span>
          </div>
          <p class="rift-note">Svaki dan jedno pitanje i cijela Rift zajednica na istom mjestu. Podsjetnik te dovede na vrijeme.</p>
          ${denied ? `<div class="notice" role="status">${ic('alert')}<p>Preglednik je blokirao obavijesti, pa je podsjetnik isključen. Možeš ga uključiti kasnije u postavkama preglednika i GrooveRifta.</p></div>` : `
          <div class="rem-row"><div class="field"><label class="label" for="f-time">Vrijeme</label>
            <select class="select" id="f-time" data-k="f-time">${['07:00', '08:00', '09:00', '12:00', '17:00', '20:00', '22:00'].map(t => `<option${st.remTime === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <p class="meta">${ic('clock', 'sm')}<span>Zona: Zagreb</span> <button class="link" data-a="toast" data-msg="Promjena vremenske zone nije dio skice." data-k="tz">Promijeni</button></p></div>`}`,
        foot: denied ? nextBtn() : `<div class="foot-row equal">
          <button class="btn btn-secondary" data-a="remind-off" data-k="remind-off">Ne sada</button>
          <button class="btn btn-secondary" data-a="remind-on" data-k="remind-on">${ic('bell', 'sm')}Uključi</button></div>`
      };
    },
    done: () => ({
      kind: 'bare',
      body: `<div class="hero hero-done">
        <h1 class="h-hero">Spremno.</h1>
        <p class="lead">Današnje pitanje te čeka.</p>
        <figure class="dna-card">${dnaCanvas('done', 200)}
          <figcaption><span class="dna-cap">Tvoj Music DNA</span><span class="dna-hint" aria-hidden="true">Dodirni spiralu</span>${dnaText()}</figcaption></figure>
        <dl class="facts-grid">
          <div>${ic(st.vis === 'public' ? 'globe' : 'lock', 'ft-ic')}<dt>Profil</dt><dd>${VIS_LABEL[st.vis] || 'Privatni'}</dd></div>
          <div>${ic('pulse', 'ft-ic')}<dt>Music DNA</dt><dd>${st.genres.length} ${pl(st.genres.length, 'žanr', 'žanra', 'žanrova')}${st.artists.length ? `, ${st.artists.length} ${pl(st.artists.length, 'izvođač', 'izvođača', 'izvođača')}` : ''}</dd></div>
          <div>${ic('users', 'ft-ic')}<dt>DNA vide</dt><dd>${DNA_LABEL[st.dnaVis] || 'Samo ja'}</dd></div>
          <div>${ic('bell', 'ft-ic')}<dt>Podsjetnik</dt><dd>${st.reminder === 'on' ? `Svaki dan u ${st.remTime}` : 'Isključen'}</dd></div>
        </dl>
        <p class="fine">Sve ovo možeš promijeniti u postavkama.</p></div>`,
      foot: '<button class="btn btn-primary btn-block" data-a="finish" data-k="finish">Na početnu</button>'
    }),

    home: () => ({
      kind: 'app', tab: 'home',
      body: `<h1 class="sr-only">Početna</h1>${homeBody()}`
    }),
    hub: () => ({
      kind: 'app', tab: 'hub', topTitle: 'Hub', topH1: true,
      body: `${dropTeaser()}${pastList('Arhiva')}
        <button class="btn btn-secondary btn-block" data-a="toast" data-msg="Predlaganje pitanja (HUB-09) nije dio ove skice." data-k="suggest">Predloži pitanje</button>`
    }),
    drop: () => {
      scheduleNew();
      const n = allAnswers().length;
      return {
        kind: 'app', tab: 'hub', back: true, topBlank: true,
        topActions: `<button class="iconbtn" data-a="toast" data-msg="Poveznica kopirana (simulacija). Neprijavljeni vide samo pitanje i poziv da se pridruže (D-022)." data-k="share" aria-label="Podijeli pitanje">${ic('share')}</button>`,
        body: `<header class="dd dd-page">
            ${ddHead('drop', true)}
            <h1 class="dd-q">${esc(D.drop.question)}</h1>
            ${people(n)}
          </header>
          ${st.mine ? `<div class="mine-wrap">${answerItem(st.mine)}</div>` : ''}
          <div class="list-head"><h2 class="section-title" id="h-answers">Odgovori <span class="count">${st.answers.length}</span></h2></div>
          ${sortCtl()}
          ${st.pending ? `<button class="new-pill" data-a="show-new" data-k="show-new">${st.pending.length} ${pl(st.pending.length, 'novi odgovor', 'nova odgovora', 'novih odgovora')}</button>` : ''}
          <ul class="ans-list" aria-labelledby="h-answers">${ordered().map(a => `<li>${answerItem(a)}</li>`).join('')}</ul>`,
        dock: dock()
      };
    },
    answer: () => {
      const a = findAnswer(st.ctx);
      const cs = st.comments[a.id] || [];
      return {
        kind: 'app', tab: 'hub', back: true, topTitle: 'Komentari',
        body: `<h1 class="sr-only">Komentari na odgovor korisnika ${esc(a.who)}</h1>
          <p class="ctx">Na pitanje: ${esc(D.drop.question)}</p>
          <div class="ans-solo">${answerItem(a, { full: true, hl: 2 })}</div>
          <section class="section" aria-labelledby="h-com">
            <h2 id="h-com" class="section-title">Komentari</h2>
            ${cs.length ? `<ul class="com-list">${cs.map((c, i) => `<li><article class="com" aria-labelledby="hc-${i}">
              <header class="ans-head">${avatar(c.handle, c.who, 'sm')}
              <h3 class="ans-who" id="hc-${i}" tabindex="-1"><span class="name">${esc(c.who)}</span><span class="sr-only">, </span><span class="handle">@${esc(c.handle)}</span></h3><span class="ans-time"><time>${c.time}</time></span></header>
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
      body: profileBody()
    })
  };

  /* ---------- shell ---------- */
  function topbar(s) {
    let left = '';
    if (s.back && st.hist.length) left = `<button class="iconbtn" data-a="back" data-k="top-back" aria-label="Natrag">${ic('back')}</button>`;
    let mid;
    if (s.topBlank) mid = '<span class="top-title"></span>';
    else if (s.topTitle) mid = s.topH1 ? `<h1 class="top-title">${esc(s.topTitle)}</h1>` : `<span class="top-title">${esc(s.topTitle)}</span>`;
    else mid = `<span class="wordmark">groove<span class="wm-rift">rift${bolt()}</span></span>`;
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
        ${composerForm()}</div>`;
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

  /* Motifs after each render: mount the current, the dock orbit and the Music DNA canvases. */
  function afterRender() {
    CUR.scan(root); INV.scan(root); DNA.scan(root);
    // review pages in iframes (invite-layout.html) ask whether the screen fits without scrolling
    if (window.parent !== window) setTimeout(() => parent.postMessage({ gr: 'fit', screen: st.screen, over: document.documentElement.scrollHeight - window.innerHeight }, '*'), 250);
  }

  function render(opt) {
    opt = opt || {};
    const keep = opt.keep ? snapshot() : null;
    const s = S[st.screen]();
    const standalone = window.top === window;
    let shell = '';
    if (standalone) shell += `<p class="proto-note">Skica 3.5: izmišljeni podaci, privremeni wordmark.</p>`;
    shell += topbar(s);
    if (s.kind === 'onb' && !s.noProgress) shell += progress();
    shell += `<main id="main" class="screen screen-${st.screen} kind-${s.kind}">${s.body}</main>`;
    if (s.foot) shell += `<div class="foot">${s.foot}</div>`;
    if (s.kind === 'app') shell += `<div class="bottom">${s.dock || ''}${tabbar(s.tab)}</div>`;
    root.innerHTML = `<div class="shell"${st.overlay ? ' inert' : ''}>${shell}</div>${overlayHtml()}`;
    root.dataset.screen = st.screen;
    if (st.swipeDir) { const m = root.querySelector('main'); if (m) m.classList.add('swipe-' + st.swipeDir); st.swipeDir = null; }
    if (s.kind === 'onb' && !s.noProgress) { const h = root.querySelector('main h1'); if (h) h.setAttribute('aria-describedby', 'prog-text'); }
    afterRender();
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
    CUR.reset(); INV.reset(); DNA.reset();
    render(); window.scrollTo(0, 0);
    if (o.focus) focusSel(o.focus); else focusH1();
  }
  function back() {
    const h = st.hist.pop();
    if (!h) return;
    st.screen = h.screen; st.err = {}; st.overlay = null;
    CUR.reset(); INV.reset(); DNA.reset();
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
    const el = root.querySelector('[aria-invalid="true"], fieldset[aria-describedby^="err-"] input, [role="group"][aria-describedby^="err-"] .chip');
    if (el) el.focus();
  }

  function next() {
    const err = {};
    switch (st.screen) {
      case 'invite': return go('age');
      case 'age':
        if (!st.age) { err.age = 'Odaberi jedan odgovor.'; break; }
        return go(st.age === 'adult' ? 'uilang' : 'minor');
      case 'uilang': return go('account');
      case 'account':
        if (!st.pw) { err.pw = 'Upiši lozinku.'; break; }
        if (pwMissing(st.pw).length) { err.pw = `Lozinci još treba: ${pwMissing(st.pw).map(r => r[3]).join(', ')}.`; break; }
        if (PW_BREACHED.has(st.pw)) { err.pw = 'Ova se lozinka pojavila u javno poznatim curenjima podataka, pa je napadači isprobavaju među prvima. Odaberi drugu.'; break; }
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
      case 'dna':
        if (st.genres.length < D.genreMin) { err.genres = st.genres.length ? `Odaberi još ${D.genreMin - st.genres.length} žanr. Treba ih barem ${D.genreMin}.` : `Odaberi barem ${D.genreMin} žanra.`; break; }
        return go('dnavis');
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
      st.mine = { id: 'mine', who: st.displayName || 'Ti', handle: st.username || 'ti', time: 'upravo', min: 9999, text: t, refs: st.draftRefs.slice(), reacts: { like: 0 }, myReacts: [], comments: 0, mine: true };
      msg = 'Odgovor je objavljen.';
    }
    st.draft = ''; st.draftRefs = []; st.refOpen = false; st.refQ = ''; st.err = {}; st.overlay = null;
    render(); window.scrollTo(0, 0);
    focusSel('#h-mine');
    CUR.zap('dd-drop');
    toast(msg);
  }

  function startEdit(opener) {
    st.editing = true; st.draft = st.mine.text; st.draftRefs = st.mine.refs.slice(); st.err = {};
    openOverlay({ type: 'sheet' }, opener);
  }
  function cancelCompose() {
    if (st.editing) { st.editing = false; st.draft = ''; st.draftRefs = []; }
    st.err = {}; closeOverlay();
  }

  function toggleGenre(b) {
    const g = b.dataset.g;
    const i = st.genres.indexOf(g);
    const msg = root.querySelector('#genre-max');
    if (i >= 0) st.genres.splice(i, 1);
    else if (st.genres.length >= D.genreMax) { if (msg) msg.textContent = `Najviše ${D.genreMax} žanrova. Makni jedan da dodaš drugi.`; toast(`Najviše ${D.genreMax} žanrova. Makni jedan da dodaš drugi.`); return; }
    else st.genres.push(g);
    if (msg) msg.textContent = '';
    if (st.err.genres && st.genres.length >= D.genreMin) { delete st.err.genres; const e = root.querySelector('#err-genres'); if (e) e.remove(); const gr = root.querySelector('[aria-describedby="err-genres"]'); if (gr) gr.removeAttribute('aria-describedby'); }
    const fromSearch = !!b.closest('#genre-results');
    if (!D.mainGenres.includes(g)) {
      const c = root.querySelector('#genre-chips'); if (c) c.innerHTML = genreChips();
      const m = root.querySelector('#more-genres'); if (m) m.innerHTML = moreGenres();
      focusSel(fromSearch ? '#f-genre' : (i >= 0 ? '#f-genre, [data-k="more-genres"]' : `[data-k="g-${CSS.escape(g)}"]`));
    }
    updateDnaStep();
  }

  /* ---------- events ---------- */
  /* Swipe between the four main tabs (owner, session 11, like Instagram). Tapping the tab bar still works, so the
     swipe is only an extra path (WCAG 2.5.1). The page follows the finger; a short or mostly vertical move snaps
     back. Ignored on form fields, canvases, horizontal scrollers and while a sheet or menu is open. */
  const TABS = ['home', 'hub', 'activity', 'profile'];
  let sw = null, swDragged = false;
  root.addEventListener('click', e => { if (swDragged) { swDragged = false; e.preventDefault(); e.stopPropagation(); } }, true);
  root.addEventListener('pointerdown', () => { swDragged = false; }, true);
  const swMain = () => root.querySelector('main');
  root.addEventListener('pointerdown', e => {
    if (st.overlay || !TABS.includes(st.screen) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('input, textarea, select, canvas, .chips, [data-noswipe]')) return;
    sw = { x: e.clientX, y: e.clientY, t: performance.now(), h: null, id: e.pointerId };
  });
  root.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (sw.h === null && Math.hypot(dx, dy) > 10) sw.h = Math.abs(dx) > Math.abs(dy) * 1.4;
    if (sw.h === false) { sw = null; return; }
    if (!sw.h) return;
    const i = TABS.indexOf(st.screen), edge = (dx > 0 && i === 0) || (dx < 0 && i === TABS.length - 1);
    const m = swMain(); if (m) { m.style.transition = 'none'; m.style.transform = `translateX(${dx * (edge ? 0.15 : 0.5)}px)`; }
  });
  function swEnd(e, cancel) {
    if (!sw || (e && e.pointerId !== sw.id)) return;
    const dx = e ? e.clientX - sw.x : 0, fast = performance.now() - sw.t < 700, h = sw.h; sw = null;
    if (h) swDragged = true; // the click that follows a drag must not open what was under the finger
    const i = TABS.indexOf(st.screen) + (dx < 0 ? 1 : -1);
    if (!cancel && h && fast && Math.abs(dx) >= 60 && i >= 0 && i < TABS.length) { st.swipeDir = dx < 0 ? 'next' : 'prev'; return go(TABS[i], { reset: true }); }
    const m = swMain(); if (m && m.style.transform) { m.style.transition = 'transform 180ms ease-out'; m.style.transform = ''; }
  }
  root.addEventListener('pointerup', e => swEnd(e, false));
  root.addEventListener('pointercancel', e => swEnd(e, true));

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || !root.contains(b)) return;
    const a = b.dataset.a;
    switch (a) {
      case 'next': return next();
      case 'back': return back();
      case 'lang': return toast('U skici je samo hrvatski tekst. U aplikaciji se jezik mijenja ovdje na svakom koraku.');
      case 'toast': return toast(b.dataset.msg);
      case 'showpw': st.showPw = !st.showPw; return render({ keep: true });
      case 'google': toast('Simulacija: Google račun s istom adresom kao pozivnica. Račun je napravljen.'); return go('username', { reset: true });
      case 'pickuser': st.username = b.dataset.u; st.userState = 'ok'; delete st.err.uname; render(); return focusSel('#f-uname');
      case 'readlang': { const l = b.dataset.l; st.readLangs.has(l) ? st.readLangs.delete(l) : st.readLangs.add(l); return b.setAttribute('aria-pressed', st.readLangs.has(l)); }
      case 'genre': return toggleGenre(b);
      case 'more-genres': { st.moreOpen = true; const c = root.querySelector('#genre-chips'); if (c) c.innerHTML = genreChips(); const m = root.querySelector('#more-genres'); if (m) m.innerHTML = moreGenres(); return focusSel('#f-genre'); }
      case 'artist-add': {
        const item = st.artistRes.items.find(x => x.id === b.dataset.id);
        if (!item || st.artists.some(x => x.id === item.id)) return;
        if (st.artists.length >= D.artistMax) return toast(`Najviše ${D.artistMax} izvođača. Makni jednog da dodaš drugog.`);
        st.artists.push(Object.assign({}, item));
        updateDnaStep(); return focusSel('#f-artist');
      }
      case 'artist-remove': { st.artists = st.artists.filter(x => x.id !== b.dataset.id); updateDnaStep(); return focusSel('#f-artist'); }
      case 'artist-retry': runArtistSearch(); return focusSel('#f-artist');
      case 'remind-off': st.reminder = 'off'; return go('done', { reset: true });
      case 'remind-on': return openOverlay({ type: 'perm' }, b);
      case 'perm-allow': st.reminder = 'on'; st.overlay = null; return go('done', { reset: true });
      case 'perm-block': st.reminder = 'denied'; st.overlay = null; render(); return focusSel('.notice');
      case 'finish': return go('home', { reset: true });
      case 'calm': MOT.setCalm(!MOT.calm()); return render({ keep: true });
      case 'tab': return go(b.dataset.t, { reset: true });
      case 'open-drop': return go('drop');
      case 'open-compose': go('drop'); return openOverlay({ type: 'sheet' }, root.querySelector('[data-k="dock-field"]'));
      case 'compose': return openOverlay({ type: 'sheet' }, b);
      case 'cancel-compose': return cancelCompose();
      case 'ref-open': st.refOpen = true; render({ keep: true }); return focusSel('#f-refq');
      case 'ref-close': st.refOpen = false; st.refQ = ''; render({ keep: true }); return focusSel('[data-k="ref-open"], [data-k="f-ans"]');
      case 'ref-add': st.draftRefs.push(+b.dataset.i); if (st.draftRefs.length >= 3) { st.refOpen = false; st.refQ = ''; } render({ keep: true }); return focusSel(st.refOpen ? '#f-refq' : '[data-k="f-ans"]');
      case 'ref-remove': st.draftRefs.splice(+b.dataset.i, 1); render({ keep: true }); return focusSel('[data-k="ref-open"], #f-refq, [data-k="f-ans"]');
      case 'react': {
        const x = findAnswer(b.dataset.id); const r = b.dataset.r; const k = b.dataset.k; const i = x.myReacts.indexOf(r);
        i >= 0 ? x.myReacts.splice(i, 1) : x.myReacts.push(r);
        render({ keep: true });
        if (i < 0) { const nb = root.querySelector(`[data-k="${k}"]`); if (nb) { nb.classList.add('pressing'); setTimeout(() => nb.classList.remove('pressing'), 500); } }
        return;
      }
      case 'expand': { const id = b.dataset.id; st.expanded.has(id) ? st.expanded.delete(id) : st.expanded.add(id); return render({ keep: true }); }
      case 'comments': st.ctx = b.dataset.id; st.commentDraft = ''; return go('answer');
      case 'more': return openOverlay({ type: 'menu', id: b.dataset.id }, b);
      case 'menu': { const m = b.dataset.msg; closeOverlay(); return toast(m); }
      case 'overlay-close': return st.overlay && st.overlay.type === 'sheet' ? cancelCompose() : closeOverlay();
      case 'edit': return startEdit(b);
      case 'delete': return openOverlay({ type: 'delete' }, b);
      case 'delete-confirm':
        st.mine = null; st.overlay = null; render();
        focusSel('[data-k="dock-field"]');
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
      case 'f-pw': { st.pw = t.value; const m = root.querySelector('#pw-meter'); if (m) m.innerHTML = pwMeter(); return clearErr('pw', t); }
      case 'f-dname': st.displayName = t.value; return clearErr('dname', t);
      case 'f-uname': st.username = t.value.trim(); clearErr('uname', t); return checkUser();
      case 'f-artist': st.artistQ = t.value; return runArtistSearch();
      case 'f-genre': { st.genreQ = t.value; const m = root.querySelector('#more-genres'); if (m) { m.innerHTML = moreGenres(); const f = root.querySelector('#f-genre'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } return; }
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
    } else if (t.id === 'f-time') st.remTime = t.value;
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !st.overlay || st.overlay.type === 'perm') return;
    if (st.overlay.type === 'sheet') cancelCompose(); else closeOverlay();
  });

  /* ?at=<screen> opens a given screen with earlier steps filled in, so the review page can jump straight to it. */
  const ORDER = ['invite', 'age', 'uilang', 'account', 'username', 'language', 'visibility', 'dna', 'dnavis', 'how', 'reminder', 'done'];
  const AT = P.get('at');
  if (AT && !START_DROP && ORDER.includes(AT)) {
    const k = ORDER.indexOf(AT);
    const before = s => ORDER.indexOf(s) < k;
    if (before('age')) st.age = 'adult';
    if (before('account')) st.pw = 'primjer lozinke za skicu';
    if (before('username')) { st.displayName = 'Ana'; st.username = 'ana.slusa'; st.userState = 'ok'; }
    if (before('visibility')) st.vis = PRIV ? 'private' : 'public';
    if (before('dna') || (AT === 'dna' && P.get('picks') === '1')) { st.genres = ['Metal', 'Jazz', 'Techno', 'Kantautorska', 'Funk']; st.artists = [fx('Metallica'), fx('Nina Simone'), fx('Arsen Dedić'), fx('Charlotte de Witte')]; }
    if (AT === 'dna' && P.get('q')) st.artistQ = P.get('q');
    if (before('dnavis')) st.dnaVis = 'all';
    if (before('reminder')) st.reminder = 'off';
    st.screen = AT;
    const from = k < 3 ? 0 : 3;
    st.hist = AT === 'username' || AT === 'done' ? [] : ORDER.slice(from, k).map(s => ({ screen: s, y: 0 }));
  } else if (AT && START_DROP && ['hub', 'drop', 'answer', 'activity', 'profile'].includes(AT)) {
    st.screen = AT;
    if (AT === 'drop') st.hist = [{ screen: 'home', y: 0 }];
    if (AT === 'answer') { st.ctx = 'a1'; st.hist = [{ screen: 'home', y: 0 }, { screen: 'drop', y: 0 }]; }
    if (AT === 'drop' && P.get('open') === 'compose') st.overlay = { type: 'sheet', ret: 'dock-field' };
  }

  render();
  if (st.screen === 'dna' && st.artistQ) { runArtistSearch(); setTimeout(() => { const f = root.querySelector('#f-artist'); if (f) f.scrollIntoView({ block: 'start' }); }, 450); }
})();
