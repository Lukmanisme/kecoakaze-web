import * as THREE from 'three';
import { WORLD_SCALE as S } from '../types';
import { Palette, attachInkEdges } from '../style/palette';
import { ProceduralTextures } from '../graphics/ProceduralTextures';

export interface KitchenMaterialSet {
  fridgeBody: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  counter: THREE.MeshStandardMaterial;
  counterTop: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  stoveDark: THREE.MeshStandardMaterial;
  burnerIron: THREE.MeshStandardMaterial;
  flame: THREE.MeshStandardMaterial;
  lpg: THREE.MeshStandardMaterial;
  pan: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  tudungSaji: THREE.MeshStandardMaterial;
  plate: THREE.MeshStandardMaterial;
  plateBlue: THREE.MeshStandardMaterial;
  chairRed: THREE.MeshStandardMaterial;
  chairBlue: THREE.MeshStandardMaterial;
  chairMint: THREE.MeshStandardMaterial;
  galon: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  cabinetSage: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  potGlassLid: THREE.MeshStandardMaterial;
  curtain: THREE.MeshStandardMaterial;
  trash: THREE.MeshStandardMaterial;
  bucket: THREE.MeshStandardMaterial;
  gayung: THREE.MeshStandardMaterial;
  sponge: THREE.MeshStandardMaterial;
  soapBottle: THREE.MeshStandardMaterial;
  cardboard: THREE.MeshStandardMaterial;
  orange: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  riceCookerBand: THREE.MeshStandardMaterial;
  soapFoam: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  ijuk: THREE.MeshStandardMaterial;
  neonGlow: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  soupBroth: THREE.MeshStandardMaterial;
  oilGloss: THREE.MeshStandardMaterial;
  oilBubble: THREE.MeshStandardMaterial;
  tempeFried: THREE.MeshStandardMaterial;
  tempeRaw: THREE.MeshStandardMaterial;
  carrot: THREE.MeshStandardMaterial;
  potato: THREE.MeshStandardMaterial;
  greenLeaf: THREE.MeshStandardMaterial;
  greenStem: THREE.MeshStandardMaterial;
  chiliRed: THREE.MeshStandardMaterial;
  meatball: THREE.MeshStandardMaterial;
  ledCook: THREE.MeshStandardMaterial;
  ledWarm: THREE.MeshStandardMaterial;
}

export interface KitchenStoveAnimTargets {
  flameGroups: THREE.Group[];
  flameMat: THREE.MeshStandardMaterial;
  soupSurface: THREE.Mesh | null;
  soupItems: Array<{ obj: THREE.Object3D; baseY: number; phase: number }>;
  oilBubbles: Array<{ mesh: THREE.Mesh; baseScale: number; phase: number }>;
}

export function createKitchenMaterials(textures: ProceduralTextures): KitchenMaterialSet {
  const plinthMat = textures
    .createWoodMaterial({
      key: 'kitchen_plinth',
      baseHex: '#633F2A',
      altHex: '#573623',
      grainHex: '#3A2114',
      planks: 2,
      roughness: 0.78,
    })
    .clone();
  plinthMat.polygonOffset = true;
  plinthMat.polygonOffsetFactor = 1;
  plinthMat.polygonOffsetUnits = 1;

  return {
    fridgeBody: textures.createPlasticMaterial({ colorHex: 0xa9dcc9, roughness: 0.42 }),
    ink: textures.createMetalMaterial({ variant: 'powder', colorHex: Palette.Ink }),
    steel: textures.createMetalMaterial({ variant: 'stainless', colorHex: 0xd0d7da }),
    counter: textures.createMatteMaterial(0xd9cfb8, { roughness: 0.78 }),
    counterTop: textures.createMatteMaterial(0x8fa5a8, { roughness: 0.32, metalness: 0.05 }),
    plinth: plinthMat,
    stoveDark: textures.createMetalMaterial({ variant: 'powder', colorHex: 0x3b4449 }),
    burnerIron: textures.createMetalMaterial({ variant: 'powder', colorHex: 0x1b1e22, roughness: 0.86 }),
    flame: textures.createMatteMaterial(0x63e6ff, {
      emissive: 0x00b4ff,
      emissiveIntensity: 2.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
    lpg: textures.createMetalMaterial({ variant: 'powder', colorHex: 0x67a944 }),
    pan: textures.createMetalMaterial({ variant: 'powder', colorHex: 0x2f3338, roughness: 0.34 }),
    wood: textures.createWoodMaterial({
      key: 'kitchen_jati',
      baseHex: '#C28A5A',
      altHex: '#B37B4E',
      grainHex: '#7A4F30',
      planks: 4,
      roughness: 0.72,
    }),
    woodDark: textures.createWoodMaterial({
      key: 'kitchen_mahoni',
      baseHex: '#7D5137',
      altHex: '#6D452D',
      grainHex: '#432718',
      planks: 3,
      roughness: 0.76,
    }),
    tudungSaji: textures.createPlasticMaterial({ colorHex: 0xd95f52, roughness: 0.48 }),
    plate: textures.createPlasticMaterial({ colorHex: Palette.White, roughness: 0.25 }),
    plateBlue: textures.createPlasticMaterial({ colorHex: Palette.SkyBlue, roughness: 0.25 }),
    chairRed: textures.createPlasticMaterial({ colorHex: Palette.Red, roughness: 0.44 }),
    chairBlue: textures.createPlasticMaterial({ colorHex: Palette.Navy, roughness: 0.44 }),
    chairMint: textures.createPlasticMaterial({ colorHex: 0x52a889, roughness: 0.44 }),
    galon: textures.createPlasticMaterial({ variant: 'galon', colorHex: 0x7bc8ea }),
    white: textures.createPlasticMaterial({ colorHex: Palette.White, roughness: 0.46 }),
    cabinetSage: textures.createWoodMaterial({
      key: 'cabinet_sage',
      baseHex: '#9DB5A1',
      altHex: '#92AA96',
      grainHex: '#6D8572',
      planks: 3,
      roughness: 0.7,
    }),
    glass: textures.createMatteMaterial(0xbde6df, {
      emissive: 0x2f4842,
      emissiveIntensity: 0.3,
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 1.2,
    }),
    potGlassLid: textures.createMatteMaterial(0xe2f7fa, {
      roughness: 0.1,
      metalness: 0.14,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      envMapIntensity: 1.35,
    }),
    curtain: textures.createMatteMaterial(Palette.Mustard, { roughness: 0.9 }),
    trash: textures.createPlasticMaterial({ colorHex: Palette.Teal, roughness: 0.5 }),
    bucket: textures.createPlasticMaterial({ colorHex: Palette.Orange, roughness: 0.45 }),
    gayung: textures.createPlasticMaterial({ colorHex: 0xe592a6, roughness: 0.45 }),
    sponge: textures.createMatteMaterial(0xf1d45c, { roughness: 0.95 }),
    soapBottle: textures.createPlasticMaterial({ colorHex: Palette.Mint, roughness: 0.42 }),
    cardboard: textures.createMatteMaterial(0xc79f6b, { roughness: 0.9 }),
    orange: textures.createMatteMaterial(Palette.Orange, { roughness: 0.65 }),
    red: textures.createMatteMaterial(Palette.Red, { roughness: 0.62 }),
    riceCookerBand: textures.createPlasticMaterial({ colorHex: 0xe7a3a6, roughness: 0.44 }),
    soapFoam: textures.createMatteMaterial(0xf7fbff, {
      roughness: 0.35,
      transparent: true,
      opacity: 0.82,
    }),
    stone: textures.createMatteMaterial(0x5f6366, { roughness: 0.92 }),
    ijuk: textures.createMatteMaterial(0x272320, { roughness: 0.95 }),
    neonGlow: textures.createMatteMaterial(0xfff8e6, {
      emissive: 0xfff3cc,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    }),
    brass: textures.createMetalMaterial({ variant: 'stainless', colorHex: 0xdfb256, roughness: 0.28 }),
    soupBroth: textures.createMatteMaterial(0xeab846, {
      emissive: 0x5c3807,
      emissiveIntensity: 0.24,
      roughness: 0.14,
      metalness: 0.04,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 0.95,
    }),
    oilGloss: textures.createMatteMaterial(0xf0bc3e, {
      emissive: 0x3b2404,
      emissiveIntensity: 0.12,
      roughness: 0.07,
      metalness: 0.12,
      transparent: true,
      opacity: 0.86,
      envMapIntensity: 1.25,
    }),
    oilBubble: textures.createMatteMaterial(0xffeba8, {
      emissive: 0xd49b28,
      emissiveIntensity: 0.25,
      roughness: 0.12,
      transparent: true,
      opacity: 0.85,
    }),
    tempeFried: textures.createTempeMaterial(true),
    tempeRaw: textures.createTempeMaterial(false),
    carrot: textures.createMatteMaterial(0xf26e1d, { roughness: 0.56 }),
    potato: textures.createMatteMaterial(0xedd58a, { roughness: 0.68 }),
    greenLeaf: textures.createMatteMaterial(0x4b9e41, { roughness: 0.58, side: THREE.DoubleSide }),
    greenStem: textures.createMatteMaterial(0x9bd272, { roughness: 0.52 }),
    chiliRed: textures.createMatteMaterial(0xd82222, { roughness: 0.38 }),
    meatball: textures.createMatteMaterial(0x7d6150, { roughness: 0.72 }),
    ledCook: textures.createMatteMaterial(0xff9b2b, {
      emissive: 0xff7700,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    }),
    ledWarm: textures.createMatteMaterial(0x4ee883, {
      emissive: 0x26c75e,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    }),
  };
}

export interface PropBuildContext {
  walkables: THREE.Object3D[];
  obstacles: THREE.Object3D[];
  stoveAnim?: KitchenStoveAnimTargets;
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
  if (options.edges ?? false) attachInkEdges(mesh);
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
    castShadow?: boolean;
    receiveShadow?: boolean;
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
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
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
  collider = false,
  castShadow = false
): THREE.Mesh {
  const geom = new THREE.SphereGeometry(0.5 * S, 14, 10);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  mesh.position.set(centerM[0] * S, centerM[1] * S, centerM[2] * S);
  mesh.scale.set(sizeM[0], sizeM[1], sizeM[2]);
  mesh.castShadow = castShadow;
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
  const plinthH = 0.1;
  const bodyH = (solidTop ? 0.82 : 0.66) - plinthH;
  const bodyCenterY = plinthH + bodyH * 0.5;
  addBox(root, 'Cabinet', [0, bodyCenterY, 0.01], [width, bodyH, 0.58], m.counter, ctx);
  // Non-coplanar toe-kick plinth: y = 0.002..0.100m, recessed 0.026m from front doors (-0.28)
  addBox(root, 'Plinth', [0, 0.051, 0.018], [width - 0.012, 0.098, 0.544], m.plinth, ctx, {
    collider: true,
    isObstacle: true,
    castShadow: false,
  });
  if (solidTop) {
    addBox(root, 'Top', [0, 0.84, 0], [width + 0.02, 0.04, 0.62], m.counterTop, ctx);
  }
  const doors = Math.max(1, Math.round(width / 0.5));
  const doorW = width / doors;
  for (let i = 0; i < doors; i++) {
    const x = -width * 0.5 + doorW * (i + 0.5);
    if (i > 0) {
      addBox(root, `DoorGap_${i}`, [x - doorW * 0.5, 0.41, -0.283], [0.012, 0.56, 0.008], m.ink, ctx, {
        collider: false,
        castShadow: false,
      });
    }
    const knobX = x + (i % 2 === 0 ? doorW * 0.32 : -doorW * 0.32);
    addSph(root, `Knob_${i}`, [knobX, 0.62, -0.3], [0.035, 0.035, 0.035], m.steel);
  }
  addBox(root, 'DrawerGap', [0, 0.7, -0.283], [width - 0.02, 0.012, 0.008], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
}

export function buildKulkas(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kulkas';
  for (const fx of [-0.26, 0.26]) {
    for (const fz of [-0.24, 0.24]) {
      addCyl(root, 'Kaki_Kulkas', [fx, 0.02, fz], 0.06, 0.04, m.ink, ctx, {
        collider: false,
        castShadow: false,
      });
    }
  }
  addBox(root, 'Body', [0, 0.915, 0], [0.68, 1.75, 0.66], m.fridgeBody, ctx);
  addBox(root, 'DoorGap', [0, 1.22, -0.333], [0.66, 0.014, 0.01], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Handle_Freezer', [-0.27, 1.4, -0.35], [0.03, 0.2, 0.04], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Handle_Main', [-0.27, 0.96, -0.35], [0.03, 0.32, 0.04], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Magnet_Orange', [0.12, 1.06, -0.335], [0.06, 0.06, 0.012], m.orange, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Magnet_Red', [0.2, 0.82, -0.335], [0.05, 0.05, 0.012], m.red, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Note_Belanja', [0.02, 0.7, -0.334], [0.13, 0.17, 0.008], m.white, ctx, {
    collider: false,
    castShadow: false,
  });
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

  addBox(root, 'Basin_Bottom', [0, 0.67, 0.02], [0.5, 0.02, 0.36], m.steel, ctx, { castShadow: false });
  addBox(root, 'Basin_WallF', [0, 0.75, -0.155], [0.5, 0.16, 0.01], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Basin_WallB', [0, 0.75, 0.195], [0.5, 0.16, 0.01], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Basin_WallL', [-0.245, 0.75, 0.02], [0.01, 0.16, 0.36], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Basin_WallR', [0.245, 0.75, 0.02], [0.01, 0.16, 0.36], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });

  addCyl(root, 'Faucet_Pipe', [0, 0.99, 0.25], 0.04, 0.26, m.steel, ctx, { collider: false, castShadow: false });
  addCyl(root, 'Faucet_Spout', [0, 1.1, 0.17], 0.035, 0.18, m.steel, ctx, {
    collider: false,
    eulerDeg: [90, 0, 0],
    castShadow: false,
  });
  addBox(root, 'Faucet_Lever', [0, 1.13, 0.27], [0.025, 0.02, 0.1], m.red, ctx, {
    collider: false,
    castShadow: false,
  });

  addBox(root, 'Spons', [0.45, 0.88, 0.12], [0.1, 0.04, 0.06], m.sponge, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Sabun_Cuci', [0.5, 0.95, 0.24], 0.07, 0.18, m.soapBottle, ctx, {
    collider: false,
    castShadow: false,
  });
  for (let i = 0; i < 3; i++) {
    addCyl(root, `Piring_Kotor_${i}`, [-0.42, 0.868 + i * 0.018, 0.02], 0.24, 0.016, i === 1 ? m.plateBlue : m.plate, ctx, {
      collider: i === 2,
      castShadow: false,
    });
  }

  addBox(root, 'Busa_Sabun_Visual', [0, 0.005, -0.45], [0.72, 0.01, 0.46], m.soapFoam, ctx, {
    collider: false,
    castShadow: false,
  });

  return root;
}

export function buildKomporGas(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_KomporGas';

  const animTargets: KitchenStoveAnimTargets = {
    flameGroups: [],
    flameMat: m.flame,
    soupSurface: null,
    soupItems: [],
    oilBubbles: [],
  };
  ctx.stoveAnim = animTargets;

  // Non-coplanar cabinet + recessed plinth (y = 0.002..0.100m, cabinet starts at y = 0.10m)
  addBox(root, 'Cabinet_Left', [-0.28, 0.46, 0.01], [0.64, 0.72, 0.58], m.counter, ctx);
  addBox(root, 'Plinth_Left', [-0.28, 0.051, 0.018], [0.628, 0.098, 0.544], m.plinth, ctx, {
    collider: true,
    isObstacle: true,
    castShadow: false,
  });
  addSph(root, 'Knob_Left', [-0.14, 0.62, -0.295], [0.035, 0.035, 0.035], m.steel);
  addBox(root, 'Shelf_BackPanel', [0.31, 0.411, 0.29], [0.54, 0.818, 0.02], m.counter, ctx);
  addBox(root, 'Shelf_SideRight', [0.59, 0.411, 0.01], [0.02, 0.818, 0.58], m.counter, ctx);
  addBox(root, 'Top', [0, 0.84, 0], [1.22, 0.04, 0.62], m.counterTop, ctx);

  // Kompor Gas 2 Tungku Lengkap
  addBox(root, 'Kompor_Body', [0, 0.91, 0.02], [0.72, 0.1, 0.42], m.stoveDark, ctx);
  addBox(root, 'Kompor_Panel', [0, 0.9, -0.195], [0.72, 0.07, 0.02], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });

  const flameTipGeo = new THREE.ConeGeometry(0.009 * S, 0.022 * S, 6);
  const flameRingGeo = new THREE.TorusGeometry(0.056 * S, 0.006 * S, 6, 18);
  const outerGrateGeo = new THREE.TorusGeometry(0.116 * S, 0.0075 * S, 8, 22);
  const innerGrateGeo = new THREE.TorusGeometry(0.066 * S, 0.006 * S, 6, 18);
  const bowlDripGeo = new THREE.CylinderGeometry(0.125 * S, 0.09 * S, 0.008 * S, 20);

  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? -0.18 : 0.18;
    const bz = 0.04;

    // Stainless drip bowl
    const dripBowl = new THREE.Mesh(bowlDripGeo, m.steel);
    dripBowl.name = `Tungku_Bowl_${i}`;
    dripBowl.position.set(x * S, 0.962 * S, bz * S);
    dripBowl.receiveShadow = true;
    dripBowl.raycast = () => {};
    root.add(dripBowl);

    // Brass/iron burner cap & knob
    addCyl(root, `Tungku_${i}`, [x, 0.969, bz], 0.105, 0.014, m.burnerIron, ctx, {
      collider: false,
      castShadow: false,
    });
    addCyl(root, `Kenop_${i}`, [x, 0.9, -0.215], 0.05, 0.03, m.ink, ctx, {
      collider: false,
      eulerDeg: [90, 0, 0],
      castShadow: false,
    });

    // Matte black serrated cast-iron burner grates (tungku besi bergerigi)
    const grateGroup = new THREE.Group();
    grateGroup.name = `Grate_Group_${i}`;
    grateGroup.position.set(x * S, 0.978 * S, bz * S);

    const outerRing = new THREE.Mesh(outerGrateGeo, m.burnerIron);
    outerRing.rotation.x = Math.PI * 0.5;
    outerRing.raycast = () => {};
    grateGroup.add(outerRing);

    const innerRing = new THREE.Mesh(innerGrateGeo, m.burnerIron);
    innerRing.rotation.x = Math.PI * 0.5;
    innerRing.position.y = 0.004 * S;
    innerRing.raycast = () => {};
    grateGroup.add(innerRing);

    for (let p = 0; p < 6; p++) {
      const ang = (p / 6) * Math.PI * 2;
      const prong = new THREE.Group();
      prong.rotation.y = ang;
      addBox(prong, `Prong_Arm_${p}`, [0.092, 0.006, 0], [0.072, 0.011, 0.014], m.burnerIron, undefined, {
        collider: false,
        castShadow: false,
      });
      // Raised serrated tooth notch near inner pot/wok rest
      addBox(prong, `Prong_Tooth_${p}`, [0.068, 0.011, 0], [0.022, 0.008, 0.013], m.burnerIron, undefined, {
        collider: false,
        castShadow: false,
      });
      grateGroup.add(prong);
    }
    root.add(grateGroup);

    // Emissive glowing cyan-blue burner flame ring
    const flameGroup = new THREE.Group();
    flameGroup.name = `Api_Ring_${i}`;
    flameGroup.position.set(x * S, 0.971 * S, bz * S);
    const ringMesh = new THREE.Mesh(flameRingGeo, m.flame);
    ringMesh.rotation.x = Math.PI * 0.5;
    ringMesh.raycast = () => {};
    flameGroup.add(ringMesh);

    const tipCount = 12;
    for (let f = 0; f < tipCount; f++) {
      const ang = (f / tipCount) * Math.PI * 2;
      const tipPivot = new THREE.Group();
      tipPivot.rotation.y = ang;
      const tip = new THREE.Mesh(flameTipGeo, m.flame);
      tip.position.set(0.056 * S, 0.008 * S, 0);
      tip.rotation.z = -0.58;
      tip.raycast = () => {};
      tipPivot.add(tip);
      flameGroup.add(tipPivot);
    }
    root.add(flameGroup);
    animTargets.flameGroups.push(flameGroup);
  }

  // ---------------------------------------------------------------
  // TUNGKU KANAN (x = -0.18 visually right): Wajan Penggorengan Cekung + Tempe Goreng
  // ---------------------------------------------------------------
  const wokCenterX = -0.18;
  const wokCenterZ = 0.04;
  const wokProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.065 * S, 0.004 * S),
    new THREE.Vector2(0.118 * S, 0.022 * S),
    new THREE.Vector2(0.158 * S, 0.048 * S),
    new THREE.Vector2(0.174 * S, 0.068 * S),
    new THREE.Vector2(0.168 * S, 0.069 * S),
    new THREE.Vector2(0.151 * S, 0.048 * S),
    new THREE.Vector2(0.112 * S, 0.023 * S),
    new THREE.Vector2(0.061 * S, 0.009 * S),
    new THREE.Vector2(0.0, 0.007 * S),
  ];
  const wokGeo = new THREE.LatheGeometry(wokProfile, 26);
  const wokMesh = new THREE.Mesh(wokGeo, m.pan);
  wokMesh.name = 'Wajan_Cekung';
  wokMesh.position.set(wokCenterX * S, 0.988 * S, wokCenterZ * S);
  wokMesh.castShadow = true;
  wokMesh.receiveShadow = true;
  root.add(wokMesh);
  ctx.walkables.push(wokMesh);
  ctx.obstacles.push(wokMesh);

  // Ergonomic black wok handle with hanging loop at the tip
  const wokHandle = new THREE.Group();
  wokHandle.name = 'Wajan_Gagang_Group';
  wokHandle.position.set((wokCenterX - 0.168) * S, 1.055 * S, wokCenterZ * S);
  wokHandle.rotation.z = -0.26;
  addCyl(wokHandle, 'Wajan_Gagang_Stem', [-0.09, 0, 0], 0.022, 0.18, m.ink, undefined, {
    collider: false,
    eulerDeg: [0, 0, 90],
    topDiameterM: 0.032,
    castShadow: false,
  });
  const hangLoop = new THREE.Mesh(new THREE.TorusGeometry(0.015 * S, 0.0045 * S, 6, 12), m.ink);
  hangLoop.rotation.x = Math.PI * 0.5;
  hangLoop.position.set(-0.188 * S, 0, 0);
  hangLoop.raycast = () => {};
  wokHandle.add(hangLoop);
  root.add(wokHandle);

  // Resting stainless spatula (sodet) leaning on right inner rim of wok
  const sodet = new THREE.Group();
  sodet.name = 'Sodet_Wajan';
  sodet.position.set((wokCenterX + 0.085) * S, 1.032 * S, (wokCenterZ - 0.03) * S);
  sodet.rotation.set(0.18, -0.35, -0.48);
  addBox(sodet, 'Sodet_Blade', [-0.035, -0.008, 0], [0.068, 0.004, 0.056], m.steel, undefined, {
    collider: false,
    castShadow: false,
  });
  addCyl(sodet, 'Sodet_Neck', [0.065, 0.008, 0], 0.009, 0.15, m.steel, undefined, {
    collider: false,
    eulerDeg: [0, 0, 90],
    castShadow: false,
  });
  addCyl(sodet, 'Sodet_Grip', [0.165, 0.016, 0], 0.022, 0.095, m.ink, undefined, {
    collider: false,
    eulerDeg: [0, 0, 90],
    castShadow: false,
  });
  root.add(sodet);

  // Shimmering cooking oil disc + 6 crispy golden tempe goreng slices + sizzling bubbles
  const oilDisc = addCyl(root, 'Minyak_Goreng', [wokCenterX, 1.007, wokCenterZ], 0.215, 0.006, m.oilGloss, ctx, {
    collider: true,
    castShadow: false,
    segments: 22,
  });
  oilDisc.receiveShadow = false;

  const tempeSpots: Array<[number, number, number, number]> = [
    [-0.045, -0.028, 0.35, 0.12],
    [0.036, -0.042, -0.65, -0.08],
    [-0.052, 0.038, 1.15, 0.1],
    [0.015, 0.008, -0.2, 0.05],
    [0.055, 0.032, 0.85, -0.14],
    [-0.006, 0.058, 0.45, 0.09],
  ];
  tempeSpots.forEach(([ox, oz, ry, rz], idx) => {
    const tempe = addBox(
      root,
      `Tempe_Goreng_${idx}`,
      [wokCenterX + ox, 1.014, wokCenterZ + oz],
      [0.058, 0.014, 0.038],
      m.tempeFried,
      undefined,
      { collider: false, castShadow: false }
    );
    tempe.rotation.set(0.06 * (idx % 2 === 0 ? 1 : -1), ry, rz);
  });

  const bubbleGeo = new THREE.SphereGeometry(0.0065 * S, 6, 5);
  for (let b = 0; b < 10; b++) {
    const ang = (b / 10) * Math.PI * 2 + 0.3;
    const rad = 0.032 + (b % 4) * 0.021;
    const bubble = new THREE.Mesh(bubbleGeo, m.oilBubble);
    bubble.name = `Minyak_Gelembung_${b}`;
    bubble.position.set((wokCenterX + Math.cos(ang) * rad) * S, 1.01 * S, (wokCenterZ + Math.sin(ang) * rad) * S);
    bubble.raycast = () => {};
    root.add(bubble);
    animTargets.oilBubbles.push({
      mesh: bubble,
      baseScale: 0.75 + (b % 3) * 0.28,
      phase: b * 0.85,
    });
  }

  // ---------------------------------------------------------------
  // TUNGKU KIRI (x = +0.18 visually left): Panci Sup Stainless (Target 02, 'Wajan')
  // ---------------------------------------------------------------
  const panciX = 0.18;
  const panciZ = 0.04;
  const panciGroup = new THREE.Group();
  panciGroup.name = 'Wajan';

  const potProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.136 * S, 0.0),
    new THREE.Vector2(0.142 * S, 0.012 * S),
    new THREE.Vector2(0.142 * S, 0.115 * S),
    new THREE.Vector2(0.134 * S, 0.115 * S),
    new THREE.Vector2(0.134 * S, 0.008 * S),
    new THREE.Vector2(0.0, 0.008 * S),
  ];
  const panciMesh = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 26), m.steel);
  panciMesh.name = 'Panci_Body';
  panciMesh.position.set(panciX * S, 0.99 * S, panciZ * S);
  panciMesh.castShadow = true;
  panciMesh.receiveShadow = true;
  panciGroup.add(panciMesh);
  ctx.walkables.push(panciMesh);
  ctx.obstacles.push(panciMesh);

  // Rolled top metal lip ring
  const panciRim = new THREE.Mesh(new THREE.TorusGeometry(0.139 * S, 0.0068 * S, 8, 26), m.steel);
  panciRim.rotation.x = Math.PI * 0.5;
  panciRim.position.set(panciX * S, 1.106 * S, panciZ * S);
  panciRim.raycast = () => {};
  panciGroup.add(panciRim);

  // Two curved loop ear handles (gagang kuping) on left and right sides
  const earGeo = new THREE.TorusGeometry(0.03 * S, 0.0065 * S, 8, 12, Math.PI);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, m.steel);
    ear.name = side < 0 ? 'Panci_Kuping_L' : 'Panci_Kuping_R';
    ear.position.set((panciX + side * 0.141) * S, 1.072 * S, panciZ * S);
    ear.rotation.set(Math.PI * 0.5, 0, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
    ear.raycast = () => {};
    panciGroup.add(ear);
  }

  // Soup broth surface inside the open stainless pot
  const soupDisc = addCyl(panciGroup, 'Sup_Kuah', [panciX, 1.072, panciZ], 0.264, 0.014, m.soupBroth, ctx, {
    collider: true,
    castShadow: false,
    segments: 24,
  });
  animTargets.soupSurface = soupDisc;

  // Floating 3D soup contents (carrots, potatoes, green onions, meatballs)
  const addSoupItem = (obj: THREE.Object3D, baseYM: number, phase: number) => {
    animTargets.soupItems.push({ obj, baseY: baseYM * S, phase });
  };
  const carrotOffsets: Array<[number, number, number]> = [
    [-0.045, -0.03, 0.25],
    [0.05, 0.025, -0.2],
    [-0.02, 0.065, 0.15],
    [0.035, -0.058, -0.18],
  ];
  carrotOffsets.forEach(([ox, oz, tilt], idx) => {
    const c = addCyl(panciGroup, `Sup_Wortel_${idx}`, [panciX + ox, 1.079, panciZ + oz], 0.042, 0.012, m.carrot, undefined, {
      collider: false,
      castShadow: false,
      segments: 10,
    });
    c.rotation.set(tilt, idx * 0.7, tilt * 0.5);
    addSoupItem(c, 1.079, idx * 1.1);
  });

  const potatoOffsets: Array<[number, number]> = [
    [-0.065, 0.022],
    [0.01, -0.015],
    [0.062, -0.02],
    [-0.005, 0.042],
  ];
  potatoOffsets.forEach(([ox, oz], idx) => {
    const k = addBox(panciGroup, `Sup_Kentang_${idx}`, [panciX + ox, 1.077, panciZ + oz], [0.028, 0.022, 0.026], m.potato, undefined, {
      collider: false,
      castShadow: false,
    });
    k.rotation.set(0.3 * idx, 0.7 * idx, 0.2);
    addSoupItem(k, 1.077, 0.6 + idx * 1.3);
  });

  const scallionGeo = new THREE.TorusGeometry(0.011 * S, 0.0038 * S, 6, 12);
  const scallionOffsets: Array<[number, number]> = [
    [-0.022, -0.062],
    [0.042, 0.056],
    [-0.072, -0.008],
    [0.018, 0.022],
    [-0.038, 0.034],
  ];
  scallionOffsets.forEach(([ox, oz], idx) => {
    const sg = new THREE.Mesh(scallionGeo, m.greenLeaf);
    sg.name = `Sup_DaunBawang_${idx}`;
    sg.position.set((panciX + ox) * S, 1.08 * S, (panciZ + oz) * S);
    sg.rotation.set(Math.PI * 0.5 + (idx % 2 === 0 ? 0.14 : -0.14), 0, idx * 0.5);
    sg.raycast = () => {};
    panciGroup.add(sg);
    addSoupItem(sg, 1.08, 1.4 + idx * 0.9);
  });

  const baksoOffsets: Array<[number, number]> = [
    [0.068, 0.006],
    [-0.048, -0.055],
    [-0.015, 0.006],
  ];
  baksoOffsets.forEach(([ox, oz], idx) => {
    const b = addSph(panciGroup, `Sup_Bakso_${idx}`, [panciX + ox, 1.077, panciZ + oz], [0.046, 0.042, 0.046], m.meatball);
    addSoupItem(b, 1.077, 2.0 + idx * 1.5);
  });

  // Slightly ajar, tilted semi-transparent glass dome lid so the simmering soup is clearly visible
  const lidGroup = new THREE.Group();
  lidGroup.name = 'Panci_Tutup_Group';
  lidGroup.position.set((panciX - 0.042) * S, 1.124 * S, (panciZ + 0.026) * S);
  lidGroup.rotation.set(0.14, 0.18, 0.34);

  const glassDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.142 * S, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    m.potGlassLid
  );
  glassDome.name = 'Panci_Tutup';
  glassDome.scale.set(1, 0.28, 1);
  glassDome.position.set(0, -0.01 * S, 0);
  glassDome.raycast = () => {};
  lidGroup.add(glassDome);

  const lidRim = new THREE.Mesh(new THREE.TorusGeometry(0.136 * S, 0.006 * S, 8, 24), m.steel);
  lidRim.rotation.x = Math.PI * 0.5;
  lidRim.position.set(0, -0.002 * S, 0);
  lidRim.raycast = () => {};
  lidGroup.add(lidRim);

  addCyl(lidGroup, 'Panci_Kenop_Base', [0, 0.031, 0], 0.028, 0.012, m.steel, undefined, {
    collider: false,
    castShadow: false,
  });
  addCyl(lidGroup, 'Panci_Kenop', [0, 0.042, 0], 0.046, 0.018, m.ink, undefined, {
    collider: false,
    castShadow: false,
  });
  panciGroup.add(lidGroup);
  root.add(panciGroup);

  // Tabung LPG 3 kg "Gas Melon" (powder-coated green metal)
  const lpgX = 0.32;
  const lpgZ = -0.02;
  addCyl(root, 'LPG_FootRing', [lpgX, 0.02, lpgZ], 0.21, 0.04, m.lpg, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'LPG_Tabung', [lpgX, 0.16, lpgZ], 0.26, 0.24, m.lpg, ctx);
  addSph(root, 'LPG_Bahu', [lpgX, 0.28, lpgZ], [0.26, 0.12, 0.26], m.lpg);
  addCyl(root, 'LPG_LeherPillarL', [lpgX - 0.065, 0.365, lpgZ], 0.024, 0.07, m.lpg, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'LPG_LeherPillarR', [lpgX + 0.065, 0.365, lpgZ], 0.024, 0.07, m.lpg, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'LPG_CollarRing', [lpgX, 0.4, lpgZ], 0.17, 0.022, m.lpg, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'LPG_Regulator', [lpgX, 0.37, lpgZ], 0.065, 0.06, m.brass, ctx, {
    collider: false,
    castShadow: false,
  });

  // Regulator hose (thin tube -> castShadow disabled)
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3((lpgX + 0.02) * S, 0.38 * S, (lpgZ + 0.02) * S),
    new THREE.Vector3((lpgX + 0.06) * S, 0.56 * S, 0.22 * S),
    new THREE.Vector3(0.24 * S, 0.78 * S, 0.24 * S),
    new THREE.Vector3(0.18 * S, 0.90 * S, 0.21 * S),
  ]);
  const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 14, 0.012 * S, 7, false), m.ink);
  hoseMesh.name = 'LPG_Selang_Regulator';
  hoseMesh.castShadow = false;
  hoseMesh.raycast = () => {};
  root.add(hoseMesh);

  return root;
}

export function buildMejaDapur(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaDapur';
  addCounterBase(root, m, 1.2, ctx);

  // ---------------------------------------------------------------
  // TALENAN KAYU BERBEVEL + BAHAN SAYUR SEGAR 3D (Target 01)
  // ---------------------------------------------------------------
  const talenanGroup = new THREE.Group();
  talenanGroup.name = 'Talenan_Group';

  const boardW = 0.35 * S;
  const boardD = 0.23 * S;
  const cornerR = 0.022 * S;
  const hw = boardW * 0.5;
  const hd = boardD * 0.5;
  const boardShape = new THREE.Shape();
  boardShape.moveTo(-hw + cornerR, -hd);
  boardShape.lineTo(hw - cornerR, -hd);
  boardShape.quadraticCurveTo(hw, -hd, hw, -hd + cornerR);
  boardShape.lineTo(hw, hd - cornerR);
  boardShape.quadraticCurveTo(hw, hd, hw - cornerR, hd);
  boardShape.lineTo(-hw + cornerR, hd);
  boardShape.quadraticCurveTo(-hw, hd, -hw, hd - cornerR);
  boardShape.lineTo(-hw, -hd + cornerR);
  boardShape.quadraticCurveTo(-hw, -hd, -hw + cornerR, -hd);

  const talenanGeo = new THREE.ExtrudeGeometry(boardShape, {
    depth: 0.017 * S,
    bevelEnabled: true,
    bevelThickness: 0.004 * S,
    bevelSize: 0.004 * S,
    bevelSegments: 2,
  });
  talenanGeo.rotateX(-Math.PI * 0.5);
  const talenanMesh = new THREE.Mesh(talenanGeo, m.wood);
  talenanMesh.name = 'Talenan';
  talenanMesh.position.set(0.06 * S, 0.864 * S, -0.05 * S);
  talenanMesh.castShadow = false;
  talenanMesh.receiveShadow = true;
  talenanGroup.add(talenanMesh);
  ctx.walkables.push(talenanMesh);
  ctx.obstacles.push(talenanMesh);

  // Subtle carved juice-groove inlay lines & brass hanging ring on board corner
  addBox(talenanGroup, 'Talenan_Groove_F', [0.06, 0.886, -0.145], [0.31, 0.002, 0.006], m.woodDark, undefined, {
    collider: false,
    castShadow: false,
  });
  addBox(talenanGroup, 'Talenan_Groove_B', [0.06, 0.886, 0.045], [0.31, 0.002, 0.006], m.woodDark, undefined, {
    collider: false,
    castShadow: false,
  });
  addCyl(talenanGroup, 'Talenan_HoleRim', [-0.095, 0.886, -0.14], 0.022, 0.003, m.brass, undefined, {
    collider: false,
    castShadow: false,
    segments: 12,
  });

  // 1. Wortel utuh terpotong + potongan wortel bulat tebal berbevel
  addCyl(talenanGroup, 'Wortel_Batang', [-0.035, 0.903, -0.075], 0.038, 0.115, m.carrot, undefined, {
    collider: false,
    topDiameterM: 0.026,
    eulerDeg: [10, 24, 88],
    castShadow: false,
    segments: 12,
  });
  const carrotCoins: Array<[number, number, number]> = [
    [0.032, 0.892, -0.062],
    [0.058, 0.892, -0.085],
    [0.068, 0.892, -0.042],
    [0.044, 0.902, -0.066],
  ];
  carrotCoins.forEach(([cx, cy, cz], i) => {
    const coin = addCyl(talenanGroup, `Wortel_Iris_${i}`, [cx, cy, cz], 0.036, 0.012, m.carrot, undefined, {
      collider: false,
      castShadow: false,
      segments: 12,
    });
    if (i === 3) coin.rotation.set(0.28, 0.2, -0.18);
  });

  // 2. Lembaran daun sawi/kol hijau bergelombang dengan tulang daun segar
  for (let l = 0; l < 2; l++) {
    const leafGeo = new THREE.PlaneGeometry(0.115 * S, 0.078 * S, 6, 4);
    leafGeo.rotateX(-Math.PI * 0.5);
    const posAttr = leafGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let v = 0; v < posAttr.count; v++) {
      const vx = posAttr.getX(v);
      const vz = posAttr.getZ(v);
      const wave =
        Math.sin((vx / S) * 38 + l * 1.4) * 0.007 * S +
        Math.cos((vz / S) * 42) * 0.005 * S;
      posAttr.setY(v, wave);
    }
    leafGeo.computeVertexNormals();
    const leaf = new THREE.Mesh(leafGeo, m.greenLeaf);
    leaf.name = `Daun_Sawi_${l}`;
    leaf.position.set((0.125 + l * 0.025) * S, (0.894 + l * 0.009) * S, (-0.015 - l * 0.035) * S);
    leaf.rotation.y = l === 0 ? 0.35 : -0.45;
    leaf.raycast = () => {};
    talenanGroup.add(leaf);

    const stem = addCyl(
      talenanGroup,
      `Tulang_Sawi_${l}`,
      [0.125 + l * 0.025, 0.896 + l * 0.009, -0.015 - l * 0.035],
      0.012,
      0.095,
      m.greenStem,
      undefined,
      {
        collider: false,
        eulerDeg: [90, 0, l === 0 ? -20 : 26],
        castShadow: false,
        segments: 8,
      }
    );
    stem.raycast = () => {};
  }

  // 3. Cabai merah keriting (3D sinuous curves + green stem nubs)
  for (let c = 0; c < 2; c++) {
    const ox = -0.015 + c * 0.045;
    const oz = -0.005 + c * 0.022;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3((ox - 0.04) * S, 0.893 * S, oz * S),
      new THREE.Vector3((ox - 0.015) * S, 0.897 * S, (oz - 0.012) * S),
      new THREE.Vector3((ox + 0.015) * S, 0.894 * S, (oz + 0.011) * S),
      new THREE.Vector3((ox + 0.042) * S, 0.892 * S, (oz - 0.004) * S),
    ]);
    const chiliMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0072 * S, 7, false), m.chiliRed);
    chiliMesh.name = `Cabai_Merah_${c}`;
    chiliMesh.raycast = () => {};
    talenanGroup.add(chiliMesh);

    addCyl(talenanGroup, `Cabai_Tangkai_${c}`, [ox - 0.046, 0.895, oz + 0.002], 0.006, 0.016, m.greenLeaf, undefined, {
      collider: false,
      eulerDeg: [0, 0, 75],
      castShadow: false,
      segments: 6,
    });
  }

  // 4. Potongan tempe mentah di atas talenan siap digoreng
  const rawTempeCoords: Array<[number, number, number, number]> = [
    [0.14, 0.895, -0.105, 0.18],
    [0.155, 0.895, -0.062, -0.12],
    [0.145, 0.911, -0.084, 0.42],
  ];
  rawTempeCoords.forEach(([tx, ty, tz, ry], idx) => {
    const tSlab = addBox(
      talenanGroup,
      `Tempe_Mentah_${idx}`,
      [tx, ty, tz],
      [0.056, 0.016, 0.036],
      m.tempeRaw,
      undefined,
      { collider: false, castShadow: false }
    );
    tSlab.rotation.y = ry;
  });

  root.add(talenanGroup);

  // Pisau Dapur Berbilah Logam di samping Talenan
  const knifeGroup = new THREE.Group();
  knifeGroup.name = 'Pisau_Dapur_Group';
  knifeGroup.position.set(0.28 * S, 0.868 * S, -0.12 * S);
  knifeGroup.rotation.y = THREE.MathUtils.degToRad(-28);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.145 * S, 0.004 * S);
  bladeShape.quadraticCurveTo(0.165 * S, 0.016 * S, 0.165 * S, 0.034 * S);
  bladeShape.lineTo(0, 0.038 * S);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.003 * S,
    bevelEnabled: true,
    bevelThickness: 0.001 * S,
    bevelSize: 0.001 * S,
    bevelSegments: 1,
  });
  bladeGeo.rotateX(Math.PI * 0.5);
  const bladeMesh = new THREE.Mesh(bladeGeo, m.steel);
  bladeMesh.name = 'Pisau_Bilah';
  bladeMesh.position.set(0, 0.003 * S, -0.019 * S);
  bladeMesh.raycast = () => {};
  knifeGroup.add(bladeMesh);

  addBox(knifeGroup, 'Pisau_Bolster', [-0.008, 0.006, 0], [0.016, 0.012, 0.024], m.steel, undefined, {
    collider: false,
    castShadow: false,
  });
  addBox(knifeGroup, 'Pisau_Gagang', [-0.068, 0.008, 0], [0.105, 0.015, 0.025], m.woodDark, undefined, {
    collider: false,
    castShadow: false,
  });
  for (let r = 0; r < 2; r++) {
    addCyl(knifeGroup, `Pisau_Rivet_${r}`, [-0.04 - r * 0.045, 0.016, 0], 0.005, 0.002, m.brass, undefined, {
      collider: false,
      castShadow: false,
      segments: 8,
    });
  }
  root.add(knifeGroup);

  // Cobek Batu & Ulekan
  addCyl(root, 'Cobek_Alas', [-0.14, 0.882, -0.11], 0.21, 0.044, m.stone, ctx, {
    topDiameterM: 0.24,
    castShadow: false,
  });
  addCyl(root, 'Cobek_Sambal', [-0.14, 0.906, -0.11], 0.13, 0.012, m.red, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Ulekan_Badan', [-0.11, 0.922, -0.1], 0.036, 0.13, m.stone, ctx, {
    collider: false,
    eulerDeg: [15, 20, 72],
    castShadow: false,
  });

  // Magic Com (Rice Cooker) Lengkap: rim, panel LED cook/warm, tombol, gagang lengkung, & kabel listrik
  const rcX = -0.41;
  const rcZ = 0.09;
  addCyl(root, 'RiceCooker_Body', [rcX, 0.98, rcZ], 0.3, 0.24, m.white, ctx);
  addCyl(root, 'RiceCooker_Band', [rcX, 0.96, rcZ], 0.308, 0.05, m.riceCookerBand, ctx, {
    collider: false,
    castShadow: false,
  });
  const rcRim = new THREE.Mesh(new THREE.TorusGeometry(0.15 * S, 0.008 * S, 8, 24), m.steel);
  rcRim.rotation.x = Math.PI * 0.5;
  rcRim.position.set(rcX * S, 1.095 * S, rcZ * S);
  rcRim.raycast = () => {};
  root.add(rcRim);

  addBox(root, 'RiceCooker_Panel', [rcX, 0.93, rcZ - 0.148], [0.095, 0.075, 0.018], m.stoveDark, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'RiceCooker_Lever', [rcX, 0.916, rcZ - 0.159], [0.036, 0.014, 0.014], m.white, ctx, {
    collider: false,
    castShadow: false,
  });
  addSph(root, 'RiceCooker_LED_Cook', [rcX - 0.02, 0.948, rcZ - 0.157], [0.012, 0.012, 0.008], m.ledCook);
  addSph(root, 'RiceCooker_LED_Warm', [rcX + 0.02, 0.948, rcZ - 0.157], [0.012, 0.012, 0.008], m.ledWarm);
  addBox(root, 'RiceCooker_LatchBtn', [rcX, 1.095, rcZ - 0.153], [0.04, 0.018, 0.016], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });

  addSph(root, 'RiceCooker_Lid', [rcX, 1.1, rcZ], [0.3, 0.115, 0.3], m.white);
  addCyl(root, 'RiceCooker_SteamVent', [rcX + 0.04, 1.152, rcZ + 0.04], 0.048, 0.016, m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  const rcHandleArch = new THREE.Mesh(new THREE.TorusGeometry(0.088 * S, 0.01 * S, 8, 16, Math.PI), m.ink);
  rcHandleArch.name = 'RiceCooker_Handle';
  rcHandleArch.position.set(rcX * S, 1.135 * S, rcZ * S);
  rcHandleArch.raycast = () => {};
  root.add(rcHandleArch);

  // Wall outlet & curved power cord for Magic Com
  addBox(root, 'RiceCooker_Outlet', [rcX - 0.02, 1.05, 0.3], [0.085, 0.085, 0.022], m.white, undefined, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'RiceCooker_PlugHead', [rcX - 0.02, 1.05, 0.278], [0.032, 0.032, 0.026], m.ink, undefined, {
    collider: false,
    castShadow: false,
  });
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(rcX * S, 0.9 * S, (rcZ + 0.14) * S),
    new THREE.Vector3((rcX - 0.04) * S, 0.875 * S, 0.25 * S),
    new THREE.Vector3((rcX - 0.06) * S, 0.94 * S, 0.275 * S),
    new THREE.Vector3((rcX - 0.02) * S, 1.045 * S, 0.278 * S),
  ]);
  const cordMesh = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 12, 0.0055 * S, 6, false), m.ink);
  cordMesh.name = 'RiceCooker_Kabel';
  cordMesh.castShadow = false;
  cordMesh.raycast = () => {};
  root.add(cordMesh);

  // Rak Piring Stainless
  addBox(root, 'Rak_Alas', [0.38, 0.8725, 0.12], [0.42, 0.025, 0.26], m.steel, ctx);
  for (let i = 0; i < 4; i++) {
    const x = 0.18 + (i % 2) * 0.4;
    const z = i < 2 ? 0.0 : 0.24;
    addBox(root, `Rak_Tiang_${i}`, [x, 0.985, z], [0.016, 0.2, 0.016], m.steel, ctx, {
      collider: false,
      castShadow: false,
    });
  }
  addBox(root, 'Rak_Palang_Depan', [0.38, 1.075, 0.0], [0.416, 0.016, 0.016], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Rak_Palang_Belakang', [0.38, 1.075, 0.24], [0.416, 0.016, 0.016], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  for (let i = 0; i < 5; i++) {
    const pm = i % 2 === 0 ? m.plate : m.plateBlue;
    addCyl(root, `Rak_Piring_${i}`, [0.24 + i * 0.07, 0.995, 0.12], 0.22, 0.014, pm, ctx, {
      collider: false,
      eulerDeg: [0, 0, 90],
      castShadow: false,
    });
  }
  return root;
}

export function buildMejaMakan(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_MejaMakan';

  addBox(root, 'Top', [0, 0.7275, 0], [1.44, 0.045, 0.84], m.wood, ctx);

  addBox(root, 'Apron_Front', [0, 0.67, -0.33], [1.28, 0.07, 0.032], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Back', [0, 0.67, 0.33], [1.28, 0.07, 0.032], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Left', [-0.63, 0.67, 0], [0.032, 0.07, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Apron_Right', [0.63, 0.67, 0], [0.032, 0.07, 0.66], m.woodDark, ctx, { collider: false });

  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.63 : 0.63;
    const z = i < 2 ? -0.33 : 0.33;
    addBox(root, `Kaki_${i}`, [x, 0.3525, z], [0.056, 0.705, 0.056], m.woodDark, ctx);
  }

  addBox(root, 'Palang_Kiri', [-0.63, 0.16, 0], [0.04, 0.04, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Palang_Kanan', [0.63, 0.16, 0], [0.04, 0.04, 0.66], m.woodDark, ctx, { collider: false });
  addBox(root, 'Palang_Tengah', [0, 0.16, 0], [1.26, 0.04, 0.04], m.woodDark, ctx, { collider: false });

  const tudungGroup = new THREE.Group();
  tudungGroup.name = 'TudungSaji_Group';
  addCyl(tudungGroup, 'TudungSaji_Ring', [0.28, 0.762, 0.02], 0.54, 0.024, m.white, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(tudungGroup, 'TudungSaji_1', [0.28, 0.8, 0.02], 0.52, 0.06, m.tudungSaji, ctx, { topDiameterM: 0.45 });
  addCyl(tudungGroup, 'TudungSaji_2', [0.28, 0.855, 0.02], 0.44, 0.055, m.tudungSaji, ctx, { topDiameterM: 0.32 });
  addCyl(tudungGroup, 'TudungSaji_3', [0.28, 0.905, 0.02], 0.31, 0.045, m.tudungSaji, ctx, {
    topDiameterM: 0.14,
    castShadow: false,
  });
  addSph(tudungGroup, 'TudungSaji_Pegangan', [0.28, 0.94, 0.02], [0.06, 0.05, 0.06], m.white);
  root.add(tudungGroup);

  addSph(root, 'Teko', [-0.45, 0.825, 0.2], [0.17, 0.15, 0.17], m.white, undefined, false, true);
  addCyl(root, 'Teko_Cerat', [-0.35, 0.84, 0.2], 0.03, 0.1, m.white, ctx, {
    collider: false,
    eulerDeg: [0, 0, -55],
    castShadow: false,
  });
  addCyl(root, 'Gelas_1', [-0.2, 0.805, 0.24], 0.07, 0.11, m.galon, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Gelas_2', [-0.58, 0.805, -0.05], 0.07, 0.11, m.galon, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildKursi(m: KitchenMaterialSet, plastic: THREE.Material, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kursi_Warung';

  addBox(root, 'Dudukan', [0, 0.44, 0], [0.4, 0.04, 0.4], plastic, ctx);
  addBox(root, 'Apron_Dudukan', [0, 0.4, 0], [0.36, 0.04, 0.36], plastic, ctx, { collider: false });

  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.16 : 0.16;
    const z = i < 2 ? -0.16 : 0.16;
    addBox(root, `Kaki_${i}`, [x, 0.215, z], [0.042, 0.43, 0.042], plastic, ctx);
  }
  addBox(root, 'Ring_F', [0, 0.16, -0.16], [0.32, 0.028, 0.028], plastic, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Ring_B', [0, 0.16, 0.16], [0.32, 0.028, 0.028], plastic, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Ring_L', [-0.16, 0.16, 0], [0.028, 0.028, 0.32], plastic, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Ring_R', [0.16, 0.16, 0], [0.028, 0.028, 0.32], plastic, ctx, {
    collider: false,
    castShadow: false,
  });

  addBox(root, 'Sandaran_Tiang_L', [-0.16, 0.63, 0.175], [0.04, 0.38, 0.036], plastic, ctx);
  addBox(root, 'Sandaran_Tiang_R', [0.16, 0.63, 0.175], [0.04, 0.38, 0.036], plastic, ctx);
  addBox(root, 'Sandaran_Panel', [0, 0.72, 0.175], [0.34, 0.2, 0.028], plastic, ctx);
  addBox(root, 'Sandaran_Lubang', [0, 0.74, 0.16], [0.15, 0.04, 0.008], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildKursiBakso(m: KitchenMaterialSet, plastic: THREE.Material, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kursi_Bakso';

  addCyl(root, 'Dudukan_Bakso', [0, 0.44, 0], 0.36, 0.04, plastic, ctx);
  addCyl(root, 'FingerHole_Bakso', [0, 0.461, 0], 0.045, 0.006, m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Skirt_Bakso', [0, 0.4, 0], 0.33, 0.04, plastic, ctx, {
    collider: false,
    castShadow: false,
  });

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
    castShadow: false,
  });
  addBox(root, 'Brace_Z', [0, 0.16, 0], [0.27, 0.028, 0.032], plastic, ctx, {
    collider: false,
    eulerDeg: [0, -45, 0],
    castShadow: false,
  });
  return root;
}

export function buildDispenser(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Dispenser';
  addBox(root, 'Body', [0, 0.475, 0], [0.32, 0.95, 0.32], m.white, ctx);
  addBox(root, 'Panel_Ceruk', [0, 0.62, -0.161], [0.24, 0.22, 0.005], m.stoveDark, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Kran_Panas', [-0.06, 0.7, -0.175], [0.04, 0.04, 0.04], m.red, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Kran_Dingin', [0.06, 0.7, -0.175], [0.04, 0.04, 0.04], m.plateBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Tatakan', [0, 0.52, -0.17], [0.22, 0.02, 0.06], m.steel, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Galon_Corong', [0, 0.975, 0], 0.12, 0.05, m.white, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Galon', [0, 1.19, 0], 0.27, 0.38, m.galon, ctx);
  addCyl(root, 'Galon_Ring', [0, 1.1, 0], 0.276, 0.024, m.plateBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Galon_Tutup', [0, 1.39, 0], 0.09, 0.025, m.plateBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildLemariGantung(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LemariGantung';
  addBox(root, 'Body', [0, 0.3, 0], [1.2, 0.6, 0.32], m.cabinetSage, ctx);
  addBox(root, 'DoorGap', [0, 0.3, -0.161], [0.012, 0.56, 0.005], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addSph(root, 'Knob_L', [-0.06, 0.12, -0.17], [0.03, 0.03, 0.03], m.steel);
  addSph(root, 'Knob_R', [0.06, 0.12, -0.17], [0.03, 0.03, 0.03], m.steel);
  addBox(root, 'Toples_Kerupuk', [0.35, 0.7, 0], [0.18, 0.2, 0.18], m.galon, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Toples_Tutup', [0.35, 0.815, 0], [0.19, 0.03, 0.19], m.red, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildJendela(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Jendela';
  addBox(root, 'Backdrop_Luar', [0, 0, 0.06], [0.96, 0.86, 0.01], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  for (let i = 0; i < 6; i++) {
    const sy = -0.34 + i * 0.136;
    addBox(root, `Nako_Slat_${i}`, [0, sy, 0.01], [0.88, 0.11, 0.01], m.glass, ctx, {
      collider: false,
      eulerDeg: [-24, 0, 0],
      castShadow: false,
    });
  }
  addBox(root, 'Kusen_Atas', [0, 0.43, 0], [1.0, 0.06, 0.09], m.white, ctx, { castShadow: false });
  addBox(root, 'Kusen_Bawah', [0, -0.43, -0.02], [1.08, 0.06, 0.14], m.white, ctx, { castShadow: false });
  addBox(root, 'Kusen_L', [-0.48, 0, 0], [0.06, 0.82, 0.09], m.white, ctx, { castShadow: false });
  addBox(root, 'Kusen_R', [0.48, 0, 0], [0.06, 0.82, 0.09], m.white, ctx, { castShadow: false });
  for (let i = 0; i < 4; i++) {
    addBox(root, `Teralis_V_${i}`, [-0.33 + i * 0.22, 0, -0.035], [0.018, 0.82, 0.018], m.ink, ctx, {
      collider: false,
      castShadow: false,
    });
  }
  addBox(root, 'Teralis_H_1', [0, -0.14, -0.035], [0.9, 0.018, 0.018], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Teralis_H_2', [0, 0.14, -0.035], [0.9, 0.018, 0.018], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });

  addBox(root, 'Gorden_L', [-0.56, 0.02, -0.06], [0.22, 0.96, 0.03], m.curtain, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Gorden_R', [0.56, 0.02, -0.06], [0.22, 0.96, 0.03], m.curtain, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Rel_Gorden', [0, 0.52, -0.06], [1.4, 0.025, 0.025], m.woodDark, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildSapuPengki(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_SapuPengki';

  const sapu = new THREE.Group();
  sapu.rotation.z = -0.11;
  addCyl(sapu, 'Sapu_Gagang', [0, 0.78, 0], 0.028, 1.15, m.wood, ctx, { collider: false, castShadow: false });
  addBox(sapu, 'Sapu_Kap', [0, 0.2, 0], [0.22, 0.07, 0.05], m.chairRed, ctx, { collider: false, castShadow: false });
  addBox(sapu, 'Sapu_Ijuk', [0, 0.085, 0], [0.28, 0.17, 0.045], m.ijuk, ctx, { collider: false });
  root.add(sapu);

  addBox(root, 'Pengki_Alas', [0.26, 0.008, 0.06], [0.26, 0.016, 0.24], m.chairBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Pengki_Wall_L', [0.135, 0.045, 0.06], [0.015, 0.08, 0.24], m.chairBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Pengki_Wall_R', [0.385, 0.045, 0.06], [0.015, 0.08, 0.24], m.chairBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Pengki_Wall_B', [0.26, 0.045, 0.175], [0.26, 0.08, 0.015], m.chairBlue, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Pengki_Gagang', [0.26, 0.42, 0.16], 0.024, 0.72, m.steel, ctx, {
    collider: false,
    eulerDeg: [8, 0, 0],
    castShadow: false,
  });
  return root;
}

export function buildTempatSampah(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_TempatSampah';
  addCyl(root, 'Body', [0, 0.21, 0], 0.3, 0.42, m.trash, ctx);
  addCyl(root, 'Tutup', [0, 0.435, 0], 0.32, 0.035, m.trash, ctx, { castShadow: false });
  addBox(root, 'Pedal', [0, 0.025, -0.17], [0.1, 0.025, 0.08], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Kantong', [0.05, 0.46, 0.06], [0.12, 0.03, 0.1], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildEmberGayung(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_EmberGayung';
  addCyl(root, 'Ember', [0, 0.14, 0], 0.3, 0.28, m.bucket, ctx);
  addCyl(root, 'Ember_Bibir', [0, 0.28, 0], 0.32, 0.02, m.bucket, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Air', [0, 0.24, 0], 0.27, 0.01, m.galon, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Gayung', [0.05, 0.28, 0.02], 0.13, 0.085, m.gayung, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Gayung_Gagang', [0.18, 0.31, 0.02], [0.16, 0.025, 0.035], m.gayung, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildJamDinding(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_JamDinding';
  addCyl(root, 'Bingkai', [0, 0, 0], 0.32, 0.04, m.ink, ctx, {
    collider: false,
    eulerDeg: [90, 0, 0],
    castShadow: false,
  });
  addCyl(root, 'Muka', [0, 0, -0.012], 0.28, 0.03, m.white, ctx, {
    collider: false,
    eulerDeg: [90, 0, 0],
    castShadow: false,
  });
  addBox(root, 'Jarum_Jam', [0.03, 0.02, -0.03], [0.08, 0.012, 0.005], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Jarum_Menit', [0, 0.05, -0.032], [0.012, 0.11, 0.005], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  return root;
}

export function buildKalender(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Kalender';
  addBox(root, 'Kertas', [0, 0, 0], [0.34, 0.48, 0.01], m.white, ctx, { collider: false, castShadow: false });
  addBox(root, 'Header', [0, 0.19, -0.006], [0.34, 0.1, 0.005], m.red, ctx, {
    collider: false,
    castShadow: false,
  });
  for (let r = 0; r < 4; r++) {
    addBox(root, `Baris_${r}`, [0, 0.07 - r * 0.08, -0.006], [0.28, 0.012, 0.004], m.ink, ctx, {
      collider: false,
      castShadow: false,
    });
  }
  return root;
}

export function buildLampuPlafon(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LampuPlafon';
  addCyl(root, 'Kabel', [0, -0.18, 0], 0.015, 0.36, m.ink, ctx, { collider: false, castShadow: false });
  addSph(root, 'Kap', [0, -0.38, 0], [0.36, 0.12, 0.36], m.cabinetSage);
  addSph(root, 'Bohlam', [0, -0.43, 0], [0.1, 0.1, 0.1], m.neonGlow);
  return root;
}

export function buildLampuNeonPlafon(m: KitchenMaterialSet, ctx: PropBuildContext): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_LampuNeonPlafon';
  addBox(root, 'Neon_Kap', [0, -0.03, 0], [1.65, 0.06, 0.18], m.white, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Neon_EndL', [-0.81, -0.065, 0], [0.05, 0.05, 0.1], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Neon_EndR', [0.81, -0.065, 0], [0.05, 0.05, 0.1], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  addCyl(root, 'Neon_Tabung', [0, -0.075, 0], 0.048, 1.56, m.neonGlow, ctx, {
    collider: false,
    eulerDeg: [0, 0, 90],
    castShadow: false,
  });
  return root;
}

export function buildJalusi(m: KitchenMaterialSet, ctx: PropBuildContext, widthM = 0.9): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Prop_Jalusi';
  addBox(root, 'Jalusi_Bingkai', [0, 0, 0], [widthM, 0.24, 0.05], m.woodDark, ctx, {
    collider: false,
    castShadow: false,
  });
  addBox(root, 'Jalusi_Lubang', [0, 0, 0.01], [widthM - 0.06, 0.18, 0.02], m.ink, ctx, {
    collider: false,
    castShadow: false,
  });
  for (let i = -2; i <= 2; i++) {
    addBox(root, `Jalusi_Kisi_${i + 2}`, [0, i * 0.034, -0.01], [widthM - 0.07, 0.014, 0.032], m.wood, ctx, {
      collider: false,
      eulerDeg: [28, 0, 0],
      castShadow: false,
    });
  }
  return root;
}
