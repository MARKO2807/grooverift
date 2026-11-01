/* GrooveRift step 3.5 direction prototypes: placeholder data.
   PLACEHOLDER: every member, answer, comment, email and question below is fictional.
   Artist, album and track names stand in for catalog references (MusicBrainz, CC0); no artwork is used (D-017).
   Reactions are placeholders until OQ-13 is decided. Nothing is stored. */
window.GR_DATA = {
  email: 'netko@primjer.hr',
  takenUsernames: ['ana', 'marko', 'tin', 'petra', 'luka', 'mia', 'admin', 'grooverift', 'moderator', 'podrska', 'support'],

  genres: ['Indie rock', 'Hip-hop', 'Jazz', 'Soul', 'R&B', 'Funk', 'Techno', 'House', 'Ambient', 'Elektronika', 'Pop', 'Punk', 'Metal', 'Folk', 'Kantautorska', 'Klasična'],

  artists: [
    { name: 'Arsen Dedić', meta: 'Solo · Hrvatska' },
    { name: 'Haustor', meta: 'Grupa · Zagreb' },
    { name: 'Darko Rundek', meta: 'Solo · Hrvatska' },
    { name: 'Let 3', meta: 'Grupa · Rijeka' },
    { name: 'Gibonni', meta: 'Solo · Hrvatska' },
    { name: 'Elemental', meta: 'Grupa · Hrvatska' },
    { name: 'Fleetwood Mac', meta: 'Grupa · Ujedinjeno Kraljevstvo' },
    { name: 'Kendrick Lamar', meta: 'Solo · SAD' },
    { name: 'Björk', meta: 'Solo · Island' },
    { name: 'Radiohead', meta: 'Grupa · Ujedinjeno Kraljevstvo' },
    { name: 'Daft Punk', meta: 'Grupa · Francuska' },
    { name: 'Nina Simone', meta: 'Solo · SAD' },
    { name: 'Aphex Twin', meta: 'Solo · Ujedinjeno Kraljevstvo' },
    { name: 'Rosalía', meta: 'Solo · Španjolska' },
    { name: 'Massive Attack', meta: 'Grupa · Bristol' },
    { name: 'Portishead', meta: 'Grupa · Bristol' },
    { name: 'The Cure', meta: 'Grupa · Ujedinjeno Kraljevstvo' },
    { name: 'Burial', meta: 'Solo · London' },
    { name: 'Fela Kuti', meta: 'Solo · Nigerija' },
    { name: 'Miles Davis', meta: 'Solo · SAD' },
    { name: 'Joni Mitchell', meta: 'Solo · Kanada' },
    { name: 'Frank Ocean', meta: 'Solo · SAD' },
    { name: 'Kraftwerk', meta: 'Grupa · Düsseldorf' },
    { name: 'Amy Winehouse', meta: 'Solo · London' },
    { name: 'Kamasi Washington', meta: 'Solo · SAD' },
    { name: 'Nirvana', meta: 'Grupa · SAD, grunge (1987–1994)' },
    { name: 'Nirvana', meta: 'Grupa · Ujedinjeno Kraljevstvo, psihodelični pop (1960-e)' }
  ],

  refs: [
    { type: 'Album', title: 'Kind of Blue', by: 'Miles Davis' },
    { type: 'Pjesma', title: 'Blue in Green', by: 'Miles Davis' },
    { type: 'Album', title: 'Head Hunters', by: 'Herbie Hancock' },
    { type: 'Album', title: 'The Epic', by: 'Kamasi Washington' },
    { type: 'Pjesma', title: 'Take Five', by: 'The Dave Brubeck Quartet' },
    { type: 'Album', title: 'Little Girl Blue', by: 'Nina Simone' },
    { type: 'Album', title: 'A Love Supreme', by: 'John Coltrane' },
    { type: 'Album', title: "Emily's D+Evolution", by: 'Esperanza Spalding' },
    { type: 'Album', title: 'Black Radio', by: 'Robert Glasper Experiment' },
    { type: 'Album', title: 'Mezzanine', by: 'Massive Attack' }
  ],

  drop: {
    eyebrowDate: '1. studenoga',
    longDate: 'Nedjelja, 1. studenoga 2026.',
    question: 'Koji album bi dao nekome tko misli da ne voli jazz?'
  },

  pastDrops: [
    { date: '31. listopada', q: 'Koja pjesma je najbolje otvaranje albuma?' },
    { date: '30. listopada', q: 'Koji koncert pamtiš do danas?' },
    { date: '29. listopada', q: 'Koju pjesmu najčešće šalješ prijateljima?' }
  ],

  reactions: [
    { id: 'same', label: 'Isto' },
    { id: 'new', label: 'Novo mi je' },
    { id: 'good', label: 'Dobar izbor' }
  ],

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
