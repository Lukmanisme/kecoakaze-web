import * as THREE from 'three';
import './style.css';
import { buildKitchenLevel } from './world/kitchenLevel';
import { KokoRig } from './entities/kokoModel';
import { IbuRig } from './entities/ibuModel';
import { KokoController } from './physics/kokoPhysics';
import { SurfaceAlignedCamera } from './camera/surfaceCamera';
import { IbuBossController } from './ai/ibuBoss';
import { KitchenStageManager } from './game/stageManager';
import { SoundEngine } from './audio/soundEngine';
import { HUDController } from './ui/hudController';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 160);

const level = buildKitchenLevel(scene);
const sound = new SoundEngine();

const kokoRig = new KokoRig();
scene.add(kokoRig.root);
scene.add(kokoRig.blobShadow);

const ibuRig = new IbuRig();
scene.add(ibuRig.root);

const koko = new KokoController(
  kokoRig,
  level.walkables,
  level.soapyZone,
  level.updraftZone,
  sound
);

const surfaceCam = new SurfaceAlignedCamera(camera, level.obstacles);
const hud = new HUDController(surfaceCam, sound);

let stage!: KitchenStageManager;

const ibu = new IbuBossController(
  scene,
  ibuRig,
  level,
  sound,
  (prop) => stage.handlePropDiscovered(prop),
  (reason) => stage.handleKokoHit(reason)
);

stage = new KitchenStageManager(level, koko, ibu, surfaceCam, sound, {
  onStoryMessage: (text, dur) => hud.showStory(text, dur),
  onToast: (text) => hud.showToast(text),
  onStarUnlocked: () => {},
  onStageClear: (stars, finalMomentum, dnaReward) =>
    hud.showStageResult(stars, finalMomentum, dnaReward),
  onKokoCaught: (reason) => hud.showCaught(reason),
});

hud.bindStageActions(stage);
stage.resetStage();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now() * 0.001;
const camFwd = new THREE.Vector3();
const camUp = new THREE.Vector3();

function animateUpdraftParticles(dt: number): void {
  const attr = level.updraftParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
  const origin = level.updraftParticles.geometry.userData.origin as THREE.Vector3;
  for (let i = 0; i < attr.count; i++) {
    let y = attr.getY(i) + dt * 5.2;
    if (y > origin.y + 8.0) {
      y = origin.y;
    }
    attr.setY(i, y);
  }
  attr.needsUpdate = true;
}

function tick(): void {
  requestAnimationFrame(tick);

  const now = performance.now() * 0.001;
  const dt = Math.min(0.05, Math.max(0.001, now - lastTime));
  lastTime = now;

  animateUpdraftParticles(dt);

  if (stage.isStarted && !stage.isPaused && !stage.isStageCleared) {
    const input = hud.consumeInput();

    surfaceCam.getForward(camFwd);
    surfaceCam.getUp(camUp);

    koko.update(dt, now, input, camFwd, camUp);
    stage.update(dt, now, input.actionHeld);
    ibu.update(
      dt,
      now,
      koko.position,
      koko.state === 'Flying' || koko.state === 'Gliding',
      koko.effectiveInvincible,
      stage.activeHidingSpot
    );

    surfaceCam.update(
      dt,
      koko.position,
      koko.quaternion,
      koko.surfaceNormal,
      ibu.bossState
    );

    sound.tick(dt);
  } else {
    surfaceCam.update(
      dt,
      koko.position,
      koko.quaternion,
      koko.surfaceNormal,
      ibu.bossState
    );
  }

  hud.updateHUD(now, stage, koko, ibu);
  renderer.render(scene, camera);
}

tick();
