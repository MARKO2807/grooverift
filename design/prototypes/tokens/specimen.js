// Step 3.4 token decision specimens. Vanilla JS, no dependencies.
(function () {
  'use strict';

  var OPTIONS = {
    tq1: [
      { v: 'a', label: 'A · Coral ispuna', rec: true, why: [
        '<b>Coral je potvrđena primarna boja</b> (Master Prompt 15.2), pa je logično da nosi glavnu akciju.',
        'Amber ostaje rezerviran za Daily Drop i otkrivanje, pa se Daily Drop jasno ističe.',
        'Minus: Coral je i boja aktivne kartice u navigaciji; gumbi i aktivno stanje dijele boju.'
      ] },
      { v: 'b', label: 'B · Amber ispuna', why: [
        'Topliji, „sunčaniji” dojam; Amber ima najveći kontrast s tamnim tekstom (12.96).',
        '<b>Minus:</b> Daily Drop kartica je također Amber, pa se gumb i Daily Drop stapaju; Amber postaje „sve”.',
        'Coral bi ostao samo za odabrano stanje i naglaske.'
      ] },
      { v: 'c', label: 'C · Coral→Amber gradijent', why: [
        'Najviše „brand” dojma: isti prijelaz kao logo.',
        '<b>Minus:</b> Master Prompt 15.2 kaže da ne treba svaki gumb biti gradijent. Gradijent se brzo „potroši” i izgleda kao generički AI dizajn.',
        'Kontrast je u redu (najgora točka 6.35), ali hover i pritisak se slabije vide.'
      ] }
    ],
    tq2: [
      { v: 'cool', label: 'Hladne (prema Void Black)', rec: true, why: [
        '<b>Void Black je sam po sebi blago plavkast</b> (RGB 11, 13, 18). Hladne površine nastavljaju ga bez šava.',
        'Coral i Amber jače „iskoče” na hladnoj podlozi.',
        'Minus: malo „tehnološkiji”, hladniji dojam.'
      ] },
      { v: 'neutral', label: 'Čisto sive', why: [
        'Najneutralnije; ne utječe na boje sadržaja.',
        '<b>Minus:</b> uz plavkastu Void Black pozadinu sive kartice izgledaju blago „blatno” i mrtvo.'
      ] },
      { v: 'warm', label: 'Tople (prema Ember)', why: [
        'Toplo, „klupsko”, ugodno uz Coral/Amber.',
        '<b>Minus:</b> sudara se s hladnom Void Black pozadinom (vidi se rub između pozadine i kartica); smeđkasti ton može izgledati prljavo na lošijim ekranima.'
      ] }
    ],
    tq3: [
      { v: 'brand', label: 'Coral za greške, Amber za upozorenja', rec: true, why: [
        'Ember paleta već pokriva cijeli raspon crvena–narančasta–žuta. <b>Nema mjesta za zasebnu crvenu</b> koja ne bi izgledala kao Coral.',
        'Greška se prepoznaje po ikoni, tekstu i obrubu (WCAG 1.4.1 ionako traži više od boje).',
        'Opasni gumb (Blokiraj) ima obrub i ikonu, nije ispunjen, pa se ne miješa s glavnim gumbom.',
        'Minus: Coral nosi i „idi” i „problem”; razlikuje ih oblik, ne boja.'
      ] },
      { v: 'separate', label: 'Zasebne signalne boje', why: [
        'Greška #FF7A59 (narančasto-crvena), upozorenje #F5A524 (tamnija narančasta).',
        '<b>Minus:</b> dodaju 4. i 5. „toplu” boju koje su vrlo blizu brandu; izgledaju kao nove brand boje (15.2 to zabranjuje) ili kao greška u nijansi.',
        'Plus: Coral ostaje čisto „brand” boja.'
      ] }
    ],
    tq4: [
      { v: 'soft', label: 'Meko (12 / 16 / pilule)', why: [
        'Prijateljski, mekan, poznat iz većine društvenih aplikacija.',
        '<b>Minus:</b> najgeneričniji izgled; ne odgovara oštrom, „električnom” logu.'
      ] },
      { v: 'medium', label: 'Srednje (10 / 12 / pilule)', rec: true, why: [
        'Ravnoteža: dovoljno oštro za ozbiljan, „premium” dojam, a čipovi (pilule) ostaju jasno dodirljivi.',
        'Najmanje skreće pažnju s glazbe i sadržaja.'
      ] },
      { v: 'sharp', label: 'Oštro (4 / 6 / 4)', why: [
        'Najbliže kutnom, „rift” logu; editorijalni, underground dojam.',
        '<b>Minus:</b> čipovi i gumbi izgledaju slično (sve su pravokutnici), pa je odabrano stanje teže prepoznati na prvi pogled; može djelovati hladno.'
      ] }
    ]
  };

  var state = { tq1: 'a', tq2: 'cool', tq3: 'brand', tq4: 'medium', compare: 'tq1' };
  var qs = new URLSearchParams(location.search).get('compare');
  if (qs && OPTIONS[qs]) {
    state.compare = qs;
    var r = document.querySelector('input[name="compare"][value="' + qs + '"]');
    if (r) r.checked = true;
  }
  var controls = document.getElementById('controls');
  var phones = document.getElementById('phones');
  var tpl = document.getElementById('phone-tpl');

  // ---- WCAG contrast ----
  function hex(v) {
    var m = /#([0-9a-f]{6})/i.exec(v || '');
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function lum(c) {
    return c.map(function (x) { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); })
      .reduce(function (s, x, i) { return s + x * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function cr(a, b) {
    if (!a || !b) return NaN;
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function tokenOf(el, name) { return hex(getComputedStyle(el).getPropertyValue('--gr-' + name)); }

  function readout(phone, q1) {
    var s = function (n) { return tokenOf(phone, n); };
    var onAccent = s('color-text-on-accent');
    var primary = q1 === 'c'
      ? Math.min(cr(onAccent, s('color-ember-coral')), cr(onAccent, s('color-ember-amber')))
      : cr(onAccent, s('color-action-primary'));
    var rows = [
      ['Tekst na gumbu', primary, 4.5],
      ['Sekundarni tekst na kartici', cr(s('color-text-secondary'), s('color-bg-surface')), 4.5],
      ['Greška na kartici', cr(s('color-state-danger'), s('color-bg-surface')), 4.5],
      ['Rub inputa na inputu', cr(s('color-border-strong'), s('color-bg-raised')), 3],
      ['Fokus na pozadini', cr(s('color-focus-ring'), s('color-bg-canvas')), 3]
    ];
    return rows.map(function (r) {
      var ok = r[1] >= r[2];
      return r[0] + ': <b>' + r[1].toFixed(2) + '</b> ' + (ok ? '✓' : '✗') + ' (min ' + r[2] + ')';
    }).join('<br>');
  }

  function wireChips(root) {
    root.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });
  }

  function render() {
    phones.innerHTML = '';
    var q = state.compare;
    OPTIONS[q].forEach(function (opt) {
      var col = document.createElement('section');
      col.className = 'col';
      var h = document.createElement('h2');
      h.innerHTML = opt.label + (opt.rec ? ' <span class="rec">preporuka</span>' : '') +
        (state[q] === opt.v ? ' <span class="approx">tvoj izbor</span>' : '');
      col.appendChild(h);
      var frag = tpl.content.cloneNode(true);
      var phone = frag.querySelector('.phone');
      ['tq1', 'tq2', 'tq3', 'tq4'].forEach(function (k) {
        phone.setAttribute('data-' + k, k === q ? opt.v : state[k]);
      });
      phone.setAttribute('aria-label', 'Primjer: ' + opt.label);
      col.appendChild(frag);
      wireChips(col);
      var ro = document.createElement('p');
      ro.className = 'readout';
      col.appendChild(ro);
      var why = document.createElement('div');
      why.className = 'why';
      why.innerHTML = '<ul><li>' + opt.why.join('</li><li>') + '</li></ul>';
      col.appendChild(why);
      phones.appendChild(col);
      ro.innerHTML = readout(phone, k1(phone));
    });
    renderSwatches();
  }
  function k1(phone) { return phone.getAttribute('data-tq1'); }

  var SWATCHES = [
    ['bg-canvas', 'Pozadina (Void)'], ['bg-surface', 'Kartica'], ['bg-raised', 'Dijalog, input'], ['bg-high', 'Hover'],
    ['border-subtle', 'Razdjelnik (ukras)'], ['border-strong', 'Rub kontrole'],
    ['text-primary', 'Tekst'], ['text-secondary', 'Sekundarni tekst'], ['text-disabled', 'Onemogućeno'],
    ['action-primary', 'Glavna akcija'], ['selected-bg', 'Odabrano (pozadina)'], ['selected-border', 'Odabrano (rub)'],
    ['highlight-bg', 'Daily Drop (pozadina)'], ['highlight-border', 'Daily Drop (rub)'], ['focus-ring', 'Fokus'],
    ['state-danger', 'Greška'], ['state-warning', 'Upozorenje'], ['state-success', 'Uspjeh']
  ];
  function renderSwatches() {
    var box = document.getElementById('swatches');
    box.innerHTML = '';
    ['tq1', 'tq2', 'tq3', 'tq4'].forEach(function (k) { box.setAttribute('data-' + k, state[k]); });
    SWATCHES.forEach(function (s) {
      var d = document.createElement('div');
      d.className = 'sw';
      d.innerHTML = '<i style="background: var(--gr-color-' + s[0] + ')"></i><span>' + s[1] + '<br><code>' + s[0] + '</code> <b class="hx"></b></span>';
      box.appendChild(d);
      d.querySelector('.hx').textContent = getComputedStyle(box).getPropertyValue('--gr-color-' + s[0]).trim();
    });
  }

  controls.addEventListener('change', function (e) {
    if (e.target.name in state) { state[e.target.name] = e.target.value; render(); }
  });
  document.querySelector('.compare-bar').addEventListener('change', function (e) {
    if (e.target.name === 'compare') { state.compare = e.target.value; render(); }
  });

  // Motion demo
  var motion = document.getElementById('motion');
  document.getElementById('play').addEventListener('click', function () { motion.classList.toggle('go'); });
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.getElementById('rm').textContent = rm.matches
    ? 'Tvoj uređaj traži smanjeno kretanje: trajanja su sada 0 ms (to je ispravno ponašanje).'
    : 'Tvoj uređaj ne traži smanjeno kretanje.';

  render();
})();
