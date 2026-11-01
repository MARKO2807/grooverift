/* GrooveRift refined prototype (step 3.5, direction C): placeholder data.
   PLACEHOLDER: every member, answer, comment, email and question below is fictional.
   Artist, album and track names stand in for catalog references (MusicBrainz, CC0). No artwork is stored
   here (D-017). In live mode (?live=1) artist search queries MusicBrainz and shows free-licence photos
   from Wikimedia Commons with credit; see catalog.js. Reactions are placeholders until OQ-13. Nothing is stored. */
window.GR_DATA = {
  email: 'netko@primjer.hr',
  takenUsernames: ['ana', 'marko', 'tin', 'petra', 'luka', 'mia', 'admin', 'grooverift', 'moderator', 'podrska', 'support'],

  /* Genre picker: about 20 widely known genres first, the rest through search.
     Traits drive the Music DNA visual (dna.js) and are design placeholders, not research:
     f family (0 heavy, 1 rock, 2 pop, 3 urban, 4 electronic, 5 groove, 6 roots and classical),
     e energy, t tempo, j edge (smooth → jagged), s swing (straight → loose), w hue (0 Coral → 1 Amber),
     k wave form for the "Signal" variant. */
  genres: [
    { n: 'Rock', f: 1, e: .75, t: .6, j: .55, s: .2, w: .18, k: 'drive' },
    { n: 'Pop', f: 2, e: .6, t: .6, j: .12, s: .2, w: .55, k: 'sine' },
    { n: 'Rap', f: 3, e: .72, t: .5, j: .45, s: .7, w: .32, k: 'burst' },
    { n: 'Trap', f: 3, e: .78, t: .35, j: .6, s: .62, w: .28, k: 'burst' },
    { n: 'Metal', f: 0, e: 1, t: .85, j: 1, s: .08, w: 0, k: 'saw' },
    { n: 'Nu metal', f: 0, e: .95, t: .6, j: .85, s: .35, w: .05, k: 'saw' },
    { n: 'Punk', f: 0, e: .95, t: .95, j: .8, s: .1, w: .08, k: 'saw' },
    { n: 'Grunge', f: 0, e: .8, t: .5, j: .7, s: .22, w: .1, k: 'drive' },
    { n: 'Indie', f: 1, e: .5, t: .55, j: .35, s: .3, w: .3, k: 'drive' },
    { n: 'Alternativa', f: 1, e: .6, t: .55, j: .45, s: .3, w: .22, k: 'drive' },
    { n: 'Elektronika', f: 4, e: .62, t: .62, j: .35, s: .25, w: .48, k: 'square' },
    { n: 'Techno', f: 4, e: .82, t: .78, j: .42, s: .04, w: .42, k: 'square' },
    { n: 'House', f: 4, e: .72, t: .66, j: .25, s: .3, w: .5, k: 'square' },
    { n: 'Drum & bass', f: 4, e: .9, t: 1, j: .6, s: .4, w: .4, k: 'burst' },
    { n: 'R&B', f: 3, e: .45, t: .4, j: .1, s: .6, w: .62, k: 'sine' },
    { n: 'Soul', f: 5, e: .5, t: .4, j: .1, s: .62, w: .78, k: 'sine' },
    { n: 'Funk', f: 5, e: .75, t: .55, j: .3, s: .9, w: .7, k: 'swing' },
    { n: 'Disco', f: 2, e: .72, t: .66, j: .2, s: .5, w: .6, k: 'square' },
    { n: 'Jazz', f: 5, e: .45, t: .5, j: .2, s: 1, w: .85, k: 'swing' },
    { n: 'Blues', f: 5, e: .45, t: .35, j: .3, s: .75, w: .8, k: 'swing' },
    { n: 'Reggae', f: 6, e: .45, t: .35, j: .15, s: .8, w: .72, k: 'swing' },
    { n: 'Folk', f: 6, e: .3, t: .4, j: .15, s: .35, w: .92, k: 'swell' },
    { n: 'Kantautorska', f: 6, e: .25, t: .3, j: .1, s: .4, w: .95, k: 'swell' },
    { n: 'Klasična', f: 6, e: .4, t: .3, j: .05, s: .5, w: 1, k: 'swell' }
  ],
  /* More genres through search. Each borrows the traits of a close main genre (p). */
  moreGenres: [
    ['Hip-hop', 'Rap'], ['Hard rock', 'Rock'], ['Heavy metal', 'Metal'], ['Death metal', 'Metal'], ['Black metal', 'Metal'], ['Metalcore', 'Nu metal'],
    ['Hardcore punk', 'Punk'], ['Post-punk', 'Punk'], ['Emo', 'Alternativa'], ['Shoegaze', 'Indie'], ['Psihodelični rock', 'Rock'], ['Progresivni rock', 'Rock'],
    ['New wave', 'Alternativa'], ['Synth-pop', 'Pop'], ['K-pop', 'Pop'], ['Zabavna', 'Pop'], ['Grime', 'Rap'], ['Drill', 'Trap'], ['Dancehall', 'Reggae'],
    ['Ska', 'Reggae'], ['Ambient', 'Elektronika'], ['Trance', 'Techno'], ['Dubstep', 'Drum & bass'], ['Electro', 'Elektronika'], ['Breakbeat', 'Drum & bass'],
    ['UK garage', 'House'], ['Lo-fi', 'Elektronika'], ['Gospel', 'Soul'], ['Swing', 'Jazz'], ['Bebop', 'Jazz'], ['Fusion', 'Jazz'], ['Afrobeat', 'Funk'],
    ['Latino', 'Reggae'], ['Bossa nova', 'Jazz'], ['Flamenco', 'Folk'], ['Country', 'Folk'], ['Klapa', 'Kantautorska'], ['Tamburica', 'Folk'],
    ['Etno', 'Folk'], ['Šansona', 'Kantautorska'], ['Opera', 'Klasična'], ['Filmska glazba', 'Klasična']
  ],
  genreMin: 2,
  genreMax: 10,
  artistMax: 10,

  /* Offline artist catalog stand-in (real names, as MusicBrainz would return them). g = main genres. */
  artists: [
    ['Metallica', 'Grupa · SAD', ['Metal']], ['Slipknot', 'Grupa · SAD', ['Nu metal', 'Metal']], ['Linkin Park', 'Grupa · SAD', ['Nu metal', 'Rock']],
    ['Korn', 'Grupa · SAD', ['Nu metal']], ['System of a Down', 'Grupa · SAD', ['Nu metal', 'Metal']], ['Iron Maiden', 'Grupa · Ujedinjeno Kraljevstvo', ['Metal']],
    ['Black Sabbath', 'Grupa · Ujedinjeno Kraljevstvo', ['Metal', 'Rock']], ['Rammstein', 'Grupa · Njemačka', ['Metal']], ['Nirvana', 'Grupa · SAD, grunge (1987–1994)', ['Grunge']],
    ['Nirvana', 'Grupa · Ujedinjeno Kraljevstvo, psihodelični pop (1960-e)', ['Pop', 'Rock']], ['Pearl Jam', 'Grupa · SAD', ['Grunge', 'Rock']], ['Foo Fighters', 'Grupa · SAD', ['Rock']],
    ['Ramones', 'Grupa · SAD', ['Punk']], ['The Clash', 'Grupa · Ujedinjeno Kraljevstvo', ['Punk']], ['Green Day', 'Grupa · SAD', ['Punk', 'Rock']],
    ['Queen', 'Grupa · Ujedinjeno Kraljevstvo', ['Rock']], ['Led Zeppelin', 'Grupa · Ujedinjeno Kraljevstvo', ['Rock']], ['Pink Floyd', 'Grupa · Ujedinjeno Kraljevstvo', ['Rock']],
    ['The Beatles', 'Grupa · Ujedinjeno Kraljevstvo', ['Rock', 'Pop']], ['Arctic Monkeys', 'Grupa · Ujedinjeno Kraljevstvo', ['Indie', 'Rock']], ['Radiohead', 'Grupa · Ujedinjeno Kraljevstvo', ['Alternativa']],
    ['Tame Impala', 'Grupa · Australija', ['Indie']], ['The Strokes', 'Grupa · SAD', ['Indie']], ['The Cure', 'Grupa · Ujedinjeno Kraljevstvo', ['Alternativa']],
    ['Taylor Swift', 'Solo · SAD', ['Pop']], ['Dua Lipa', 'Solo · Ujedinjeno Kraljevstvo', ['Pop', 'Disco']], ['The Weeknd', 'Solo · Kanada', ['R&B', 'Pop']],
    ['Billie Eilish', 'Solo · SAD', ['Pop', 'Alternativa']], ['Michael Jackson', 'Solo · SAD', ['Pop']], ['Kendrick Lamar', 'Solo · SAD', ['Rap']],
    ['Eminem', 'Solo · SAD', ['Rap']], ['2Pac', 'Solo · SAD', ['Rap']], ['Travis Scott', 'Solo · SAD', ['Trap']], ['Drake', 'Solo · Kanada', ['Rap', 'R&B']],
    ['Daft Punk', 'Grupa · Francuska', ['House', 'Elektronika']], ['Aphex Twin', 'Solo · Ujedinjeno Kraljevstvo', ['Elektronika']], ['Charlotte de Witte', 'Solo · Belgija', ['Techno']],
    ['Amelie Lens', 'Solo · Belgija', ['Techno']], ['Carl Cox', 'Solo · Ujedinjeno Kraljevstvo', ['Techno', 'House']], ['Fred again..', 'Solo · Ujedinjeno Kraljevstvo', ['House', 'Elektronika']],
    ['Peggy Gou', 'Solo · Južna Koreja', ['House']], ['Chase & Status', 'Grupa · Ujedinjeno Kraljevstvo', ['Drum & bass']], ['Pendulum', 'Grupa · Australija', ['Drum & bass']],
    ['Kraftwerk', 'Grupa · Njemačka', ['Elektronika']], ['Massive Attack', 'Grupa · Ujedinjeno Kraljevstvo', ['Elektronika']], ['Portishead', 'Grupa · Ujedinjeno Kraljevstvo', ['Elektronika']],
    ['Frank Ocean', 'Solo · SAD', ['R&B']], ['SZA', 'Solo · SAD', ['R&B']], ['Amy Winehouse', 'Solo · Ujedinjeno Kraljevstvo', ['Soul', 'Jazz']],
    ['Aretha Franklin', 'Solo · SAD', ['Soul']], ['Marvin Gaye', 'Solo · SAD', ['Soul']], ['James Brown', 'Solo · SAD', ['Funk', 'Soul']],
    ['Parliament', 'Grupa · SAD', ['Funk']], ['Bee Gees', 'Grupa · Ujedinjeno Kraljevstvo', ['Disco', 'Pop']], ['ABBA', 'Grupa · Švedska', ['Pop', 'Disco']],
    ['Donna Summer', 'Solo · SAD', ['Disco']], ['Miles Davis', 'Solo · SAD', ['Jazz']], ['John Coltrane', 'Solo · SAD', ['Jazz']],
    ['Nina Simone', 'Solo · SAD', ['Jazz', 'Soul']], ['Kamasi Washington', 'Solo · SAD', ['Jazz']], ['B.B. King', 'Solo · SAD', ['Blues']],
    ['Muddy Waters', 'Solo · SAD', ['Blues']], ['Bob Marley & The Wailers', 'Grupa · Jamajka', ['Reggae']], ['Bob Dylan', 'Solo · SAD', ['Folk', 'Kantautorska']],
    ['Joni Mitchell', 'Solo · Kanada', ['Folk', 'Kantautorska']], ['Leonard Cohen', 'Solo · Kanada', ['Kantautorska']], ['Björk', 'Solo · Island', ['Alternativa', 'Elektronika']],
    ['Rosalía', 'Solo · Španjolska', ['Pop']], ['Bad Bunny', 'Solo · Portoriko', ['Trap', 'Pop']], ['Johann Sebastian Bach', 'Skladatelj · Njemačka', ['Klasična']],
    ['Ludwig van Beethoven', 'Skladatelj · Njemačka', ['Klasična']], ['Wolfgang Amadeus Mozart', 'Skladatelj · Austrija', ['Klasična']],
    ['Prljavo kazalište', 'Grupa · Zagreb', ['Rock', 'Punk']], ['Parni valjak', 'Grupa · Zagreb', ['Rock']], ['Azra', 'Grupa · Zagreb', ['Rock', 'Alternativa']],
    ['Haustor', 'Grupa · Zagreb', ['Alternativa']], ['Let 3', 'Grupa · Rijeka', ['Rock', 'Alternativa']], ['Hladno pivo', 'Grupa · Zagreb', ['Punk']],
    ['KUD Idijoti', 'Grupa · Pula', ['Punk']], ['Pips, Chips & Videoclips', 'Grupa · Zagreb', ['Rock']], ['Gibonni', 'Solo · Hrvatska', ['Pop', 'Rock']],
    ['Oliver Dragojević', 'Solo · Hrvatska', ['Pop', 'Kantautorska']], ['Arsen Dedić', 'Solo · Hrvatska', ['Kantautorska']], ['Darko Rundek', 'Solo · Hrvatska', ['Kantautorska', 'Alternativa']],
    ['Elemental', 'Grupa · Hrvatska', ['Rap']], ['Edo Maajka', 'Solo · Bosna i Hercegovina', ['Rap']], ['Grše', 'Solo · Hrvatska', ['Trap', 'Rap']],
    ['Baby Lasagna', 'Solo · Hrvatska', ['Rock', 'Pop']], ['Nina Badrić', 'Solo · Hrvatska', ['Pop', 'Soul']], ['Kawasaki 3P', 'Grupa · Hrvatska', ['Rock', 'Punk']]
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

  reactions: [
    { id: 'same', label: 'Isto' },
    { id: 'new', label: 'Novo mi je' },
    { id: 'good', label: 'Dobar izbor' }
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
