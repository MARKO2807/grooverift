// Usage: node design/prototypes/tools/build-genres.mjs <ids.json> <sub.tsv> <sitelinks.tsv>
// Builds pulse/genres-mb.js from two CC0 sources, fetched once on 2026-11-02 with the User-Agent
// "GrooveRift-prototype/0.1 ( https://github.com/MARKO2807/grooverift )":
//   ids.json  [[mbid, name], ...] from https://musicbrainz.org/ws/2/genre/all?fmt=json&limit=100&offset=N (one request a second)
//   sub.tsv   Wikidata "subclass of" (P279) edges between genres that have a MusicBrainz genre ID (P8052), from
//             https://query.wikidata.org/sparql: SELECT ?mb ?pmb WHERE { ?i wdt:P8052 ?mb ; wdt:P279 ?p . ?p wdt:P8052 ?pmb . }
//   sitelinks.tsv  Wikipedia article count per genre (wikibase:sitelinks), a rough popularity signal used to rank search
//             results: SELECT ?mb ?sl WHERE { ?i wdt:P8052 ?mb ; wikibase:sitelinks ?sl . }
// The MusicBrainz web service does not return genre-to-genre relationships, so Wikidata supplies the hierarchy.
// Each genre gets a parent: one of the genres with traits in pulse/data.js. The parent gives the genre its colour and
// its behaviour in the Music DNA, and is shown next to it in "Traži žanr" (D-062). Order: exceptions, keyword rules for
// names that carry their family ("death metal"), the nearest family ancestor in the Wikidata hierarchy, loose folk and
// world keywords, then Folk. A design placeholder, not research; Phase 4 revisits it.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [idsFile, subFile, slFile] = process.argv.slice(2);
if (!slFile) { console.error("Usage: node build-genres.mjs <ids.json> <sub.tsv> <sitelinks.tsv>"); process.exit(1); }
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../pulse/genres-mb.js');
const ids = JSON.parse(readFileSync(idsFile, 'utf8'));
const NAME = Object.fromEntries(ids);
const names = [...new Set(ids.map(x => x[1].trim()))];
const UP = {};
for (const line of readFileSync(subFile, 'utf8').split(/\r?\n/).slice(1)) {
  const [a, b] = line.split('\t').map(x => (x || '').replace(/"/g, ''));
  if (NAME[a] && NAME[b] && a !== b) (UP[NAME[a]] ||= []).push(NAME[b]);
}
const SL = {};
for (const line of readFileSync(slFile, 'utf8').split(/\r?\n/).slice(1)) {
  const [a, n] = line.split('\t').map(x => (x || '').replace(/"/g, ''));
  if (NAME[a]) SL[NAME[a]] = Math.max(SL[NAME[a]] || 0, parseInt(n, 10) || 0);
}

/* MusicBrainz names that are the same as a main chip (or as a genre with its own traits) are left out of search,
   so "Klasična" and "Classical" never show up as two different picks. */
const SAME = {
  pop: 'Pop', rock: 'Rock', 'hip hop': 'Rap', electronic: 'Elektronika', latin: 'Latino', classical: 'Klasična',
  'r&b': 'R&B', country: 'Country', reggae: 'Reggae', metal: 'Metal', jazz: 'Jazz', 'k-pop': 'K-pop', soul: 'Soul',
  blues: 'Blues', folk: 'Folk', punk: 'Punk', house: 'House', techno: 'Techno', trap: 'Trap', 'nu metal': 'Nu metal',
  grunge: 'Grunge', funk: 'Funk', disco: 'Disco', 'drum and bass': 'Drum & bass', 'singer-songwriter': 'Kantautorska',
  'alternative rock': 'Alternativa', 'indie rock': 'Indie'
};

/* Not music genres (talk, sound effects and similar): left out of search. */
const SKIP = new Set(['asmr', 'lecture', 'speech', 'sound effects', 'guided meditation', 'non-music', 'audio drama',
  'audio documentary', 'animal sounds', 'field recording', 'spoken word', 'comedy', 'stand-up comedy', 'poetry', 'interview',
  'audiobook', 'radio play', 'instrumental']);

/* Groups of exceptions, then single ones the rules below would get wrong. */
const GROUP = {
  Latino: 'bambuco candombe champeta choro cueca cueca brava festejo habanera huapango lambada punta sanjuanito tondero ' +
    'vals criollo yaraví piseiro duranguense agronejo compas modinha payada polca criolla filin onda nueva toada de boi ' +
    'carnavalito chilena muliza son istmeño tamborera reparto guayla copla cajamarquina rasqueado cuiabano tiento frevo elétrico',
  Metal: "black 'n' roll|death 'n' roll", Techno: 'xtra raw|frenchtek', Elektronika: 'hauntology|mallsoft',
  Rock: 'visual kei|loud kei|soft visual', Soul: 'praise & worship', Rap: 'twerk', Reggae: 'rapso',
  Pop: 'music hall|vaudeville|ryūkōka|shidaiqu|estrada|canzone neomelodica', Jazz: 'cakewalk|marabi'
};
const SPLIT = s => s.includes('|') ? s.split('|') : s.match(/(cueca brava|vals criollo|onda nueva|toada de boi|polca criolla|son istmeño|copla cajamarquina|rasqueado cuiabano|frevo elétrico|\S+)/g);
const EXACT = {
  ...Object.fromEntries(Object.entries(GROUP).flatMap(([fam, s]) => SPLIT(s).map(n => [n, fam]))),
  'garage rock': 'Rock', 'garage rock revival': 'Rock', 'industrial rock': 'Alternativa', 'deathrock': 'Alternativa',
  'new romantic': 'Pop', 'chamber pop': 'Indie', 'western swing': 'Country', 'funk carioca': 'Latino', 'baile funk': 'Latino',
  'amapiano': 'House', 'gqom': 'House', 'kwaito': 'House', 'afrobeats': 'Pop', 'afrobeat': 'Funk', 'afroswing': 'Rap',
  'hardcore hip hop': 'Rap', 'rap rock': 'Nu metal', 'rap metal': 'Nu metal', 'funk metal': 'Nu metal', 'blues rock': 'Rock', 'country rock': 'Rock',
  'dance-pop': 'Pop', 'europop': 'Pop', 'schlager': 'Pop', 'turbo-folk': 'Pop', 'klapa': 'Kantautorska',
  'flamenco': 'Folk', 'fado': 'Folk', 'trip hop': 'Elektronika', 'witch house': 'Elektronika', 'musical': 'Filmska glazba',
  'filmi': 'Filmska glazba', 'cinematic classical': 'Filmska glazba', 'new age': 'Elektronika', 'christian rock': 'Rock',
  'contemporary christian': 'Pop', 'worship': 'Soul', 'ccm': 'Pop', 'city pop': 'Pop', 'vocaloid': 'Pop',
  'emo rap': 'Rap', 'cloud rap': 'Trap', 'jazz rap': 'Rap', 'jazz-funk': 'Funk', 'nu jazz': 'Jazz', 'acid jazz': 'Jazz',
  'jazz fusion': 'Jazz', 'samba-jazz': 'Latino', 'latin jazz': 'Jazz', 'bossa nova': 'Latino', 'mpb': 'Latino',
  'lo-fi': 'Elektronika', 'lo-fi hip hop': 'Rap', 'neoclassical darkwave': 'Alternativa', 'dark cabaret': 'Alternativa'
};

/* First match wins, so the more specific families come first. */
const RULES = [
  [/\bnu metal\b|nu-metal/, 'Nu metal'],
  [/metal|grindcore|deathcore|djent|thrash|sludge|\bdoom\b|black ?gaze|goregrind|mathcore/, 'Metal'],
  [/grunge|post-grunge/, 'Grunge'],
  [/\bk-pop\b/, 'K-pop'],
  [/hardcore techno|happy hardcore|uk hardcore|hardcore breaks|frenchcore|terrorcore|speedcore|gabber|hardstyle|hard dance/, 'Techno'],
  [/punk|hardcore|\bemo\b|screamo|\boi!?$|riot grrrl|crust|powerviolence|skacore/, 'Punk'],
  [/drum and bass|jungle|liquid funk|neurofunk|breakcore|dubstep|brostep|riddim|breakbeat|\bbreaks\b|bass music|footwork|juke|wonky|uk bass|future bass|halftime/, 'Drum & bass'],
  [/techno|trance|psytrance|goa|industrial|\bebm\b|electro-industrial|minimal wave|power electronics|noise/, 'Techno'],
  [/disco/, 'Disco'],
  [/house|garage|\b2-step\b|\b2 step\b|speed garage|bassline|ballroom|vogue/, 'House'],
  [/\btrap\b|drill|phonk|crunk|rage|plugg/, 'Trap'],
  [/hip hop|hip-hop|\brap\b|grime|boom bap|turntablism|horrorcore|bounce|chopped and screwed|g-funk|hyphy|snap/, 'Rap'],
  [/r&b|rhythm (and|&) blues|new jack swing|quiet storm/, 'R&B'],
  [/funk|boogie(?!-woogie)/, 'Funk'],
  [/soul|motown|gospel|doo-wop|spiritual|christian/, 'Soul'],
  [/jazz|bebop|\bbop\b|swing|big band|dixieland|ragtime|scat|stride|third stream/, 'Jazz'],
  [/reggae|dancehall|\bdub\b|\bska\b|rocksteady|ragga|lovers rock|calypso|soca|mento/, 'Reggae'],
  [/latin|salsa|reggaeton|bachata|merengue|cumbia|tango|samba|forró|\bbaile\b|mambo|cha-cha|rumba|son cubano|bolero|ranchera|mariachi|norteño|corrido|banda|vallenato|tejano|dembow|axé|sertanejo|pagode|guaracha|timba|boogaloo|bossa|tropicália|tropical|zouk|kizomba|kompa|plena|bomba|guajira|danzón|joropo|chamamé|música|mexican|brazilian|cuban|andean/, 'Latino'],
  [/j-pop|c-pop|mandopop|cantopop|t-pop|v-pop|p-pop|anison|idol|enka|kayōkyoku/, 'Pop'],
  [/country|bluegrass|americana|honky|western|outlaw|red dirt|nashville|cajun|zydeco|old-time|cowboy/, 'Country'],
  [/soundtrack|film|score|video game|game music|show tunes|library music|trailer|musical|cabaret/, 'Filmska glazba'],
  [/classical|baroque|romanticism|opera|operetta|chamber|symphon|concerto|sonata|choral|chant|gregorian|renaissance|medieval|minimalism|impressionism|serialism|\blied\b|cantata|oratorio|requiem|madrigal|motet|neoclassic|art song|musique concrète|orchestral|string quartet|early music|polyphony|fugue|sacred|mass|zarzuela|ballet|spectralism|atonal|twelve-tone|aleatoric|avant-garde|contemporary classical|modern classical|post-minimalism|carnatic|hindustani|gagaku|organ|piano/, 'Klasična'],
  [/indie|shoegaze|dream pop|jangle|twee|britpop|slowcore|sadcore|math rock|post-rock|bedroom pop|\bc86\b|chillwave|neo-psychedelia/, 'Indie'],
  [/alternative|new wave|goth|darkwave|coldwave|art rock|experimental rock|krautrock|noise rock|no wave|post-punk|dark wave|ethereal|industrial|cold wave|art pop/, 'Alternativa'],
  [/rock|psychedel|prog|surf|rockabilly|beat music|merseybeat|stoner|glam|arena|aor|power pop/, 'Rock'],
  [/blues|boogie-woogie/, 'Blues'],
  [/singer-songwriter|chanson|cantautor|canción|song poetry|bard|kantautor|sevdalinka|starogradska/, 'Kantautorska'],
  [/pop$|^pop |\bpop\b|bubblegum|teen|boy band|girl group|eurovision|schlager|levenslied|dansband/, 'Pop'],
  [/electro|electronic|\bedm\b|synth|ambient|\bidm\b|downtempo|trip hop|chill|lo-fi|glitch|vaporwave|chiptune|\bbass\b|future|dance|eurodance|hi-nrg|big beat|electronica|new age|drone|darksynth|hyperpop|psybient|bitpop|nightcore|plunderphonics|sound collage|tape music|microsound|sequencer|space music|berlin school|moombahton|dub techno|hardvapour|sovietwave|outrun|eurobeat|italo|electroclash|vapor|witch|seapunk|frutiger/, 'Elektronika'],
];
const FOLK = [
  [/folk|acoustic|celtic|world|traditional|ethnic|klezmer|fado|polka|balkan|tamburica|rebetiko|qawwali|afro|highlife|jùjú|juju|mbalax|soukous|bhangra|raga|gamelan|throat|yodel|shanty|ballad|march|waltz|mazurka|tarantella|flamenco|sevillanas|morna|coladeira|griot|kora|desert|gnawa|raï|chaabi|dabke|mizrahi|arabesque|türkü|halk|manele|muzică|narodna|starogradska|néo|sertanejo|ghazal|qasida|maqam|bhajan|kirtan|lavani|baul|joik|kulning|polska|hambo|reel|jig|hornpipe|strathspey|pibroch|bagpipe|accordion|harp|zither|dulcimer|banjo|mandolin/, 'Folk']
];

const ACRO = { idm: 'IDM', edm: 'EDM', ebm: 'EBM', uk: 'UK', us: 'US', 'r&b': 'R&B', mpb: 'MPB', aor: 'AOR', ccm: 'CCM', dj: 'DJ', 'j-pop': 'J-pop', 'c-pop': 'C-pop', 'j-rock': 'J-rock', 'k-rock': 'K-rock', 'k-rap': 'K-rap', 'v-pop': 'V-pop', 'p-pop': 'P-pop', 't-pop': 'T-pop', '2-step': '2-step' };
const cap = s => s.split(' ').map((w, i) => ACRO[w] || (i === 0 ? w.charAt(0).toLocaleUpperCase('en') + w.slice(1) : w)).join(' ');

/* Wikidata ancestors that stand for a family. The nearest one wins; at the same distance, the earlier entry wins. */
const ROOTS = Object.assign({}, SAME, {
  'heavy metal': 'Metal', 'extreme metal': 'Metal', 'punk rock': 'Punk', 'hardcore punk': 'Punk', 'ska': 'Reggae',
  'gospel': 'Soul', 'trance': 'Techno', 'industrial': 'Techno', 'ambient': 'Elektronika', 'dance': 'Elektronika',
  'edm': 'Elektronika', 'dubstep': 'Drum & bass', 'breakbeat': 'Drum & bass', 'uk garage': 'House', 'indie pop': 'Indie',
  'new wave': 'Alternativa', 'post-punk': 'Alternativa', 'opera': 'Klasična', 'art music': 'Klasična', 'musical': 'Filmska glazba',
  'dancehall': 'Reggae', 'salsa': 'Latino', 'samba': 'Latino', 'cumbia': 'Latino', 'reggaeton': 'Latino', 'bluegrass': 'Country',
  'swing': 'Jazz', 'hip-hop': 'Rap', 'rap': 'Rap', 'psychedelic rock': 'Rock', 'hard rock': 'Rock', 'progressive rock': 'Rock'
});
const ROOT_ORDER = Object.keys(ROOTS);
function viaGraph(n) {
  let level = [n]; const seen = new Set(level);
  for (let d = 0; d < 6 && level.length; d++) {
    const next = [];
    for (const x of level) for (const p of UP[x] || []) if (!seen.has(p)) { seen.add(p); next.push(p); }
    const hit = next.filter(p => ROOTS[p]).sort((a, b) => ROOT_ORDER.indexOf(a) - ROOT_ORDER.indexOf(b))[0];
    if (hit) return ROOTS[hit];
    level = next;
  }
  return null;
}

const rows = [], stats = {}, fallback = [], how = { exact: 0, rule: 0, graph: 0, folk: 0 }, log = [];
for (const n of names) {
  if (SAME[n] || SKIP.has(n)) continue;
  let p = EXACT[n], via = 'exact';
  if (!p) for (const [re, fam] of RULES) if (re.test(n)) { p = fam; via = 'rule'; break; }
  if (!p && (p = viaGraph(n))) via = 'graph';
  if (!p) for (const [re, fam] of FOLK) if (re.test(n)) { p = fam; via = 'folk'; break; }
  if (!p) { p = 'Folk'; via = 'none'; fallback.push(n); } else how[via]++;
  log.push(`${via}\t${n}\t${p}`);
  rows.push([cap(n), p, SL[n] || 0]);
  stats[p] = (stats[p] || 0) + 1;
}
rows.sort((a, b) => a[0].localeCompare(b[0], 'en'));

const body = rows.map(([n, p, sl]) => `${n}|${p}|${sl}`).join('\n');
writeFileSync(out, `/* GrooveRift prototype: the MusicBrainz genre list for "Traži žanr" (D-062).
   Source: MusicBrainz, https://musicbrainz.org/ws/2/genre/all (JSON, paged), fetched 2026-11-02. Licence: CC0.
   ${names.length} genres; ${names.length - rows.length} are left out: the same as a genre with its own traits in data.js, or not music (speech, ASMR).
   Each line is "Name|Parent|Rank". The parent is a genre in data.js and gives the colour and the Music DNA behaviour.
   Rank is the number of Wikipedia articles about the genre (Wikidata sitelinks, CC0): search shows better-known genres first.
   Hierarchy: Wikidata "subclass of" (CC0) between genres with a MusicBrainz ID. Parents come from tools/build-genres.mjs:
   exceptions ${how.exact}, keyword rules ${how.rule}, Wikidata ancestors ${how.graph}, folk keywords ${how.folk}; ${fallback.length} genres
   that matched nothing default to Folk (mostly regional and traditional styles). A design placeholder, not research.
   Generated file: do not edit by hand. */
window.GR_MB_GENRES = \`
${body.replace(/`/g, "'").replace(/\\/g, '')}
\`.trim().split('\\n').map(l => { const [n, p, r] = l.split('|'); return [n, p, +r]; });
`);
console.log(`wrote ${rows.length} genres to ${out}`);
console.log(stats, how, 'fallback', fallback.length);
if (process.env.LOG) writeFileSync(process.env.LOG, log.join('\n'));
