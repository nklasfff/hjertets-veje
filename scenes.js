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
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
   INIT — start alt når DOM er klar
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initHero();
  initScene1();
  // Scene 2–7 tilføjes i næste trin
});
