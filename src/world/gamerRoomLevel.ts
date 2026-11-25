import * as THREE from 'three';
import {
  HidingSpot,
  InteractiveProp,
  RoomBounds,
  WORLD_SCALE as S,
} from '../types';
import { createToonMaterial } from '../style/palette';
import { PropBuildContext, addBox, addCyl, addSph } from './kitchenProps';
import { OscillatingFan } from './oscillatingFan';
import { RgbLightingSystem } from './rgbLighting';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { VFXManager } from '../vfx/VFXManager';

const ROOM_W = 8.0;
const ROOM_D = 6.5;
const ROOM_H = 2.8;
const WALL_T = 0.15;

export interface GamerRoomData {
  root: THREE.Group;
  walkables: THREE.Object3D[];
  obstacles: THREE.Object3D[];
  bounds: RoomBounds;
  interactiveProps: InteractiveProp[];
  hidingSpots: HidingSpot[];
  fan: OscillatingFan;
  rgbLighting: RgbLightingSystem;
  kokoSpawn: THREE.Vector3;
  gamerChairPos: THREE.Vector3;
  chairGroup: THREE.Group;
  deskZoneMin: THREE.Vector3;
  deskZoneMax: THREE.Vector3;
  setMonitorConnectionLost: (lost: boolean) => void;
}

export function buildGamerRoomLevel(
  scene: THREE.Scene,
  sound: ProceduralAudioEngine,
  vfx: VFXManager
): GamerRoomData {
  const root = new THREE.Group();
  root.name = 'Environment_GamerRoom';
  scene.add(root);

  scene.background = new THREE.Color(0x131628);
  scene.fog = new THREE.Fog(0x131628, 48, 125);

  const dirLight = new THREE.DirectionalLight(0xcfd8ff, 0.85);
  dirLight.position.set(-10, 22, -16);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 70;
  const d = 32;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  root.add(dirLight);

  const ctx: PropBuildContext = { walkables: [], obstacles: [] };
  const ledMeshes: THREE.Mesh[] = [];

  // Materials
  const floorMat = createToonMaterial(0x282b3a);
  const wallDarkMat = createToonMaterial(0x1e2233);
  const wallSideMat = createToonMaterial(0x23283d);
  const ceilingMat = createToonMaterial(0x171a27);
  const deskMat = createToonMaterial(0x1a1d26);
  const woodMat = createToonMaterial(0x52392b);
  const cardboardMat = createToonMaterial(0xa88255);
  const bedFrameMat = createToonMaterial(0x2e2a38);
  const mattressMat = createToonMaterial(0xd8d6e6);
  const blanketMat = createToonMaterial(0x2c427a);
  const metalMat = createToonMaterial(0x6e7688);
  const glassMat = createToonMaterial(0x66cfff, { transparent: true, opacity: 0.32 });
  const redMat = createToonMaterial(0xc93b4b);
  const mintMat = createToonMaterial(0x4de3b2);
  const yellowMat = createToonMaterial(0xf2c94c);

  const makeLed = (
    name: string,
    centerM: [number, number, number],
    sizeM: [number, number, number],
    parent: THREE.Object3D = root
  ): THREE.Mesh => {
    const mat = new THREE.MeshToonMaterial({
      color: 0x5b6cff,
      emissive: 0x5b6cff,
      emissiveIntensity: 1.4,
    });
    const m = addBox(parent, name, centerM, sizeM, mat, ctx, {
      collider: false,
      edges: false,
      castShadow: false,
    });
    ledMeshes.push(m);
    return m;
  };

  // 1. Room Shell
  const shellOpts = { castShadow: false, receiveShadow: true, edges: false };
  const halfW = ROOM_W * 0.5;
  const halfD = ROOM_D * 0.5;
  addBox(root, 'Floor', [0, -0.05, 0], [ROOM_W + 0.4, 0.1, ROOM_D + 0.4], floorMat, ctx, shellOpts);
  addBox(root, 'Wall_Back', [0, ROOM_H * 0.5, halfD + WALL_T * 0.5], [ROOM_W, ROOM_H, WALL_T], wallDarkMat, ctx, shellOpts);
  addBox(root, 'Wall_Left', [-halfW - WALL_T * 0.5, ROOM_H * 0.5, 0], [WALL_T, ROOM_H, ROOM_D + WALL_T * 2], wallSideMat, ctx, shellOpts);
  addBox(root, 'Wall_Right', [halfW + WALL_T * 0.5, ROOM_H * 0.5, 0], [WALL_T, ROOM_H, ROOM_D + WALL_T * 2], wallSideMat, ctx, shellOpts);
  addBox(root, 'Wall_Front_Low', [0, 0.45, -halfD - WALL_T * 0.5], [ROOM_W, 0.9, WALL_T], wallDarkMat, ctx, shellOpts);
  addBox(root, 'Ceiling', [0, ROOM_H + 0.05, 0], [ROOM_W + 0.3, 0.1, ROOM_D + 0.3], ceilingMat, ctx, {
    ...shellOpts,
    isObstacle: false,
  });

  // 2. Zona Bawah: Pintu Kamar (dengan celah bawah pintu), Kasur, Kardus
  const doorGroup = new THREE.Group();
  addBox(doorGroup, 'Door_Frame_L', [-2.65, 1.0, -halfD + 0.04], [0.08, 2.0, 0.1], woodMat, ctx);
  addBox(doorGroup, 'Door_Frame_R', [-1.75, 1.0, -halfD + 0.04], [0.08, 2.0, 0.1], woodMat, ctx);
  addBox(doorGroup, 'Door_Leaf', [-2.2, 1.08, -halfD + 0.04], [0.84, 1.88, 0.06], woodMat, ctx);
  addSph(doorGroup, 'Door_Knob', [-1.88, 0.98, -halfD + 0.09], [0.07, 0.07, 0.07], yellowMat);
  root.add(doorGroup);

  // Kasur di sisi kiri (dengan celah bawah kasur)
  const bedGroup = new THREE.Group();
  addBox(bedGroup, 'Bed_Base', [-2.75, 0.28, 1.35], [1.65, 0.16, 2.15], bedFrameMat, ctx);
  for (const lx of [-3.5, -2.0]) {
    for (const lz of [0.35, 2.35]) {
      addBox(bedGroup, 'Bed_Leg', [lx, 0.1, lz], [0.1, 0.2, 0.1], bedFrameMat, ctx);
    }
  }
  addBox(bedGroup, 'Mattress', [-2.75, 0.44, 1.35], [1.56, 0.16, 2.05], mattressMat, ctx);
  addBox(bedGroup, 'Blanket', [-2.75, 0.53, 1.05], [1.58, 0.06, 1.35], blanketMat, ctx);
  addBox(bedGroup, 'Pillow', [-2.75, 0.56, 2.1], [0.75, 0.1, 0.42], mattressMat, ctx);
  root.add(bedGroup);

  // Tumpukan kardus & buku di sudut kiri-depan-tengah (untuk stealth)
  addBox(root, 'Cardboard_Big', [-3.4, 0.25, -0.7], [0.65, 0.5, 0.6], cardboardMat, ctx);
  addBox(root, 'Cardboard_Top', [-3.45, 0.65, -0.72], [0.48, 0.3, 0.44], cardboardMat, ctx);
  addBox(root, 'GameBox_Stack', [-2.85, 0.18, -0.95], [0.36, 0.36, 0.32], redMat, ctx);

  // 3. Zona Meja Gaming (x center = +1.0, z = +2.65)
  const deskCenterX = 1.0;
  const deskZ = 2.65;
  const deskW = 2.65;
  const deskTopY = 0.76;

  addBox(root, 'Gaming_Desk_Top', [deskCenterX, deskTopY - 0.02, deskZ], [deskW, 0.04, 0.9], deskMat, ctx);
  for (const lx of [deskCenterX - deskW * 0.46, deskCenterX + deskW * 0.46]) {
    for (const lz of [deskZ - 0.38, deskZ + 0.38]) {
      addBox(root, 'Desk_Leg', [lx, (deskTopY - 0.04) * 0.5, lz], [0.06, deskTopY - 0.04, 0.06], metalMat, ctx);
    }
  }
  makeLed('Desk_LED_Back', [deskCenterX, deskTopY + 0.01, deskZ + 0.44], [deskW - 0.05, 0.025, 0.025]);
  makeLed('Desk_LED_Front', [deskCenterX, deskTopY - 0.03, deskZ - 0.44], [deskW - 0.05, 0.02, 0.02]);

  // Kabel-kabel & power strip di kolong meja
  addBox(root, 'Power_Strip', [1.4, 0.03, 2.95], [0.36, 0.04, 0.09], metalMat, ctx, { collider: false });
  for (let c = 0; c < 4; c++) {
    addCyl(root, `UnderDesk_Cable_${c}`, [0.9 + c * 0.25, 0.42, 2.95], 0.02, 0.68, deskMat, ctx, {
      collider: false,
      eulerDeg: [0, 0, (c - 1.5) * 9],
    });
  }

  // Monitor Ultrawide + Dynamic Screen Texture
  const monitorX = 0.95;
  const monitorZ = 2.86;
  addBox(root, 'Monitor_Stand_Base', [monitorX, deskTopY + 0.02, monitorZ], [0.36, 0.03, 0.24], metalMat, ctx);
  addBox(root, 'Monitor_Neck', [monitorX, deskTopY + 0.2, monitorZ + 0.06], [0.09, 0.34, 0.06], metalMat, ctx);
  addBox(root, 'Monitor_Frame', [monitorX, deskTopY + 0.42, monitorZ - 0.03], [1.22, 0.48, 0.05], deskMat, ctx);

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 200;
  const screenCtx = screenCanvas.getContext('2d')!;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  drawGameScreen(screenCtx, false);
  screenTex.needsUpdate = true;

  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.16 * S, 0.42 * S), screenMat);
  screenMesh.position.set(monitorX * S, (deskTopY + 0.42) * S, (monitorZ - 0.062) * S);
  screenMesh.rotation.y = Math.PI;
  screenMesh.raycast = () => {};
  root.add(screenMesh);

  // Keyboard & Mouse
  addBox(root, 'Keyboard', [0.85, deskTopY + 0.018, 2.48], [0.46, 0.025, 0.16], deskMat, ctx);
  makeLed('Keyboard_RGB', [0.85, deskTopY + 0.032, 2.48], [0.42, 0.008, 0.12]);
  addBox(root, 'Mousepad', [1.38, deskTopY + 0.004, 2.5], [0.32, 0.006, 0.26], deskMat, ctx, { collider: false });
  addBox(root, 'Mouse', [1.38, deskTopY + 0.022, 2.48], [0.07, 0.03, 0.11], metalMat, ctx);

  // Sisi Kiri Meja: Kaleng Minuman Energi & Bungkus Keripik
  const canX = -0.05;
  const canZ = 2.52;
  const energyCan = addCyl(root, 'Energy_Drink_Can', [canX, deskTopY + 0.08, canZ], 0.085, 0.16, mintMat, ctx);
  addCyl(root, 'Energy_Can_Rim', [canX, deskTopY + 0.165, canZ], 0.078, 0.012, metalMat, ctx, { collider: false });
  addBox(root, 'Chip_Bag', [-0.22, deskTopY + 0.04, 2.66], [0.22, 0.08, 0.26], redMat, ctx, {
    eulerDeg: [0, 22, 0],
  });

  // Sisi Kanan Meja: Casing PC Tempered Glass + Kabel LAN Belakang
  const pcX = 1.98;
  const pcZ = 2.62;
  addBox(root, 'PC_Feet', [pcX, deskTopY + 0.02, pcZ], [0.26, 0.04, 0.48], metalMat, ctx);
  addBox(root, 'PC_Frame', [pcX, deskTopY + 0.3, pcZ], [0.28, 0.52, 0.5], deskMat, ctx);
  addBox(root, 'PC_Glass_Side', [pcX - 0.142, deskTopY + 0.3, pcZ], [0.01, 0.44, 0.42], glassMat, ctx, {
    collider: false,
    edges: false,
  });
  makeLed('PC_Interior_RGB_1', [pcX - 0.05, deskTopY + 0.35, pcZ - 0.08], [0.1, 0.1, 0.1]);
  makeLed('PC_Interior_RGB_2', [pcX - 0.05, deskTopY + 0.22, pcZ + 0.08], [0.12, 0.04, 0.24]);
  const lanCable = addCyl(root, 'LAN_Cable', [pcX, deskTopY + 0.18, pcZ + 0.28], 0.025, 0.16, yellowMat, ctx, {
    eulerDeg: [90, 0, 0],
  });

  // 4. Zona Atas: Poster Berbingkai (jalur merayap vertikal) + Rak Dinding + Action Figures
  // Left wall climbs up to wall shelf right inside the oscillating fan wind path!
  const poster1 = addBox(root, 'Poster_1', [-halfW + 0.03, 0.85, 0.2], [0.04, 0.9, 0.65], redMat, ctx);
  addBox(poster1, 'Poster_Art_1', [0.022, 0, 0], [0.01, 0.78, 0.54], yellowMat, ctx, { collider: false });
  addBox(root, 'Poster_2', [-halfW + 0.03, 1.35, -0.55], [0.04, 0.72, 0.52], blanketMat, ctx);

  // Rak Dinding di sisi kiri atas (reachable via wall/posters!)
  const shelfX = -3.72;
  const shelfY = 1.66;
  const shelfZ = 0.22;
  addBox(root, 'Wall_Shelf', [shelfX, shelfY, shelfZ], [0.46, 0.04, 1.35], woodMat, ctx);
  // 3 Action Figures di rak dinding
  const figColors = [redMat, mintMat, yellowMat];
  for (let i = 0; i < 3; i++) {
    const fz = shelfZ - 0.42 + i * 0.42;
    addCyl(root, `ActionFigure_Base_${i}`, [shelfX, shelfY + 0.035, fz], 0.12, 0.03, metalMat, ctx);
    addBox(root, `ActionFigure_Body_${i}`, [shelfX, shelfY + 0.14, fz], [0.1, 0.18, 0.08], figColors[i], ctx);
    addSph(root, `ActionFigure_Head_${i}`, [shelfX, shelfY + 0.26, fz], [0.08, 0.08, 0.08], figColors[i]);
  }

  // 5. Kursi Gaming (separate root so it can topple backward in finale!)
  const gamerChairPos = new THREE.Vector3(0.95 * S, 0, 1.65 * S);
  const chairGroup = new THREE.Group();
  chairGroup.position.copy(gamerChairPos);
  addCyl(chairGroup, 'Chair_Stem', [0, 0.24, 0], 0.07, 0.44, metalMat, ctx, { collider: false });
  addBox(chairGroup, 'Chair_Base_A', [0, 0.04, 0], [0.6, 0.04, 0.07], metalMat, ctx, { collider: false });
  addBox(chairGroup, 'Chair_Base_B', [0, 0.04, 0], [0.07, 0.04, 0.6], metalMat, ctx, { collider: false });
  addBox(chairGroup, 'Chair_Seat', [0, 0.46, 0], [0.52, 0.08, 0.5], deskMat, ctx, { collider: false });
  addBox(chairGroup, 'Chair_Back', [0, 0.92, -0.22], [0.48, 0.88, 0.09], deskMat, ctx, { collider: false });
  addBox(chairGroup, 'Chair_Stripe', [0, 0.92, -0.17], [0.18, 0.78, 0.02], redMat, ctx, { collider: false });
  root.add(chairGroup);

  // 6. Kipas Angin Berdiri Berosilasi (front-left corner sweeping Kasur <-> Meja Gaming)
  const fan = new OscillatingFan(
    new THREE.Vector3(-3.35 * S, 0, -2.35 * S),
    ctx.walkables,
    ctx.obstacles,
    sound,
    vfx
  );
  root.add(fan.root);

  // 7. RGB Lighting System + Volumetric Glow + Flashbang Glare
  const deskCenterPos = new THREE.Vector3(deskCenterX * S, deskTopY * S, deskZ * S);
  const pcCenterPos = new THREE.Vector3(pcX * S, (deskTopY + 0.3) * S, pcZ * S);
  const monitorCenterPos = new THREE.Vector3(monitorX * S, (deskTopY + 0.42) * S, monitorZ * S);
  const rgbLighting = new RgbLightingSystem(
    root as unknown as THREE.Scene,
    ledMeshes,
    deskCenterPos,
    pcCenterPos,
    monitorCenterPos,
    sound,
    vfx
  );
  vfx.attachRgbGlowRig(root, deskCenterPos, pcCenterPos, monitorCenterPos);

  // 8. 3 Target Sabotase Bab 02
  const interactiveProps = createBab2Targets(
    root,
    new THREE.Vector3(canX * S, (deskTopY + 0.16) * S, canZ * S),
    energyCan,
    new THREE.Vector3(pcX * S, (deskTopY + 0.18) * S, (pcZ + 0.32) * S),
    lanCable,
    new THREE.Vector3(monitorX * S, (deskTopY + 0.68) * S, (monitorZ - 0.05) * S)
  );

  // 9. 4 Zona Aman (SEMBUNYI)
  const hidingSpots = createBab2HidingSpots(root, halfD, deskTopY, pcX, pcZ, monitorX, monitorZ);

  scene.updateMatrixWorld(true);

  return {
    root,
    walkables: ctx.walkables,
    obstacles: ctx.obstacles,
    bounds: {
      halfW: ROOM_W * 0.5 * S,
      halfD: ROOM_D * 0.5 * S,
      height: ROOM_H * S,
    },
    interactiveProps,
    hidingSpots,
    fan,
    rgbLighting,
    kokoSpawn: new THREE.Vector3(-2.2 * S, 0.08, -2.75 * S),
    gamerChairPos,
    chairGroup,
    deskZoneMin: new THREE.Vector3((deskCenterX - deskW * 0.55) * S, (deskTopY - 0.06) * S, (deskZ - 0.52) * S),
    deskZoneMax: new THREE.Vector3((deskCenterX + deskW * 0.55) * S, (deskTopY + 1.0) * S, (deskZ + 0.55) * S),
    setMonitorConnectionLost: (lost: boolean) => {
      drawGameScreen(screenCtx, lost);
      screenTex.needsUpdate = true;
    },
  };
}

function drawGameScreen(ctx: CanvasRenderingContext2D, connectionLost: boolean): void {
  const w = 512;
  const h = 200;

  if (connectionLost) {
    ctx.fillStyle = '#1d070c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff3b4e';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#ff4455';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONNECTION LOST', w * 0.5, 86);

    ctx.fillStyle = '#ffbf52';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('PING 999ms · RECONNECTING...', w * 0.5, 134);
    return;
  }

  // Glowing FPS/MOBA gameplay screen
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0f2544');
  grad.addColorStop(0.5, '#193b5a');
  grad.addColorStop(1, '#261844');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Arena grid lines
  ctx.strokeStyle = 'rgba(89, 224, 186, 0.22)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Minimap (top-left)
  ctx.fillStyle = 'rgba(10, 18, 28, 0.85)';
  ctx.fillRect(14, 14, 72, 72);
  ctx.strokeStyle = '#59e0ba';
  ctx.strokeRect(14, 14, 72, 72);
  ctx.fillStyle = '#ff5566';
  ctx.fillRect(46, 36, 8, 8);
  ctx.fillStyle = '#59e0ba';
  ctx.fillRect(28, 60, 8, 8);

  // Crosshair (center)
  ctx.strokeStyle = '#ffbf52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.48, 16, 0, Math.PI * 2);
  ctx.stroke();

  // HP & Mana bars (bottom center)
  ctx.fillStyle = '#111822';
  ctx.fillRect(140, 160, 232, 24);
  ctx.fillStyle = '#38e58d';
  ctx.fillRect(144, 164, 185, 8);
  ctx.fillStyle = '#3da9fc';
  ctx.fillRect(144, 174, 150, 6);

  ctx.fillStyle = '#59e0ba';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('RANKED · 18ms · 144 FPS', w - 16, 28);
}

function createBab2Targets(
  root: THREE.Group,
  pos1: THREE.Vector3,
  canMesh: THREE.Object3D,
  pos2: THREE.Vector3,
  lanMesh: THREE.Object3D,
  pos3: THREE.Vector3
): InteractiveProp[] {
  const beaconGeo = new THREE.RingGeometry(0.18 * S, 0.26 * S, 24);
  beaconGeo.rotateX(-Math.PI / 2);

  const makeBeacon = (pos: THREE.Vector3, color: number): THREE.Mesh => {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(beaconGeo, mat);
    m.position.copy(pos).add(new THREE.Vector3(0, 0.22, 0));
    m.raycast = () => {};
    root.add(m);
    return m;
  };

  // Ruined 1: Green/toxic foam ring on energy drink rim
  const ruined1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * S, 0.05 * S, 0.02 * S, 12),
    createToonMaterial(0x52ff9b)
  );
  ruined1.position.copy(pos1).add(new THREE.Vector3(0, 0.05, 0));
  ruined1.visible = false;
  root.add(ruined1);

  // Ruined 2: Unplugged dangling spark cap at PC LAN port
  const ruined2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.08 * S, 0.08 * S, 0.1 * S),
    createToonMaterial(0xff4433)
  );
  ruined2.position.copy(pos2).add(new THREE.Vector3(0, -0.1 * S, 0.05 * S));
  ruined2.visible = false;
  root.add(ruined2);

  // Ruined 3: Cracked terror badge on top of monitor
  const ruined3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.09 * S, 10, 8),
    createToonMaterial(0xffbf52)
  );
  ruined3.position.copy(pos3);
  ruined3.visible = false;
  root.add(ruined3);

  return [
    {
      type: 0,
      targetName: 'Minuman Energi (Kiri Meja)',
      actionVerb: 'KOTORI',
      requiredHoldDuration: 2.5,
      interactionRadius: 2.3,
      position: pos1,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: [canMesh],
      ruinedVisual: ruined1,
      beaconMesh: makeBeacon(pos1, 0x45f59c),
    },
    {
      type: 1,
      targetName: 'Kabel LAN Belakang PC',
      actionVerb: 'CABUT',
      requiredHoldDuration: 3.5,
      interactionRadius: 2.5,
      position: pos2,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: [lanMesh],
      ruinedVisual: ruined2,
      beaconMesh: makeBeacon(pos2, 0x3da9fc),
    },
    {
      type: 2,
      targetName: 'Atas Monitor Utama',
      actionVerb: 'TEROR',
      requiredHoldDuration: 3.0,
      interactionRadius: 2.8,
      position: pos3,
      currentProgress: 0,
      isRuined: false,
      isDiscovered: false,
      pristineObjects: [],
      ruinedVisual: ruined3,
      beaconMesh: makeBeacon(pos3, 0xffbf52),
    },
  ];
}

function createBab2HidingSpots(
  root: THREE.Group,
  halfD: number,
  deskTopY: number,
  pcX: number,
  pcZ: number,
  monitorX: number,
  monitorZ: number
): HidingSpot[] {
  const spots: Array<{
    id: string;
    name: string;
    pos: THREE.Vector3;
    half: THREE.Vector3;
    offset: THREE.Vector3;
  }> = [
    {
      id: 'kolong_pc',
      name: 'Kolong Casing PC',
      pos: new THREE.Vector3(pcX * S, (deskTopY + 0.04) * S, pcZ * S),
      half: new THREE.Vector3(0.32 * S, 0.16 * S, 0.34 * S),
      offset: new THREE.Vector3(-0.6 * S, -deskTopY * S, -0.9 * S),
    },
    {
      id: 'belakang_monitor',
      name: 'Belakang Dudukan Monitor',
      pos: new THREE.Vector3(monitorX * S, (deskTopY + 0.14) * S, (monitorZ + 0.14) * S),
      half: new THREE.Vector3(0.38 * S, 0.24 * S, 0.26 * S),
      offset: new THREE.Vector3(0, -deskTopY * S, -1.0 * S),
    },
    {
      id: 'celah_kardus',
      name: 'Celah Tumpukan Kardus',
      pos: new THREE.Vector3(-3.1 * S, 0.2 * S, -0.78 * S),
      half: new THREE.Vector3(0.5 * S, 0.26 * S, 0.45 * S),
      offset: new THREE.Vector3(0.9 * S, 0, 0),
    },
    {
      id: 'celah_pintu',
      name: 'Celah Bawah Pintu',
      pos: new THREE.Vector3(-2.2 * S, 0.1 * S, (-halfD + 0.18) * S),
      half: new THREE.Vector3(0.45 * S, 0.16 * S, 0.32 * S),
      offset: new THREE.Vector3(0, 0, 0.9 * S),
    },
  ];

  return spots.map((s) => {
    const geom = new THREE.PlaneGeometry(s.half.x * 1.5, s.half.z * 1.3);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x59e0ba,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    });
    const indicator = new THREE.Mesh(geom, mat);
    indicator.position.set(s.pos.x, Math.max(0.03, s.pos.y - s.half.y + 0.05), s.pos.z);
    indicator.raycast = () => {};
    root.add(indicator);

    return {
      id: s.id,
      name: s.name,
      safety: 'Safe',
      position: s.pos,
      halfExtents: s.half,
      inspectStandOffset: s.offset,
      isKokoInside: false,
      indicatorMesh: indicator,
    };
  });
}
