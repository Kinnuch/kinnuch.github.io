// EPT · M5 三维棋盘渲染层
// 职责：three.js 场景（38°视角）、六边形地格、原型模型加载/克隆/染色、动画状态机、
//       移动插值、屏幕投影（供 DOM 血条跟随）、raycaster 拾取（备战拖拽）。
// 引擎与规则零依赖：全部由 ui.js 以 uid 驱动。WebGL 不可用时 supported() 返回 false，回退 2D。
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.mjs';
import * as SkeletonUtils from './vendor/SkeletonUtils.js';

const COLS = 7, ROWS = 8;
const DZ = 58 / 70; // 复刻 2D 网格纵横比（CELL_W=70, ROW_H=58）
const wx = (c, r) => (c + (r % 2 ? 0.5 : 0)) - 3.25;
const wz = r => (r - 3.5) * DZ;

// 原型注册表：模型文件 + 动画别名 + 基准缩放
const KAY = { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', hit: 'Hit_A', death: 'Death_A', cheer: 'Cheer', cast: 'Spellcast_Shoot', castBig: 'Spellcast_Raise', melee: '1H_Melee_Attack_Slice_Diagonal', melee2: '2H_Melee_Attack_Chop', shoot: '1H_Ranged_Shoot', shoot2: '2H_Ranged_Shoot', block: 'Block' };
const QMON = { idle: 'Idle', walk: 'Walk', run: 'Run', hit: 'HitReact', death: 'Death', cheer: 'Wave', cast: 'Weapon', castBig: 'Weapon', melee: 'Punch', melee2: 'Punch', shoot: 'Punch', shoot2: 'Punch' };
const QFLY = { idle: 'Flying_Idle', walk: 'Fast_Flying', run: 'Fast_Flying', hit: 'HitReact', death: 'Death', cheer: 'Yes', cast: 'Headbutt', castBig: 'Headbutt', melee: 'Headbutt', melee2: 'Headbutt', shoot: 'Punch', shoot2: 'Punch' };
const QBEAST = { idle: 'Idle', walk: 'Walk', run: 'Gallop', hit: 'Idle_HitReact1', death: 'Death', cheer: 'Idle_2', cast: 'Attack', castBig: 'Attack', melee: 'Attack', melee2: 'Attack', shoot: 'Attack', shoot2: 'Attack' };
// parts：该原型内置的"可开关部件"全集（KayKit 角色 glb 自带多套武器/盾/盔/披风，按变体显隐）
export const ARCHS = {
  Knight: { anims: KAY, scale: 0.30, parts: ['1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', 'Knight_Helmet', 'Knight_Cape'] },
  Mage: { anims: KAY, scale: 0.30, parts: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'] },
  Barbarian: { anims: KAY, scale: 0.30, parts: ['1H_Axe', '2H_Axe', '1H_Axe_Offhand', 'Barbarian_Round_Shield', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'] },
  Rogue: { anims: KAY, scale: 0.30, parts: ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable', 'Rogue_Cape'] },
  Rogue_Hooded: { anims: KAY, scale: 0.30, parts: ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable', 'Rogue_Cape'] },
  Skeleton_Warrior: { anims: KAY, scale: 0.30, parts: ['Skeleton_Warrior_Helmet', 'Skeleton_Warrior_Cloak'] },
  Skeleton_Mage: { anims: KAY, scale: 0.30, parts: ['Skeleton_Mage_Hat'] },
  Skeleton_Minion: { anims: KAY, scale: 0.29, parts: ['Skeleton_Minion_Cloak'] },
  Demon: { anims: QMON, scale: 0.26 }, BlueDemon: { anims: QMON, scale: 0.26 }, Orc: { anims: QMON, scale: 0.25 },
  Yeti: { anims: QMON, scale: 0.27 }, Tribal: { anims: QMON, scale: 0.25 }, MushroomKing: { anims: QMON, scale: 0.26 }, Orc_Skull: { anims: QMON, scale: 0.25 },
  Dragon: { anims: QFLY, scale: 0.28, fly: 0.09 }, Dragon_Evolved: { anims: QFLY, scale: 0.30, fly: 0.1 },
  Ghost: { anims: QFLY, scale: 0.25, fly: 0.05 }, Ghost_Skull: { anims: QFLY, scale: 0.26, fly: 0.05 }, Goleling: { anims: QFLY, scale: 0.27, fly: 0.04 },
  Wolf: { anims: QBEAST, scale: 0.25 }, Husky: { anims: QBEAST, scale: 0.25 }, Fox: { anims: QBEAST, scale: 0.25 },
};

let renderer = null, scene, cam, boardEl, canvas, opts = {};
let tileGroup, unitGroup, tiles = {}; // tiles['c,r'] = mesh
const units = new Map(); // uid → { group, model, mixer, clips, arch, team, c, r, headY, dead, mv, baseMat, hover }
const loadCache = new Map(); // arch → Promise<gltf>
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
let zoom = 1, viewMode = 'tilt', running = false, disposed = false, speedMult = 1;
let az = 0, pol = 0.72, orbit = null; // 相机球面角：方位角/俯仰角；右键拖拽旋转
export function setSpeed(m) { speedMult = m; } // 战斗倍速/暂停（0=冻结）

export function supported() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export function mount(el, o = {}) {
  opts = o;
  boardEl = el;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch { return false; }
  disposed = false;
  canvas = renderer.domElement;
  canvas.id = 'b3canvas';
  canvas.style.display = 'block';
  el.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  applyCamera();

  scene.add(new THREE.AmbientLight(0xfff4e0, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(4, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5;
  scene.add(sun);

  // 地格
  tileGroup = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; i ? shape.lineTo(Math.cos(a), Math.sin(a)) : shape.moveTo(Math.cos(a), Math.sin(a)); }
  const hexGeo = new THREE.ShapeGeometry(shape);
  // 尖顶六边形蜂窝：行距 DZ=1.5R → R=DZ/1.5；再缩 0.94 留缝避免共面 z-fighting
  const R = (DZ / 1.5) * 0.94;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const mine = r >= 4;
    const mat = new THREE.MeshStandardMaterial({ color: mine ? 0xe6dcc2 : 0xefe8d6, roughness: 0.95 });
    const m = new THREE.Mesh(hexGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(R);
    m.position.set(wx(c, r), 0.001 * ((r * COLS + c) % 3), wz(r)); // 微错层，杜绝共面闪烁
    m.receiveShadow = true;
    m.userData = { c, r, baseColor: mat.color.getHex() };
    tiles[c + ',' + r] = m;
    tileGroup.add(m);
  }
  scene.add(tileGroup);
  unitGroup = new THREE.Group();
  scene.add(unitGroup);

  // 右键拖拽旋转镜头（指针捕获，拖出画布也不断）
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 2) return;
    e.preventDefault();
    orbit = { sx: e.clientX, sy: e.clientY, az0: az, pol0: pol, id: e.pointerId };
    if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
  });
  canvas.addEventListener('pointermove', e => {
    if (!orbit) return;
    az = orbit.az0 - (e.clientX - orbit.sx) * 0.008;
    pol = Math.min(1.5, Math.max(0.3, orbit.pol0 + (e.clientY - orbit.sy) * 0.006));
    applyCamera();
  });
  const endOrbit = () => { orbit = null; };
  canvas.addEventListener('pointerup', e => { if (e.button === 2) endOrbit(); });
  canvas.addEventListener('pointercancel', endOrbit);

  resize();
  running = true;
  loop();
  return true;
}

export function unmount() {
  running = false; disposed = true;
  clearUnits();
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  if (renderer) renderer.dispose();
  renderer = null; tiles = {};
}

export function resize() {
  if (!renderer || !boardEl) return;
  const w = boardEl.clientWidth || 530, h = boardEl.clientHeight || 470;
  renderer.setSize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}

function applyCamera() {
  const d = 9.1 / zoom;
  const tx = 0, ty = 0, tz = 0.3;
  cam.position.set(
    tx + d * Math.cos(pol) * Math.sin(az),
    ty + d * Math.sin(pol),
    tz + d * Math.cos(pol) * Math.cos(az)
  );
  cam.lookAt(tx, ty, tz);
}
export function setZoom(z) { zoom = Math.min(1.6, Math.max(0.55, z)); applyCamera(); }
export function setView(v) { viewMode = v; az = 0; pol = v === 'top' ? 1.47 : 0.72; applyCamera(); } // 视角按钮=复位到斜视/俯视预设

// ---------- 模型 ----------
function loadArch(arch) {
  if (!loadCache.has(arch)) {
    loadCache.set(arch, new Promise((res, rej) => {
      const ld = new GLTFLoader();
      ld.setMeshoptDecoder(MeshoptDecoder);
      ld.load('assets/models/packed/' + arch + '.glb', res, undefined, rej);
    }));
  }
  return loadCache.get(arch);
}
export function preload(archList) { archList.forEach(a => loadArch(a).catch(() => {})); }

const tintCache = new Map();
function tintMaterial(mat, tintHex) {
  if (!tintHex) return mat;
  const key = mat.uuid + '|' + tintHex;
  if (!tintCache.has(key)) {
    const m2 = mat.clone();
    m2.color = mat.color.clone().lerp(new THREE.Color(tintHex), 0.45);
    tintCache.set(key, m2);
  }
  return tintCache.get(key);
}

// ---------- 单位 ----------
export function addUnit(uid, cfg) {
  // cfg: { arch, tint, team, star, c, r, big }  team0=我方(下半场,面朝-Z)
  removeUnit(uid);
  const group = new THREE.Group();
  group.position.set(wx(cfg.c, cfg.r), 0, wz(cfg.r));
  // 摆放时侧身45°（能看到脸），战斗中移动/攻击会自动转向目标
  group.rotation.y = (cfg.team === 0 ? 1 : -1) * Math.PI / 4;
  // 底座：队伍色圆盘 + 星级环
  const baseCol = cfg.team === 0 ? 0xb08d3f : 0x8a3b2e;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.05, 24), new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.6 }));
  base.position.y = 0.025;
  group.add(base);
  if (cfg.star >= 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 8, 32), new THREE.MeshStandardMaterial({ color: cfg.star >= 3 ? 0xffd700 : 0xc9d3de, emissive: cfg.star >= 3 ? 0xaa8800 : 0x445566, roughness: 0.35 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
  }
  unitGroup.add(group);
  const spec = ARCHS[cfg.arch] || ARCHS.Knight;
  const scl = spec.scale * (cfg.big || 1);
  const u = { group, model: null, mixer: null, clips: null, arch: cfg.arch, spec, team: cfg.team, c: cfg.c, r: cfg.r, headY: 1.35 * scl + (spec.fly || 0), dead: false, mv: null, cur: null, baseMesh: base };
  units.set(uid, u);
  loadArch(cfg.arch).then(g => {
    if (disposed || !units.has(uid) || units.get(uid) !== u || u.dead) return;
    const model = SkeletonUtils.clone(g.scene);
    model.scale.setScalar(scl);
    model.position.y = (spec.fly || 0) + 0.05;
    // 变体：按部件全集显隐（cfg.show = 该单位要显示的部件名单）
    if (spec.parts) {
      const showSet = new Set(cfg.show || []);
      model.traverse(o => { if (spec.parts.includes(o.name)) o.visible = showSet.has(o.name); });
    }
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false; // 骨骼动画包围盒不更新，防止斜视角被误剔除
        if (cfg.tint) {
          if (Array.isArray(o.material)) o.material = o.material.map(m => tintMaterial(m, cfg.tint));
          else o.material = tintMaterial(o.material, cfg.tint);
        }
      }
    });
    group.add(model);
    u.model = model;
    u.mixer = new THREE.AnimationMixer(model);
    u.clips = g.animations;
    play(u, 'idle');
  }).catch(() => {});
  return u;
}

function clipOf(u, key) {
  const name = u.spec.anims[key] || u.spec.anims.idle;
  return u.clips && (u.clips.find(a => a.name === name) || u.clips[0]);
}
function play(u, key, { once = false, then = 'idle', fade = 0.15 } = {}) {
  if (!u.mixer || u.dead && key !== 'death') return;
  const clip = clipOf(u, key);
  if (!clip) return;
  const action = u.mixer.clipAction(clip);
  if (u.cur === action && !once) return;
  action.reset();
  if (once) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    const onDone = e => {
      if (e.action !== action) return;
      u.mixer.removeEventListener('finished', onDone);
      if (!u.dead && then) play(u, then);
    };
    u.mixer.addEventListener('finished', onDone);
  } else action.setLoop(THREE.LoopRepeat, Infinity);
  if (u.cur) u.cur.crossFadeTo(action, fade, false);
  action.play();
  u.cur = action;
}

export function anim(uid, key, o) { const u = units.get(uid); if (u) play(u, key, { once: key !== 'idle' && key !== 'walk' && key !== 'run', ...o }); }

export function attackAnim(uid, tgtUid, kind) { // kind: melee|melee2|shoot|shoot2|cast|castBig
  const u = units.get(uid);
  if (!u) return;
  const t = units.get(tgtUid);
  if (t) faceTowards(u, t.group.position);
  play(u, kind || 'melee', { once: true });
}
function faceTowards(u, pos) {
  const dx = pos.x - u.group.position.x, dz = pos.z - u.group.position.z;
  if (dx * dx + dz * dz > 1e-6) u.group.rotation.y = Math.atan2(dx, dz);
}

export function moveUnit(uid, c, r, { dash = false } = {}) {
  const u = units.get(uid);
  if (!u) return;
  const from = u.group.position.clone();
  const to = new THREE.Vector3(wx(c, r), 0, wz(r));
  u.c = c; u.r = r;
  faceTowards(u, to);
  u.mv = { from, to, t: 0, dur: dash ? 0.13 : 0.25 };
  play(u, dash ? 'run' : 'walk');
}

export function removeUnit(uid, { death = false } = {}) {
  const u = units.get(uid);
  if (!u) return;
  if (death && u.mixer) {
    u.dead = true;
    play(u, 'death', { once: true, then: null });
    u.sink = 1.4; // 尸体停留秒数，之后下沉删除
  } else {
    disposeUnit(uid);
  }
}
function disposeUnit(uid) {
  const u = units.get(uid);
  if (!u) return;
  unitGroup.remove(u.group);
  units.delete(uid);
}
export function clearUnits() { for (const uid of [...units.keys()]) disposeUnit(uid); }

export function cheerTeam(team) { for (const [, u] of units) if (u.team === team && !u.dead) play(u, 'cheer', { once: true }); }

export function liftUnit(uid, on) {
  const u = units.get(uid);
  if (u) { u.lift = on; if (!on) u.group.position.set(wx(u.c, u.r), 0, wz(u.r)); }
}

// ---------- 高亮 ----------
export function highlightCells(list, color = 0xc9ec9a) {
  clearHighlights();
  for (const [c, r] of list) {
    const t = tiles[c + ',' + r];
    if (t) { t.material.color.setHex(color); t.userData.hl = true; }
  }
}
export function clearHighlights() {
  for (const k in tiles) { const t = tiles[k]; if (t.userData.hl) { t.material.color.setHex(t.userData.baseColor); t.userData.hl = false; } }
}
export function markCell(c, r, color = 0xffe9a8) { // 拖拽悬浮落点
  for (const k in tiles) { const t = tiles[k]; if (t.userData.mark) { t.material.color.setHex(t.userData.hl ? 0xc9ec9a : t.userData.baseColor); t.userData.mark = false; } }
  const t = tiles[c + ',' + r];
  if (t) { t.material.color.setHex(color); t.userData.mark = true; }
}
export function flashCell(c, r) {
  const t = tiles[c + ',' + r];
  if (!t) return;
  const old = t.material.color.getHex();
  t.material.color.setHex(0xffffff);
  setTimeout(() => { if (!t.userData.hl && !t.userData.mark) t.material.color.setHex(t.userData.baseColor); else t.material.color.setHex(old); }, 180);
}

// ---------- 拾取与投影 ----------
export function pickAt(clientX, clientY) {
  if (!renderer) return null;
  const rect = canvas.getBoundingClientRect();
  const p = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(p, cam);
  const uh = raycaster.intersectObjects(unitGroup.children, true)[0];
  if (uh) {
    let o = uh.object;
    while (o && o.parent !== unitGroup) o = o.parent;
    for (const [uid, u] of units) if (u.group === o) return { unit: uid, c: u.c, r: u.r };
  }
  const th = raycaster.intersectObjects(tileGroup.children, false)[0];
  if (th) return { cell: [th.object.userData.c, th.object.userData.r] };
  return null;
}
const _v = new THREE.Vector3();
export function screenOf(uid) {
  const u = units.get(uid);
  if (!u || !renderer) return null;
  _v.copy(u.group.position); _v.y += u.headY;
  _v.project(cam);
  return { x: (_v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-_v.y * 0.5 + 0.5) * canvas.clientHeight };
}
export function cellScreen(c, r) {
  if (!renderer) return { x: 0, y: 0 };
  _v.set(wx(c, r), 0.3, wz(r));
  _v.project(cam);
  return { x: (_v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-_v.y * 0.5 + 0.5) * canvas.clientHeight };
}
export function isCanvas(el) { return el === canvas; }

// ---------- 主循环 ----------
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1) * speedMult;
  for (const [uid, u] of units) {
    if (u.mixer) u.mixer.update(dt);
    if (u.mv) {
      u.mv.t += dt / u.mv.dur;
      if (u.mv.t >= 1) {
        u.group.position.copy(u.mv.to);
        u.mv = null;
        if (!u.dead) play(u, 'idle');
      } else {
        u.group.position.lerpVectors(u.mv.from, u.mv.to, u.mv.t);
      }
    }
    if (u.lift) u.group.position.y = 0.3; else if (!u.mv && !u.dead) u.group.position.y = 0;
    if (u.dead && u.sink != null) {
      u.sink -= dt;
      if (u.sink < 0) {
        u.group.position.y -= dt * 0.8;
        u.group.traverse(o => { if (o.material && o.material.transparent !== true) { /* 简化：直接下沉 */ } });
        if (u.group.position.y < -1.2) disposeUnit(uid);
      }
    }
  }
  renderer.render(scene, cam);
  if (opts.onFrame) opts.onFrame();
}
