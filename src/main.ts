import * as THREE from 'three';
import './style.css';
import { StageController, StageId } from './types';
import { buildKitchenLevel } from './world/kitchenLevel';
import { buildGamerRoomLevel } from './world/gamerRoomLevel';
import { KokoRig } from './entities/kokoModel';
import { IbuRig } from './entities/ibuModel';
import { GamerRig } from './entities/gamerModel';
import { KokoController } from './physics/kokoPhysics';
import { SurfaceAlignedCamera } from './camera/surfaceCamera';
import { IbuBossController } from './ai/ibuBoss';
import { GamerBossController } from './ai/gamerBoss';
import { KitchenStageManager } from './game/stageManager';
import { GamerRoomStageManager } from './game/bab2StageManager';
import { SoundEngine } from './audio/soundEngine';
import { HUDController } from './ui/hudController';
import { ProgressionManager } from './game/progression';
import { ParticleFXManager } from './effects/particleFx';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 160);

const sound = new SoundEngine();
const progression = new ProgressionManager();
const particles = new ParticleFXManager(scene);

// Build both environments cleanly so stage switching is instant without page reload
const kitchenLevel = buildKitchenLevel(scene);
const gamerRoom = buildGamerRoomLevel(scene, sound);

const kokoRig = new KokoRig();
scene.add(kokoRig.root);
scene.add(kokoRig.blobShadow);

const ibuRig = new IbuRig();
scene.add(ibuRig.root);

const gamerRig = new GamerRig();
scene.add(gamerRig.root);

const koko = new KokoController(
  kokoRig,
  {
    walkables: kitchenLevel.walkables,
    soapyZone: kitchenLevel.soapyZone,
    updraftZone: kitchenLevel.updraftZone,
  },
  sound
);

const surfaceCam = new SurfaceAlignedCamera(camera, kitchenLevel.obstacles);
const hud = new HUDController(surfaceCam, sound);

let bab1Stage!: KitchenStageManager;
let bab2Stage!: GamerRoomStageManager;

const sharedCallbacks = {
  onStoryMessage: (text: string, dur: number) => hud.showStory(text, dur),
  onToast: (text: string) => hud.showToast(text),
  onStageClear: (
    stageId: StageId,
    stars: number,
    finalMomentum: number,
    dnaEarned: number,
    totalDna: number
  ) => hud.showStageResult(stageId, stars, finalMomentum, dnaEarned, totalDna),
  onKokoCaught: (reason: string) => hud.showCaught(reason),
};

const ibuBoss = new IbuBossController(
  scene,
  ibuRig,
  kitchenLevel,
  sound,
  (prop) => bab1Stage.handlePropDiscovered(prop),
  (reason) => bab1Stage.handleKokoHit(reason)
);

const gamerBoss = new GamerBossController(
  gamerRig,
  gamerRoom,
  sound,
  (reason) => bab2Stage.handleKokoHit(reason)
);

bab1Stage = new KitchenStageManager(
  scene,
  kitchenLevel,
  koko,
  ibuBoss,
  surfaceCam,
  sound,
  progression,
  particles,
  sharedCallbacks
);

bab2Stage = new GamerRoomStageManager(
  scene,
  gamerRoom,
  koko,
  gamerBoss,
  surfaceCam,
  sound,
  progression,
  particles,
  sharedCallbacks
);

let selectedStageId: StageId = 'bab1';
let activeStage: StageController = bab1Stage;

function selectAndLoadStage(id: StageId, startImmediately: boolean): void {
  selectedStageId = id;
  bab1Stage.setActive(id === 'bab1');
  bab2Stage.setActive(id === 'bab2');
  activeStage = id === 'bab1' ? bab1Stage : bab2Stage;
  activeStage.isPaused = false;
  activeStage.isStarted = startImmediately;
  activeStage.resetStage();
}

selectAndLoadStage('bab1', false);

hud.bindStageBridge({
  getActiveStage: () => activeStage,
  getSelectedStageId: () => selectedStageId,
  selectAndLoadStage,
  progression,
  isFlashbangGlare: () => activeStage === bab2Stage && bab2Stage.isFlashbangGlare,
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now() * 0.001;
const camFwd = new THREE.Vector3();
const camUp = new THREE.Vector3();

function tick(): void {
  requestAnimationFrame(tick);

  const now = performance.now() * 0.001;
  const dt = Math.min(0.05, Math.max(0.001, now - lastTime));
  lastTime = now;

  const input = hud.consumeInput();
  surfaceCam.getForward(camFwd);
  surfaceCam.getUp(camUp);

  activeStage.update(dt, now, input, camFwd, camUp);
  if (activeStage.isStarted && !activeStage.isPaused && !activeStage.isStageCleared) {
    sound.tick(dt);
  }

  const snap = activeStage.getHudSnapshot();
  hud.updateHUD(
    now,
    snap,
    koko,
    progression.save.dna,
    activeStage.isPaused,
    activeStage.isStarted
  );
  renderer.render(scene, camera);
}

tick();
