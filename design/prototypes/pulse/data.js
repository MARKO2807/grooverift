/* GrooveRift refined prototype (step 3.5, direction C): placeholder data.
   PLACEHOLDER: every member, answer, comment, email and question below is fictional.
   Artist, album and track names stand in for catalog references (MusicBrainz, CC0). No artwork is stored
   here (D-017). In live mode (?live=1) artist search queries MusicBrainz and shows free-licence photos
   from Wikimedia Commons with credit; see catalog.js. Reactions are placeholders until OQ-13. Nothing is stored. */
window.GR_DATA = {
  email: 'netko@primjer.hr',
  takenUsernames: ['ana', 'marko', 'tin', 'petra', 'luka', 'mia', 'admin', 'grooverift', 'moderator', 'podrska', 'support'],

  /* Genres with design-placeholder traits.
     Traits drive the Music DNA visual (dna.js) and are design placeholders, not research:
     f family (0 heavy, 1 rock, 2 pop, 3 urban, 4 electronic, 5 groove, 6 roots and classical),
     e energy, t tempo, j edge (smooth → jagged), s swing (straight → loose), w hue (0 Coral → 1 Amber),
     k behaviour of the genre's section in the Spirala, c colour (D-052: a colour with a meaning, see below).
     Colours: heat for heavy music, Coral for rock, pink for pop, lavender for K-pop, night blues for rap and R&B,
     cyan for club music, amber for soul and funk, hot orange for Latin, green for jazz and reggae, steel blue for
     blues, earth for acoustic and country, ivory for classical and lilac for film music. Similar lightness and
     moderate saturation keep a helix calm. */
  /* The 20 genres shown first, in order of popularity (D-062, replaces the D-053 list). 1 to 10 follow IFPI
     "Engaging with Music 2022" (global listener survey: pop, rock, hip-hop/rap, dance/electronic, Latin,
     classical/opera, R&B, soundtracks, country, reggae). 11 to 20 are a judgement from Luminate's 2025 core genres
     and the European club scene. The rest are found through "Još žanrova". */
  mainGenres: ['Pop', 'Rock', 'Rap', 'Elektronika', 'Latino', 'Klasična', 'R&B', 'Filmska glazba', 'Country', 'Reggae',
    'Metal', 'Indie', 'Jazz', 'K-pop', 'Soul', 'Blues', 'Folk', 'Punk', 'House', 'Techno'],
  /* Other words members type for a genre (search only). */
  genreAlias: {
    'Rap': ['hip hop', 'hip-hop', 'hiphop'], 'Elektronika': ['electronic', 'edm', 'dance', 'elektronska'], 'Klasična': ['classical', 'klasika'],
    'Filmska glazba': ['soundtrack', 'film', 'score', 'filmska'], 'Latino': ['latin', 'latinoamerička'], 'Kantautorska': ['singer-songwriter', 'kantautor'],
    'Alternativa': ['alternative', 'alternativni rock'], 'Drum & bass': ['drum and bass', 'dnb'], 'Folk': ['narodna', 'etno', 'world'], 'Country': ['kantri']
  },
  /* Shown in "Još žanrova" before anything is typed. */
  genreSuggest: ['Trap', 'Alternativa', 'Funk', 'Drum & bass', 'Disco', 'Grunge', 'Nu metal', 'Kantautorska', 'Afrobeats', 'Gospel', 'Hard rock', 'Lo-fi'],
  genres: [
    { n: 'Rock', f: 1, e: .75, t: .6, j: .55, s: .2, w: .18, k: 'drive', c: '#FF586B' },
    { n: 'Pop', f: 2, e: .6, t: .6, j: .12, s: .2, w: .55, k: 'sine', c: '#FF84B8' },
    { n: 'K-pop', f: 2, e: .7, t: .68, j: .2, s: .25, w: .5, k: 'sine', c: '#C88BFF' },
    { n: 'Latino', f: 5, e: .7, t: .62, j: .2, s: .8, w: .66, k: 'swing', c: '#FF8A3D' },
    { n: 'Rap', f: 3, e: .72, t: .5, j: .45, s: .7, w: .32, k: 'burst', c: '#4F8CFF' },
    { n: 'Trap', f: 3, e: .78, t: .35, j: .6, s: .62, w: .28, k: 'burst', c: '#6E7CFF' },
    { n: 'Metal', f: 0, e: 1, t: .85, j: 1, s: .08, w: 0, k: 'saw', c: '#E23B55' },
    { n: 'Nu metal', f: 0, e: .95, t: .6, j: .85, s: .35, w: .05, k: 'saw', c: '#EC4F63' },
    { n: 'Punk', f: 0, e: .95, t: .95, j: .8, s: .1, w: .08, k: 'saw', c: '#FF5A78' },
    { n: 'Grunge', f: 0, e: .8, t: .5, j: .7, s: .22, w: .1, k: 'drive', c: '#C95B6E' },
    { n: 'Indie', f: 1, e: .5, t: .55, j: .35, s: .3, w: .3, k: 'drive', c: '#FF8F8A' },
    { n: 'Alternativa', f: 1, e: .6, t: .55, j: .45, s: .3, w: .22, k: 'drive', c: '#FF7480' },
    { n: 'Elektronika', f: 4, e: .62, t: .62, j: .35, s: .25, w: .48, k: 'square', c: '#5ACFE3' },
    { n: 'Techno', f: 4, e: .82, t: .78, j: .42, s: .04, w: .42, k: 'square', c: '#27BFD6' },
    { n: 'House', f: 4, e: .72, t: .66, j: .25, s: .3, w: .5, k: 'square', c: '#3DD6B4' },
    { n: 'Drum & bass', f: 4, e: .9, t: 1, j: .6, s: .4, w: .4, k: 'burst', c: '#47AEF7' },
    { n: 'R&B', f: 3, e: .45, t: .4, j: .1, s: .6, w: .62, k: 'sine', c: '#8F86FF' },
    { n: 'Soul', f: 5, e: .5, t: .4, j: .1, s: .62, w: .78, k: 'sine', c: '#FFB45A' },
    { n: 'Funk', f: 5, e: .75, t: .55, j: .3, s: .9, w: .7, k: 'swing', c: '#FF9845' },
    { n: 'Disco', f: 2, e: .72, t: .66, j: .2, s: .5, w: .6, k: 'square', c: '#E58CF2' },
    { n: 'Jazz', f: 5, e: .45, t: .5, j: .2, s: 1, w: .85, k: 'swing', c: '#3FC98A' },
    { n: 'Blues', f: 5, e: .45, t: .35, j: .3, s: .75, w: .8, k: 'swing', c: '#7F9DCB' },
    { n: 'Reggae', f: 6, e: .45, t: .35, j: .15, s: .8, w: .72, k: 'swing', c: '#93CF57' },
    { n: 'Country', f: 6, e: .5, t: .5, j: .2, s: .45, w: .88, k: 'drive', c: '#D9894F' },
    { n: 'Folk', f: 6, e: .3, t: .4, j: .15, s: .35, w: .92, k: 'swell', c: '#D8B06E' },
    { n: 'Kantautorska', f: 6, e: .25, t: .3, j: .1, s: .4, w: .95, k: 'swell', c: '#E7C48D' },
    { n: 'Klasična', f: 6, e: .4, t: .3, j: .05, s: .5, w: 1, k: 'swell', c: '#F2E5C6' },
    { n: 'Filmska glazba', f: 6, e: .45, t: .35, j: .08, s: .4, w: .96, k: 'swell', c: '#C7B8E8' }
  ],
  /* More genres through search (D-062): the MusicBrainz genre list (genres-mb.js, CC0, about 2,200 genres), plus a
     few Croatian names. Each borrows the traits and colour of its parent genre above. */
  moreGenres: [['Zabavna', 'Pop', 20], ['Etno', 'Folk', 20], ['Tamburica', 'Folk', 20], ['Šansona', 'Kantautorska', 20]].concat(window.GR_MB_GENRES || []),
  genreMin: 2,
  genreMax: 10,
  artistMax: 10,

  /* Offline artist catalog stand-in (real names, as MusicBrainz would return them). Second field: country only;
     a short description is added only where two artists share a name. g = main genres. */
  artists: [
    ['Metallica', 'SAD', ['Metal']], ['Slipknot', 'SAD', ['Nu metal', 'Metal']], ['Linkin Park', 'SAD', ['Nu metal', 'Rock']],
    ['Korn', 'SAD', ['Nu metal']], ['System of a Down', 'SAD', ['Nu metal', 'Metal']], ['Iron Maiden', 'Ujedinjeno Kraljevstvo', ['Metal']],
    ['Black Sabbath', 'Ujedinjeno Kraljevstvo', ['Metal', 'Rock']], ['Rammstein', 'Njemačka', ['Metal']], ['Nirvana', 'SAD, grunge (1987–1994)', ['Grunge']],
    ['Nirvana', 'Ujedinjeno Kraljevstvo, psihodelični pop (1960-e)', ['Pop', 'Rock']], ['Pearl Jam', 'SAD', ['Grunge', 'Rock']], ['Foo Fighters', 'SAD', ['Rock']],
    ['Ramones', 'SAD', ['Punk']], ['The Clash', 'Ujedinjeno Kraljevstvo', ['Punk']], ['Green Day', 'SAD', ['Punk', 'Rock']],
    ['Queen', 'Ujedinjeno Kraljevstvo', ['Rock']], ['Led Zeppelin', 'Ujedinjeno Kraljevstvo', ['Rock']], ['Pink Floyd', 'Ujedinjeno Kraljevstvo', ['Rock']],
    ['The Beatles', 'Ujedinjeno Kraljevstvo', ['Rock', 'Pop']], ['Arctic Monkeys', 'Ujedinjeno Kraljevstvo', ['Indie', 'Rock']], ['Radiohead', 'Ujedinjeno Kraljevstvo', ['Alternativa']],
    ['Tame Impala', 'Australija', ['Indie']], ['The Strokes', 'SAD', ['Indie']], ['The Cure', 'Ujedinjeno Kraljevstvo', ['Alternativa']],
    ['Taylor Swift', 'SAD', ['Pop']], ['Dua Lipa', 'Ujedinjeno Kraljevstvo', ['Pop', 'Disco']], ['The Weeknd', 'Kanada', ['R&B', 'Pop']],
    ['Billie Eilish', 'SAD', ['Pop', 'Alternativa']], ['Michael Jackson', 'SAD', ['Pop']], ['Kendrick Lamar', 'SAD', ['Rap']],
    ['Eminem', 'SAD', ['Rap']], ['2Pac', 'SAD', ['Rap']], ['Travis Scott', 'SAD', ['Trap']], ['Drake', 'Kanada', ['Rap', 'R&B']],
    ['Daft Punk', 'Francuska', ['House', 'Elektronika']], ['Aphex Twin', 'Ujedinjeno Kraljevstvo', ['Elektronika']], ['Charlotte de Witte', 'Belgija', ['Techno']],
    ['Amelie Lens', 'Belgija', ['Techno']], ['Carl Cox', 'Ujedinjeno Kraljevstvo', ['Techno', 'House']], ['Fred again..', 'Ujedinjeno Kraljevstvo', ['House', 'Elektronika']],
    ['Peggy Gou', 'Južna Koreja', ['House']], ['Chase & Status', 'Ujedinjeno Kraljevstvo', ['Drum & bass']], ['Pendulum', 'Australija', ['Drum & bass']],
    ['Kraftwerk', 'Njemačka', ['Elektronika']], ['Massive Attack', 'Ujedinjeno Kraljevstvo', ['Elektronika']], ['Portishead', 'Ujedinjeno Kraljevstvo', ['Elektronika']],
    ['Frank Ocean', 'SAD', ['R&B']], ['SZA', 'SAD', ['R&B']], ['Amy Winehouse', 'Ujedinjeno Kraljevstvo', ['Soul', 'Jazz']],
    ['Aretha Franklin', 'SAD', ['Soul']], ['Marvin Gaye', 'SAD', ['Soul']], ['James Brown', 'SAD', ['Funk', 'Soul']],
    ['Parliament', 'SAD', ['Funk']], ['Bee Gees', 'Ujedinjeno Kraljevstvo', ['Disco', 'Pop']], ['ABBA', 'Švedska', ['Pop', 'Disco']],
    ['Donna Summer', 'SAD', ['Disco']], ['Miles Davis', 'SAD', ['Jazz']], ['John Coltrane', 'SAD', ['Jazz']],
    ['Nina Simone', 'SAD', ['Jazz', 'Soul']], ['Kamasi Washington', 'SAD', ['Jazz']], ['B.B. King', 'SAD', ['Blues']],
    ['Muddy Waters', 'SAD', ['Blues']], ['Bob Marley & The Wailers', 'Jamajka', ['Reggae']], ['Bob Dylan', 'SAD', ['Folk', 'Kantautorska']],
    ['Joni Mitchell', 'Kanada', ['Folk', 'Kantautorska']], ['Leonard Cohen', 'Kanada', ['Kantautorska']], ['Björk', 'Island', ['Alternativa', 'Elektronika']],
    ['Rosalía', 'Španjolska', ['Pop']], ['Bad Bunny', 'Portoriko', ['Trap', 'Pop']], ['Johann Sebastian Bach', 'Njemačka', ['Klasična']],
    ['Ludwig van Beethoven', 'Njemačka', ['Klasična']], ['Wolfgang Amadeus Mozart', 'Austrija', ['Klasična']],
    ['Prljavo kazalište', 'Hrvatska', ['Rock', 'Punk']], ['Parni valjak', 'Hrvatska', ['Rock']], ['Azra', 'Hrvatska', ['Rock', 'Alternativa']],
    ['Haustor', 'Hrvatska', ['Alternativa']], ['Let 3', 'Hrvatska', ['Rock', 'Alternativa']], ['Hladno pivo', 'Hrvatska', ['Punk']],
    ['KUD Idijoti', 'Hrvatska', ['Punk']], ['Pips, Chips & Videoclips', 'Hrvatska', ['Rock']], ['Gibonni', 'Hrvatska', ['Pop', 'Rock']],
    ['Oliver Dragojević', 'Hrvatska', ['Pop', 'Kantautorska']], ['Arsen Dedić', 'Hrvatska', ['Kantautorska']], ['Darko Rundek', 'Hrvatska', ['Kantautorska', 'Alternativa']],
    ['Elemental', 'Hrvatska', ['Rap']], ['Edo Maajka', 'Bosna i Hercegovina', ['Rap']], ['Grše', 'Hrvatska', ['Trap', 'Rap']],
    ['Baby Lasagna', 'Hrvatska', ['Rock', 'Pop']], ['Nina Badrić', 'Hrvatska', ['Pop', 'Soul']], ['Kawasaki 3P', 'Hrvatska', ['Rock', 'Punk']]
  ].map(([name, meta, g]) => ({ name, meta, g })),

  refs: [
    { type: 'Album', title: 'Kind of Blue', by: 'Miles Davis', g: ['Jazz'] },
    { type: 'Pjesma', title: 'Blue in Green', by: 'Miles Davis', g: ['Jazz'] },
    { type: 'Album', title: 'Head Hunters', by: 'Herbie Hancock', g: ['Funk', 'Jazz'] },
    { type: 'Album', title: 'The Epic', by: 'Kamasi Washington', g: ['Jazz'] },
    { type: 'Pjesma', title: 'Take Five', by: 'The Dave Brubeck Quartet', g: ['Jazz'] },
    { type: 'Album', title: 'Little Girl Blue', by: 'Nina Simone', g: ['Jazz', 'Soul'] },
    { type: 'Album', title: 'A Love Supreme', by: 'John Coltrane', g: ['Jazz'] },
    { type: 'Album', title: "Emily's D+Evolution", by: 'Esperanza Spalding', g: ['Jazz', 'Rock'] },
    { type: 'Album', title: 'Black Radio', by: 'Robert Glasper Experiment', g: ['Jazz', 'R&B'] },
    { type: 'Album', title: 'Mezzanine', by: 'Massive Attack', g: ['Elektronika'] }
  ],

  /* Day of the current question. Date strings are built in app.js with Intl (hr-HR). */
  drop: {
    date: '2026-11-01',
    number: 128,
    question: 'Koji album bi dao nekome tko misli da ne voli jazz?'
  },

  pastDrops: [
    { date: '2026-10-31', q: 'Koja pjesma je najbolje otvaranje albuma?' },
    { date: '2026-10-30', q: 'Koji koncert pamtiš do danas?' },
    { date: '2026-10-29', q: 'Koju pjesmu najčešće šalješ prijateljima?' }
  ],

  /* One reaction (D-056): icon only (a small audio wave), named "Sviđa mi se" / "Like" for notifications,
     the who-reacted list and screen readers. The per-answer counts below are summed into it by app.js. */
  reactions: [
    { id: 'like', label: 'Sviđa mi se' }
  ],

  /* Fictional members. dna = their Music DNA genres, used for the avatar ring. */
  members: {
    'petra.zvuk': { who: 'Petra', dna: ['Jazz', 'Soul', 'Indie'] },
    tinkovac: { who: 'Tin', dna: ['Rock', 'Jazz', 'Funk'] },
    mia_vinyl: { who: 'Mia', dna: ['Jazz', 'Metal', 'Klasična'] },
    lukabass: { who: 'Luka', dna: ['Funk', 'Soul', 'Rap'] },
    'hana.fm': { who: 'Hana', dna: ['Soul', 'R&B', 'Folk'] },
    'sara.notes': { who: 'Sara', dna: ['Kantautorska', 'Folk', 'Indie'] },
    dino_dub: { who: 'Dino', dna: ['Drum & bass', 'Jazz', 'Rock'] },
    'ivo.ploce': { who: 'Ivo', dna: ['Rock', 'Blues'] },
    lea_loops: { who: 'Lea', dna: ['Rap', 'Jazz', 'House'] }
  },

  /* min = minutes since 00:00 UTC publication, used by the Recent sort. comments = number of comments. */
  answers: [
    { id: 'a1', who: 'Petra', handle: 'petra.zvuk', time: '08:12', min: 432, text: 'Kind of Blue. Svi ga preporučuju s razlogom: ništa ne žuri i svaka pjesma ima prostora. Ako ni to ne upali, barem si pokušao.', refs: [0], reacts: { same: 4, new: 0, good: 6 }, comments: 2 },
    { id: 'a2', who: 'Tin', handle: 'tinkovac', time: '09:30', min: 510, text: 'Ne album nego pjesma za početak: „Take Five”. Pet četvrtina zvuči kao trik, a zapravo se samo njišeš.', refs: [4], reacts: { same: 1, new: 2, good: 3 }, comments: 1 },
    { id: 'a3', who: 'Mia', handle: 'mia_vinyl', time: '07:05', min: 365, text: 'Ovo možda zvuči kao varanje, ali dala bih Kamasija Washingtona, The Epic. Ljudi koji kažu da ne vole jazz obično misle na nešto tiho u pozadini restorana, a ovo su tri sata zbora, gudača i dva bubnjara koji se natječu. Prijatelj koji je slušao samo metal pustio ga je u autu do kraja vožnje, pa još jednom. Nije postao ljubitelj jazza preko noći, ali je prestao govoriti da ga ne podnosi, i to mi je dovoljno.', refs: [3], reacts: { same: 2, new: 5, good: 4 }, comments: 3 },
    { id: 'a4', who: 'Luka', handle: 'lukabass', time: '10:02', min: 542, text: 'Herbie Hancock, Head Hunters. Funk je ulaz.', refs: [2], reacts: { same: 3, new: 1, good: 2 }, comments: 0 },
    { id: 'a5', who: 'Hana', handle: 'hana.fm', time: '06:48', min: 348, lang: 'en', text: "Nina Simone, Little Girl Blue. It's jazz that doesn't ask for permission.", refs: [5], reacts: { same: 0, new: 1, good: 2 }, comments: 0 },
    { id: 'a6', who: 'Sara', handle: 'sara.notes', time: '10:40', min: 580, text: 'Ništa im ne bih dala. Pustila bih ih da sami naiđu na nešto, tako je bilo i meni.', refs: [], reacts: { same: 2, new: 0, good: 0 }, comments: 0 },
    { id: 'a7', who: 'Dino', handle: 'dino_dub', time: '05:15', min: 255, text: "Esperanza Spalding, Emily's D+Evolution. Više je rock nego što ljudi očekuju.", refs: [7], reacts: { same: 0, new: 3, good: 1 }, comments: 0 }
  ],

  /* Shown through the "new answers" button, never inserted automatically (WCAG 2.2.2). */
  laterAnswers: [
    { id: 'a8', who: 'Ivo', handle: 'ivo.ploce', time: '11:21', min: 621, text: 'A Love Supreme. Ako ne upali, barem ćeš znati zašto.', refs: [6], reacts: { same: 0, new: 0, good: 0 }, comments: 0 },
    { id: 'a9', who: 'Lea', handle: 'lea_loops', time: '11:24', min: 624, text: 'Robert Glasper, Black Radio. Ljudi koji slušaju hip-hop prihvate ga odmah.', refs: [8], reacts: { same: 0, new: 0, good: 0 }, comments: 0 }
  ],

  comments: {
    a1: [
      { who: 'Luka', handle: 'lukabass', time: '08:40', text: 'Slažem se. „Blue in Green” mi je bio ulaz.' },
      { who: 'Hana', handle: 'hana.fm', time: '09:02', lang: 'en', text: 'The safe pick, but it works every time.' }
    ],
    a2: [
      { who: 'Mia', handle: 'mia_vinyl', time: '09:45', text: 'Njihanje je najbolji argument.' }
    ],
    a3: [
      { who: 'Dino', handle: 'dino_dub', time: '07:30', text: 'Tri sata za početnika je hrabro, ali vjerujem ti.' },
      { who: 'Petra', handle: 'petra.zvuk', time: '08:20', text: 'Priča s metalcem u autu je savršena.' },
      { who: 'Tin', handle: 'tinkovac', time: '09:10', text: 'Probat ću s bratom ovaj vikend.' }
    ]
  }
};
