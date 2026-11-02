/* GrooveRift prototype: the MusicBrainz genre list for "Traži žanr" (D-062).
   Source: MusicBrainz, https://musicbrainz.org/ws/2/genre/all (JSON, paged), fetched 2026-11-02. Licence: CC0.
   2220 genres; 42 are left out: the same as a genre with its own traits in data.js, or not music (speech, ASMR).
   Each line is "Name|Parent|Rank". The parent is a genre in data.js and gives the colour and the Music DNA behaviour.
   Rank is the number of Wikipedia articles about the genre (Wikidata sitelinks, CC0): search shows better-known genres first.
   Hierarchy: Wikidata "subclass of" (CC0) between genres with a MusicBrainz ID. Parents come from tools/build-genres.mjs:
   exceptions 105, keyword rules 1079, Wikidata ancestors 351, folk keywords 61; 582 genres
   that matched nothing default to Folk (mostly regional and traditional styles). A design placeholder, not research.
   Generated file: do not edit by hand. */
window.GR_MB_GENRES = `
2 tone|Reggae|21
2-step|House|13
3-step|House|0
Aak|Folk|13
Abhang|Klasična|18
Aboio|Folk|2
Abstract hip hop|Rap|3
Acholitronix|Elektronika|0
Acid breaks|Drum & bass|4
Acid house|House|31
Acid jazz|Jazz|38
Acid rock|Rock|32
Acid techno|Techno|14
Acid trance|Techno|11
Acidcore|Elektronika|3
Acousmatic|Elektronika|13
Acoustic blues|Blues|0
Acoustic chicago blues|Blues|0
Acoustic rock|Rock|0
Acoustic texas blues|Blues|0
Adhan|Folk|0
Adhunik geet|Folk|3
Afoxê|Folk|6
African blues|Blues|5
Afro house|House|7
Afro rock|Rock|7
Afro trap|Trap|6
Afro-cuban jazz|Jazz|10
Afro-funk|Funk|0
Afro-jazz|Jazz|3
Afro-zouk|Latino|1
Afrobeat|Funk|34
Afrobeats|Pop|20
Afropiano|Klasična|0
Afroswing|Rap|4
Agbadza|Folk|11
Agbekor|Folk|2
Aggrotech|Elektronika|13
Agronejo|Latino|0
Ahwash|Folk|7
Aita|Folk|5
Akishibu-kei|Pop|4
Al jeel|Folk|4
Aleke|Folk|1
Algerian chaabi|Folk|10
Algorave|Elektronika|6
Alloukou|Folk|1
Alpenrock|Rock|2
Alté|Pop|2
Alternative country|Country|20
Alternative dance|Alternativa|20
Alternative folk|Alternativa|1
Alternative hip hop|Rap|31
Alternative metal|Metal|55
Alternative pop|Alternativa|8
Alternative punk|Punk|0
Alternative R&B|R&B|18
Amapiano|House|17
Ambasse bey|Folk|13
Ambient|Elektronika|54
Ambient americana|Country|0
Ambient dub|Reggae|4
Ambient house|House|16
Ambient noise wall|Techno|1
Ambient plugg|Trap|1
Ambient pop|Pop|4
Ambient techno|Techno|8
Ambient trance|Techno|3
Ambrosian chant|Klasična|18
American gamelan|Klasična|1
American primitive guitar|Folk|2
Americana|Country|23
Amigacore|Elektronika|0
Anarcho-punk|Punk|31
Anatolian rock|Rock|21
Andalusian classical|Klasična|13
Andean new age|Latino|1
Anglican chant|Klasična|2
Anti-folk|Folk|17
AOR|Rock|0
Apala|Folk|9
Appalachian folk|Folk|1
Aquacrunk|Trap|0
Arabesk|Folk|16
Arabesk rap|Rap|0
Arena rock|Rock|30
Arrocha|Folk|5
Arrocha funk|Funk|1
Arrocha sertanejo|Latino|0
Arrochadeira|Folk|4
Ars antiqua|Folk|32
Ars nova|Folk|38
Ars subtilior|Folk|21
Art pop|Alternativa|17
Art punk|Punk|19
Art rock|Alternativa|51
Art song|Klasična|11
Artcore|Elektronika|2
Ashkenazi cantorial music|Folk|0
Asian rock|Rock|0
Assiko|Folk|7
Atmospheric black metal|Metal|1
Atmospheric drum and bass|Drum & bass|3
Atmospheric sludge metal|Metal|0
Autonomic|Drum & bass|0
Avant-folk|Folk|0
Avant-garde|Klasična|23
Avant-garde jazz|Jazz|25
Avant-garde metal|Metal|39
Avant-garde pop|Klasična|10
Avant-prog|Rock|5
Avanzada|Folk|1
Avtorskaya pesnya|Kantautorska|9
Axé|Latino|18
Bacardi|House|0
Bachata|Latino|39
Bachatón|Latino|1
Bagad|Folk|10
Bagatelle|Klasična|28
Baguala|Folk|2
Baião|Folk|12
Baila|Folk|3
Baisha xiyue|Folk|2
Baithak gana|Folk|6
Bakersfield sound|Country|10
Balani show|Elektronika|1
Balearic beat|Elektronika|15
Balearic trance|Techno|7
Balinese gamelan|Klasična|3
Balitaw|Folk|0
Ballad|Folk|1
Ballad opera|Klasična|21
Ballet|Klasična|9
Ballet de cour|Klasična|0
Ballroom house|House|0
Baltimore club|House|6
Bambuco|Latino|17
Banda sinaloense|Latino|9
Bandari|Latino|7
Bandinha|Folk|0
Banga|Folk|0
Bantengan|Folk|2
Baqashot|Folk|3
Barber beats|Elektronika|1
Barbershop|Folk|18
Bard rock|Rock|1
Bardcore|Kantautorska|13
Baroque|Klasična|69
Baroque pop|Klasična|33
Baroque suite|Klasična|1
Bashment soca|Reggae|0
Bass house|House|6
Bassline|House|11
Batida|Elektronika|0
Batidão romântico|Elektronika|3
Batonebi songs|Folk|0
Battle rap|Rap|25
Battle record|Folk|1
Batucada|Latino|14
Batuque|Folk|9
Baul gaan|Folk|2
Beach music|R&B|1
Beat bolha|Elektronika|0
Beat bruxaria|Elektronika|1
Beat fino|Elektronika|0
Beat music|Rock|35
Beat poetry|Folk|0
Beat rock|Rock|1
Beatboxing|Folk|54
Beatdown hardcore|Punk|12
Bebop|Jazz|55
Bedoui wahrani|Folk|2
Bedroom pop|Indie|3
Beijing opera|Klasična|57
Bélé|Folk|5
Belgian techno|Techno|3
Bend-skin|Folk|4
Beneventan chant|Klasična|9
Benga|Folk|6
Beni|Folk|3
Benna|Folk|2
Beompae|Folk|3
Bérite club|Folk|0
Berlin school|Elektronika|12
Bhajan|Folk|37
Bhangra|Folk|28
Bhavageethe|Folk|3
Bhojpuri pop|Pop|0
Big band|Jazz|0
Big beat|Elektronika|23
Big room house|House|15
Big room trance|Techno|0
Biguine|Folk|3
Bikutsi|Folk|12
Binaural beats|Elektronika|18
Biraha|Folk|5
Birdsong|Folk|0
Birmingham sound|Techno|3
Bit music|Elektronika|0
Bitpop|Pop|13
Black 'n' roll|Metal|1
Black ambient|Elektronika|2
Black metal|Metal|71
Black midi|Folk|12
Black noise|Techno|0
Blackened crust|Punk|1
Blackened death metal|Metal|17
Blackgaze|Metal|22
Bleep techno|Techno|3
Blue-eyed soul|Soul|26
Bluegrass|Country|42
Bluegrass gospel|Soul|0
Blues rock|Rock|56
Bocet|Folk|2
Boduberu|Folk|4
Boedra|Folk|5
Bogino duu|Folk|3
Bolero|Latino|26
Bolero español|Latino|31
Bolero son|Latino|1
Bolero-beat|Latino|0
Bomba|Latino|8
Bomba del chota|Latino|3
Bongo flava|Rap|12
Boogaloo|Latino|14
Boogie|Funk|13
Boogie rock|Funk|16
Boogie-woogie|Blues|37
Boom bap|Rap|17
Bossa nova|Latino|63
Bounce|Rap|8
Bounce beat|Rap|0
Bouncy techno|Techno|5
Bouyon|Folk|2
Boyfriend country|Country|0
Bozlak|Folk|0
Brass band|Folk|0
Brazilian bass|Latino|4
Brazilian phonk|Trap|3
Break-in|Folk|1
Breakbeat|Drum & bass|34
Breakbeat hardcore|Punk|15
Breakbeat kota|Drum & bass|0
Breakcore|Drum & bass|25
Breaks|Drum & bass|0
Breakstep|House|7
Brega|Folk|10
Brega calypso|Reggae|4
Brega funk|Funk|4
Briddim|Drum & bass|0
Brill building|Pop|2
Brit funk|Funk|3
Britcore|Rap|2
British blues|Blues|17
British brass band|Folk|0
British folk rock|Rock|6
British rhythm & blues|R&B|5
Britpop|Indie|47
Bro-country|Country|7
Broadband noise|Techno|0
Broken beat|Elektronika|8
Broken transmission|Folk|0
Brostep|Drum & bass|8
Brutal death metal|Metal|17
Brutal prog|Rock|1
Bubblegum bass|Pop|1
Bubblegum dance|Pop|8
Bubblegum pop|Pop|34
Bubbling|Elektronika|2
Bubbling house|House|0
Buchiage trance|Techno|0
Budget rock|Rock|0
Budots|Elektronika|4
Bulería|Folk|12
Bullerengue|Latino|3
Burger-highlife|Folk|5
Burmese classical|Klasična|0
Burmese mono|Folk|0
Burmese stereo|Pop|0
Burning spirits|Punk|0
Burrakatha|Folk|8
Bytebeat|Elektronika|0
Byzantine chant|Klasična|0
C-pop|Pop|23
C86|Indie|1
Ca trù|Folk|12
Cabaret|Filmska glazba|0
Cabo zouk|Latino|1
Cachaca|Folk|0
Cadence lypso|Folk|3
Cadence rampa|Folk|6
Cải lương|Folk|9
Cajun|Country|14
Cakewalk|Jazz|20
Čalgija|Folk|4
Calipso venezolano|Folk|0
Calypso|Reggae|38
Campursari|Folk|8
Campus folk|Folk|7
Canción melódica|Kantautorska|3
Candombe|Latino|24
Candombe beat|Rock|1
Cantata|Klasična|67
Cante alentejano|Latino|14
Canterbury scene|Rock|27
Canto a lo poeta|Folk|1
Canto cardenche|Folk|2
Canto degli alpini|Folk|2
Cantonese opera|Klasična|18
Cantopop|Pop|26
Cantoria|Folk|2
Cantu a chiterra|Folk|5
Cantu a tenore|Folk|14
Canzona|Klasična|19
Canzone d'autore|Kantautorska|0
Canzone napoletana|Folk|24
Canzone neomelodica|Pop|2
Cape breton fiddling|Folk|2
Cape jazz|Jazz|7
Caporal|Folk|0
Capriccio|Klasična|29
Carimbó|Folk|10
Carnatic classical|Klasična|32
Carnavalito|Latino|8
Carranga|Folk|1
Celtic|Folk|40
Celtic chant|Klasična|3
Celtic electronica|Elektronika|0
Celtic metal|Metal|14
Celtic new age|Elektronika|0
Celtic punk|Punk|25
Celtic rock|Rock|18
Central asian throat singing|Folk|0
Chacarera|Folk|18
Chachachá|Folk|8
Chakacha|Folk|0
Chalga|Folk|22
Chamamé|Latino|21
Chamamé tropical|Latino|0
Chamarrita açoriana|Folk|0
Chamarrita rioplatense|Folk|0
Chamber folk|Klasična|0
Chamber pop|Indie|10
Champeta|Latino|7
Changa tuki|House|3
Change ringing|Folk|7
Changjak gugak|Folk|0
Changüí|Folk|8
Chanson à texte|Kantautorska|1
Chanson française|Kantautorska|51
Chanson québécoise|Kantautorska|2
Chanson réaliste|Kantautorska|5
Chaozhou xianshi|Folk|3
Chap hop|Rap|1
Character piece|Klasična|12
Charanga|Folk|0
Chazzanut|Folk|0
Chèo|Folk|7
Chicago blues|Blues|27
Chicago bop|Jazz|0
Chicago drill|Trap|1
Chicago house|House|20
Chicago polka|Folk|0
Chicago soul|Soul|6
Chicano rap|Rap|11
Chicha|Latino|3
Children's music|Folk|19
Chilena|Latino|4
Chillout|Elektronika|29
Chillstep|Elektronika|5
Chillsynth|Elektronika|0
Chillwave|Indie|22
Chimayche|Folk|1
Chimurenga|Folk|8
Chinese classical|Klasična|1
Chinese literati music|Folk|0
Chinese opera|Klasična|35
Chinese revolutionary opera|Klasična|7
Chipmunk soul|Soul|5
Chiptune|Elektronika|30
Chöd|Folk|0
Chopped and screwed|Rap|11
Chopper|Rap|4
Choral symphony|Klasična|15
Choro|Latino|20
Chotis madrileño|Folk|0
Christian hardcore|Punk|10
Christian hip hop|Rap|13
Christian metal|Metal|37
Christian rock|Rock|36
Christmas music|Folk|28
Church music|Folk|31
Chuscada|Folk|1
Chutney|Folk|10
Chutney soca|Reggae|3
Cilokaq|Folk|0
Cinematic classical|Filmska glazba|0
Ciranda|Folk|6
Circus march|Folk|1
City pop|Pop|27
Classic blues|Blues|13
Classic country|Country|1
Classic jazz|Jazz|25
Classic ragtime|Jazz|2
Classic rock|Rock|6
Classical crossover|Klasična|10
Classical period|Klasična|47
Close harmony|Country|0
Cloud rap|Trap|17
Club|Folk|17
Cocktail nation|Folk|0
Coco|Folk|4
Coke rap|Rap|0
Coladeira|Folk|9
Coldwave|Alternativa|14
Colindă|Folk|12
Colour bass|Elektronika|1
Comédie-ballet|Klasična|12
Comedy hip hop|Rap|14
Comedy rock|Rock|16
Comfy synth|Elektronika|0
Compas|Latino|15
Complextro|House|5
Concert band|Folk|1
Concert spiritual|Soul|0
Concertina band|Folk|0
Concerto|Klasična|50
Concerto for orchestra|Klasična|8
Concerto grosso|Klasična|45
Conducted improvisation|Folk|1
Conga|Folk|6
Congolese rumba|Latino|14
Conscious hip hop|Rap|10
Contemporary christian|Pop|19
Contemporary classical|Klasična|29
Contemporary country|Country|0
Contemporary folk|Folk|31
Contemporary gospel|Soul|5
Contemporary jazz|Jazz|1
Contemporary R&B|R&B|48
Contenance angloise|Klasična|3
Contra|Folk|1
Cool jazz|Jazz|36
Coon song|Folk|6
Copla|Folk|14
Copla cajamarquina|Latino|0
Corrido|Latino|15
Corrido tumbado|Latino|4
Cosmic country|Country|0
Country and irish|Country|2
Country blues|Country|26
Country boogie|Funk|2
Country folk|Country|6
Country gospel|Soul|5
Country pop|Country|25
Country rap|Rap|14
Country rock|Rock|44
Country soul|Soul|3
Country yodeling|Country|1
Countrypolitan|Country|1
Coupé-décalé|Elektronika|9
Cowboy poetry|Country|2
Cowpunk|Punk|15
Crack rock steady|Rock|1
Crime jazz|Jazz|0
Crossbreed|Drum & bass|2
Crossover jazz|Jazz|5
Crossover prog|Rock|0
Crossover thrash|Metal|27
Cruise|Elektronika|0
Crunk|Trap|28
Crunkcore|Trap|13
Crust punk|Punk|35
Csárdás|Folk|1
Cuarteto|Folk|8
Cubatón|Latino|0
Cuddlecore|Indie|1
Cueca|Latino|16
Cueca brava|Latino|1
Cumbia|Latino|34
Cumbia amazónica|Latino|1
Cumbia argentina|Latino|4
Cumbia chilena|Latino|2
Cumbia colombiana|Latino|0
Cumbia mexicana|Latino|3
Cumbia norteña mexicana|Latino|2
Cumbia norteña peruana|Latino|0
Cumbia peruana|Latino|5
Cumbia pop|Latino|2
Cumbia rebajada|Latino|3
Cumbia salvadoreña|Latino|2
Cumbia sanjuanera|Latino|0
Cumbia santafesina|Latino|2
Cumbia sonidera|Latino|0
Cumbia sureña peruana|Latino|0
Cumbia tejana|Latino|0
Cumbia turra|Latino|0
Cumbia villera|Latino|8
Cumbiatón|Latino|0
Cuplé|Folk|6
Currulao|Folk|2
Cururu|Folk|3
Cut-up noise|Techno|0
Cyber metal|Metal|5
Cybergrind|Punk|5
Cyberpunk|Punk|0
D-beat|Punk|20
Dabke|Folk|30
Dance|Elektronika|17
Dance-pop|Pop|41
Dance-punk|Punk|25
Dance-punk revival|Punk|0
Dance-rock|Rock|19
Dancefloor drum and bass|Drum & bass|0
Dancehall|Reggae|41
Dangak|Folk|5
Dangdut|Folk|26
Danmono|Folk|1
Dansband|Pop|2
Dansktop|Pop|1
Danzón|Latino|17
Dariacore|Elektronika|3
Dark ambient|Elektronika|29
Dark cabaret|Alternativa|14
Dark disco|Disco|0
Dark electro|Elektronika|6
Dark folk|Folk|1
Dark garage|House|0
Dark jazz|Jazz|3
Dark plugg|Trap|0
Dark psytrance|Techno|10
Dark wave|Alternativa|34
Darkcore|Drum & bass|10
Darkcore EDM|Elektronika|1
Darkstep|Drum & bass|14
Darksynth|Elektronika|3
Data sonification|Folk|0
Death 'n' roll|Metal|22
Death industrial|Techno|3
Death metal|Metal|65
Death-doom metal|Metal|28
Deathchant hardcore|Punk|0
Deathcore|Metal|40
Deathgrind|Punk|17
Deathrock|Alternativa|25
Deathstep|Drum & bass|0
Dechovka|Folk|0
Deconstructed club|Folk|3
Deejay|Reggae|3
Deep drum and bass|Drum & bass|0
Deep funk|Funk|5
Deep house|House|32
Deep soul|Soul|2
Deep tech|House|0
Deep techno|Techno|0
Delta blues|Blues|30
Dembow|Latino|5
Demostyle|Folk|0
Dennery segment|Folk|0
Denpa|Folk|11
Depressive black metal|Metal|15
Descarga|Folk|1
Desert blues|Blues|6
Desert rock|Rock|9
Desgarrada|Folk|4
Detroit techno|Techno|20
Detroit trap|Trap|0
Dhaanto|Folk|5
Dhol tasha|Folk|0
Dhrupad|Klasična|17
Digicore|Rap|3
Digital cumbia|Latino|1
Digital fusion|Elektronika|0
Digital hardcore|Punk|16
Dikir barat|Folk|3
Dimotiko|Folk|0
Dirty south|Rap|4
Disco polo|Disco|21
Dissonant black metal|Metal|0
Dissonant death metal|Metal|0
Diva house|House|9
Divertissement|Klasična|7
Dixieland|Jazz|39
Djanba|Folk|0
Djent|Metal|30
Doble paso|Latino|0
Dobrado|Folk|1
Dohori|Folk|5
Doina|Folk|30
Dondang sayang|Folk|13
Dongjing|Folk|1
Dongzu dage|Folk|0
Donk|House|0
Donosti sound|Indie|2
Doo-wop|Soul|38
Doom metal|Metal|55
Doomcore|Elektronika|4
Doomgaze|Metal|0
Doskpop|Pop|0
Downtempo|Elektronika|30
Downtempo deathcore|Metal|1
Dream pop|Indie|33
Dream trance|Techno|16
Dreampunk|Punk|5
Dreamwave|Elektronika|0
Drift phonk|Trap|3
Drill|Trap|25
Drill and bass|Trap|13
Drinking song|Folk|22
Drone|Elektronika|19
Drone metal|Metal|29
Drum and bugle corps|Folk|0
Drumfunk|Funk|9
Drumless hip hop|Rap|0
Drumline|Folk|5
Drumstep|Drum & bass|2
Dub|Reggae|40
Dub poetry|Reggae|9
Dub techno|Techno|9
Dubstep|Drum & bass|50
Dubstyle|Folk|2
Dubwise|Drum & bass|1
Duma|Folk|20
Dunedin sound|Indie|7
Dungeon chip|Elektronika|0
Dungeon rap|Rap|0
Dungeon sound|Drum & bass|0
Dungeon synth|Elektronika|13
Duranguense|Latino|5
Dutch house|House|8
Dutch trancecore|Techno|0
Eai|Elektronika|3
Early hardstyle|Techno|1
East coast hip hop|Rap|28
Eastern-style polka|Folk|0
Easy listening|Folk|36
Easycore|Pop|4
EBM|Techno|33
Eccojams|Folk|0
EDM|Elektronika|54
Electric blues|Blues|22
Electric texas blues|Blues|0
Electro|Elektronika|35
Electro hop|Elektronika|9
Electro house|House|29
Electro latino|Latino|1
Electro swing|Jazz|19
Electro trance|Techno|1
Electro-disco|Disco|2
Electro-funk|Funk|3
Electro-industrial|Techno|18
Electroacoustic|Elektronika|30
Electroclash|Elektronika|26
Electronic rock|Rock|37
Electronica|Elektronika|36
Electronicore|Elektronika|19
Electropop|Pop|36
Electropunk|Punk|16
Electrotango|Latino|7
Eleki|Rock|0
Eletrofunk|Funk|0
Embolada|Folk|5
Emo|Punk|61
Emo pop|Punk|8
Emo rap|Rap|22
Emocore|Punk|1
Emoviolence|Punk|2
English pastoral school|Klasična|1
Enka|Pop|30
Éntekhno|Folk|4
Epic collage|Elektronika|1
Epic doom metal|Metal|5
Epic house|House|0
Estrada|Pop|4
Ethereal wave|Alternativa|17
Ethio-jazz|Jazz|5
Étude|Klasična|45
Euphoric hardstyle|Techno|0
Euro house|House|4
Euro-disco|Disco|28
Euro-trance|Techno|14
Eurobeat|Elektronika|27
Eurodance|Elektronika|47
Europop|Pop|26
Euskal kantagintza berria|Kantautorska|3
Exotica|Folk|12
Experimental|Folk|36
Experimental big band|Jazz|0
Experimental electronic|Elektronika|0
Experimental hip hop|Rap|5
Experimental rock|Alternativa|37
Expressionism|Klasična|27
Extratone|Elektronika|4
Fado|Folk|56
Fado de coimbra|Folk|3
Fahrtenlied|Folk|0
Fairy tale|Folk|0
Fakaseasea|Folk|2
Falak|Folk|12
Famo|Folk|4
Fandango|Folk|30
Fandango caiçara|Folk|0
Fantasia|Klasična|34
Fantezi|Folk|3
Festejo|Latino|4
Festival progressive house|House|0
Festival trap|Trap|1
Fidget house|House|5
Fife and drum|Folk|4
Fife and drum blues|Blues|6
Fijiri|Folk|8
Filin|Latino|3
Filipino rondalla|Folk|0
Filk|Folk|13
Filmi|Filmska glazba|0
Finnish tango|Latino|10
Flamenco|Folk|112
Flamenco jazz|Jazz|4
Flamenco pop|Pop|0
Flashcore|Elektronika|0
Flex dance music|Elektronika|0
Florida breaks|Drum & bass|4
Fm synthesis|Elektronika|0
Folk metal|Metal|51
Folk pop|Pop|20
Folk punk|Punk|26
Folk rock|Rock|58
Folkhop|Folk|1
Folktronica|Elektronika|23
Fon leb|Klasična|1
Football chant|Klasična|15
Footwork|Drum & bass|9
Footwork jungle|Drum & bass|0
Forest psytrance|Techno|0
Forró|Latino|22
Forró de favela|Latino|0
Forró eletrônico|Latino|2
Forró universitário|Latino|1
Frapcore|Elektronika|0
Frat rap|Rap|2
Frat rock|Rock|3
Freak folk|Folk|7
Freakbeat|Rock|8
Free car music|Rap|0
Free folk|Folk|1
Free funk|Funk|8
Free improvisation|Folk|16
Free jazz|Jazz|43
Free tekno|Techno|6
Freeform hardcore|Punk|7
Freestyle|Disco|14
French electro|Elektronika|0
French house|House|28
Frenchcore|Techno|14
Frenchtek|Techno|0
Frevo|Folk|24
Frevo de bloco|Folk|1
Frevo de rua|Folk|0
Frevo elétrico|Latino|0
Frevo-canção|Folk|1
Fugue|Klasična|62
Fuji|Folk|7
Full-on|Techno|2
Funaná|Folk|8
Funeral doom metal|Metal|11
Funeral march|Folk|21
Fungi|Folk|1
Funk automotivo|Funk|0
Funk brasileiro|Funk|2
Funk carioca|Latino|17
Funk consciente|Funk|0
Funk de bh|Funk|0
Funk mandelão|Funk|1
Funk melody|Funk|6
Funk metal|Nu metal|38
Funk ostentação|Funk|6
Funk proibidão|Funk|5
Funk rock|Funk|32
Funknejo|Funk|2
Funkot|Funk|4
Funktronica|Funk|6
Funky breaks|Drum & bass|0
Funky house|House|16
Fusion gugak|Folk|0
Future bass|Drum & bass|19
Future bounce|Rap|1
Future core|Elektronika|0
Future funk|Funk|4
Future garage|House|7
Future house|House|15
Future rave|Elektronika|4
Future riddim|Drum & bass|0
Futurepop|Pop|22
Futurism|Klasična|6
G-funk|Rap|27
G-house|House|0
Gaana|Folk|3
Gabber|Techno|25
Gaelic psalm singing|Folk|3
Gagaku|Klasična|34
Gagok|Folk|16
Gaita zuliana|Folk|6
Gallican chant|Klasična|4
Gambang kromong|Folk|7
Gamelan|Klasična|59
Gamelan angklung|Klasična|3
Gamelan beleganjur|Klasična|4
Gamelan degung|Klasična|6
Gamelan gambang|Folk|0
Gamelan gender wayang|Klasična|3
Gamelan gong gede|Klasična|3
Gamelan gong kebyar|Klasična|8
Gamelan jegog|Klasična|4
Gamelan joged bumbung|Klasična|4
Gamelan salendro|Klasična|1
Gamelan sekaten|Klasična|5
Gamelan selunding|Klasična|6
Gamelan semar pegulingan|Klasična|3
Gamelan siteran|Klasična|1
Gamelan surakarta|Klasična|4
Gangsta rap|Rap|36
Garage house|House|18
Garage psych|House|1
Garage punk|Punk|19
Garage rock|Rock|47
Garage rock revival|Rock|1
Garba|Folk|25
Geek rock|Rock|12
Género chico|Klasična|9
Género grande|Klasična|0
Genge|Rap|3
Gengetone|Rap|0
Għana|Folk|10
Ghazal|Folk|76
Ghetto funk|Funk|0
Ghetto house|House|8
Ghettotech|House|13
Ginan|Folk|3
Glam|Rock|0
Glam metal|Metal|49
Glam punk|Punk|19
Glam rock|Rock|54
Glitch|Elektronika|22
Glitch hop|Elektronika|8
Glitch hop EDM|Elektronika|0
Glitch pop|Pop|0
Gnawa|Folk|16
Go-go|Funk|10
Goa trance|Techno|23
Gommance|Reggae|0
Gondang|Folk|2
Goombay|Folk|3
Goregrind|Metal|23
Gorenoise|Techno|0
Gospel|Soul|59
Gospel house|House|0
Gospel hymn|Soul|2
Gospel reggae|Soul|3
Gothic|Alternativa|3
Gothic country|Country|5
Gothic metal|Metal|55
Gothic rock|Alternativa|53
Gqom|House|8
Grand opera|Klasična|30
Graphical sound|Elektronika|4
Grebo|Alternativa|9
Gregorian chant|Klasična|61
Grime|Rap|33
Grindcore|Metal|51
Griot|Folk|0
Groove metal|Metal|46
Group sounds|Pop|9
Grupera|Folk|7
Gstanzl|Folk|4
Guaguancó|Folk|9
Guajira|Latino|13
Guangdong yinyue|Folk|3
Guaracha|Latino|13
Guaracha EDM|Latino|2
Guaracha santiagueña|Latino|0
Guarania|Folk|13
Guayla|Latino|0
Gufeng|Folk|5
Guggenmusik|Folk|8
Guitarrada|Folk|2
Gumbe|Folk|6
Guoyue|Klasična|4
Gwo ka|Folk|18
Gypsy jazz|Jazz|29
Gypsy punk|Punk|18
Habanera|Latino|27
Haitian vodou drumming|Folk|1
Halftime|Drum & bass|0
Hambo|Folk|7
Hamburger schule|Indie|5
Hands up|Techno|13
Hanmai|Folk|2
Haozi|Folk|0
Hapa haole|Folk|0
Happy hardcore|Techno|26
Harana|Folk|3
Harawi|Folk|2
Hard beat|Elektronika|1
Hard bop|Jazz|31
Hard drum|Elektronika|0
Hard house|House|15
Hard nrg|Techno|3
Hard renaissance|Klasična|0
Hard rock|Rock|78
Hard techno|Techno|7
Hard trance|Techno|19
Hard trap|Trap|0
Hardbag|House|2
Hardbass|Folk|25
Hardcore breaks|Techno|2
Hardcore hip hop|Rap|26
Hardcore punk|Punk|65
Hardcore techno|Techno|36
Hardgroove techno|Techno|0
Hardstep|Drum & bass|10
Hardstyle|Techno|35
Hardtekk|Elektronika|0
Hardvapour|Elektronika|5
Hardwave|Elektronika|2
Harsh noise|Techno|5
Harsh noise wall|Techno|8
Hát tuồng|Filmska glazba|9
Hauntology|Elektronika|6
Heartland rock|Rock|24
Heaven trap|Trap|0
Heavy metal|Metal|107
Heavy psych|Rock|0
Heikyoku|Folk|2
Henan opera|Klasična|14
Hexd|Elektronika|1
Hi-nrg|Elektronika|25
Hi-tech|Techno|1
Hi-tech full-on|Techno|0
Highlife|Folk|23
Hill country blues|Country|5
Himene tarava|Folk|2
Hindustani classical|Klasična|29
Hip hop soul|Rap|15
Hip house|House|19
Hipco|Rap|2
Hiplife|Rap|7
Holy minimalism|Klasična|6
Honky tonk|Country|7
Honkyoku|Country|7
Hopepunk|Punk|0
Hornpipe|Folk|1
Horror punk|Punk|31
Horror synth|Elektronika|0
Horrorcore|Rap|25
Hot rod music|Rock|2
Houston sound|Folk|0
Huapango|Latino|9
Huaylarsh|Folk|4
Huayno|Folk|14
Huayno con arpa|Folk|0
Humppa|Pop|17
Hungarian folk|Folk|7
Hyangak|Folk|5
Hybrid trap|Trap|1
Hyper techno|Techno|0
Hyperpop|Pop|26
Hypertechno|Techno|0
Hyphy|Rap|6
Hypnagogic pop|Pop|9
ʻōteʻa|Folk|4
Iavnana|Folk|8
IDM|Elektronika|31
Idol kayō|Pop|0
Illbient|Elektronika|12
Impressionism|Klasična|0
Impromptu|Klasična|29
Indeterminacy|Folk|5
Indian classical|Klasična|45
Indian pop|Pop|9
Indie folk|Indie|30
Indie pop|Indie|47
Indie surf|Indie|1
Indietronica|Indie|17
Indo jazz|Jazz|4
Indorock|Rock|7
Industrial|Techno|42
Industrial folk song|Techno|4
Industrial hardcore|Punk|8
Industrial hip hop|Techno|7
Industrial metal|Metal|55
Industrial musical|Techno|1
Industrial rock|Alternativa|31
Industrial techno|Techno|6
Instrumental hip hop|Rap|6
Instrumental jazz|Jazz|0
Instrumental rock|Rock|24
Integral serialism|Klasična|3
Iraqi maqam|Folk|9
Irish folk|Folk|19
Isa|Folk|4
Isicathamiya|Folk|11
Islamic modal music|Klasična|0
Islamic religious music|Folk|0
Italo dance|Elektronika|18
Italo house|House|12
Italo-disco|Disco|32
Izlan|Folk|4
Izvorna bosanska muzika|Folk|1
J-core|Elektronika|10
J-euro|Elektronika|0
J-pop|Pop|69
J-rock|Rock|22
Jácara|Folk|8
Jackin house|House|1
Jaipongan|Folk|12
Jam band|Rock|1
Jamaican ska|Reggae|0
James bay fiddling|Folk|0
Jamgrass|Rock|0
Jangle pop|Indie|26
Japanese classical|Klasična|0
Javanese gamelan|Klasična|4
Jawaiian|Reggae|0
Jazz blues|Jazz|9
Jazz fusion|Jazz|46
Jazz guachaca|Jazz|0
Jazz house|House|1
Jazz mugham|Jazz|2
Jazz poetry|Jazz|8
Jazz pop|Jazz|6
Jazz rap|Rap|26
Jazz rock|Jazz|12
Jazz-funk|Funk|22
Jazzstep|Jazz|7
Jeongak|Folk|8
Jerk|Rap|1
Jerk rap|Rap|2
Jersey club|Folk|12
Jersey club rap|Rap|0
Jersey drill|Trap|0
Jersey sound|House|3
Jesus music|Folk|1
Jhumar|Folk|0
Jiangnan sizhu|Folk|5
Jibonmukhi gaan|Folk|0
Jit|Folk|6
Jiuta|Folk|6
Joik|Folk|29
Jongo|Folk|7
Joropo|Latino|16
Jōruri|Folk|14
Jota|Folk|30
Jovem guarda|Pop|4
Jubilee|Soul|0
Jug band|Blues|13
Jùjú|Folk|15
Juke|Drum & bass|0
Jump blues|Blues|20
Jump up|Drum & bass|11
Jumpstyle|Folk|28
Jungle|Drum & bass|31
Jungle dutch|Drum & bass|0
Jungle techno|Drum & bass|0
Jungle terror|Drum & bass|2
Junkanoo|Folk|1
Kabarett|Folk|9
Kacapi suling|Klasična|6
Kadodi|Folk|0
Kadongo kamu|Folk|2
Kafi|Folk|10
Kagura|Folk|25
Kai|Folk|3
Kakawin|Klasična|0
Kalattut|Folk|0
Kalindula|Folk|4
Kalon'ny fahiny|Klasična|0
Kan ha diskan|Folk|9
Kaneka|Folk|1
Kankyō ongaku|Folk|0
Kantan chamorrita|Folk|1
Kanto|Folk|2
Kantruem|Folk|5
Kapuka|Folk|3
Kaseko|Folk|9
Kasékò|Folk|2
Kawaii future bass|Drum & bass|0
Kawaii metal|Metal|20
Kayōkyoku|Pop|13
Kecak|Folk|21
Keller synth|Elektronika|0
Keroncong|Folk|18
Kete|Klasična|0
Ketuk tilu|Folk|4
Khrueang sai|Klasična|3
Khyal|Klasična|17
Kidandali|Folk|3
Kidumbak|Folk|4
Kilapanga|Folk|0
Kirtan|Folk|30
Kizomba|Latino|29
Klapa|Kantautorska|30
Klasik|Klasična|1
Kleinkunst|Kantautorska|0
Klezmer|Folk|44
Kliningan|Folk|0
Konnakol|Klasična|8
Könsrock|Rock|3
Kontakion|Folk|27
Koplo|Folk|3
Korean ballad|Pop|4
Korean classical|Klasična|8
Korean revolutionary opera|Klasična|8
Kouta|Folk|2
Krakowiak|Folk|34
Krautrock|Alternativa|43
Kréyol djaz|Jazz|1
Krushclub|Elektronika|1
Kuda lumping|Folk|12
Kuduro|Elektronika|18
Kujawiak|Folk|21
Kulintang|Klasična|5
Kumi-daiko|Folk|0
Kumiuta|Folk|0
Kundiman|Folk|4
Kunqu|Folk|38
Kwaito|House|19
Kwassa kwassa|Folk|5
Kwela|Folk|10
Kyivan chant|Klasična|4
Laiko|Folk|19
Lambada|Latino|37
Ländlermusik|Folk|1
Landó|Folk|4
Langgam jawa|Folk|5
Latin ballad|Latino|4
Latin disco|Disco|0
Latin funk|Funk|0
Latin house|House|10
Latin jazz|Jazz|23
Latin pop|Latino|36
Latin rock|Latino|21
Latin soul|Soul|3
Lauda|Folk|13
Lavani|Folk|18
Leftfield|Elektronika|0
Lento violento|Folk|10
Levenslied|Pop|6
Lied|Klasična|40
Liedermacher|Kantautorska|0
Liquid funk|Drum & bass|17
Liquid riddim|Drum & bass|0
Liscio|Folk|4
Livetronica|Rock|2
Liwa|Folk|4
Lo-fi|Elektronika|39
Lo-fi hip hop|Rap|10
Lo-fi house|House|1
Lolicore|Elektronika|3
Loner folk|Folk|0
Loud kei|Rock|0
Louisiana blues|Blues|12
Lounge|Folk|20
Lovers rock|Reggae|11
Lowend|Rap|1
Lowercase|Folk|11
Luk krung|Folk|3
Luk thung|Folk|16
Lullaby|Folk|83
Lundu|Folk|7
Lute song|Folk|4
Machine rock|Rock|0
Mad|Folk|0
Madchester|Alternativa|6
Maddahi|Folk|8
Madrigal|Klasična|57
Mafioso rap|Rap|3
Maftirim|Folk|1
Mahori|Folk|4
Mahraganat|Folk|6
Mainstream rock|Rock|3
Makina|Techno|11
Makossa|Folk|13
Malagueña venezolana|Folk|1
Malay gamelan|Klasična|5
Malhun|Folk|10
Mallsoft|Elektronika|6
Malouf|Folk|6
Maloya|Folk|21
Maloya électronique|Elektronika|0
Maloya élektrik|Folk|0
Mambo|Latino|11
Mambo chileno|Latino|0
Mambo urbano|Latino|0
Mandopop|Pop|24
Manele|Folk|20
Mangambeu|Folk|3
Mangue beat|Folk|12
Manila sound|Pop|5
Mantra|Folk|94
Manyao|Elektronika|0
Mappila|Folk|4
Marabi|Jazz|10
Maracatu|Folk|11
March|Folk|50
Marching band|Folk|0
Marchinha|Folk|6
Mariachi|Latino|42
Marinera|Folk|14
Marinera norteña|Folk|0
Marrabenta|Folk|10
Martial industrial|Techno|17
Mashcore|Elektronika|0
Maskanda|Folk|6
Mass|Klasična|44
Mataali|Folk|0
Math pop|Pop|0
Math rock|Indie|32
Mathcore|Metal|26
Maxixe|Folk|15
Mazurka|Folk|55
Mbalax|Folk|21
Mbaqanga|Folk|16
Mbolé|Folk|1
Mbube|Folk|7
Mchiriku|Folk|0
Medieval|Klasična|53
Medieval lyric poetry|Klasična|0
Medieval metal|Metal|8
Medieval rock|Klasična|9
Mega funk|Funk|0
Meiji shinkyoku|Folk|0
Melbourne bounce|Rap|6
Melodic bass|Elektronika|0
Melodic black metal|Metal|9
Melodic death metal|Metal|54
Melodic dubstep|Drum & bass|0
Melodic hardcore|Punk|24
Melodic house|House|1
Melodic metalcore|Metal|20
Melodic techno|Techno|2
Melodic trance|Techno|15
Mélodie|Klasična|7
Memphis rap|Rap|12
Mento|Reggae|19
Menzuma|Folk|2
Merecumbé|Latino|3
Merengue|Latino|36
Merengue típico|Latino|2
Merenhouse|House|4
Merequetengue|Folk|0
Méringue|Folk|3
Merseybeat|Rock|8
Metalcore|Metal|51
Métis fiddling|Folk|1
Meyxana|Folk|15
Mgodro|Folk|1
Miami bass|Elektronika|14
Microfunk|Funk|0
Microhouse|House|12
Microsound|Elektronika|6
Microtonal classical|Klasična|0
Midtempo bass|Elektronika|2
Midwest emo|Punk|11
Miejski folk|Rock|1
Military cadence|Folk|6
Milonga|Folk|27
Milonga ciudadana|Folk|0
Min'yō|Folk|7
Minatory|Drum & bass|0
Mincecore|Punk|2
Minimal drum and bass|Drum & bass|0
Minimal synth|Elektronika|0
Minimal techno|Techno|20
Minimal wave|Techno|5
Minimalism|Klasična|40
Minneapolis sound|Rock|6
Minnesang|Folk|0
Minstrelsy|Folk|1
Mobb music|Rap|3
Mod|Rock|0
Mod revival|Punk|10
Moda de viola|Folk|1
Modal jazz|Jazz|25
Modern blues|Blues|0
Modern classical|Klasična|0
Modern creative|Folk|6
Modern hardtek|Elektronika|0
Modern laiko|Folk|0
Modinha|Latino|10
Moe song|Folk|0
Monodrama|Klasična|27
Mood kayō|Pop|2
Moogsploitation|Elektronika|0
Moombahcore|Folk|5
Moombahton|Elektronika|19
Mor lam|Folk|19
Mor lam sing|Folk|2
Morenada|Folk|11
Morna|Folk|29
Moroccan chaabi|Folk|6
Motet|Klasična|51
Motown|Soul|1
Moutya|Folk|17
Movimiento alterado|Folk|0
Mozarabic chant|Klasična|12
MPB|Latino|24
Muak|Folk|3
Mugham|Klasična|35
Mugithi|Folk|1
Muiñeira|Folk|14
Mulatós|Folk|0
Muliza|Latino|3
Murga|Folk|12
Murga uruguaya|Folk|1
Musette|Folk|7
Music hall|Pop|25
Música cebolla|Latino|2
Música criolla|Latino|7
Música de intervenção|Latino|0
Música festera|Latino|0
Música llanera|Latino|1
Música típica chilena|Latino|0
Musical|Filmska glazba|90
Mūsīqā lubnāniyya|Folk|0
Musique concrète|Klasična|35
Musique concrète instrumentale|Klasična|0
Muzika mizrahit|Folk|18
Muzika yehudit mekorit|Folk|1
Muzikat dika'on|Folk|1
Muziki wa dansi|Folk|5
Nagara naam|Folk|0
Nagauta|Folk|10
Nanguan|Folk|16
Narcocorrido|Latino|13
Narodnozabavna glasba|Folk|3
Nasheed|Folk|32
Nashville sound|Country|19
Native american new age|Elektronika|0
Nature sounds|Folk|1
Natya sangeet|Folk|1
Nederbeat|Pop|8
Nederpop|Pop|7
Neo kyma|Folk|3
Neo rave|Folk|0
Neo soul|Soul|28
Neo-acoustic|Indie|1
Neo-bop|Jazz|7
Neo-city pop|Pop|1
Neo-grime|Rap|0
Neo-medieval folk|Klasična|7
Neo-progressive rock|Rock|21
Neo-psychedelia|Indie|20
Neo-rockabilly|Rock|2
Néo-trad|Folk|3
Neo-traditional country|Country|6
Neo-trance|Techno|0
Neoclassical dark wave|Klasična|10
Neoclassical metal|Metal|35
Neoclassical new age|Klasična|2
Neoclassicism|Klasična|0
Neocrust|Punk|1
Neofolk|Folk|31
Neofolklore|Folk|1
Neon pop punk|Punk|1
Neoperreo|Latino|5
Neoromanticism|Klasična|0
Nepali lok geet|Folk|0
Nerdcore|Rap|11
Nerdcore techno|Techno|0
Neue deutsche härte|Metal|38
Neue deutsche todeskunst|Alternativa|8
Neue deutsche welle|Punk|23
Neurofunk|Drum & bass|18
Neurohop|Elektronika|1
New age|Elektronika|47
New beat|Elektronika|16
New complexity|Folk|9
New jack swing|R&B|26
New jazz|Jazz|0
New mexico music|Latino|2
New orleans blues|Blues|10
New orleans R&B|R&B|3
New rave|Indie|15
New romantic|Pop|31
New wave|Alternativa|57
New york drill|Trap|0
Ngâm thơ|Folk|0
Ngoma|Folk|4
Nhạc đỏ|Folk|4
Nhạc tiền chiến|Folk|2
Nhạc vàng|Folk|7
Night full-on|Techno|0
Nightcore|Elektronika|24
Nigun|Folk|12
Nintendocore|Punk|22
Nitzhonot|Techno|4
Njuup|Folk|4
No melody trap|Trap|0
No wave|Alternativa|34
Nocturne|Klasična|50
Noh|Folk|68
Noiadance|Elektronika|0
Noise|Techno|33
Noise pop|Techno|19
Noise rock|Techno|40
Noisecore|Techno|7
Noisegrind|Techno|3
Nortec|Elektronika|5
Norteño|Latino|9
Northern soul|Soul|15
Nóta|Folk|2
Nouveau zydeco|Country|0
Nova cançó|Kantautorska|11
Novelty piano|Klasična|6
Novo dub|Reggae|0
Nu disco|Disco|17
Nu jazz|Jazz|24
Nu skool breaks|Drum & bass|8
Nu style gabber|Techno|9
Nueva canción|Kantautorska|20
Nueva canción chilena|Kantautorska|5
Nueva canción española|Kantautorska|0
Nueva cumbia chilena|Latino|4
Nueva trova|Folk|12
Nuevo cancionero|Folk|2
Nuevo flamenco|Latino|12
Nuevo tango|Latino|12
Nustyle|Folk|0
Nwobhm|Metal|41
Nyū myūjikku|Pop|1
Oberek|Folk|1
Occult rock|Rock|5
Odissi classical|Klasična|7
Ogene music|Folk|0
Oi|Punk|38
Old roman chant|Klasična|5
Old school death metal|Metal|0
Old school hip hop|Rap|23
Old-time|Country|14
Omutibo|Folk|0
Onda nueva|Latino|1
Ondō|Folk|6
Onkyo|Folk|5
Opera|Klasična|169
Opera buffa|Klasična|51
Opéra comique|Klasična|28
Opera semiseria|Klasična|17
Opera seria|Klasična|39
Opera-ballet|Klasična|19
Operatic pop|Klasična|14
Operetta|Klasična|76
Opm|Folk|1
Oratorio|Klasična|64
Orchestral|Klasična|17
Orchestral jazz|Jazz|8
Orchestral song|Klasična|4
Organic house|House|2
Ori deck|Elektronika|0
Oriental ballad|Pop|1
Orkes gambus|Folk|0
Orthodox pop|Pop|1
Outlaw country|Country|16
Outrun|Elektronika|0
Outsider house|House|5
Overture|Klasična|57
Özgün müzik|Pop|1
P-funk|Funk|9
Pachanga|Folk|14
Pacific reggae|Reggae|2
Pagan black metal|Metal|1
Pagan folk|Folk|2
Paghjella|Folk|7
Pagodão|Latino|5
Pagode|Latino|7
Pagode romântico|Latino|1
Paisley underground|Alternativa|11
Pala|Folk|0
Palingsound|Pop|5
Palm-wine|Folk|9
Palo de mayo|Folk|4
Pandilla|Folk|0
Pansori|Folk|27
Paramaribop|Jazz|1
Parang|Folk|6
Parlour music|Folk|2
Partido alto|Latino|6
Partyschlager|Pop|2
Pasillo|Folk|14
Pasodoble|Folk|47
Passion setting|Klasična|32
Pásztordal|Folk|0
Payada|Latino|7
Peak time techno|Techno|0
Pep band|Folk|0
Persian classical|Klasična|13
Persian pop|Pop|10
Philly club|Folk|0
Philly club rap|Rap|0
Philly drill|Trap|0
Philly soul|Soul|18
Phleng phuea chiwit|Rock|2
Phonk|Trap|0
Phonk house|House|1
Piano blues|Klasična|8
Piano rock|Klasična|12
Picopop|Pop|1
Piedmont blues|Blues|17
Pigfuck|Punk|1
Pilón|Folk|1
Pimba|Folk|5
Pinpeat|Folk|6
Pìobaireachd|Klasična|7
Piosenka aktorska|Pop|2
Pipe band music|Folk|0
Piphat|Klasična|5
Pirekua|Folk|15
Piseiro|Latino|1
Piyyut|Folk|20
Pizzica|Folk|14
Plainchant|Klasična|14
Plena|Latino|11
Plugg|Trap|8
Pluggnb|Trap|2
Plunderphonics|Elektronika|10
Polca criolla|Latino|0
Polifonia occitana|Folk|4
Political hip hop|Rap|15
Polka|Folk|3
Polka paraguaya|Folk|6
Polonaise|Klasična|3
Pon-chak disco|Disco|1
Pop ghazal|Pop|0
Pop kreatif|Pop|4
Pop metal|Metal|14
Pop minang|Pop|1
Pop punk|Punk|46
Pop raï|Pop|2
Pop rap|Rap|22
Pop rock|Rock|62
Pop screamo|Punk|1
Pop soul|Soul|6
Pop yeh-yeh|Pop|1
Porn groove|Funk|1
Pornogrind|Punk|17
Porro|Folk|6
Post-bop|Jazz|21
Post-britpop|Indie|20
Post-classical|Klasična|0
Post-dubstep|Drum & bass|2
Post-grunge|Grunge|38
Post-hardcore|Punk|40
Post-industrial|Techno|11
Post-metal|Metal|34
Post-minimalism|Klasična|1
Post-punk|Punk|59
Post-punk revival|Punk|24
Post-rock|Indie|48
Powada|Folk|6
Power electronics|Techno|15
Power metal|Metal|53
Power noise|Techno|9
Power pop|Rock|35
Power soca|Reggae|0
Powerstomp|Elektronika|0
Powerviolence|Punk|15
Praise & worship|Folk|15
Praise break|Soul|2
Prank calls|Folk|0
Prelude|Klasična|45
Process music|Klasična|3
Production music|Folk|8
Progressive|Rock|10
Progressive bluegrass|Country|4
Progressive breaks|Drum & bass|2
Progressive country|Country|4
Progressive electronic|Rock|1
Progressive folk|Rock|8
Progressive house|House|25
Progressive metal|Metal|56
Progressive metalcore|Metal|6
Progressive pop|Rock|13
Progressive post-hardcore|Punk|0
Progressive psytrance|Techno|5
Progressive rock|Rock|66
Progressive soul|Soul|6
Progressive trance|Techno|11
Proto-punk|Punk|29
Psichedelia occulta italiana|Rock|3
Psybient|Elektronika|12
Psybreaks|Drum & bass|2
Psychedelic|Rock|31
Psychedelic folk|Rock|20
Psychedelic pop|Rock|18
Psychedelic rock|Rock|58
Psychedelic soul|Soul|15
Psychobilly|Punk|25
Psychploitation|Folk|0
Psycore|Techno|0
Psystyle|Folk|0
Psytrance|Techno|35
Pub rock|Rock|25
Puirt à beul|Folk|4
Pumpcore|Elektronika|0
Pungmul|Folk|15
Punk blues|Punk|15
Punk poetry|Punk|0
Punk rap|Punk|6
Punk rock|Punk|94
Punta|Latino|13
Punto|Folk|13
Purple sound|Drum & bass|0
Puxa|Folk|0
Q-pop|Pop|15
Qaraami|Folk|3
Qasidah modern|Folk|0
Qawwali|Klasična|43
Quan họ|Folk|16
Queercore|Punk|18
Quiet storm|R&B|12
Quyi|Folk|2
Rabbit song|Folk|0
Rabiz|Pop|9
Raga rock|Rock|19
Rage|Trap|10
Ragga|Reggae|30
Ragga hip-hop|Rap|5
Ragga jungle|Drum & bass|9
Raggacore|Reggae|7
Raggatek|Reggae|0
Ragtime|Jazz|60
Ragtime song|Jazz|1
Raï|Folk|38
Rain sounds|Folk|0
Ranchera|Latino|19
Rap metal|Nu metal|34
Rap rock|Nu metal|39
Rapcore|Punk|33
Rapso|Reggae|3
Raqs baladi|Folk|6
Rara|Folk|6
Rasin|Folk|6
Rasqueado cuiabano|Latino|1
Rasteirinha|Elektronika|3
Ratchet music|Rap|1
Rautalanka|Rock|6
Rave|Elektronika|9
Raw punk|Punk|0
Rawphoric|Folk|0
Rawstyle|Folk|3
Rebetiko|Folk|39
Red dirt|Country|5
Red disco|Disco|0
Red song|Folk|6
Reductionism|Folk|1
Regalia|Trap|0
Reggae panameño|Reggae|0
Reggae rock|Reggae|10
Reggae-pop|Reggae|4
Reggaeton|Reggae|54
Regional mexicano|Latino|3
Renaissance|Klasična|55
Reparto|Latino|1
Repente|Folk|4
Requiem|Klasična|9
Revue|Folk|34
Rhumba|Folk|7
Ricercar|Klasična|29
Riddim dubstep|Drum & bass|4
Rigsar|Pop|7
Ring shout|Folk|0
Riot grrrl|Punk|37
Ripsaw|Folk|3
Ritmada|Elektronika|0
Ritual ambient|Elektronika|2
Rizitika|Folk|3
Rkt|Latino|1
Rock and roll|Rock|106
Rock andaluz|Rock|7
Rock andino|Rock|0
Rock jiwang|Rock|0
Rock kapak|Rock|3
Rock musical|Filmska glazba|6
Rock opera|Klasična|37
Rock rural|Rock|0
Rock urbano|Rock|7
Rock urbano mexicano|Latino|1
Rockaballad|Rock|0
Rockabilly|Rock|46
Rocksteady|Reggae|31
Rōkyoku|Folk|8
Rom kbach|Folk|2
Romanian popcorn|House|3
Romantic classical|Klasična|53
Romantic flow|Latino|1
Romantische oper|Klasična|7
Rominimal|House|0
Roots reggae|Reggae|17
Roots rock|Rock|18
Rumba|Latino|7
Rumba catalana|Latino|13
Rumba cubana|Latino|22
Rumba flamenca|Latino|11
Runo song|Folk|19
Russian chanson|Kantautorska|16
Russian orthodox liturgical music|Folk|3
Russian romance|Folk|8
Rustic stomp|Folk|0
Ryūkōka|Pop|6
Sa'idi|Folk|0
Sacred harp|Klasična|9
Sacred steel|Klasična|1
Saeta|Folk|11
Salegy|Folk|9
Salsa|Latino|40
Salsa choke|Latino|2
Salsa dura|Latino|1
Salsa romántica|Latino|4
Saluang klasik|Klasična|0
Samba|Latino|97
Samba de breque|Latino|3
Samba de gafieira|Latino|4
Samba de roda|Latino|5
Samba de terreiro|Latino|2
Samba rap|Rap|0
Samba soul|Soul|1
Samba-canção|Latino|5
Samba-choro|Latino|3
Samba-enredo|Latino|5
Samba-exaltação|Latino|3
Samba-jazz|Latino|6
Samba-joia|Latino|3
Samba-reggae|Reggae|8
Samba-rock|Latino|8
Sambalanço|Latino|3
Sambass|Latino|8
Sample drill|Trap|0
Sampledelia|Folk|5
Samri|Folk|4
Sanjo|Folk|8
Sanjuanito|Latino|0
Santé engagé|Folk|3
Sarala gee|Folk|0
Sardana|Folk|29
Sarum chant|Klasična|0
Sasscore|Filmska glazba|2
Sawt|Folk|5
Saya afroboliviana|Folk|7
Scam rap|Rap|1
Schlager|Pop|42
Schottische|Folk|18
Schranz|Techno|14
Scottish country dance music|Country|0
Screamo|Punk|33
Scrumpy and western|Country|3
Sea shanty|Folk|27
Sean-nós|Folk|12
Seapunk|Punk|10
Séga|Folk|18
Séga tambour|Folk|1
Seggae|Reggae|8
Seguidilla|Folk|17
Seishun punk|Punk|1
Semba|Folk|11
Semi-trot|K-pop|0
Serenade|Klasična|53
Seresta|Klasična|4
Serialism|Klasična|41
Sermon|Folk|63
Sertanejo|Latino|17
Sertanejo raiz|Latino|0
Sertanejo romântico|Latino|0
Sertanejo universitário|Latino|3
Seto leelo|Folk|24
Sevdalinka|Kantautorska|27
Sevillanas|Folk|16
Sexy drill|Trap|0
Shaabi|Folk|5
Shabad kirtan|Klasična|0
Shan'ge|Folk|6
Shangaan electro|Elektronika|2
Shanto|Folk|1
Shashmaqam|Folk|25
Shatta|Reggae|1
Shibuya-kei|Pop|17
Shidaiqu|Pop|9
Shima-uta|Folk|5
Shinkyoku|Folk|2
Shitgaze|Rock|4
Shoegaze|Indie|49
Shōmyō|Folk|10
Shoor|Folk|0
Sichuan opera|Klasična|12
Sierreño|Folk|2
Sigidrigi|Folk|0
Sigilkore|Trap|3
Sikuri|Folk|0
Sinawi|Folk|6
Sinfonia concertante|Folk|21
Singeli|Elektronika|4
Singspiel|Klasična|36
Siren jam|Folk|0
Sissy bounce|Rap|0
Sitarsploitation|Folk|0
Sizhu music|Folk|0
Ska|Reggae|67
Ska punk|Punk|33
Skacore|Punk|3
Skate punk|Punk|25
Sketch comedy|Folk|0
Skiffle|Folk|32
Skiladiko|Folk|4
Skinhead reggae|Reggae|7
Skizzo|Folk|0
Skullstep|Drum & bass|0
Skweee|Elektronika|10
Slack-key guitar|Folk|0
Slacker rock|Rock|7
Slam death metal|Metal|3
Slam poetry|Folk|5
Slap house|House|5
Sleaze rock|Rock|7
Slimepunk|Punk|0
Slow waltz|Folk|0
Slowcore|Indie|13
Slowed & reverb|Folk|1
Sludge metal|Metal|36
Slushwave|Folk|0
Smooth jazz|Jazz|26
Smooth soul|Soul|4
Snap|Rap|10
Soca|Reggae|23
Soft rock|Rock|39
Soft visual|Rock|0
Sōkyoku|Folk|1
Son calentano|Folk|3
Son cubano|Latino|25
Son de pascua|Folk|0
Son huasteco|Folk|6
Son istmeño|Latino|3
Son jarocho|Folk|7
Son montuno|Folk|9
Son nica|Folk|1
Sonata|Klasična|70
Song of sana’a|Folk|0
Songo|Folk|8
Sonorism|Folk|7
Sophisti-pop|Pop|19
Soukous|Folk|21
Soul blues|Soul|12
Soul jazz|Soul|15
Sound art|Folk|26
Sound collage|Elektronika|7
Sound poetry|Folk|15
Southeast asian classical|Klasična|0
Southern gospel|Soul|6
Southern hip hop|Rap|17
Southern metal|Metal|2
Southern rock|Rock|32
Southern soul|Soul|11
Sovietwave|Elektronika|14
Space age pop|Pop|11
Space ambient|Elektronika|0
Space disco|Disco|11
Space rock|Rock|32
Space rock revival|Rock|1
Spacesynth|Elektronika|4
Spamwave|Folk|0
Spectralism|Klasična|13
Speed garage|House|11
Speed house|House|0
Speed metal|Metal|47
Speedcore|Techno|23
Spiritual art song|Soul|0
Spiritual jazz|Soul|5
Spirituals|Soul|44
Splittercore|Elektronika|2
Spouge|Reggae|2
Staïfi|Folk|2
Standup comedy|Folk|0
Steampunk|Punk|0
Steel band|Folk|0
Stenchcore|Metal|0
Sticheron|Folk|10
Stochastic music|Folk|4
Stomp and holler|Pop|0
Stoner metal|Metal|4
Stoner rap|Rap|0
Stoner rock|Rock|37
Stornello|Folk|8
Stotra|Folk|0
Street punk|Punk|16
Stride|Jazz|20
String quartet|Klasična|1
Stutter house|House|0
Sufi rock|Rock|10
Sufiana kalam|Klasična|1
Sundanese pop|Pop|2
Sungura|Folk|0
Sunshine pop|Pop|13
Suomisaundi|Techno|8
Surf|Rock|30
Surf punk|Punk|2
Surf rock|Rock|9
Sutartinės|Folk|10
Swamp blues|Blues|12
Swamp pop|Pop|8
Swamp rock|Rock|13
Swancore|Punk|0
Sweet jazz|Jazz|2
Swing|Jazz|52
Swing revival|Jazz|11
Symphonic black metal|Metal|28
Symphonic metal|Metal|54
Symphonic mugham|Klasična|7
Symphonic poem|Klasična|42
Symphonic prog|Klasična|0
Symphonic rock|Klasična|31
Symphony|Klasična|113
Synth funk|Funk|1
Synth-pop|Pop|53
Synthwave|Elektronika|31
T-pop|Pop|7
Taarab|Folk|16
Taizé chant|Klasična|0
Tajaraste|Folk|2
Takamba|Folk|2
Talempong|Folk|6
Talempong goyang|Pop|0
Talking blues|Blues|4
Tallava|Folk|9
Tamborera|Latino|2
Tamborito|Folk|5
Tamborzão|Rap|0
Tammurriata|Folk|3
Tân cổ giao duyên|Folk|0
Tango|Latino|21
Tanjidor|Folk|0
Taoist ritual music|Folk|5
Tape music|Elektronika|3
Tappa|Klasična|13
Taquirari|Folk|2
Tarana|Klasična|7
Tarantella|Folk|44
Tarawangsa|Folk|0
Tarraxinha|Folk|2
Tassa|Folk|5
Tassu|Folk|0
Tbm|Techno|2
Tchinkoumé|Folk|1
Tearout|Drum & bass|0
Tearout brostep|Drum & bass|0
Tech house|House|17
Tech trance|Techno|13
Technical death metal|Metal|31
Technical thrash metal|Metal|1
Techno bass|Techno|1
Techno kayō|Techno|1
Technobanda|Techno|2
Technoid|Techno|3
Techstep|Drum & bass|15
Tecnobrega|Elektronika|10
Tecnocumbia|Latino|0
Tecnofunk|Funk|0
Tecnomerengue|Latino|1
Tecnorumba|Latino|2
Teen pop|Pop|31
Tejano|Latino|15
Tembang cianjuran|Klasična|4
Terror plugg|Trap|1
Terrorcore|Techno|12
Tex-mex|Rock|5
Texas blues|Blues|19
Texas country|Country|3
Thai classical|Klasična|1
Thall|Metal|1
Theme and variations|Klasična|38
Third stream|Jazz|17
Third wave ska|Reggae|3
Thrash metal|Metal|71
Thrashcore|Metal|16
Thumri|Klasična|18
Tibetan buddhist chant|Klasična|0
Tiento|Latino|10
Timba|Latino|9
Timbila|Folk|8
Tin pan alley|Pop|27
Tivaner inngernerlu|Folk|0
Tizita|Folk|5
Toada de boi|Latino|2
Toccata|Klasična|41
Tonada asturiana|Folk|2
Tonada potosina|Folk|0
Tonadilla|Folk|13
Tondero|Latino|5
Tontipop|Pop|0
Totalism|Klasična|4
Tough guy hardcore|Punk|2
Township bubblegum|Pop|0
Township jive|Folk|4
Toypop|Pop|0
Toytown pop|Pop|1
Toytown techno|Techno|3
Tradi-moderne congolais|Folk|0
Tradi-moderne ivoirien|Folk|0
Traditional black gospel|Soul|1
Traditional bluegrass|Country|3
Traditional country|Country|1
Traditional doom metal|Metal|1
Traditional pop|Pop|18
Traditional séga|Folk|0
Tragédie en musique|Klasična|19
Trallalero|Folk|4
Trampská hudba|Country|3
Trance|Techno|59
Trance 2.0|Techno|0
Trance metal|Metal|2
Trancestep|Techno|4
Trap dancehall|Trap|0
Trap EDM|Trap|7
Trap latino|Trap|8
Trap metal|Metal|6
Trap shaabi|Trap|0
Trap soul|Trap|0
Trapfunk|Funk|1
Tread|Trap|1
Tribal ambient|Elektronika|0
Tribal guarachero|Elektronika|3
Tribal house|House|13
Trikitixa|Folk|1
Trip hop|Elektronika|47
Troparion|Folk|22
Tropical house|House|24
Tropical rock|Latino|5
Tropicália|Latino|22
Tropicanibalismo|Folk|0
Tropipop|Pop|3
Trot|Folk|23
Troubadour song|Folk|0
Trova|Folk|7
Trova yucateca|Folk|1
Truck driving country|Country|2
Tsapiky|Folk|3
Tsonga disco|Disco|0
Tsugaru-jamisen|Folk|8
Tumba|Folk|4
Tumba francesa|Folk|18
Tumbélé|Folk|0
Turbo-folk|Pop|33
Turkish classical|Klasična|15
Turkish folk|Folk|8
Turkish pop|Pop|5
Turntablism|Rap|26
Twee pop|Indie|15
Twerk|Rap|0
Twoubadou|Folk|4
Uaajeerneq|Folk|0
Udigrudi|Folk|1
Ufie music|Folk|0
UK drill|Trap|5
UK funky|Funk|7
UK garage|House|28
UK hardcore|Techno|8
UK jackin|House|0
UK street soul|Soul|0
Uk82|Punk|2
Unakesa|Folk|0
Underground hip hop|Rap|16
Unyago|Folk|2
Upopo|Folk|0
Uptempo hardcore|Punk|3
Urban contemporary gospel|Soul|5
Urban cowboy|Country|2
Urtiin duu|Folk|16
Urumi melam|Folk|0
US power metal|Metal|0
Utopian virtual|Folk|1
Uyghur muqam|Klasična|16
Uzun hava|Folk|4
V-pop|Pop|9
Vaigat|Folk|0
Valaam chant|Klasična|0
Vallenato|Latino|29
Vals criollo|Latino|7
Vals venezolano|Folk|2
Valsa brasileira|Folk|0
Vanera|Folk|2
Vapornoise|Techno|0
Vaportrap|Elektronika|1
Vaporwave|Elektronika|38
Vaudeville|Pop|0
Vaudeville blues|Blues|13
Vedic chant|Klasična|13
Verbunkos|Folk|19
Verismo|Klasična|17
Vietnamese bolero|Latino|1
Vietnamese classical|Klasična|0
Viking metal|Metal|44
Viking rock|Rock|9
Villancico|Folk|22
Vinahouse|House|3
Visa|Folk|6
Visual kei|Rock|43
Vocal house|House|4
Vocal jazz|Jazz|3
Vocal surf|Rock|3
Vocal trance|Techno|14
Vocalese|Jazz|9
Volkstümliche musik|Pop|6
Vude|Folk|0
Wa euro|Elektronika|0
Waila|Folk|2
Waka|Folk|4
Waltz|Folk|15
Wangga|Folk|1
War metal|Metal|3
Wassoulou|Soul|9
Waulking song|Folk|2
Wave|Elektronika|3
Weightless|Elektronika|0
West coast breaks|Drum & bass|0
West coast hip hop|Rap|30
West coast swing|Jazz|14
Western|Country|11
Western classical|Country|146
Western swing|Country|20
Whale song|Folk|0
Whistling|Folk|0
White voice|Folk|6
Winter synth|Elektronika|0
Witch house|Elektronika|19
Wong shadow|Rock|2
Wonky|Drum & bass|6
Wonky techno|Drum & bass|1
Work song|Folk|29
World fusion|Jazz|1
Worldbeat|Folk|13
Wyrd folk|Folk|1
Xẩm|Folk|4
Xaxado|Folk|5
Xian psych|Rock|0
Xote|Folk|7
Xtra raw|Techno|0
Xuc|Folk|4
Yacht rock|Rock|13
Yakousei|Alternativa|0
Yangzhou opera|Klasična|3
Yanyue|Folk|2
Yaraví|Latino|3
Yayue|Folk|11
Yé-yé|Pop|20
Yodeling|Folk|0
Ytpmv|Folk|1
Yu-mex|Folk|11
Yue opera|Klasična|13
Yukar|Folk|15
Zamacueca|Folk|7
Zamba|Folk|14
Zamrock|Rock|11
Zarzuela|Klasična|40
Zarzuela barroca|Klasična|0
Zeitoper|Klasična|3
Zema|Folk|4
Zemirot|Folk|10
Zenonesque|Techno|0
Zess|Reggae|0
Zeuhl|Rock|14
Zeybek|Folk|0
Zhongguo feng|Folk|2
Ziglibithy|Folk|3
Zinli|Folk|2
Znamenny chant|Klasična|12
Zoblazo|Folk|2
Zohioliin duu|Folk|0
Zolo|Rock|0
Zouglou|Folk|6
Zouk|Latino|23
Zouk love|Latino|2
Zydeco|Country|17
`.trim().split('\n').map(l => { const [n, p, r] = l.split('|'); return [n, p, +r]; });
