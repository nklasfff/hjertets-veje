# DIT HJERTES REJSE — refleksionsspørgsmål

Denne fil beskriver skærmen `#rejse`. Tolv invitationer i et ubrudt,
roligt flow, hvor læseren kan skrive sine egne ord. Teksten gemmes i
browserens localStorage (nøgle: `hjertets-veje-rejse`).

---

## [HEADER]

pretitle: En invitation
title: Dit hjertes rejse
subtitle: Spørgsmål til stilheden i dig

---

## [INTRO]

Spørgsmål som disse har ingen svar, der kan gives hurtigt. De skal leves med. Nogle rører noget med det samme. Andre må have tid. Det, du skriver her, gemmes kun i denne browser og tilhører kun dig.

---

## [INVITATIONER]

reflection_1:
  prompt: Hvor i din krop mærker du dit hjerte lige nu? Ikke pulsen, men tilstedeværelsen. Er der et sted, hvor det er lukket? Et sted, hvor det er åbent?

reflection_2:
  prompt: Tænk på et menneske, der har lært dit hjerte noget. Ikke nødvendigvis gennem kærlighed. Måske gennem tab. Hvad var det, det menneske lærte dig?

reflection_3:
  prompt: Hvornår har du sidst mærket overgivelse? Ikke som opgivelse, men som den bevægelse, hvor du holdt op med at kæmpe. Hvad gav sig i dig dengang?

reflection_4:
  prompt: Er der noget, dit hjerte længe har prøvet at fortælle dig, som du ikke helt har turdet lytte til? Du behøver ikke skrive det ned. Bare mærk, om det er der.

reflection_5:
  prompt: Hvilke spor fra dit liv lever stadig i dig? Spor, du måske troede, du havde lagt bag dig, men som viser sig at være en del af, hvordan du stadig bevæger dig i verden.

reflection_6:
  prompt: Hvor er din berøring blødest? Hvor er den hårdest? Hvad siger det om, hvor du bor i dig selv lige nu?

reflection_7:
  prompt: Når du tænker på det fælles hjerte, ikke som idé, men som noget du har mærket, hvornår har du sidst stået i det? Med hvem? I hvilket rum?

reflection_8:
  prompt: Hvad er dit hjerte trætte af? Og hvad længes det efter?

reflection_9:
  prompt: Hvis stilheden i dig kunne tale, hvad tror du, den ville sige? Skriv det første, der kommer. Også hvis det ingen mening giver.

reflection_10:
  prompt: Er der noget i dig, du ved er der, men som endnu ikke helt er trådt frem? Hvad kalder det på?

reflection_11:
  prompt: Forestil dig, at dit hjerte kunne vælge én ting at give slip på i dag. Hvad ville det være?

reflection_12:
  prompt: Og hvis dit hjerte kunne byde én ting velkommen i dag, hvad ville det så være?

---

## [AFSLUTNING]

Der kommer ingen svar udefra. Men der er en vej. Og den vej går igennem dit eget hjerte.

---

## [NOTER TIL CLAUDE CODE]

**Layout for hver invitation:**
- Hver refleksion vises som en sektion med generøs luft omkring
- Prompt-teksten står som et roligt, kursiveret citat (ligner `.quote-text` men uden venstre-border, måske centreret eller med en anden markør)
- Under prompten: et tekstfelt (`<textarea>`) hvor læseren kan skrive
- Tekstfeltet skal være minimalistisk, tynd gold bundlinje, ingen boks, ingen placeholder-tekst der støjer
- Font i textarea: samme som brødtekst (Cormorant Garant), behageligt at skrive i

**localStorage:**
- Gem alle refleksioner under én nøgle: `hjertets-veje-rejse`
- Værdi: JSON-objekt med nummererede felter: `{ "1": "...", "2": "...", ... }`
- Gem automatisk ved input (debounced, fx 500ms)
- Læs ind når siden loades
- Vis en diskret besked nederst: "Dine ord gemmes kun i denne browser"

**Sekventiel følelse:**
- Ingen sektion-titler eller numre der brydes op
- Bare spørgsmål efter spørgsmål, med masser af luft
- Scroll-reveal som hovedsiden, men gerne endnu blidere
- Evt. en tynd vertikal linje til venstre der forbinder alle refleksioner, i guld-farve med lav opacitet

**Mobil:**
- Textarea skal være behagelig at skrive i på mobil, min-height 120px
- Font-size mindst 16px (ellers zoomer iOS ind)
