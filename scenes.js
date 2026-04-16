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
function initScene(containerId, fov, loopDuration) {
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
    loopDuration: loopDuration || 14,
    width: width,
    height: height,
    baseZ: null,
  };

  // Responsive camera: pulls camera back on portrait/narrow screens
  state.updateCamera = function() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const aspect = w / h;
    const portraitFactor = Math.max(1, 1.25 / aspect);
    if (state.baseZ) {
      camera.position.z = state.baseZ * portraitFactor;
    }
    state.width = w;
    state.height = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  // Resize
  window.addEventListener('resize', () => {
    state.updateCamera();
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

/* ---------- AUTO-LOOP HJÆLPER ----------
   Kald i starten af animate() — returnerer elapsed og nulstiller
   startTime automatisk når loopDuration er overskredet. */
function loopElapsed(state) {
  const now = performance.now();
  let elapsed = (now - state.startTime) / 1000;
  if (elapsed > state.loopDuration) {
    state.startTime = now;
    elapsed = 0;
  }
  return elapsed;
}

/* ---------- MOBILE SCALE ----------
   Returns 0..1 factor for scaling wide formations on narrow screens. */
function mobileScale() {
  return Math.min(1, window.innerWidth / 700);
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
  const ctx = initScene('scene1', 55, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);
  state.baseZ = camera.position.z;
  state.updateCamera();

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
    const originRadius = (8 + Math.random() * 4) * (0.7 + 0.3 * mobileScale());     // 8-12, scaled for mobile
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

    const elapsed = loopElapsed(state);
    const t = Math.min(elapsed / ARRIVAL_DURATION, 1);
    const eased = easeOutCubic(t);

    const pos = geo.attributes.position.array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // Interpolér origin → target
      const tx = origins[i3]     + (targets[i3]     - origins[i3])     * eased;
      const ty = origins[i3 + 1] + (targets[i3 + 1] - origins[i3 + 1]) * eased;
      const tz = origins[i3 + 2] + (targets[i3 + 2] - origins[i3 + 2]) * eased;

      // Efter ankomst: kollektiv ånding (expand/contract) + svæv
      const postT = Math.max(0, elapsed - ARRIVAL_DURATION);
      const breath = eased * (1 + Math.sin(postT * 0.7) * 0.08);
      const wob = 0.08 * eased;
      pos[i3]     = tx * breath + Math.sin(postT * 0.4 + phases[i])       * wob;
      pos[i3 + 1] = ty * breath + Math.cos(postT * 0.35 + phases[i] * 1.3) * wob;
      pos[i3 + 2] = tz * breath + Math.sin(postT * 0.3 + phases[i] * 0.7)  * wob;
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
  const ctx = initScene('scene2', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5);
  state.baseZ = camera.position.z;
  state.updateCamera();

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

    const elapsed = loopElapsed(state);
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
        const beatT = (elapsed - T_UNFOLD_END) * (50 / 60);
        const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)), 3);
        const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.18) * Math.PI * 2)), 5) * 0.55;
        const pulse = 1 + (beat + beat2) * 0.04;
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
  const ctx = initScene('scene3', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5.5);
  state.baseZ = camera.position.z;
  state.updateCamera();

  // ---- 1500 partikler i hjerteform ----
  const COUNT = 1500;
  const positions   = new Float32Array(COUNT * 3);
  const heartPos1   = new Float32Array(COUNT * 3); // fase 1: gråt hjerte
  const explodeDir  = new Float32Array(COUNT * 3); // radial eksplosionsretning
  const heartPos2   = new Float32Array(COUNT * 3); // fase 3: nyt farverigt hjerte
  const phases      = new Float32Array(COUNT);

  const EXPLODE_DIST = 4.0;

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // Hjerte 1: heartPoint med udfyldning (scale 1.8)
    const t1 = Math.random() * Math.PI * 2;
    const fill1 = Math.pow(Math.random(), 0.5);
    const hp1 = heartPoint(t1, 1.8);
    const hx = hp1.x * fill1 + (Math.random() - 0.5) * 0.08;
    const hy = hp1.y * fill1 + (Math.random() - 0.5) * 0.08;
    const hz = (Math.random() - 0.5) * 0.4 * fill1;
    heartPos1[i3]     = hx;
    heartPos1[i3 + 1] = hy;
    heartPos1[i3 + 2] = hz;

    // Radial retning fra centrum
    const len = Math.sqrt(hx * hx + hy * hy + hz * hz) + 0.001;
    explodeDir[i3]     = hx / len;
    explodeDir[i3 + 1] = hy / len;
    explodeDir[i3 + 2] = hz / len;

    // Hjerte 2: lidt større (scale 2.0), ny tilfældig fordeling
    const t2 = Math.random() * Math.PI * 2;
    const fill2 = Math.pow(Math.random(), 0.5);
    const hp2 = heartPoint(t2, 2.0);
    heartPos2[i3]     = hp2.x * fill2 + (Math.random() - 0.5) * 0.08;
    heartPos2[i3 + 1] = hp2.y * fill2 + (Math.random() - 0.5) * 0.08;
    heartPos2[i3 + 2] = (Math.random() - 0.5) * 0.45 * fill2;

    // Start i fase 1 hjerteposition
    positions[i3]     = hx;
    positions[i3 + 1] = hy;
    positions[i3 + 2] = hz;

    phases[i] = Math.random() * Math.PI * 2;
  }

  // Per-partikel farver: grå i fase 1, alle paletfarver i fase 3
  const colors = new Float32Array(COUNT * 3);
  const greyCol = new THREE.Color(0x4a4458);
  // Precompute target farve per partikel (alle paletfarver)
  const PAL3 = [0x6b2737,0xc4a265,0xb8707a,0x4a7a8a,0x2a3a5a,0x7a6a8a,0x6a9a7a,0xd4a070,0xd4a0a8,0xe0b060];
  const targetColors = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    // Start grå
    const br = 0.85 + Math.random() * 0.2;
    colors[i3]     = greyCol.r * br;
    colors[i3 + 1] = greyCol.g * br;
    colors[i3 + 2] = greyCol.b * br;
    // Target: tilfældig paletfarve
    const tc = new THREE.Color(PAL3[Math.floor(Math.random() * PAL3.length)]);
    const tbr = 0.85 + Math.random() * 0.2;
    targetColors[i3]     = tc.r * tbr;
    targetColors[i3 + 1] = tc.g * tbr;
    targetColors[i3 + 2] = tc.b * tbr;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.11,
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

  // ---- Lynet: zigzag partikler fra top til bund ----
  const LIGHTNING_SEGMENTS = 12;
  const lightningBase = [];
  for (let i = 0; i <= LIGHTNING_SEGMENTS; i++) {
    const lt = i / LIGHTNING_SEGMENTS;
    lightningBase.push({
      x: (Math.random() - 0.5) * 1.6,
      y: 3.0 - lt * 6.0,
    });
  }
  const LPT_PER_SEG = 28;
  const LIGHTNING_COUNT = LIGHTNING_SEGMENTS * LPT_PER_SEG;
  const lightningPositions = new Float32Array(LIGHTNING_COUNT * 3);
  for (let s = 0; s < LIGHTNING_SEGMENTS; s++) {
    const a = lightningBase[s];
    const b = lightningBase[s + 1];
    for (let p = 0; p < LPT_PER_SEG; p++) {
      const lt = p / LPT_PER_SEG;
      const idx = (s * LPT_PER_SEG + p) * 3;
      lightningPositions[idx]     = a.x + (b.x - a.x) * lt + (Math.random() - 0.5) * 0.04;
      lightningPositions[idx + 1] = a.y + (b.y - a.y) * lt + (Math.random() - 0.5) * 0.04;
      lightningPositions[idx + 2] = 0.1;
    }
  }
  const lightningGeo = new THREE.BufferGeometry();
  lightningGeo.setAttribute('position', new THREE.BufferAttribute(lightningPositions, 3));
  const lightningMat = new THREE.PointsMaterial({
    size: 0.13,
    map: softCircleTexture(),
    color: 0xff8830, // tydelig orange lyn
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const lightning = new THREE.Points(lightningGeo, lightningMat);
  scene.add(lightning);

  // ---- Farver til transition ----
  const colGrey  = new THREE.Color(0x4a4458); // fase 1: grå-indigo
  const colFlash = new THREE.Color(0xff8830); // flash: tydelig orange
  const colWarm  = new THREE.Color(0x8a3040); // fase 3 start: bordeaux
  const colAlive = new THREE.Color(0xc4a265); // fase 3 mål: guld
  const tmpColor = new THREE.Color();

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---- Fase-timing (sekunder) ---- total 12s loop
  // 0–4s:     gråt hjerte pulser langsomt (50 BPM)
  // 4–4.3s:   lynflash — partikler skifter mod hvid
  // 4.3–6s:   eksplosion udad (easeOutCubic)
  // 6–9.5s:   nyt hjerte samles (easeInOutQuad) med spiral
  // 9.5–11s:  nyt hjerte pulser (58 BPM)
  // 11–12s:   hvile inden loop-reset

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;

    // Hjerteslag: 50 BPM (1.2s per slag) — ensartet med alle scener
    const pulse50 = Math.sin(elapsed * (Math.PI * 2 / 1.2));

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      let x, y, z;

      if (elapsed < 4.0) {
        // FASE 1: Gråt hjerte med langsom puls, amplitude 0.04
        const s = 1.0 + pulse50 * 0.04;
        const drift = 0.03;
        x = heartPos1[i3]     * s + Math.sin(elapsed * 0.4 + phases[i]) * drift;
        y = heartPos1[i3 + 1] * s + Math.cos(elapsed * 0.35 + phases[i] * 1.2) * drift;
        z = heartPos1[i3 + 2];

      } else if (elapsed < 4.3) {
        // FASE 2a: Flash — form holdes, farve skifter (i farveblokken)
        const s = 1.0 + pulse50 * 0.04;
        x = heartPos1[i3]     * s;
        y = heartPos1[i3 + 1] * s;
        z = heartPos1[i3 + 2];

      } else if (elapsed < 6.0) {
        // FASE 2b: Eksplosion — partikler skyder udad
        const eT = easeOutCubic((elapsed - 4.3) / 1.7);
        const d = eT * EXPLODE_DIST;
        x = heartPos1[i3]     + explodeDir[i3]     * d;
        y = heartPos1[i3 + 1] + explodeDir[i3 + 1] * d;
        z = heartPos1[i3 + 2] + explodeDir[i3 + 2] * d;

      } else if (elapsed < 9.5) {
        // FASE 3a: Gensamling fra eksplosion til nyt hjerte
        const gT = easeInOutQuad((elapsed - 6.0) / 3.5);
        // Eksplosions-slutposition
        const ex = heartPos1[i3]     + explodeDir[i3]     * EXPLODE_DIST;
        const ey = heartPos1[i3 + 1] + explodeDir[i3 + 1] * EXPLODE_DIST;
        const ez = heartPos1[i3 + 2] + explodeDir[i3 + 2] * EXPLODE_DIST;
        x = lerp(ex, heartPos2[i3],     gT);
        y = lerp(ey, heartPos2[i3 + 1], gT);
        z = lerp(ez, heartPos2[i3 + 2], gT);
        // Spiral under gensamling — aftager med gT
        const spiralAmp = (1 - gT) * 0.3;
        x += Math.sin(elapsed * 1.5 + phases[i]) * spiralAmp;
        y += Math.cos(elapsed * 1.5 + phases[i] * 1.3) * spiralAmp;

      } else if (elapsed < 14.0) {
        // FASE 3b: Nyt hjerte pulser (50 BPM — ensartet)
        const s = 1.0 + pulse50 * 0.04;
        const drift = 0.02;
        x = heartPos2[i3]     * s + Math.sin(elapsed * 0.5 + phases[i]) * drift;
        y = heartPos2[i3 + 1] * s + Math.cos(elapsed * 0.45 + phases[i] * 1.1) * drift;
        z = heartPos2[i3 + 2];

      } else {
        // FASE 4: Hvile — minimal bevægelse
        const drift = 0.015;
        x = heartPos2[i3]     + Math.sin(elapsed * 0.3 + phases[i]) * drift;
        y = heartPos2[i3 + 1] + Math.cos(elapsed * 0.25 + phases[i] * 1.1) * drift;
        z = heartPos2[i3 + 2];
      }

      pos[i3]     = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
    }

    geo.attributes.position.needsUpdate = true;

    // --- Per-vertex farvetransition ---
    const col = geo.attributes.color.array;
    let colorT = 0; // 0=grå, 1=alle farver
    if (elapsed < 4.0) {
      colorT = 0;
    } else if (elapsed < 4.3) {
      // Flash: kort hvid-orange blink via mat.color multiplikator
      const ft = (elapsed - 4.0) / 0.3;
      const flashAmt = Math.sin(ft * Math.PI);
      mat.color.setRGB(1 + flashAmt * 1.5, 1 + flashAmt * 0.3, 1 - flashAmt * 0.3);
      colorT = 0;
    } else if (elapsed < 6.0) {
      mat.color.setRGB(1, 1, 1); // nulstil multiplikator
      colorT = (elapsed - 4.3) / 1.7 * 0.3; // langsom start af farve
    } else if (elapsed < 9.5) {
      colorT = 0.3 + easeInOutQuad((elapsed - 6.0) / 3.5) * 0.7;
    } else {
      colorT = 1;
    }
    // Opdater vertex-farver: lerp fra grå til target-paletfarve
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const br = 0.85 + Math.sin(phases[i]) * 0.1;
      col[i3]     = greyCol.r * br * (1 - colorT) + targetColors[i3]     * colorT;
      col[i3 + 1] = greyCol.g * br * (1 - colorT) + targetColors[i3 + 1] * colorT;
      col[i3 + 2] = greyCol.b * br * (1 - colorT) + targetColors[i3 + 2] * colorT;
    }
    geo.attributes.color.needsUpdate = true;
    if (elapsed >= 4.3) mat.color.setRGB(1, 1, 1); // sikr multiplikator er neutral

    // --- Lynet ---
    if (elapsed >= 4.0 && elapsed < 4.3) {
      const ft = (elapsed - 4.0) / 0.3;
      lightningMat.opacity = Math.max(0, 1 - ft * ft);
    } else {
      lightningMat.opacity = 0;
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
  const ctx = initScene('scene4', 45, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0.1, 5.3);
  state.baseZ = camera.position.z;
  state.updateCamera();

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

    // Tilfældig farve fra hele paletten
    const palIdx = Math.floor(Math.random() * 10);
    const palCols = [0xc4a265,0x6b2737,0xb8707a,0xd4a0a8,0x4a7a8a,0x7a6a8a,0x6a9a7a,0xd4a070,0xe0b060,0xa898c0];
    const pc = new THREE.Color(palCols[palIdx]);
    const br = 0.85 + Math.random() * 0.2;
    colors[i3] = pc.r * br; colors[i3 + 1] = pc.g * br; colors[i3 + 2] = pc.b * br;
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

  // Farver sættes ved init per partikel fra paletten — ingen runtime opdatering

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;

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

      // Farver bevares fra init — ingen runtime ændring
    }

    geo.attributes.position.needsUpdate = true;

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
  const ctx = initScene('scene5', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);
  state.baseZ = camera.position.z;
  state.updateCamera();

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

    // Alle farver fra paletten
    const hPalCols = [0x6b2737,0xc4a265,0xb8707a,0xd4a0a8,0x4a7a8a,0x7a6a8a,0x6a9a7a,0xd4a070,0xe0b060,0xa898c0];
    const hpc = new THREE.Color(hPalCols[Math.floor(Math.random() * hPalCols.length)]);
    const bright = 0.88 + Math.random() * 0.2;
    heartColors[i3]     = hpc.r * bright;
    heartColors[i3 + 1] = hpc.g * bright;
    heartColors[i3 + 2] = hpc.b * bright;
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

  const sPalCols = [0x6b2737,0xc4a265,0xb8707a,0xd4a0a8,0x4a7a8a,0x7a6a8a,0x6a9a7a,0xd4a070,0xe0b060,0xa898c0];
  for (let i = 0; i < STREAM_TOTAL; i++) {
    streamInitPhase[i] = Math.random();
    streamArm[i]       = i < ARM_COUNT ? 0 : 1;
    streamWobPhase[i]  = Math.random() * Math.PI * 2;
    streamSpeed[i]     = 0.08 + Math.random() * 0.025;
    // Tilfældig fast farve fra hele paletten
    const spc = new THREE.Color(sPalCols[Math.floor(Math.random() * sPalCols.length)]);
    const sbr = 0.85 + Math.random() * 0.2;
    const i3 = i * 3;
    streamColors[i3] = spc.r * sbr; streamColors[i3+1] = spc.g * sbr; streamColors[i3+2] = spc.b * sbr;
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

  // Farver sat per partikel ved init — ingen runtime gradient

  const tmpOut = [0, 0, 0];

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = loopElapsed(state);

    // ---- HJERTE: blid, langsom puls ----
    const beatT = elapsed * (50 / 60); // 50 BPM — ensartet med alle scener
    const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)),     3);
    const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.18) * Math.PI * 2)), 5) * 0.55;
    const pulse = 1 + (beat + beat2) * 0.04;

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
    // sCol ikke brugt — farver er faste fra init
    for (let i = 0; i < STREAM_TOTAL; i++) {
      const i3 = i * 3;
      // Fase: kontinuerlig fremrykning + per-partikel start
      const t = (streamInitPhase[i] + elapsed * streamSpeed[i]) % 1;

      const b = streamArm[i] === 0 ? leftBezier : rightBezier;
      cubicBezier(b, t, tmpOut);
      tmpOut[0] *= mobileScale(); // narrow arms on small screens

      // Blid wobble vinkelret (enkel tilnærmelse), roligt tempo
      const wob = 0.05;
      const wx = Math.sin(elapsed * 1.0 + streamWobPhase[i])       * wob;
      const wy = Math.cos(elapsed * 0.85 + streamWobPhase[i] * 1.3) * wob;
      const wz = Math.sin(elapsed * 0.7 + streamWobPhase[i] * 0.7) * wob;

      sPos[i3]     = tmpOut[0] + wx;
      sPos[i3 + 1] = tmpOut[1] + wy;
      sPos[i3 + 2] = tmpOut[2] + wz;

      // Farver bevares fra init (hele paletten)
    }
    streamGeo.attributes.position.needsUpdate = true;
    // streamGeo farver er faste — ingen color update

    // ---- HÆNDER: blid åndende glød ----
    const handBreath = 1 + Math.sin(elapsed * 0.7) * 0.07;
    const hhPos = handGeo.attributes.position.array;
    for (let i = 0; i < HAND_TOTAL; i++) {
      const i3 = i * 3;
      const h  = i < HAND_PER ? 0 : 1;
      const cx = handCenters[h][0];
      const cy = handCenters[h][1];
      const cz = handCenters[h][2];
      hhPos[i3]     = (cx + (handBase[i3]     - cx) * handBreath) * mobileScale();
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
  const ctx = initScene('scene6', 45, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, -0.15, 5.5);
  state.baseZ = camera.position.z;
  state.updateCamera();

  // ---- Timing ----
  const DROP_STARTS     = [0.0, 1.5, 3.0]; // sekventiel tænding over 0-6s
  const DROP_FALL_DUR   = 2.0;             // rolig, blød tænding
  const SPROUT_START    = 6.0;             // søjler rejser sig fra 6s
  const SPROUT_DURATION = 4.0;             // blomstring over 6-10s

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
    // rosa — medfølelse (yderst til venstre) — bred, tydelig fan
    { ctrl: { x: -0.70, y: -0.20 }, end: { x: -1.60, y:  0.65 } },
    // lilla — skam
    { ctrl: { x: -0.22, y:  0.00 }, end: { x: -0.55, y:  1.10 } },
    // salvie — høflighed
    { ctrl: { x:  0.22, y:  0.00 }, end: { x:  0.55, y:  1.10 } },
    // guld — dømmekraft (yderst til højre)
    { ctrl: { x:  0.70, y: -0.20 }, end: { x:  1.60, y:  0.65 } },
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

      // Tydelig naturlig dråbeform: spids top, rund bred bund
      // y ∈ [0.5 (top/spids), -0.5 (bund/bred)]
      // Radius = 0 ved top, max ved bund, med en buet overgang
      const yRaw = Math.random();
      const yPos = 0.5 - yRaw;                     // +0.5 (top) → -0.5 (bund)
      const rMax = 0.04 + 0.28 * yRaw * yRaw;      // ~0 ved top, ~0.32 ved bund
      const rr   = Math.sqrt(Math.random()) * rMax;
      const theta = Math.random() * Math.PI * 2;
      dropLocal[i3]     = rr * Math.cos(theta);
      dropLocal[i3 + 1] = yPos * 0.9;
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

  // ============================================================
  // ALT I ÉT Points-objekt: dråber + 4 søjler
  // ============================================================
  const SPROUTS = 4;
  const SPROUT_PER = 120;
  const SPROUT_TOTAL = SPROUTS * SPROUT_PER;
  const COL_HEIGHT = 2.2;
  const TOTAL = DROP_TOTAL + SPROUT_TOTAL;

  const colBases = [
    { x: -1.1, y: -1.2 },
    { x: -0.37, y: -1.35 },
    { x:  0.37, y: -1.35 },
    { x:  1.1, y: -1.2 },
  ];

  // Samlet positions + colors array
  const allPositions = new Float32Array(TOTAL * 3);
  const allColors    = new Float32Array(TOTAL * 3);

  // Kopier dråber ind (offset 0)
  for (let i = 0; i < DROP_TOTAL; i++) {
    const i3 = i * 3;
    allPositions[i3]     = dropPositions[i3];
    allPositions[i3 + 1] = dropPositions[i3 + 1];
    allPositions[i3 + 2] = dropPositions[i3 + 2];
    allColors[i3]     = dropColors[i3];
    allColors[i3 + 1] = dropColors[i3 + 1];
    allColors[i3 + 2] = dropColors[i3 + 2];
  }

  // Søjle-data (offset DROP_TOTAL)
  const sproutYNorm = new Float32Array(SPROUT_TOTAL);
  const sproutCol   = new Int8Array(SPROUT_TOTAL);
  const sproutWob   = new Float32Array(SPROUT_TOTAL);

  for (let s = 0; s < SPROUTS; s++) {
    const col = sproutPalette[s];
    for (let p = 0; p < SPROUT_PER; p++) {
      const si = s * SPROUT_PER + p;
      const gi = DROP_TOTAL + si; // global index
      const i3 = gi * 3;
      sproutYNorm[si] = p / SPROUT_PER;
      sproutCol[si] = s;
      sproutWob[si] = Math.random() * Math.PI * 2;

      allPositions[i3]     = -100;
      allPositions[i3 + 1] = -100;
      allPositions[i3 + 2] = 0;

      const bright = 0.85 + Math.random() * 0.25;
      allColors[i3]     = col.r * bright;
      allColors[i3 + 1] = col.g * bright;
      allColors[i3 + 2] = col.b * bright;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(allPositions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(allColors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.11,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const allMesh = new THREE.Points(geo, mat);
  scene.add(allMesh);

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;

    // ---- DRÅBER (index 0 til DROP_TOTAL) ----
    for (let i = 0; i < DROP_TOTAL; i++) {
      const i3 = i * 3;
      const d = dropIdx[i];
      const dropT = elapsed - DROP_STARTS[d];

      if (dropT < 0) {
        pos[i3]     = dropAnchors[d].x + dropLocal[i3];
        pos[i3 + 1] = DROP_START_Y      + dropLocal[i3 + 1];
        pos[i3 + 2] =                    dropLocal[i3 + 2];
      } else if (dropT < DROP_FALL_DUR) {
        const tNorm = dropT / DROP_FALL_DUR;
        const eased = easeInOutQuad(tNorm);
        const y = DROP_START_Y + (dropAnchors[d].y - DROP_START_Y) * eased;
        pos[i3]     = dropAnchors[d].x + dropLocal[i3];
        pos[i3 + 1] = y                 + dropLocal[i3 + 1];
        pos[i3 + 2] =                    dropLocal[i3 + 2];
      } else {
        const rest = dropT - DROP_FALL_DUR;
        const br = 1 + Math.sin(rest * 0.9 + dropPhases[i]) * 0.025;
        pos[i3]     = dropAnchors[d].x + dropLocal[i3]     * br;
        pos[i3 + 1] = dropAnchors[d].y + dropLocal[i3 + 1] * br;
        pos[i3 + 2] =                    dropLocal[i3 + 2];
      }
    }
    // ---- 4 SØJLER (index DROP_TOTAL til TOTAL) ----
    const sproutT = Math.max(0, elapsed - SPROUT_START);
    const growth = easeOutCubic(Math.min(1, sproutT / SPROUT_DURATION));
    const currentHeight = COL_HEIGHT * growth;

    for (let si = 0; si < SPROUT_TOTAL; si++) {
      const gi = DROP_TOTAL + si;
      const i3 = gi * 3;
      const s = sproutCol[si];
      const base = colBases[s];

      if (sproutT <= 0) {
        pos[i3] = -100; pos[i3+1] = -100; pos[i3+2] = 0;
      } else {
        const yTarget = sproutYNorm[si] * currentHeight;
        const taper = 1 - sproutYNorm[si] * 0.4;
        const jx = Math.sin(sproutWob[si] * 7.3) * 0.09 * taper;
        const jz = Math.cos(sproutWob[si] * 5.7) * 0.07 * taper;
        const sway = Math.sin(elapsed * 0.55 + sproutWob[si] + s * 0.8)
                   * 0.05 * sproutYNorm[si];

        pos[i3]     = base.x + jx + sway;
        pos[i3 + 1] = base.y + yTarget;
        pos[i3 + 2] = jz;
      }
    }

    geo.attributes.position.needsUpdate = true;

    // ---- Pulsering 10-14s ----
    if (elapsed > 10) {
      const pulseT = elapsed * (50 / 60);
      const pBeat = Math.pow(Math.max(0, Math.sin(pulseT * Math.PI * 2)), 3);
      const p = 1 + pBeat * 0.035;
      allMesh.scale.set(p, p, p);
    } else {
      allMesh.scale.set(1, 1, 1);
    }

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
  const ctx = initScene('scene7', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);
  state.baseZ = camera.position.z;
  state.updateCamera();

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
  const SMALL_HEART_SCALE = 0.78; // størrelsen af hvert lille hjerte — tydeligere

  // Fordel 20 hjerter jævnt i et stort felt
  for (let h = 0; h < HEARTS; h++) {
    // Home: spredt på ring/felt
    const phi = Math.acos(1 - 2 * (h + 0.5) / HEARTS);
    const theta = Math.PI * (1 + Math.sqrt(5)) * h; // golden angle
    const r = (2.0 + Math.random() * 1.0) * (0.7 + 0.3 * mobileScale());
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

    const elapsed = loopElapsed(state);
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
      const beatT = (elapsed - beatStart) * (50 / 60);
      const beat  = Math.pow(Math.max(0, Math.sin(beatT * Math.PI * 2)),     3);
      const beat2 = Math.pow(Math.max(0, Math.sin((beatT + 0.18) * Math.PI * 2)), 5) * 0.55;
      pulse = 1 + (beat + beat2) * 0.04;
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
   SCENE 8 — Afslutning: "Hjertet fyldes"
   Et hjerteomrids starter tomt. Tårer falder blødt ned.
   Gradvist fyldes hjertet indefra med alle kursets farver —
   et mosaik af alt, vi har gennemlevet. Når hjertet er
   fuldt, pulser det stille.
   ============================================================ */
function initScene8() {
  const ctx = initScene('scene8', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 6);
  state.baseZ = camera.position.z;
  state.updateCamera();

  // Alle kursets farver
  const PAL = [
    0x6b2737,0xc4a265,0xb8707a,0x4a7a8a,0x2a3a5a,
    0x7a6a8a,0x6a9a7a,0xd4a070,0xd4a0a8,0x8a2030,
    0xd8c095,0xe08878,0x8a4838,0x6a8858,0xc07258,
    0xa898c0,0xecb090,0xe0b060,0xd4bb82,0x8a7e76,
  ];
  const H_SCALE = 2.2;

  // ALT i ét Points-objekt: outline + fill + tårer
  // Outline: 250 partikler på hjertekurven (bordeaux, altid synlige)
  // Fill: 1400 partikler inde i hjertet (alle farver, dukker gradvist op)
  // Tårer: 150 partikler der falder ned (guld)
  const OUTLINE = 250;
  const FILL = 1400;
  const TEARS = 150;
  const TOTAL = OUTLINE + FILL + TEARS;

  const positions = new Float32Array(TOTAL * 3);
  const colors    = new Float32Array(TOTAL * 3);
  const basePos   = new Float32Array(TOTAL * 3); // target position
  const particleType = new Int8Array(TOTAL);     // 0=outline, 1=fill, 2=tear
  const fillAppearAt = new Float32Array(TOTAL);  // when fill particles appear
  const tearSpeed    = new Float32Array(TOTAL);
  const phases       = new Float32Array(TOTAL);

  const FIELD_H = 5;
  const FIELD_W = 6;

  for (let i = 0; i < TOTAL; i++) {
    const i3 = i * 3;
    phases[i] = Math.random() * Math.PI * 2;

    if (i < OUTLINE) {
      // OUTLINE: jævnt fordelt langs hjertekurven
      particleType[i] = 0;
      const t = (i / OUTLINE) * Math.PI * 2;
      const hp = heartPoint(t, H_SCALE);
      basePos[i3]     = hp.x + (Math.random() - 0.5) * 0.08;
      basePos[i3 + 1] = hp.y + (Math.random() - 0.5) * 0.08;
      basePos[i3 + 2] = (Math.random() - 0.5) * 0.12;
      positions[i3]     = basePos[i3];
      positions[i3 + 1] = basePos[i3 + 1];
      positions[i3 + 2] = basePos[i3 + 2];
      // Bordeaux
      const c = new THREE.Color(0x6b2737);
      const br = 0.85 + Math.random() * 0.2;
      colors[i3] = c.r*br; colors[i3+1] = c.g*br; colors[i3+2] = c.b*br;
      fillAppearAt[i] = 0; // altid synlig

    } else if (i < OUTLINE + FILL) {
      // FILL: inde i hjertet, gradvist synlige over 0-8s
      particleType[i] = 1;
      const t = Math.random() * Math.PI * 2;
      const fill = Math.pow(Math.random(), 0.5);
      const hp = heartPoint(t, H_SCALE * 0.92);
      basePos[i3]     = hp.x * fill + (Math.random() - 0.5) * 0.08;
      basePos[i3 + 1] = hp.y * fill + (Math.random() - 0.5) * 0.08;
      basePos[i3 + 2] = (Math.random() - 0.5) * 0.4 * fill;
      // Starter LANGT under — usynligt
      positions[i3]     = basePos[i3];
      positions[i3 + 1] = -10;
      positions[i3 + 2] = basePos[i3 + 2];
      // Appear time: centrum først (fill~0), kant sidst (fill~1)
      fillAppearAt[i] = fill * 6.5 + Math.random() * 1.5;
      // Tilfældig paletfarve
      const c = new THREE.Color(PAL[Math.floor(Math.random() * PAL.length)]);
      const br = 0.85 + Math.random() * 0.2;
      colors[i3] = c.r*br; colors[i3+1] = c.g*br; colors[i3+2] = c.b*br;

    } else {
      // TÅRER: faldende guldne dråber
      particleType[i] = 2;
      positions[i3]     = (Math.random() - 0.5) * FIELD_W;
      positions[i3 + 1] = (Math.random() - 0.5) * FIELD_H * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 1.5;
      basePos[i3]     = positions[i3];
      basePos[i3 + 1] = positions[i3 + 1];
      basePos[i3 + 2] = positions[i3 + 2];
      tearSpeed[i] = 0.012 + Math.random() * 0.018;
      fillAppearAt[i] = 0;
      const c = new THREE.Color(0xc4a265);
      const br = 0.7 + Math.random() * 0.2;
      colors[i3] = c.r*br; colors[i3+1] = c.g*br; colors[i3+2] = c.b*br;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.11,
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

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;

    // 50 BPM puls
    const beatPhase = elapsed * (50 / 60);
    const beat = Math.pow(Math.max(0, Math.sin(beatPhase * Math.PI * 2)), 3);
    const pulseScale = elapsed > 8.0 ? 1 + beat * 0.04 : 1 + Math.sin(elapsed * 0.8) * 0.012;

    for (let i = 0; i < TOTAL; i++) {
      const i3 = i * 3;
      const pt = particleType[i];

      if (pt === 0) {
        // OUTLINE: altid synlig, pulserer
        pos[i3]     = basePos[i3]     * pulseScale;
        pos[i3 + 1] = basePos[i3 + 1] * pulseScale;
        pos[i3 + 2] = basePos[i3 + 2];

      } else if (pt === 1) {
        // FILL: dukker op ved fillAppearAt, stiger ind fra bunden
        if (elapsed < fillAppearAt[i]) {
          pos[i3]     = basePos[i3];
          pos[i3 + 1] = -10; // usynligt under rammen
          pos[i3 + 2] = basePos[i3 + 2];
        } else {
          const age = elapsed - fillAppearAt[i];
          const fadeIn = Math.min(1, age / 0.8);
          const riseOffset = (1 - fadeIn) * 0.6;
          pos[i3]     = basePos[i3]     * pulseScale;
          pos[i3 + 1] = (basePos[i3 + 1] - riseOffset) * pulseScale;
          pos[i3 + 2] = basePos[i3 + 2];
        }

      } else {
        // TÅRER: falder konstant nedad med lille sinus-svajen
        pos[i3 + 1] -= tearSpeed[i];
        pos[i3]     += Math.sin(elapsed * 0.4 + phases[i]) * 0.001;
        if (pos[i3 + 1] < -FIELD_H) {
          pos[i3 + 1] = FIELD_H;
          pos[i3]     = (Math.random() - 0.5) * FIELD_W;
        }
      }
    }

    geo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE: EMBRYOLOGI — celler der vandrer ind og samler sig
   ============================================================ */
function initEmbryoScene() {
  /* Bevægelse der ER form. 8 strømme af partikler i toroidale
     baner — væske-dynamikker der krydser hinanden og skaber
     metaboliske felter. "Vi er bevægelse der har antaget form." */
  const ctx = initScene('embryoScene', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5);
  state.baseZ = 5;
  state.updateCamera();

  const STREAMS = 8;
  const PER = 250;
  const COUNT = STREAMS * PER;

  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  const streamIdx = new Int8Array(COUNT);
  const particleU = new Float32Array(COUNT);
  const particleV = new Float32Array(COUNT);

  // 8 strømme med forskellige toroidale baner, hastigheder, tilts
  const streams = [];
  for (let s = 0; s < STREAMS; s++) {
    const tilt = (s / STREAMS) * Math.PI;
    streams.push({
      R: 1.1 + Math.sin(s * 1.4) * 0.35,
      r: 0.28 + Math.cos(s * 0.8) * 0.12,
      tiltX: Math.sin(tilt) * 0.7,
      tiltZ: Math.cos(tilt) * 0.5,
      speed: 0.18 + (s % 4) * 0.04,
      phase: s * Math.PI * 2 / STREAMS,
    });
  }

  const pal = [PALETTE.rosaLight,PALETTE.guld,PALETTE.bordeaux,PALETTE.rosa,PALETTE.guldLight,PALETTE.creme,PALETTE.amber,PALETTE.sand];

  for (let s = 0; s < STREAMS; s++) {
    const col = new THREE.Color(pal[s % pal.length]);
    for (let p = 0; p < PER; p++) {
      const i = s * PER + p;
      const i3 = i * 3;
      streamIdx[i] = s;
      particleU[i] = (p / PER) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      particleV[i] = Math.random() * Math.PI * 2;
      positions[i3] = (Math.random() - 0.5) * 7;
      positions[i3+1] = (Math.random() - 0.5) * 5;
      positions[i3+2] = (Math.random() - 0.5) * 3;
      const br = 0.8 + Math.random() * 0.25;
      colors[i3] = col.r*br; colors[i3+1] = col.g*br; colors[i3+2] = col.b*br;
    }
  }

  const startPos = new Float32Array(positions);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.08, map: softCircleTexture(), vertexColors: true,
    transparent: true, opacity: 0.88, sizeAttenuation: true,
    depthWrite: false, blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;
    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;

    // Organisering: 0-4s kaos→strømme, 4-14s strømmende form
    const orgT = easeInOutQuad(Math.min(1, elapsed / 4));
    // Åndedræt i den levende form
    const breath = 1 + Math.sin(elapsed * Math.PI * 2 / 8) * 0.04;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const s = streamIdx[i];
      const st = streams[s];

      // Strøm-position: toroidal bane der konstant bevæger sig
      const u = particleU[i] + elapsed * st.speed;
      const v = particleV[i];
      const R = st.R * breath;
      const r = st.r;

      // Torus-coords med tilt
      let tx = (R + r * Math.cos(v)) * Math.cos(u);
      let ty = (R + r * Math.cos(v)) * Math.sin(u);
      let tz = r * Math.sin(v);
      // Tilt strømmen
      const cosT = Math.cos(st.tiltX), sinT = Math.sin(st.tiltX);
      const ry = ty * cosT - tz * sinT;
      const rz = ty * sinT + tz * cosT;
      ty = ry; tz = rz;
      const cosZ = Math.cos(st.tiltZ), sinZ = Math.sin(st.tiltZ);
      const rx = tx * cosZ - ty * sinZ;
      const ry2 = tx * sinZ + ty * cosZ;
      tx = rx; ty = ry2;

      // Blend fra kaotisk start til strømmende form
      pos[i3]     = startPos[i3]     * (1 - orgT) + tx * orgT;
      pos[i3 + 1] = startPos[i3 + 1] * (1 - orgT) + ty * orgT;
      pos[i3 + 2] = startPos[i3 + 2] * (1 - orgT) + tz * orgT;
    }

    geo.attributes.position.needsUpdate = true;
    points.rotation.y = Math.sin(elapsed * 0.1) * 0.2;
    points.rotation.x = Math.sin(elapsed * 0.07 + 0.5) * 0.12;
    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE: REJSE — stille baggrundsfelt af svævende partikler
   ============================================================ */
function initRejseScene() {
  /* Rejsen indad. Partikler flyder langs en spiral fra yderkant
     mod et varmt, lysende centrum — introspektionens vej.
     Når de når centrum, genfødes de i periferien. */
  const ctx = initScene('rejseScene', 50, 14);
  if (!ctx) return;
  const { scene, camera, renderer, state } = ctx;

  camera.position.set(0, 0, 5);
  state.baseZ = 5;
  state.updateCamera();

  const COUNT = 1200;
  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  // Per-partikel: spiralposition (0=ydre, 1=centrum)
  const spiralPhase = new Float32Array(COUNT);
  const spiralSpeed = new Float32Array(COUNT);
  const spiralAngle = new Float32Array(COUNT);

  // Centrum-gløds partikler (de sidste 100)
  const CORE = 100;
  const FLOW = COUNT - CORE;

  const colOuter = new THREE.Color(PALETTE.warmGrey);
  const colMid   = new THREE.Color(PALETTE.guld);
  const colInner = new THREE.Color(PALETTE.rosaLight);
  const colCore  = new THREE.Color(0xfff0d0);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    if (i < FLOW) {
      // Spiral-partikler: fordelt langs spiralen
      spiralPhase[i] = Math.random(); // 0=ydre, 1=center
      spiralSpeed[i] = 0.04 + Math.random() * 0.025; // phase/s
      spiralAngle[i] = Math.random() * Math.PI * 2;
    } else {
      // Core: stationære ved centrum
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.4) * 0.2;
      positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
      const br = 0.9 + Math.random() * 0.15;
      colors[i3] = colCore.r*br; colors[i3+1] = colCore.g*br; colors[i3+2] = colCore.b*br;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.1, map: softCircleTexture(), vertexColors: true,
    transparent: true, opacity: 0.9, sizeAttenuation: true,
    depthWrite: false, blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;
    const elapsed = loopElapsed(state);
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;

    const coreBreath = 1 + Math.sin(elapsed * Math.PI * 2 / 10) * 0.08;

    for (let i = 0; i < FLOW; i++) {
      const i3 = i * 3;
      // Fase avancerer: 0→1, wrap ved 1 (genfødes i periferien)
      let ph = (spiralPhase[i] + elapsed * spiralSpeed[i]) % 1;
      // Radius: ydre (ph=0) → centrum (ph=1)
      const r = (1 - ph) * 2.3;
      // Spiralvinkel: roterer med ph
      const angle = spiralAngle[i] + ph * Math.PI * 5; // 2.5 omdrejninger
      // 3D spiral (let z-variation)
      pos[i3]     = r * Math.cos(angle);
      pos[i3 + 1] = r * Math.sin(angle) * 0.75;
      pos[i3 + 2] = Math.sin(ph * Math.PI) * 0.35 * Math.sin(angle * 0.5);

      // Farve: varm-grå ydre → guld midtvejs → rosa/lys ved centrum
      if (ph < 0.5) {
        const t = ph * 2;
        col[i3]=colOuter.r+(colMid.r-colOuter.r)*t;
        col[i3+1]=colOuter.g+(colMid.g-colOuter.g)*t;
        col[i3+2]=colOuter.b+(colMid.b-colOuter.b)*t;
      } else {
        const t = (ph - 0.5) * 2;
        col[i3]=colMid.r+(colInner.r-colMid.r)*t;
        col[i3+1]=colMid.g+(colInner.g-colMid.g)*t;
        col[i3+2]=colMid.b+(colInner.b-colMid.b)*t;
      }
    }
    // Core ånder
    for (let i = FLOW; i < COUNT; i++) {
      const i3 = i * 3;
      const phi = Math.acos(2 * ((i-FLOW)/CORE) - 1);
      const theta = (i-FLOW) * 2.399;
      const r = 0.15 * coreBreath;
      pos[i3]     = r * Math.sin(phi) * Math.cos(theta + elapsed*0.2);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta + elapsed*0.2);
      pos[i3 + 2] = r * Math.cos(phi);
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    points.rotation.y = elapsed * 0.015;
    renderer.render(scene, camera);
  }
  animate();
}

/* ============================================================
   SCENE: HJERTER — 14 kulturelle klynger svæver frit
   ============================================================ */
function initHjerterScene() {
  var ctx = initScene('hjerterScene', 55, 14);
  if (!ctx) return;
  var scene = ctx.scene, camera = ctx.camera, renderer = ctx.renderer, state = ctx.state;

  camera.position.set(0, 0, 6);
  state.baseZ = 6;
  state.updateCamera();

  var CLUSTERS = 14;
  var PER_CLUSTER = 120;
  var COUNT = CLUSTERS * PER_CLUSTER;

  var positions = new Float32Array(COUNT * 3);
  var colors = new Float32Array(COUNT * 3);

  var palette14 = [
    PALETTE.bordeaux, PALETTE.guld, PALETTE.rosa, PALETTE.warmGrey, PALETTE.rosaLight,
    PALETTE.teal, PALETTE.sand, PALETTE.terracotta, PALETTE.salvie, PALETTE.amber,
    PALETTE.lavendel, PALETTE.koral, PALETTE.honning, PALETTE.mahogni
  ].map(function(h) { return new THREE.Color(h); });

  // Each cluster gets its own elliptical orbit parameters
  var clusterOrbits = [];
  for (var c = 0; c < CLUSTERS; c++) {
    var goldenAngle = Math.PI * (1 + Math.sqrt(5)) * c;
    clusterOrbits.push({
      initialAngle: goldenAngle,
      orbitSpeed: 0.08 + (c % 5) * 0.025 + Math.random() * 0.015, // varied speeds
      orbitRadiusX: 1.4 + Math.sin(c * 1.7) * 0.8,     // 0.6 - 2.2
      orbitRadiusY: 1.0 + Math.cos(c * 2.1) * 0.6,      // 0.4 - 1.6
      orbitRadiusZ: 0.5 + Math.sin(c * 0.9) * 0.35,      // 0.15 - 0.85
      phaseY: c * 0.45 + Math.random() * 0.5,             // y-phase offset
      inclinationFactor: 0.7 + (c % 3) * 0.3,             // how tilted the orbit is in z
      breathSpeed: 0.3 + Math.random() * 0.25,             // individual breathing rate
      breathPhase: Math.random() * Math.PI * 2,
    });
  }

  var localOffsets = new Float32Array(COUNT * 3);
  var particlePhases = new Float32Array(COUNT);

  for (var c = 0; c < CLUSTERS; c++) {
    var col = palette14[c];
    var orbit = clusterOrbits[c];
    // Initial position on orbit
    var ix = orbit.orbitRadiusX * Math.cos(orbit.initialAngle);
    var iy = orbit.orbitRadiusY * Math.sin(orbit.initialAngle + orbit.phaseY);
    var iz = orbit.orbitRadiusZ * Math.sin(orbit.initialAngle * orbit.inclinationFactor);

    for (var p = 0; p < PER_CLUSTER; p++) {
      var i = c * PER_CLUSTER + p;
      var i3 = i * 3;

      // Partikler i hjerteform — tydeligt genkendeligt som hjerte
      var ht = Math.random() * Math.PI * 2;
      var hp = heartPoint(ht, 0.38);
      var fill = Math.pow(Math.random(), 0.5);
      localOffsets[i3]     = hp.x * fill + (Math.random()-0.5)*0.04;
      localOffsets[i3 + 1] = hp.y * fill + (Math.random()-0.5)*0.04;
      localOffsets[i3 + 2] = (Math.random()-0.5) * 0.12;

      positions[i3]     = ix + localOffsets[i3];
      positions[i3 + 1] = iy + localOffsets[i3 + 1];
      positions[i3 + 2] = iz + localOffsets[i3 + 2];

      particlePhases[i] = Math.random() * Math.PI * 2;

      var br = 0.85 + Math.random() * 0.2;
      colors[i3]     = col.r * br;
      colors[i3 + 1] = col.g * br;
      colors[i3 + 2] = col.b * br;
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  var mat = new THREE.PointsMaterial({
    size: 0.09,
    map: softCircleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  var points = new THREE.Points(geo, mat);
  scene.add(points);

  function animate() {
    requestAnimationFrame(animate);
    if (!state.active) return;

    var elapsed = loopElapsed(state);
    var pos = geo.attributes.position.array;

    for (var c = 0; c < CLUSTERS; c++) {
      var orbit = clusterOrbits[c];

      // Elliptical orbit — each cluster traces its own path
      var angle = orbit.initialAngle + elapsed * orbit.orbitSpeed;
      var cx = orbit.orbitRadiusX * Math.cos(angle);
      var cy = orbit.orbitRadiusY * Math.sin(angle + orbit.phaseY);
      var cz = orbit.orbitRadiusZ * Math.sin(angle * orbit.inclinationFactor);

      // Individual cluster breathing
      var breath = 1 + Math.sin(elapsed * orbit.breathSpeed + orbit.breathPhase) * 0.08;

      for (var p = 0; p < PER_CLUSTER; p++) {
        var i = c * PER_CLUSTER + p;
        var i3 = i * 3;
        var ph = particlePhases[i];

        // Particle position = cluster center + local offset * breathing + tiny individual shimmer
        pos[i3]     = cx + localOffsets[i3]     * breath + Math.sin(elapsed * 0.4 + ph) * 0.015;
        pos[i3 + 1] = cy + localOffsets[i3 + 1] * breath + Math.cos(elapsed * 0.35 + ph * 1.2) * 0.012;
        pos[i3 + 2] = cz + localOffsets[i3 + 2] * breath;
      }
    }

    geo.attributes.position.needsUpdate = true;

    // Slow overall rotation so viewer sees orbits from different angles
    points.rotation.y = elapsed * 0.03;
    points.rotation.x = Math.sin(elapsed * 0.04) * 0.08;

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
  initScene8();
  initEmbryoScene();
  initRejseScene();
  initHjerterScene();
});
