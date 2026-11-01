// Profile visibility simulator shared by q2-drop-history.html and q3-follower-lists.html.
// Implements the rules of docs/architecture/visibility-matrix.md v0.2 for one fictional member (Ana).
// All data is fictional placeholder content.

const AUD_LABEL = { members: 'svi prijavljeni članovi', followers: 'pratitelji', mutuals: 'Uzajamni', me: 'samo ja' };
const NEED = { members: 1, followers: 2, mutuals: 3, me: 4 };

const VIEWERS = [
  { id: 'self',     rank: 4,  short: 'Ana (ona sama)',     label: 'Ana gleda svoj profil' },
  { id: 'mutual',   rank: 3,  short: 'Tin · Uzajamni',     label: 'Tin: Uzajamni (prate jedno drugo)' },
  { id: 'follower', rank: 2,  short: 'Luka · pratitelj',   label: 'Luka: prati Anu, ona njega ne' },
  { id: 'member',   rank: 1,  short: 'Petra · ne prati',   label: 'Petra: članica koja ne prati Anu' },
  { id: 'blocked',  rank: -1, short: 'Iva · blokirana',    label: 'Iva: Ana ju je blokirala' },
  { id: 'anon',     rank: 0,  short: 'Odjavljeni',         label: 'Odjavljeni posjetitelj (share link)' }
];

const ANA = { n: 'Ana K.', h: '@ana.k', i: 'AK', c: '#FFCB69', bio: 'Noćne vožnje, sintesajzeri i previše live albuma.' };
const FOLLOWERS = [
  { n: 'Tin V.', h: '@tinv', i: 'TV', c: '#FF8F9C', tag: 'Uzajamni' },
  { n: 'Luka D.', h: '@lukad', i: 'LD', c: '#B9F2A1', tag: '' },
  { n: 'Noa B.', h: '@noa.b', i: 'NB', c: '#D7B8FF', tag: 'privatni račun' },
  { n: 'Ema J.', h: '@ema.j', i: 'EJ', c: '#9FD3FF', tag: '' }
];
const FOLLOWING = [FOLLOWERS[0], { n: 'Filip T.', h: '@filipt', i: 'FT', c: '#FFD6A5', tag: '' }, FOLLOWERS[3]];
const DNA = ['Synthwave', 'Shoegaze', 'Nebula Drive', 'Sjeverni Val', 'Jazz-funk', 'Tiha Luka Orkestar'];
const ANSWERS = [
  ['Koji album bi ponio na pusti otok?', '„Tihe ulice” od Nebula Drive, jer svaki put čujem nešto novo u bas-liniji.'],
  ['Prva pjesma koju znaš napamet?', 'Neka dječja pjesma s kazete, ali odmah nakon nje prvi singl Sjevernog Vala.'],
  ['Koncert koji nikad nećeš zaboraviti?', 'Tiha Luka Orkestar na otvorenom, kad je počela kiša, a nitko nije otišao.']
];

const effective = (aud, pub) => (!pub && NEED[aud] < 2) ? 'followers' : aud;
const canSee = (aud, v, pub) => v.rank >= 1 && v.rank >= NEED[effective(aud, pub)];
function access(v, pub) {
  if (v.id === 'blocked') return 'na';
  if (v.id === 'anon') return pub ? 'minimal' : 'na';
  if (!pub && v.rank < 2) return 'private';
  return 'full';
}
const ddAudience = (opt, pub) => opt === 'profile' ? (pub ? 'members' : 'followers') : opt;

const av = (p, cls = '') => `<span class="avatar ${cls}" style="background:${p.c}" aria-hidden="true">${p.i}</span>`;
const yes = t => `<span class="yes">✓</span> ${t || ''}`;
const no = t => `<span class="no">✗</span> ${t || ''}`;

function renderProfile(s) {
  const v = VIEWERS.find(x => x.id === s.viewer);
  const a = access(v, s.pub);
  const ddAud = ddAudience(s.dd, s.pub), listAud = s.lists, dnaAud = 'members';
  const top = `<div class="topbar"><button class="iconbtn" aria-label="Natrag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><span class="title">${a === 'na' ? 'Profil' : ANA.h}</span>${a !== 'na' ? '<button class="iconbtn" aria-label="Više opcija">⋯</button>' : ''}</div>`;
  let body = '';
  if (a === 'na') {
    body = `<div class="empty"><h3>Profil nije dostupan</h3><p>Možda je izbrisan, deaktiviran ili ga ne možeš vidjeti.</p></div>
      <div class="privacy-note"><b>Zašto ovako:</b> ista poruka za nepostojeći, privatni (odjavljenima) i blokirani profil, pa nitko ne može zaključiti da je blokiran ni da račun postoji (IA8, D-019).</div>`;
  } else {
    const showCounts = a === 'full' && canSee(listAud, v, s.pub);
    const header = `<div class="card" style="text-align:center">${av(ANA, 'lg')}<h3 style="margin-top:8px">${ANA.n}</h3><div class="handle">${ANA.h}${s.pub ? '' : ' · privatni račun'}</div>
      <p class="meta" style="margin-top:8px">${ANA.bio}</p>
      ${showCounts ? `<p class="meta"><b style="color:var(--text)">${FOLLOWERS.length}</b> pratitelja · <b style="color:var(--text)">${FOLLOWING.length}</b> praćenih</p>` : ''}
      <div class="row" style="justify-content:center">${relationButtons(v, a, s)}</div></div>`;
    body = header;
    if (a === 'minimal') {
      body += `<div class="privacy-note"><b>Odjavljeni posjetitelj</b> vidi samo ime, korisničko ime, avatar i bio javnog profila. Music DNA, povijest odgovora i popisi su samo za članove.</div>
        <div class="card" style="text-align:center"><p>GrooveRift je trenutno samo uz pozivnicu.</p><button class="btn">Prijava</button></div>`;
    } else if (a === 'private') {
      body += `<div class="card" style="text-align:center"><h3 style="font-size:16px">Ovaj račun je privatan</h3><p class="meta">Zaprati da pošalješ zahtjev. Ana odlučuje tko je prati.</p></div>`;
    } else {
      const self = v.id === 'self';
      const sec = (title, aud, html) => {
        if (!canSee(aud, v, s.pub)) return '';
        return `<section class="card"><div class="section-h"><h3>${title}</h3>${self ? `<span class="aud">Vidljivo: ${AUD_LABEL[effective(aud, s.pub)]}</span>` : ''}</div>${html}</section>`;
      };
      body += sec('Music DNA', dnaAud, `<div class="chips">${DNA.map(d => `<span class="chip">${d}</span>`).join('')}</div>`);
      body += sec('Daily Drop odgovori', ddAud, `<div class="list">${ANSWERS.map(([q, t]) => `<div><div class="eyebrow" style="color:var(--amber)">${q}</div>${t}</div>`).join('')}</div>`);
      body += sec('Pratitelji', listAud, `<div class="list">${FOLLOWERS.map(p => `<div class="person">${av(p)}<div class="who"><div class="name">${p.n}</div><div class="handle">${p.h}${p.tag ? ' · ' + p.tag : ''}</div></div></div>`).join('')}</div><p class="meta">Praćeni (${FOLLOWING.length}) →</p>`);
      const hidden = [['Daily Drop odgovori', ddAud], ['Pratitelji i praćeni', listAud]].filter(([, aud]) => !canSee(aud, v, s.pub));
      if (hidden.length) body += `<div class="privacy-note"><b>Ovaj gledatelj ne vidi:</b> ${hidden.map(h => h[0]).join(', ')}. Sekcije su <b>izostavljene</b>, nema lokota ni teksta „skriveno”.</div>`;
    }
  }
  return `<div class="phone">${top}<div class="content">${body}</div></div>`;
}

function relationButtons(v, a, s) {
  if (v.id === 'self') return '<button class="btn">Uredi profil</button>';
  if (v.id === 'anon') return '';
  if (v.id === 'mutual') return '<button class="btn">Uzajamni ✓</button><button class="btn">Poruka</button>';
  if (v.id === 'follower') return '<button class="btn">Pratiš ✓</button>';
  if (a === 'private') return `<button class="btn primary" data-follow>${s.requested ? 'Zahtjev poslan' : 'Zaprati'}</button>`;
  return '<button class="btn primary" data-follow>Zaprati</button>';
}

function renderDropPage(s) {
  const v = VIEWERS.find(x => x.id === s.viewer);
  const top = `<div class="topbar"><span class="title">Daily Drop</span></div>`;
  const q = `<article class="card drop"><p class="eyebrow">Daily Drop · arhiva</p><h3>Koji album bi ponio na pusti otok?</h3></article>`;
  if (v.id === 'anon') {
    return `<div class="phone">${top}<div class="content">${q}<div class="card" style="text-align:center"><p>Odgovori su samo za članove.</p><button class="btn">Prijava</button></div>
      <div class="privacy-note"><b>D-022:</b> odjavljeni vide samo pitanje i poziv.</div></div></div>`;
  }
  const answer = (p, t, note) => `<article class="card"><div class="person">${av(p)}<div class="who"><div class="name">${p.n}</div><div class="handle">${p.h}</div></div></div><p style="margin:8px 0 0">${t}</p>${note || ''}</article>`;
  const luka = { n: 'Luka D.', h: '@lukad', i: 'LD', c: '#B9F2A1' };
  let anaPart;
  if (v.id === 'blocked') anaPart = `<div class="privacy-note"><b>Anin odgovor se ne prikazuje</b> jer je blokada obostrana (D-019).</div>`;
  else anaPart = answer(ANA, ANSWERS[0][1], v.id === 'self' && !s.pub ? `<div class="privacy-note" style="margin-top:8px"><b>Prije objave Ana je vidjela:</b> „Tvoj odgovor vidjet će svi članovi, iako ti je profil privatan.” (D-021)</div>` : '');
  return `<div class="phone">${top}<div class="content">${q}
    <div class="segments" style="border:0;padding:0"><button aria-pressed="true">Za tebe</button><button aria-pressed="false">Najnovije</button><button aria-pressed="false">Najviše rasprave</button></div>
    ${anaPart}${answer(luka, 'Nešto što mogu slušati od početka do kraja bez preskakanja.')}
    <div class="privacy-note"><b>Na stranici pitanja</b> pojedinačni odgovor vidi svaki prijavljeni član (D-021), <b>bez obzira na opciju Q2</b>. Q2 odlučuje samo o zbirnom popisu na profilu.</div></div></div>`;
}

function renderMatrix(s) {
  const ddAud = ddAudience(s.dd, s.pub);
  const rows = VIEWERS.map(v => {
    const a = access(v, s.pub);
    const basic = a === 'na' ? no('nedostupno') : a === 'minimal' ? yes('osnovno') : a === 'private' ? yes('zaglavlje + „privatan”') : yes();
    const f = aud => a === 'full' && canSee(aud, v, s.pub) ? yes() : no();
    const single = (v.rank >= 1) ? yes() : no();
    return `<tr class="${v.id === s.viewer ? 'current' : ''}"><td>${v.short}</td><td>${basic}</td><td>${f('members')}</td><td>${f(ddAud)}</td><td>${single}</td><td>${f(s.lists)}</td></tr>`;
  }).join('');
  return `<table class="matrix"><thead><tr><th>Tko gleda</th><th>Profil</th><th>Music DNA</th><th>DD povijest na profilu</th><th>Pojedini DD odgovor (stranica pitanja)</th><th>Popisi pratitelja</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderOnboarding(s) {
  const ddLine = { profile: 'Povijest tvojih Daily Drop odgovora na profilu vide svi članovi.', followers: 'Povijest Daily Drop odgovora na profilu vide samo tvoji pratitelji.', mutuals: 'Povijest Daily Drop odgovora na profilu vide samo Uzajamni.' }[s.dd];
  const listLine = { members: 'Popise pratitelja i praćenih vide svi članovi.', followers: 'Popise pratitelja i praćenih vide samo tvoji pratitelji.', mutuals: 'Popise pratitelja i praćenih vide samo Uzajamni.', me: 'Popise pratitelja i praćenih vidiš samo ti.' }[s.lists];
  const privDd = s.dd === 'mutuals' ? 'samo Uzajamni' : 'samo pratitelji';
  const privLists = { members: 'samo pratitelji', followers: 'samo pratitelji', mutuals: 'samo Uzajamni', me: 'samo ti' }[s.lists];
  return `<div class="card"><p class="eyebrow">Onboarding · vidljivost profila (D-030: ništa unaprijed odabrano, jednaka težina)</p>
    <h3 style="font-size:17px">Tko može vidjeti tvoj profil?</h3>
    <div class="onb-option"><h4>Javno</h4><p>Svi prijavljeni članovi vide tvoj profil i objave i mogu te pronaći kroz Otkrij i kompatibilnost. ${ddLine} ${listLine}</p></div>
    <div class="onb-option"><h4>Privatno</h4><p>Profil i objave vide samo pratitelji koje odobriš. Povijest odgovora vide ${privDd}, a popise ${privLists}. Tvoji odgovori na Daily Drop i dalje su vidljivi svim članovima na stranici pitanja.</p></div>
    <p class="meta">Možeš promijeniti bilo kad u postavkama.</p></div>`;
}
