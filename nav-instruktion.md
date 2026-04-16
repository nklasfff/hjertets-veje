# NAVIGATION OG SKÆRM-STRUKTUR — instruktion til Claude Code

Denne fil beskriver, hvordan de fire skærme skal integreres i appen.
Hele appen skal fortsat være ÉN `index.html` — ingen separate sider.
Skærmskift sker via URL-fragments og JavaScript.

---

## DE FIRE SKÆRME

| Fragment | Navn | Kilde |
|----------|------|-------|
| `#veje` (default) | Hjertets Veje | `content.md` (allerede implementeret) |
| `#embryologi` | Embryologien | `embryologi.md` |
| `#rejse` | Dit hjertes rejse | `rejse.md` |
| `#hjerter` | De andre hjerter | `hjerter.md` |

---

## HTML-STRUKTUR

Inde i `<main>` wrappes alt indhold i fire sektioner:

```html
<main>
  <section class="screen" data-screen="veje">
    <!-- alt eksisterende indhold: hero, intro, kapitler, scener -->
  </section>

  <section class="screen" data-screen="embryologi" hidden>
    <!-- indhold fra embryologi.md -->
  </section>

  <section class="screen" data-screen="rejse" hidden>
    <!-- indhold fra rejse.md -->
  </section>

  <section class="screen" data-screen="hjerter" hidden>
    <!-- indhold fra hjerter.md -->
  </section>
</main>

<nav class="screen-nav">
  <a href="#veje" data-nav="veje">Hjertets Veje</a>
  <a href="#embryologi" data-nav="embryologi">Embryologien</a>
  <a href="#rejse" data-nav="rejse">Dit hjertes rejse</a>
  <a href="#hjerter" data-nav="hjerter">De andre hjerter</a>
</nav>
```

---

## NAVIGATION — VISUEL KARAKTER

- **Position**: `position: fixed; bottom: 0; left: 0; right: 0;` — altid synlig.
- **Baggrund**: Cream med blur — `background: rgba(245,239,230,0.92); backdrop-filter: blur(12px);` — så hovedindhold anes svagt bag.
- **Top-border**: 1px solid rgba(196,162,101,0.2) — en stille guld-linje.
- **Padding**: `padding: 0.9rem 1.5rem;`
- **Layout**: Flex, centreret, gap mellem links.
- **Typografi**: `font-family: 'Instrument Sans';  font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;` — diskret, næsten som fodnoter.
- **Farve**: `color: var(--warm-gray);` for inaktive, `color: var(--bordeaux);` for aktiv.
- **Aktivt link**: Får en tynd guld-understregning (`border-bottom: 1px solid var(--gold); padding-bottom: 2px;`).
- **Hover**: Skifter til bordeaux, ingen understregning på hover.
- **Ingen ikoner** — kun tekst. Det matcher appens meditative karakter.

### Responsivitet
På smalle skærme (<600px):
- Navigation bliver scrollbar vandret hvis den er for bred.
- Eller: Brug kortere labels: "Veje · Embryo · Rejse · Hjerter".
- Font-size kan reduceres til 0.65rem.

### Body-padding
Tilføj `padding-bottom: 80px;` til `body` eller `main` så indhold ikke skjules bag den faste navigation.

---

## JAVASCRIPT — SKÆRMSKIFT

```javascript
(function() {
  const screens = document.querySelectorAll('.screen');
  const navLinks = document.querySelectorAll('.screen-nav a');

  function showScreen(name) {
    // Skjul alle, vis den valgte
    screens.forEach(s => {
      s.hidden = (s.dataset.screen !== name);
    });
    // Opdatér nav highlighting
    navLinks.forEach(a => {
      a.classList.toggle('active', a.dataset.nav === name);
    });
    // Scroll til top ved skift
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'veje';
    const valid = ['veje', 'embryologi', 'rejse', 'hjerter'];
    showScreen(valid.includes(hash) ? hash : 'veje');
  }

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange(); // Kør ved load
})();
```

---

## THREE.JS — VIGTIGT

- Three.js-scenerne (`#scene1` til `#scene7` og `#heroCanvas`) ligger inde i skærm `veje`. Når `veje` er skjult (`hidden`), skal scenerne IKKE rendere — det sparer CPU.
- `scenes.js` bruger allerede IntersectionObserver. Når en skærm er `hidden`, rapporterer observeren `isIntersecting: false`, så scenerne pauser automatisk. **Ingen ændringer i scenes.js nødvendige.**
- Bekræft dog at det faktisk virker efter implementering.

---

## localStorage TIL DIT HJERTES REJSE

Se `rejse.md` for detaljerede specifikationer. Kort:

```javascript
const STORAGE_KEY = 'hjertets-veje-rejse';

function saveReflection(id, text) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  data[id] = text;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadReflections() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  document.querySelectorAll('textarea[data-reflection]').forEach(t => {
    const id = t.dataset.reflection;
    if (data[id]) t.value = data[id];
  });
}

// Debounced save on input
document.querySelectorAll('textarea[data-reflection]').forEach(t => {
  let timer;
  t.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveReflection(t.dataset.reflection, t.value), 500);
  });
});

loadReflections(); // Kør ved load
```

---

## BYGGE-RÆKKEFØLGE FOR CLAUDE CODE

1. **Wrap eksisterende indhold** i `<section class="screen" data-screen="veje">`.
2. **Tilføj tre nye sektioner** (embryologi, rejse, hjerter) som `hidden` — brug indhold fra de respektive `.md`-filer.
3. **Tilføj navigation** i bunden af `<body>` (uden for `<main>`).
4. **Tilføj CSS** for `.screen-nav` og dens børn.
5. **Tilføj JavaScript** nederst i `<body>` for skærmskift + localStorage.
6. **Test** at:
   - Default-load viser Hjertets Veje
   - Alle fire links fungerer
   - URL-fragments kan deles og genindlæses korrekt
   - Three.js-scener pauser når skærmen skiftes væk
   - localStorage gemmer og genindlæser refleksioner
   - Navigation er synlig og læsbar på mobil

---

## HVAD DER IKKE SKAL RØRES

- `scenes.js` — hvis den allerede findes og fungerer, rør den ikke.
- `content.md` — den er allerede implementeret i HTML.
- Eksisterende CSS-variabler og klasser for hovedteksten.
- Typografi, farver, scroll-reveal på hovedsiden.
