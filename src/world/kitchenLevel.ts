import * as THREE from 'three';
import {
  AABBZone,
  HidingSpot,
  InteractiveProp,
  ROOM_D,
  ROOM_H,
  ROOM_W,
  WALL_T,
  WORLD_SCALE as S,
} from '../types';
import {
  Palette,
  createTileTexture,
  createToonMaterial,
} from '../style/palette';
import {
  PropBuildContext,
  addBox,
  buildDispenser,
  buildEmberGayung,
  buildJamDinding,
  buildJendela,
  buildKalender,
  buildKomporGas,
  buildKulkas,
  buildLampuPlafon,
  buildLemariGantung,
  buildMejaDapur,
  buildMejaMakan,
  buildTempatSampah,
  buildWastafel,
  buildKursi,
  createKitchenMaterials,
} from './kitchenProps';

export interface KitchenLevelData {
  root: THREE.Group;
  walkables: THREE.Object3D[];
  obstacles: THREE.Object3D[];
  interactiveProps: InteractiveProp[];
  hidingSpots: HidingSpot[];
  soapyZone: AABBZone;
  updraftZone: AABBZone;
  updraftParticles: THREE.Points;
  kokoSpawn: THREE.Vector3;
  ibuSpawn: THREE.Vector3;
  stations: {
    Kulkas: THREE.Vector3;
    MejaDapur: THREE.Vector3;
    Kompor: THREE.Vector3;
    MejaMakan: THREE.Vector3;
    TempatSapu: THREE.Vector3;
  };
}

export function buildKitchenLevel(scene: THREE.Scene): KitchenLevelData {
  const root = new THREE.Group();
  root.name = 'Environment_Kitchen';
  scene.add(root);

  // Sky & Fog matching KecoakazeStyle
  scene.background = new THREE.Color(Palette.SkyHorizon);
  scene.fog = new THREE.Fog(Palette.SkyHorizon, 48, 125);

  // Lighting: bright, cozy Indonesian tropical kitchen
  const hemi = new THREE.HemisphereLight(0xf6fbf7, 0x8d877a, 1.05);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xfff4de, 1.45);
  dirLight.position.set(16, 26, -14);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 75;
  const d = 32;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Warm bulb point light over dining table
  const diningLight = new THREE.PointLight(0xffe1a6, 0.9, 32, 1.2);
  diningLight.position.set(1.6 * S, (ROOM_H - 0.45) * S, -0.4 * S);
  scene.add(diningLight);

  const ctx: PropBuildContext = { walkables: [], obstacles: [] };
  const mats = createKitchenMaterials();

  // 1. Room Shell (8m x 6.5m x 2.7m)
  const room = new THREE.Group();
  room.name = 'Room_Shell';
  root.add(room);

  const floorTex = createTileTexture(
    2,
    '#E6DCC6',
    '#D8CDB4',
    '#A79D8C',
    true,
    (ROOM_W + 0.4) / 0.8,
    (ROOM_D + 0.4) / 0.8
  );
  const wallTileTex = createTileTexture(
    4,
    '#CFE6E0',
    '#CFE6E0',
    '#8FB0AA',
    false,
    ROOM_W / 0.8,
    1.3 / 0.8
  );

  const floorMat = createToonMaterial(0xffffff, { map: floorTex });
  const wallTileMat = createToonMaterial(0xffffff, { map: wallTileTex });
  const wallPaintMat = createToonMaterial(0xe7ddc4);
  const wallSideMat = createToonMaterial(0xd5e2d0);
  const ceilingMat = createToonMaterial(Palette.White);

  const halfW = ROOM_W * 0.5;
  const halfD = ROOM_D * 0.5;

  const shellOpts = { castShadow: false, receiveShadow: true, edges: false };
  addBox(room, 'Lantai_Keramik', [0, -0.05, 0], [ROOM_W + 0.4, 0.1, ROOM_D + 0.4], floorMat, ctx, shellOpts);
  addBox(
    room,
    'Dinding_Belakang_Keramik',
    [0, 0.65, halfD + WALL_T * 0.5],
    [ROOM_W, 1.3, WALL_T],
    wallTileMat,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Dinding_Belakang_Cat',
    [0, 1.3 + (ROOM_H - 1.3) * 0.5, halfD + WALL_T * 0.5],
    [ROOM_W, ROOM_H - 1.3, WALL_T],
    wallPaintMat,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Dinding_Kiri',
    [-halfW - WALL_T * 0.5, ROOM_H * 0.5, 0],
    [WALL_T, ROOM_H, ROOM_D + WALL_T * 2],
    wallSideMat,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Dinding_Kanan',
    [halfW + WALL_T * 0.5, ROOM_H * 0.5, 0],
    [WALL_T, ROOM_H, ROOM_D + WALL_T * 2],
    wallSideMat,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Dinding_Depan_Rendah',
    [0, 0.45, -halfD - WALL_T * 0.5],
    [ROOM_W, 0.9, WALL_T],
    wallPaintMat,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Dinding_Depan_Ambalan',
    [0, 0.92, -halfD - WALL_T * 0.5],
    [ROOM_W + 0.1, 0.04, 0.24],
    mats.woodDark,
    ctx,
    shellOpts
  );
  addBox(
    room,
    'Plafon',
    [0, ROOM_H + 0.05, 0],
    [ROOM_W + 0.3, 0.1, ROOM_D + 0.3],
    ceilingMat,
    ctx,
    { castShadow: false, receiveShadow: false, edges: false, isObstacle: false }
  );
  addBox(
    room,
    'List_Plafon_Belakang',
    [0, ROOM_H - 0.04, halfD - 0.03],
    [ROOM_W, 0.08, 0.06],
    mats.woodDark,
    ctx,
    { collider: false, castShadow: false }
  );

  // 2. Place Props
  const propRoot = new THREE.Group();
  propRoot.name = 'Props';
  root.add(propRoot);

  const place = (obj: THREE.Group, posM: [number, number, number], yawDeg = 0): THREE.Group => {
    obj.position.set(posM[0] * S, posM[1] * S, posM[2] * S);
    obj.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    propRoot.add(obj);
    return obj;
  };

  const counterZ = ROOM_D * 0.5 - 0.31;
  place(buildKulkas(mats, ctx), [-3.5, 0, counterZ - 0.02]);
  place(buildWastafel(mats, ctx), [-2.45, 0, counterZ]);
  const goKompor = place(buildKomporGas(mats, ctx), [-1.2, 0, counterZ]);
  const goMejaDapur = place(buildMejaDapur(mats, ctx), [0.05, 0, counterZ]);
  place(buildLemariGantung(mats, ctx), [-0.58, 1.55, ROOM_D * 0.5 - 0.16]);
  place(buildJendela(mats, ctx), [-2.45, 1.62, ROOM_D * 0.5 - 0.04]);
  place(buildJamDinding(mats, ctx), [1.4, 2.1, ROOM_D * 0.5 - 0.02]);
  place(buildKalender(mats, ctx), [2.2, 1.55, ROOM_D * 0.5 - 0.01]);
  place(buildDispenser(mats, ctx), [3.6, 0, ROOM_D * 0.5 - 0.3]);

  const goMejaMakan = place(buildMejaMakan(mats, ctx), [1.6, 0, -0.4]);
  place(buildKursi(mats, mats.chairRed, ctx), [1.3, 0, -1.08], 180);
  place(buildKursi(mats, mats.chairBlue, ctx), [1.95, 0, 0.28], 10);
  place(buildLampuPlafon(mats, ctx), [1.6, ROOM_H, -0.4]);

  place(buildTempatSampah(mats, ctx), [-3.6, 0, -2.75]);
  place(buildEmberGayung(mats, ctx), [-3.55, 0, -1.95], 25);

  // Sapu Lidi bersandar di pojok tempat sapu (-3.6, 0, -2.75)
  const sapuIdle = new THREE.Group();
  sapuIdle.position.set(-3.75 * S, 0, -2.95 * S);
  sapuIdle.rotation.z = -0.12;
  addBox(sapuIdle, 'Sapu_Stand_Handle', [0, 0.72, 0], [0.03, 1.4, 0.03], mats.woodDark, ctx, { collider: false });
  addBox(sapuIdle, 'Sapu_Stand_Bristle', [0, 0.14, 0], [0.22, 0.28, 0.06], createToonMaterial(Palette.Rattan), ctx, { collider: false });
  propRoot.add(sapuIdle);

  // 3. Interactive Props (3 Keisengan Berurutan)
  const interactiveProps = createInteractiveProps(root, goMejaDapur, goKompor, goMejaMakan);

  // 4. Hiding Spots (5 spots: 3 Safe, 2 Risky)
  const hidingSpots = createHidingSpots(root, counterZ);

  // 5. Environmental Hazards
  const soapyCenter = new THREE.Vector3(-2.45 * S, 0.05, (counterZ - 0.45) * S);
  const soapyZone: AABBZone = {
    name: 'SoapyFloor',
    min: new THREE.Vector3(soapyCenter.x - 0.38 * S, -0.2, soapyCenter.z - 0.25 * S),
    max: new THREE.Vector3(soapyCenter.x + 0.38 * S, 0.65, soapyCenter.z + 0.25 * S),
  };

  const stovePos = new THREE.Vector3(-1.2 * S, 1.4 * S, (counterZ + 0.04) * S);
  const updraftZone: AABBZone = {
    name: 'ThermalUpdraft',
    min: new THREE.Vector3(stovePos.x - 0.45 * S, 0.95 * S, stovePos.z - 0.3 * S),
    max: new THREE.Vector3(stovePos.x + 0.45 * S, 2.2 * S, stovePos.z + 0.3 * S),
  };
  const updraftParticles = createUpdraftParticles(root, new THREE.Vector3(-1.2 * S, 1.0 * S, (counterZ + 0.04) * S));

  // Ensure world matrices are fresh for raycasting
  scene.updateMatrixWorld(true);

  return {
    root,
    walkables: ctx.walkables,
    obstacles: ctx.obstacles,
    interactiveProps,
    hidingSpots,
    soapyZone,
    updraftZone,
    updraftParticles,
    kokoSpawn: new THREE.Vector3(-2.6 * S, 0.08, -2.2 * S),
    ibuSpawn: new THREE.Vector3(0.05 * S, 0, 2.0 * S),
    stations: {
      Kulkas: new THREE.Vector3(-3.5 * S, 0, (counterZ - 0.02 - 0.72) * S),
      MejaDapur: new THREE.Vector3(0.05 * S, 0, (counterZ - 0.72) * S),
      Kompor: new THREE.Vector3(-1.2 * S, 0, (counterZ - 0.72) * S),
      MejaMakan: new THREE.Vector3(1.6 * S, 0, 0.38 * S),
      TempatSapu: new THREE.Vector3(-3.2 * S, 0, -2.35 * S),
    },
  };
}

function createInteractiveProps(
  root: THREE.Group,
  goMejaDapur: THREE.Group,
  goKompor: THREE.Group,
  goMejaMakan: THREE.Group
): InteractiveProp[] {
  const beaconGeo = new THREE.RingGeometry(0.18 * S, 0.26 * S, 24);
  beaconGeo.rotateX(-Math.PI / 2);

  const makeBeacon = (pos: THREE.Vector3, color: number): THREE.Mesh => {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(beaconGeo, mat);
    m.position.copy(pos).add(new THREE.Vector3(0, 0.18, 0));
    m.raycast = () => {};
    root.add(m);
    return m;
  };

  // Prop 1: Bahan Sayur di Meja Dapur
  const pos1 = new THREE.Vector3(0.05 * S, 0.88 * S, (ROOM_D * 0.5 - 0.31 - 0.05) * S);
  const ruined1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.35 * S, 0.04 * S, 0.22 * S),
    createToonMaterial(0x5a3e28)
  );
  ruined1.position.copy(pos1);
  ruined1.visible = false;
  root.add(ruined1);
  const talenan = goMejaDapur.getObjectByName('Talenan_Group');

  // Prop 2: Panci Sup di Kompor
  const pos2 = new THREE.Vector3((-1.2 + 0.18) * S, 1.01 * S, (ROOM_D * 0.5 - 0.31 + 0.04) * S);
  const ruined2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.025 * S, 16),
    createToonMaterial(0x3e5b26)
  );
  ruined2.position.copy(pos2).add(new THREE.Vector3(0, 0.03 * S, 0));
  ruined2.visible = false;
  root.add(ruined2);
  const wajan = goKompor.getObjectByName('Wajan');

  // Prop 3: Sayur Tumis di Meja Makan
  const pos3 = new THREE.Vector3((1.6 + 0.28) * S, 0.76 * S, (-0.4 + 0.02) * S);
  const ruined3 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19 * S, 0.19 * S, 0.03 * S, 16),
    createToonMaterial(0x442211)
  );
  ruined3.position.copy(pos3).add(new THREE.Vector3(0, 0.03 * S, 0));
  ruined3.visible = false;
  root.add(ruined3);
  const tudung = goMejaMakan.getObjectByName('TudungSaji_Group');

  return [
    {
      type: 0,
      targetName: 'Bahan Sayur di Meja Dapur',
      actionVerb: 'MAKAN',
      requiredHoldDuration: 2.0,
      interactionRadius: 2.6,
      position: pos1,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: talenan ? [talenan] : [],
      ruinedVisual: ruined1,
      beaconMesh: makeBeacon(pos1, 0xffbf52),
    },
    {
      type: 1,
      targetName: 'Panci Sup di Kompor',
      actionVerb: 'KOTORI',
      requiredHoldDuration: 1.2,
      interactionRadius: 2.5,
      position: pos2,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: wajan ? [wajan] : [],
      ruinedVisual: ruined2,
      beaconMesh: makeBeacon(pos2, 0x8be08f),
    },
    {
      type: 2,
      targetName: 'Sayur Tumis di Meja Makan',
      actionVerb: 'MAKAN',
      requiredHoldDuration: 2.2,
      interactionRadius: 2.7,
      position: pos3,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: tudung ? [tudung] : [],
      ruinedVisual: ruined3,
      beaconMesh: makeBeacon(pos3, 0xff7744),
    },
  ];
}

function createHidingSpots(root: THREE.Group, counterZ: number): HidingSpot[] {
  const spots: Array<{
    id: string;
    name: string;
    safety: 'Safe' | 'Risky';
    pos: THREE.Vector3;
    half: THREE.Vector3;
    offset: THREE.Vector3;
  }> = [
    {
      id: 'bawah_kulkas',
      name: 'Bawah Kulkas',
      safety: 'Safe',
      pos: new THREE.Vector3(-3.5 * S, 0.14 * S, (counterZ - 0.02) * S),
      half: new THREE.Vector3(0.55 * S, 0.2 * S, 0.45 * S),
      offset: new THREE.Vector3(0, 0, -1.2 * S),
    },
    {
      id: 'kolong_lemari',
      name: 'Kolong Lemari Bawah',
      safety: 'Safe',
      pos: new THREE.Vector3(-2.0 * S, 0.14 * S, counterZ * S),
      half: new THREE.Vector3(0.65 * S, 0.2 * S, 0.45 * S),
      offset: new THREE.Vector3(0, 0, -1.2 * S),
    },
    {
      id: 'atas_kulkas',
      name: 'Atas Kulkas',
      safety: 'Safe',
      pos: new THREE.Vector3(-3.5 * S, 1.9 * S, (counterZ - 0.02) * S),
      half: new THREE.Vector3(0.5 * S, 0.25 * S, 0.45 * S),
      offset: new THREE.Vector3(0, -1.9 * S, -1.2 * S),
    },
    {
      id: 'belakang_dispenser',
      name: 'Belakang Dispenser',
      safety: 'Risky',
      pos: new THREE.Vector3(3.6 * S, 0.2 * S, (counterZ - 0.3) * S + 0.35 * S),
      half: new THREE.Vector3(0.38 * S, 0.3 * S, 0.38 * S),
      offset: new THREE.Vector3(-0.7 * S, 0, -0.7 * S),
    },
    {
      id: 'bawah_meja_makan',
      name: 'Bawah Meja Makan',
      safety: 'Risky',
      pos: new THREE.Vector3(1.6 * S, 0.24 * S, -0.4 * S),
      half: new THREE.Vector3(0.85 * S, 0.32 * S, 0.65 * S),
      offset: new THREE.Vector3(0, 0, -1.2 * S),
    },
  ];

  return spots.map((s) => {
    const geom = new THREE.PlaneGeometry(s.half.x * 1.6, s.half.z * 1.4);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: s.safety === 'Safe' ? 0x59e0ba : 0xffbf52,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const indicator = new THREE.Mesh(geom, mat);
    indicator.position.set(s.pos.x, Math.max(0.03, s.pos.y - s.half.y + 0.05), s.pos.z);
    indicator.raycast = () => {};
    root.add(indicator);

    return {
      id: s.id,
      name: s.name,
      safety: s.safety,
      position: s.pos,
      halfExtents: s.half,
      inspectStandOffset: s.offset,
      isKokoInside: false,
      indicatorMesh: indicator,
    };
  });
}

function createUpdraftParticles(root: THREE.Group, origin: THREE.Vector3): THREE.Points {
  const count = 42;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x + (Math.random() - 0.5) * 4.2;
    positions[i * 3 + 1] = origin.y + Math.random() * 7.5;
    positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 2.8;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.userData.origin = origin.clone();

  const mat = new THREE.PointsMaterial({
    color: 0xbef2ff,
    size: 0.22,
    transparent: true,
    opacity: 0.65,
  });
  const pts = new THREE.Points(geom, mat);
  pts.raycast = () => {};
  root.add(pts);
  return pts;
}
