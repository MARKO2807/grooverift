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
    ctx: null, commentDraft: '', comRefs: [], comRefQ: '', comRefOpen: false,
    overlay: null,
    /* Round 12a: the member whose profile or answer history is open, the open follower list, pending requests the
       viewer sent, and what the viewer did with requests received (handle → 'ok' | 'no'). */
    who: null, listOf: null, list: 'followers', req: new Set(), reqDone: {}
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
     lower-case letter and a special character. One short line under the field names what is still missing (red) and
     turns green when every rule is met (D-062, replaces the ticked list). Breached passwords are still rejected with
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
  /* "a, b i c" */
  const andList = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' i ' + xs[xs.length - 1];
  function pwMeter() {
    const miss = pwMissing(st.pw), left = PW_MIN - pwLen(st.pw);
    /* The field error after "Napravi račun" says the same, so the line waits until the member types again. */
    const line = !st.pw || st.err.pw ? ''
      : !miss.length ? `<p class="pw-need ok" id="pw-need">${ic('check', 'sm')}<span>Lozinka ispunjava sva pravila.</span></p>`
      : `<p class="pw-need" id="pw-need">${ic('x', 'sm')}<span>Nedostaje: ${andList(miss.map(r => r[0] === 'len' ? `${left} ${pl(left, 'znak', 'znaka', 'znakova')}` : r[3]))}.</span></p>`;
    return line + `<p class="sr-only" role="status">${st.pw && !miss.length ? 'Lozinka ispunjava sva pravila.' : ''}</p>`;
  }

  function avatar(handle, who, size) {
    const m = D.members[handle];
    const dna = handle === st.username ? st.genres : (m ? m.dna : []);
    return `<span class="avatar${size ? ' ' + size : ''}" style="--ring:${DNA.ring(dna)}" aria-hidden="true"><span>${esc((who || '?')[0])}</span></span>`;
  }

  function field(o) {
    const err = st.err[o.id];
    const desc = [o.help ? `help-${o.id}` : '', o.desc || '', err ? `err-${o.id}` : ''].filter(Boolean).join(' ');
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
  /* A picked genre takes its own colour (D-062): border, a light fill and the tick. No coloured dot. In search
     results the parent genre is named next to a subgenre ("Death metal · Metal"). */
  function genreChip(name, fam, tile) {
    const on = st.genres.includes(name);
    const full = !on && st.genres.length >= D.genreMax;
    return `<button type="button" class="chip chip-genre" data-a="genre" data-g="${esc(name)}" data-k="g-${esc(name)}" aria-pressed="${on}"${full ? ' aria-disabled="true"' : ''} style="--g:${DNA.colorOf(name)}"><span class="ck">${ic('check', 'sm')}</span>${tile
      ? `<span class="g-txt"><span class="g-n">${esc(name)}</span>${fam ? `<span class="g-fam"><span class="sr-only">, </span>${esc(fam)}</span>` : ''}</span>`
      : esc(name)}</button>`;
  }
  /* Main 20 genres (D-062), then any picked genre from search, then the "+ Još žanrova" chip. */
  function genreChips() {
    const extra = st.genres.filter(g => !D.mainGenres.includes(g));
    return D.mainGenres.concat(extra).map(n => genreChip(n)).join('')
      + (st.moreOpen ? '' : `<button type="button" class="chip chip-more" data-a="more-genres" data-k="more-genres">${ic('plus', 'sm')}Još žanrova</button>`);
  }
  /* Genre search (D-062): every genre with traits, the MusicBrainz list and a few Croatian names. Matches the name,
     the start of any word, other spellings (genreAlias) and the parent, so "metal" also finds "Djent" and
     "klasična" finds "Baroque". Ranked: exact, starts with (name or alias), word starts with, contains, parent; inside each group better-known genres
     first (genres with traits, then by Wikipedia article count from genres-mb.js). */
  let GPOOL = null;
  function genrePool() {
    if (GPOOL) return GPOOL;
    const seen = new Set(), out = [];
    const add = (n, p, r) => {
      const k = CAT.fold(n); if (seen.has(k)) return; seen.add(k);
      out.push({ n, p: p && p !== n ? p : '', r, k, w: k.split(/[\s\-\/&]+/), pk: p ? CAT.fold(p) : '', pal: (D.genreAlias[p] || []).map(CAT.fold), al: (D.genreAlias[n] || []).map(CAT.fold) });
    };
    D.genres.forEach(g => add(g.n, '', 1000));
    D.moreGenres.forEach(([n, p, r]) => add(n, p, r || 0));
    return (GPOOL = out);
  }
  function genreHits(q) {
    const rank = g => g.k === q ? 0 : g.k.startsWith(q) || g.al.some(a => a.startsWith(q)) ? 1 : g.w.some(w => w.startsWith(q)) ? 2
      : g.k.includes(q) ? 3 : g.pk && (g.pk.startsWith(q) || g.pal.some(a => a.startsWith(q))) ? 4 : 9;
    return genrePool().filter(g => !st.genres.includes(g.n)).map(g => [rank(g), g]).filter(x => x[0] < 9)
      .sort((a, b) => a[0] - b[0] || b[1].r - a[1].r || a[1].k.localeCompare(b[1].k)).map(x => x[1]);
  }
  function moreGenres() {
    if (!st.moreOpen) return '';
    const q = CAT.fold(st.genreQ.trim());
    const all = q ? genreHits(q) : D.genreSuggest.map(n => genrePool().find(g => g.n === n)).filter(g => g && !st.genres.includes(g.n));
    const hits = all.slice(0, 12), more = all.length - hits.length;
    return `<div class="more-genres"><label class="label-sm" for="f-genre">Traži žanr</label>
        <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-genre" data-k="f-genre" type="search" autocomplete="off" value="${esc(st.genreQ)}" aria-describedby="genre-hint"></div>
        <p class="help" id="genre-hint">Ima ih još preko ${(Math.floor((genrePool().length - D.mainGenres.length) / 1000) * 1000).toLocaleString('hr-HR')}. Upiši naziv, npr. „heavy metal”.</p>
        ${hits.length ? `<div class="g-grid" id="genre-results">${hits.map(g => genreChip(g.n, g.p, true)).join('')}</div>` : '<p class="hint" id="genre-results">Nema tog žanra na popisu. U aplikaciji ga možeš predložiti.</p>'}
        ${more > 0 ? '<p class="hint g-more">Ovo su najpoznatiji. Nema tvog? Nastavi pisati.</p>' : ''}</div>`;
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
    root.querySelectorAll('[data-a="genre"]').forEach(b => {
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

  /* The "Daily Drop" name. Round 7 (D-063) tries five living versions (?ddn=a..e, see round7.html). Version e moves
     each letter, so the letters are separate spans with their own colour along the Coral→Amber gradient, and the
     name is read once from a hidden copy. */
  function ddName(cls, tag) {
    tag = tag || 'p';
    const c = `dd-name${cls ? ' ' + cls : ''}`;
    if (DDN_AT !== 'e') return `<${tag} class="${c}">Daily Drop</${tag}>`;
    const L = [...'Daily Drop'], hex = t => '#FF' + [[0x58, 0xCB], [0x6B, 0x69]].map(([a, b]) => Math.round(a + (b - a) * t).toString(16).padStart(2, '0').toUpperCase()).join('');
    return `<${tag} class="${c}"><span class="sr-only">Daily Drop</span><span class="ddn-letters" aria-hidden="true">${L.map((ch, i) => `<span style="--i:${i};color:${hex(i / (L.length - 1))}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</span></${tag}>`;
  }

  /* Name on top, date under it (style A, D-047), then the live current. */
  function ddHead(where, noCur) {
    return `<div class="dd-top">${ddName()}
      <p class="dd-date"><time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>${noCur ? '' : current('dd-' + where, 'md', 'dd-current')}</div>`;
  }
  function people(n) {
    if (!n) return '<p class="dd-meta"><span>Još nitko nije odgovorio.</span></p>';
    if (NET_OFF) return '';
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
        <h${hl} class="ans-who" id="h-${a.id}" tabindex="-1">${whoLink(a, 'who-' + a.id)}<span class="sr-only">, </span><span class="handle">@${esc(a.handle)}</span></h${hl}>
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

  /* Catalogue cards in the composer. Answers and comments (D-068) share one editor; RS maps each slot to its state keys and ids. */
  const RS = {
    ans: { refs: 'draftRefs', q: 'refQ', open: 'refOpen', field: 'f-ans', sfx: '' },
    com: { refs: 'comRefs', q: 'comRefQ', open: 'comRefOpen', field: 'f-com', sfx: '-com' }
  };
  const REF_MAX = 3;
  function refResults(k) {
    const S = RS[k || 'ans'], sel = st[S.refs];
    const q = CAT.fold(st[S.q].trim());
    if (q.length < 2) return '<li class="hint">Upiši barem dva slova.</li>';
    const hits = D.refs.map((r, i) => ({ r, i })).filter(x => !sel.includes(x.i) && (CAT.fold(x.r.title).includes(q) || CAT.fold(x.r.by).includes(q))).slice(0, 5);
    if (!hits.length) return '<li class="hint">Nema rezultata u katalogu.</li>';
    return hits.map(x => { const t = CAT.tile(x.r.title); return `<li><button type="button" class="result" data-a="ref-add" data-s="${k || 'ans'}" data-i="${x.i}" data-k="ref${S.sfx}-${x.i}">
      <span class="art art-gen" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span>
      <span class="r-body"><span class="r-title">${esc(x.r.title)}</span><span class="r-meta">${x.r.type}, ${esc(x.r.by)}</span></span><span class="r-add">${ic('plus', 'sm')}<span class="sr-only">Dodaj</span></span></button></li>`; }).join('');
  }
  function refsEditor(k) {
    const S = RS[k], sel = st[S.refs];
    const chips = sel.map((ri, j) => { const r = D.refs[ri]; const t = CAT.tile(r.title); return `<li class="ref-draft"><span class="ref ref-static"><span class="ref-art" style="background:${t.bg}" aria-hidden="true">${esc(t.ini)}</span><span class="ref-body"><span class="ref-title">${esc(r.title)}</span><span class="ref-by">${r.type}, ${esc(r.by)}</span></span></span>
      <button type="button" class="iconbtn sm" data-a="ref-remove" data-s="${k}" data-i="${j}" data-k="refrm${S.sfx}-${j}" aria-label="Ukloni ${esc(r.title)}">${ic('x', 'sm')}</button></li>`; }).join('');
    let more = '';
    if (st[S.open]) {
      more = `<div class="ref-search"><label class="label-sm" for="f-refq${S.sfx}">Traži album, pjesmu ili izvođača</label>
        <div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><input class="input" id="f-refq${S.sfx}" data-k="f-refq${S.sfx}" type="search" autocomplete="off" value="${esc(st[S.q])}"></div>
        <ul class="results" id="ref-results${S.sfx}">${refResults(k)}</ul>
        <button type="button" class="link" data-a="ref-close" data-s="${k}" data-k="ref-close${S.sfx}">Gotovo</button></div>`;
    } else if (sel.length < REF_MAX) {
      more = `<button type="button" class="add-ref" data-a="ref-open" data-s="${k}" data-k="ref-open${S.sfx}">${ic('plus', 'sm')}<span>Dodaj album, pjesmu ili izvođača</span></button>`;
    }
    return `${chips ? `<ul class="refs refs-draft">${chips}</ul>` : ''}${more}`;
  }
  function composerForm() {
    const err = st.err.ans;
    return `<form class="composer" data-form="answer" novalidate>
      <label class="composer-label sr-only" for="f-ans">${st.editing ? 'Uredi svoj odgovor' : 'Tvoj odgovor'}</label>
      <textarea class="textarea" id="f-ans" data-k="f-ans" rows="6" placeholder="Napiši odgovor…"${err ? ' aria-invalid="true" aria-describedby="err-ans"' : ''}>${esc(st.draft)}</textarea>
      ${err ? fieldErr('ans', err) : ''}
      ${refsEditor('ans')}
      ${audience('answer')}
      ${st.postErr ? `<div class="post-err" role="alert">${ic('alert')}<p><b>Odgovor nije objavljen.</b> Veza je pukla. Tekst je ostao ovdje, pokušaj ponovno.</p></div>` : ''}
      ${NET_OFF ? `<p class="post-off" id="post-off">${ic('offline', 'sm')}<span>Objava treba mrežu. Tekst ostaje ovdje dok je stranica otvorena.</span></p>` : ''}
      <div class="composer-actions">
        <button type="button" class="btn btn-secondary" data-a="cancel-compose" data-k="cancel">Odustani</button>
        <button type="submit" class="btn btn-primary" data-k="post" aria-describedby="aud${NET_OFF ? ' post-off' : ''}"${NET_OFF ? ' disabled' : ''}>${st.postErr ? 'Pokušaj ponovno' : st.editing ? 'Spremi' : 'Objavi'}</button>
      </div>
    </form>`;
  }

  function teaserActions(one) {
    if (one && !st.mine) return '<button class="btn btn-primary btn-cta btn-invite" data-a="open-compose" data-k="open-compose">Odgovori</button>';
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
  /* Archived questions stay open for answers (D-036), so the archive says so. */
  const PAST_MSG = 'Ovdje bi se otvorilo to pitanje s odgovorima. Na starija pitanja i dalje možeš odgovoriti, a uz odgovor piše datum (D-036).';
  function pastList(title, max, from) {
    from = from || 0;
    return `<section class="section" aria-labelledby="h-past">
      <h2 id="h-past" class="section-title">${title}</h2>
      <ul class="past">${D.pastDrops.slice(from, from + (max || 99)).map((d, i) => `<li><button class="past-item" data-a="toast" data-msg="${PAST_MSG}" data-k="past-${i}">
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
      <ol class="how how-fill">
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
  const HOME_AT = pick('home', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 'e'); // chosen: e, one call to action (D-064)
  document.documentElement.classList.add('home-' + HOME_AT);
  const PROF_AT = pick('prof', ['a', 'b', 'c'], 'c');
  const NAV_AT = pick('nav', ['solid', 'glass', 'float', 'ember'], 'glass');
  if (NAV_AT !== 'solid') document.documentElement.classList.add('nav-' + NAV_AT);
  /* Large text (D-073): the tab bar shows only the open tab's label (lt=a, chosen); ?lt=b|c show the rejected options and ?lth=full the rejected full-size headings. CSS: the large-text block in style.css. */
  const LT_AT = pick('lt', ['a', 'b', 'c'], 'a');
  document.documentElement.classList.add('lt-' + LT_AT);
  if (pick('lth', ['step', 'full'], 'step') === 'full') document.documentElement.classList.add('lth-full');

  /* Round 7 (owner, session 11; D-063). The example question in the reminder notification is a separate, more personal
     question (owner: "cool i baš connecting"); ?nq=1..4 shows the candidates compared in round7.html.
     ?ddn=a..e shows the five living Daily Drop names; ?home= and ?hub= the new layouts (see round7.html). */
  const NOTIF_QS = ['Koja te pjesma zbližila s nekim?', 'Koja pjesma najbolje govori tko si?', 'Koja te pjesma uvijek vrati jednoj osobi?', 'Koju pjesmu svi u tvom društvu znaju napamet?'];
  const NOTIF_Q = NOTIF_QS[+pick('nq', ['1', '2', '3', '4'], '2') - 1]; // chosen: 2 (D-064)
  const DDN_AT = pick('ddn', ['none', 'a', 'b', 'c', 'd', 'e'], 'c'); // chosen: c "Strujica" (D-064); none = the plain name
  if (DDN_AT) document.documentElement.classList.add('ddn-' + DDN_AT);
  const HUB_AT = pick('hub', ['a', 'b', 'c', 'd', 'e'], 'e'); // chosen: e = the seven days of c with the programme of d (D-064)

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
        <table class="vrow-table" role="table"><thead role="rowgroup"><tr role="row"><td role="cell"></td><th scope="col" role="columnheader">Javno</th><th scope="col" role="columnheader">Privatno</th></tr></thead>
        <tbody role="rowgroup">${VIS_TABLE.map(([k, a, b]) => `<tr role="row"><th scope="row" role="rowheader">${k}</th><td role="cell" data-l="Javno">${a}</td><td role="cell" data-l="Privatno">${b}</td></tr>`).join('')}</tbody></table></details>` : ''}
      <p class="fine fine-left">Music DNA možeš dodatno suziti u sljedećim koracima.</p>`;
  }

  /* Home: the Daily Drop in four arrangements. */
  function answerPeek(a) {
    return `<li><button class="peek" data-a="open-drop" data-k="peek-${a.id}">${avatar(a.handle, a.who, 'xs')}<span class="peek-body"><span class="peek-who">${esc(a.who)}</span><span class="peek-text"${a.lang ? ` lang="${a.lang}"` : ''}>${esc(a.text)}</span></span></button></li>`;
  }
  function homeBody() {
    return pwBanner() + homeMain();
  }
  function homeMain() {
    const follow = `<section class="section" aria-labelledby="h-follow"><h2 id="h-follow" class="section-title">Od ljudi koje pratiš</h2>
      ${emptyBox(pic('users-three', 'empty-ic'), 'Još nikoga ne pratiš.', 'Ljude možeš pronaći kroz odgovore na Daily Drop.')}</section>`;
    const past = pastList('Prethodni Daily Dropovi', 3, STATE === 'nodrop' ? 1 : 0);
    /* Round 10 states (IA §6.2 HOME-01): placeholders while loading, yesterday's Drop when today's is late (J3 E2). */
    if (STATE === 'loading') return `<div aria-busy="true">${skelDrop()}${skel(2, 'peek')}</div>${follow}`;
    if (STATE === 'nodrop') return noDropBlock() + follow + past;
    if (HOME_AT === 'a') return dropTeaser() + follow + past;
    if (HOME_AT === 'b') return dropTeaser(true) + follow + past;
    const n = allAnswers().length, peeks = allAnswers().slice(0, ['c', 'e', 'f'].includes(HOME_AT) ? 2 : 3);
    const eyebrow = `<p class="dd-eyebrow"><span class="dd-name dd-name-sm">Daily Drop</span><time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>`;
    /* Round 7 (D-063), owner: a smaller button or question, or narrower side margins.
       e: the same order as c, with a smaller question, a smaller button next to the read link and narrower margins.
       f: one card with a living Coral→Amber edge (as on "Kako radi"), left-aligned; the first answers follow.
       g: edge to edge with no card, left-aligned; the first answers scroll sideways. */
    const allLink = `<button class="link" data-a="open-drop" data-k="all-ans">Pogledaj sve odgovore (${n})</button>`;
    if (HOME_AT === 'e') return `<section class="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser">
        ${ddHead('home', true)}
        <h2 id="h-teaser" class="dd-q">${esc(D.drop.question)}</h2>
        ${people(n)}
        <div class="dd-actions dd-actions-inline">${teaserActions(true)}</div>
        ${NET_OFF ? netHint('Odgovori trebaju mrežu. Učitat će se kad se veza vrati.')
          : STATE === 'error' && !st.loadOk ? loadErr('Prvi odgovori nisu se učitali.', 'retry-peeks')
          : peeks.length ? `<ul class="peeks" aria-label="Prvi odgovori">${peeks.map(answerPeek).join('')}${allPeekCard(n, peeks)}</ul>
        ${allAnswersLink(n, peeks)}` : ''}
      </section>` + follow + past;
    if (HOME_AT === 'f') return `<section class="dd-card dd-live" aria-labelledby="h-teaser">
        <p class="dd-eyebrow">${ddName('dd-name-sm', 'span')}<time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>
        <h2 id="h-teaser" class="dd-q dd-q-sm">${esc(D.drop.question)}</h2>
        ${people(n)}
        <div class="dd-actions dd-actions-row">${teaserActions()}</div>
      </section>
      <section class="section" aria-labelledby="h-peek"><h2 id="h-peek" class="section-title">Prvi odgovori</h2>
        <ul class="peeks">${peeks.map(answerPeek).join('')}</ul>${allLink}</section>` + follow + past;
    if (HOME_AT === 'g') return `<section class="dd-g" aria-labelledby="h-teaser">
        <p class="dd-eyebrow">${ddName('dd-name-sm', 'span')}<time datetime="${D.drop.date}">${longDate(D.drop.date)}</time></p>
        <h2 id="h-teaser" class="dd-q dd-q-sm">${esc(D.drop.question)}</h2>
        ${people(n)}
        <div class="dd-actions dd-actions-row">${teaserActions()}</div>
        <ul class="peeks peeks-row" aria-label="Prvi odgovori" data-noswipe>${allAnswers().slice(0, 4).map(answerPeek).join('')}</ul>
        ${allLink}
      </section>` + follow + past;
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

  /* Hub (HUB-01) in four arrangements, round 7 (D-063). Home is the member's own start page: today's Drop with the
     first answers and, from B1, the feed (HOME-01). The Hub is the editorial programme and its archive (§6).
     a: today, without the current under the name (owner, D-063). b: compact, the archive grouped by month.
     c: a strip of the last seven days; each day opens its question. d: the full Hub from B2 (Weekly Poll and
     Did You Know?), shown so the difference from Home is visible. The poll and the fact are sample content. */
  const suggestBtn = () => '<button class="btn btn-secondary btn-block" data-a="toast" data-msg="Predlaganje pitanja (HUB-09) nije dio ove skice." data-k="suggest">Predloži pitanje</button>';
  function hubDrop() {
    return `<section class="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser">${ddHead('hub', true)}
      <h2 id="h-teaser" class="dd-q">${esc(D.drop.question)}</h2>${people(allAnswers().length)}
      <div class="dd-actions dd-actions-inline">${teaserActions()}</div></section>`;
  }
  function hubBody() {
    if (HUB_AT === 'b') {
      const months = [];
      D.pastDrops.forEach(d => { const p = dparts(d.date), k = cap(p.mn) + ' ' + d.date.slice(0, 4); let m = months.find(x => x.k === k); if (!m) months.push(m = { k, items: [] }); m.items.push(d); });
      return hubDrop() + `<section class="section" aria-labelledby="h-past"><h2 id="h-past" class="section-title">Arhiva</h2>
        ${months.map((m, j) => `<h3 class="month-title">${m.k}</h3><ul class="past past-compact">${m.items.map((d, i) => `<li><button class="past-item" data-a="toast" data-msg="${PAST_MSG}" data-k="past-${j}-${i}">
          <span class="past-day" aria-hidden="true">${dparts(d.date).day}.</span><span class="past-q">${esc(d.q)}</span><span class="sr-only">, ${longDate(d.date)}</span>${ic('chevron', 'past-ic')}</button></li>`).join('')}</ul>`).join('')}
        <button class="link" data-a="toast" data-msg="Ovdje bi se otvorila cijela arhiva po mjesecima (HUB-04)." data-k="all-months">Svi mjeseci</button></section>${suggestBtn()}`;
    }
    if (HUB_AT === 'c' || HUB_AT === 'e') {
      const days = [{ date: D.drop.date, q: D.drop.question, today: true }].concat(D.pastDrops).slice(0, 7).reverse();
      const sel = days.find(d => d.date === st.hubDay) || days[days.length - 1];
      return `<div class="day-strip" role="group" aria-label="Zadnjih sedam dana" data-noswipe>${days.map(d => { const p = dparts(d.date); return `<button class="day" data-a="hub-day" data-d="${d.date}" data-k="day-${d.date}" aria-pressed="${d === sel}" aria-label="${longDate(d.date)}${d.today ? ', danas' : ''}"><span class="day-wd">${d.today ? 'danas' : p.wd3}</span><span class="day-n">${p.day}</span></button>`; }).join('')}</div>
        ${sel.today ? (STATE === 'nodrop' ? noDropBlock() : STATE === 'loading' ? skelDrop() : hubDrop()) : `<section class="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser"><div class="dd-top">${ddName()}<p class="dd-date"><time datetime="${sel.date}">${longDate(sel.date)}</time></p></div>
          <h2 id="h-teaser" class="dd-q">${esc(sel.q)}</h2>${pastMeta(sel)}<p class="dd-still">Još uvijek možeš odgovoriti.</p>
          <div class="dd-actions dd-actions-inline"><button class="btn btn-primary btn-cta" data-a="toast" data-msg="${PAST_MSG}" data-k="past-answer">Odgovori</button><button class="link read-link" data-a="toast" data-msg="${PAST_MSG}" data-k="past-read">Pročitaj odgovore</button></div></section>`}
        ${HUB_AT === 'e' ? hubProgramme() : `<button class="link" data-a="toast" data-msg="Ovdje bi se otvorila cijela arhiva po mjesecima (HUB-04)." data-k="all-months">Cijela arhiva</button>${suggestBtn()}`}`;
    }
    if (HUB_AT === 'd') return hubDrop() + hubProgramme();
    return `${dropTeaser(true)}${pastList('Arhiva')}${suggestBtn()}`;
  }
  /* The programme under the Daily Drop: this week's Weekly Poll and Did You Know? (B2, sample content), the archives
     and "Predloži pitanje". How far back the archives reach is OPEN (OQ-28). */
  function hubProgramme() {
    return `<section class="section" aria-labelledby="h-week"><h2 id="h-week" class="section-title">Ovaj tjedan <span class="soon">od B2, primjer</span></h2>
        <article class="prog-card" aria-labelledby="h-poll"><p class="prog-tag">${pic('chart-bar-horizontal', 'prog-ic')}<span lang="en">Weekly Poll</span></p>
          <h3 id="h-poll" class="prog-t">Koje desetljeće ima najbolje debitantske albume?</h3><p class="prog-d">Rezultate vidiš kad glasaš. Zatvara se u nedjelju.</p>
          <button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Weekly Poll (HUB-05) stiže u valu B2." data-k="poll">Glasaj</button></article>
        <article class="prog-card" aria-labelledby="h-dyk"><p class="prog-tag">${pic('lightbulb-filament', 'prog-ic')}<span lang="en">Did You Know?</span></p>
          <h3 id="h-dyk" class="prog-t">Kind of Blue Milesa Davisa snimljen je u samo dva dana snimanja, 1959.</h3><p class="prog-d">S izvorima. Provjerila redakcija.</p>
          <button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Did You Know? (HUB-07) stiže u valu B2." data-k="dyk">Pročitaj</button></article></section>
      <section class="section" aria-labelledby="h-arch"><h2 id="h-arch" class="section-title">Arhive</h2><ul class="past">${[['Daily Drop', 'Svako pitanje od prvog dana'], ['Weekly Poll', 'Sve ankete i rezultati'], ['Did You Know?', 'Sve priče s izvorima']].map(([t, d], i) => `<li><button class="past-item" data-a="toast" data-msg="Arhive (HUB-04, HUB-06, HUB-08) nisu dio ove skice." data-k="arch-${i}"><span class="past-q" lang="en">${t}</span><span class="past-date">${d}</span>${ic('chevron', 'past-ic')}</button></li>`).join('')}</ul></section>${suggestBtn()}`;
  }

  /* Profile page in three arrangements. Counts and the bio are fictional placeholders. */
  const profDna = h => st.genres.length ? `<figure class="dna-card">${dnaCanvas('profile', h)}<figcaption><span class="dna-hint" aria-hidden="true">Dodirni spiralu</span>${dnaText()}</figcaption></figure>` : '<p class="empty">Još nema odabira.</p>';
  const profArtists = () => st.artists.length ? `<ul class="portraits portraits-sm" aria-label="Izvođači">${st.artists.map(a => `<li>${artistTile(a)}<span class="p-name">${esc(a.name)}</span></li>`).join('')}</ul>` : '';
  /* Settings (SET-01). Entered from the gear at the top right of the member's own profile (D-063), as on Instagram,
     TikTok and Spotify (docs/research/2026-11-02-settings-benchmark.md). Round 8 (owner, D-065): no separate "download
     your data" row (PENDING: GDPR export, OQ-30), "Deaktiviraj ili obriši račun" at the very bottom, and the account
     status shown quietly at the top. Four arrangements, ?set=a..d, compared in round8.html.
     a: groups with titles, the status as one quiet line on top. b: a profile card on top with the status inside it.
     c: one flat list without group titles and plain icons. d: a search field on top that filters the rows.
     Only "Smanji pokrete" and the search work; every other row says which screen it opens. */
  const SET_AT = pick('set', ['a', 'b', 'c', 'd'], 'b'); // chosen: b, the profile card (D-066)
  const SET_GROUPS = () => [
    ['Račun', [
      ...(SET_AT === 'b' ? [] : [['user-circle', 'Uredi profil', 'Ime za prikaz, bio i slika', 'PROF-08']]),
      ['user', 'Račun', `E-pošta, lozinka, Google, @${esc(st.username || 'ti')}`, 'SET-02, SET-03'],
      ['shield-check', 'Sigurnost', 'Dvostruka provjera, uređaji i odjava sa svih', 'SET-04']]],
    ['Privatnost', [
      ['lock', 'Privatnost', `${VIS_LABEL[st.vis] || 'Privatni'} profil · Music DNA: ${(DNA_LABEL[st.dnaVis] || 'Samo ja').toLowerCase()}`, 'SET-05'],
      ['x', 'Blokirani i utišani', 'Nitko', 'SAFE-08']]],
    ['Aplikacija', [
      ['bell', 'Obavijesti', st.reminder === 'on' ? `Daily Drop u ${st.remTime}` : 'Daily Drop podsjetnik isključen', 'SET-06'],
      ['globe-hemisphere-east', 'Jezik i regija', 'Hrvatski · Zagreb', 'SET-07'],
      ['motion', 'Pristupačnost', 'Smanji pokrete', '']]],
    ['Pomoć i informacije', [
      ['question', 'Pomoć i povratne informacije', '', 'SET-12'],
      ['users', 'Pravila zajednice', '', 'PUB-11'],
      ['info', 'Uvjeti, privatnost i kolačići', '', 'PUB-10'],
      ['pulse', 'O GrooveRiftu', 'Kontakt, impresum, licence, verzija', '']]]
  ];
  const setIcon = n => ['user', 'lock', 'x', 'check', 'bell', 'trash', 'users', 'info', 'pulse'].includes(n) ? ic(n, 'set-ic') : pic(n, 'set-ic');
  const STATUS_MSG = 'Status računa (SAFE-04, SAFE-05): ovdje bi pisala upozorenja i odluke moderacije s obrazloženjem i mogućnošću žalbe. Sad nema ničega.';
  const DELETE_MSG = 'Deaktivacija ili brisanje (SET-09): ponovna prijava, točan datum brisanja i 30 dana da se predomisliš. Prije brisanja nudi i kopiju tvojih podataka (D-066).';
  const setStatus = cls => `<button class="set-status${cls ? ' ' + cls : ''}" data-a="setsub" data-s="status" data-k="set-status">${ic('check', 'sm')}<span>Račun je u redu</span><span class="sr-only">, status računa</span></button>`;
  const SUBKEY = { 'Uredi profil': 'profile', 'Račun': 'account', 'Sigurnost': 'security', 'Privatnost': 'privacy', 'Blokirani i utišani': 'blocked', 'Obavijesti': 'notifications', 'Jezik i regija': 'language', 'Pomoć i povratne informacije': 'help', 'Pravila zajednice': 'rules', 'Uvjeti, privatnost i kolačići': 'terms', 'O GrooveRiftu': 'about' };
  function setRow(r, k) {
    const [i, t, d, id] = r;
    if (i === 'motion') return `<li class="set-row set-row-switch"><span class="set-ic-wrap" aria-hidden="true">${pic('sliders-horizontal', 'set-ic')}</span><span class="set-txt"><span class="set-t" id="calm-l">Smanji pokrete</span><span class="set-d" id="calm-d">Pristupačnost. Struja, iskra i Music DNA miruju. Isto vrijedi ako je to uključeno na uređaju.</span></span>
        <button type="button" class="switch" role="switch" aria-checked="${MOT.calm()}" aria-labelledby="calm-l" aria-describedby="calm-d" data-a="calm" data-k="calm"><span></span></button></li>`;
    return `<li><button class="set-row" data-a="setsub" data-s="${SUBKEY[t]}" data-k="set-${k}"><span class="set-ic-wrap" aria-hidden="true">${setIcon(i)}</span><span class="set-txt"><span class="set-t">${t}</span>${d ? `<span class="set-d">${d}</span>` : ''}</span>${ic('chevron', 'sm set-go')}</button></li>`;
  }
  function settingsBody() {
    const groups = SET_GROUPS();
    const q = SET_AT === 'd' ? CAT.fold((st.setQ || '').trim()) : '';
    const list = (rows, k) => rows.map((r, ri) => setRow(r, k + '-' + ri)).join('');
    let top = '', body;
    if (SET_AT === 'b') top = `<button class="set-me" data-a="setsub" data-s="profile" data-k="set-me">${avatar(st.username, st.displayName || 'T', 'sm')}<span class="set-txt"><span class="set-t">${esc(st.displayName || 'Ti')}</span><span class="set-d">@${esc(st.username || 'ti')} · Uredi profil</span></span>${ic('chevron', 'sm set-go')}</button>${setStatus('set-status-in')}`;
    else if (SET_AT === 'd') top = `<div class="input-wrap has-prefix"><span class="prefix" aria-hidden="true">${ic('search', 'sm')}</span><label class="sr-only" for="f-setq">Traži u postavkama</label><input class="input" id="f-setq" data-k="f-setq" type="search" autocomplete="off" placeholder="Traži u postavkama" value="${esc(st.setQ || '')}"></div>${setStatus()}`;
    else top = setStatus();
    if (SET_AT === 'c') body = `<ul class="set-list set-flat">${groups.map(([, rows], gi) => list(rows, gi)).join('<li class="set-gap" aria-hidden="true"></li>')}</ul>`;
    else if (q) {
      const hits = groups.flatMap(([, rows], gi) => rows.map((r, ri) => [r, gi + '-' + ri])).filter(([r]) => CAT.fold(r[1] + ' ' + r[2]).includes(q));
      body = hits.length ? `<ul class="set-list">${hits.map(([r, k]) => setRow(r, k)).join('')}</ul>` : '<p class="hint">Nema takve postavke.</p>';
    } else body = groups.map(([g, rows], gi) => `<section class="set-group" aria-labelledby="sg-${gi}"><h2 class="set-gt" id="sg-${gi}">${g}</h2><ul class="set-list">${list(rows, gi)}</ul></section>`).join('');
    return `${top}<div id="set-body" class="set-body">${body}</div>
      <button class="btn btn-secondary btn-block set-out" data-a="logout" data-k="logout">${pic('sign-out', 'set-ic')}Odjavi se</button>
      <button class="set-delete" data-a="setsub" data-s="delete" data-k="set-delete">${ic('trash', 'sm')}Deaktiviraj ili obriši račun</button>
      <p class="meta set-ver">${wm()} alfa · skica 3.5</p>`;
  }
  const profAnswers = () => `<section class="section" aria-labelledby="h-pdd"><h2 id="h-pdd" class="section-title">Daily Drop odgovori</h2>
      ${st.mine ? `<ul class="past"><li><button class="past-item" data-a="open-drop" data-k="prof-ans"><span class="past-date">${longDate(D.drop.date)}</span><span class="past-q">${esc(D.drop.question)}</span>${ic('chevron', 'past-ic')}</button></li></ul>` : emptyBox(pic('calendar-dots', 'empty-ic'), 'Još nema odgovora.', 'Tvoji odgovori na Daily Drop skupljaju se ovdje.')}
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
      ${profAnswers()}
      <p class="meta">Brojke i bio su izmišljeni. Ostatak profila (J4) nije dio ove skice.</p>`;
    if (PROF_AT === 'c') return `<div class="pf-c">
        ${st.genres.length ? `<figure class="pf-c-hero">${dnaCanvas('profile', 200)}<figcaption>${dnaText()}</figcaption></figure>` : ''}
        <div class="pf-c-id">${avatar(st.username, st.displayName || 'T', 'lg')}<div><h1 class="prof-name">${name}</h1><p class="meta">@${handle}</p></div></div></div>
      <p class="pf-bio">${BIO}</p>
      ${profRow()}
      ${profVis()}${profBtns()}
      ${st.artists.length ? `<section class="section" aria-labelledby="h-part"><h2 id="h-part" class="section-title">Izvođači</h2>${profArtists()}</section>` : ''}
      ${profAnswers()}
      <p class="meta">Brojke i bio su izmišljeni. Ostatak profila (J4) nije dio ove skice.</p>`;
    return `<div class="prof-head">${avatar(st.username, st.displayName || 'T', 'lg')}
        <div><h1 class="prof-name">${name}</h1><p class="meta">@${handle}</p></div></div>
      <section class="section" aria-labelledby="h-pdna"><h2 id="h-pdna" class="section-title">Music DNA</h2>${profDna(184)}${profArtists()}</section>
      <dl class="facts-grid">
        <div>${ic(st.vis === 'public' ? 'globe' : 'lock', 'ft-ic')}<dt>Profil</dt><dd>${VIS_LABEL[st.vis] || 'Privatni (nije odabrano)'}</dd></div>
        <div>${ic('users', 'ft-ic')}<dt>DNA vide</dt><dd>${DNA_LABEL[st.dnaVis] || 'Samo ja'}</dd></div>
      </dl>
      ${profAnswers()}
      <p class="meta">Ostatak profila (J4) nije dio ove skice.</p>`;
  }

  /* ---------- Round 9 (owner, session 11; D-067). Options compared in round9.html. ----------
     ?age18=a|b|c   a confirmation after "Da, imam 18 ili više" (default: none until the owner chooses)
     ?all=a|b|c|d   how Home shows "Pogledaj sve odgovore"
     ?past=a|b|c    a past day on the Hub: what is shown above "Još uvijek možeš odgovoriti"
     ?act=a|b|c     the Activity screen with sample items
     ?prow=a|b|c|d  the counts row on the profile
     Settings rows open real sub-screens (screen "setsub", ?flow=drop&at=setsub&s=<key>). */
  const AGE18_AT = pick('age18', ['none', 'a', 'b', 'c'], 'a'); // chosen: a (D-068); none = no confirmation
  const ALL_AT = pick('all', ['a', 'b', 'c', 'd'], 'c'); // chosen: c, faces (D-068)
  const PAST_AT = pick('past', ['a', 'b', 'c'], 'a'); // chosen: a, answers only (D-068)
  const ACT_AT = pick('act', ['a', 'b', 'c'], 'a'); // chosen: a, by day (D-068)
  const PROW_AT = pick('prow', ['a', 'b', 'c', 'd'], 'b'); // chosen: b, three columns (D-068)

  /* Home: the link to all answers, four ways. */
  function allAnswersLink(n, peeks) {
    const rest = Math.max(0, n - peeks.length);
    if (!rest) return '';
    if (ALL_AT === 'b') return `<button class="btn btn-secondary btn-block all-b" data-a="open-drop" data-k="all-ans">Svi odgovori <span class="all-n">${n}</span>${ic('chevron', 'sm')}</button>`;
    if (ALL_AT === 'c') return `<button class="all-c" data-a="open-drop" data-k="all-ans"><span class="stack" aria-hidden="true">${allAnswers().slice(peeks.length, peeks.length + 3).map(a => avatar(a.handle, a.who, 'xs')).join('')}</span><span>Pročitaj još ${rest} ${plAns(rest)}</span>${ic('chevron', 'sm')}</button>`;
    if (ALL_AT === 'd') return '';
    return `<button class="link" data-a="open-drop" data-k="all-ans">Pogledaj sve odgovore (${n})</button>`;
  }
  /* d: the link becomes the last item of the answer list, a small "+5" card. */
  const allPeekCard = (n, peeks) => ALL_AT === 'd' ? `<li><button class="peek peek-more" data-a="open-drop" data-k="all-ans"><span class="peek-plus">+${n - peeks.length}</span><span class="peek-body"><span class="peek-who">Još ${n - peeks.length} ${plAns(n - peeks.length)}</span><span class="peek-text">Pročitaj sve odgovore na današnje pitanje</span></span>${ic('chevron', 'sm')}</button></li>` : '';

  /* Hub: a past day. Counts are fictional (data.js pastDrops). */
  function pastMeta(d) {
    const who = Object.keys(D.members).slice(0, 3);
    const stack = `<span class="stack" aria-hidden="true">${who.map(h => avatar(h, D.members[h].who, 'xs')).join('')}</span>`;
    if (PAST_AT === 'b') return `<p class="dd-meta">${stack}<span>${d.n} ${plAns(d.n)} · ${d.c} ${pl(d.c, 'komentar', 'komentara', 'komentara')}</span></p>`;
    if (PAST_AT === 'c') return `<dl class="past-stats"><div><dt>Odgovori</dt><dd>${d.n}</dd></div><div><dt>Komentari</dt><dd>${d.c}</dd></div><div><dt>Reakcije</dt><dd>${d.r}</dd></div></dl>`;
    return `<p class="dd-meta">${stack}<span>${d.n} ${plAns(d.n)}</span></p>`;
  }

  /* Activity (ACT-01) with sample items. Unread items have a soft tint, not a dot. Texts use the present tense, which
     is the same for every gender in Croatian (the app does not know a member's gender). */
  const ACT_ITEMS = [
    { t: 'com', when: 'Danas', time: 'prije 5 min', who: 'lukabass', txt: '<b>Luka</b> komentira tvoj odgovor: „Slažem se, Blue in Green mi je bio ulaz.”', unread: true },
    { t: 'react', when: 'Danas', time: 'prije 1 h', who: 'petra.zvuk', txt: 'Reakcije na tvoj odgovor: <b>Petra</b>, <b>Tin</b> i još 3.', unread: true },
    { t: 'req', when: 'Danas', time: 'prije 2 h', who: 'mia_vinyl', txt: '<b>Mia</b> želi te pratiti.' },
    { t: 'drop', when: 'Danas', time: '01:00', txt: '<b>Daily Drop je stigao:</b> „Koji album bi dao nekome tko misli da ne voli jazz?”' },
    { t: 'follow', when: 'Ovaj tjedan', time: 'pet', who: 'tinkovac', txt: '<b>Tin</b> te sada prati.' },
    { t: 'sugg', when: 'Ovaj tjedan', time: 'sri', txt: 'Tvoj prijedlog pitanja je objavljen: „Koju pjesmu najčešće šalješ prijateljima?”' },
    { t: 'com', when: 'Ovaj tjedan', time: 'uto', who: 'mia_vinyl', txt: '<b>Mia</b> odgovara na tvoj komentar.' }
  ];
  const ACT_KIND = { com: 'Komentari', react: 'Reakcije', req: 'Praćenja', follow: 'Praćenja', drop: 'Daily Drop', sugg: 'Daily Drop' };
  function actRow(x, i) {
    const lead = x.who ? avatar(x.who, (D.members[x.who] || { who: x.who }).who, 'sm') : `<span class="act-ic" aria-hidden="true">${x.t === 'drop' ? pic('calendar-dots') : ic('check', 'sm')}</span>`;
    const tail = x.t === 'react' ? `<span class="act-wave" aria-hidden="true">${WAVE}</span>` : '';
    const btns = x.t === 'req' ? `<span class="act-btns"><button class="btn btn-primary btn-sm" data-a="req-ok" data-h="${x.who}" data-k="act-ok-${i}">Prihvati</button><button class="btn btn-secondary btn-sm" data-a="req-no" data-h="${x.who}" data-k="act-no-${i}">Odbij</button></span>` : '';
    return `<li class="act${x.unread ? ' act-new' : ''}">${lead}<div class="act-body"><p class="act-txt">${x.txt}${x.unread ? '<span class="sr-only">, novo</span>' : ''}</p><p class="act-time">${x.time}</p>${btns}</div>${tail}</li>`;
  }
  function activityBody() {
    /* Round 10 states (IA §6.2 ACT-01): never cached, so offline says so; items from blocked accounts are removed. */
    if (NET_OFF) return netHint('Aktivnost treba mrežu. Učitat će se kad se veza vrati.');
    if (STATE === 'loading') return skel(5, 'act');
    if (STATE === 'error' && !st.loadOk) return loadErr('Obavijesti se nisu učitale.', 'retry-act');
    if (STATE === 'empty') return emptyBox(ic('bell', 'empty-ic'), 'Još nema obavijesti.', 'Ovdje stižu komentari, reakcije i novi pratitelji.');
    /* Round 12a: follow requests exist only while the profile is private (J4). Option a (and c) puts one row on top
       that opens ACT-02; b (and c) keeps them inline as in D-068. */
    const pend = pendingReqs();
    let items = ACT_ITEMS.filter(x => x.t !== 'req' || (REQ_AT !== 'a' && pend.includes(x.who))).map((x, i) => [x, i]);
    let head = pend.length && REQ_AT !== 'b' ? `<button class="all-c req-entry" data-a="open-requests" data-k="open-requests"><span class="stack" aria-hidden="true">${pend.slice(0, 3).map(h => avatar(h, member(h).who, 'xs')).join('')}</span><span>Zahtjevi za praćenje<b class="req-n">${pend.length}</b></span>${ic('chevron', 'sm')}</button>` : '';
    if (ACT_AT === 'b') {
      const reqs = items.filter(([x]) => x.t === 'req');
      items = items.filter(([x]) => x.t !== 'req');
      head += `<section class="act-req" aria-labelledby="h-req"><h2 id="h-req" class="set-gt">Zahtjevi za praćenje <span class="count">${reqs.length}</span></h2><ul class="act-list">${reqs.map(([x, i]) => actRow(x, i)).join('')}</ul></section>`;
    }
    if (ACT_AT === 'c') {
      const f = st.actF || 'Sve';
      head += `<fieldset class="sort act-filter"><legend class="sr-only">Prikaži</legend>${['Sve', 'Komentari', 'Reakcije', 'Praćenja', 'Daily Drop'].map(v => `<label><input type="radio" name="actf" value="${v}" data-k="actf-${v}"${f === v ? ' checked' : ''}><span>${v}</span></label>`).join('')}</fieldset>`;
      if (f !== 'Sve') items = items.filter(([x]) => ACT_KIND[x.t] === f);
    }
    const groups = [];
    items.forEach(([x, i]) => { let g = groups.find(y => y.k === x.when); if (!g) groups.push(g = { k: x.when, rows: [] }); g.rows.push(actRow(x, i)); });
    return head + (groups.length ? groups.map((g, j) => `<section aria-labelledby="h-act-${j}"><h2 class="set-gt" id="h-act-${j}">${g.k}</h2><ul class="act-list">${g.rows.join('')}</ul></section>`).join('') : '<p class="empty">Ovdje još nema ničega.</p>')
      + '<p class="meta">Primjeri su izmišljeni. Zahtjevi za praćenje stižu samo ako je profil privatan.</p>';
  }

  /* Profile counts row, four ways. P1: no follower-count heroics, so the numbers stay small. Since round 12a the
     chosen row (b) counts the real fictional lists (data.js follows) and each number opens its list. */
  function profRow() {
    const a = st.mine ? 1 : 0;
    if (PROW_AT === 'b') return countsRow(ME_H, true);
    if (PROW_AT === 'c') return `<p class="prow-c"><button class="prow-chip" data-a="toast" data-msg="Popis pratitelja (PROF-07) nije dio skice." data-k="prow-1"><b>12</b> pratitelja</button><button class="prow-chip" data-a="toast" data-msg="Popis praćenih (PROF-07) nije dio skice." data-k="prow-2"><b>18</b> prati</button><span class="prow-chip prow-dd">${ic('pulse', 'sm')}<b>${a}</b> ${plAns(a)}</span></p>`;
    if (PROW_AT === 'd') return `<p class="prow-d"><button class="link-quiet" data-a="toast" data-msg="Popis pratitelja (PROF-07) nije dio skice." data-k="prow-1"><b>12</b> pratitelja</button><span aria-hidden="true">·</span><button class="link-quiet" data-a="toast" data-msg="Popis praćenih (PROF-07) nije dio skice." data-k="prow-2">prati <b>18</b></button><span aria-hidden="true">·</span><span>član od listopada 2026.</span></p>`;
    return `<p class="pf-c-stats"><span><b>12</b> pratitelja</span><span>prati <b>18</b></span><span><b>${a}</b> ${plAns(a)}</span></p>`;
  }

  /* ---------- Settings sub-screens (SET-02 to SET-12, D-067). One layout for all: short groups of rows. ---------- */
  const swRow = (id, t, d, on) => `<li class="set-row set-row-switch"><span class="set-txt"><span class="set-t" id="${id}-l">${t}</span>${d ? `<span class="set-d" id="${id}-d">${d}</span>` : ''}</span><button type="button" class="switch" role="switch" aria-checked="${!!on}" aria-labelledby="${id}-l"${d ? ` aria-describedby="${id}-d"` : ''} data-a="sw" data-k="${id}"><span></span></button></li>`;
  const row = (k, t, d, msg) => `<li><button class="set-row set-row-plain" data-a="toast" data-msg="${esc(msg || t + ': ovaj korak nije dio skice.')}" data-k="${k}"><span class="set-txt"><span class="set-t">${t}</span>${d ? `<span class="set-d">${d}</span>` : ''}</span>${ic('chevron', 'sm set-go')}</button></li>`;
  const grp = (title, inner, note) => `<section class="set-group">${title ? `<h2 class="set-gt">${title}</h2>` : ''}<ul class="set-list">${inner}</ul>${note ? `<p class="set-note">${note}</p>` : ''}</section>`;
  const SUB = {
    profile: ['Uredi profil', () => `<div class="sub-avatar">${avatar(st.username, st.displayName || 'T', 'lg')}<button class="link" data-a="toast" data-msg="Učitavanje slike (PROF-08) nije dio skice. Slika nije obavezna." data-k="sub-photo">Promijeni sliku</button></div>
        ${field({ id: 'dname2', label: 'Ime za prikaz', help: 'Do tri riječi. Svaka počinje velikim slovom.', value: st.displayName, attrs: 'autocomplete="nickname" autocapitalize="words" maxlength="40"' })}
        <div class="field"><label class="label" for="f-bio">Bio</label><textarea class="textarea" id="f-bio" data-k="f-bio" rows="3" maxlength="160">${esc(BIO)}</textarea><p class="help">Do 160 znakova.</p></div>
        ${grp('', row('sub-dna', 'Uredi Music DNA', `${st.genres.length} ${pl(st.genres.length, 'žanr', 'žanra', 'žanrova')}, ${st.artists.length} ${pl(st.artists.length, 'izvođač', 'izvođača', 'izvođača')}`, 'Uređivanje Music DNA (PROF-09) nije dio skice.'))}
        <button class="btn btn-primary btn-block" data-a="toast" data-msg="Spremljeno (simulacija)." data-k="sub-save">Spremi</button>`],
    /* Round 10 (session 12): the account rows open their own screens (SET-02, SET-03). */
    account: ['Račun', () => grp('Prijava', subRow('a-mail', 'E-pošta', esc(D.email), 'email') + subRow('a-pw', 'Lozinka', 'Promijenjena prije 2 dana', 'password') + row('a-g', 'Google', 'Nije povezano', 'Povezivanje Google računa: prijava preko Googlea s istom adresom e-pošte. Nije dio skice.'))
      + grp('Korisničko ime', subRow('a-user', `@${esc(st.username || 'ti')}`, st.userChanged ? `Sljedeća promjena od ${dayMonth(addDays(D.drop.date, 30))}` : 'Promijeni', 'username'), 'Možeš ga promijeniti jednom u 30 dana. Staro ime ostaje rezervirano još 30 dana, da te nitko ne može glumiti.')],
    email: ['E-pošta', () => `<p class="help">Sada: <b>${esc(D.email)}</b></p>
        ${field({ id: 'email2', label: 'Nova adresa e-pošte', type: 'email', attrs: 'autocomplete="email"' })}
        ${field({ id: 'pwold', label: 'Lozinka, za potvrdu', type: 'password', attrs: 'autocomplete="current-password"' })}
        <p class="set-note">Poslat ćemo poveznicu na novu adresu. Dok je ne otvoriš, vrijedi stara. Na staru adresu stiže obavijest o promjeni.</p>
        <button class="btn btn-primary btn-block" data-a="toast" data-msg="Poveznica je poslana na novu adresu (simulacija)." data-k="email-save">Pošalji poveznicu</button>`],
    password: ['Lozinka', () => `${field({ id: 'pwold', label: 'Trenutna lozinka', type: 'password', attrs: 'autocomplete="current-password"' })}
        ${field({ id: 'pw', label: 'Nova lozinka', help: `Najmanje ${PW_MIN} znakova, veliko i malo slovo te poseban znak.`, type: 'password', value: st.pw, desc: 'pw-need', attrs: 'autocomplete="new-password" autocapitalize="none" spellcheck="false"' })}
        <div class="pw-meter" id="pw-meter">${pwMeter()}</div>
        <label class="age-check sub-check"><input type="checkbox" checked data-k="pw-others"><span>Odjavi i sve druge uređaje</span></label>
        <button class="btn btn-primary btn-block" data-a="pw-save" data-k="pw-save">Promijeni lozinku</button>
        <button class="link" data-a="toast" data-msg="Ponovno postavljanje lozinke (PUB-04): poveznica stiže e-poštom." data-k="pw-forgot">Ne sjećaš se trenutne lozinke?</button>`],
    username: ['Korisničko ime', () => st.userChanged
      ? `<div class="sub-hero sub-hero-wait">${ic('clock')}<p class="sub-hero-t">@${esc(st.username)}</p><p class="help">Promijenjeno ${dayMonth(D.drop.date)}. Sljedeća promjena moguća je od ${dayMonth(addDays(D.drop.date, 30))}.</p></div>
        ${grp('Staro ime', `<li class="set-row set-row-plain"><span class="set-txt"><span class="set-t">@${esc(st.oldUser)}</span><span class="set-d">Rezervirano za tebe do ${dayMonth(addDays(D.drop.date, 30))}. Nitko ga ne može uzeti.</span></span></li>`)}`
      : `${field({ id: 'uname2', label: 'Novo korisničko ime', help: '3 do 20 znakova: mala slova, brojke, točka i donja crta.', value: st.newUser == null ? st.username : st.newUser, prefix: '@', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"' })}
        <div id="uname2-status" class="status" aria-live="polite">${u2Status()}</div>
        <ul class="sub-facts"><li>Mijenjati ga možeš jednom u 30 dana.</li><li>Staro ime ostaje rezervirano 30 dana, pa te nitko ne može glumiti.</li><li>Stare poveznice na tvoj profil prestaju raditi. Ime za prikaz ostaje isto.</li></ul>
        <button class="btn btn-primary btn-block" data-a="uname-save" data-k="uname-save">Spremi</button>`],
    security: ['Sigurnost', () => grp('Dvostruka provjera', subRow('s-2fa', 'Kod iz aplikacije pri prijavi', st.twofa ? 'Uključeno' : 'Isključeno. Preporučujemo da je uključiš.', 'twofa'))
      + grp('Uređaji', `<li class="set-row set-row-dev"><span class="set-txt"><span class="set-t">Chrome na Androidu</span><span class="set-d">Ovaj uređaj · Zagreb</span></span></li><li class="set-row set-row-dev"><span class="set-txt"><span class="set-t">Safari na iPhoneu</span><span class="set-d">Prije 3 dana · Zagreb</span></span><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Uređaj je odjavljen (simulacija)." data-k="s-out-1">Odjavi</button></li>`)
      + '<button class="btn btn-secondary btn-block" data-a="toast" data-msg="Svi drugi uređaji su odjavljeni (simulacija)." data-k="s-out-all">Odjavi sve druge uređaje</button>'],
    twofa: ['Dvostruka provjera', () => st.twofa
      ? `<div class="sub-hero">${ic('check')}<p class="sub-hero-t">Dvostruka provjera je uključena</p><p class="help">Spremi kodove za oporavak. Svaki radi jednom, ako izgubiš mobitel.</p></div>
        <ul class="codes" aria-label="Kodovi za oporavak, primjer">${['k7d2-9qfm', 'p4xa-3hwe', 'z8tn-6cbr', 'm2vj-5yqs', 'e9rk-1lpd', 'w3gh-8nzu', 'b6fy-4tkc', 'q1sx-7mva'].map(c => `<li><code>${c}</code></li>`).join('')}</ul>
        <div class="foot-row equal"><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Kodovi su preuzeti kao tekstualna datoteka (simulacija)." data-k="codes-dl">Preuzmi</button><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Kodovi su kopirani (simulacija)." data-k="codes-copy">Kopiraj</button></div>
        <button class="btn btn-primary btn-block" data-a="back" data-k="codes-done">Gotovo</button>
        <p class="meta">Primjer: kodovi nisu pravi.</p>`
      : `<ol class="steps">
          <li><p class="set-t">Otvori aplikaciju za jednokratne kodove</p><p class="set-d">Bilo koju koja podržava TOTP. Možda je već imaš za neki drugi račun.</p></li>
          <li><p class="set-t">Skeniraj kod</p><div class="qr" aria-hidden="true">${qrFake()}</div><p class="set-d">Ne možeš skenirati? Upiši ključ <code>JBSW Y3DP EHPK 3PXP</code></p></li>
          <li>${field({ id: 'otp', label: 'Upiši kod od 6 znamenki', attrs: 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"' })}</li>
        </ol>
        <button class="btn btn-primary btn-block" data-a="otp-ok" data-k="otp-ok">Uključi</button>
        <p class="meta">Primjer: kod i ključ nisu pravi. U skici prolazi bilo kojih 6 znamenki.</p>`],
    privacy: ['Privatnost', () => privacyBody()],
    blocked: ['Blokirani i utišani', () => (BL_FULL
      ? grp('Blokirani', blRow('mia_vinyl', 'Odblokiraj', 'Odblokirano (simulacija). @mia_vinyl ne dobije obavijest.') + blRow('tinkovac', 'Odblokiraj', 'Odblokirano (simulacija). @tinkovac ne dobije obavijest.'), 'Blokirani ne vide tvoj profil ni odgovore, a ti ne vidiš njihove. Ne dobiju obavijest o tome.')
        + grp('Utišani', blRow('lukabass', 'Poništi', 'Utišavanje je poništeno (simulacija).'), 'Utišane i dalje možeš posjetiti, samo ih ne vidiš u popisima. Oni to ne znaju.')
      : grp('Blokirani', '<li class="set-empty">Nema blokiranih računa.</li>', 'Blokirani ne vide tvoj profil ni odgovore, a ti ne vidiš njihove. Ne dobiju obavijest o tome.')
        + grp('Utišani', '<li class="set-empty">Nema utišanih računa.</li>', 'Utišane i dalje možeš posjetiti, samo ih ne vidiš u popisima. Oni to ne znaju.'))],
    notifications: ['Obavijesti', () => notifBody()],
    language: ['Jezik i regija', () => `${choices('lang2', 'Jezik sučelja', [{ v: 'en', t: 'English', lang: 'en' }, { v: 'hr', t: 'Hrvatski' }], st.lang, 'choices-compact')}
        <div class="group"><p class="label">Jezici čitanja</p><p class="help">Takve odgovore češće vidiš u poretku „Za tebe”.</p><div class="chips">${READ_LANGS.map(l => `<button class="chip" data-a="readlang" data-l="${l}" data-k="rl2-${l}" aria-pressed="${st.readLangs.has(l)}"><span class="ck">${ic('check', 'sm')}</span>${l}</button>`).join('')}</div></div>
        <div class="field"><label class="label" for="f-tz">Vremenska zona</label><select class="select" id="f-tz" data-k="f-tz"><option>Europa/Zagreb</option><option>Europa/London</option><option>Amerika/New York</option></select><p class="help">Za vrijeme podsjetnika. Daily Drop izlazi za sve u isto vrijeme.</p></div>`],
    status: ['Status računa', () => `<div class="sub-hero">${ic('check')}<p class="sub-hero-t">Račun je u redu</p><p class="help">Nema upozorenja ni ograničenja.</p></div>
        ${grp('Što bi ovdje pisalo', '<li class="set-row set-row-plain"><span class="set-txt"><span class="set-t">Odluke moderacije</span><span class="set-d">Svaka s obrazloženjem: što je uklonjeno, zašto i do kada.</span></span></li><li class="set-row set-row-plain"><span class="set-txt"><span class="set-t">Žalba</span><span class="set-d">Na svaku odluku možeš se žaliti, a odgovor stiže ovdje.</span></span></li>')}`],
    help: ['Pomoć', () => grp('', row('h-bug', 'Prijavi grešku', 'Uz opis i, ako želiš, snimku zaslona') + row('h-idea', 'Pošalji prijedlog') + row('h-faq', 'Česta pitanja'))
      + grp('', row('h-priv', 'Kontakt za privatnost', 'Pitanja o podacima, kopija podataka')) + '<p class="meta">Prijave neprimjerenog sadržaja idu preko ⋯ na samom odgovoru, ne ovdje.</p>'],
    rules: ['Pravila zajednice', () => `<div class="sub-doc"><p class="lead">Ukratko, dok pravnik ne napiše pravi tekst:</p><ul><li>Pričaj o glazbi i ljudima s poštovanjem, i kad se ne slažeš.</li><li>Bez mržnje, uznemiravanja i otkrivanja tuđih podataka.</li><li>Bez spama i lažnog predstavljanja.</li><li>Dijeli poveznice, ne piratske snimke.</li></ul><p class="meta">Nacrt za skicu, nije pravni tekst (PUB-11).</p></div>`],
    terms: ['Uvjeti i privatnost', () => grp('', row('t-terms', 'Uvjeti korištenja') + row('t-priv', 'Pravila privatnosti') + row('t-cook', 'Kolačići', 'Koje koristimo i zašto')) + '<p class="meta">Tekstove piše pravnik prije alfe (PUB-10).</p>'],
    about: ['O GrooveRiftu', () => `<div class="sub-hero"><span class="wordmark">groove<span class="wm-rift">rift</span></span><p class="tagline" lang="en">Where musical worlds collide.</p><p class="help">Alfa · skica 3.5</p></div>
        ${grp('', row('ab-contact', 'Kontakt') + row('ab-imp', 'Impresum', 'Tko stoji iza GrooveRifta (OQ-05)') + row('ab-lic', 'Licence', 'MusicBrainz (CC0), ikone Phosphor (MIT), fontovi Sora i Inter (OFL)'))}`],
    delete: ['Brisanje računa', () => deleteBody()],
    deleteA: ['Brisanje računa', () => `<div class="sub-copy">${pic('database', 'set-ic')}<div><p class="set-t">Prije toga: kopija tvojih podataka</p><p class="set-d">Odgovori, komentari, Music DNA i postavke u jednoj ZIP datoteci.</p></div><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Pripremamo kopiju. Javit ćemo e-poštom kad bude spremna (simulacija)." data-k="d-copy">Preuzmi</button></div>
        ${choices('del', 'Što želiš?', [{ v: 'off', t: 'Deaktiviraj', d: 'Profil i odgovori se skrivaju. Vratiš se kad se opet prijaviš.' }, { v: 'del', t: 'Obriši trajno', d: `Račun se skriva odmah, a briše se ${(p => p.day + '. ' + p.mg)(dparts(addDays(D.drop.date, 30)))}. Do tada se možeš predomisliti.` }], st.del, 'choices-compact')}
        ${field({ id: 'delpw', label: 'Za potvrdu upiši lozinku', type: 'password', attrs: 'autocomplete="current-password"' })}
        <button class="btn btn-danger btn-block" data-a="del-one" data-k="d-go">${ic('trash', 'sm')}Nastavi</button>`]
  };
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const dayMonth = iso => (p => p.day + '. ' + p.mg)(dparts(iso));

  /* ---------- Round 10 (owner, session 12): key states and the settings flows. Options compared in round10.html. ----------
     ?state=loading|error|empty|nodrop|blocked|long   a key state on Home, the Daily Drop, Activity and the profile
     ?net=off       offline (IA §6.1 O)                 ?bl=1   a filled "Blokirani i utišani" list
     ?ld=a|b|c      loading look         ?off=a|b|c   offline banner      ?emp=a|b   empty states    ?nd=a|b   late question
     ?prv=a|b       privacy screen       ?ntf=a|b     notifications       ?del=a|b|c deactivate or delete   ?out=a|b   log out
     ?at=signin     the sign-in screen; &pw=breached shows the D-054 banner on Home, &acct=pending a scheduled deletion
     ?flow=drop&at=member&as=blocker|blocked   another member's profile after a block (D-019, IA §6.1 B)
     ?uc=locked     the username was changed today (D-069)
     Owner choices (D-070): ld=b, off=a, emp=b, nd=a, prv=b, ntf=c (push only, no social emails in the alpha), del=b, out=b. */
  const STATE = pick('state', ['loading', 'error', 'empty', 'nodrop', 'blocked', 'long'], '');
  const NET_OFF = P.get('net') === 'off';
  const LD_AT = pick('ld', ['a', 'b', 'c'], 'b');
  const OFF_AT = pick('off', ['a', 'b', 'c'], 'a');
  const EMP_AT = pick('emp', ['a', 'b'], 'b');
  const ND_AT = pick('nd', ['a', 'b'], 'a');
  const PRV_AT = pick('prv', ['a', 'b'], 'b'); // chosen: b, rows with a sheet (D-070)
  const NTF_AT = pick('ntf', ['a', 'b', 'c', 'd', 'e', 'f'], 'd'); // push only (D-070, OQ-32); chosen look: d, this device on top (D-071)
  const DEL_AT = pick('del', ['a', 'b', 'c'], 'b'); // chosen: b, short steps (D-070)
  const OUT_AT = pick('out', ['a', 'b'], 'b'); // chosen: b, a short confirmation (D-070)
  const BL_FULL = P.get('bl') === '1' || STATE === 'blocked';
  if (STATE === 'loading') document.documentElement.classList.add('ld-' + LD_AT);
  if (STATE === 'empty') { st.answers = []; st.comments = {}; }
  if (STATE === 'long') {
    st.displayName = 'Katarina Kovačević-Šimunović'; st.username = 'kata.kovacevic_simun';
    Object.assign(st.answers[0], { who: 'Ivana Marija Brkljačić-Vukovinski', handle: 'ivana.brkljacic_vuk' });
    st.answers[1].text = 'Prijestolonasljednikovičičinima bi se svidio ovaj: https://musicbrainz.org/release-group/8e8a594e-2c0d-3a4c-ac21-3fd2c5a1b3e4 pa onda cijela strana B bez preskakanja.';
  }

  /* Loading (IA §6.1 L): content-shaped placeholders; the title and navigation render at once. a: still blocks.
     b: the blocks breathe slowly. c: still blocks plus a thin current under the top bar. Motion stops with
     "Smanji pokrete" or the OS setting. */
  const SKEL = {
    ans: '<div class="skel skel-ans" aria-hidden="true"><span class="sk-av"></span><span class="sk-l w40"></span><span class="sk-l sk-wide"></span><span class="sk-l sk-wide"></span><span class="sk-l sk-wide w70"></span></div>',
    peek: '<div class="skel skel-act" aria-hidden="true"><span class="sk-av"></span><span class="sk-l w40"></span><span class="sk-l w90"></span></div>',
    act: '<div class="skel skel-act" aria-hidden="true"><span class="sk-av"></span><span class="sk-l w90"></span><span class="sk-l w30"></span></div>'
  };
  const skel = (n, kind) => `<div class="skel-wrap" aria-busy="true"><p class="sr-only" role="status">Učitavam…</p>${SKEL[kind || 'ans'].repeat(n)}</div>`;
  const skelDrop = () => '<div class="skel skel-dd" aria-hidden="true"><span class="sk-l w30"></span><span class="sk-l sk-xl"></span><span class="sk-l sk-xl w70"></span><span class="sk-btn"></span></div>';
  const loadLine = () => STATE === 'loading' && LD_AT === 'c' ? '<div class="load-line" aria-hidden="true"><span></span></div>' : '';

  /* Error (IA §6.1 E): an inline message where the part failed, with Retry; the rest of the page stays. */
  const loadErr = (msg, k) => `<div class="cat-err load-err" role="alert">${ic('alert')}<div><p><b>${msg}</b> Ostatak stranice radi.</p><button type="button" class="btn btn-secondary btn-sm" data-a="retry-load" data-k="${k}">Pokušaj ponovno</button></div></div>`;

  /* Offline (IA §6.1 O, J3 E10). a: a bar under the top bar. b: a small pill above the tab bar. c: a chip in the top bar. */
  const OFF_TIME = '08:14';
  const netHint = msg => `<p class="net-hint">${ic('offline', 'sm')}<span>${msg}</span></p>`;
  function netBanner() {
    if (!NET_OFF || OFF_AT === 'c') return '';
    if (OFF_AT === 'b') return '';
    return `<p class="net-bar" role="status">${ic('offline', 'sm')}<span>Nisi na mreži. Prikazujemo spremljeno u ${OFF_TIME}.</span></p>`;
  }
  const netPill = () => NET_OFF && OFF_AT === 'b' ? `<div class="net-pill-wrap"><p class="net-pill" role="status">${ic('offline', 'sm')}<span>Nisi na mreži</span></p></div>` : '';
  const netChip = () => NET_OFF && OFF_AT === 'c' ? `<button class="net-chip" data-a="toast" data-msg="Nisi na mreži. Prikazujemo spremljeno u ${OFF_TIME}. Objava čeka da se veza vrati." data-k="net-chip">${ic('offline', 'sm')}<span>Bez mreže</span></button>` : '';

  /* Empty states (IA §6.2): say what will appear here, never fake activity, no pressure (P2). a: one quiet line in
     the dashed box. b: a small icon, a short title and one line, no box. */
  function emptyBox(icon, title, text) {
    if (EMP_AT === 'a') return `<div class="empty"><p>${title} ${text}</p></div>`;
    return `<div class="empty-b">${icon}<p class="empty-t">${title}</p><p>${text}</p></div>`;
  }

  /* The missing-question day (J3 E2): "Today's question is on its way" plus yesterday's Drop with its date. No error
     code, never an empty day. a: one line above the Drop. b: a card on top, then yesterday's Drop. */
  function noDropBlock() {
    const y = D.pastDrops[0];
    const line = `<p class="dd-late">${ic('clock', 'sm')}<span><b>Današnje pitanje stiže uskoro.</b> Ovo je jučerašnje.</span></p>`;
    const card = `<div class="dd-wait" role="status">${ic('clock')}<div><p class="dd-wait-t">Današnje pitanje stiže uskoro</p><p>Dok čekaš, jučerašnje je još otvoreno.</p></div></div>`;
    return `${ND_AT === 'b' ? card : ''}<section class="dd dd-teaser dd-c dd-e" aria-labelledby="h-teaser">${ND_AT === 'a' ? line : ''}
      <div class="dd-top">${ddName()}<p class="dd-date"><time datetime="${y.date}">${longDate(y.date)}</time></p></div>
      <h2 id="h-teaser" class="dd-q">${esc(y.q)}</h2>${pastMeta(y)}
      <div class="dd-actions dd-actions-inline"><button class="btn btn-primary btn-cta" data-a="toast" data-msg="${PAST_MSG}" data-k="past-answer">Odgovori</button><button class="link read-link" data-a="toast" data-msg="${PAST_MSG}" data-k="past-read">Pročitaj odgovore</button></div></section>`;
  }

  /* Answers on the Daily Drop page in each state. */
  function dropList() {
    if (NET_OFF) return netHint('Pitanje je spremljeno, a odgovori trebaju mrežu. Učitat će se kad se veza vrati.');
    if (STATE === 'loading') return skel(3);
    if (STATE === 'error' && !st.loadOk) return loadErr('Odgovori se nisu učitali.', 'retry-ans');
    if (!st.answers.length) return emptyBox(pic('chat-text', 'empty-ic'), 'Još nema odgovora.', 'Budi prvi ili svrati kasnije.');
    return `${sortCtl()}
      ${st.pending ? `<button class="new-pill" data-a="show-new" data-k="show-new">${st.pending.length} ${pl(st.pending.length, 'novi odgovor', 'nova odgovora', 'novih odgovora')}</button>` : ''}
      <ul class="ans-list" aria-labelledby="h-answers">${ordered().map(a => `<li>${answerItem(a)}</li>`).join('')}</ul>`;
  }
  const listReady = () => !NET_OFF && STATE !== 'loading' && !(STATE === 'error' && !st.loadOk);

  /* Breached password after sign-in (D-054): a recommendation banner on Home, never a forced change. */
  const pwBanner = () => st.pwBanner ? `<div class="notice pw-banner" role="status">${ic('alert')}<div><p><b>Tvoja lozinka pojavila se u javno poznatom curenju podataka.</b> To ne znači da je netko ušao u tvoj račun, ali takve lozinke napadači isprobavaju prve. Preporučujemo da je promijeniš.</p>
      <div class="pw-banner-btns"><button class="btn btn-secondary btn-sm" data-a="pw-change" data-k="pwb-change">Promijeni lozinku</button><button class="link" data-a="pw-later" data-k="pwb-later">Kasnije</button></div></div></div>` : '';

  /* Settings helpers. */
  const subRow = (k, t, d, s) => `<li><button class="set-row set-row-plain" data-a="setsub" data-s="${s}" data-k="${k}"><span class="set-txt"><span class="set-t">${t}</span>${d ? `<span class="set-d">${d}</span>` : ''}</span>${ic('chevron', 'sm set-go')}</button></li>`;
  const blRow = (h, btn, msg) => { const m = D.members[h] || { who: h }; return `<li class="set-row set-row-bl">${avatar(h, m.who, 'sm')}<span class="set-txt"><span class="set-t">${esc(m.who)}</span><span class="set-d">@${esc(h)}</span></span><button class="btn btn-secondary btn-sm" data-a="toast" data-msg="${esc(msg)}" data-k="bl-${h}">${btn}</button></li>`; };
  function u2Status() {
    const u = st.newUser == null ? st.username : st.newUser;
    if (!u || u === st.username) return '';
    if (!/^[a-z0-9._]+$/.test(u)) return `<p class="status-line bad">${ic('alert')}<span>Koristi samo mala slova, brojke, točku i donju crtu.</span></p>`;
    if (u.length < 3) return `<p class="status-line bad">${ic('alert')}<span>Treba barem 3 znaka.</span></p>`;
    if (D.takenUsernames.includes(u)) return `<p class="status-line bad">${ic('alert')}<span>Ovo korisničko ime nije dostupno.</span></p>`;
    return `<p class="status-line ok">${ic('check')}<span>@${esc(u)} je slobodno.</span></p>`;
  }
  /* A fake QR-like pattern for the 2FA sketch: three finder squares and a seeded scatter. Not a real code. */
  function qrFake() {
    let s = 7, out = '';
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      const inF = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
      if (!inF && rnd() > 0.52) out += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg viewBox="0 0 25 25" shape-rendering="crispEdges" fill="#0B0D12">${finder(0, 0)}${finder(18, 0)}${finder(0, 18)}${out}</svg>`;
  }

  /* Privacy (SET-05): the same neutral wording as onboarding (D-030). D-032: the answer history follows the profile by
     default. D-033: follower lists default to followers, and a private profile caps them at followers.
     a: every choice inline on one page. b: one row per item with its current value; a tap opens a short sheet. */
  const HIST_LABEL = { same: 'Kao profil', followers: 'Samo pratitelji', me: 'Samo ja' };
  const LISTS_LABEL = { all: 'Svi članovi', followers: 'Samo pratitelji', me: 'Samo ja' };
  const PRIV_ITEMS = () => [
    ['vis2', 'Profil', 'Tko vidi tvoj profil?', [{ v: 'public', icon: 'globe', t: 'Javno', d: 'Profil, Music DNA i povijest odgovora vide svi članovi. Pojavljuješ se u Otkrivanju.' }, { v: 'private', icon: 'lock', t: 'Privatno', d: 'Vide ih samo pratitelji koje odobriš. Ne pojavljuješ se u Otkrivanju.' }], st.vis, VIS_LABEL],
    ['dnaVis2', 'Music DNA', 'Tko vidi tvoj Music DNA?', [{ v: 'all', icon: 'users', t: 'Svi članovi', d: 'Koristi se i za Otkrivanje i kompatibilnost.' }, { v: 'followers', icon: 'user', t: 'Samo pratitelji' }, { v: 'me', icon: 'lock', t: 'Samo ja', d: 'Nitko drugi, ni u kompatibilnosti.' }], st.dnaVis, DNA_LABEL],
    ['hist2', 'Povijest odgovora na profilu', 'Tko vidi povijest tvojih odgovora na profilu?', [{ v: 'same', t: 'Kao profil', d: st.vis === 'private' ? 'Sad: samo pratitelji.' : 'Sad: svi članovi.' }, { v: 'followers', t: 'Samo pratitelji' }, { v: 'me', t: 'Samo ja' }], st.histVis || 'same', HIST_LABEL],
    ['lists2', 'Pratitelji i praćeni', 'Tko vidi popise pratitelja i praćenih te njihove brojeve?', [{ v: 'all', t: 'Svi članovi', d: st.vis === 'private' ? 'Nije moguće dok je profil privatan.' : '' }, { v: 'followers', t: 'Samo pratitelji' }, { v: 'me', t: 'Samo ja' }], st.lists || 'followers', LISTS_LABEL]
  ];
  function privacyBody() {
    const same = `<p class="vrow-same">${ic('users', 'sm')}<span>Odgovore na Daily Drop i komentare uvijek vide svi članovi, i kad je profil privatan.</span></p>`;
    const note = st.vis === 'private' ? '<p class="set-note">Postojeći pratitelji ostaju, a možeš ih ukloniti na popisu pratitelja. Novi šalju zahtjev.</p>' : '';
    if (PRV_AT === 'b') return grp('', PRIV_ITEMS().map(([n, t, , , v, L]) => `<li><button class="set-row set-row-plain" data-a="pick" data-p="${n}" data-k="pick-${n}"><span class="set-txt"><span class="set-t">${t}</span><span class="set-d">${(L[v] || '')}</span></span>${ic('chevron', 'sm set-go')}</button></li>`).join(''), '') + note + same;
    return PRIV_ITEMS().map(([n, , q, opts, v]) => choices(n, q, opts, v, 'choices-compact')).join('') + note + same;
  }

  /* Notifications (SET-06): reminder time and time zone, type × channel, push on this device.
     a: grouped by channel. b: one table, each type with a Mobitel and an E-pošta column. c (chosen, D-070): push only. */
  const NTF = [
    ['com', 'Komentari na moje odgovore', '', true, false],
    ['react', 'Reakcije', 'Skupljene, najviše jedna na sat', false, false],
    ['fol', 'Novi pratitelji i zahtjevi', '', true, false],
    ['sugg', 'Objavljen moj prijedlog pitanja', '', true, true]
  ];
  function notifBody() {
    const dd = `${swRow('n-dd', 'Podsjetnik za novo pitanje', 'Jedna obavijest dnevno', st.reminder === 'on')}
      <li class="set-row set-row-plain"><label class="set-t" for="f-time2">Vrijeme</label><select class="select rem-time" id="f-time2" data-k="f-time2">${['07:00', '08:00', '09:00', '12:00', '17:00', '20:00', '22:00'].map(t => `<option${st.remTime === t ? ' selected' : ''}>${t}</option>`).join('')}</select></li>`;
    const device = grp('Ovaj uređaj', `<li class="set-row set-row-plain"><span class="set-txt"><span class="set-t">Obavijesti preglednika</span><span class="set-d">${st.reminder === 'denied' ? 'Blokirane u pregledniku. Uključuju se u postavkama preglednika.' : 'Dopuštene'}</span></span></li>`, 'Push obavijesti vrijede za svaki uređaj posebno.');
    const fixed = '<p class="set-note">Važne obavijesti o računu i sigurnosti uvijek stižu e-poštom.</p>';
    /* c (D-070): no social emails in the alpha (OQ-32), so one list of switches for this device. */
    const mailNote = 'E-poštom stižu samo poruke o računu i sigurnosti, na primjer poveznica za novu lozinku.';
    if (NTF_AT === 'c') return grp('Daily Drop', dd) + grp('Obavijesti na mobitelu', NTF.map(([k, t, d, p]) => swRow('n-' + k, t, d, p)).join(''), mailNote) + device;
    /* Round 11 (owner, session 12: "kako će izgledati?"): three more looks for the push-only screen.
       d: this device on top with one switch; the types below go quiet while it is off.
       e: rows with an icon, like the main Settings list, and one example line under each.
       f: each type shows a small preview of the notification it sends. */
    const NX = {
      dd: ['Daily Drop', pic('calendar-dots', 'set-ic'), 'Daily Drop je stigao', esc(NOTIF_Q)],
      com: ['Komentar', ic('comment', 'set-ic'), 'Luka komentira tvoj odgovor', '„Slažem se, Blue in Green mi je bio ulaz.”'],
      react: ['Reakcije', `<span class="set-ic wave-wrap">${WAVE}</span>`, 'Reakcije na tvoj odgovor', 'Petra, Tin i još 3'],
      fol: ['Praćenje', ic('users', 'set-ic'), 'Mia želi te pratiti', 'Prihvati ili odbij u Aktivnosti'],
      sugg: ['Prijedlog', pic('lightbulb-filament', 'set-ic'), 'Tvoj prijedlog je objavljen', '„Koju pjesmu najčešće šalješ prijateljima?”']
    };
    const ICONROW = (k, t, d, on) => `<li class="set-row set-row-ic"><span class="set-ic-wrap" aria-hidden="true">${NX[k][1]}</span><span class="set-txt"><span class="set-t" id="n-${k}-l">${t}</span><span class="set-d" id="n-${k}-d">${d}</span></span><button type="button" class="switch" role="switch" aria-checked="${!!on}" aria-labelledby="n-${k}-l" aria-describedby="n-${k}-d" data-a="sw" data-k="n-${k}"><span></span></button></li>`;
    const PREV = k => `<span class="ntf-prev" aria-hidden="true"><span class="ntf-prev-app">${current('np-' + k, 'sm')}</span><span class="ntf-prev-body"><span class="ntf-prev-t">${NX[k][2]}</span><span class="ntf-prev-q">${NX[k][3]}</span></span></span>`;
    const PREVROW = (k, t, d, on) => `<li class="set-row set-row-prev"><span class="set-txt"><span class="set-t" id="n-${k}-l">${t}</span>${d ? `<span class="set-d" id="n-${k}-d">${d}</span>` : ''}</span><button type="button" class="switch" role="switch" aria-checked="${!!on}" aria-labelledby="n-${k}-l"${d ? ` aria-describedby="n-${k}-d"` : ''} data-a="sw" data-k="n-${k}"><span></span></button>${PREV(k)}</li>`;
    const time = `<li class="set-row set-row-plain"><label class="set-t" for="f-time2">Vrijeme</label><select class="select rem-time" id="f-time2" data-k="f-time2">${['07:00', '08:00', '09:00', '12:00', '17:00', '20:00', '22:00'].map(t => `<option${st.remTime === t ? ' selected' : ''}>${t}</option>`).join('')}</select></li>`;
    const ex = { dd: 'Jednom dnevno, kad izađe pitanje', com: 'Npr. „Luka komentira tvoj odgovor”', react: 'Skupljene, najviše jednom na sat', fol: 'Novi pratitelji i zahtjevi za praćenje', sugg: 'Kad urednici objave tvoje pitanje' };
    const NAMES = { com: 'Komentari na moje odgovore', react: 'Reakcije', fol: 'Pratitelji i zahtjevi', sugg: 'Objavljen moj prijedlog pitanja' };
    if (NTF_AT === 'd') {
      const on = st.pushDev !== false, paused = on && st.pause;
      /* Pause for a while (owner, D-072, a scope addition): 1 hour, 3 hours or until 08:00 tomorrow; then it turns
         itself back on. The sketch's clock is a fixed 18:40. Activity keeps collecting everything meanwhile. */
      const PAUSE = [['1h', '1 sat', 'do 19:40'], ['3h', '3 sata', 'do 21:40'], ['am', 'Do sutra u 8:00', 'do sutra u 8:00']];
      const desc = !on ? 'Isključene. Ništa ne stiže na ovaj mobitel; Aktivnost i dalje sve pokazuje.'
        : paused ? `Pauzirano ${PAUSE.find(p => p[0] === st.pause)[2]}. Onda se same uključe. Aktivnost u međuvremenu sve skuplja.` : 'Uključene. Odaberi koje ispod.';
      const pauseRow = !on ? '' : paused
        ? `<button class="btn btn-secondary btn-sm ntf-resume" data-a="pause-end" data-k="pause-end">Uključi odmah</button>`
        : `<div class="ntf-pause" role="group" aria-labelledby="n-pause-l"><span class="set-d" id="n-pause-l">Pauziraj na</span><div class="chips">${PAUSE.map(([k, l]) => `<button type="button" class="chip" data-a="pause" data-p="${k}" data-k="pause-${k}">${l}</button>`).join('')}</div></div>`;
      return `<section class="ntf-dev${on && !paused ? '' : ' is-off'}"><div class="ntf-dev-top"><span class="set-ic-wrap" aria-hidden="true">${pic('device-mobile', 'set-ic')}</span><span class="set-txt"><span class="set-t" id="n-dev-l">Obavijesti na ovom mobitelu</span><span class="set-d" id="n-dev-d" aria-live="polite">${desc}</span></span><button type="button" class="switch" role="switch" aria-checked="${on}" aria-labelledby="n-dev-l" aria-describedby="n-dev-d" data-a="push-dev" data-k="n-dev"><span></span></button></div>${pauseRow}</section>
        <fieldset class="ntf-types"${on && !paused ? '' : ' disabled'}><legend class="sr-only">Vrste obavijesti</legend>
        ${grp('Daily Drop', swRow('n-dd', 'Podsjetnik za novo pitanje', 'Jedna obavijest dnevno', st.reminder === 'on') + time)}
        ${grp('Ljudi i razgovori', NTF.map(([k, t, d, p]) => swRow('n-' + k, NAMES[k], d, p)).join(''))}</fieldset>
        <p class="set-note">${mailNote}</p>`;
    }
    if (NTF_AT === 'e') return grp('', ICONROW('dd', 'Daily Drop podsjetnik', ex.dd, st.reminder === 'on') + time)
      + grp('', NTF.map(([k, , , p]) => ICONROW(k, NAMES[k], ex[k], p)).join(''), mailNote) + device;
    if (NTF_AT === 'f') return grp('Daily Drop', PREVROW('dd', 'Podsjetnik za novo pitanje', '', st.reminder === 'on') + time)
      + grp('Na mobitelu', NTF.map(([k, , d, p]) => PREVROW(k, NAMES[k], d, p)).join(''), mailNote) + device;
    if (NTF_AT === 'b') {
      const cell = (k, ch, on) => on === null ? '<td class="ntf-na"><span aria-hidden="true">—</span><span class="sr-only">nije dostupno</span></td>' : `<td><input type="checkbox" id="n-${k}-${ch}" data-k="n-${k}-${ch}"${on ? ' checked' : ''} aria-labelledby="nt-${k} nc-${ch}"></td>`;
      return grp('Daily Drop', dd) + `<section class="set-group"><h2 class="set-gt">Što i kako</h2><table class="ntf-table"><thead><tr><td></td><th scope="col" id="nc-push">Mobitel</th><th scope="col" id="nc-mail">E-pošta</th></tr></thead>
        <tbody>${NTF.map(([k, t, d, p, m]) => `<tr><th scope="row"><span class="set-t" id="nt-${k}">${t}</span>${d ? `<span class="set-d">${d}</span>` : ''}</th>${cell(k, 'push', p)}${cell(k, 'mail', m)}</tr>`).join('')}</tbody></table>${fixed}</section>` + device;
    }
    return grp('Daily Drop', dd)
      + grp('Na ovom uređaju', NTF.filter(x => x[3] !== null).map(([k, t, d, p]) => swRow('n-' + k, t, d, p)).join(''))
      + grp('E-pošta', NTF.filter(x => x[4] !== null).map(([k, t, d, , m]) => swRow('n-m-' + k, t, d, m)).join(''), 'Važne obavijesti o računu i sigurnosti uvijek stižu e-poštom.') + device;
  }

  /* Deactivate or delete (SET-09; D-066: the data copy is offered inside this flow). Nothing is pre-selected.
     a: one page (today). b: short steps: choose, data copy, confirm with the password, done.
     c: one page, then a dialog where the member types OBRIŠI. Every path ends on the same "done" screen. */
  const delDate = () => dayMonth(addDays(D.drop.date, 30));
  function deleteBody() {
    if (st.delStep === 'done') return st.del === 'off'
      ? `<div class="sub-hero">${ic('check')}<p class="sub-hero-t">Račun je deaktiviran</p><p class="help">Profil i odgovori su skriveni. Kad se opet prijaviš, sve se vraća.</p></div><button class="btn btn-secondary btn-block" data-a="to-signin" data-k="del-ok">U redu</button>`
      : `<div class="sub-hero sub-hero-wait">${ic('clock')}<p class="sub-hero-t">Brisanje je zakazano za ${delDate()}.</p><p class="help">Potvrda stiže e-poštom. Ako se predomisliš, prijavi se prije tog datuma i vrati račun.</p></div><button class="btn btn-secondary btn-block" data-a="to-signin" data-k="del-ok">U redu</button>`;
    if (DEL_AT !== 'b') return SUB.deleteA[1]();
    const step = st.delStep || 'choose';
    const prog = (i, n) => `<p class="progress-text">Korak ${i} od ${n}</p>`;
    if (step === 'choose') return `${choices('del', 'Što želiš?', [{ v: 'off', t: 'Deaktiviraj', d: 'Profil i odgovori se skrivaju. Kad se opet prijaviš, sve se vraća.' }, { v: 'del', t: 'Obriši trajno', d: `Račun se skriva odmah, a briše se ${delDate()}. Do tada se možeš predomisliti.` }], st.del, 'choices-compact')}
      <button class="btn btn-primary btn-block" data-a="del-next" data-k="del-next">Nastavi</button>`;
    if (step === 'copy') return `${prog(1, 3)}<div class="sub-step"><span class="step-ic" aria-hidden="true">${pic('database')}</span><h2 class="sub-h">Želiš li prvo kopiju svojih podataka?</h2>
      <p class="help">Odgovori, komentari, Music DNA i postavke u jednoj ZIP datoteci. Kad bude spremna, javimo e-poštom.</p></div>
      ${st.delCopy ? `<p class="status-line ok">${ic('check')}<span>Kopija se priprema.</span></p>` : ''}
      <div class="foot-row equal"><button class="btn btn-secondary" data-a="del-copy" data-k="del-copy"${st.delCopy ? ' disabled' : ''}>Preuzmi kopiju</button><button class="btn btn-secondary" data-a="del-next" data-k="del-next">${st.delCopy ? 'Nastavi' : 'Preskoči'}</button></div>`;
    if (step === 'confirm') return `${st.del === 'off' ? '' : prog(2, 3)}<h2 class="sub-h">${st.del === 'off' ? 'Deaktiviraj račun' : `Obriši račun ${delDate()}`}</h2>
      <ul class="sub-facts">${st.del === 'off'
        ? '<li>Profil, Music DNA i odgovori se skrivaju.</li><li>Nitko ti ne može pisati ni te pratiti.</li><li>Kad se opet prijaviš, sve se vraća.</li>'
        : `<li>Račun se skriva odmah.</li><li>${delDate()} brišemo profil, Music DNA, odgovore, komentare i reakcije.</li><li>Do tada se možeš prijaviti i vratiti račun.</li><li>Neke zapise moramo čuvati duže jer to traži zakon. Piše u Pravilima privatnosti.</li>`}</ul>
      ${field({ id: 'delpw', label: 'Za potvrdu upiši lozinku', type: 'password', attrs: 'autocomplete="current-password"' })}
      <button class="btn btn-danger btn-block" data-a="del-go" data-k="del-go">${st.del === 'off' ? 'Deaktiviraj' : `${ic('trash', 'sm')}Obriši račun`}</button>`;
    return '';
  }

  /* ---------- Round 12a (owner, session 14): other members' profiles (PROF-01, PROF-03), the follower lists (PROF-07,
     with "Ukloni pratitelja", D-069) and follow requests (ACT-02). Options compared in round12a.html. ----------
     ?flow=drop&at=member&who=<handle>   another member's profile (default petra.zvuk; as=blocker|blocked use mia_vinyl)
     &rel=none|req|fol|mut|fy            the viewer's side: nothing, requested, following, Mutual, "follows you" only
     ?at=follows&list=followers|following&who=<handle>   a follower list (default: the viewer's own); &private=1 enables "Ukloni"
     ?at=requests&private=1              follow requests (ACT-02)      ?at=mdrops&who=<handle>   the answer history (PROF-03)
     &show=unfollow|cancel|remove|menu   opens that sheet or dialog on load (&h=<handle> for remove)
     ?rbtn=a|b    the relationship button: a wide row under the header, or b next to the name with ⋯ in the top bar
     ?mutual=a|b  a: the button itself says "Uzajamni"; b: the button stays "Pratiš" and a chip by the name says "Uzajamni"
     ?pst=a|b|c   the private profile: a quiet block, b one line under the bio, c a card that holds the request button
     ?hist=a|b|c  answer history rows: a date and question only, b answer cards, c question plus the first lines
     ?req=a|b|c   follow requests: a one row on top of Activity that opens ACT-02, b inline in Activity (D-068), c both
     ?fl=a|b      the lists: a one screen with two tabs, b two screens      ?rm=a|b   remove a follower: a button, b ⋯ per row
     Who sees what follows J4: hidden sections are omitted, never shown locked; counts show only to viewers who may see
     the list (D-033, U-13); a private profile shows the header and the request button only (P state). */
  const RBTN_AT = pick('rbtn', ['a', 'b'], 'a');
  const MUT_AT = pick('mutual', ['a', 'b'], 'b');
  const PST_AT = pick('pst', ['a', 'b', 'c'], 'a');
  const HIST_AT = pick('hist', ['a', 'b', 'c'], 'c');
  const REQ_AT = pick('req', ['a', 'b', 'c'], 'a');
  const FL_AT = pick('fl', ['a', 'b'], 'a');
  const RM_AT = pick('rm', ['a', 'b'], 'a');
  const ME_H = 'ana.slusa'; // the signed-in member in the follow graph (data.js)
  const isMe = h => h === ME_H || (st.username && h === st.username);
  const FOLLOWS = D.follows.map(p => p.slice());
  const follows = (a, b) => FOLLOWS.some(p => p[0] === a && p[1] === b);
  function setFollow(a, b, on) { const i = FOLLOWS.findIndex(p => p[0] === a && p[1] === b); if (i >= 0) FOLLOWS.splice(i, 1); if (on) FOLLOWS.push([a, b]); }
  const followersOf = h => FOLLOWS.filter(p => p[1] === h).map(p => p[0]);
  const followingOf = h => FOLLOWS.filter(p => p[0] === h).map(p => p[1]);
  const member = h => isMe(h)
    ? { who: st.displayName || 'Ana', dna: st.genres, artists: st.artists.map(a => a.name), bio: BIO, vis: st.vis || 'public', dnaVis: st.dnaVis || 'all', hist: st.histVis || 'same', lists: st.lists || 'followers', me: true }
    : (D.members[h] || { who: h, dna: [], vis: 'public' });
  /* The viewer's relationship with h: fol = I follow h, fy = h follows me, req = my request to h is pending. */
  const rel = h => ({ fol: follows(ME_H, h), fy: follows(h, ME_H), req: st.req.has(h) });
  /* What the viewer may see of h, from h's own settings. */
  const canSee = h => { const m = member(h); return !!m.me || m.vis !== 'private' || rel(h).fol; };
  const seeDna = h => { const m = member(h), v = m.dnaVis || 'all'; return !!m.me || (canSee(h) && (v === 'all' || (v === 'followers' && rel(h).fol))); };
  const seeHist = h => { const m = member(h), v = m.hist || 'same'; return !!m.me || (canSee(h) && (v === 'same' || (v === 'followers' && rel(h).fol))); };
  const seeLists = h => { const m = member(h), v = m.lists || 'followers'; return !!m.me || (canSee(h) && (v === 'all' || (v === 'followers' && rel(h).fol))); };
  /* Requests to the viewer exist only while the viewer's profile is private. */
  const pendingReqs = () => st.vis === 'private' ? D.requests.filter(h => !st.reqDone[h]) : [];
  /* A member's Daily Drop answers: today's from the question page, then the fictional earlier ones. */
  function dropsOf(h) {
    const m = member(h), out = [];
    const today = m.me ? st.mine : allAnswers().find(a => a.handle === h);
    if (today) out.push({ date: D.drop.date, q: D.drop.question, text: today.text, lang: today.lang, today: true });
    (m.drops || []).forEach(x => { const p = D.pastDrops[x.d]; if (p) out.push({ date: p.date, q: p.q, text: x.text, lang: m.lang }); });
    return out;
  }
  /* A name that opens the member's profile (answers, comments). Own answers keep the plain name. */
  const whoLink = (a, k) => a.mine || isMe(a.handle) ? `<span class="name">${esc(a.who)}</span>` : `<button class="who-link" data-a="open-member" data-h="${esc(a.handle)}" data-k="${k}"><span class="name">${esc(a.who)}</span></button>`;
  const dnaFixed = (key, m, h) => `<canvas class="dna" data-dna="${key}" data-genres="${esc((m.dna || []).join('|'))}" data-artists="${esc((m.artists || []).join('|'))}" data-h="${h}" aria-hidden="true"></canvas>`;
  const artistsOf = m => (m.artists || []).length ? `<ul class="portraits portraits-sm" aria-label="Izvođači">${m.artists.map(n => `<li>${artistTile(fx(n) || { name: n })}<span class="p-name">${esc(n)}</span></li>`).join('')}</ul>` : '';
  const vbadge = () => `<button class="vbadge" data-a="toast" data-msg="Verificirano: administratori su ručno potvrdili da je ovo pravi izvođač ili glazbeni profesionalac. Nije plaćeni status ni rang." data-k="vbadge" aria-label="Verificirani račun, što to znači?">${ic('check')}</button>`;
  /* The relationship button names its state; unfollow and cancel are separate, confirmed actions (J4). */
  function relBtn(h, cls) {
    const m = member(h), r = rel(h), c = `btn${cls ? ' ' + cls : ''}`;
    if (r.req) return `<button class="${c} btn-secondary" data-a="req-cancel" data-h="${h}" data-k="rel-${h}" aria-label="Zatraženo. Povuci zahtjev za praćenje">${ic('clock', 'sm')}Zatraženo</button>`;
    if (r.fol) {
      const mut = r.fy && MUT_AT === 'a';
      return `<button class="${c} btn-secondary${mut ? ' btn-mut' : ''}" data-a="unfollow" data-h="${h}" data-k="rel-${h}" aria-label="${mut ? 'Uzajamni' : r.fy ? 'Pratiš, uzajamno' : 'Pratiš'}. Prestani pratiti">${ic(mut ? 'mutual' : 'check', 'sm')}${mut ? 'Uzajamni' : 'Pratiš'}</button>`;
    }
    return `<button class="${c} btn-primary" data-a="follow" data-h="${h}" data-k="rel-${h}">${ic('userplus', 'sm')}${m.vis === 'private' ? 'Zatraži praćenje' : 'Prati'}</button>`;
  }
  function relChip(h) {
    const r = rel(h);
    if (r.fol && r.fy && MUT_AT === 'b') return `<span class="rel-chip is-mut">${ic('mutual', 'sm')}Uzajamni</span>`;
    if (r.fy && !r.fol) return '<span class="rel-chip">Prati te</span>';
    return '';
  }
  /* Counts, number over label (D-068). Each opens its list. A viewer who may not see a list sees no number (U-13). */
  function countsRow(h, own) {
    const n = dropsOf(h).length, fo = followersOf(h).length, fi = followingOf(h).length;
    const btn = (k, num, label, a, extra) => `<button class="cnt" data-a="${a}" data-h="${h}"${extra ? ' ' + extra : ''} data-k="cnt-${k}"><b>${num}</b><span>${label}</span></button>`;
    const parts = [];
    if (own || seeLists(h)) parts.push(btn('fo', fo, pl(fo, 'pratitelj', 'pratitelja', 'pratitelja'), 'open-follows', 'data-l="followers"'), btn('fi', fi, 'prati', 'open-follows', 'data-l="following"'));
    if (own || seeHist(h)) parts.push(btn('ans', n, plAns(n), 'open-mdrops'));
    return parts.length ? `<div class="prow-b">${parts.join('')}</div>` : '';
  }
  const HIST_MSG = 'Ovdje bi se otvorilo to pitanje, s odgovorom te osobe na vrhu.';
  function histRow(x, i) {
    const attrs = x.today ? 'data-a="open-drop"' : `data-a="toast" data-msg="${HIST_MSG}"`;
    const lang = x.lang ? ` lang="${x.lang}"` : '';
    if (HIST_AT === 'a') return `<li><button class="past-item" ${attrs} data-k="hist-${i}"><span class="past-date"><time datetime="${x.date}">${longDate(x.date)}</time></span><span class="past-q">${esc(x.q)}</span>${ic('chevron', 'past-ic')}</button></li>`;
    if (HIST_AT === 'b') return `<li><article class="hcard"><p class="ctx">${esc(x.q)}</p><p class="hcard-t"${lang}>${esc(x.text)}</p><p class="hcard-meta"><time datetime="${x.date}">${longDate(x.date)}</time><button class="link" ${attrs} data-k="hist-${i}">Otvori pitanje</button></p></article></li>`;
    return `<li><button class="hrow" ${attrs} data-k="hist-${i}"><span class="hrow-q"><time datetime="${x.date}">${longDate(x.date)}</time><span aria-hidden="true"> · </span><span class="sr-only">, </span>${esc(x.q)}</span><span class="hrow-t"${lang}>${esc(x.text)}</span>${ic('chevron', 'past-ic')}</button></li>`;
  }
  const histEmpty = own => emptyBox(pic('calendar-dots', 'empty-ic'), 'Još nema odgovora.', own ? 'Tvoji odgovori na Daily Drop skupljaju se ovdje.' : 'Odgovori na Daily Drop skupljaju se ovdje.');
  function privBlock(h) {
    const t = 'Ovaj profil je privatan', d = 'Zatraži praćenje da vidiš Music DNA i povijest odgovora. Odgovore na Daily Drop ionako vidiš uz svako pitanje.';
    if (PST_AT === 'b') return `<p class="pf-vis priv-line">${ic('lock', 'sm')}<span>Privatan profil. Zatraži praćenje da vidiš Music DNA i povijest odgovora.</span></p>`;
    if (PST_AT === 'c') return `<div class="blk-card priv-card">${ic('lock')}<p class="set-t">${t}.</p><p class="set-d">${d}</p>${relBtn(h, 'btn-sm')}</div>`;
    return emptyBox(ic('lock', 'empty-ic'), t + '.', d);
  }
  const pmenuBtn = h => `<button class="iconbtn" data-a="pmenu" data-h="${h}" data-k="pmenu" aria-label="Više opcija: profil ${esc(member(h).who)}">${ic('more')}</button>`;
  function memberBody(h) {
    const m = member(h), see = canSee(h);
    const chip = relChip(h);
    const withBtn = see || PST_AT !== 'c';
    const head = `<div class="pm-head${RBTN_AT === 'b' ? ' pm-head-b' : ''}">${avatar(h, m.who, 'lg')}<div class="pm-id"><h1 class="prof-name pm-name"><span>${esc(m.who)}</span>${m.verified ? vbadge() : ''}</h1>
      <p class="meta">@${esc(h)}${m.verified ? '<span aria-hidden="true">·</span><span>Verificirano</span>' : ''}${chip ? `<span aria-hidden="true">·</span>${chip}` : ''}</p></div>${RBTN_AT === 'b' && withBtn ? relBtn(h, 'btn-sm') : ''}</div>`;
    const bio = m.bio ? `<p class="pf-bio">${esc(m.bio)}</p>` : '';
    const relRow = RBTN_AT === 'a' && withBtn ? `<div class="rel-row">${relBtn(h)}${pmenuBtn(h)}</div>` : '';
    let body = '';
    if (!see) body = privBlock(h);
    else {
      if (seeDna(h)) body += `<section class="section" aria-labelledby="h-mdna"><h2 id="h-mdna" class="section-title">Music DNA</h2><figure class="dna-card">${dnaFixed('m-' + h, m, 170)}<figcaption><span class="dna-hint" aria-hidden="true">Dodirni spiralu</span><p class="sr-only">Žanrovi: ${(m.dna || []).map(esc).join(', ')}.</p></figcaption></figure>${artistsOf(m)}</section>`;
      if (seeHist(h)) { const ds = dropsOf(h); body += `<section class="section" aria-labelledby="h-mdd"><h2 id="h-mdd" class="section-title">Daily Drop odgovori${ds.length ? ` <span class="count">${ds.length}</span>` : ''}</h2>${ds.length ? `<ul class="hist hist-${HIST_AT}">${ds.slice(0, 3).map(histRow).join('')}</ul>${ds.length > 3 ? `<button class="link" data-a="open-mdrops" data-h="${h}" data-k="all-hist">Svi odgovori (${ds.length})</button>` : ''}` : histEmpty(false)}</section>`; }
    }
    return `${head}${bio}${relRow}${countsRow(h)}${body}<p class="meta">Izmišljeni podaci. Vidiš samo ono što je ta osoba dopustila; skriveni dijelovi se ne prikazuju ni kao zaključani (J4).</p>`;
  }
  function mdropsBody(h) {
    const m = member(h), ds = dropsOf(h);
    const person = `<button class="fl-person mdrops-head" data-a="open-member" data-h="${h}" data-k="md-who">${avatar(h, m.who, 'sm')}<span class="set-txt"><span class="set-t">${esc(m.who)}</span><span class="set-d">@${esc(h)}</span></span></button>`;
    return `${person}${ds.length ? `<ul class="hist hist-${HIST_AT}">${ds.map(histRow).join('')}</ul>` : histEmpty(!!m.me)}<p class="meta">${m.me ? 'Tko vidi ovaj popis biraš u Postavkama, pod Privatnost (D-032).' : 'Pojedinačni odgovori uz pitanje vide se svima; ovaj popis vidiš jer je ta osoba to dopustila.'}</p>`;
  }
  /* Lists (PROF-07): one row per person, the name opens the profile, the right side acts. */
  function personRow(h, right, k) {
    const m = member(h);
    return `<li class="fl-row"><button class="fl-person" data-a="open-member" data-h="${h}" data-k="${k}-${h}">${avatar(h, m.who, 'sm')}<span class="set-txt"><span class="set-t">${esc(m.who)}</span><span class="set-d">@${esc(h)}${m.me ? ' · ti' : m.verified ? ' · Verificirano' : ''}</span></span></button>${right || ''}</li>`;
  }
  function listRight(h, own, which) {
    if (isMe(h)) return '';
    if (own && which === 'followers' && st.vis === 'private') {
      if (RM_AT === 'b') return `<button class="iconbtn" data-a="rm-menu" data-h="${h}" data-k="rmm-${h}" aria-label="Više opcija: ${esc(member(h).who)}">${ic('more')}</button>`;
      return `<button class="btn btn-secondary btn-sm" data-a="rm-follower" data-h="${h}" data-k="rm-${h}">Ukloni</button>`;
    }
    return relBtn(h, 'btn-sm fl-btn');
  }
  function followsBody() {
    const h = st.listOf || ME_H, own = isMe(h), which = st.list || 'followers';
    const fo = followersOf(h), fi = followingOf(h), list = which === 'followers' ? fo : fi;
    const tabs = FL_AT === 'a' ? `<fieldset class="sort fl-tabs"><legend class="sr-only">Popis</legend>${[['followers', 'Pratitelji', fo.length], ['following', 'Prati', fi.length]].map(([v, l, n]) => `<label><input type="radio" name="fl" value="${v}" data-k="fl-${v}"${which === v ? ' checked' : ''}><span>${l}<b>${n}</b></span></label>`).join('')}</fieldset>` : '';
    const note = own && which === 'followers' ? (st.vis === 'private' ? '<p class="set-note">Privatan profil: pratitelja možeš ukloniti bez blokiranja. Ta osoba ne dobije obavijest i može opet poslati zahtjev.</p>' : '<p class="set-note">Tko vidi ovaj popis biraš u Postavkama, pod Privatnost.</p>') : '';
    const empty = which === 'followers' ? emptyBox(pic('users-three', 'empty-ic'), 'Još nema pratitelja.', own ? 'Ljudi te nađu kroz odgovore na Daily Drop.' : '') : emptyBox(pic('users-three', 'empty-ic'), own ? 'Još nikoga ne pratiš.' : 'Još nikoga ne prati.', own ? 'Ljude možeš pronaći kroz odgovore na Daily Drop.' : '');
    return `${tabs}${list.length ? `<ul class="fl-list">${list.map(x => personRow(x, listRight(x, own, which), 'fl')).join('')}</ul>` : empty}${note}`;
  }
  /* Follow requests (ACT-02). Accepting follows at once; declining is silent and allows a later request (J4). */
  function requestsBody() {
    if (st.vis !== 'private') return emptyBox(ic('lock', 'empty-ic'), 'Nema zahtjeva.', 'Zahtjevi za praćenje stižu samo dok je profil privatan.');
    const rows = D.requests.map(h => {
      const d = st.reqDone[h];
      if (d === 'no') return '';
      const right = d === 'ok' ? `<span class="req-done">${ic('check', 'sm')}<span>Prihvaćeno. ${esc(member(h).who)} te sada prati.</span></span>`
        : `<span class="act-btns"><button class="btn btn-primary btn-sm" data-a="req-ok" data-h="${h}" data-k="req-ok-${h}">Prihvati</button><button class="btn btn-secondary btn-sm" data-a="req-no" data-h="${h}" data-k="req-no-${h}">Odbij</button></span>`;
      return personRow(h, right, 'req');
    }).join('');
    return `${rows ? `<ul class="fl-list req-list">${rows}</ul>` : emptyBox(ic('users', 'empty-ic'), 'Nema novih zahtjeva.', 'Kad netko zatraži praćenje, vidiš to ovdje i u Aktivnosti.')}<p class="set-note">Tko je prihvaćen, odmah te prati. Odbijanje ne šalje obavijest, a ta osoba može poslati novi zahtjev kasnije.</p>`;
  }

  const S = {
    invite: () => ({
      kind: 'bare',
      body: `<div class="hero">
        ${INV_AT === 'a' ? invCur(64) : ''}
        <p class="eyebrow">Pozivnica</p>
        <h1 class="h-hero">Imaš pozivnicu za ${wm()}</h1>
        <p class="tagline" lang="en">Where musical worlds collide.</p>
        ${INV_AT === 'b' ? invCur(window.matchMedia('(max-height: 600px)').matches ? 40 : 56, 'inv-wide') : INV_AT === 'c' ? invCur(56, 'inv-wide') : ''}
        <p class="lead">Svaki dan jedno pitanje za sve. Otkrij svoj Music DNA, raspravljaj o glazbi i poveži se s ljudima različitih ukusa.</p>
      </div>
      <div class="info info-stack">
        <p>${ic('info')}<span>Zatvorena alfa: neke stvari još nedostaju i mogu se promijeniti. <button class="link" data-a="toast" data-msg="Ovdje bi se otvorila stranica o alfi (PUB-12)." data-k="alpha-more">Više o alfi</button></span></p>
        <p>${pic('device-mobile', 'pwa-ic')}<span>${wm(true)} je web-aplikacija (PWA). Verzije za iOS i Android možda stignu kasnije.</span></p>
        <p>${pic('plus-square', 'pwa-ic')}<span>Dodaj app na početni zaslon: otvara se kao aplikacija, uz podsjetnike. <button class="link" data-a="toast" data-msg="Ovdje bi se otvorile kratke upute za iPhone i Android (Dodaj na početni zaslon)." data-k="pwa-how">Kako?</button></span></p>
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
        <span class="step-ic" aria-hidden="true">${pic('globe-hemisphere-east')}</span>
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
        ${field({ id: 'pw', label: 'Lozinka', help: `Najmanje ${PW_MIN} znakova, veliko i malo slovo te poseban znak.`, type: st.showPw ? 'text' : 'password', value: st.pw, desc: 'pw-need',
          attrs: 'autocomplete="new-password" autocapitalize="none" spellcheck="false"',
          after: `<button type="button" class="input-btn" data-a="showpw" data-k="showpw" aria-label="${st.showPw ? 'Sakrij lozinku' : 'Prikaži lozinku'}">${pic(st.showPw ? 'eye-slash' : 'eye', 'pw-ic')}<span>${st.showPw ? 'Sakrij' : 'Prikaži'}</span></button>` })}
        <div class="pw-meter" id="pw-meter">${pwMeter()}</div>
        <p class="or"><span>ili</span></p>
        <button class="btn btn-secondary btn-block" data-a="google" data-k="google">Nastavi s Google računom</button>
        <p class="fine fine-terms"><span>Nastavkom prihvaćaš <button class="link" data-a="toast" data-msg="Uvjeti korištenja (PUB-10) nisu dio skice." data-k="terms">Uvjete korištenja</button>.</span>
          <span>Kako koristimo podatke piše u <button class="link" data-a="toast" data-msg="Pravila privatnosti (PUB-10) nisu dio skice." data-k="privacy">Pravilima privatnosti</button>.</span></p>`,
      foot: nextBtn('Napravi račun')
    }),
    username: () => ({
      kind: 'onb',
      body: `<h1>Kako se zoveš?</h1>
        ${field({ id: 'dname', label: 'Ime za prikaz', help: 'Tako te drugi vide. Do tri riječi, svaka počinje velikim slovom.', value: st.displayName, attrs: 'autocomplete="nickname" autocapitalize="words" maxlength="40"' })}
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
          <div class="notif" role="img" aria-label="Primjer obavijesti: Daily Drop je stigao. ${esc(NOTIF_Q)}">
            <span class="notif-app" aria-hidden="true">${current('notif', 'sm')}</span>
            <span class="notif-body" aria-hidden="true"><span class="notif-top"><b>${wm()}</b><span>sada</span></span>
            <span class="notif-t">Daily Drop je stigao</span><span class="notif-q">${esc(NOTIF_Q)}</span></span>
          </div>
          <p class="rift-note">Svaki dan jedno pitanje i cijela Rift zajednica na istom mjestu. Podsjetnik te dovede na vrijeme.</p>
          ${denied ? `<div class="notice" role="status">${ic('alert')}<p>Preglednik je blokirao obavijesti, pa je podsjetnik isključen. Možeš ga uključiti kasnije u postavkama preglednika i GrooveRifta.</p></div>` : `
          <div class="rem-row"><label class="label" for="f-time">Podsjetnik u</label>
            <select class="select rem-time" id="f-time" data-k="f-time">${['07:00', '08:00', '09:00', '12:00', '17:00', '20:00', '22:00'].map(t => `<option${st.remTime === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
            <p class="meta rem-tz">${ic('clock', 'sm')}<span>Zagreb</span> <button class="link" data-a="toast" data-msg="Promjena vremenske zone nije dio skice." data-k="tz" aria-label="Promijeni vremensku zonu">Promijeni</button></p></div>`}
          <div class="install">
            <span class="install-ic" aria-hidden="true">${pic('plus-square')}</span>
            <p class="install-body"><span class="install-t">Drži ${wm()} pri ruci</span><span class="install-d">Dodaj ga na početni zaslon pa se otvara kao aplikacija. Na iPhoneu podsjetnici rade tek tada.</span></p>
            <button class="btn btn-secondary btn-sm" data-a="toast" data-msg="Ovdje bi se otvorile kratke upute: na iPhoneu Dijeli → Dodaj na početni zaslon, a na Androidu ponuda preglednika za instalaciju." data-k="install">Dodaj</button>
          </div>`,
        foot: denied ? nextBtn() : `<div class="foot-row equal">
          <button class="btn btn-secondary" data-a="remind-off" data-k="remind-off">Ne sada</button>
          <button class="btn btn-secondary" data-a="remind-on" data-k="remind-on">${ic('bell', 'sm')}Uključi</button></div>`
      };
    },
    done: () => ({
      kind: 'bare',
      body: `<div class="hero hero-done">
        <h1 class="h-hero">Spremno.</h1>
        <p class="lead lead-done">Sad si dio Rifta.<br>Današnje pitanje te već čeka.</p>
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
      body: hubBody()
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
          <div class="list-head"><h2 class="section-title" id="h-answers">Odgovori${listReady() && st.answers.length ? ` <span class="count">${st.answers.length}</span>` : ''}</h2></div>
          ${dropList()}`,
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
              <h3 class="ans-who" id="hc-${i}" tabindex="-1">${whoLink(c, 'who-c' + i)}<span class="sr-only">, </span><span class="handle">@${esc(c.handle)}</span></h3><span class="ans-time"><time>${c.time}</time></span></header>
              <p${c.lang ? ` lang="${c.lang}"` : ''}>${esc(c.text)}</p>${c.refs && c.refs.length ? `<ul class="refs com-refs">${c.refs.map((r, j) => refCard(D.refs[r], 'c' + a.id + i, j)).join('')}</ul>` : ''}</article></li>${STATE === 'blocked' && i === 0 ? '<li><p class="com-gone">Ovaj komentar nije dostupan.</p></li>' : ''}`).join('')}</ul>`
              : emptyBox(pic('chats-circle', 'empty-ic'), 'Još nema komentara.', 'Započni razgovor.')}
          </section>
          <form class="composer composer-comment" data-form="comment" novalidate>
            <label class="composer-label" for="f-com">Tvoj komentar</label>
            <div class="live-field"><textarea class="textarea" id="f-com" data-k="f-com" rows="2"${st.err.com ? ' aria-invalid="true" aria-describedby="err-com"' : ''}>${esc(st.commentDraft)}</textarea></div>
            ${st.err.com ? fieldErr('com', st.err.com) : ''}
            ${refsEditor('com')}
            ${audience('comment')}
            ${NET_OFF ? `<p class="post-off" id="com-off">${ic('offline', 'sm')}<span>Objava treba mrežu. Tekst ostaje ovdje dok je stranica otvorena.</span></p>` : ''}
            <div class="composer-actions composer-split"><button type="button" class="btn btn-secondary" data-a="com-cancel" data-k="com-cancel">Odustani</button><button type="submit" class="btn btn-primary" data-k="com-post" aria-describedby="aud-c${NET_OFF ? ' com-off' : ''}"${NET_OFF ? ' disabled' : ''}>Komentiraj</button></div>
          </form>`
      };
    },
    activity: () => ({
      kind: 'app', tab: 'activity', topTitle: 'Aktivnost', topH1: true,
      body: activityBody()
    }),
    profile: () => ({
      kind: 'app', tab: 'profile', topTitle: 'Profil',
      topActions: `<button class="iconbtn" data-a="settings" data-k="settings" aria-label="Postavke">${pic('gear-six', 'top-ic')}</button>`,
      body: profileBody()
    }),
    setsub: () => {
      const sub = SUB[st.sub] || SUB.account;
      return { kind: 'app', tab: 'profile', back: true, topTitle: sub[0], topH1: true, body: NET_OFF ? `<p class="net-hint">${ic('offline', 'sm')}<span>Bez mreže postavke možeš samo pregledati.</span></p><fieldset class="sub sub-ro" disabled>${sub[1]()}</fieldset>` : `<div class="sub">${sub[1]()}</div>` };
    },
    settings: () => ({
      kind: 'app', tab: 'profile', back: true, topTitle: 'Postavke', topH1: true,
      body: settingsBody()
    }),
    /* Round 10: sign-in (PUB-02). One generic error that never says which part was wrong. */
    signin: () => ({
      kind: 'onb', noProgress: true,
      body: `<h1>Prijava</h1>
        ${st.err.signin ? `<div class="notice" role="alert" id="err-signin" tabindex="-1">${ic('alert')}<p>E-pošta ili lozinka nisu točni. Provjeri pa pokušaj ponovno.</p></div>` : ''}
        ${field({ id: 'email', label: 'E-pošta', type: 'email', value: D.email, attrs: 'autocomplete="email"' })}
        ${field({ id: 'pwin', label: 'Lozinka', type: st.showPw ? 'text' : 'password', value: st.pwIn || '',
          attrs: 'autocomplete="current-password" autocapitalize="none" spellcheck="false"',
          after: `<button type="button" class="input-btn" data-a="showpw" data-k="showpw" aria-label="${st.showPw ? 'Sakrij lozinku' : 'Prikaži lozinku'}">${pic(st.showPw ? 'eye-slash' : 'eye', 'pw-ic')}<span>${st.showPw ? 'Sakrij' : 'Prikaži'}</span></button>` })}
        <button class="link signin-forgot" data-a="toast" data-msg="Ponovno postavljanje lozinke (PUB-04): poveznica stiže e-poštom i kratko vrijedi." data-k="forgot">Zaboravljena lozinka?</button>
        <p class="or"><span>ili</span></p>
        <button class="btn btn-secondary btn-block" data-a="signin-ok" data-k="google">Nastavi s Google računom</button>
        <p class="fine">Nemaš račun? ${wm()} je zasad samo uz pozivnicu.</p>
        <p class="meta">Skica: prolazi bilo koja lozinka, a „kriva” pokazuje grešku.</p>`,
      foot: '<button class="btn btn-primary btn-block" data-a="signin" data-k="signin">Prijavi se</button>'
    }),
    /* Sign-in during the 30-day grace period (SET-09). The two choices carry equal weight. */
    pending: () => ({
      kind: 'onb', noProgress: true,
      body: `<div class="center-block"><span class="step-ic" aria-hidden="true">${ic('clock')}</span>
        <h1>Račun se briše ${delDate()}.</h1>
        <p class="lead">Brisanje je zatraženo ${dayMonth(D.drop.date)}. Do ${delDate()} možeš vratiti račun i sve ostaje kako je bilo.</p></div>`,
      foot: `<div class="foot-row equal"><button class="btn btn-secondary" data-a="to-signin" data-k="pend-out">Odjavi se</button><button class="btn btn-secondary" data-a="pend-restore" data-k="pend-restore">Vrati račun</button></div>`
    }),
    /* Another member's profile after a block (D-019, IA §6.1 B). as=blocker: the member who blocked sees the header
       and Unblock. as=blocked: the blocked member gets the neutral "not available" page, the same as a missing one. */
    member: () => {
      const h = st.who || 'petra.zvuk', m = member(h);
      if (P.get('as') === 'blocked') return { kind: 'app', tab: 'home', back: true, topBlank: true,
        body: `<div class="sys-na"><h1>Ova stranica nije dostupna</h1><p class="lead lead-sm">Možda je poveznica pogrešna ili profil više ne postoji.</p><button class="btn btn-secondary" data-a="tab" data-t="home" data-k="na-home">Na početnu</button></div>` };
      if (P.get('as') === 'blocker') return { kind: 'app', tab: 'home', back: true, topTitle: '@' + h,
        body: `<div class="prof-head">${avatar(h, m.who, 'lg')}<div><h1 class="prof-name">${esc(m.who)}</h1><p class="meta">@${h}</p></div></div>
          ${st.unblocked
            ? `<div class="blk-card"><p class="set-t">Odblokirano.</p><p class="set-d">Ako želiš, možeš opet pratiti @${h}. Blokada je prekinula praćenje u oba smjera (D-072).</p>${relBtn(h, 'btn-sm')}</div>`
            : `<div class="blk-card"><p class="set-t">Ovaj račun je blokiran.</p><p class="set-d">Ne vidite profile ni odgovore jedno drugoga. Ta osoba ne dobije obavijest o tome.</p><button class="btn btn-secondary btn-sm" data-a="unblock" data-k="unblock">Odblokiraj</button></div>`}` };
      /* Round 12a: the full profile of another member (PROF-01). */
      return { kind: 'app', tab: 'home', back: true, topTitle: '@' + h, topActions: RBTN_AT === 'b' ? pmenuBtn(h) : '', body: memberBody(h) };
    },
    /* Round 12a: follower lists (PROF-07), follow requests (ACT-02) and the answer history (PROF-03). */
    follows: () => {
      const h = st.listOf || ME_H, which = st.list || 'followers';
      return { kind: 'app', tab: isMe(h) ? 'profile' : 'home', back: true, topTitle: FL_AT === 'b' ? (which === 'followers' ? 'Pratitelji' : 'Prati') : '@' + h, topH1: FL_AT === 'b',
        body: `${FL_AT === 'b' ? '' : `<h1 class="sr-only">Pratitelji i praćeni: @${esc(h)}</h1>`}${followsBody()}` };
    },
    requests: () => ({ kind: 'app', tab: 'activity', back: true, topTitle: 'Zahtjevi za praćenje', topH1: true, body: requestsBody() }),
    mdrops: () => { const h = st.who || ME_H; return { kind: 'app', tab: isMe(h) ? 'profile' : 'home', back: true, topTitle: 'Daily Drop odgovori', topH1: true, body: mdropsBody(h) }; }
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
    return `<header class="topbar">${left}${mid}<div class="top-right">${s.topActions || ''}${netChip()}<span class="alpha-tag">Alfa</span>${onb ? '<button class="lang-btn" data-a="lang" data-k="lang" aria-label="HR, promijeni jezik">HR</button>' : ''}</div></header>`;
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
    if (o.type === 'age18') {
      if (AGE18_AT === 'c') return `<div class="scrim"></div><div class="sheet age18" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div class="sheet-head"><h2 id="ov-title" class="sheet-title">Još jedna potvrda</h2></div>
        <label class="age-check"><input type="checkbox" id="f-age18" data-k="f-age18"${st.err.age18 ? ' aria-invalid="true" aria-describedby="err-age18"' : ''}><span>Potvrđujem da imam 18 ili više godina i da je moj odgovor istinit.</span></label>
        ${st.err.age18 ? fieldErr('age18', st.err.age18) : ''}
        <p class="help">${wm()} je zajednica punoljetnih. Pravila zajednice to traže od svih članova.</p>
        <button class="btn btn-primary btn-block" data-a="age18-ok" data-k="ov-ok">Nastavi</button></div>`;
      if (AGE18_AT === 'b') return `<div class="scrim"></div><div class="dialog age18" role="alertdialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
        <span class="step-ic" aria-hidden="true">${pic('users-three')}</span>
        <h2 id="ov-title" class="dialog-title">Samo za punoljetne</h2>
        <p id="ov-desc">Ako se pokaže da imaš manje od 18 godina, račun zatvaramo i brišemo tvoje podatke.</p>
        <div class="dialog-stack"><button class="btn btn-primary btn-block" data-a="age18-ok" data-k="ov-ok">Imam 18 ili više, nastavi</button><button class="btn btn-secondary btn-block" data-a="age18-minor" data-k="ov-minor">Imam manje od 18</button></div></div>`;
      return `<div class="scrim"></div><div class="dialog age18" role="alertdialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
        <h2 id="ov-title" class="dialog-title">Potvrdi da imaš 18 ili više godina</h2>
        <p id="ov-desc">${wm()} je samo za punoljetne. Ako to nije točno, vrati se i promijeni odgovor.</p>
        <div class="dialog-actions"><button class="btn btn-secondary" data-a="overlay-close" data-k="ov-cancel">Natrag</button><button class="btn btn-primary" data-a="age18-ok" data-k="ov-ok">Potvrđujem</button></div></div>`;
    }
    /* Round 10 overlays. */
    if (o.type === 'pick') {
      const it = PRIV_ITEMS().find(x => x[0] === o.p);
      return `<div class="scrim" data-a="overlay-close"></div><div class="sheet sheet-pick" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div class="sheet-head"><h2 id="ov-title" class="sheet-title">${it[1]}</h2><button class="iconbtn" data-a="overlay-close" data-k="ov-x" aria-label="Zatvori">${ic('x')}</button></div>
        ${choices(it[0], it[2], it[3], it[4], 'choices-compact')}
        <button class="btn btn-primary btn-block" data-a="overlay-close" data-k="ov-done">Gotovo</button></div>`;
    }
    const dlg = (title, desc, cancel, okA, okLabel, danger, extra) => `<div class="scrim" data-a="overlay-close"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="ov-title" aria-describedby="ov-desc">
        <h2 id="ov-title" class="dialog-title">${title}</h2><p id="ov-desc">${desc}</p>${extra || ''}
        <div class="dialog-actions"><button class="btn btn-secondary" data-a="overlay-close" data-k="ov-cancel">${cancel}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="${okA}" data-k="ov-ok"${o.disabled ? ' disabled' : ''}>${okLabel}</button></div></div>`;
    /* Round 12a overlays: the profile menu (same items as on an answer, J4 IA10), unfollow and cancel as confirmed
       actions, and removing a follower (D-069). */
    if (o.type === 'pmenu' || o.type === 'rmmenu') {
      const h = o.h, m = member(h), j5 = 'Utišavanje, blokiranje i prijava s potvrdom (SAFE-01 do SAFE-03) dolaze u rundi 12b.';
      const items = o.type === 'rmmenu'
        ? `<li><button class="menu-item" data-a="rm-from-menu" data-k="m-remove">${ic('userminus')}Ukloni pratitelja</button></li>
           <li><button class="menu-item" data-a="menu" data-msg="${j5}" data-k="m-block">${ic('x')}Blokiraj @${esc(h)}</button></li>`
        : `${m.vis !== 'private' ? `<li><button class="menu-item" data-a="menu" data-msg="Poveznica na profil kopirana (simulacija). Neprijavljeni vide ime, avatar i bio (PUB-08)." data-k="m-share">${ic('share')}Podijeli profil</button></li>` : ''}
           <li><button class="menu-item" data-a="menu" data-msg="${j5}" data-k="m-mute">${ic('bell')}Utišaj @${esc(h)}</button></li>
           <li><button class="menu-item" data-a="menu" data-msg="${j5}" data-k="m-block">${ic('x')}Blokiraj @${esc(h)}</button></li>
           <li><button class="menu-item" data-a="menu" data-msg="${j5}" data-k="m-report">${ic('alert')}Prijavi profil</button></li>`;
      return `<div class="scrim" data-a="overlay-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div class="sheet-head"><h2 id="ov-title" class="sheet-title">${esc(m.who)} <span class="handle">@${esc(h)}</span></h2><button class="iconbtn" data-a="overlay-close" data-k="ov-x" aria-label="Zatvori">${ic('x')}</button></div>
        <ul class="menu">${items}</ul></div>`;
    }
    if (o.type === 'unfollow') { const priv = member(o.h).vis === 'private'; return dlg(`Prestati pratiti @${esc(o.h)}?`, priv ? 'Profil je privatan: za ponovno praćenje trebat će novi zahtjev, koji ta osoba mora odobriti. Ne dobije obavijest o ovome.' : 'Možeš opet zapratiti bilo kad. Ta osoba ne dobije obavijest.', 'Odustani', 'unfollow-confirm', 'Prestani pratiti'); }
    if (o.type === 'cancelreq') return dlg(`Povući zahtjev za @${esc(o.h)}?`, 'Ta osoba ne dobije obavijest. Novi zahtjev možeš poslati kasnije.', 'Odustani', 'req-cancel-confirm', 'Povuci zahtjev');
    if (o.type === 'remove') return dlg(`Ukloniti @${esc(o.h)} iz pratitelja?`, 'Ta osoba više ne vidi tvoj profil, Music DNA ni povijest odgovora. Ne dobije obavijest i može opet poslati zahtjev. Blokiranje je jači korak.', 'Odustani', 'rm-confirm', 'Ukloni', true);
    if (o.type === 'uname') return dlg(`Promijeniti u @${esc(st.newUser)}?`, `Sljedeća promjena moguća je tek od ${dayMonth(addDays(D.drop.date, 30))}. @${esc(st.username)} ostaje rezervirano za tebe 30 dana.`, 'Odustani', 'uname-confirm', 'Promijeni');
    if (o.type === 'unblock') return dlg('Odblokirati @mia_vinyl?', 'Opet ćete vidjeti profile i odgovore jedno drugoga. Ta osoba ne dobije obavijest.', 'Odustani', 'unblock-confirm', 'Odblokiraj');
    if (o.type === 'logout') return dlg('Odjaviti se?', 'Samo na ovom uređaju. Za povratak trebaš e-poštu i lozinku ili Google.', 'Odustani', 'logout-confirm', 'Odjavi se');
    if (o.type === 'deltype') return dlg(st.del === 'off' ? 'Deaktivirati račun?' : `Obrisati račun ${delDate()}?`, 'Za potvrdu upiši OBRIŠI velikim slovima.', 'Odustani', 'del-type-go', st.del === 'off' ? 'Deaktiviraj' : 'Obriši', true,
      `<label class="sr-only" for="f-deltype">Upiši OBRIŠI</label><input class="input" id="f-deltype" data-k="f-deltype" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(st.delType || '')}">`);
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
    shell += topbar(s) + loadLine() + netBanner();
    if (s.kind === 'onb' && !s.noProgress) shell += progress();
    shell += `<main id="main" class="screen screen-${st.screen} kind-${s.kind}">${s.body}</main>`;
    if (s.foot) shell += `<div class="foot">${s.foot}</div>`;
    if (s.kind === 'app') shell += `<div class="bottom">${netPill()}${s.dock || ''}${tabbar(s.tab)}</div>`;
    root.innerHTML = `<div class="shell"${st.overlay ? ' inert' : ''}>${shell}</div>${overlayHtml()}`;
    root.dataset.screen = st.screen;
    if (st.swipeDir) { const m = root.querySelector('main'); if (m) m.classList.add('swipe-' + st.swipeDir); st.swipeDir = null; }
    if (s.kind === 'onb' && !s.noProgress) { const h = root.querySelector('main h1'); if (h) h.setAttribute('aria-describedby', 'prog-text'); }
    afterRender();
    if (keep) return restore(keep);
    if (st.overlay) {
      for (const sel of ['.age18 input', '.dialog input', '.sheet-pick input:checked', '.sheet-pick input', '.age18 .btn', '.sheet [data-k="f-ans"]', '.sheet .menu-item', '.dialog .btn', '.sheet .iconbtn']) {
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

  /* Round 10: sign in and out. Signing in fills the same fictional member as ?flow=drop. */
  function signedIn() {
    Object.assign(st, { displayName: st.displayName || 'Ana', username: st.username || 'ana.slusa', userState: 'ok', vis: st.vis || 'public', dnaVis: st.dnaVis || 'all', reminder: st.reminder || 'off', err: {}, pwIn: '' });
    if (!st.genres.length) { st.genres = ['Jazz', 'Soul', 'Kantautorska', 'Elektronika']; st.artists = [fx('Nina Simone'), fx('Arsen Dedić'), fx('Massive Attack')]; }
    if (st.acctPending) return go('pending', { reset: true });
    st.pwBanner = P.get('pw') === 'breached';
    go('home', { reset: true });
  }
  function signOut() {
    st.overlay = null; st.delStep = null; st.del = null; st.delCopy = false; st.pwIn = ''; st.showPw = false;
    go('signin', { reset: true });
    toast('Odjava je uspjela.');
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
        if (st.age === 'adult' && AGE18_AT !== 'none') return openOverlay({ type: 'age18' }, root.querySelector('[data-k="next"]'));
        return go(st.age === 'adult' ? 'uilang' : 'minor');
      case 'uilang': return go('account');
      case 'account':
        if (!st.pw) { err.pw = 'Upiši lozinku.'; break; }
        if (pwMissing(st.pw).length) { err.pw = `Lozinci još treba: ${pwMissing(st.pw).map(r => r[3]).join(', ')}.`; break; }
        if (PW_BREACHED.has(st.pw)) { err.pw = 'Ova se lozinka pojavila u javno poznatim curenjima podataka, pa je napadači isprobavaju među prvima. Odaberi drugu.'; break; }
        go('username', { reset: true }); toast('Račun je napravljen.'); return;
      case 'username':
        if (st.userState === 'checking') checkUser(true);
        st.displayName = st.displayName.trim();
        if (!st.displayName) err.dname = 'Upiši ime za prikaz.';
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
    /* Round 10, ?state=error: the first post fails, the text stays, and Retry succeeds (JR4). */
    if (STATE === 'error' && !st.postFailed) { st.postFailed = true; st.postErr = true; render({ keep: true }); return focusSel('[data-k="post"]'); }
    st.postErr = false;
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
    if (!D.mainGenres.includes(g) || fromSearch) {
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
      case 'age18-ok':
        if (AGE18_AT === 'c' && !(root.querySelector('#f-age18') || {}).checked) { st.err.age18 = 'Označi potvrdu za nastavak.'; render(); return focusSel('#f-age18'); }
        delete st.err.age18; st.overlay = null; return go('uilang');
      case 'age18-minor': st.age = 'minor'; st.overlay = null; return go('minor');
      case 'com-cancel': st.commentDraft = ''; clearRefs('com'); delete st.err.com; return back();
      case 'setsub': st.sub = b.dataset.s; return go('setsub');
      case 'push-dev': st.pushDev = st.pushDev === false; st.pause = null; return render({ keep: true });
      case 'pause': st.pause = b.dataset.p; render(); focusSel('[data-k="pause-end"]'); return toast('Obavijesti su pauzirane.');
      case 'pause-end': st.pause = null; render(); focusSel('[data-k="pause-1h"]'); return toast('Obavijesti su opet uključene.');
      case 'sw': return b.setAttribute('aria-checked', b.getAttribute('aria-checked') !== 'true');
      case 'perm-block': st.reminder = 'denied'; st.overlay = null; render(); return focusSel('.notice');
      case 'finish': return go('home', { reset: true });
      case 'calm': MOT.setCalm(!MOT.calm()); return render({ keep: true });
      case 'tab': return go(b.dataset.t, { reset: true });
      case 'settings': return go('settings');
      case 'hub-day': st.hubDay = b.dataset.d; render({ keep: true }); return;
      case 'open-drop': return go('drop');
      case 'open-compose': go('drop'); return openOverlay({ type: 'sheet' }, root.querySelector('[data-k="dock-field"]'));
      case 'compose': return openOverlay({ type: 'sheet' }, b);
      case 'cancel-compose': return cancelCompose();
      case 'ref-open': { const S = RS[b.dataset.s || 'ans']; st[S.open] = true; render({ keep: true }); return focusSel(`#f-refq${S.sfx}`); }
      case 'ref-close': { const S = RS[b.dataset.s || 'ans']; st[S.open] = false; st[S.q] = ''; render({ keep: true }); return focusSel(`[data-k="ref-open${S.sfx}"], [data-k="${S.field}"]`); }
      case 'ref-add': { const S = RS[b.dataset.s || 'ans']; st[S.refs].push(+b.dataset.i); if (st[S.refs].length >= REF_MAX) { st[S.open] = false; st[S.q] = ''; } render({ keep: true }); return focusSel(st[S.open] ? `#f-refq${S.sfx}` : `[data-k="${S.field}"]`); }
      case 'ref-remove': { const S = RS[b.dataset.s || 'ans']; st[S.refs].splice(+b.dataset.i, 1); render({ keep: true }); return focusSel(`[data-k="ref-open${S.sfx}"], #f-refq${S.sfx}, [data-k="${S.field}"]`); }
      case 'react': {
        const x = findAnswer(b.dataset.id); const r = b.dataset.r; const k = b.dataset.k; const i = x.myReacts.indexOf(r);
        i >= 0 ? x.myReacts.splice(i, 1) : x.myReacts.push(r);
        render({ keep: true });
        if (i < 0) { const nb = root.querySelector(`[data-k="${k}"]`); if (nb) { nb.classList.add('pressing'); setTimeout(() => nb.classList.remove('pressing'), 500); } }
        return;
      }
      case 'expand': { const id = b.dataset.id; st.expanded.has(id) ? st.expanded.delete(id) : st.expanded.add(id); return render({ keep: true }); }
      case 'comments': st.ctx = b.dataset.id; st.commentDraft = ''; clearRefs('com'); return go('answer');
      case 'more': return openOverlay({ type: 'menu', id: b.dataset.id }, b);
      case 'menu': { const m = b.dataset.msg; closeOverlay(); return toast(m); }
      case 'overlay-close': return st.overlay && st.overlay.type === 'sheet' ? cancelCompose() : closeOverlay();
      case 'edit': return startEdit(b);
      case 'delete': return openOverlay({ type: 'delete' }, b);
      case 'delete-confirm':
        st.mine = null; st.overlay = null; render();
        focusSel('[data-k="dock-field"]');
        return toast('Odgovor je obrisan.');
      /* Round 10. */
      case 'retry-load': st.loadOk = true; render(); return focusSel('#h-answers, main h1');
      case 'signin': {
        st.err = {};
        if (!st.pwIn) st.err.pwin = 'Upiši lozinku.';
        else if (st.pwIn === 'kriva') st.err.signin = true;
        if (Object.keys(st.err).length) { render(); return focusSel(st.err.signin ? '#err-signin' : '#f-pwin'); }
        return signedIn();
      }
      case 'signin-ok': return signedIn();
      case 'to-signin': signOut(); return;
      case 'pend-restore': st.acctPending = false; go('home', { reset: true }); return toast('Račun je vraćen. Brisanje je otkazano.');
      case 'pw-change': st.pwBanner = false; st.sub = 'password'; st.pw = ''; return go('setsub');
      case 'pw-later': st.pwBanner = false; render(); focusSel('main h1, .dd-q'); return toast('U redu. Podsjetit ćemo te pri sljedećoj provjeri.');
      case 'pw-save': {
        const old = root.querySelector('#f-pwold'); st.err = {};
        if (!old || !old.value) st.err.pwold = 'Upiši trenutnu lozinku.';
        if (!st.pw) st.err.pw = 'Upiši novu lozinku.';
        else if (pwMissing(st.pw).length) st.err.pw = `Lozinci još treba: ${pwMissing(st.pw).map(r => r[3]).join(', ')}.`;
        else if (PW_BREACHED.has(st.pw)) st.err.pw = 'Ova se lozinka pojavila u javno poznatim curenjima podataka, pa je napadači isprobavaju među prvima. Odaberi drugu.';
        if (Object.keys(st.err).length) { render(); return focusFirstError(); }
        st.pw = ''; back(); return toast('Lozinka je promijenjena. Drugi uređaji su odjavljeni.');
      }
      case 'uname-save': {
        const u = st.newUser == null ? st.username : st.newUser;
        if (u === st.username) return toast('To je već tvoje korisničko ime.');
        if (!/ok/.test(u2Status())) { st.err.uname2 = 'Odaberi slobodno korisničko ime.'; render({ keep: true }); return focusSel('#f-uname2'); }
        st.newUser = u; return openOverlay({ type: 'uname' }, b);
      }
      case 'uname-confirm': st.oldUser = st.username; st.username = st.newUser; st.newUser = null; st.userChanged = true; st.overlay = null; render(); focusH1(); return toast(`Sad si @${st.username}.`);
      case 'otp-ok': {
        const f = root.querySelector('#f-otp');
        if (!f || !/^\d{6}$/.test(f.value)) { st.err.otp = 'Upiši 6 znamenki iz aplikacije.'; render(); return focusSel('#f-otp'); }
        st.twofa = true; delete st.err.otp; render(); focusH1(); return toast('Dvostruka provjera je uključena.');
      }
      /* Round 12a: following, lists and requests. */
      case 'follow': { const h = b.dataset.h; if (member(h).vis === 'private') { st.req.add(h); render({ keep: true }); return toast('Zahtjev je poslan. Vidjet ćeš kad ga ta osoba odobri.'); } setFollow(ME_H, h, true); render({ keep: true }); return toast(`Pratiš @${h}.`); }
      case 'unfollow': return openOverlay({ type: 'unfollow', h: b.dataset.h }, b);
      case 'unfollow-confirm': { const h = st.overlay.h; setFollow(ME_H, h, false); closeOverlay(); return toast(`Više ne pratiš @${h}.`); }
      case 'req-cancel': return openOverlay({ type: 'cancelreq', h: b.dataset.h }, b);
      case 'req-cancel-confirm': { const h = st.overlay.h; st.req.delete(h); closeOverlay(); return toast('Zahtjev je povučen.'); }
      case 'rm-follower': return openOverlay({ type: 'remove', h: b.dataset.h }, b);
      case 'rm-menu': return openOverlay({ type: 'rmmenu', h: b.dataset.h }, b);
      case 'rm-from-menu': st.overlay = { type: 'remove', h: st.overlay.h, ret: st.overlay.ret }; return render();
      case 'rm-confirm': { const h = st.overlay.h; setFollow(h, ME_H, false); st.overlay = null; render(); focusSel('.fl-tabs input:checked, main h1'); return toast(`@${h} više te ne prati. Ta osoba ne dobije obavijest.`); }
      case 'req-ok': { const h = b.dataset.h; st.reqDone[h] = 'ok'; setFollow(h, ME_H, true); render(); focusSel(`[data-k="req-${h}"], .req-list button, main h1`); return toast(`${member(h).who} te sada prati.`); }
      case 'req-no': { const h = b.dataset.h; st.reqDone[h] = 'no'; render(); focusSel('.req-list button, .act-btns button, main h1'); return toast('Zahtjev je odbijen. Ta osoba to ne vidi.'); }
      case 'pmenu': return openOverlay({ type: 'pmenu', h: b.dataset.h }, b);
      case 'open-member': { const h = b.dataset.h; if (isMe(h)) return go('profile'); st.who = h; return go('member'); }
      case 'open-follows': st.listOf = b.dataset.h; st.list = b.dataset.l || 'followers'; return go('follows');
      case 'open-requests': return go('requests');
      case 'open-mdrops': st.who = b.dataset.h; return go('mdrops');
      case 'unblock': return openOverlay({ type: 'unblock' }, b);
      case 'unblock-confirm': st.unblocked = true; st.overlay = null; render(); focusSel('.blk-card .set-t'); return toast('Odblokirano.');
      case 'pick': return openOverlay({ type: 'pick', p: b.dataset.p }, b);
      case 'logout': if (OUT_AT === 'b') return openOverlay({ type: 'logout' }, b); signOut(); return;
      case 'logout-confirm': signOut(); return;
      case 'del-next': {
        const step = st.delStep || 'choose';
        if (step === 'choose' && !st.del) { st.err.del = 'Odaberi jedno.'; render(); return focusFirstError(); }
        st.delStep = step === 'choose' && st.del === 'del' ? 'copy' : 'confirm'; render(); window.scrollTo(0, 0); return focusSel('main .sub-h, main h1');
      }
      case 'del-copy': st.delCopy = true; render({ keep: true }); return toast('Pripremamo kopiju. Javit ćemo e-poštom kad bude spremna (simulacija).');
      case 'del-go': case 'del-one': {
        const pw = root.querySelector('#f-delpw'); st.err = {};
        if (!st.del) st.err.del = 'Odaberi jedno.';
        if (!pw || !pw.value) st.err.delpw = 'Upiši lozinku.';
        if (Object.keys(st.err).length) { render({ keep: true }); return focusFirstError(); }
        if (a === 'del-one' && DEL_AT === 'c' && st.del === 'del') { st.delType = ''; return openOverlay({ type: 'deltype', disabled: true }, b); }
        st.delStep = 'done'; render(); window.scrollTo(0, 0); return focusSel('.sub-hero-t');
      }
      case 'del-type-go': st.overlay = null; st.delStep = 'done'; render(); return focusSel('.sub-hero-t');
      case 'show-new': {
        const first = st.pending[0].id;
        st.answers = st.pending.concat(st.answers); st.pending = null;
        render({ keep: true }); return focusSel(`#h-${first}`);
      }
    }
  });

  function clearRefs(k) { const S = RS[k]; st[S.refs] = []; st[S.q] = ''; st[S.open] = false; }

  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.dataset.form;
    if (f === 'answer') return submitAnswer();
    if (f === 'comment') {
      const t = st.commentDraft.trim();
      if (!t) { st.err = { com: 'Napiši komentar prije objave.' }; render({ keep: true }); return focusSel('#f-com'); }
      const list = st.comments[st.ctx] || (st.comments[st.ctx] = []);
      list.push({ who: st.displayName || 'Ti', handle: st.username || 'ti', time: 'upravo', text: t, refs: st.comRefs.slice() });
      findAnswer(st.ctx).comments += 1;
      st.commentDraft = ''; clearRefs('com'); st.err = {};
      render(); focusSel(`#hc-${list.length - 1}`); toast('Komentar je objavljen.');
    }
  });

  /* Display name (owner, D-067): at most three words, and every word (also after a hyphen) starts with a capital
     letter, so "ana mari horvat" becomes "Ana Mari Horvat". Spaces collapse to one; a fourth word is not accepted (a short message says why).
     The rest of each word is left as typed (McCartney, DJ). */
  function nameFix(el) {
    const v = el.value, pos = el.selectionStart;
    let w = v.replace(/^\s+/, '').replace(/\s+/g, ' ').split(' ');
    const cut = w.length > 4 || (w.length === 4 && w[3] !== '');
    if (cut) { w = w.slice(0, 3).concat(''); toast('Ime za prikaz može imati najviše tri riječi.'); }
    const out = w.map(x => x.replace(/(^|-)(\p{Ll})/gu, (m, a, c) => a + c.toLocaleUpperCase('hr'))).join(' ');
    if (out === v) return;
    el.value = out;
    const p = Math.max(0, Math.min(out.length, pos - (v.length - out.length)));
    try { el.setSelectionRange(p, p); } catch (e) { /* not focused */ }
  }
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
      case 'f-pw': { st.pw = t.value; clearErr('pw', t); const m = root.querySelector('#pw-meter'); if (m) m.innerHTML = pwMeter(); return; }
      case 'f-dname': case 'f-dname2': { nameFix(t); st.displayName = t.value; return clearErr(t.id.slice(2), t); }
      case 'f-uname': st.username = t.value.trim(); clearErr('uname', t); return checkUser();
      case 'f-artist': st.artistQ = t.value; return runArtistSearch();
      case 'f-genre': { st.genreQ = t.value; const m = root.querySelector('#more-genres'); if (m) { m.innerHTML = moreGenres(); const f = root.querySelector('#f-genre'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } return; }
      case 'f-setq': { st.setQ = t.value; const b = root.querySelector('#set-body'); if (b) { const tmp = document.createElement('div'); tmp.innerHTML = settingsBody(); b.innerHTML = tmp.querySelector('#set-body').innerHTML; } return; }
      case 'f-refq': case 'f-refq-com': { const k = t.id === 'f-refq' ? 'ans' : 'com', S = RS[k]; st[S.q] = t.value; const r = root.querySelector(`#ref-results${S.sfx}`); if (r) r.innerHTML = refResults(k); return; }
      case 'f-ans': st.draft = t.value; return clearErr('ans', t);
      case 'f-com': st.commentDraft = t.value; return clearErr('com', t);
      case 'f-pwin': st.pwIn = t.value; clearErr('pwin', t); return;
      case 'f-pwold': case 'f-delpw': case 'f-otp': return clearErr(t.id.slice(2), t);
      case 'f-uname2': { st.newUser = t.value.trim(); clearErr('uname2', t); const s2 = root.querySelector('#uname2-status'); if (s2) s2.innerHTML = u2Status(); return; }
      case 'f-deltype': { st.delType = t.value; const ok = root.querySelector('.dialog [data-k="ov-ok"]'); if (ok) ok.disabled = t.value.trim() !== 'OBRIŠI'; return; }
    }
  });

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'radio') {
      const n = t.name;
      if (n === 'sort') { st.sort = t.value; return render({ keep: true }); }
      if (n === 'actf') { st.actF = t.value; return render({ keep: true }); }
      if (n === 'fl') { st.list = t.value; return render({ keep: true }); }
      if (n === 'vis2') st.vis = t.value; else if (n === 'dnaVis2') st.dnaVis = t.value; else if (n === 'lang2') st.lang = t.value; else if (n === 'del') st.del = t.value;
      else if (n === 'hist2') st.histVis = t.value; else if (n === 'lists2') st.lists = t.value;
      /* D-033: a private profile caps the follower lists at followers. */
      if (n === 'vis2' && t.value === 'private' && (st.lists || 'followers') === 'all') st.lists = 'followers';
      if (n === 'lists2' && t.value === 'all' && st.vis === 'private') { st.lists = 'followers'; toast('Dok je profil privatan, popise vide najviše pratitelji.'); }
      if (['vis2', 'dnaVis2', 'hist2', 'lists2'].includes(n)) { render({ keep: true }); }
      if (n === 'age') st.age = t.value;
      else if (n === 'vis') st.vis = t.value;
      else if (n === 'dnaVis') st.dnaVis = t.value;
      else if (n === 'lang') { st.lang = t.value; if (t.value === 'en') toast('U skici je samo hrvatski tekst. U aplikaciji bi se sučelje odmah prebacilo na engleski.'); }
      if (st.err[n]) { delete st.err[n]; const er = root.querySelector('#err-' + n); if (er) er.remove(); const fs = t.closest('fieldset'); if (fs) fs.removeAttribute('aria-describedby'); }
    } else if (t.id === 'f-time' || t.id === 'f-time2') st.remTime = t.value;
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
    if (AT === 'age' && P.get('show') === 'age18' && AGE18_AT !== 'none') { st.age = 'adult'; st.overlay = { type: 'age18' }; }
    if (before('dna') || (AT === 'dna' && P.get('picks') === '1')) { st.genres = ['Metal', 'Jazz', 'Techno', 'Kantautorska', 'Funk']; st.artists = [fx('Metallica'), fx('Nina Simone'), fx('Arsen Dedić'), fx('Charlotte de Witte')]; }
    if (AT === 'dna' && P.get('q')) st.artistQ = P.get('q');
    if (before('dnavis')) st.dnaVis = 'all';
    if (before('reminder')) st.reminder = 'off';
    st.screen = AT;
    const from = k < 3 ? 0 : 3;
    st.hist = AT === 'username' || AT === 'done' ? [] : ORDER.slice(from, k).map(s => ({ screen: s, y: 0 }));
  } else if ((AT === 'signin' || AT === 'pending') && !START_DROP) {
    st.screen = AT; st.acctPending = P.get('acct') === 'pending';
  } else if (AT && START_DROP && ['hub', 'drop', 'answer', 'activity', 'profile', 'settings', 'setsub', 'member', 'follows', 'requests', 'mdrops'].includes(AT)) {
    st.screen = AT;
    if (AT === 'member') st.hist = [{ screen: 'home', y: 0 }];
    /* Round 12a: which member, the viewer's side of the relationship, which list, and a sheet or dialog to open. */
    if (AT === 'member' || AT === 'mdrops' || AT === 'follows') {
      const w = P.get('who');
      const h = D.members[w] ? w : w && isMe(w) ? ME_H : AT === 'follows' ? ME_H : P.get('as') ? 'mia_vinyl' : 'petra.zvuk';
      if (AT === 'follows') { st.listOf = h; st.list = P.get('list') === 'following' ? 'following' : 'followers'; } else st.who = h;
      const R = P.get('rel');
      if (R && !isMe(h)) { setFollow(ME_H, h, R === 'fol' || R === 'mut'); setFollow(h, ME_H, R === 'mut' || R === 'fy'); if (R === 'req') st.req.add(h); }
      const show = P.get('show');
      if (show === 'unfollow' || show === 'cancel' || show === 'menu') st.overlay = { type: { unfollow: 'unfollow', cancel: 'cancelreq', menu: 'pmenu' }[show], h, ret: show === 'menu' ? 'pmenu' : 'rel-' + h };
      if (show === 'remove') st.overlay = { type: RM_AT === 'b' ? 'rmmenu' : 'remove', h: P.get('h') || 'lukabass' };
      if (AT === 'mdrops') st.hist = isMe(h) ? [{ screen: 'home', y: 0 }, { screen: 'profile', y: 0 }] : [{ screen: 'home', y: 0 }, { screen: 'member', y: 0 }];
      if (AT === 'follows') st.hist = isMe(h) ? [{ screen: 'home', y: 0 }, { screen: 'profile', y: 0 }] : [{ screen: 'home', y: 0 }, { screen: 'member', y: 0 }];
    }
    if (AT === 'requests') st.hist = [{ screen: 'home', y: 0 }, { screen: 'activity', y: 0 }];
    if (AT === 'settings' && P.get('show') === 'logout' && OUT_AT === 'b') st.overlay = { type: 'logout', ret: 'logout' };
    if (P.get('uc') === 'locked') { st.oldUser = st.username; st.username = 'ana.zvuk'; st.userChanged = true; }
    if (AT === 'drop' && STATE === 'error' && P.get('open') === 'compose') { st.draft = 'Kind of Blue. Počinje mirno, nitko ne viče, a na kraju shvatiš da je cijeli sat bio jazz.'; if (P.get('show') === 'posterr') { st.postFailed = true; st.postErr = true; } }
    if (AT === 'setsub' && P.get('s') === 'delete' && P.get('step')) { st.del = P.get('step') === 'off' ? 'off' : 'del'; st.delStep = { copy: 'copy', confirm: 'confirm', off: 'confirm', done: 'done' }[P.get('step')]; }
    if (AT === 'setsub' && P.get('s') === 'twofa' && P.get('on') === '1') st.twofa = true;
    if (AT === 'setsub' && P.get('pause')) st.pause = P.get('pause');
    if (AT === 'setsub' && P.get('s') === 'privacy' && P.get('pick')) st.overlay = { type: 'pick', p: P.get('pick') };
    if (AT === 'drop') st.hist = [{ screen: 'home', y: 0 }];
    if (AT === 'settings') st.hist = [{ screen: 'profile', y: 0 }];
    if (AT === 'setsub') { st.sub = P.get('s') || 'account'; st.hist = [{ screen: 'profile', y: 0 }, { screen: 'settings', y: 0 }]; }
    if (AT === 'hub' && P.get('day')) st.hubDay = P.get('day');
    if (AT === 'answer') { st.ctx = 'a1'; st.hist = [{ screen: 'home', y: 0 }, { screen: 'drop', y: 0 }]; }
    if (AT === 'drop' && P.get('open') === 'compose') st.overlay = { type: 'sheet', ret: 'dock-field' };
  }

  if (START_DROP && P.get('pw') === 'breached') st.pwBanner = true; // ?flow=drop&pw=breached: Home right after sign-in, for the review page
  render();
  if (st.screen === 'dna' && st.artistQ) { runArtistSearch(); setTimeout(() => { const f = root.querySelector('#f-artist'); if (f) f.scrollIntoView({ block: 'start' }); }, 450); }
})();
