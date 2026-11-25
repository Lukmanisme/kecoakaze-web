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
  chairMint: THREE.MeshToonMaterial;
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
  stone: THREE.MeshToonMaterial;
  ijuk: THREE.MeshToonMaterial;
  neonGlow: THREE.MeshToonMaterial;
  brass: THREE.MeshToonMaterial;
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
    lpg: createToonMaterial(0x70ad47),
    pan: createToonMaterial(0x3e4246),
    wood: createToonMaterial(0xffffff, { map: woodTex }),
    woodDark: createToonMaterial(Palette.WoodDark),
    tudungSaji: createToonMaterial(0xd95f52),
    plate: createToonMaterial(Palette.White),
    plateBlue: createToonMaterial(Palette.SkyBlue),
    chairRed: createToonMaterial(Palette.Red),
    chairBlue: createToonMaterial(Palette.Navy),
    chairMint: createToonMaterial(0x52a889),
    galon: createToonMaterial(0x8ecae6, { transparent: true, opacity: 0.86 }),
    white: createToonMaterial(Palette.White),
    cabinetSage: createToonMaterial(Palette.Sage),
    glass: createToonMaterial(0xbde6df, {
      emissive: 0x36524b,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.84,
    }),
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
    stone: createToonMaterial(0x5f6366),
    ijuk: createToonMaterial(0x272320),
    neonGlow: createToonMaterial(0xfff8e6, { emissive: 0xfff3cc, emissiveIntensity: 1.45 }),
    brass: createToonMaterial(0xd9a84e),
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
    topDiameterM?: number;
  } = {}
): THREE.Mesh {
  const rTop = ((options.topDiameterM ?? diameterM) * 0.5) * S;
  const rBot = (diameterM * 0.5) * S;
  const h = heightM * S;
  const geom = new THREE.CylinderGeometry(rTop, rBot, h, options.segments ?? 16);
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
  // Foot pads resting at y = 0.00..0.04, fridge body seated flush on top at y = 0.04..1.79
  for (const fx of [-0.26, 0.26]) {
    for (const fz of [-0.24, 0.24]) {
      addCyl(root, 'Kaki_Kulkas', [fx, 0.02, fz], 0.06, 0.04, m.ink, ctx, { collider: false });
    }
  }
  addBox(root, 'Body', [0, 0.915, 0], [0.68, 1.75, 0.66], m.fridgeBody, ctx);
  addBox(root, 'DoorGap', [0, 1.22, -0.333], [0.66, 0.014, 0.01], m.ink, ctx, { collider: false, edges: false });
  addBox(root, 'Handle_Freezer', [-0.27, 1.4, -0.35], [0.03, 0.2, 0.04], m.steel, ctx, { collider: false });
  addBox(root, 'Handle_Main', [-0.27, 0.96, -0.35], [0.03, 0.32, 0.04], m.steel, ctx, { collider: false });
  addBox(root, 'Magnet_Orange', [0.12, 1.06, -0.335], [0.06, 0.06, 0.012], m.orange, ctx, { collider: false });
  addBox(root, 'Magnet_Red', [0.2, 0.82, -0.335], [0.05, 0.05, 0.012], m.red, ctx, { collider: false });
  addBox(root, 'Note_Belanja', [0.02, 0.7, -0.334], [0.13, 0.17, 0.008], m.white, ctx, { collider: false });
  // Cardboard box flush on fridge top (y = 1.79)
  addBox(root, 'Kardus_Atas', [0.05, 1.9, 0.04], [0.42, 0.22, 0.36], m.cardboard, ctx);
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

  addCyl(root, 'Faucet_Pipe', [0, 0.99, 0.25], 0.04, 0.26, m.steel, ctx, { collider: false });
  addCyl(root, 'Faucet_Spout', [0, 1.1, 0.17], 0.035, 0.18, m.steel, ctx, { collider: false, eulerDeg: [90, 0, 0] });
  addBox(root, 'Faucet_Lever', [0, 1.13, 0.27], [0.025, 0.02, 0.1], m.red, ctx, { collider: false });

  addBox(root, 'Spons', [0.45, 0.88, 0.12], [0.1, 0.04, 0.06], m.sponge, ctx, { collider: false });
  addCyl(root, 'Sabun_Cuci', [0.5, 0.95, 0.24], 0.07, 0.18, m.soapBottle, ctx, { collider: false });
  for (let i = 0; i < 3; i++) {
    addCyl(root, `Piring_Kotor_${i}`, [-0.42, 0.868 + i * 0.018, 0.02], 0.24, 0.016, i === 1 ? m.plateBlue : m.plate, ctx, {
      collider: i === 2,
    });
  }

  // Busa sabun cuci piring licin di lantai depan wastafel
  addBox(root, 'Busa_Sabun_Visual', [0, 0.005, -0.45], [0.72, 0.01, 0.46], m.soapFoam, ctx, {
    collider: false,
    edges: false,
    castShadow: false,
  });

  return root;
}

export function buildKomporGas(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_KomporGas';

  // Left half closed cabinet (0.64m wide), right half open under-counter bay for 3kg Green LPG ("gas melon")
  addBox(root, 'Cabinet_Left', [-0.28, 0.41, 0.01], [0.64, 0.82, 0.58], m.counter, ctx);
  addBox(root, 'Plinth_Left', [-0.28, 0.04, -0.27], [0.6, 0.08, 0.02], m.woodDark, ctx, { collider: false });
  addSph(root, 'Knob_Left', [-0.14, 0.62, -0.295], [0.035, 0.035, 0.035], m.steel);
  addBox(root, 'Shelf_BackPanel', [0.31, 0.41, 0.29], [0.54, 0.82, 0.02], m.counter, ctx);
  addBox(root, 'Shelf_SideRight', [0.59, 0.41, 0.01], [0.02, 0.82, 0.58], m.counter, ctx);
  addBox(root, 'Top', [0, 0.84, 0], [1.22, 0.04, 0.62], m.counterTop, ctx);

  // Kompor Gas 2 Tungku seated flush on counter top (y = 0.86..0.96)
  addBox(root, 'Kompor_Body', [0, 0.91, 0.02], [0.72, 0.1, 0.42], m.stoveDark, ctx);
  addBox(root, 'Kompor_Panel', [0, 0.9, -0.195], [0.72, 0.07, 0.02], m.steel, ctx, { collider: false });
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? -0.18 : 0.18;
    addCyl(root, `Tungku_${i}`, [x, 0.968, 0.04], 0.17, 0.016, m.ink, ctx, { collider: false });
    addCyl(root, `Kenop_${i}`, [x, 0.9, -0.215], 0.05, 0.03, m.ink, ctx, { collider: false, eulerDeg: [90, 0, 0] });
    // Burner grates (dudukan panci silang)
    addBox(root, `Grate_A_${i}`, [x, 0.978, 0.04], [0.22, 0.014, 0.018], m.ink, ctx, { collider: false });
    addBox(root, `Grate_B_${i}`, [x, 0.978, 0.04], [0.018, 0.014, 0.22], m.ink, ctx, { collider: false });
  }
  addCyl(root, 'Api_Biru_Kiri', [-0.18, 0.974, 0.04], 0.11, 0.012, m.flame, ctx, { collider: false });
  addCyl(root, 'Api_Biru_Kanan', [0.18, 0.974, 0.04], 0.12, 0.014, m.flame, ctx, { collider: false });

  // Wajan penggorengan on left burner
  addCyl(root, 'Wajan_Kiri', [-0.18, 1.01, 0.04], 0.28, 0.055, m.pan, ctx, { topDiameterM: 0.34 });
  addBox(root, 'Wajan_Kiri_Gagang', [-0.4, 1.03, 0.04], [0.18, 0.022, 0.032], m.woodDark, ctx, { collider: false });

  // Panci Sup Bertutup on right burner (named 'Wajan' so stage target hook matches seamlessly!)
  const panciGroup = new THREE.Group();
  panciGroup.name = 'Wajan';
  addCyl(panciGroup, 'Panci_Body', [0.18, 1.045, 0.04], 0.28, 0.12, m.steel, ctx);
  addBox(panciGroup, 'Panci_Kuping_L', [0.015, 1.06, 0.04], [0.05, 0.022, 0.05], m.ink, ctx, { collider: false });
  addBox(panciGroup, 'Panci_Kuping_R', [0.345, 1.06, 0.04], [0.05, 0.022, 0.05], m.ink, ctx, { collider: false });
  addCyl(panciGroup, 'Panci_Tutup', [0.18, 1.11, 0.04], 0.29, 0.014, m.glass, ctx, { collider: false });
  addCyl(panciGroup, 'Panci_Kenop', [0.18, 1.132, 0.04], 0.05, 0.03, m.ink, ctx, { collider: false });
  root.add(panciGroup);

  // Tabung LPG 3 kg "Gas Melon" seated inside the right under-counter bay at y = 0.000
  const lpgX = 0.32;
  const lpgZ = -0.02;
  addCyl(root, 'LPG_FootRing', [lpgX, 0.02, lpgZ], 0.21, 0.04, m.lpg, ctx, { collider: false });
  addCyl(root, 'LPG_Tabung', [lpgX, 0.16, lpgZ], 0.26, 0.24, m.lpg, ctx);
  addSph(root, 'LPG_Bahu', [lpgX, 0.28, lpgZ], [0.26, 0.12, 0.26], m.lpg);
  // Signature collar ring handle on top of gas melon
  addCyl(root, 'LPG_LeherPillarL', [lpgX - 0.065, 0.365, lpgZ], 0.024, 0.07, m.lpg, ctx, { collider: false });
  addCyl(root, 'LPG_LeherPillarR', [lpgX + 0.065, 0.365, lpgZ], 0.024, 0.07, m.lpg, ctx, { collider: false });
  addCyl(root, 'LPG_CollarRing', [lpgX, 0.4, lpgZ], 0.17, 0.022, m.lpg, ctx, { collider: false });
  addCyl(root, 'LPG_Regulator', [lpgX, 0.37, lpgZ], 0.065, 0.06, m.brass, ctx, { collider: false });

  // Curved flexible regulator hose running continuously from LPG valve to rear of stove
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3((lpgX + 0.02) * S, 0.38 * S, (lpgZ + 0.02) * S),
    new THREE.Vector3((lpgX + 0.06) * S, 0.56 * S, 0.22 * S),
    new THREE.Vector3(0.24 * S, 0.78 * S, 0.24 * S),
    new THREE.Vector3(0.18 * S, 0.90 * S, 0.21 * S),
  ]);
  const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 16, 0.012 * S, 7, false), m.ink);
  hoseMesh.name = 'LPG_Selang_Regulator';
  hoseMesh.castShadow = true;
  hoseMesh.raycast = () => {};
  root.add(hoseMesh);

  return root;
}

export function buildMejaDapur(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaDapur';
  addCounterBase(root, m, 1.2, ctx);

  // Talenan + Sayur flush on counter top (y = 0.86)
  const talenanGroup = new THREE.Group();
  talenanGroup.name = 'Talenan_Group';
  addBox(talenanGroup, 'Talenan', [0.06, 0.8725, -0.05], [0.36, 0.025, 0.24], m.wood, ctx);
  addSph(talenanGroup, 'Tomat', [0.13, 0.91, -0.04], [0.06, 0.06, 0.06], m.red);
  addSph(talenanGroup, 'Wortel', [-0.01, 0.902, -0.08], [0.15, 0.04, 0.04], m.orange);
  root.add(talenanGroup);

  // Cobek Batu & Ulekan flush on counter top (y = 0.86)
  addCyl(root, 'Cobek_Alas', [-0.14, 0.882, -0.11], 0.21, 0.044, m.stone, ctx, { topDiameterM: 0.24 });
  addCyl(root, 'Cobek_Sambal', [-0.14, 0.906, -0.11], 0.13, 0.012, m.red, ctx, { collider: false });
  addCyl(root, 'Ulekan_Badan', [-0.11, 0.922, -0.1], 0.036, 0.13, m.stone, ctx, {
    collider: false,
    eulerDeg: [15, 20, 72],
  });

  // Magic Com (Rice Cooker) flush on counter top (y = 0.86)
  addCyl(root, 'RiceCooker_Body', [-0.41, 0.98, 0.09], 0.3, 0.24, m.white, ctx);
  addCyl(root, 'RiceCooker_Band', [-0.41, 0.96, 0.09], 0.308, 0.05, m.riceCookerBand, ctx, { collider: false });
  addBox(root, 'RiceCooker_Panel', [-0.41, 0.93, -0.055], [0.08, 0.07, 0.02], m.stoveDark, ctx, { collider: false });
  addSph(root, 'RiceCooker_Lid', [-0.41, 1.1, 0.09], [0.3, 0.12, 0.3], m.white);
  addBox(root, 'RiceCooker_Handle', [-0.41, 1.165, 0.09], [0.14, 0.025, 0.03], m.ink, ctx, { collider: false });

  // Rak Piring Aluminium/Plastik flush on counter top (y = 0.86) — zero floating frame
  addBox(root, 'Rak_Alas', [0.38, 0.8725, 0.12], [0.42, 0.025, 0.26], m.steel, ctx);
  for (let i = 0; i < 4; i++) {
    const x = 0.18 + (i % 2) * 0.4;
    const z = i < 2 ? 0.0 : 0.24;
    addBox(root, `Rak_Tiang_${i}`, [x, 0.985, z], [0.016, 0.2, 0.016], m.steel, ctx, { collider: false });
  }
  addBox(root, 'Rak_Palang_Depan', [0.38, 1.075, 0.0], [0.416, 0.016, 0.016], m.steel, ctx, { collider: false });
  addBox(root, 'Rak_Palang_Belakang', [0.38, 1.075, 0.24], [0.416, 0.016, 0.016], m.steel, ctx, { collider: false });
  for (let i = 0; i < 5; i++) {
    const pm = i % 2 === 0 ? m.plate : m.plateBlue;
    addCyl(root, `Rak_Piring_${i}`, [0.24 + i * 0.07, 0.995, 0.12], 0.22, 0.014, pm, ctx, {
      collider: false,
      eulerDeg: [0, 0, 90],
    });
  }
  return root;
}

export function buildMejaMakan(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaMakan';

  // Solid wooden table top (y = 0.705..0.75)
  addBox(root, 'Top', [0, 0.7275, 0], [1.44, 0.045, 0.84], m.wood, ctx);

  // Apron frame directly underneath top connecting all 4 legs cleanly (y = 0.635..0.705)
  addBox(root, 'Apron_Front', [0, 0.67, -0.33], [1.28, 0.07, 0.032], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Back', [0, 0.67, 0.33], [1.28, 0.07, 0.032], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Left', [-0.63, 0.67, 0], [0.032, 0.07, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Right', [0.63, 0.67, 0], [0.032, 0.07, 0.66], m.woodDark, ctx, { collider: false });

  // 4 Solid legs flush with floor y = 0.000 up to tabletop underside y = 0.705
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.63 : 0.63;
    const z = i < 2 ? -0.33 : 0.33;
    addBox(root, `Kaki_${i}`, [x, 0.3525, z], [0.056, 0.705, 0.056], m.woodDark, ctx);
  }

  // H-stretcher lower crossbars tightly connected to legs (ZERO floating parts)
  addBox(root, 'Palang_Kiri', [-0.63, 0.16, 0], [0.04, 0.04, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Palang_Kanan', [0.63, 0.16, 0], [0.04, 0.04, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Palang_Tengah', [0, 0.16, 0], [1.26, 0.04, 0.04], m.woodDark, ctx, { collider: false });

  // Tudung Saji mesh dome flush on tabletop (y = 0.75) covering lauk
  const tudungGroup = new THREE.Group();
  tudungGroup.name = 'TudungSaji_Group';
  addCyl(tudungGroup, 'TudungSaji_Ring', [0.28, 0.762, 0.02], 0.54, 0.024, m.white, ctx, { collider: false });
  addCyl(tudungGroup, 'TudungSaji_1', [0.28, 0.8, 0.02], 0.52, 0.06, m.tudungSaji, ctx, { topDiameterM: 0.45 });
  addCyl(tudungGroup, 'TudungSaji_2', [0.28, 0.855, 0.02], 0.44, 0.055, m.tudungSaji, ctx, { topDiameterM: 0.32 });
  addCyl(tudungGroup, 'TudungSaji_3', [0.28, 0.905, 0.02], 0.31, 0.045, m.tudungSaji, ctx, { topDiameterM: 0.14 });
  addSph(tudungGroup, 'TudungSaji_Pegangan', [0.28, 0.94, 0.02], [0.06, 0.05, 0.06], m.white);
  root.add(tudungGroup);

  // Teko & Gelas flush on tabletop (y = 0.75)
  addSph(root, 'Teko', [-0.45, 0.825, 0.2], [0.17, 0.15, 0.17], m.white);
  addCyl(root, 'Teko_Cerat', [-0.35, 0.84, 0.2], 0.03, 0.1, m.white, ctx, { collider: false, eulerDeg: [0, 0, -55] });
  addCyl(root, 'Gelas_1', [-0.2, 0.805, 0.24], 0.07, 0.11, m.galon, ctx, { collider: false });
  addCyl(root, 'Gelas_2', [-0.58, 0.805, -0.05], 0.07, 0.11, m.galon, ctx, { collider: false });
  return root;
}

export function buildKursi(m: KitchenMaterialSet, plastic: THREE.Material, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kursi_Warung';

  // Integral seat (y = 0.42..0.46) + underside skirt apron (y = 0.38..0.42)
  addBox(root, 'Dudukan', [0, 0.44, 0], [0.40, 0.04, 0.40], plastic, ctx);
  addBox(root, 'Apron_Dudukan', [0, 0.4, 0], [0.36, 0.04, 0.36], plastic, ctx, { collider: false });

  // 4 Straight-molded legs touching floor y = 0.000 up to seat y = 0.43 + lower cross-rails at y = 0.16
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.16 : 0.16;
    const z = i < 2 ? -0.16 : 0.16;
    addBox(root, `Kaki_${i}`, [x, 0.215, z], [0.042, 0.43, 0.042], plastic, ctx);
  }
  addBox(root, 'Ring_F', [0, 0.16, -0.16], [0.32, 0.028, 0.028], plastic, ctx, { collider: false });
  addBox(root, 'Ring_B', [0, 0.16, 0.16], [0.32, 0.028, 0.028], plastic, ctx, { collider: false });
  addBox(root, 'Ring_L', [-0.16, 0.16, 0], [0.028, 0.028, 0.32], plastic, ctx, { collider: false });
  addBox(root, 'Ring_R', [0.16, 0.16, 0], [0.028, 0.028, 0.32], plastic, ctx, { collider: false });

  // Seamless backrest posts ascending directly from rear seat corners (y = 0.44..0.82)
  addBox(root, 'Sandaran_Tiang_L', [-0.16, 0.63, 0.175], [0.04, 0.38, 0.036], plastic, ctx);
  addBox(root, 'Sandaran_Tiang_R', [0.16, 0.63, 0.175], [0.04, 0.38, 0.036], plastic, ctx);
  addBox(root, 'Sandaran_Panel', [0, 0.72, 0.175], [0.34, 0.2, 0.028], plastic, ctx);
  addBox(root, 'Sandaran_Lubang', [0, 0.74, 0.16], [0.15, 0.04, 0.008], m.ink, ctx, { collider: false, edges: false });
  return root;
}

export function buildKursiBakso(m: KitchenMaterialSet, plastic: THREE.Material, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kursi_Bakso';

  // Classic Indonesian round plastic stool ("kursi bakso") with unified skirt & ring brace
  addCyl(root, 'Dudukan_Bakso', [0, 0.44, 0], 0.36, 0.04, plastic, ctx);
  addCyl(root, 'FingerHole_Bakso', [0, 0.461, 0], 0.045, 0.006, m.ink, ctx, { collider: false });
  addCyl(root, 'Skirt_Bakso', [0, 0.4, 0], 0.33, 0.04, plastic, ctx, { collider: false });

  for (let i = 0; i < 4; i++) {
    const a = THREE.MathUtils.degToRad(i * 90 + 45);
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    addCyl(root, `Kaki_Bakso_${i}`, [dx * 0.145, 0.21, dz * 0.145], 0.044, 0.425, plastic, ctx, {
      eulerDeg: [-5 * dz, 0, 5 * dx],
    });
  }
  addBox(root, 'Brace_X', [0, 0.16, 0], [0.27, 0.028, 0.032], plastic, ctx, {
    collider: false,
    eulerDeg: [0, 45, 0],
  });
  addBox(root, 'Brace_Z', [0, 0.16, 0], [0.27, 0.028, 0.032], plastic, ctx, {
    collider: false,
    eulerDeg: [0, -45, 0],
  });
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
  addCyl(root, 'Galon_Corong', [0, 0.975, 0], 0.12, 0.05, m.white, ctx, { collider: false });
  addCyl(root, 'Galon', [0, 1.19, 0], 0.27, 0.38, m.galon, ctx);
  addCyl(root, 'Galon_Ring', [0, 1.1, 0], 0.276, 0.024, m.plateBlue, ctx, { collider: false });
  addCyl(root, 'Galon_Tutup', [0, 1.39, 0], 0.09, 0.025, m.plateBlue, ctx, { collider: false });
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
  // Exterior shaded backdrop so nako glass never looks into empty void
  addBox(root, 'Backdrop_Luar', [0, 0, 0.06], [0.96, 0.86, 0.01], m.ink, ctx, { collider: false, edges: false });
  // Kaca nako (tilted louvre glass slats inside window frame)
  for (let i = 0; i < 6; i++) {
    const sy = -0.34 + i * 0.136;
    addBox(root, `Nako_Slat_${i}`, [0, sy, 0.01], [0.88, 0.11, 0.01], m.glass, ctx, {
      collider: false,
      edges: false,
      eulerDeg: [-24, 0, 0],
    });
  }
  addBox(root, 'Kusen_Atas', [0, 0.43, 0], [1.0, 0.06, 0.09], m.white, ctx);
  addBox(root, 'Kusen_Bawah', [0, -0.43, -0.02], [1.08, 0.06, 0.14], m.white, ctx);
  addBox(root, 'Kusen_L', [-0.48, 0, 0], [0.06, 0.82, 0.09], m.white, ctx);
  addBox(root, 'Kusen_R', [0.48, 0, 0], [0.06, 0.82, 0.09], m.white, ctx);
  // Iron security bars (teralis besi) welded cleanly across kusen
  for (let i = 0; i < 4; i++) {
    addBox(root, `Teralis_V_${i}`, [-0.33 + i * 0.22, 0, -0.035], [0.018, 0.82, 0.018], m.ink, ctx, {
      collider: false,
      edges: false,
    });
  }
  addBox(root, 'Teralis_H_1', [0, -0.14, -0.035], [0.9, 0.018, 0.018], m.ink, ctx, { collider: false, edges: false });
  addBox(root, 'Teralis_H_2', [0, 0.14, -0.035], [0.9, 0.018, 0.018], m.ink, ctx, { collider: false, edges: false });

  addBox(root, 'Gorden_L', [-0.56, 0.02, -0.06], [0.22, 0.96, 0.03], m.curtain, ctx, { collider: false });
  addBox(root, 'Gorden_R', [0.56, 0.02, -0.06], [0.22, 0.96, 0.03], m.curtain, ctx, { collider: false });
  addBox(root, 'Rel_Gorden', [0, 0.52, -0.06], [1.4, 0.025, 0.025], m.woodDark, ctx, { collider: false });
  return root;
}

export function buildSapuPengki(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_SapuPengki';

  // Sapu Ijuk leaning cleanly at wall corner with bristles touching floor y = 0.000
  const sapu = new THREE.Group();
  sapu.position.set(0, 0, 0);
  sapu.rotation.z = -0.11;
  addCyl(sapu, 'Sapu_Gagang', [0, 0.78, 0], 0.028, 1.15, m.wood, ctx, { collider: false });
  addBox(sapu, 'Sapu_Kap', [0, 0.2, 0], [0.22, 0.07, 0.05], m.chairRed, ctx, { collider: false });
  addBox(sapu, 'Sapu_Ijuk', [0, 0.085, 0], [0.28, 0.17, 0.045], m.ijuk, ctx, { collider: false });
  root.add(sapu);

  // Pengki Plastik (dustpan) seated flush at floor y = 0.000 next to broom
  addBox(root, 'Pengki_Alas', [0.26, 0.008, 0.06], [0.26, 0.016, 0.24], m.chairBlue, ctx, { collider: false });
  addBox(root, 'Pengki_Wall_L', [0.135, 0.045, 0.06], [0.015, 0.08, 0.24], m.chairBlue, ctx, { collider: false });
  addBox(root, 'Pengki_Wall_R', [0.385, 0.045, 0.06], [0.015, 0.08, 0.24], m.chairBlue, ctx, { collider: false });
  addBox(root, 'Pengki_Wall_B', [0.26, 0.045, 0.175], [0.26, 0.08, 0.015], m.chairBlue, ctx, { collider: false });
  addCyl(root, 'Pengki_Gagang', [0.26, 0.42, 0.16], 0.024, 0.72, m.steel, ctx, { collider: false, eulerDeg: [8, 0, 0] });
  return root;
}

export function buildTempatSampah(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_TempatSampah';
  addCyl(root, 'Body', [0, 0.21, 0], 0.3, 0.42, m.trash, ctx);
  addCyl(root, 'Tutup', [0, 0.435, 0], 0.32, 0.035, m.trash, ctx);
  addBox(root, 'Pedal', [0, 0.025, -0.17], [0.1, 0.025, 0.08], m.ink, ctx, { collider: false });
  addBox(root, 'Kantong', [0.05, 0.46, 0.06], [0.12, 0.03, 0.1], m.ink, ctx, { collider: false });
  return root;
}

export function buildEmberGayung(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_EmberGayung';
  addCyl(root, 'Ember', [0, 0.14, 0], 0.3, 0.28, m.bucket, ctx);
  addCyl(root, 'Ember_Bibir', [0, 0.28, 0], 0.32, 0.02, m.bucket, ctx, { collider: false });
  addCyl(root, 'Air', [0, 0.24, 0], 0.27, 0.01, m.galon, ctx, { collider: false });
  addCyl(root, 'Gayung', [0.05, 0.28, 0.02], 0.13, 0.085, m.gayung, ctx, { collider: false });
  addBox(root, 'Gayung_Gagang', [0.18, 0.31, 0.02], [0.16, 0.025, 0.035], m.gayung, ctx, { collider: false });
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
  addCyl(root, 'Kabel', [0, -0.18, 0], 0.015, 0.36, m.ink, ctx, { collider: false });
  addSph(root, 'Kap', [0, -0.38, 0], [0.36, 0.12, 0.36], m.cabinetSage);
  addSph(root, 'Bohlam', [0, -0.43, 0], [0.1, 0.1, 0.1], m.neonGlow);
  return root;
}

export function buildLampuNeonPlafon(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LampuNeonPlafon';
  // Long LED batten fixture flush against ceiling (y = 0)
  addBox(root, 'Neon_Kap', [0, -0.03, 0], [1.65, 0.06, 0.18], m.white, ctx, { collider: false, castShadow: false });
  addBox(root, 'Neon_EndL', [-0.81, -0.065, 0], [0.05, 0.05, 0.1], m.ink, ctx, { collider: false, castShadow: false });
  addBox(root, 'Neon_EndR', [0.81, -0.065, 0], [0.05, 0.05, 0.1], m.ink, ctx, { collider: false, castShadow: false });
  addCyl(root, 'Neon_Tabung', [0, -0.075, 0], 0.048, 1.56, m.neonGlow, ctx, {
    collider: false,
    eulerDeg: [0, 0, 90],
  });
  return root;
}

export function buildJalusi(m: KitchenMaterialSet, ctx: PropBuildContext, widthM = 0.9): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Jalusi';
  addBox(root, 'Jalusi_Bingkai', [0, 0, 0], [widthM, 0.24, 0.05], m.woodDark, ctx, { collider: false });
  addBox(root, 'Jalusi_Lubang', [0, 0, 0.01], [widthM - 0.06, 0.18, 0.02], m.ink, ctx, {
    collider: false,
    edges: false,
  });
  for (let i = -2; i <= 2; i++) {
    addBox(root, `Jalusi_Kisi_${i + 2}`, [0, i * 0.034, -0.01], [widthM - 0.07, 0.014, 0.032], m.wood, ctx, {
      collider: false,
      edges: false,
      eulerDeg: [28, 0, 0],
    });
  }
  return root;
}
