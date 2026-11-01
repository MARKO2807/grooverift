/* GrooveRift journey sketches (Phase 3, step 3.3): a tiny Daily Drop page simulator for JQ2 and JQ3.
   Fictional members and answers. Nothing is stored. */
const DROP_SEED = [
  { who: 'Tin', c: '#FFCB69', when: '14. stu', day: 0, text: '„Dreams” od Fleetwood Mac. Svako ljeto na moru, iz starog radija.' },
  { who: 'Petra', c: '#FF586B', when: '14. stu', day: 0, text: 'Bilo što s albuma Blonde. Kasno navečer, prozori otvoreni.' },
  { who: 'Luka', c: '#7BD88F', when: '14. stu', day: 0, text: 'Daft Punk „Digital Love”. Ne znam zašto, ali uvijek.' }
];
const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

/* opts: { count: 'one' | 'many', old: bool, late: 'date' | 'label' | 'closed', today: string, onChange: fn } */
function dropSim(el, opts) {
  const st = { answers: DROP_SEED.map(a => ({ ...a })), draft: '', editing: false, msg: '' };
  const mine = () => st.answers.filter(a => a.mine);
  function answerHtml(a) {
    const lateBadge = opts.old && a.mine && opts.late === 'label' ? '<span class="late">Kasni odgovor</span>' : '';
    return `<article class="answer ${a.mine ? 'mine' : ''}"><div class="top"><span class="avatar" style="background:${a.c}">${a.who[0]}</span>
      <span class="who">${a.mine ? 'Ti' : a.who}${lateBadge}</span><span class="when">${a.when}${a.edited ? ' · uređeno' : ''}</span></div>
      <p>${esc(a.text)}</p>
      ${a.mine && opts.count === 'one' ? `<div class="row"><button class="btn" data-a="edit">Uredi</button><button class="btn" data-a="del">Obriši</button></div>` : ''}</article>`;
  }
  function composer() {
    if (opts.old && opts.late === 'closed') {
      return `<div class="closed"><b style="color:var(--text)">Pitanje je zatvoreno za nove odgovore.</b><br>Možeš čitati, reagirati i odgovarati na postojeće odgovore.</div>`;
    }
    if (opts.count === 'one' && mine().length && !st.editing) return '';
    const label = st.editing ? 'Spremi izmjene' : 'Objavi odgovor';
    return `<div class="composer"><label for="${el.id}-ta" class="meta">${st.editing ? 'Uredi svoj odgovor' : 'Tvoj odgovor'}</label>
      <textarea id="${el.id}-ta" placeholder="Napiši odgovor…">${esc(st.draft)}</textarea>
      <p class="aud-line" id="${el.id}-aud">Vidljivo: svim članovima</p>
      <div class="row" style="margin-top:0"><button class="btn primary" data-a="post" aria-describedby="${el.id}-aud">${label}</button>${st.editing ? '<button class="btn" data-a="cancel">Odustani</button>' : ''}</div></div>`;
  }
  function render() {
    const ordered = [...mine(), ...st.answers.filter(a => !a.mine)];
    el.innerHTML = `<div class="topbar"><span class="title">Daily Drop</span><span class="alpha-tag">Alpha</span></div>
      <div class="content">
        <div class="card drop"><p class="eyebrow">Daily Drop · 14. studenoga${opts.old ? ' · iz arhive' : ''}</p><h3>Koja pjesma te uvijek vrati u ljeto?</h3>
          <p class="meta">${opts.old ? 'Objavljeno prije 12 dana. ' : ''}${st.answers.length} odgovora</p></div>
        ${composer()}
        ${st.msg ? `<p class="meta" role="status">${st.msg}</p>` : '<p role="status" class="meta" style="margin:0"></p>'}
        <div class="segments" style="border:0;padding:0"><button aria-pressed="false">Za tebe</button><button aria-pressed="true">Najnovije</button><button aria-pressed="false">Najviše rasprave</button></div>
        <div>${ordered.map(answerHtml).join('')}</div>
      </div>`;
  }
  el.addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') st.draft = e.target.value; });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if ((a === 'edit' || a === 'del') && !mine().length) return;
    if (a === 'post') {
      const t = st.draft.trim();
      if (!t) { st.msg = 'Napiši nešto prije objave.'; render(); return; }
      if (opts.count === 'one' && mine().length && !st.editing) { st.msg = 'Već imaš odgovor na ovo pitanje. Uredi ga umjesto novog.'; render(); return; }
      if (st.editing) { const m = mine()[0]; m.text = t; m.edited = true; st.editing = false; st.msg = 'Izmjene spremljene.'; }
      else { st.answers.push({ who: 'Ti', c: '#C9B6FF', when: opts.today, text: t, mine: true }); st.msg = 'Odgovor objavljen.'; }
      st.draft = '';
    } else if (a === 'edit') { st.editing = true; st.draft = mine()[0].text; st.msg = ''; }
    else if (a === 'cancel') { st.editing = false; st.draft = ''; st.msg = ''; }
    else if (a === 'del') { st.answers = st.answers.filter(x => !x.mine); st.msg = 'Odgovor obrisan.'; }
    render();
    if (opts.onChange) opts.onChange(st);
  });
  render();
  return { reset() { st.answers = DROP_SEED.map(a => ({ ...a })); st.draft = ''; st.editing = false; st.msg = ''; render(); } };
}
