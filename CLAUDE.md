# HJERTETS VEJE — Projektplan

## Hvad er det
En single-page web-app til kursusmaterialet "Hjertets Veje" — en temadag om hjertet med Sonja Aclon & Niklas Patursson (Aarhus 17. april · Roskilde 24. april 2026). Appen præsenterer teksten som en smuk, meditativ scrolloplevelse med syv narrative Three.js-illustrationer — én per kapitel — plus en hero-animation.

## Repo-struktur
```
index.html    — al markup + CSS
scenes.js     — hero + 7 Three.js-scener
```
Ingen build-tools, ingen bundler. Ren HTML + en enkelt JS-fil. Three.js indlæses via CDN (r128).

## Æstetisk retning
- **Typografi**: Cormorant Garant (serif, 300/400/500) til brødtekst og overskrifter. Instrument Sans til labels og metadata.
- **Farver**: Creme baggrund (#f5efe6), bordeaux (#6b2737), guld (#c4a265), rosa (#b8707a), varm grå (#8a7e76). Se CSS-variabler.
- **Tone**: Organisk, varm, sakral. Intet generisk, intet "tech". Tænk håndskrevet kursusmateriale i et smukt rum.
- **Layout**: Enkelt kolonne, max 720px, generøs luft mellem sektioner. Scroll-reveal (opacity + translateY) via IntersectionObserver.
- **Word-cards**: Kulturelle hjertebegreber præsenteres i mørke kort (bordeaux-gradient) med scriptskrift, titel og sprogangivelse.

## Tekniske krav til scenes.js

### Fælles fundament
- En `initScene(containerId, fov)` funktion der opretter scene, camera, renderer (alpha: true, antialias: true), sætter pixelRatio og returnerer alt + en IntersectionObserver der tracker `active` og `startTime`.
- Hver scene starter sin animation når den bliver synlig (IntersectionObserver threshold 0.15).
- `startTime` nulstilles når scenen kommer i view, så narrativet altid starter fra begyndelsen.
- Easing-funktioner: `easeOutCubic(t)` og `easeInOutQuad(t)`.
- Heart-parametric: `heartPoint(t, scale)` — standard hjertekurve.
- Scroll-reveal observer for `.section`-elementer (separat fra scene-observers).

### Performance
- Alle scener bruger `requestAnimationFrame` men renderer kun når `active === true`.
- PointsMaterial med sizeAttenuation. Ingen tung geometri, ingen post-processing.
- Max ~2500 partikler per scene.

---

## DE 8 SCENER — DETALJERET SPECIFIKATION

### HERO — "Regnen i hele verden"
**Narrativ**: Tårer der stille falder ned gennem rummet. Evigt, roligt regnfald.
**Dynamik**: 800 partikler falder konstant nedad med lille sinusbølge-svajen. Wrapper til toppen når de når bunden.
**Farver**: Guld (#c4a265), guld-light (#d4bb82), rosa (#b8707a), bordeaux (#6b2737) — tilfældigt fordelt.
**Camera**: z=6, fov=60. Ingen rotation.
**Container**: `<canvas id="heroCanvas">` — fullscreen bag hero-overlay.
**Tempo**: Langsomt, mediterende. Ingen dramatik.

### SCENE 1 — Kapitel I: "Alle steder på én gang"
**Narrativ**: 12 klynger af lys (hvert repræsenterende en kultur/tradition) ankommer samtidigt fra alle retninger i rummet og finder langsomt hinanden i et fælles, orbiterende felt. "We start everywhere at once."
**Dynamik**:
- 12 klynger × 80 partikler = 960 total
- Hvert cluster har en origin langt ude (radius 8-12) i en unik retning
- Target: en løs sfære omkring centrum (radius 1.5-3)
- Over 8 sekunder: easeOutCubic fra origin til target
- Derefter: blid orbit + svæv
**Farver**: 12 forskellige varme nuancer — guld, rosa, bordeaux, amber, sand, koralrosa, mahogni, mosgrøn, terracotta, lavendel, fersken, honning. Hvert cluster sin farve.
**Camera**: z=6, fov=55. Langsom rotation (0.05 rad/s).
**Container**: `<div id="scene1">`

### SCENE 2 — Kapitel II: "Hjertets tilblivelse"
**Narrativ**: Celler fra fire embryologiske regioner vandrer ind mod midtlinjen og samler sig til et hjerte. Cellevandringen er organisk — de flyver ikke i rette linjer men svajer og søger. Når de har fundet hinanden, begynder hjertet at slå.
**Dynamik**:
- 4 grupper × 625 partikler = 2500 total
- Gruppe 1-4 starter i hjørnerne: øverste-venstre, øverste-højre, nederste-venstre, nederste-højre (med spread)
- Staggered ankomst: gruppe 1 starter med det samme, gruppe 4 er ~2.4s forsinket
- Under migration: partiklerne har "wander" — de svajer med sin/cos som levende celler
- Over ~10 sekunder: alle har nået hjerteformen
- Herefter: pulsering (heartbeat sin-kurve, ~70 BPM, subtil 8% skalering)
**Farver**: Hver gruppe har sin farve — rose-light (#d4a0a8), guld (#c4a265), rosa (#b8707a), bordeaux (#6b2737). De blander sig naturligt når de mødes.
**Camera**: z=5, fov=50. Svag rotation (sin-baseret, ±0.25 rad).
**Container**: `<div id="scene2">`

### SCENE 3 — Kapitel III: "Lynet og overgivelsen"
**Narrativ**: Et roligt felt af partikler. Pludselig slår lynet ned — en hvid flash — og alle partikler spredes ud i chok. Langsomt, over mange sekunder, finder de tilbage, men til en ny form: bredere, åbnere, blødere. Overgivelsen.
**Dynamik**:
- 1800 partikler
- Fase 1 (0-3s): Rolig oval klynge med blid svæv. Farve: dæmpet lilla.
- Fase 2 (3-3.3s): Lynflash! En zigzag-linje (LineSegments) blinker hvidt. Alle partikler flasher hvidt.
- Fase 3 (3.3-5s): Eksplosion. Partikler skyder udad fra centrum (easeOutCubic).
- Fase 4 (5-12s): Langsom gensamling (easeInOutQuad) til ny form — en åben skålform, bredere og blødere end den oprindelige.
- Fase 5 (12s+): Åben form med blid ånding.
- Under fase 4 tilføjes en subtil spiral-bevægelse.
**Farver**: Starter lilla (#7a6a8a) → flash hvid (#fff8e0) → gradvis overgang til varm amber (#d4a070).
**Lynet**: THREE.LineSegments med 12 segmenter, zigzag fra top til bund. Opacity flash 1→0 over 0.3s.
**Camera**: z=5.5, fov=50. Statisk.
**Container**: `<div id="scene3">`

### SCENE 4 — Kapitel IV: "Stilhedens kilde"
**Narrativ**: Alle partikler ånder sammen — som ét felt, én krop. Koncentriske lysringe pulserer langsomt ud fra centrum, som ringe i stille vand. Dyb ro.
**Dynamik**:
- 2000 partikler i en sfærisk formation
- Alle bevæger sig i unison: fælles ånding (expand/contract) med ~12s cyklus
- Ripple-effekt: hvert 4. sekund pulserer en lysring ud fra centrum (farveændring baseret på afstand til ringen)
- Minimal individuel bevægelse — bare en lille drift
**Farver**: Indre partikler: teal (#4a7a8a). Ydre: dyb indigo (#2a3a5a). Ripple-ring: sølv (#c0c8d0).
**Camera**: z=5, fov=45. Meget langsom rotation (0.02 rad/s).
**Container**: `<div id="scene4">`

### SCENE 5 — Kapitel V: "Fra hjerte til hånd"
**Narrativ**: Et pulserende hjerteformede partikler i centrum. Fra hjertet strømmer to floder af energi ud langs buede stier — som meridianer — mod to punkter (hænderne). Energien flyder uafbrudt.
**Dynamik**:
- 600 hjerte-partikler (pulserende som kap II men mindre)
- 800 strøm-partikler (400 per arm)
- Hver strøm-partikel har en `phase` (0-1) langs armkurven, som konstant avancerer
- Armkurve: S-formet kurve fra hjertecentrum ud til siderne og nedad
- Partiklerne har lille wobble vinkelret på stien
**Farver**: Hjerte: bordeaux (#6b2737). Strøm nær hjerte: guld (#c4a265). Strøm nær hænder: rosa (#d4a0a8). Gradient langs stien.
**Camera**: z=6, fov=50. Statisk.
**Container**: `<div id="scene5">`

### SCENE 6 — Kapitel VI: "Xin — der hvor alt mødes"
**Narrativ**: Tre bloddråber falder ned fra oven, én ad gangen. Hvor hver lander, blomstrer en cirkulær ring af partikler udad. Efter alle tre er faldet, vokser fire små farvede klynger (Mencius' fire spirer: medfølelse, skam, høflighed, dømmekraft) langsomt op fra nedslags-punkterne.
**Dynamik**:
- 3 dråber × (120 dråbe + 200 bloom + 100 spire) = 1260 total
- Dråbe 1: falder fra t=0, lander t=2s
- Dråbe 2: falder fra t=2.5s, lander t=4.5s
- Dråbe 3: falder fra t=5s, lander t=7s
- Dråbe: klynge af partikler i tåreform, accelererer nedad
- Bloom: ring af partikler der udvider sig (easeOutCubic) fra nedslagspunkt
- Spirer: 4 grupper × 25 partikler der langsomt vokser opad
**Farver**: Dråbe: dyb blodrød (#8a2030). Bloom: guld (#c4a265). Spirer: rosa (#d4a0a8), lilla (#7a6a8a), salvie (#6a9a7a), guld (#c4a265).
**Camera**: z=5.5, fov=45. Statisk.
**Container**: `<div id="scene6">`

### SCENE 7 — Kapitel VII: "Det fælles hjerte"
**Narrativ**: 20 små individuelle hjerteformer spredt ud i rummet, hver i sin farve. De svæver roligt i starten. Langsomt begynder de at bevæge sig mod centrum og smelter sammen til ét stort, pulserende hjerte der indeholder alle farver.
**Dynamik**:
- 20 hjerter × 80 partikler = 1600 total
- Fase 1 (0-4s): Små hjerter flyder roligt, individuel rotation
- Fase 2 (4-14s): easeInOutQuad drift mod centrum, overlapning, sammensmelting
- Fase 3 (14s+): Ét stort hjerte pulserer (heartbeat, som scene 2)
**Farver**: 20 forskellige farver fra hele kursets palet — alle de farver vi har brugt gennem de andre scener. Farverne bevares også efter sammensmelting, så det store hjerte er et mosaik.
**Camera**: z=6, fov=50. Svag rotation.
**Container**: `<div id="scene7">`

---

## TEKSTEN

Her er den fulde tekst til index.html. Hvert kapitel indeholder:
- chapter-header (nummer, titel, undertitel)
- body-text (prose)
- evt. word-cards (kulturelle hjertebegreber)
- evt. quote-blocks

### Intro
> Det regner i hele verden, skrev en digter engang på Færøerne. Måske han mærkede de tårer, som altid siler gennem hjertet. Af glæde og sorg. Af kærlighed og frygt. Af drømme og længsel. Måske han forstod, at de altid følges ad — at de i virkeligheden er én og samme tåre.

> Kære deltager — dette materiale er skrevet til dig, som har valgt at være med på temadagen Hjertets Veje. Det er tænkt som en ledsager: noget du kan læse før, under og efter vores dag sammen. Ikke som en lærebog, der skal huskes, men som et rum, du kan træde ind i og vende tilbage til.

> Vi har i månederne op til denne dag talt mange timer sammen, Sonja og jeg, og hver gang er temadagens hjerte trådt tydeligere frem. Det ord, som er blevet ved at vende tilbage, er overgivelse. Ikke som opgivelse, men som den bevægelse, hvor vi lader os selv blive holdt af noget større end vores kontrol. Og det spørgsmål, som har fulgt os hele vejen, er dette: hvordan overgiver vi os til det, vi tror på, når vi på tærsklen til overgivelsen mærker alt det, som har hindret os i at overgive os for længst?

> Det spørgsmål har intet svar, der kan gives udefra. Men det har en vej. Og den vej går igennem hjertet.

### Kapitel I · Alle steder på én gang — Livets mange hjerter

> I George Orwells Utopia spørger de fremmede beboerne, hvor man begynder. Svaret de giver er: We start everywhere at once. Det er også vores tilgang. Vi åbner små døre på klem fra mange vinkler og lader hjertet selv vise, hvilken dør der først inviterer os ind.

> Hjertet har altid været mere end et organ. Over hele verden og i alle tider har mennesker vidst, at der i brystet bor noget, som rækker langt ud over det fysiske slag. Og de har givet det navne, der afslører dybder, vi i vesten ofte har glemt.

> På Quechua er sonqo hjerte, sind, hukommelse, vilje og samvittighed — alt samlet i ét ord. Sonqo nanay, hjertets smerte, er den smerte, der opstår, når forbindelsen er brudt — når et hjerte er blevet isoleret fra de andre hjerter, det hører til.

> Det japanske kokoro nægter at vælge mellem hjerte, sind og ånd. Det er stedet, hvor alt det, et liv samler, kommer til hvile. Når man taler om det, bevæger hånden sig til brystet, ikke hovedet. Følelse og viden har aldrig forladt hinanden. Måske var adskillelsen aldrig nødvendig. Måske var den aldrig sand.

> Det arabiske qalb kommer fra en rod, der betyder at vende. Hjertet er det, der vender sig — uophørligt. Sufimesteren Ibn Arabi kaldte hjertet det eneste organ, der kan rumme Gud, fordi det aldrig holder op med at forvandle sig. Vi vil have hjertet til at være stabilt, men hjertet blev skabt til at blive vendt. Spørgsmålet er ikke, om det vender sig. Spørgsmålet er, hvad det vender sig mod.

**→ SCENE 1 her**

### Kapitel II · Hjertets tilblivelse — Embryologien

> I modsætning til de fleste organer dannes hjertet ved et møde. Celler vandrer fra flere forskellige regioner i det tidlige embryo og finder hinanden i midtlinjen, hvor de smelter sammen og begynder at slå. Det er, som om hjertet fra sin allerførste begyndelse er et samarbejde — skabt af bidrag fra alle lag i os.

> Undervejs sker noget sælsomt: hjertets oprindelige center må henfalde og opløses for at give plads til den videre vækst. Det primitive hjerteretør omformer sig, drejer, foldes og skaber de kamre, vi kender. Væksten kræver et farvel.

> Ægypterne lagde hjertet på en vægtskål over for en fjer. Ikke for at måle styrke, men sandhed. Et hjerte tungt af det, det nægtede at indrømme, kunne ikke træde ind i evigheden. De bar amuletter, der bønfaldt hjertet om ikke at vidne imod dem — for hjertet fører sit eget regnskab. Det registrerer hver omgåelse, hver halve sandhed, hver gang vi vidste bedre og gjorde det alligevel.

> Også her ses parallellen til embryologien: det hjerte, der forsøger at beholde sin oprindelige form, kan ikke vokse. Kun det, der tør opgøre sit center, bliver til et hjerte, der kan slå.

**→ SCENE 2 her**

### Kapitel III · Lynet og overgivelsen — Sonjas vej

> Sonja valgte ikke selv sin vej. Livet bragte den — uden yderligere forhandling eller dialog. Hun blev ramt af lynet en dag på Maui, og de følgende to års tvungne, immobiliserede dvale udstak en vej, hvor kun den fulde omfavnelse af alle hjertets tårer åbnede de trin, som helingen behøvede.

> Maui ses i mange traditioner som verdens hjerte-chakra. Det var på dette sted, i dette felt, at Sonjas eget hjerte blev åbnet med en kraft, hun ikke kunne kontrollere. Og det var netop fraværet af kontrol, der blev åbningen.

> Vi ved alle, hvordan forståelsen af overgivelse ikke er selve overgivelsen. Alligevel er der øjeblikke, hvor forståelsen lægger sig som en brændt mark — rå, åben og klar til at modtage det, der nu vil vokse.

**Word-cards:**
- SEMS ཤེམས (Tibetansk): "Når tibetanere taler om sems, går hånden til brystet. Ordet betyder sind og hjerte — de er én ting, der aldrig er blevet delt. Bodhicitta, det opvågnede hjerte-sind, er ikke oplysning som en flugt fra verden, men som fuldstændig deltagelse i den. Det dybeste lærdomme i Dzogchen kaldes snying thig: hjertedråber. Essensen destilleret til sin reneste form."
- GÖNÜL (Tyrkisk): "Tyrkisk har to hjerter. Kalp slår i brystet. Gönül lever dybere — der, hvor længsel bliver vilje, og vilje bliver overgivelse. Rumi sagde, at livet ikke er betroet til dem, der ikke kan læge et gönül. At være gönüllü er at handle fra det sted, hvor drift og hengivenhed er blevet det samme."

**→ SCENE 3 her**

### Kapitel IV · Stilhedens kilde — Meditation og det fælles felt

> Stilheden er kilden, hvorfra både vores individuelle og fælles indsigter udspringer. Der er lag i os, som først vågner og giver sig til kende, idet vi vågent, opmærksomt og lyttende lader stilheden blive øjeblikkets fulcrum.

> På temadagen vil Sonja guide en meditation, der tager gruppen som en samlet helhed ind i det fælles hjerte. Ikke som en abstrakt idé, men som en direkte, mærkbar oplevelse af det levende felt, hvor sårbarhed, kraft og visioner lever side om side.

**Quote:** "Salomon bad om lev shome'a — et lyttende hjerte. Han bad ikke om et klogt sind. Han bad om et hjerte, der stadig er åbent nok til at høre spørgsmålet." — den hebraiske tradition

> Zen-buddhismen har et smukt billede af, at vi alle i vores inderste bærer en kvalitet, som allerede er fuldt modnet og har modet til at tage de skridt, vi tøver med at tage. At mødes og sammen rette vores opmærksomhed mod den proces er én af de kraftigste veje til at finde den del i os selv, som blot venter på at blive vækket.

**Word-card:**
- HRIDAYA हृदय (Sanskrit): "Ordet bærer tre bevægelser: hri, det der modtager; da, det der giver; ya, det der cirkulerer mellem dem. I hjertets hule, siger Chandogya Upanishad, er et lille rum, og i det rum er alt, hvad der eksisterer. Himlen og jorden. Fortid og fremtid. Alt rummes i det rum, der er mindre end et riskorn."

**→ SCENE 4 her**

### Kapitel V · Fra hjerte til hånd — Berøringens kunst

**Quote:** "Jeg ønsker afstanden fra hjertet til hånden så kort som muligt." — Jørgen Leth

> I løbet af dagen vil der være sessioner ved briksen, hvor vi med vores hænder træner kunsten at forene hjertets og hændernes fælles intention. Sigtet er nærværets kvalitet fremfor den tekniske og anatomiske proces. Den berøring, der ikke kun kommer fra kunnen, men fra det sted i os, hvor viden og stilhed mødes.

> Grebene vil indeholde forskellige indgange til klientens hjerte. Nogle direkte, omkring selve det fysiske hjerte. Andre benytter hjertets forgreninger — meridianveje, nervebaner og fascielle forbindelser som en blid, systemisk vej til at engagere hjertets mange kvaliteter. Det smukke ved denne praksis er, at den går begge veje. Idet vi berører med hjertets intention, berører vi samtidig os selv.

**Word-cards:**
- NA'AU (Hawaiiansk): "Hawaiianerne placerede viden i maven. Na'au er indvolde, sind, hjerte og hele menneskets temperament. Der er en intelligens, der ikke passerer gennem tanken. Den stiger op fra det sted, hvor fem hundrede millioner neuroner venter i tarmenes folder. Lyt til dit na'au, sagde de. Maven ved, før hjernen tror."
- ÇANTÉ (Lakota): "Black Hills er Wamaka Ognaka y Çanté: hjertet af alt, der er. Çanté er ordet inde i kærlighed, mod og gavmildhed — som om dyd ikke kan eksistere uden hjertets deltagelse. Hjertet er også derude — i bakkerne, i slægtskabet — og det venter på at blive genkendt."

**→ SCENE 5 her**

### Kapitel VI · Xin — der hvor alt mødes — Det kinesiske hjerte

> I den kinesiske tradition er hjertet kejseren — den øverste hersker, der favner alle aspekter af mennesket. Det huser Shen, den bevidsthed, der giver os evnen til at mærke, forstå og forbinde os med verden. Når hjertet er i balance, er der en naturlig klarhed og varme, som gennemsyrer alt, vi gør.

> Det kinesiske tegn xin 心 er en afbildning af selve organet: tre dråber af blod, der falder. Mencius sagde, at xin fra naturens hånd rummer fire spirer: medfølelse, skam, høflighed og dømmekraft. Vores arbejde handler ikke om at tilføje noget, men at lade det, der allerede er der, vokse. Tegnet for hjerte optræder i hundredvis af kinesiske ord. Det står under tegnet for tålmodighed: en kniv over et hjerte. Det står i tegnet for at glemme: et hjerte, der er forsvundet.

**Word-cards:**
- MOYO (Swahili): "Moyo er hjerte, liv og ånd. Jicho la moyo linaona mengi — hjertets øje ser, hvad det fysiske øje overser. Moyo slår ikke alene. Det slår i fællesskabet — i det vi gør for hinanden. Det er den rytme, vi deler."
- YÓLLOTL (Aztekisk): "Ordet for hjerte kommer fra ollin: bevægelse. Yolteotl — et hjerte, der er blevet gud — var betegnelsen for den sande kunstner. En, der skaber fra den guddommelige ild i brystet. At leve var at bevæge sig. At dø var at give sin bevægelse videre. Hjertet var forbindelsen."

**→ SCENE 6 her**

### Kapitel VII · Det fælles hjerte — Alle hjertets tårer

> For inuit er inua den livskraft, der bor i alle ting. Mennesker, dyr, planter, sten, vind, bølger — alt er besjælet. Det menneske, der glemmer, at alt har inua, begynder at behandle verden som materiale. Og den verden, der behandles som materiale, begynder langsomt at dø.

> Det irske croí bærer sin betydning i sin lyd: a chúisle mo chroí — puls af mit hjerte, selve det slag, der holder mig i live, er du. Ordsproget siger: et let hjerte lever længe. Ikke det stærke. Ikke det modige. Det lette. Det hjerte, der har lært at slippe det, der ikke længere kan bæres.

> Og Mæoriernes ngākau kan ikke stå alene. Det hører til i balance med kroppen, sindet og ånden. Først da er et menneske helt. Det opnås ikke ved at styrke én del, men ved at lade delene finde tilbage til hinanden.

> På temadagen vil vi lave øvelser, som alle kan benyttes til både personlig praksis og som støtte til klientens proces. Den store gave i daglige øvelser er, at de udgør et vedvarende møde med os selv — et rum, hvor vi livet igennem kan nære og udvikle os i takt med livets gang.

**→ SCENE 7 her**

### Afslutning

> Hjertet er ikke kun det, der slår inde i os. Det er også derude — i landskabet, i fællesskabet, i den berøring, vi giver og modtager. Denne temadag handler om at lade alle hjertets tårer bydes velkommen. Glædens og sorgens. Kærlighedens og frygtens. For de følges altid ad. De er ikke hinandens modsætninger, men hinandens forudsætninger. De er i virkeligheden én og samme tåre, og hjertet fyldes kun helt, når alle tårer bydes velkommen.

> Vi glæder os til at dele denne dag med dig.

**Note-block:** "Alle greb og øvelser fra dagen vil indgå i det samlede kursusmateriale, der ligeledes vil indeholde kapitler om embryologi, kinesisk og buddhistisk hjerteforståelse samt visuelle illustrationer og oversigter. Materialet udleveres på temadagen."

Kærlig hilsen — Sonja & Niklas
HJERTETS VEJE · 2026

---

## HTML-STRUKTUR (index.html)

```
hero
  canvas#heroCanvas
  .hero-overlay
  .hero-content (pretitle, h1, subtitle, date)
  .scroll-indicator

main.content-wrapper
  .section (intro — drop-cap + body-text)
  .divider
  .section (kap I — chapter-header + body-text)
  .three-interlude#scene1
  .section (kap II — chapter-header + body-text)
  .three-interlude#scene2
  .section (kap III — chapter-header + body-text + word-cards)
  .three-interlude#scene3
  .divider
  .section (kap IV — chapter-header + body-text + quote + word-card)
  .three-interlude#scene4
  .section (kap V — quote + body-text + word-cards)
  .three-interlude#scene5
  .divider
  .section (kap VI — chapter-header + body-text + word-cards)
  .three-interlude#scene6
  .section (kap VII — chapter-header + body-text)
  .three-interlude#scene7
  .divider
  .section.closing (body-text + note-block + names + colophon)
```

## CSS-KLASSER REFERENCE

- `.hero`, `.hero-canvas`, `.hero-overlay`, `.hero-content`
- `.hero-pretitle`, `.hero-subtitle`, `.hero-date`
- `.scroll-indicator`
- `.content-wrapper` (max-width: 720px)
- `.section` (scroll-reveal: opacity 0→1, translateY 40→0)
- `.chapter-header`, `.chapter-number`, `.chapter-title`, `.chapter-subtitle`
- `.body-text`, `.intro-text`, `.drop-cap`
- `.word-card`, `.word-card-script`, `.word-card-title`, `.word-card-lang`
- `.quote-block`, `.quote-text`, `.quote-source`
- `.three-interlude` (width: calc(100% + 6rem), 55vh, bryder ud af content-wrapper)
- `.divider`
- `.closing`, `.closing-names`, `.closing-colophon`
- `.note-block`

## BYGGE-RÆKKEFØLGE

1. Byg index.html med al markup + CSS. Inkluder `<script src="scenes.js"></script>` i bunden.
2. Byg scenes.js — start med fælles fundament, derefter hero, derefter scene 1-7 i rækkefølge.
3. Test i browser, juster timing og farver.

## DEPLOY
GitHub Pages fra main branch root.
