/* GrooveRift refined prototype: artist search for the Music DNA step.
   Offline (default): searches the stand-in list in data.js, tolerant of typos ("metalica" finds Metallica).
   Live (?live=1): asks the real catalog from the reviewer's browser, read-only, no account, no key:
     1. MusicBrainz artist search (CC0 data, ADR-0002), at most one request per 1.1 s (their rate rule)
     2. Wikidata: which of those artists have an image (P18), matched by MusicBrainz ID (P434)
     3. Wikimedia Commons: thumbnail, author and licence, so every photo is shown with its credit (D-017)
   Artists without a free photo get a generated tile (initials on a Coral/Amber field), as D-017 requires.
   Only the typed search text leaves the browser. Production would proxy, cache and self-host (research §5). */
(function () {
  'use strict';
  const D = window.GR_DATA;
  const P = new URLSearchParams(location.search);
  const LIVE = P.get('live') === '1';
  const FAIL = P.get('catalog') === 'fail';
  const SPECIAL = new Set(['89ad4ac3-39f7-470e-963a-56509c546377', '125ec42a-7229-4250-afc5-e057484327fe', 'f731ccc4-e22a-43af-a747-64213329e088', '33cf029c-63b0-41a0-9855-be2a3665fb3b']);
  const fold = s => String(s).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  const OFFLINE = D.artists.map((a, i) => ({ id: 'fx' + i, name: a.name, meta: a.meta.replace(' · ', ', '), g: a.g, key: fold(a.name) }));

  function offline(q) {
    const f = fold(q.trim());
    if (f.length < 2) return [];
    const tol = f.length >= 7 ? 2 : f.length >= 4 ? 1 : 0;
    return OFFLINE.map(a => {
      const words = a.key.split(/[\s,.&-]+/).filter(Boolean);
      let s = -1;
      if (a.key.startsWith(f)) s = 100;
      else if (words.some(w => w.startsWith(f))) s = 90;
      else if (a.key.includes(f)) s = 80;
      else if (tol) {
        const d = Math.min(lev(f, a.key.slice(0, f.length)), lev(f, a.key.slice(0, f.length + 1)), ...words.map(w => lev(f, w)));
        if (d <= tol) s = 70 - d * 10;
      }
      return { a, s };
    }).filter(x => x.s >= 0).sort((x, y) => y.s - x.s || x.a.name.localeCompare(y.a.name)).slice(0, 6).map(x => x.a);
  }

  /* Generated tile for artists without a free photo. */
  function tile(name) {
    const h = hash(name);
    const words = name.replace(/^the\s+/i, '').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
    const ini = ((words[0] || '?')[0] + (words[1] ? words[1][0] : '')).toUpperCase();
    const w = (h % 1000) / 1000, ang = (h >> 10) % 360;
    const c = [255 + (255 - 255) * w, Math.round(88 + (203 - 88) * w), Math.round(107 + (105 - 107) * w)];
    return { ini, bg: `linear-gradient(${ang}deg, rgb(${c[0]},${c[1]},${c[2]}) 0%, #2A2F3B 72%, #12151C 100%)` };
  }

  const TYPE = { Group: 'Grupa', Person: 'Solo', Orchestra: 'Orkestar', Choir: 'Zbor', Character: 'Lik', Other: 'Ostalo' };
  let regions;
  try { regions = new Intl.DisplayNames(['hr'], { type: 'region' }); } catch (e) { regions = null; }
  function metaOf(a) {
    const parts = [TYPE[a.type] || 'Izvođač'];
    const cc = a.country || (a.area && a.area['iso-3166-1-codes'] && a.area['iso-3166-1-codes'][0]);
    if (cc && cc !== 'XW' && cc !== 'XE') { try { parts.push(regions ? regions.of(cc) : cc); } catch (e) { parts.push(cc); } }
    else if (a.area && a.area.name) parts.push(a.area.name);
    if (a.disambiguation) parts.push(a.disambiguation);
    return parts.join(', ');
  }
  const lucene = s => s.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');

  let lastMB = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function mbSearch(q, signal) {
    const gap = lastMB + 1100 - Date.now(); if (gap > 0) await wait(gap);
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    lastMB = Date.now();
    const r = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(lucene(q))}&fmt=json&limit=10`, { signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('MusicBrainz ' + r.status);
    const j = await r.json();
    return (j.artists || []).filter(a => a.score >= 55 && !SPECIAL.has(a.id)).slice(0, 6)
      .map(a => ({ id: a.id, name: a.name, meta: metaOf(a), g: [], key: fold(a.name) }));
  }
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').trim().replace(/\s+/g, ' '); };
  async function photos(list, signal) {
    if (!list.length) return;
    const q = `SELECT ?mbid ?img WHERE { VALUES ?mbid { ${list.map(a => `"${a.id}"`).join(' ')} } ?item wdt:P434 ?mbid . ?item wdt:P18 ?img }`;
    const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { signal, headers: { Accept: 'application/sparql-results+json' } });
    if (!r.ok) return;
    const j = await r.json();
    const files = {};
    for (const b of j.results.bindings) { const f = decodeURIComponent(b.img.value.split('/Special:FilePath/')[1] || ''); if (f && !files[b.mbid.value]) files[b.mbid.value] = 'File:' + f; }
    const titles = [...new Set(Object.values(files))];
    if (!titles.length) return;
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=160'
      + '&iiextmetadatafilter=Artist|LicenseShortName&titles=' + encodeURIComponent(titles.join('|'));
    const r2 = await fetch(u, { signal });
    if (!r2.ok) return;
    const j2 = await r2.json();
    const norm = {}; (j2.query.normalized || []).forEach(x => { norm[x.from] = x.to; });
    const info = {};
    for (const p of Object.values(j2.query.pages || {})) {
      const ii = p.imageinfo && p.imageinfo[0]; if (!ii) continue;
      const md = ii.extmetadata || {};
      info[p.title] = { img: ii.thumburl, credit: `Foto: ${strip(md.Artist && md.Artist.value) || 'nepoznat autor'}, ${strip(md.LicenseShortName && md.LicenseShortName.value) || 'licenca na Commonsu'}, Wikimedia Commons` };
    }
    for (const a of list) { const t = files[a.id]; const x = t && (info[t] || info[norm[t]]); if (x) Object.assign(a, x); }
  }

  /* search(q, onUpdate): onUpdate({ state: 'idle'|'loading'|'ok'|'empty'|'error', items }) may be called
     more than once (results first, photos after). Returns a cancel function. */
  function search(q, onUpdate) {
    const term = q.trim();
    if (fold(term).length < 2) { onUpdate({ state: 'idle', items: [] }); return () => {}; }
    if (FAIL) { onUpdate({ state: 'loading', items: [] }); const t = setTimeout(() => onUpdate({ state: 'error', items: [] }), 700); return () => clearTimeout(t); }
    if (!LIVE) { const items = offline(term); onUpdate({ state: items.length ? 'ok' : 'empty', items }); return () => {}; }
    const ctl = new AbortController();
    onUpdate({ state: 'loading', items: [] });
    const timer = setTimeout(async () => {
      try {
        const items = await mbSearch(term, ctl.signal);
        if (ctl.signal.aborted) return;
        onUpdate({ state: items.length ? 'ok' : 'empty', items });
        if (items.length) { await photos(items, ctl.signal); if (!ctl.signal.aborted) onUpdate({ state: 'ok', items }); }
      } catch (e) {
        if (e.name !== 'AbortError') onUpdate({ state: 'error', items: [], error: String(e.message || e) });
      }
    }, 380);
    return () => { clearTimeout(timer); ctl.abort(); };
  }

  window.GR_CATALOG = { LIVE, FAIL, search, tile, fold };
})();
