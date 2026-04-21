import * as THREE from 'three';

// ─── Scene Setup ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010510);
scene.fog = new THREE.FogExp2(0x04071a, 0.018);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 1.5, 6.2);
camera.lookAt(0, 1.6, 0);

// ─── First-Person Controls ──────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup',   e => keys[e.code] = false);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Mouse look
let yaw = 0, pitch = 0;
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw   -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch  = Math.max(-0.6, Math.min(0.6, pitch)); // clamp vertical look
  }
});

// ─── Textures ────────────────────────────────────────────────────────────────
const loader = new THREE.TextureLoader();
const floorTex  = loader.load('./assets/floor.png');
const wallTex   = loader.load('./assets/wall.png');
const lanternTex = loader.load('./assets/lantern.png');
const moonTex = loader.load('./assets/moon.jpg');
const listener = new THREE.AudioListener();
camera.add(listener);

const clapSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/bell.wav', buffer => {
  clapSound.setBuffer(buffer);
  clapSound.setVolume(0.8);
});
let clapPulse = 0; // 0 = no pulse, >0 = active
let isClapping = false;

window.addEventListener('click', () => {
  if (document.pointerLockElement !== renderer.domElement) return;
  if (clapSound.isPlaying) clapSound.stop();
  clapSound.play();
  clapPulse = 1.0; // start pulse at full
});


[floorTex, wallTex].forEach(t => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
});
floorTex.repeat.set(2, 12);
wallTex.repeat.set(1, 3);

// ─── Materials ───────────────────────────────────────────────────────────────
const redLacquer = new THREE.MeshStandardMaterial({
  color: 0x8b1a00,
  roughness: 0.55,
  metalness: 0.05,
});

const whitePlaster = new THREE.MeshStandardMaterial({
  color: 0xd4c5a0,
  roughness: 0.9,
  metalness: 0.0,
});

const floorMat = new THREE.MeshStandardMaterial({
  map: floorTex,
  roughness: 0.6,
  metalness: 0.05,
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x6b1200,
  roughness: 0.7,
  metalness: 0.0,
});

const woodBeamMat = new THREE.MeshStandardMaterial({
  color: 0x7a1500,
  roughness: 0.5,
  metalness: 0.0,
});

// ─── Corridor Geometry ───────────────────────────────────────────────────────
const CORRIDOR_W = 3.2;
const CORRIDOR_H = 3.0;
const CORRIDOR_D = 16;

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_D),
  floorMat
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -CORRIDOR_D / 2 + 7);
floor.receiveShadow = true;
scene.add(floor);

// Ceiling (lacquered red)
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(CORRIDOR_W + 1.2, CORRIDOR_D),
  ceilingMat
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, CORRIDOR_H, -CORRIDOR_D / 2 + 7);
scene.add(ceiling);

// Left wall (with windows/grille panels)
const leftWall = new THREE.Mesh(
  new THREE.PlaneGeometry(CORRIDOR_D, CORRIDOR_H),
  new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, color: 0xbfaa88 })
);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-CORRIDOR_W / 2, CORRIDOR_H / 2, -CORRIDOR_D / 2 + 7);
leftWall.receiveShadow = true;
scene.add(leftWall);

// Right railing side — open to the sky.
// Keep only a faint lower scrim so the upper half remains visibly open.
const rightPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(CORRIDOR_D, 1.15),
  new THREE.MeshStandardMaterial({
    color: 0x081018,
    roughness: 1.0,
    transparent: true,
    opacity: 0.22,
  })
);
rightPanel.rotation.y = -Math.PI / 2;
rightPanel.position.set(CORRIDOR_W / 2 + 0.3, 0.8, -CORRIDOR_D / 2 + 7);
scene.add(rightPanel);

// ─── Structural Columns ──────────────────────────────────────────────────────
function addColumn(x, z) {
  const col = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, CORRIDOR_H, 0.22),
    redLacquer
  );
  col.position.set(x, CORRIDOR_H / 2, z);
  col.castShadow = true;
  col.receiveShadow = true;
  scene.add(col);
}

const colSpacing = 2.2;
const numCols = 7;
for (let i = 0; i < numCols; i++) {
  const z = 6.5 - i * colSpacing;
  addColumn(-CORRIDOR_W / 2, z);
  addColumn(CORRIDOR_W / 2, z);
}

// ─── Ceiling Beams ───────────────────────────────────────────────────────────
function addBeam(z) {
  // Cross beam
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(CORRIDOR_W + 0.3, 0.18, 0.2),
    woodBeamMat
  );
  beam.position.set(0, CORRIDOR_H - 0.09, z);
  beam.castShadow = true;
  scene.add(beam);

  // Longitudinal beams (run down corridor)
  [-0.9, 0, 0.9].forEach(xOff => {
    const longBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, colSpacing),
      woodBeamMat
    );
    longBeam.position.set(xOff, CORRIDOR_H - 0.22, z - colSpacing / 2);
    scene.add(longBeam);
  });
}

for (let i = 0; i < numCols; i++) {
  addBeam(6.5 - i * colSpacing);
}

// ─── Railing ─────────────────────────────────────────────────────────────────
// Top rail
const topRail = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.08, CORRIDOR_D),
  redLacquer
);
topRail.position.set(CORRIDOR_W / 2, 1.0, -CORRIDOR_D / 2 + 7);
scene.add(topRail);

// Bottom rail
const bottomRail = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.06, CORRIDOR_D),
  redLacquer
);
bottomRail.position.set(CORRIDOR_W / 2, 0.35, -CORRIDOR_D / 2 + 7);
scene.add(bottomRail);

// Railing balusters
for (let i = 0; i < 20; i++) {
  const baluster = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.65, 0.06),
    redLacquer
  );
  baluster.position.set(CORRIDOR_W / 2, 0.65, 6 - i * 0.85);
  scene.add(baluster);
}

// ─── Window Grilles (left wall) ──────────────────────────────────────────────
function addGrille(z) {
  const grp = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a0e00, roughness: 0.6 });

  // Outer frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.6), frameMat);
  frame.position.set(-CORRIDOR_W / 2 + 0.04, 1.3, z);
  frame.rotation.y = 0;
  scene.add(frame);

  // Vertical bars
  for (let b = -3; b <= 3; b++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.3, 0.04),
      frameMat
    );
    bar.position.set(-CORRIDOR_W / 2 + 0.06, 1.3, z + b * 0.22);
    scene.add(bar);
  }
}

for (let i = 0; i < numCols - 1; i++) {
  addGrille(5.4 - i * colSpacing);
}

// ─── Hanging Lanterns ────────────────────────────────────────────────────────
const lanternPositions = [];

function buildHangingLantern(x, y, z) {
  const group = new THREE.Group();

  // Suspension wire
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 })
  );
  wire.position.y = 0.3;
  group.add(wire);

  // Lantern body — bronze cage
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x5a4a2a,
    roughness: 0.4,
    metalness: 0.6,
  });

  // Main body box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.55, 0.38),
    bodyMat
  );
  group.add(body);

  // Glowing interior
  const glowMat = new THREE.MeshStandardMaterial({
    map: lanternTex,
    emissive: new THREE.Color(0xff8c20),
    emissiveIntensity: 1.8,
    color: 0xffcc66,
    roughness: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.28), glowMat);
  group.add(glow);

  // Top cap
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8),
    bodyMat
  );
  cap.position.y = 0.32;
  group.add(cap);

  // Bottom cap / skirt
  const skirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.18, 8),
    bodyMat
  );
  skirt.position.y = -0.35;
  group.add(skirt);

  // Point light inside lantern
  const pt = new THREE.PointLight(0xff8830, 1.4, 4.5, 2);
  pt.castShadow = false;
  pt.shadow.mapSize.width = 256;
  pt.shadow.mapSize.height = 256;
  group.add(pt);

  group.position.set(x, y, z);
  scene.add(group);
  lanternPositions.push({ group, pt, baseY: y ,baseIntensity: 1.4});
  return group;
}


const lanternZ = [5.5, 3.3, 1.1, -1.1, -3.3, -5.5];
lanternZ.forEach(z => {
  buildHangingLantern(-0.6, CORRIDOR_H - 0.65, z);
  buildHangingLantern( 0.6, CORRIDOR_H - 0.65, z);
});

// ─── Foreground Standing Lantern (right side near camera) ────────────────────
function buildStandingLantern(x, z) {
  const group = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a1a00, roughness: 0.7 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 8), postMat);
  post.position.y = 0.7;
  group.add(post);

  // Lantern shade — square paper lantern style
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xfff3cc,
    emissive: new THREE.Color(0xff9900),
    emissiveIntensity: 4.0,
    roughness: 0.95,
    transparent: true,
    opacity: 0.9,
  });
  const shade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), shadeMat);
  shade.position.y = 1.55;
  group.add(shade);

  // Top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.06, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x2a1a00, roughness: 0.6 })
  );
  top.position.y = 1.78;
  group.add(top);

  const pt = new THREE.PointLight(0xff9400, 2.0, 5, 2);
  pt.position.y = 1.55;
  pt.castShadow = false;
  group.add(pt);

  group.position.set(x, 0, z);
  scene.add(group);
  lanternPositions.push({ group, pt, baseY: 0,baseIntensity: 2.0 });
}

buildStandingLantern(CORRIDOR_W / 2 - 0.15, 5.8);
buildStandingLantern(CORRIDOR_W / 2 - 0.15, 3.5);


// ─── Ambient & Directional Light ─────────────────────────────────────────────
// Warm ambient keeps corridor lanterns looking correct; cool blue ambient adds
// the moonlit base that dominates the unlit exterior.
const warmAmbient = new THREE.AmbientLight(0x321100, 0.5);
scene.add(warmAmbient);
const moonAmbient = new THREE.AmbientLight(0x1a2850, 1.1);
scene.add(moonAmbient);

// Primary moonlight — bright blue-white directional from upper-left
const moonLight = new THREE.DirectionalLight(0xc0d4ff, 1.6);
moonLight.position.set(-10, 20, 15);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width  = 1024;
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far  = 150;
moonLight.shadow.camera.left   = -40;
moonLight.shadow.camera.right  =  40;
moonLight.shadow.camera.top    =  40;
moonLight.shadow.camera.bottom = -40;
scene.add(moonLight);

// Warm accent on ceiling beams
const ceilingFill = new THREE.PointLight(0xcc3300, 0.8, 8, 2);
ceilingFill.position.set(0, CORRIDOR_H - 0.3, 2);
scene.add(ceilingFill);

// ─── Temple Complex Ground & Center Axis ─────────────────────────────────────
// Layout along Z (camera faces negative Z = deeper into temple):
//   z= 55 → 14 : Sando (approach path, flanked by stone lanterns)
//   z= 14 →  7 : Sanmon gate zone
//   z=  7 → -9 : Existing corridor
//   z= -9 →-20 : Inner courtyard + Haiden
//   z=-20 →-32 : Honden (main shrine, raised platform)

const outerGroundMat = new THREE.MeshStandardMaterial({
  color: 0x14120c,
  roughness: 0.97,
  metalness: 0.0,
});
const outerGround = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 110),
  outerGroundMat
);
outerGround.rotation.x = -Math.PI / 2;
outerGround.position.set(0, -0.02, 10); // covers z ≈ -45 to +65
outerGround.receiveShadow = true;
scene.add(outerGround);

// Center stone path — InstancedMesh tiles along the full sacred axis
(function buildCenterPath() {
  const tileW = 2.4, tileD = 1.1, tileH = 0.05;
  const step  = tileD + 0.12;
  const startZ = 54, endZ = -32;
  const maxCount = Math.ceil((startZ - endZ) / step);

  const geo = new THREE.BoxGeometry(tileW, tileH, tileD);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2e2a25, roughness: 0.93 });
  const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let i = 0; i < maxCount; i++) {
    const z = startZ - i * step;
    if (z < endZ) break;
    dummy.position.set(0, 0.025, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx++, dummy.matrix);
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
})();

// Zone threshold stones — wide flat slabs mark each zone entry
const threshMat = new THREE.MeshStandardMaterial({ color: 0x48433c, roughness: 0.88 });
[54, 14, 7, -9, -20].forEach(z => {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.55), threshMat);
  slab.position.set(0, 0.04, z);
  slab.receiveShadow = true;
  scene.add(slab);
});

// Sando border stones — low stone kerb flanking the approach path
(function buildSandoBorder() {
  const xOffset = 3.0, spacing = 3.5;
  const startZ = 52, endZ = 14;
  const count = Math.ceil((startZ - endZ) / spacing);

  const geo  = new THREE.BoxGeometry(0.4, 0.28, 0.4);
  const mat  = new THREE.MeshStandardMaterial({ color: 0x38342e, roughness: 0.95 });
  const left  = new THREE.InstancedMesh(geo, mat, count);
  const right = new THREE.InstancedMesh(geo, mat, count);
  left.receiveShadow = right.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const z = startZ - i * spacing;
    dummy.position.set(-xOffset, 0.14, z);
    dummy.updateMatrix();
    left.setMatrixAt(i, dummy.matrix);
    dummy.position.set(xOffset, 0.14, z);
    dummy.updateMatrix();
    right.setMatrixAt(i, dummy.matrix);
  }
  left.instanceMatrix.needsUpdate = right.instanceMatrix.needsUpdate = true;
  scene.add(left);
  scene.add(right);
})();

// ─── Moon ─────────────────────────────────────────────────────────────────────
// Positioned over the open right-hand side so it is visible from the corridor.
const MOON_POS = new THREE.Vector3(22, 35, 30);

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(4.2, 32, 32),
  new THREE.MeshBasicMaterial({
    map: moonTex,
    fog: false,
  })
);

moonMesh.position.copy(MOON_POS);
scene.add(moonMesh);

const moonGlow = new THREE.PointLight(0xeef0ff, 1.5, 80);
moonGlow.position.copy(MOON_POS);
scene.add(moonGlow);


// Moon fill light — blue wash across the exterior ground
const moonPtLight = new THREE.PointLight(0x8aadff, 2.4, 250, 1.4);
moonPtLight.position.copy(MOON_POS);
scene.add(moonPtLight);

// ─── Starfield ────────────────────────────────────────────────────────────────
// Stars at r=150-180 — large enough that the player's movement (~56 units max)
// never creates uneven density. fog:false on every layer so FogExp2 never hides them.
(function buildStarfield() {
  function hemispherePositions(count, rMin, rMax) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(1 - Math.random()); // area-weighted: 0=zenith, π/2=horizon
      const r     = rMin + Math.random() * (rMax - rMin);
      arr[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.cos(phi) + 5;
      arr[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }

  // Layer 1 — 3 000 faint blue-white background stars
  const geo1 = new THREE.BufferGeometry();
  geo1.setAttribute('position', new THREE.BufferAttribute(hemispherePositions(3000, 155, 180), 3));
  scene.add(new THREE.Points(geo1, new THREE.PointsMaterial({
    color: 0xaaccff, size: 0.45, sizeAttenuation: true,
    transparent: true, opacity: 0.88, fog: false,
  })));

  // Layer 2 — 600 medium white stars
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(hemispherePositions(600, 150, 175), 3));
  scene.add(new THREE.Points(geo2, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.8, sizeAttenuation: true,
    transparent: true, opacity: 0.95, fog: false,
  })));

  // Layer 3 — 80 bright hero stars
  const geo3 = new THREE.BufferGeometry();
  geo3.setAttribute('position', new THREE.BufferAttribute(hemispherePositions(80, 145, 170), 3));
  scene.add(new THREE.Points(geo3, new THREE.PointsMaterial({
    color: 0xe8f0ff, size: 1.4, sizeAttenuation: true,
    transparent: true, opacity: 1.0, fog: false,
  })));
})();

// ─── Resize Handler ──────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const moveDir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right   = new THREE.Vector3();

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.012;

  // ── Camera rotation from mouse ──
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // ── WASD movement ──
  const speed = 0.2;
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  moveDir.set(0, 0, 0);
  if (keys['KeyW'] || keys['ArrowUp'])    moveDir.addScaledVector(forward,  speed);
  if (keys['KeyS'] || keys['ArrowDown'])  moveDir.addScaledVector(forward, -speed);
  if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.addScaledVector(right,   -speed);
  if (keys['KeyD'] || keys['ArrowRight']) moveDir.addScaledVector(right,    speed);

  camera.position.add(moveDir);

  // Clamp to full temple-complex bounds
  camera.position.x = Math.max(-20, Math.min(20, camera.position.x));
  camera.position.y = 1.5;
  camera.position.z = Math.max(-36, Math.min(56, camera.position.z));

  // ── Lantern flicker (your existing code) ──
lanternPositions.forEach(({ pt, baseIntensity }, i) => {
  const flicker = 1.0 + 0.12 * Math.sin(t * 3.1 + i * 1.7) + 0.06 * Math.sin(t * 7.3 + i * 2.3);
  pt.intensity = baseIntensity * flicker;
});

if (clapPulse > 0) clapPulse -= 0.018; // decay over ~55 frames

lanternPositions.forEach(({ pt, baseIntensity }, i) => {
  const flicker = 1.0 + 0.12 * Math.sin(t * 3.1 + i * 1.7) 
                      + 0.06 * Math.sin(t * 7.3 + i * 2.3);
  const pulse = 1.0 + clapPulse * 2.5; // peak at 3.5× brightness
  pt.intensity = baseIntensity * flicker * pulse;
});

  renderer.render(scene, camera);
}
animate();
