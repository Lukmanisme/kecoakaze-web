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
import { ProceduralAudioEngine } from './audio/ProceduralAudioEngine';
import { HUDController } from './ui/hudController';
import { ProgressionManager } from './game/progression';
import { VFXManager } from './vfx/VFXManager';
import { ProceduralTextures } from './graphics/ProceduralTextures';
import { QualityManager } from './graphics/QualityManager';
import { SettingsManager } from './game/SettingsManager';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 160);

const sound = new ProceduralAudioEngine();
const progression = new ProgressionManager();
const vfx = new VFXManager(scene);
const textures = new ProceduralTextures(renderer.capabilities.getMaxAnisotropy());
scene.environment = textures.buildIndoorEnvironment(renderer);

// Build both environments cleanly using cached PBR textures
const kitchenLevel = buildKitchenLevel(scene, textures, vfx);
const gamerRoom = buildGamerRoomLevel(scene, sound, vfx, textures);

const kokoRig = new KokoRig();
scene.add(kokoRig.root);
scene.add(kokoRig.blobShadow);

const ibuRig = new IbuRig();
scene.add(ibuRig.root);

const gamerRig = new GamerRig();
scene.add(gamerRig.root);
vfx.attachSwatterRig(gamerRig.getRacketGroup());

const koko = new KokoController(
  kokoRig,
  {
    walkables: kitchenLevel.walkables,
    soapyZone: kitchenLevel.soapyZone,
    updraftZone: kitchenLevel.updraftZone,
  },
  sound,
  vfx
);

const surfaceCam = new SurfaceAlignedCamera(camera, kitchenLevel.obstacles);
const hud = new HUDController(surfaceCam, sound);

const quality = new QualityManager(renderer, textures, vfx, (msg) => hud.showToast(msg));
quality.registerShadowLights([kitchenLevel.shadowLight, gamerRoom.shadowLight], scene);

const settings = new SettingsManager();
settings.bindTargets({
  cam: surfaceCam,
  audio: sound,
  quality,
  onUiSync: () => hud.refreshSettingsUI(),
});

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
  vfx,
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
  vfx,
  sharedCallbacks
);

let selectedStageId: StageId = 'bab1';
let activeStage: StageController = bab1Stage;

function selectAndLoadStage(id: StageId, startImmediately: boolean): void {
  selectedStageId = id;
  bab1Stage.setActive(id === 'bab1');
  bab2Stage.setActive(id === 'bab2');
  quality.setActiveShadowLight(id === 'bab1' ? kitchenLevel.shadowLight : gamerRoom.shadowLight);
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
  quality,
  settings,
  isFlashbangGlare: () => activeStage === bab2Stage && bab2Stage.isFlashbangGlare,
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(quality.getPreset().pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now() * 0.001;
const camFwd = new THREE.Vector3();
const camUp = new THREE.Vector3();

function tick(): void {
  requestAnimationFrame(tick);

  const now = performance.now() * 0.001;
  const rawDt = Math.max(0.0001, now - lastTime);
  const dt = Math.min(0.05, rawDt);
  lastTime = now;

  const isActiveGameplay = activeStage.isStarted && !activeStage.isPaused && !activeStage.isStageCleared;
  quality.recordFrame(rawDt, isActiveGameplay);

  const input = hud.consumeInput();
  surfaceCam.getForward(camFwd);
  surfaceCam.getUp(camUp);

  activeStage.update(dt, now, input, camFwd, camUp);
  vfx.update(dt);
  if (!isActiveGameplay) {
    sound.stopAllLoops();
  }

  const snap = activeStage.getHudSnapshot();
  hud.updateHUD(
    dt,
    now,
    snap,
    koko,
    input,
    progression.save.dna,
    activeStage.isPaused,
    activeStage.isStarted
  );
  renderer.render(scene, camera);
}

tick();
