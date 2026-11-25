import * as THREE from 'three';
import { WORLD_SCALE as S } from '../types';
import {
  Palette,
  attachInkEdges,
  createToonMaterial,
  createWoodTexture,
} from '../style/palette';

export interface KitchenMaterialSet {
  fridgeBody: THREE.MeshToonMaterial;
  ink: THREE.MeshToonMaterial;
  steel: THREE.MeshToonMaterial;
  counter: THREE.MeshToonMaterial;
  counterTop: THREE.MeshToonMaterial;
  stoveDark: THREE.MeshToonMaterial;
  flame: THREE.MeshToonMaterial;
  lpg: THREE.MeshToonMaterial;
  pan: THREE.MeshToonMaterial;
  wood: THREE.MeshToonMaterial;
  woodDark: THREE.MeshToonMaterial;
  tudungSaji: THREE.MeshToonMaterial;
  plate: THREE.MeshToonMaterial;
  plateBlue: THREE.MeshToonMaterial;
  chairRed: THREE.MeshToonMaterial;
  chairBlue: THREE.MeshToonMaterial;
  galon: THREE.MeshToonMaterial;
  white: THREE.MeshToonMaterial;
  cabinetSage: THREE.MeshToonMaterial;
  glass: THREE.MeshToonMaterial;
  curtain: THREE.MeshToonMaterial;
  trash: THREE.MeshToonMaterial;
  bucket: THREE.MeshToonMaterial;
  gayung: THREE.MeshToonMaterial;
  sponge: THREE.MeshToonMaterial;
  soapBottle: THREE.MeshToonMaterial;
  cardboard: THREE.MeshToonMaterial;
  orange: THREE.MeshToonMaterial;
  red: THREE.MeshToonMaterial;
  riceCookerBand: THREE.MeshToonMaterial;
  soapFoam: THREE.MeshToonMaterial;
}

export function createKitchenMaterials(): KitchenMaterialSet {
  const woodTex = createWoodTexture();
  return {
    fridgeBody: createToonMaterial(0xa9dcc9),
    ink: createToonMaterial(Palette.Ink),
    steel: createToonMaterial(Palette.Steel),
    counter: createToonMaterial(0xd9cfb8),
    counterTop: createToonMaterial(0x8fa5a8),
    stoveDark: createToonMaterial(Palette.SlateDark),
    flame: createToonMaterial(0x6fb7ff, { emissive: 0x3c7fd9, emissiveIntensity: 0.9 }),
    lpg: createToonMaterial(0x78b24f),
    pan: createToonMaterial(0x3e4246),
    wood: createToonMaterial(0xffffff, { map: woodTex }),
    woodDark: createToonMaterial(Palette.WoodDark),
    tudungSaji: createToonMaterial(0xd2544b),
    plate: createToonMaterial(Palette.White),
    plateBlue: createToonMaterial(Palette.SkyBlue),
    chairRed: createToonMaterial(Palette.Red),
    chairBlue: createToonMaterial(Palette.Navy),
    galon: createToonMaterial(0xa9d6ea, { transparent: true, opacity: 0.88 }),
    white: createToonMaterial(Palette.White),
    cabinetSage: createToonMaterial(Palette.Sage),
    glass: createToonMaterial(0xc6eee3, { emissive: 0x4a6b63, emissiveIntensity: 0.45 }),
    curtain: createToonMaterial(Palette.Mustard),
    trash: createToonMaterial(Palette.Teal),
    bucket: createToonMaterial(Palette.Orange),
    gayung: createToonMaterial(0xe592a6),
    sponge: createToonMaterial(0xf1d45c),
    soapBottle: createToonMaterial(Palette.Mint),
    cardboard: createToonMaterial(0xc79f6b),
    orange: createToonMaterial(Palette.Orange),
    red: createToonMaterial(Palette.Red),
    riceCookerBand: createToonMaterial(0xe7a3a6),
    soapFoam: createToonMaterial(0xf7fbff, { transparent: true, opacity: 0.82 }),
  };
}

export interface PropBuildContext {
  walkables: THREE.Object3D[];
  obstacles: THREE.Object3D[];
}

export function addBox(
  parent: THREE.Object3D,
  name: string,
  centerM: [number, number, number],
  sizeM: [number, number, number],
  mat: THREE.Material,
  ctx?: PropBuildContext,
  options: {
    collider?: boolean;
    edges?: boolean;
    eulerDeg?: [number, number, number];
    castShadow?: boolean;
    receiveShadow?: boolean;
    isObstacle?: boolean;
  } = {}
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(sizeM[0] * S, sizeM[1] * S, sizeM[2] * S);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  mesh.position.set(centerM[0] * S, centerM[1] * S, centerM[2] * S);
  if (options.eulerDeg) {
    mesh.rotation.set(
      THREE.MathUtils.degToRad(options.eulerDeg[0]),
      THREE.MathUtils.degToRad(options.eulerDeg[1]),
      THREE.MathUtils.degToRad(options.eulerDeg[2])
    );
  }
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.edges ?? true) attachInkEdges(mesh);
  parent.add(mesh);

  const hasCollider = options.collider ?? true;
  if (hasCollider && ctx) {
    ctx.walkables.push(mesh);
    if (options.isObstacle ?? true) ctx.obstacles.push(mesh);
  }
  return mesh;
}

export function addCyl(
  parent: THREE.Object3D,
  name: string,
  centerM: [number, number, number],
  diameterM: number,
  heightM: number,
  mat: THREE.Material,
  ctx?: PropBuildContext,
  options: {
    collider?: boolean;
    eulerDeg?: [number, number, number];
    segments?: number;
    isObstacle?: boolean;
  } = {}
): THREE.Mesh {
  const r = (diameterM * 0.5) * S;
  const h = heightM * S;
  const geom = new THREE.CylinderGeometry(r, r, h, options.segments ?? 16);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  mesh.position.set(centerM[0] * S, centerM[1] * S, centerM[2] * S);
  if (options.eulerDeg) {
    mesh.rotation.set(
      THREE.MathUtils.degToRad(options.eulerDeg[0]),
      THREE.MathUtils.degToRad(options.eulerDeg[1]),
      THREE.MathUtils.degToRad(options.eulerDeg[2])
    );
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  const hasCollider = options.collider ?? true;
  if (hasCollider && ctx) {
    ctx.walkables.push(mesh);
    if (options.isObstacle ?? false) ctx.obstacles.push(mesh);
  }
  return mesh;
}

export function addSph(
  parent: THREE.Object3D,
  name: string,
  centerM: [number, number, number],
  sizeM: [number, number, number],
  mat: THREE.Material,
  ctx?: PropBuildContext,
  collider = false
): THREE.Mesh {
  const geom = new THREE.SphereGeometry(0.5 * S, 14, 10);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  mesh.position.set(centerM[0] * S, centerM[1] * S, centerM[2] * S);
  mesh.scale.set(sizeM[0], sizeM[1], sizeM[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (collider && ctx) ctx.walkables.push(mesh);
  return mesh;
}

function addCounterBase(
  root: THREE.Group,
  m: KitchenMaterialSet,
  width: number,
  ctx: PropBuildContext,
  solidTop = true
): void {
  const cabinetH = solidTop ? 0.82 : 0.66;
  addBox(root, 'Cabinet', [0, cabinetH * 0.5, 0.01], [width, cabinetH, 0.58], m.counter, ctx);
  addBox(root, 'Plinth', [0, 0.04, -0.27], [width - 0.04, 0.08, 0.02], m.woodDark, ctx, { collider: false });
  if (solidTop) {
    addBox(root, 'Top', [0, 0.84, 0], [width + 0.02, 0.04, 0.62], m.counterTop, ctx);
  }
  const doors = Math.max(1, Math.round(width / 0.5));
  const doorW = width / doors;
  for (let i = 0; i < doors; i++) {
    const x = -width * 0.5 + doorW * (i + 0.5);
    if (i > 0) {
      addBox(root, `DoorGap_${i}`, [x - doorW * 0.5, 0.45, -0.285], [0.012, 0.66, 0.01], m.ink, ctx, {
        collider: false,
        edges: false,
      });
    }
    const knobX = x + (i % 2 === 0 ? doorW * 0.32 : -doorW * 0.32);
    addSph(root, `Knob_${i}`, [knobX, 0.62, -0.3], [0.035, 0.035, 0.035], m.steel);
  }
  addBox(root, 'DrawerGap', [0, 0.7, -0.285], [width - 0.02, 0.012, 0.01], m.ink, ctx, {
    collider: false,
    edges: false,
  });
}

export function buildKulkas(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kulkas';
  addBox(root, 'Body', [0, 0.875, 0], [0.68, 1.75, 0.66], m.fridgeBody, ctx);
  addBox(root, 'DoorGap', [0, 1.18, -0.333], [0.66, 0.014, 0.01], m.ink, ctx, { collider: false, edges: false });
  addBox(root, 'Handle_Freezer', [-0.27, 1.36, -0.35], [0.03, 0.2, 0.04], m.steel, ctx, { collider: false });
  addBox(root, 'Handle_Main', [-0.27, 0.92, -0.35], [0.03, 0.32, 0.04], m.steel, ctx, { collider: false });
  addBox(root, 'Magnet_Orange', [0.12, 1.02, -0.335], [0.06, 0.06, 0.012], m.orange, ctx, { collider: false });
  addBox(root, 'Magnet_Red', [0.2, 0.78, -0.335], [0.05, 0.05, 0.012], m.red, ctx, { collider: false });
  addBox(root, 'Note_Belanja', [0.02, 0.66, -0.334], [0.13, 0.17, 0.008], m.white, ctx, { collider: false });
  addBox(root, 'Kardus_Atas', [0.05, 1.86, 0.04], [0.42, 0.22, 0.36], m.cardboard, ctx);
  addBox(root, 'Kaki', [0, 0.02, -0.2], [0.6, 0.04, 0.04], m.ink, ctx, { collider: false });
  return root;
}

export function buildWastafel(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Wastafel';
  const w = 1.2;
  addCounterBase(root, m, w, ctx, false);

  addBox(root, 'Fascia_Front', [0, 0.74, -0.28], [w, 0.16, 0.02], m.counter, ctx);
  addBox(root, 'Fascia_Back', [0, 0.74, 0.29], [w, 0.16, 0.02], m.counter, ctx);
  addBox(root, 'Fascia_L', [-w * 0.5 + 0.01, 0.74, 0.01], [0.02, 0.16, 0.58], m.counter, ctx);
  addBox(root, 'Fascia_R', [w * 0.5 - 0.01, 0.74, 0.01], [0.02, 0.16, 0.58], m.counter, ctx);

  addBox(root, 'Top_L', [-0.43, 0.84, 0.01], [0.37, 0.04, 0.62], m.counterTop, ctx);
  addBox(root, 'Top_R', [0.43, 0.84, 0.01], [0.37, 0.04, 0.62], m.counterTop, ctx);
  addBox(root, 'Top_Front', [0, 0.84, -0.23], [0.5, 0.04, 0.16], m.counterTop, ctx);
  addBox(root, 'Top_Back', [0, 0.84, 0.265], [0.5, 0.04, 0.13], m.counterTop, ctx);

  addBox(root, 'Basin_Bottom', [0, 0.67, 0.02], [0.5, 0.02, 0.36], m.steel, ctx);
  addBox(root, 'Basin_WallF', [0, 0.75, -0.155], [0.5, 0.16, 0.01], m.steel, ctx, { collider: false });
  addBox(root, 'Basin_WallB', [0, 0.75, 0.195], [0.5, 0.16, 0.01], m.steel, ctx, { collider: false });
  addBox(root, 'Basin_WallL', [-0.245, 0.75, 0.02], [0.01, 0.16, 0.36], m.steel, ctx, { collider: false });
  addBox(root, 'Basin_WallR', [0.245, 0.75, 0.02], [0.01, 0.16, 0.36], m.steel, ctx, { collider: false });

  addCyl(root, 'Faucet_Pipe', [0, 0.98, 0.25], 0.04, 0.26, m.steel, ctx, { collider: false });
  addCyl(root, 'Faucet_Spout', [0, 1.1, 0.16], 0.035, 0.2, m.steel, ctx, { collider: false, eulerDeg: [90, 0, 0] });
  addBox(root, 'Faucet_Lever', [0, 1.13, 0.27], [0.025, 0.02, 0.1], m.red, ctx, { collider: false });

  addBox(root, 'Spons', [0.45, 0.885, 0.12], [0.1, 0.04, 0.06], m.sponge, ctx, { collider: false });
  addCyl(root, 'Sabun_Cuci', [0.5, 0.95, 0.24], 0.07, 0.18, m.soapBottle, ctx, { collider: false });
  for (let i = 0; i < 3; i++) {
    addCyl(root, `Piring_Kotor_${i}`, [-0.42, 0.87 + i * 0.022, 0.02], 0.24, 0.016, i === 1 ? m.plateBlue : m.plate, ctx, {
      collider: i === 2,
    });
  }

  // Busa sabun cuci piring licin di lantai depan wastafel
  addBox(root, 'Busa_Sabun_Visual', [0, 0.008, -0.45], [0.72, 0.01, 0.46], m.soapFoam, ctx, {
    collider: false,
    edges: false,
    castShadow: false,
  });

  return root;
}

export function buildKomporGas(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_KomporGas';
  addCounterBase(root, m, 1.2, ctx);

  addBox(root, 'Kompor_Body', [0, 0.91, 0.02], [0.72, 0.1, 0.42], m.stoveDark, ctx);
  addBox(root, 'Kompor_Panel', [0, 0.9, -0.195], [0.72, 0.07, 0.02], m.steel, ctx, { collider: false });
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? -0.18 : 0.18;
    addCyl(root, `Tungku_${i}`, [x, 0.965, 0.04], 0.17, 0.02, m.ink, ctx, { collider: false });
    addCyl(root, `Kenop_${i}`, [x, 0.9, -0.215], 0.05, 0.03, m.ink, ctx, { collider: false, eulerDeg: [90, 0, 0] });
  }
  addCyl(root, 'Api_Biru', [-0.18, 0.982, 0.04], 0.12, 0.014, m.flame, ctx, { collider: false });
  addCyl(root, 'Api_Biru_Kanan', [0.18, 0.98, 0.04], 0.11, 0.012, m.flame, ctx, { collider: false });

  addCyl(root, 'Wajan', [0.18, 1.0, 0.04], 0.32, 0.06, m.pan, ctx);
  addBox(root, 'Wajan_Gagang', [0.44, 1.02, 0.04], [0.22, 0.025, 0.035], m.woodDark, ctx, { collider: false });

  // Tabung LPG 3 kg "melon"
  addCyl(root, 'LPG_Tabung', [0.46, 0.17, -0.46], 0.26, 0.3, m.lpg, ctx);
  addSph(root, 'LPG_Bahu', [0.46, 0.32, -0.46], [0.26, 0.12, 0.26], m.lpg);
  addCyl(root, 'LPG_Katup', [0.46, 0.4, -0.46], 0.06, 0.06, m.steel, ctx, { collider: false });
  addCyl(root, 'LPG_Selang', [0.46, 0.62, -0.35], 0.02, 0.45, m.ink, ctx, { collider: false, eulerDeg: [25, 0, 0] });

  return root;
}

export function buildMejaDapur(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaDapur';
  addCounterBase(root, m, 1.2, ctx);

  // Talenan + sayur (pristine objects grouped for easy toggle)
  const talenanGroup = new THREE.Group();
  talenanGroup.name = 'Talenan_Group';
  addBox(talenanGroup, 'Talenan', [0.05, 0.875, -0.05], [0.38, 0.025, 0.24], m.wood, ctx);
  addSph(talenanGroup, 'Tomat', [0.12, 0.91, -0.04], [0.06, 0.06, 0.06], m.red);
  addSph(talenanGroup, 'Wortel', [-0.02, 0.9, -0.08], [0.15, 0.04, 0.04], m.orange);
  root.add(talenanGroup);

  // Rice cooker
  addCyl(root, 'RiceCooker_Body', [-0.38, 0.98, 0.08], 0.3, 0.24, m.white, ctx);
  addCyl(root, 'RiceCooker_Band', [-0.38, 0.96, 0.08], 0.31, 0.05, m.riceCookerBand, ctx, { collider: false });
  addSph(root, 'RiceCooker_Lid', [-0.38, 1.1, 0.08], [0.3, 0.12, 0.3], m.white);
  addBox(root, 'RiceCooker_Handle', [-0.38, 1.17, 0.08], [0.14, 0.025, 0.03], m.ink, ctx, { collider: false });

  // Rak piring stainless
  addBox(root, 'Rak_Alas', [0.38, 0.875, 0.12], [0.42, 0.025, 0.26], m.steel, ctx);
  for (let i = 0; i < 4; i++) {
    const x = 0.18 + (i % 2) * 0.4;
    const z = i < 2 ? 0.0 : 0.24;
    addBox(root, `Rak_Tiang_${i}`, [x, 0.98, z], [0.012, 0.2, 0.012], m.steel, ctx, { collider: false });
  }
  for (let i = 0; i < 5; i++) {
    const pm = i % 2 === 0 ? m.plate : m.plateBlue;
    addCyl(root, `Rak_Piring_${i}`, [0.24 + i * 0.07, 1.0, 0.12], 0.22, 0.014, pm, ctx, {
      collider: false,
      eulerDeg: [0, 0, 90],
    });
  }
  return root;
}

export function buildMejaMakan(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaMakan';
  addBox(root, 'Top', [0, 0.73, 0], [1.4, 0.04, 0.8], m.wood, ctx);
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.64 : 0.64;
    const z = i < 2 ? -0.34 : 0.34;
    addBox(root, `Kaki_${i}`, [x, 0.355, z], [0.05, 0.71, 0.05], m.woodDark, ctx);
  }
  addBox(root, 'Palang', [0, 0.2, 0], [1.28, 0.04, 0.04], m.woodDark, ctx, { collider: false });

  const tudungGroup = new THREE.Group();
  tudungGroup.name = 'TudungSaji_Group';
  addCyl(tudungGroup, 'TudungSaji_1', [0.28, 0.78, 0.02], 0.52, 0.06, m.tudungSaji, ctx);
  addCyl(tudungGroup, 'TudungSaji_2', [0.28, 0.84, 0.02], 0.42, 0.06, m.tudungSaji, ctx);
  addCyl(tudungGroup, 'TudungSaji_3', [0.28, 0.895, 0.02], 0.28, 0.05, m.tudungSaji, ctx);
  addSph(tudungGroup, 'TudungSaji_Pegangan', [0.28, 0.935, 0.02], [0.06, 0.06, 0.06], m.white);
  root.add(tudungGroup);

  addSph(root, 'Teko', [-0.45, 0.82, 0.2], [0.17, 0.15, 0.17], m.white);
  addCyl(root, 'Teko_Cerat', [-0.35, 0.84, 0.2], 0.03, 0.1, m.white, ctx, { collider: false, eulerDeg: [0, 0, -55] });
  addCyl(root, 'Gelas_1', [-0.2, 0.805, 0.24], 0.07, 0.11, m.galon, ctx, { collider: false });
  addCyl(root, 'Gelas_2', [-0.58, 0.805, -0.05], 0.07, 0.11, m.galon, ctx, { collider: false });
  return root;
}

export function buildKursi(m: KitchenMaterialSet, plastic: THREE.Material, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kursi';
  addCyl(root, 'Dudukan', [0, 0.45, 0], 0.38, 0.04, plastic, ctx);
  for (let i = 0; i < 4; i++) {
    const a = THREE.MathUtils.degToRad(i * 90 + 45);
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    addCyl(root, `Kaki_${i}`, [dx * 0.15, 0.22, dz * 0.15], 0.045, 0.45, plastic, ctx, {
      collider: false,
      eulerDeg: [-8 * dz, 0, 8 * dx],
    });
  }
  addBox(root, 'Sandaran', [0, 0.68, 0.17], [0.34, 0.28, 0.03], plastic, ctx);
  addBox(root, 'Sandaran_Lubang', [0, 0.72, 0.155], [0.16, 0.04, 0.005], m.ink, ctx, { collider: false, edges: false });
  return root;
}

export function buildDispenser(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Dispenser';
  addBox(root, 'Body', [0, 0.475, 0], [0.32, 0.95, 0.32], m.white, ctx);
  addBox(root, 'Panel_Ceruk', [0, 0.62, -0.161], [0.24, 0.22, 0.005], m.stoveDark, ctx, { collider: false, edges: false });
  addBox(root, 'Kran_Panas', [-0.06, 0.7, -0.175], [0.04, 0.04, 0.04], m.red, ctx, { collider: false });
  addBox(root, 'Kran_Dingin', [0.06, 0.7, -0.175], [0.04, 0.04, 0.04], m.plateBlue, ctx, { collider: false });
  addBox(root, 'Tatakan', [0, 0.52, -0.17], [0.22, 0.02, 0.06], m.steel, ctx, { collider: false });
  addCyl(root, 'Galon_Leher', [0, 0.975, 0], 0.1, 0.05, m.galon, ctx, { collider: false });
  addCyl(root, 'Galon', [0, 1.19, 0], 0.27, 0.38, m.galon, ctx);
  addCyl(root, 'Galon_Ring', [0, 1.1, 0], 0.275, 0.02, m.plateBlue, ctx, { collider: false });
  return root;
}

export function buildLemariGantung(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LemariGantung';
  addBox(root, 'Body', [0, 0.3, 0], [1.2, 0.6, 0.32], m.cabinetSage, ctx);
  addBox(root, 'DoorGap', [0, 0.3, -0.161], [0.012, 0.56, 0.005], m.ink, ctx, { collider: false, edges: false });
  addSph(root, 'Knob_L', [-0.06, 0.12, -0.17], [0.03, 0.03, 0.03], m.steel);
  addSph(root, 'Knob_R', [0.06, 0.12, -0.17], [0.03, 0.03, 0.03], m.steel);
  addBox(root, 'Toples_Kerupuk', [0.35, 0.7, 0], [0.18, 0.2, 0.18], m.galon, ctx, { collider: false });
  addBox(root, 'Toples_Tutup', [0.35, 0.815, 0], [0.19, 0.03, 0.19], m.red, ctx, { collider: false });
  return root;
}

export function buildJendela(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Jendela';
  addBox(root, 'Kaca', [0, 0, 0.02], [0.92, 0.82, 0.02], m.glass, ctx, { collider: false, edges: false });
  addBox(root, 'Kusen_Atas', [0, 0.43, 0], [1.0, 0.06, 0.08], m.white, ctx);
  addBox(root, 'Kusen_Bawah', [0, -0.43, -0.02], [1.08, 0.06, 0.14], m.white, ctx);
  addBox(root, 'Kusen_L', [-0.48, 0, 0], [0.06, 0.82, 0.08], m.white, ctx);
  addBox(root, 'Kusen_R', [0.48, 0, 0], [0.06, 0.82, 0.08], m.white, ctx);
  addBox(root, 'Kusen_Tengah', [0, 0, 0], [0.04, 0.82, 0.06], m.white, ctx, { collider: false });
  for (let i = 0; i < 4; i++) {
    addBox(root, `Teralis_${i}`, [-0.33 + i * 0.22, 0, -0.04], [0.015, 0.82, 0.015], m.ink, ctx, { collider: false, edges: false });
  }
  addBox(root, 'Teralis_Horizontal', [0, 0.1, -0.04], [0.9, 0.015, 0.015], m.ink, ctx, { collider: false, edges: false });
  addBox(root, 'Gorden_L', [-0.56, 0.02, -0.06], [0.22, 0.95, 0.03], m.curtain, ctx, { collider: false });
  addBox(root, 'Gorden_R', [0.56, 0.02, -0.06], [0.22, 0.95, 0.03], m.curtain, ctx, { collider: false });
  addBox(root, 'Rel_Gorden', [0, 0.52, -0.06], [1.4, 0.025, 0.025], m.woodDark, ctx, { collider: false });
  return root;
}

export function buildTempatSampah(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_TempatSampah';
  addCyl(root, 'Body', [0, 0.21, 0], 0.3, 0.42, m.trash, ctx);
  addCyl(root, 'Tutup', [0, 0.44, 0], 0.32, 0.04, m.trash, ctx);
  addBox(root, 'Pedal', [0, 0.03, -0.18], [0.1, 0.025, 0.08], m.ink, ctx, { collider: false });
  addBox(root, 'Kantong', [0.05, 0.47, 0.06], [0.12, 0.04, 0.1], m.ink, ctx, { collider: false });
  return root;
}

export function buildEmberGayung(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_EmberGayung';
  addCyl(root, 'Ember', [0, 0.14, 0], 0.3, 0.28, m.bucket, ctx);
  addCyl(root, 'Ember_Bibir', [0, 0.28, 0], 0.32, 0.02, m.bucket, ctx, { collider: false });
  addCyl(root, 'Air', [0, 0.24, 0], 0.27, 0.01, m.galon, ctx, { collider: false });
  addCyl(root, 'Gayung', [0.05, 0.3, 0.02], 0.13, 0.09, m.gayung, ctx, { collider: false });
  addBox(root, 'Gayung_Gagang', [0.19, 0.33, 0.02], [0.18, 0.025, 0.035], m.gayung, ctx, { collider: false });
  return root;
}

export function buildJamDinding(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_JamDinding';
  addCyl(root, 'Bingkai', [0, 0, 0], 0.32, 0.04, m.ink, ctx, { collider: false, eulerDeg: [90, 0, 0] });
  addCyl(root, 'Muka', [0, 0, -0.012], 0.28, 0.03, m.white, ctx, { collider: false, eulerDeg: [90, 0, 0] });
  addBox(root, 'Jarum_Jam', [0.03, 0.02, -0.03], [0.08, 0.012, 0.005], m.ink, ctx, { collider: false, edges: false });
  addBox(root, 'Jarum_Menit', [0, 0.05, -0.032], [0.012, 0.11, 0.005], m.ink, ctx, { collider: false, edges: false });
  return root;
}

export function buildKalender(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kalender';
  addBox(root, 'Kertas', [0, 0, 0], [0.34, 0.48, 0.01], m.white, ctx, { collider: false });
  addBox(root, 'Header', [0, 0.19, -0.006], [0.34, 0.1, 0.005], m.red, ctx, { collider: false, edges: false });
  for (let r = 0; r < 4; r++) {
    addBox(root, `Baris_${r}`, [0, 0.07 - r * 0.08, -0.006], [0.28, 0.012, 0.004], m.ink, ctx, {
      collider: false,
      edges: false,
    });
  }
  return root;
}

export function buildLampuPlafon(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LampuPlafon';
  addCyl(root, 'Kabel', [0, -0.15, 0], 0.015, 0.3, m.ink, ctx, { collider: false });
  addSph(root, 'Kap', [0, -0.32, 0], [0.36, 0.12, 0.36], m.cabinetSage);
  addSph(root, 'Bohlam', [0, -0.37, 0], [0.1, 0.1, 0.1], m.sponge);
  return root;
}
