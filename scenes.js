/* ============================================================
   HJERTETS VEJE — scenes.js
   Three.js r128 (indlæst via CDN i index.html)
   ============================================================ */

/* ---------- FARVEPALET ---------- */
const PALETTE = {
  creme:     0xf5efe6,
  bordeaux:  0x6b2737,
  bordeauxD: 0x4a1824,
  guld:      0xc4a265,
  guldLight: 0xd4bb82,
  rosa:      0xb8707a,
  rosaLight: 0xd4a0a8,
  warmGrey:  0x8a7e76,
  amber:     0xd4a070,
  lilla:     0x7a6a8a,
  teal:      0x4a7a8a,
  indigo:    0x2a3a5a,
  soelv:     0xc0c8d0,
  blodrod:   0x8a2030,
  salvie:    0x6a9a7a,
  sand:      0xd8c095,
  koral:     0xe08878,
  mahogni:   0x8a4838,
  mosgroen:  0x6a8858,
  terracotta:0xc07258,
  lavendel:  0xa898c0,
  fersken:   0xecb090,
  honning:   0xe0b060,
};

/* ---------- EASING ---------- */
function easeOutCubic(t) {
  t = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutQuad(t) {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/* ---------- BLØD CIRKEL-TEKSTUR ----------
   En radial gradient-tekstur der gør THREE.Points til
   bløde, glødende cirkler i stedet for firkanter. */
let _softCircleTexture = null;
function softCircleTexture() {
  if (_softCircleTexture) return _softCircleTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _softCircleTexture = new THREE.CanvasTexture(canvas);
  return _softCircleTexture;
}

/* ---------- HJERTE-PARAMETRIK ----------
   Standard parametrisk hjertekurve.
   t ∈ [0, 2π] → (x, y) på enhedshjerte; skaleres med `scale`. */
function heartPoint(t, scale) {
  scale = scale || 1;
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  // Normaliser (heartkurven har ~17 enheders bredde, ~17 højde)
  return { x: (x / 17) * scale, y: (y / 17) * scale };
}

/* ---------- SCENE-FUNDAMENT ----------
   Opretter scene, camera, renderer for en given container.
   Returnerer { scene, camera, renderer, container, state }.
   state indeholder { active, startTime } — bruges af animationer.
   En IntersectionObserver tracker om containeren er synlig og
   nulstiller startTime når scenen igen kommer i view. */
function initScene(containerId, fov) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();

  const width  = container.clientWidth  || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const camera = new THREE.PerspectiveCamera(fov || 55, width / height, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const state = {
    active: false,
    startTime: 0,
    width: width,
    height: height,
  };

  // Resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    state.width = w;
    state.height = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // IntersectionObserver: nulstil startTime når scenen kommer i view
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!state.active) {
          state.startTime = performance.now();
        }
        state.active = true;
      } else {
        state.active = false;
      }
    });
  }, { threshold: 0.15 });
  io.observe(container);

  return { scene, camera, renderer, container, state };
}

/* ---------- SCROLL-REVEAL (sektioner) ----------
   Separat observer der tilføjer .visible til .section-elementer. */
function initScrollReveal() {
  const sections = document.querySelectorAll('.section');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ============================================================
   HERO — "Regnen i hele verden"
   Tårer der stille falder ned gennem rummet. Evigt, roligt regnfald.
   800 partikler med lille sinusbølge-svajen. Wrap til top ved bund.
   ============================================================ */
function initHero() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  // ---- Partikler ----
  const COUNT = 800;
  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  const speeds    = new Float32Array(COUNT);      // faldhastighed
  const phases    = new Float32Array(COUNT);      // sinusfase for svajen
  const sizes     = new Float32Array(COUNT);

  // Synligt område: bredde ~12, højde ~14 ved z=0 med fov 60/z=6
  const FIELD_W = 14;
  const FIELD_H = 16;

  const colorChoices = [
    new THREE.Color(PALETTE.guld),
    new THREE.Color(PALETTE.guldLight),
    new THREE.Color(PALETTE.rosa),
    new THREE.Color(PALETTE.bordeaux),
  ];

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * FIELD_W;
    positions[i3 + 1] = (Math.random() - 0.5) * FIELD_H;
    positions[i3 + 2] = (Math.random() - 0.5) * 4;

    const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    colors[i3]     = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;

    speeds[i] = 0.004 + Math.random() * 0.012;      // langsomt fald
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i]  = 0.04 + Math.random() * 0.08;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.18,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Animation ----
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();
    const pos = geo.attributes.position.array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // Fald
      pos[i3 + 1] -= speeds[i];

      // Blid sinussvajen på x-aksen
      pos[i3] += Math.sin(t * 0.6 + phases[i]) * 0.0008;

      // Wrap til toppen når den når bunden
      if (pos[i3 + 1] < -FIELD_H / 2) {
        pos[i3 + 1] = FIELD_H / 2;
        pos[i3]     = (Math.random() - 0.5) * FIELD_W;
      }
    }

    geo.attributes.position.needsUpdate = true;

    // Meget blid vejrtrækning i hele feltet
    points.rotation.z = Math.sin(t * 0.1) * 0.02;

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ============================================================
   SCENE 1 — Kapitel I: "Alle steder på én gang"
   12 klynger ankommer fra alle retninger og finder hinanden
   i et fælles, orbiterende felt.
   ============================================================ */
function initScene1() {
  const ctx = initScene('scene1', 55);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);

  const CLUSTERS = 12;
  const PER_CLUSTER = 80;
  const COUNT = CLUSTERS * PER_CLUSTER; // 960

  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);

  // Per-partikel data: origin, target, cluster-indeks, orbit-fase
  const origins = new Float32Array(COUNT * 3);
  const targets = new Float32Array(COUNT * 3);
  const phases  = new Float32Array(COUNT);

  // 12 varme nuancer — én per cluster
  const clusterColors = [
    PALETTE.guld, PALETTE.rosa, PALETTE.bordeaux, PALETTE.amber,
    PALETTE.sand, PALETTE.koral, PALETTE.mahogni, PALETTE.mosgroen,
    PALETTE.terracotta, PALETTE.lavendel, PALETTE.fersken, PALETTE.honning,
  ].map((hex) => new THREE.Color(hex));

  for (let c = 0; c < CLUSTERS; c++) {
    // Unik retning for hvert cluster — fordelt jævnt på kuglen
    const phi   = Math.acos(1 - 2 * (c + 0.5) / CLUSTERS);
    const theta = Math.PI * (1 + Math.sqrt(5)) * c; // golden angle
    const originRadius = 8 + Math.random() * 4;     // 8-12
    const ox = originRadius * Math.sin(phi) * Math.cos(theta);
    const oy = originRadius * Math.sin(phi) * Math.sin(theta);
    const oz = originRadius * Math.cos(phi) * 0.4;  // fladere på z

    const col = clusterColors[c];

    for (let p = 0; p < PER_CLUSTER; p++) {
      const i = c * PER_CLUSTER + p;
      const i3 = i * 3;

      // Origin med lille spread omkring clusterets udgangspunkt
      origins[i3]     = ox + (Math.random() - 0.5) * 0.8;
      origins[i3 + 1] = oy + (Math.random() - 0.5) * 0.8;
      origins[i3 + 2] = oz + (Math.random() - 0.5) * 0.8;

      // Target: løs sfære om centrum, radius 1.5–3
      const tPhi   = Math.acos(2 * Math.random() - 1);
      const tTheta = Math.random() * Math.PI * 2;
      const tR     = 1.5 + Math.random() * 1.5;
      targets[i3]     = tR * Math.sin(tPhi) * Math.cos(tTheta);
      targets[i3 + 1] = tR * Math.sin(tPhi) * Math.sin(tTheta);
      targets[i3 + 2] = tR * Math.cos(tPhi) * 0.6;

      // Start-position = origin
      positions[i3]     = origins[i3];
      positions[i3 + 1] = origins[i3 + 1];
      positions[i3 + 2] = origins[i3 + 2];

      colors[i3]     = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      phases[i] = Math.random() * Math.PI * 2;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.16,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Animation ----
  const ARRIVAL_DURATION = 8; // sekunder

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    const t = Math.min(elapsed / ARRIVAL_DURATION, 1);
    const eased = easeOutCubic(t);

    const pos = geo.attributes.position.array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // Interpolér origin → target
      const tx = origins[i3]     + (targets[i3]     - origins[i3])     * eased;
      const ty = origins[i3 + 1] + (targets[i3 + 1] - origins[i3 + 1]) * eased;
      const tz = origins[i3 + 2] + (targets[i3 + 2] - origins[i3 + 2]) * eased;

      // Efter ankomst: blid svæv omkring target
      const postT = Math.max(0, elapsed - ARRIVAL_DURATION);
      const drift = eased; // fuld drift kun når næsten ankommet
      const wob = 0.08 * drift;
      pos[i3]     = tx + Math.sin(postT * 0.4 + phases[i])       * wob;
      pos[i3 + 1] = ty + Math.cos(postT * 0.35 + phases[i] * 1.3) * wob;
      pos[i3 + 2] = tz + Math.sin(postT * 0.3 + phases[i] * 0.7)  * wob;
    }

    geo.attributes.position.needsUpdate = true;

    // Langsom orbit-rotation af hele feltet (0.05 rad/s)
    points.rotation.y = elapsed * 0.05;
    points.rotation.x = Math.sin(elapsed * 0.03) * 0.1;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 2 — Kapitel II: "Hjertets tilblivelse"
   Embryologisk grundlag: cardiac looping.
   Det primitive hjerterør opstår blødt, bøjer sig til en C-loop,
   foldes videre til en trefoil-knude, og folder sig til sidst
   ud som et hjerte. (Männer 2000; Voronov 2004.)

   Faser (total 10s):
     0.0 – 2.8s  EMERGE:  partikler strømmer ind → blødt hjerterør
     2.8 – 4.8s  BEND:    røret bøjer sig til en C-loop
     4.8 – 6.8s  KNOT:    C-loopen folder sig til en trefoil-knude
     6.8 – 10s   UNFOLD:  knuden folder sig ud til et hjerte,
                          rotation aftager til face-on, heartbeat
   Gennem hele sekvensen: rolig, harmonisk rotation i både
   y- og x-plan — strukturen ses fra forskellige dimensioner.
   ============================================================ */
function initScene2() {
  const ctx = initScene('scene2', 50);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5);

  const COUNT = 2500;

  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);

  const origins      = new Float32Array(COUNT * 3); // startposition, langt ude
  const tubeTargets  = new Float32Array(COUNT * 3); // blødt hjerterør
  const cTargets     = new Float32Array(COUNT * 3); // bøjet C-loop
  const knotTargets  = new Float32Array(COUNT * 3); // trefoil-knude
  const heartTargets = new Float32Array(COUNT * 3); // endeligt hjerte
  const phases       = new Float32Array(COUNT);

  // Farvepalet — fire farver blandet frit blandt alle partikler
  const palette = [
    new THREE.Color(PALETTE.rosaLight),
    new THREE.Color(PALETTE.guld),
    new THREE.Color(PALETTE.rosa),
    new THREE.Color(PALETTE.bordeaux),
  ];

  const TUBE_LENGTH = 3.4;
  const TUBE_RADIUS = 0.55;      // bredere og blødere end før
  const ARC_R = 1.7;
  const ARC_SPAN = Math.PI * 0.75;
  const C_CENTER_SHIFT = ARC_R * 0.35;
  const KNOT_SCALE = 0.6;
  const HEART_SCALE = 2.3;

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // Per-partikel parameter
    const u = Math.random();                        // 0–1 langs røret
    const a = Math.random() * Math.PI * 2;          // vinkel om røret
    // Blødere radius-fordeling: større variation, nogle partikler
    // helt ude, andre inde. Gør røret diffust i stedet for skarpt.
    const rRand = Math.pow(Math.random(), 0.7);     // bias mod kanten men ikke stiv
    const r = TUBE_RADIUS * rRand;
    // Ekstra tilfældig offset for at slørre kanten
    const jx = (Math.random() - 0.5) * 0.18;
    const jy = (Math.random() - 0.5) * 0.22;
    const jz = (Math.random() - 0.5) * 0.18;

    // --- Origin: stor sfære, jævnt fordelt ---
    const oPhi   = Math.acos(2 * Math.random() - 1);
    const oTheta = Math.random() * Math.PI * 2;
    const oR     = 7 + Math.random() * 3;
    origins[i3]     = oR * Math.sin(oPhi) * Math.cos(oTheta);
    origins[i3 + 1] = oR * Math.sin(oPhi) * Math.sin(oTheta);
    origins[i3 + 2] = oR * Math.cos(oPhi) * 0.45;

    // --- TUBE-target: blødt, diffust hjerterør ---
    tubeTargets[i3]     = r * Math.cos(a) + jx;
    tubeTargets[i3 + 1] = (u - 0.5) * TUBE_LENGTH + jy;
    tubeTargets[i3 + 2] = r * Math.sin(a) + jz;

    // --- C-target: blødt bøjet C-loop ---
    const theta = (u - 0.5) * ARC_SPAN;
    const bx = ARC_R * (1 - Math.cos(theta));
    const by = ARC_R * Math.sin(theta);
    const nx = Math.cos(theta);
    const ny = -Math.sin(theta);
    cTargets[i3]     = bx + r * Math.cos(a) * nx - C_CENTER_SHIFT + jx;
    cTargets[i3 + 1] = by + r * Math.cos(a) * ny + jy;
    cTargets[i3 + 2] = r * Math.sin(a) + jz;

    // --- KNOT-target: trefoil-knude ---
    // Parametrisk: (sin t + 2 sin 2t, cos t - 2 cos 2t, -sin 3t)
    const kt = u * Math.PI * 2;
    const kx = (Math.sin(kt) + 2 * Math.sin(2 * kt)) * KNOT_SCALE;
    const ky = (Math.cos(kt) - 2 * Math.cos(2 * kt)) * KNOT_SCALE;
    const kz = -Math.sin(3 * kt) * KNOT_SCALE;
    // Blødt offset omkring kurven — ingen stram tube
    const kJitter = 0.22;
    knotTargets[i3]     = kx + (Math.random() - 0.5) * kJitter + r * 0.3 * Math.cos(a);
    knotTargets[i3 + 1] = ky + (Math.random() - 0.5) * kJitter + r * 0.3 * Math.sin(a);
    knotTargets[i3 + 2] = kz + (Math.random() - 0.5) * kJitter;

    // --- HEART-target: punkt i hjertefyld ---
    const ht = Math.random() * Math.PI * 2;
    const hp = heartPoint(ht, HEART_SCALE);
    const fill = Math.pow(Math.random(), 0.55);
    heartTargets[i3]     = hp.x * fill + (Math.random() - 0.5) * 0.1;
    heartTargets[i3 + 1] = hp.y * fill + (Math.random() - 0.5) * 0.1;
    heartTargets[i3 + 2] = (Math.random() - 0.5) * 0.5;

    // Start ved origin
    positions[i3]     = origins[i3];
    positions[i3 + 1] = origins[i3 + 1];
    positions[i3 + 2] = origins[i3 + 2];

    // Tilfældig farve fra paletten
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i3]     = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;

    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.11,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Fase-timing (sekunder) ---- total 10s
  const T_EMERGE_END = 2.8;   // 0.0 → 2.8  origin → blødt rør
  const T_BEND_END   = 4.8;   // 2.8 → 4.8  rør → C-loop
  const T_KNOT_END   = 6.8;   // 4.8 → 6.8  C → trefoil-knude
  const T_UNFOLD_END = 10.0;  // 6.8 → 10.0 knude → hjerte + settle

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    const pos = geo.attributes.position.array;

    // Fase-parametre (hver 0→1 i sin fase)
    let emergeT = 0, bendT = 0, knotT = 0, unfoldT = 0;
    if (elapsed < T_EMERGE_END) {
      emergeT = elapsed / T_EMERGE_END;
    } else if (elapsed < T_BEND_END) {
      emergeT = 1;
      bendT = (elapsed - T_EMERGE_END) / (T_BEND_END - T_EMERGE_END);
    } else if (elapsed < T_KNOT_END) {
      emergeT = 1; bendT = 1;
      knotT = (elapsed - T_BEND_END) / (T_KNOT_END - T_BEND_END);
    } else if (elapsed < T_UNFOLD_END) {
      emergeT = 1; bendT = 1; knotT = 1;
      unfoldT = (elapsed - T_KNOT_END) / (T_UNFOLD_END - T_KNOT_END);
    } else {
      emergeT = 1; bendT = 1; knotT = 1; unfoldT = 1;
    }
    const emergeE = easeInOutQuad(emergeT);
    const bendE   = easeInOutQuad(bendT);
    const knotE   = easeInOutQuad(knotT);
    const unfoldE = easeInOutQuad(unfoldT);

    const heartDone = elapsed > T_UNFOLD_END;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let px, py, pz;

      if (bendT === 0) {
        // FASE 1: origin → tube
        px = lerp(origins[i3],     tubeTargets[i3],     emergeE);
        py = lerp(origins[i3 + 1], tubeTargets[i3 + 1], emergeE);
        pz = lerp(origins[i3 + 2], tubeTargets[i3 + 2], emergeE);
      } else if (knotT === 0) {
        // FASE 2: tube → C
        px = lerp(tubeTargets[i3],     cTargets[i3],     bendE);
        py = lerp(tubeTargets[i3 + 1], cTargets[i3 + 1], bendE);
        pz = lerp(tubeTargets[i3 + 2], cTargets[i3 + 2], bendE);
      } else if (unfoldT === 0) {
        // FASE 3: C → knude
        px = lerp(cTargets[i3],     knotTargets[i3],     knotE);
        py = lerp(cTargets[i3 + 1], knotTargets[i3 + 1], knotE);
        pz = lerp(cTargets[i3 + 2], knotTargets[i3 + 2], knotE);
      } else {
        // FASE 4: knude → hjerte
        px = lerp(knotTargets[i3],     heartTargets[i3],     unfoldE);
        py = lerp(knotTargets[i3 + 1], heartTargets[i3 + 1], unfoldE);
        pz = lerp(knotTargets[i3 + 2], heartTargets[i3 + 2], unfoldE);
      }

      // Blid drift under emerge-fasen (aftagende)
      const driftAmp = (1 - emergeE) * 0.04;
      px += Math.sin(elapsed * 0.5 + phases[i])       * driftAmp;
      py += Math.cos(elapsed * 0.45 + phases[i] * 1.3) * driftAmp;

      // Heartbeat efter samling
      if (heartDone) {
        const beatT = (elapsed - T_UNFOLD_END) * (70 / 60);
        const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)), 4);
        const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.15) * Math.PI * 2)), 6) * 0.6;
        const pulse = 1 + (beat + beat2) * 0.07;
        px = heartTargets[i3]     * pulse;
        py = heartTargets[i3 + 1] * pulse;
        pz = heartTargets[i3 + 2];
      }

      pos[i3]     = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
    }

    geo.attributes.position.needsUpdate = true;

    // --- Rotation ---
    // Bygger op gennem emerge+bend+knot, aftager til 0 under unfold.
    let amp;
    if (elapsed < T_KNOT_END) {
      amp = Math.min(1, elapsed / T_KNOT_END);
    } else if (elapsed < T_UNFOLD_END) {
      amp = 1 - easeInOutQuad(unfoldT);
    } else {
      amp = 0;
    }

    // Rolige, harmoniske sinusbølger — forskellige frekvenser i hver akse.
    points.rotation.y = Math.sin(elapsed * 0.55 - 0.3) * 1.0 * amp;
    points.rotation.x = Math.sin(elapsed * 0.42 + 0.7) * 0.6 * amp;
    points.rotation.z = Math.sin(elapsed * 0.30 + 0.2) * 0.18 * amp;

    if (heartDone) {
      const post = elapsed - T_UNFOLD_END;
      points.rotation.y = Math.sin(post * 0.18) * 0.04;
      points.rotation.x = Math.sin(post * 0.14 + 0.6) * 0.025;
      points.rotation.z = 0;
    }

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 3 — Kapitel III: "Lynet og overgivelsen"
   Sonjas vej. Et før. Et lyn. Og en lang, langsom tilbagevenden
   til et nyt og mere levende liv.

   Narrativets struktur:
     FØR       – et sammenholdt, levende felt (hendes liv)
     LYN       – et kort glimt der ændrer alt
     SPREDNING – en kort chokudadbevægelse
     DVALE     – to års immobiliseret ventetid (partiklerne står
                  næsten stille i suspenderet tid, fjernt fra
                  hinanden, farven drænet af liv)
     TILBAGEVENDEN – langsom, rolig genfinden af hinanden;
                  harmoniske rotationer i flere dimensioner;
                  farven vender gradvist tilbage, varmere end før
     NY FORM   – bredere, mere åben og mere levende end den
                  oprindelige form. En blid ånding i ro.

   Faser (total 10s):
     0.0 – 1.8s  FØR:       sammenholdt oval, blid ånding (indigo)
     1.8 – 2.1s  LYN:       flash, partikler blinker hvidt
     2.1 – 3.0s  SPREDNING: hurtig udadbevægelse (easeOutCubic)
     3.0 – 5.8s  DVALE:     spredte partikler i næsten-stilstand
                            (de "to år" — minimalt drift, drænet)
     5.8 – 9.0s  TILBAGE:   langsom gensamling til ny form,
                            rolige harmoniske rotationer i begge
                            planer, farve varmer op mod gylden
     9.0 – 10s   NY FORM:   bredere, åbnere, blid ånding, varm
   ============================================================ */
function initScene3() {
  const ctx = initScene('scene3', 50);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5.6);

  const COUNT = 1800;
  const positions  = new Float32Array(COUNT * 3);

  const beforePos  = new Float32Array(COUNT * 3); // oprindelig sammenholdt form
  const radialDir  = new Float32Array(COUNT * 3); // eksplosionsretning
  const dormantPos = new Float32Array(COUNT * 3); // spredt dvaleposition
  const afterPos   = new Float32Array(COUNT * 3); // ny åben form
  const phases     = new Float32Array(COUNT);
  const dormantJitter = new Float32Array(COUNT * 3); // lille drift under dvale

  const SHATTER_DIST = 4.2;

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // --- FØR: sammenholdt oval ellipsoide 1.5 × 1.05 × 0.7 ---
    const phi   = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const rr    = Math.pow(Math.random(), 0.55);
    const bx = rr * Math.sin(phi) * Math.cos(theta) * 1.5;
    const by = rr * Math.sin(phi) * Math.sin(theta) * 1.05;
    const bz = rr * Math.cos(phi) * 0.7;
    beforePos[i3]     = bx;
    beforePos[i3 + 1] = by;
    beforePos[i3 + 2] = bz;

    // Radial retning for spredning
    const len = Math.sqrt(bx * bx + by * by + bz * bz) + 0.001;
    radialDir[i3]     = bx / len;
    radialDir[i3 + 1] = by / len;
    radialDir[i3 + 2] = bz / len;

    // --- DVALE: shatter-slutposition + lille random forskydning ---
    // Partiklerne stopper dér hvor spredningen lander og hænger i
    // suspension. Vi gemmer kun en lille offset per partikel —
    // baseposition beregnes i animate som calmPos + dir*SHATTER_DIST.
    dormantJitter[i3]     = (Math.random() - 0.5) * 0.45;
    dormantJitter[i3 + 1] = (Math.random() - 0.5) * 0.45;
    dormantJitter[i3 + 2] = (Math.random() - 0.5) * 0.3;

    // --- NY FORM: bredere, åbnere, mere dimensional ---
    // En bred, blidt buet skål/linse — større end "før"-formen.
    // Fyld med bias mod centrum-mellem så formen føles fuld, ikke tom.
    const ntheta = Math.random() * Math.PI * 2;
    const nrBias = Math.pow(Math.random(), 0.45); // bias mod ydre
    const nr     = nrBias * 2.5;
    afterPos[i3]     = nr * Math.cos(ntheta) * 1.05;
    afterPos[i3 + 1] = nr * Math.sin(ntheta) * 0.78 - 0.15;
    afterPos[i3 + 2] = -0.14 * nr * nr + (Math.random() - 0.5) * 0.35;

    // Midlertidigt — partiklen starter ved før-position
    positions[i3]     = bx;
    positions[i3 + 1] = by;
    positions[i3 + 2] = bz;

    // Gem dvale-baseposition (=shatter-endpos) til senere
    dormantPos[i3]     = bx + radialDir[i3]     * SHATTER_DIST + dormantJitter[i3];
    dormantPos[i3 + 1] = by + radialDir[i3 + 1] * SHATTER_DIST + dormantJitter[i3 + 1];
    dormantPos[i3 + 2] = bz + radialDir[i3 + 2] * SHATTER_DIST + dormantJitter[i3 + 2];

    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.13,
    map: softCircleTexture(),
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    color: 0x3a2a5a, // dyb indigo — livet før
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // --- Lynet: zigzag fra top til bund, gengivet som tætte partikler
  //     langs polylinen så den læses tydeligt på cream-baggrunden ---
  const LIGHTNING_SEGMENTS = 12;
  const lightningBase = []; // [{x, y}] i 2D
  for (let i = 0; i <= LIGHTNING_SEGMENTS; i++) {
    const t = i / LIGHTNING_SEGMENTS;
    lightningBase.push({
      x: (Math.random() - 0.5) * 1.8,
      y: 3.6 - t * 7.2,
    });
  }
  // Sample punkter langs alle segmenter
  const LIGHTNING_POINTS_PER_SEG = 30;
  const LIGHTNING_COUNT = LIGHTNING_SEGMENTS * LIGHTNING_POINTS_PER_SEG;
  const lightningPositions = new Float32Array(LIGHTNING_COUNT * 3);
  for (let s = 0; s < LIGHTNING_SEGMENTS; s++) {
    const a = lightningBase[s];
    const b = lightningBase[s + 1];
    for (let p = 0; p < LIGHTNING_POINTS_PER_SEG; p++) {
      const t = p / LIGHTNING_POINTS_PER_SEG;
      const i3 = (s * LIGHTNING_POINTS_PER_SEG + p) * 3;
      lightningPositions[i3]     = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 0.03;
      lightningPositions[i3 + 1] = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 0.03;
      lightningPositions[i3 + 2] = 0.1;
    }
  }
  const lightningGeo = new THREE.BufferGeometry();
  lightningGeo.setAttribute('position', new THREE.BufferAttribute(lightningPositions, 3));
  const lightningMat = new THREE.PointsMaterial({
    size: 0.14,
    map: softCircleTexture(),
    color: 0x4a1824, // dyb bordeaux — læses som en sprække i kompositionen
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const lightning = new THREE.Points(lightningGeo, lightningMat);
  scene.add(lightning);

  // ---- Farver til transitioner ----
  const colBefore  = new THREE.Color(0x3a2a5a); // dyb indigo — livet før
  const colFlash   = new THREE.Color(0xfff0a8); // varm hvid — lynet
  const colDormant = new THREE.Color(0x5a5260); // drænet grå-lilla — dvale
  const colAfter   = new THREE.Color(0xc47840); // varm gylden amber — nyt liv
  const tmpColor = new THREE.Color();

  // ---- Fase-timing (sekunder) ---- total 10s
  const T_BEFORE_END  = 1.8;
  const T_FLASH_END   = 2.1;
  const T_SHATTER_END = 3.0;
  const T_DORMANT_END = 5.8;
  const T_RETURN_END  = 9.0;
  const T_TOTAL       = 10.0;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    const pos = geo.attributes.position.array;

    // Fase-parametre
    let shatterT = 0, dormantT = 0, returnT = 0;
    if (elapsed < T_FLASH_END) {
      // før + flash
    } else if (elapsed < T_SHATTER_END) {
      shatterT = (elapsed - T_FLASH_END) / (T_SHATTER_END - T_FLASH_END);
    } else if (elapsed < T_DORMANT_END) {
      shatterT = 1;
      dormantT = (elapsed - T_SHATTER_END) / (T_DORMANT_END - T_SHATTER_END);
    } else if (elapsed < T_RETURN_END) {
      shatterT = 1; dormantT = 1;
      returnT = (elapsed - T_DORMANT_END) / (T_RETURN_END - T_DORMANT_END);
    } else {
      shatterT = 1; dormantT = 1; returnT = 1;
    }
    const shatterE = 1 - Math.pow(1 - shatterT, 3); // easeOutCubic
    const returnE  = easeInOutQuad(returnT);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let x, y, z;

      if (elapsed < T_FLASH_END) {
        // FØR + LYN: blid ånding omkring beforePos
        const drift = 0.05;
        x = beforePos[i3]     + Math.sin(elapsed * 0.55 + phases[i])       * drift;
        y = beforePos[i3 + 1] + Math.cos(elapsed * 0.48 + phases[i] * 1.3) * drift;
        z = beforePos[i3 + 2];
      } else if (elapsed < T_SHATTER_END) {
        // SPREDNING: hurtig udadbevægelse
        const d = shatterE * SHATTER_DIST;
        x = beforePos[i3]     + radialDir[i3]     * d;
        y = beforePos[i3 + 1] + radialDir[i3 + 1] * d;
        z = beforePos[i3 + 2] + radialDir[i3 + 2] * d;
      } else if (elapsed < T_DORMANT_END) {
        // DVALE: næsten-stilstand. Minimalt drift — tiden står stille.
        const drift = 0.03;
        x = dormantPos[i3]     + Math.sin(elapsed * 0.15 + phases[i])       * drift;
        y = dormantPos[i3 + 1] + Math.cos(elapsed * 0.12 + phases[i] * 1.1) * drift;
        z = dormantPos[i3 + 2];
      } else if (elapsed < T_RETURN_END) {
        // TILBAGEVENDEN: langsomt easeInOutQuad fra dvale → ny form
        x = lerp(dormantPos[i3],     afterPos[i3],     returnE);
        y = lerp(dormantPos[i3 + 1], afterPos[i3 + 1], returnE);
        z = lerp(dormantPos[i3 + 2], afterPos[i3 + 2], returnE);
      } else {
        // NY FORM: blid ånding omkring afterPos — mere levende
        const breath = Math.sin((elapsed - T_RETURN_END) * 0.9) * 0.04;
        x = afterPos[i3]     * (1 + breath);
        y = afterPos[i3 + 1] * (1 + breath);
        z = afterPos[i3 + 2];
      }

      pos[i3]     = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
    }

    geo.attributes.position.needsUpdate = true;

    // --- Farvetint gennem faser ---
    if (elapsed < T_BEFORE_END) {
      mat.color.copy(colBefore);
    } else if (elapsed < T_FLASH_END) {
      // Flash: sinusformet pulse op til varm hvid og tilbage
      const ft = (elapsed - T_BEFORE_END) / (T_FLASH_END - T_BEFORE_END);
      const amount = Math.sin(ft * Math.PI);
      tmpColor.copy(colBefore).lerp(colFlash, amount);
      mat.color.copy(tmpColor);
    } else if (elapsed < T_SHATTER_END) {
      // Spredning: farven drænes fra indigo mod dvale-grå
      const st = (elapsed - T_FLASH_END) / (T_SHATTER_END - T_FLASH_END);
      tmpColor.copy(colBefore).lerp(colDormant, st);
      mat.color.copy(tmpColor);
    } else if (elapsed < T_DORMANT_END) {
      // Dvale: drænet farve, uændret
      mat.color.copy(colDormant);
    } else if (elapsed < T_RETURN_END) {
      // Tilbagevenden: farven varmer langsomt op mod gylden amber
      const rt = (elapsed - T_DORMANT_END) / (T_RETURN_END - T_DORMANT_END);
      tmpColor.copy(colDormant).lerp(colAfter, easeInOutQuad(rt));
      mat.color.copy(tmpColor);
    } else {
      mat.color.copy(colAfter);
    }

    // --- Lynet ---
    if (elapsed > T_BEFORE_END && elapsed < T_FLASH_END) {
      const ft = (elapsed - T_BEFORE_END) / (T_FLASH_END - T_BEFORE_END);
      lightningMat.opacity = Math.max(0, 1 - ft);
    } else {
      lightningMat.opacity = 0;
    }

    // --- Rotation ---
    // Næsten ingen rotation under ro og dvale.
    // Harmoniske rotationer i begge planer under TILBAGEVENDEN,
    // der aftager mod 0 så den nye form lander face-on.
    let rotAmp = 0;
    if (elapsed >= T_DORMANT_END && elapsed < T_RETURN_END) {
      // Sinusform: bygger op og aftager. Peaker midt i returen.
      rotAmp = Math.sin(Math.PI * returnE);
    }
    points.rotation.y = Math.sin(elapsed * 0.42) * 0.85 * rotAmp;
    points.rotation.x = Math.sin(elapsed * 0.33 + 0.7) * 0.48 * rotAmp;

    if (elapsed > T_RETURN_END) {
      const post = elapsed - T_RETURN_END;
      points.rotation.y = Math.sin(post * 0.22) * 0.035;
      points.rotation.x = Math.sin(post * 0.16 + 0.5) * 0.022;
    }

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 4 — Kapitel IV: "Stilhedens kilde"
   Stilheden er ikke et sted, men en kilde der uophørligt
   strømmer. Fra et varmt lyspunkt i bunden vælder partikler
   op i blide buer, når et fælles apex, og falder tilbage
   mod kilden hvor de opsluges og fødes igen. En evig,
   rolig fontæne af stilhed.

   Ingen faser — scenen er én kontinuerlig tilstand, som en
   vandkunst der bare er der. Når man betragter den længe nok
   begynder man at mærke dens indre rytme.

   Farvegradient: partiklerne bærer varm gylden ved kilden,
   kølner gradvist til sølv/teal jo længere de er fra den,
   og varmer op igen når de falder tilbage.
   ============================================================ */
function initScene4() {
  const ctx = initScene('scene4', 45);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0.1, 5.3);

  const COUNT = 1500;
  const positions    = new Float32Array(COUNT * 3);
  const colors       = new Float32Array(COUNT * 3);
  const birthTimes   = new Float32Array(COUNT);
  const initVel      = new Float32Array(COUNT * 3);
  const spawnJitter  = new Float32Array(COUNT * 3);
  const phases       = new Float32Array(COUNT);

  // Kilden: et lyspunkt i bunden af rammen
  const SOURCE_Y = -1.35;
  const GRAVITY  = 0.2;     // blid tyngdekraft — fontænen er rolig
  const MAX_LIFE = 7.5;     // sekunder fra fødsel til genfødsel

  // Ny tilfældig hastighed for en partikel — opadbiased, let spredt
  function randomFountainVel(arr, i3) {
    const speed = 0.56 + Math.random() * 0.22;
    const theta = Math.random() * Math.PI * 2;
    // Højdevinkel: 54–86° over horisontalen (mest opad)
    const elev  = Math.PI * 0.3 + Math.random() * Math.PI * 0.2;
    const vRad  = speed * Math.cos(elev);
    arr[i3]     = Math.cos(theta) * vRad;
    arr[i3 + 1] = speed * Math.sin(elev);
    arr[i3 + 2] = Math.sin(theta) * vRad * 0.55; // lidt fladere i z
  }

  // Initialisér: hver partikel får et tilfældigt fødselstidspunkt
  // fordelt bagud i tiden, så vi ved t=0 har partikler på alle
  // stadier af flyvningen (kontinuerlig fontæne fra start).
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    birthTimes[i] = -Math.random() * MAX_LIFE;
    randomFountainVel(initVel, i3);
    spawnJitter[i3]     = (Math.random() - 0.5) * 0.08;
    spawnJitter[i3 + 1] = (Math.random() - 0.5) * 0.08;
    spawnJitter[i3 + 2] = (Math.random() - 0.5) * 0.08;
    phases[i] = Math.random() * Math.PI * 2;

    // Beregn initial position fra fødselspunkt + hastighed + tyngdekraft
    const age = -birthTimes[i];
    positions[i3]     = spawnJitter[i3]     + initVel[i3]     * age;
    positions[i3 + 1] = SOURCE_Y + spawnJitter[i3 + 1] + initVel[i3 + 1] * age
                        - 0.5 * GRAVITY * age * age;
    positions[i3 + 2] = spawnJitter[i3 + 2] + initVel[i3 + 2] * age;

    colors[i3] = 0.8; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.8;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.13,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Farver ----
  // Partiklerne farves baseret på afstand fra kilden:
  //   nær kilden = varm gylden (det der vækkes)
  //   langt fra kilden = dyb teal (det modne, lyttende)
  const colSource = new THREE.Color(0xd4a060); // varm gylden
  const colFar    = new THREE.Color(0x4a6a82); // dyb teal
  const MAX_DIST  = 2.6;

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let age = elapsed - birthTimes[i];

      // Genfødsel når livet er omme
      if (age > MAX_LIFE) {
        birthTimes[i] = elapsed;
        randomFountainVel(initVel, i3);
        spawnJitter[i3]     = (Math.random() - 0.5) * 0.08;
        spawnJitter[i3 + 1] = (Math.random() - 0.5) * 0.08;
        spawnJitter[i3 + 2] = (Math.random() - 0.5) * 0.08;
        age = 0;
      }

      // Ballistisk trajectory fra kilden
      const sx = spawnJitter[i3];
      const sy = SOURCE_Y + spawnJitter[i3 + 1];
      const sz = spawnJitter[i3 + 2];

      let px = sx + initVel[i3]     * age;
      let py = sy + initVel[i3 + 1] * age - 0.5 * GRAVITY * age * age;
      let pz = sz + initVel[i3 + 2] * age;

      // Blid wobble — kun på x/z for at bevare trajectory-mønsteret
      const wob = 0.013;
      px += Math.sin(elapsed * 0.6 + phases[i])       * wob;
      pz += Math.cos(elapsed * 0.5 + phases[i] * 1.3) * wob;

      pos[i3]     = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;

      // Farve baseret på afstand fra kilde
      const dx = px;
      const dy = py - SOURCE_Y;
      const dz = pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const t = Math.min(1, dist / MAX_DIST);
      col[i3]     = colSource.r + (colFar.r - colSource.r) * t;
      col[i3 + 1] = colSource.g + (colFar.g - colSource.g) * t;
      col[i3 + 2] = colSource.b + (colFar.b - colSource.b) * t;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    // Meget lille vuggen — fontænen er næsten stationær
    points.rotation.y = Math.sin(elapsed * 0.08) * 0.04;
    points.rotation.x = Math.sin(elapsed * 0.06 + 0.4) * 0.02;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 5 — Kapitel V: "Fra hjerte til hånd"
   Berøringens kunst. I centrum: et pulserende hjerte. Fra
   hjertets to sider strømmer energi i blide, meridian-agtige
   S-kurver ud og ned til to hænder. Strømmen er uafbrudt —
   partikler der uophørligt rejser fra hjertet til hånden,
   bærende hjertets intention med sig.

   "Jeg ønsker afstanden fra hjertet til hånden
    så kort som muligt." — Jørgen Leth

   Kontinuerlig tilstand (ingen faser).
   ============================================================ */
function initScene5() {
  const ctx = initScene('scene5', 50);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);

  // ---- Fælles geometri-helper: cubic bezier ----
  const rightBezier = {
    p0: [ 0.55, 0.45, 0.00],
    p1: [ 1.55, 0.95, 0.35],
    p2: [ 2.20,-0.45,-0.25],
    p3: [ 2.70,-1.60, 0.00],
  };
  const leftBezier = {
    p0: [-0.55, 0.45, 0.00],
    p1: [-1.55, 0.95, 0.35],
    p2: [-2.20,-0.45,-0.25],
    p3: [-2.70,-1.60, 0.00],
  };

  function cubicBezier(b, t, out) {
    const u = 1 - t;
    const w0 = u * u * u;
    const w1 = 3 * u * u * t;
    const w2 = 3 * u * t * t;
    const w3 = t * t * t;
    out[0] = w0 * b.p0[0] + w1 * b.p1[0] + w2 * b.p2[0] + w3 * b.p3[0];
    out[1] = w0 * b.p0[1] + w1 * b.p1[1] + w2 * b.p2[1] + w3 * b.p3[1];
    out[2] = w0 * b.p0[2] + w1 * b.p1[2] + w2 * b.p2[2] + w3 * b.p3[2];
  }

  // ============================================================
  // HJERTE: 600 partikler, mindre version af scene 2's hjerte
  // ============================================================
  const HEART_COUNT = 600;
  const heartPositions = new Float32Array(HEART_COUNT * 3);
  const heartColors    = new Float32Array(HEART_COUNT * 3);
  const heartBase      = new Float32Array(HEART_COUNT * 3);

  const HEART_SCALE = 1.0;
  const HEART_OFFSET_Y = 0.4;

  for (let i = 0; i < HEART_COUNT; i++) {
    const i3 = i * 3;
    const t  = Math.random() * Math.PI * 2;
    const hp = heartPoint(t, HEART_SCALE);
    const fill = Math.pow(Math.random(), 0.55);
    heartBase[i3]     = hp.x * fill + (Math.random() - 0.5) * 0.08;
    heartBase[i3 + 1] = hp.y * fill + HEART_OFFSET_Y + (Math.random() - 0.5) * 0.08;
    heartBase[i3 + 2] = (Math.random() - 0.5) * 0.32;
    heartPositions[i3]     = heartBase[i3];
    heartPositions[i3 + 1] = heartBase[i3 + 1];
    heartPositions[i3 + 2] = heartBase[i3 + 2];

    // Bordeaux variationer
    const bright = 0.9 + Math.random() * 0.2;
    heartColors[i3]     = 0.42 * bright; // 6b2737 ≈ (0.42, 0.15, 0.22)
    heartColors[i3 + 1] = 0.15 * bright;
    heartColors[i3 + 2] = 0.22 * bright;
  }

  const heartGeo = new THREE.BufferGeometry();
  heartGeo.setAttribute('position', new THREE.BufferAttribute(heartPositions, 3));
  heartGeo.setAttribute('color',    new THREE.BufferAttribute(heartColors, 3));

  const heartMat = new THREE.PointsMaterial({
    size: 0.11,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const heartMesh = new THREE.Points(heartGeo, heartMat);
  scene.add(heartMesh);

  // ============================================================
  // STRØM: 800 partikler (400 per arm) der flyder langs bezier-kurver
  // ============================================================
  const ARM_COUNT = 400;
  const STREAM_TOTAL = ARM_COUNT * 2;
  const streamPositions  = new Float32Array(STREAM_TOTAL * 3);
  const streamColors     = new Float32Array(STREAM_TOTAL * 3);
  const streamInitPhase  = new Float32Array(STREAM_TOTAL);
  const streamArm        = new Int8Array(STREAM_TOTAL); // 0=venstre, 1=højre
  const streamWobPhase   = new Float32Array(STREAM_TOTAL);
  const streamSpeed      = new Float32Array(STREAM_TOTAL); // lille variation

  for (let i = 0; i < STREAM_TOTAL; i++) {
    streamInitPhase[i] = Math.random();
    streamArm[i]       = i < ARM_COUNT ? 0 : 1;
    streamWobPhase[i]  = Math.random() * Math.PI * 2;
    streamSpeed[i]     = 0.08 + Math.random() * 0.025; // ca. 10–12s per fuld rejse
  }

  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
  streamGeo.setAttribute('color',    new THREE.BufferAttribute(streamColors, 3));

  const streamMat = new THREE.PointsMaterial({
    size: 0.095,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const streamMesh = new THREE.Points(streamGeo, streamMat);
  scene.add(streamMesh);

  // ============================================================
  // HÆNDER: små glødende klynger ved bezier-endepunkterne
  // ============================================================
  const HAND_PER = 55;
  const HAND_TOTAL = HAND_PER * 2;
  const handPositions = new Float32Array(HAND_TOTAL * 3);
  const handColors    = new Float32Array(HAND_TOTAL * 3);
  const handBase      = new Float32Array(HAND_TOTAL * 3);

  const handCenters = [
    [leftBezier.p3[0],  leftBezier.p3[1],  leftBezier.p3[2]],
    [rightBezier.p3[0], rightBezier.p3[1], rightBezier.p3[2]],
  ];

  for (let h = 0; h < 2; h++) {
    for (let i = 0; i < HAND_PER; i++) {
      const idx = h * HAND_PER + i;
      const i3 = idx * 3;
      const phi   = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const rr    = Math.pow(Math.random(), 0.55) * 0.28;
      const dx = rr * Math.sin(phi) * Math.cos(theta);
      const dy = rr * Math.sin(phi) * Math.sin(theta);
      const dz = rr * Math.cos(phi);
      handBase[i3]     = handCenters[h][0] + dx;
      handBase[i3 + 1] = handCenters[h][1] + dy;
      handBase[i3 + 2] = handCenters[h][2] + dz;
      handPositions[i3]     = handBase[i3];
      handPositions[i3 + 1] = handBase[i3 + 1];
      handPositions[i3 + 2] = handBase[i3 + 2];
      // Rosa d4a0a8 ≈ (0.83, 0.63, 0.66)
      const bright = 0.88 + Math.random() * 0.18;
      handColors[i3]     = 0.83 * bright;
      handColors[i3 + 1] = 0.63 * bright;
      handColors[i3 + 2] = 0.66 * bright;
    }
  }

  const handGeo = new THREE.BufferGeometry();
  handGeo.setAttribute('position', new THREE.BufferAttribute(handPositions, 3));
  handGeo.setAttribute('color',    new THREE.BufferAttribute(handColors, 3));

  const handMat = new THREE.PointsMaterial({
    size: 0.13,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const handMesh = new THREE.Points(handGeo, handMat);
  scene.add(handMesh);

  // ---- Farver til stream-gradient ----
  const colStreamStart = new THREE.Color(0xc4a265); // guld nær hjertet
  const colStreamEnd   = new THREE.Color(0xd4a0a8); // rosa nær hånden

  const tmpOut = [0, 0, 0];

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;

    // ---- HJERTE: blid, langsom puls ----
    const beatT = elapsed * (48 / 60); // 48 BPM — meditativt tempo
    const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)),     3);
    const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.18) * Math.PI * 2)), 5) * 0.55;
    const pulse = 1 + (beat + beat2) * 0.05;

    const hPos = heartGeo.attributes.position.array;
    for (let i = 0; i < HEART_COUNT; i++) {
      const i3 = i * 3;
      // Skalér om hjertets centrum (0, HEART_OFFSET_Y)
      hPos[i3]     = heartBase[i3]     * pulse;
      hPos[i3 + 1] = (heartBase[i3 + 1] - HEART_OFFSET_Y) * pulse + HEART_OFFSET_Y;
      hPos[i3 + 2] = heartBase[i3 + 2];
    }
    heartGeo.attributes.position.needsUpdate = true;

    // ---- STRØM: partikler advancerer langs bezier ----
    const sPos = streamGeo.attributes.position.array;
    const sCol = streamGeo.attributes.color.array;
    for (let i = 0; i < STREAM_TOTAL; i++) {
      const i3 = i * 3;
      // Fase: kontinuerlig fremrykning + per-partikel start
      const t = (streamInitPhase[i] + elapsed * streamSpeed[i]) % 1;

      const b = streamArm[i] === 0 ? leftBezier : rightBezier;
      cubicBezier(b, t, tmpOut);

      // Blid wobble vinkelret (enkel tilnærmelse), roligt tempo
      const wob = 0.05;
      const wx = Math.sin(elapsed * 1.0 + streamWobPhase[i])       * wob;
      const wy = Math.cos(elapsed * 0.85 + streamWobPhase[i] * 1.3) * wob;
      const wz = Math.sin(elapsed * 0.7 + streamWobPhase[i] * 0.7) * wob;

      sPos[i3]     = tmpOut[0] + wx;
      sPos[i3 + 1] = tmpOut[1] + wy;
      sPos[i3 + 2] = tmpOut[2] + wz;

      // Farve: guld (t=0) → rosa (t=1)
      sCol[i3]     = colStreamStart.r + (colStreamEnd.r - colStreamStart.r) * t;
      sCol[i3 + 1] = colStreamStart.g + (colStreamEnd.g - colStreamStart.g) * t;
      sCol[i3 + 2] = colStreamStart.b + (colStreamEnd.b - colStreamStart.b) * t;
    }
    streamGeo.attributes.position.needsUpdate = true;
    streamGeo.attributes.color.needsUpdate = true;

    // ---- HÆNDER: blid åndende glød ----
    const handBreath = 1 + Math.sin(elapsed * 0.7) * 0.07;
    const hhPos = handGeo.attributes.position.array;
    for (let i = 0; i < HAND_TOTAL; i++) {
      const i3 = i * 3;
      const h  = i < HAND_PER ? 0 : 1;
      const cx = handCenters[h][0];
      const cy = handCenters[h][1];
      const cz = handCenters[h][2];
      hhPos[i3]     = cx + (handBase[i3]     - cx) * handBreath;
      hhPos[i3 + 1] = cy + (handBase[i3 + 1] - cy) * handBreath;
      hhPos[i3 + 2] = cz + (handBase[i3 + 2] - cz) * handBreath;
    }
    handGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 6 — Kapitel VI: "Xin — der hvor alt mødes"
   Det kinesiske tegn xin 心 er tre dråber blod. Mencius sagde
   at xin rummer fire spirer: medfølelse, skam, høflighed,
   dømmekraft. Vores arbejde er ikke at tilføje noget, men at
   lade det, der allerede er der, vokse.

   Tre stille dråber ankommer og tænder som tre punkter af liv.
   Ud af det, de har formet sammen, rejser fire farvede spirer
   sig langsomt — ikke tilføjet, men voksende fra det iboende.

   Faser (total 10s):
     0.0 – 3.2s  DRÅBER: tre dråber falder og tænder sekventielt
                          (dråbe 1 fra 0.0s, 2 fra 0.8s, 3 fra 1.6s)
     3.2 – 4.0s  HVILE:  de tre punkter glimter blidt sammen
     4.0 – 9.0s  SPIRER: fire farvede spirer rejser sig langsomt
                         fra mellem de tre dråber, i fælles vækst
     9.0 – 10s   STILHED: spirerne står i fuld blomst, dråberne
                          glimter stille som grundlag
   ============================================================ */
function initScene6() {
  const ctx = initScene('scene6', 45);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, -0.1, 5.5);

  // ---- Timing ----
  const DROP_STARTS     = [0.0, 0.7, 1.4]; // sekventiel tænding
  const DROP_FALL_DUR   = 1.6;             // rolig, blød tænding
  const SPROUT_START    = 3.6;             // starter efter dråberne har hvilet
  const SPROUT_DURATION = 5.4;             // langsom blomstring

  // De tre dråber hviler tæt sammen i en blid trekant — xin's grundlag
  const dropAnchors = [
    { x: -0.75, y: -1.20 }, // venstre
    { x:  0.75, y: -1.20 }, // højre
    { x:  0.00, y: -1.55 }, // midte (trekantsspids nedad)
  ];
  const DROP_START_Y = 2.9;

  // De fire spirer udspringer alle fra et fælles punkt i centrum
  // af dråbernes trekant, og folder sig ud i en vifte opad.
  // Hver spire har sin egen kvadratiske bezier-kurve (start, ctrl, end).
  const SPROUT_ORIGIN = { x: 0.0, y: -1.3 };
  const sproutPaths = [
    // rosa — medfølelse (yderst til venstre)
    { ctrl: { x: -0.55, y: -0.35 }, end: { x: -1.25, y:  0.55 } },
    // lilla — skam
    { ctrl: { x: -0.18, y: -0.15 }, end: { x: -0.42, y:  1.00 } },
    // salvie — høflighed
    { ctrl: { x:  0.18, y: -0.15 }, end: { x:  0.42, y:  1.00 } },
    // guld — dømmekraft (yderst til højre)
    { ctrl: { x:  0.55, y: -0.35 }, end: { x:  1.25, y:  0.55 } },
  ];

  function quadBezier(sx, sy, cx, cy, ex, ey, t) {
    const u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * ex,
      y: u * u * sy + 2 * u * t * cy + t * t * ey,
    };
  }

  // Mencius' fire spirer
  const sproutPalette = [
    new THREE.Color(0xd4a0a8), // rosa — medfølelse
    new THREE.Color(0x7a6a8a), // lilla — skam
    new THREE.Color(0x6a9a7a), // salvie — høflighed
    new THREE.Color(0xc4a265), // guld — dømmekraft
  ];

  // ============================================================
  // DRÅBER: 3 × 140 partikler i blød tåreform
  // ============================================================
  const DROP_PER = 140;
  const DROP_TOTAL = 3 * DROP_PER;
  const dropPositions = new Float32Array(DROP_TOTAL * 3);
  const dropColors    = new Float32Array(DROP_TOTAL * 3);
  const dropLocal     = new Float32Array(DROP_TOTAL * 3);
  const dropIdx       = new Int8Array(DROP_TOTAL);
  const dropPhases    = new Float32Array(DROP_TOTAL);

  for (let d = 0; d < 3; d++) {
    for (let p = 0; p < DROP_PER; p++) {
      const i = d * DROP_PER + p;
      const i3 = i * 3;

      // Blød dråbeform: bredere øverst, smallere nederst, blød kant
      const yNorm = Math.random();
      const rMax  = 0.26 * Math.pow(yNorm + 0.1, 0.55);
      const rr    = Math.sqrt(Math.random()) * rMax;
      const theta = Math.random() * Math.PI * 2;
      dropLocal[i3]     = rr * Math.cos(theta);
      dropLocal[i3 + 1] = (yNorm - 0.42) * 0.85;
      dropLocal[i3 + 2] = rr * Math.sin(theta);
      dropIdx[i] = d;
      dropPhases[i] = Math.random() * Math.PI * 2;

      // Bordeaux 6b2737 — mindre blodrød, mere i hjertets familie
      const bright = 0.88 + Math.random() * 0.2;
      dropColors[i3]     = 0.42 * bright;
      dropColors[i3 + 1] = 0.15 * bright;
      dropColors[i3 + 2] = 0.22 * bright;

      dropPositions[i3]     = dropAnchors[d].x + dropLocal[i3];
      dropPositions[i3 + 1] = DROP_START_Y      + dropLocal[i3 + 1];
      dropPositions[i3 + 2] =                    dropLocal[i3 + 2];
    }
  }

  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
  dropGeo.setAttribute('color',    new THREE.BufferAttribute(dropColors, 3));
  const dropMat = new THREE.PointsMaterial({
    size: 0.1,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const dropMesh = new THREE.Points(dropGeo, dropMat);
  scene.add(dropMesh);

  // ============================================================
  // SPIRER: 4 grupper × 80 partikler der vokser langs bezier
  // ============================================================
  const SPROUTS = 4;
  const SPROUT_PER = 80;
  const SPROUT_TOTAL = SPROUTS * SPROUT_PER;
  const sproutPositions = new Float32Array(SPROUT_TOTAL * 3);
  const sproutColors    = new Float32Array(SPROUT_TOTAL * 3);
  const sproutPhase     = new Float32Array(SPROUT_TOTAL); // 0-1 langs bezier
  const sproutJitterX   = new Float32Array(SPROUT_TOTAL);
  const sproutJitterY   = new Float32Array(SPROUT_TOTAL);
  const sproutJitterZ   = new Float32Array(SPROUT_TOTAL);
  const sproutGroupIdx  = new Int8Array(SPROUT_TOTAL);
  const sproutWobPhase  = new Float32Array(SPROUT_TOTAL);

  for (let s = 0; s < SPROUTS; s++) {
    const col = sproutPalette[s];
    for (let p = 0; p < SPROUT_PER; p++) {
      const i = s * SPROUT_PER + p;
      const i3 = i * 3;
      // Jævn fordeling langs bezier-kurven, lille random spredning
      sproutPhase[i] = p / SPROUT_PER + (Math.random() - 0.5) * 0.02;
      // Spiren er smal ved basen, bredere mod toppen (blomstrende)
      const flareScale = Math.pow(sproutPhase[i], 0.7);
      sproutJitterX[i] = (Math.random() - 0.5) * 0.15 * flareScale;
      sproutJitterY[i] = (Math.random() - 0.5) * 0.08 * flareScale;
      sproutJitterZ[i] = (Math.random() - 0.5) * 0.13 * flareScale;
      sproutGroupIdx[i] = s;
      sproutWobPhase[i] = Math.random() * Math.PI * 2;

      const bright = 0.88 + Math.random() * 0.22;
      sproutColors[i3]     = col.r * bright;
      sproutColors[i3 + 1] = col.g * bright;
      sproutColors[i3 + 2] = col.b * bright;

      sproutPositions[i3]     = -100;
      sproutPositions[i3 + 1] = -100;
      sproutPositions[i3 + 2] = 0;
    }
  }

  const sproutGeo = new THREE.BufferGeometry();
  sproutGeo.setAttribute('position', new THREE.BufferAttribute(sproutPositions, 3));
  sproutGeo.setAttribute('color',    new THREE.BufferAttribute(sproutColors, 3));
  const sproutMat = new THREE.PointsMaterial({
    size: 0.095,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const sproutMesh = new THREE.Points(sproutGeo, sproutMat);
  scene.add(sproutMesh);

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;

    // ---- DRÅBER: tænder sekventielt og bliver stående som grundlag ----
    const dPos = dropGeo.attributes.position.array;
    for (let i = 0; i < DROP_TOTAL; i++) {
      const i3 = i * 3;
      const d = dropIdx[i];
      const dropT = elapsed - DROP_STARTS[d];

      if (dropT < 0) {
        // Før fødsel: langt over rammen
        dPos[i3]     = dropAnchors[d].x + dropLocal[i3];
        dPos[i3 + 1] = DROP_START_Y      + dropLocal[i3 + 1];
        dPos[i3 + 2] =                    dropLocal[i3 + 2];
      } else if (dropT < DROP_FALL_DUR) {
        // Faldende: blødt easeInOutQuad
        const tNorm = dropT / DROP_FALL_DUR;
        const eased = easeInOutQuad(tNorm);
        const y = DROP_START_Y + (dropAnchors[d].y - DROP_START_Y) * eased;
        dPos[i3]     = dropAnchors[d].x + dropLocal[i3];
        dPos[i3 + 1] = y                 + dropLocal[i3 + 1];
        dPos[i3 + 2] =                    dropLocal[i3 + 2];
      } else {
        // Ankommet: blid ånding på plads
        const rest = dropT - DROP_FALL_DUR;
        const br = 1 + Math.sin(rest * 0.9 + dropPhases[i]) * 0.025;
        dPos[i3]     = dropAnchors[d].x + dropLocal[i3]     * br;
        dPos[i3 + 1] = dropAnchors[d].y + dropLocal[i3 + 1] * br;
        dPos[i3 + 2] =                    dropLocal[i3 + 2];
      }
    }
    dropGeo.attributes.position.needsUpdate = true;

    // ---- SPIRER: langsom, blomstrende opvækst langs bezier ----
    const sPos = sproutGeo.attributes.position.array;
    const sproutT = Math.max(0, elapsed - SPROUT_START);
    const growth = Math.min(1, sproutT / SPROUT_DURATION);
    const growthEased = easeInOutQuad(growth);

    for (let i = 0; i < SPROUT_TOTAL; i++) {
      const i3 = i * 3;
      const s = sproutGroupIdx[i];
      const path = sproutPaths[s];

      // Partikler åbenbares fra basen op efterhånden som spiren vokser
      const currentPhase = Math.min(sproutPhase[i], growthEased);

      if (sproutT <= 0) {
        sPos[i3]     = -100;
        sPos[i3 + 1] = -100;
        sPos[i3 + 2] = 0;
      } else {
        const bp = quadBezier(
          SPROUT_ORIGIN.x, SPROUT_ORIGIN.y,
          path.ctrl.x, path.ctrl.y,
          path.end.x, path.end.y,
          currentPhase
        );
        // Blid vuggen — større jo højere oppe (mere vind mod toppen)
        const sway = Math.sin(elapsed * 0.55 + sproutWobPhase[i] + s * 0.9)
                   * 0.04 * currentPhase;

        sPos[i3]     = bp.x + sproutJitterX[i] + sway;
        sPos[i3 + 1] = bp.y + sproutJitterY[i];
        sPos[i3 + 2] = sproutJitterZ[i];
      }
    }
    sproutGeo.attributes.position.needsUpdate = true;

    // ---- Meget blid, harmonisk rotation ----
    const rotDecay = Math.max(0, 1 - Math.max(0, (elapsed - 8)) / 2);
    dropMesh.rotation.y = Math.sin(elapsed * 0.12) * 0.08 * rotDecay;
    sproutMesh.rotation.y = dropMesh.rotation.y;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE 7 — Kapitel VII: "Det fælles hjerte"
   20 små individuelle hjerter — hver i sin farve fra alle de
   foregående scener — svæver roligt i rummet. Langsomt driver
   de mod centrum og smelter sammen til ét stort pulserende
   mosaik-hjerte der indeholder alle farver. Alle hjertets tårer
   bydes velkommen.

   Faser (total 10s):
     0.0 – 3.5s  FLYDE:    20 små hjerter flyder roligt, hver
                           med egen rotation og drift
     3.5 – 8.5s  SAMLE:    easeInOutQuad drift mod centrum,
                           overlapning, sammensmelting
     8.5 – 10s   ÉT HJERTE: et stort mosaik-hjerte pulserer i ro
   ============================================================ */
function initScene7() {
  const ctx = initScene('scene7', 50);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);

  // 20 hjerter × 80 partikler = 1600
  const HEARTS = 20;
  const PER_HEART = 80;
  const COUNT = HEARTS * PER_HEART;

  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  // Per-partikel lokal position i sit hjerte (parametrisk)
  const localPos  = new Float32Array(COUNT * 3);
  const heartIdx  = new Int16Array(COUNT);

  // Per-hjerte data
  const heartHome  = []; // startposition (spredt)
  const heartFinal = []; // endelig position i mosaik-hjertet
  const heartScaleHome  = []; // lille skala i flydefase
  const heartRotHome    = []; // egen rotation i flydefase
  const heartPhase      = []; // drift fase

  // 20 farver fra hele paletten
  const palette20 = [
    0x6b2737, 0xc4a265, 0xb8707a, 0xd4a0a8, 0x8a7e76,
    0x4a7a8a, 0x2a3a5a, 0x7a6a8a, 0x6a9a7a, 0xd4a070,
    0x3a5a78, 0xc07258, 0xa898c0, 0xecb090, 0xe0b060,
    0xd4bb82, 0x8a4838, 0x6a8858, 0x486886, 0xe08878,
  ].map(h => new THREE.Color(h));

  const BIG_HEART_SCALE = 2.5; // størrelsen af det endelige fælles hjerte
  const SMALL_HEART_SCALE = 0.55; // størrelsen af hvert lille hjerte

  // Fordel 20 hjerter jævnt i et stort felt
  for (let h = 0; h < HEARTS; h++) {
    // Home: spredt på ring/felt
    const phi = Math.acos(1 - 2 * (h + 0.5) / HEARTS);
    const theta = Math.PI * (1 + Math.sqrt(5)) * h; // golden angle
    const r = 2.0 + Math.random() * 1.0;
    heartHome.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta) * 0.7,
      z: r * Math.cos(phi) * 0.4,
    });

    // Final: tilfældige punkter i et stort hjerte — alle hjerter
    // fordeler deres partikler i det fælles mosaik
    heartFinal.push({ assigned: false });

    heartScaleHome.push(SMALL_HEART_SCALE * (0.85 + Math.random() * 0.3));
    heartRotHome.push({
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    });
    heartPhase.push(Math.random() * Math.PI * 2);
  }

  // Initialiser partikler per hjerte
  for (let h = 0; h < HEARTS; h++) {
    const col = palette20[h];
    const home = heartHome[h];
    const scale = heartScaleHome[h];

    for (let p = 0; p < PER_HEART; p++) {
      const i = h * PER_HEART + p;
      const i3 = i * 3;

      // Partikel på/i hjertekurve
      const t = Math.random() * Math.PI * 2;
      const hp = heartPoint(t, 1.0); // enhedshjerte
      const fill = Math.pow(Math.random(), 0.55);
      localPos[i3]     = hp.x * fill;
      localPos[i3 + 1] = hp.y * fill;
      localPos[i3 + 2] = (Math.random() - 0.5) * 0.25;

      heartIdx[i] = h;

      // Initial position = home + localPos * scale
      positions[i3]     = home.x + localPos[i3]     * scale;
      positions[i3 + 1] = home.y + localPos[i3 + 1] * scale;
      positions[i3 + 2] = home.z + localPos[i3 + 2] * scale;

      const bright = 0.88 + Math.random() * 0.2;
      colors[i3]     = col.r * bright;
      colors[i3 + 1] = col.g * bright;
      colors[i3 + 2] = col.b * bright;
    }
  }

  // Precompute final positions — hver partikel får en tilfældig plads
  // i det store mosaik-hjerte, uafhængigt af hvilket lille hjerte
  // den kom fra. Dette skaber sammensmeltningen.
  const mosaicPos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const t = Math.random() * Math.PI * 2;
    const hp = heartPoint(t, BIG_HEART_SCALE);
    const fill = Math.pow(Math.random(), 0.55);
    mosaicPos[i3]     = hp.x * fill + (Math.random() - 0.5) * 0.12;
    mosaicPos[i3 + 1] = hp.y * fill + (Math.random() - 0.5) * 0.12;
    mosaicPos[i3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.09,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- Fase-timing ----
  const T_FLOAT_END  = 3.5;
  const T_MERGE_END  = 8.5;

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    const pos = geo.attributes.position.array;

    // Fase-parametre
    let mergeT = 0;
    if (elapsed > T_FLOAT_END && elapsed < T_MERGE_END) {
      mergeT = (elapsed - T_FLOAT_END) / (T_MERGE_END - T_FLOAT_END);
    } else if (elapsed >= T_MERGE_END) {
      mergeT = 1;
    }
    const mergeE = easeInOutQuad(mergeT);

    // Heartbeat efter samling
    const beatStart = T_MERGE_END;
    let pulse = 1;
    if (elapsed > beatStart) {
      const beatT = (elapsed - beatStart) * (58 / 60);
      const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)),     3);
      const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.17) * Math.PI * 2)), 5) * 0.55;
      pulse = 1 + (beat + beat2) * 0.06;
    }

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const h = heartIdx[i];
      const home = heartHome[h];
      const rot  = heartRotHome[h];
      const scale = heartScaleHome[h];
      const phase = heartPhase[h];

      // Position i flydefase: hjertet roterer om sit eget center
      // med eget drift
      const spinY = rot.ry + elapsed * rot.spin;
      const cosY = Math.cos(spinY), sinY = Math.sin(spinY);
      // Rotér localPos omkring y-aksen
      const lx = localPos[i3];
      const ly = localPos[i3 + 1];
      const lz = localPos[i3 + 2];
      const rx = cosY * lx + sinY * lz;
      const rz = -sinY * lx + cosY * lz;

      const driftX = Math.sin(elapsed * 0.25 + phase)       * 0.08;
      const driftY = Math.cos(elapsed * 0.22 + phase * 1.3) * 0.06;

      const floatX = home.x + driftX + rx * scale;
      const floatY = home.y + driftY + ly * scale;
      const floatZ = home.z         + rz * scale;

      // Mosaik position (slutmål)
      const mx = mosaicPos[i3]     * pulse;
      const my = mosaicPos[i3 + 1] * pulse;
      const mz = mosaicPos[i3 + 2];

      // Interpolér
      pos[i3]     = floatX + (mx - floatX) * mergeE;
      pos[i3 + 1] = floatY + (my - floatY) * mergeE;
      pos[i3 + 2] = floatZ + (mz - floatZ) * mergeE;
    }

    geo.attributes.position.needsUpdate = true;

    // Blid rotation af hele scenen under samling, aftager til ro
    const rotDecay = 1 - mergeE;
    points.rotation.y = Math.sin(elapsed * 0.18) * 0.12 * rotDecay;
    points.rotation.x = Math.sin(elapsed * 0.13 + 0.5) * 0.07 * rotDecay;

    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   INIT — start alt når DOM er klar
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initHero();
  initScene1();
  initScene2();
  initScene3();
  initScene4();
  initScene5();
  initScene6();
  initScene7();
});
