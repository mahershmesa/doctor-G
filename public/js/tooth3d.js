// Interactive 3D tooth for the hero section (Three.js).
// Built procedurally (no model files): a sculpted molar crown + two curved roots,
// glossy enamel material, orbiting ring, floating sparkles, mouse parallax.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function buildCrown() {
  const geo = new THREE.SphereGeometry(1, 160, 120);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const cusps = [
    [0.42, 0.36], [-0.42, 0.36], [0.42, -0.34], [-0.42, -0.34],
  ];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    // Turn the sphere into a squarer "superellipse" so the crown has straighter sides.
    const rs = Math.sqrt(Math.max(1e-6, 1 - y * y));
    const p = y >= 0 ? 4 : 2.4;
    const rsup = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y), p)), 1 / p);
    const sc = rs > 1e-4 ? rsup / rs : 1;
    x *= sc;
    z *= sc;
    // Push the corners out a little (box-like footprint).
    const cx0 = x, cz0 = z;
    x *= 1 + 0.1 * cz0 * cz0;
    z *= 1 + 0.1 * cx0 * cx0;
    // Slightly wider than deep, with a soft bulge around the middle.
    const bulge = 1 + 0.06 * Math.exp(-((y - 0.05) ** 2) / 0.08);
    x *= 1.0 * bulge;
    z *= 0.86 * bulge;

    let Y;
    if (y >= 0) {
      // Flatten the top and raise four rounded cusps with a groove between them.
      Y = y * 0.62;
      let bump = 0;
      for (const [cx, cz] of cusps) bump += 0.2 * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.11);
      const groove = 0.07 * Math.exp(-(x * x) / 0.012) + 0.05 * Math.exp(-(z * z) / 0.015);
      Y += (bump - groove) * smooth(0.35, 0.95, y);
    } else {
      // Taper towards the neck of the tooth.
      const t = -y;
      const k = 1 - 0.3 * t ** 2;
      x *= k;
      z *= k;
      Y = y * 0.78;
    }
    pos.setXYZ(i, x, Y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildRoot(side) {
  const pts = [];
  const len = 1.55;
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = 0.34 * (1 - t) ** 0.75 + 0.03;
    pts.push(new THREE.Vector2(t === 1 ? 0 : r, -t * len));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = -y / len;
    // Flatten a bit and bend the tip outward/backward like a real molar root.
    pos.setZ(i, pos.getZ(i) * 0.82 + t * t * 0.08);
    pos.setX(i, pos.getX(i) + side * (0.1 * t + 0.22 * t * t));
  }
  geo.computeVertexNormals();
  return geo;
}

function sparkleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(10,50,60,0.35)');
  grad.addColorStop(1, 'rgba(10,50,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function mountTooth(canvas, { color = '#0f9b8e' } = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.15, 7.2);

  const brand = new THREE.Color(color);

  // Lights: soft key, cool fill, brand-colored rim.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe9e6, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(brand, 18, 12);
  rim.position.set(-3, 1.5, -2.5);
  scene.add(rim);

  // Tooth
  const enamel = new THREE.MeshPhysicalMaterial({
    color: 0xfbf8f2,
    roughness: 0.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xe8fff9),
    specularIntensity: 0.9,
  });
  const rootMat = enamel.clone();
  rootMat.color = new THREE.Color(0xf3ead9);
  rootMat.roughness = 0.38;
  rootMat.clearcoat = 0.4;

  const tooth = new THREE.Group();
  const crown = new THREE.Mesh(buildCrown(), enamel);
  crown.position.y = 0.35;
  tooth.add(crown);
  for (const side of [-1, 1]) {
    const root = new THREE.Mesh(buildRoot(side), rootMat);
    root.position.set(side * 0.36, -0.05, 0);
    tooth.add(root);
  }
  tooth.scale.setScalar(0.9);
  tooth.rotation.set(0.25, -0.5, 0.06);

  const holder = new THREE.Group(); // receives mouse / scroll rotation
  holder.add(tooth);
  scene.add(holder);

  // Orbit ring + small glossy orbs
  const ringGroup = new THREE.Group();
  ringGroup.rotation.set(1.2, 0.2, -0.35);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.012, 16, 200),
    new THREE.MeshBasicMaterial({ color: brand, transparent: true, opacity: 0.55 })
  );
  ringGroup.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.006, 12, 200),
    new THREE.MeshBasicMaterial({ color: brand, transparent: true, opacity: 0.25 })
  );
  ringGroup.add(ring2);
  const orbMat = new THREE.MeshPhysicalMaterial({ color: brand, roughness: 0.15, clearcoat: 1, metalness: 0.1 });
  const orbs = [0, 2.1, 4.2].map((a, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.11 : 0.07, 32, 32), i === 1 ? enamel : orbMat);
    m.userData.angle = a;
    m.userData.r = i === 2 ? 2.25 : 1.95;
    ringGroup.add(m);
    return m;
  });
  scene.add(ringGroup);

  // Sparkles
  const COUNT = 70;
  const sp = new Float32Array(COUNT * 3);
  const speed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 6;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 5;
    sp[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
    speed[i] = 0.15 + Math.random() * 0.35;
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkles = new THREE.Points(
    spGeo,
    new THREE.PointsMaterial({
      size: 0.09,
      map: sparkleTexture(),
      color: brand.clone().lerp(new THREE.Color(0xffffff), 0.55),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(sparkles);

  // Soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.78;
  shadow.scale.z = 0.6;
  scene.add(shadow);

  // ---- interaction ----
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let dragging = false;
  let dragX = 0;
  let spin = 0;
  let spinVel = 0;

  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spinVel = (e.clientX - dragX) * 0.01;
    spin += spinVel;
    dragX = e.clientX;
  });
  const endDrag = () => (dragging = false);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on tall/narrow screens so the tooth always fits.
    camera.position.z = w / h < 0.9 ? 8.6 : 7.2;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Only animate while visible.
  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) loop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loop();
  });

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    raf = 0;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const motion = reduceMotion ? 0.15 : 1;

    target.x += (pointer.y * 0.25 - target.x) * 0.05;
    target.y += (pointer.x * 0.45 - target.y) * 0.05;
    if (!dragging) {
      spinVel *= 0.95;
      spin += spinVel + dt * 0.35 * motion;
    }
    const scrollT = Math.min(1, window.scrollY / (window.innerHeight || 800));

    holder.rotation.x = target.x;
    holder.rotation.y = spin - target.y + scrollT * 1.5;
    holder.position.y = 0.12 + Math.sin(t * 1.2) * 0.1 * motion;
    shadow.scale.x = shadow.scale.y = 1 - Math.sin(t * 1.2) * 0.08 * motion;
    shadow.material.opacity = 0.9 - Math.sin(t * 1.2) * 0.15;

    ringGroup.rotation.z += dt * 0.15 * motion;
    for (const o of orbs) {
      o.userData.angle += dt * 0.6 * motion;
      o.position.set(Math.cos(o.userData.angle) * o.userData.r, Math.sin(o.userData.angle) * o.userData.r, 0);
    }

    const p = spGeo.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      let y = p.getY(i) + dt * speed[i] * motion;
      if (y > 2.6) y = -2.6;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    sparkles.rotation.y = t * 0.03;

    renderer.render(scene, camera);
    loop();
  }
  function loop() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  loop();

  return {
    setColor(hex) {
      const c = new THREE.Color(hex);
      ring.material.color.copy(c);
      ring2.material.color.copy(c);
      orbMat.color.copy(c);
      rim.color.copy(c);
      sparkles.material.color.copy(c.clone().lerp(new THREE.Color(0xffffff), 0.55));
    },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
