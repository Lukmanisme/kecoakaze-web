import * as THREE from 'three';
import { KokoState } from '../types';
import {
  createPronotumTexture,
  createToonMaterial,
  createWingTexture,
} from '../style/palette';

interface LegJoint {
  hip: THREE.Group;
  knee: THREE.Group;
  hipRest: THREE.Euler;
  kneeRest: THREE.Euler;
  side: number;
  index: number;
}

export class KokoRig {
  public readonly root = new THREE.Group();
  public readonly visual = new THREE.Group();
  public readonly body = new THREE.Group();
  public readonly blobShadow: THREE.Mesh;

  private readonly legs: LegJoint[] = [];
  private readonly wingLeft: THREE.Group;
  private readonly wingRight: THREE.Group;
  private readonly antennaLeft: THREE.Group;
  private readonly antennaRight: THREE.Group;

  private gaitPhase = 0;
  private flightBlend = 0;

  // Tripod gait: L1+R2+L3 vs R1+L2+R3
  private static readonly TRIPOD_OFFSET = [0, Math.PI, Math.PI, 0, 0, Math.PI];

  constructor() {
    this.root.name = 'Koko_Player';
    this.visual.name = 'Koko_Visual';
    this.visual.scale.setScalar(0.38);
    this.root.add(this.visual);
    this.visual.add(this.body);

    const bodyMat = createToonMaterial(0x5e2e1d, { emissive: 0x162b22, emissiveIntensity: 0.35 });
    const eyeMat = createToonMaterial(0x15110f, { emissive: 0x1a1a22, emissiveIntensity: 0.8 });
    const pronotumMat = createToonMaterial(0xffffff, {
      map: createPronotumTexture(),
      emissive: 0x203b30,
      emissiveIntensity: 0.25,
    });
    const wingMat = createToonMaterial(0xffffff, {
      map: createWingTexture(),
      emissive: 0x1d342a,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
    });
    const legMat = createToonMaterial(0xa65a35);

    // Abdomen & Thorax & Head (Three.js +Z forward)
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), bodyMat);
    abdomen.scale.set(1.0, 0.45, 2.28);
    abdomen.position.set(0, 0.12, -0.2);
    abdomen.castShadow = true;
    this.body.add(abdomen);

    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bodyMat);
    thorax.scale.set(1.05, 0.56, 1.02);
    thorax.position.set(0, 0.12, 0.27);
    thorax.castShadow = true;
    this.body.add(thorax);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), bodyMat);
    head.scale.set(1.05, 0.9, 0.72);
    head.position.set(0, 0.13, 0.555);
    head.rotation.x = THREE.MathUtils.degToRad(50);
    head.castShadow = true;
    this.body.add(head);

    // Eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), eyeMat);
      eye.scale.set(0.85, 1.25, 1.8);
      eye.position.set(side * 0.088, 0.16, 0.56);
      eye.rotation.set(THREE.MathUtils.degToRad(30), THREE.MathUtils.degToRad(side * 20), 0);
      this.body.add(eye);
    }

    // Cerci (tail spikes)
    for (const side of [-1, 1]) {
      const cercus = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.13, 6), legMat);
      cercus.position.set(side * 0.06, 0.13, -0.66);
      cercus.rotation.set(-Math.PI * 0.58, 0, side * -0.28);
      this.body.add(cercus);
    }

    // Pronotum shield
    const pronotum = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), pronotumMat);
    pronotum.scale.set(1.04, 0.22, 0.72);
    pronotum.position.set(0, 0.21, 0.37);
    pronotum.rotation.x = THREE.MathUtils.degToRad(9);
    pronotum.castShadow = true;
    this.body.add(pronotum);

    // Wings (Tegmina)
    const makeWing = (side: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.05, 0.205, 0.24);
      pivot.rotation.set(
        THREE.MathUtils.degToRad(1.5),
        0,
        THREE.MathUtils.degToRad(-6 * side)
      );
      const wingMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), wingMat);
      wingMesh.scale.set(0.55, 0.1, 1.95);
      wingMesh.position.set(side * 0.04, 0.01, -0.42);
      wingMesh.castShadow = true;
      pivot.add(wingMesh);
      this.body.add(pivot);
      return pivot;
    };
    this.wingLeft = makeWing(-1);
    this.wingRight = makeWing(1);

    // Antennae
    const makeAntenna = (side: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.045, 0.17, 0.63);
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.01, 0.45, 6), legMat);
      seg1.rotation.x = THREE.MathUtils.degToRad(72);
      seg1.rotation.z = THREE.MathUtils.degToRad(-side * 18);
      seg1.position.set(side * 0.08, 0.07, 0.2);
      pivot.add(seg1);

      const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.005, 0.42, 6), legMat);
      seg2.rotation.x = THREE.MathUtils.degToRad(62);
      seg2.rotation.z = THREE.MathUtils.degToRad(-side * 28);
      seg2.position.set(side * 0.22, 0.15, 0.56);
      pivot.add(seg2);

      this.body.add(pivot);
      return pivot;
    };
    this.antennaLeft = makeAntenna(-1);
    this.antennaRight = makeAntenna(1);

    // 6 Articulated Legs (L1, R1, L2, R2, L3, R3)
    const legDefs = [
      { angle: 38, hip: [0.09, 0.09, 0.36], femur: 0.2, tibia: 0.22 },
      { angle: 98, hip: [0.12, 0.09, 0.22], femur: 0.26, tibia: 0.3 },
      { angle: 148, hip: [0.12, 0.09, 0.07], femur: 0.33, tibia: 0.42 },
    ];

    let idx = 0;
    for (const def of legDefs) {
      for (const side of [-1, 1]) {
        const rad = THREE.MathUtils.degToRad(def.angle);
        const dir = new THREE.Vector3(Math.sin(rad) * side, 0, Math.cos(rad)).normalize();

        const hip = new THREE.Group();
        hip.position.set(def.hip[0] * side, def.hip[1], def.hip[2]);
        hip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.body.add(hip);

        const kneeH = 0.085;
        const femurLen = Math.hypot(def.femur, kneeH);
        const femurMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, femurLen, 6), legMat);
        femurMesh.position.set(0, kneeH * 0.5, def.femur * 0.5);
        femurMesh.rotation.x = Math.atan2(def.femur, kneeH);
        hip.add(femurMesh);

        const knee = new THREE.Group();
        knee.position.set(0, kneeH, def.femur);
        hip.add(knee);

        const groundY = -(def.hip[1] + kneeH);
        const tibiaLen = Math.hypot(def.tibia, groundY);
        const tibiaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, tibiaLen, 6), legMat);
        tibiaMesh.position.set(0, groundY * 0.5, def.tibia * 0.5);
        tibiaMesh.rotation.x = Math.atan2(def.tibia, groundY);
        knee.add(tibiaMesh);

        this.legs.push({
          hip,
          knee,
          hipRest: hip.rotation.clone(),
          kneeRest: knee.rotation.clone(),
          side,
          index: idx++,
        });
      }
    }

    // Soft Blob Shadow Decal (separate from root rotation so it stays aligned to surface beneath)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(14, 26, 36, 0.55)');
    grad.addColorStop(1, 'rgba(14, 26, 36, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowGeom = new THREE.PlaneGeometry(0.55, 0.72);
    shadowGeom.rotateX(-Math.PI / 2);
    this.blobShadow = new THREE.Mesh(shadowGeom, shadowMat);
    this.blobShadow.raycast = () => {};
  }

  public updateAnimation(dt: number, time: number, state: KokoState, planarSpeed: number): void {
    const airborne = state === 'Flying' || state === 'Gliding';
    const targetBlend = airborne ? 1 : 0;
    this.flightBlend += (targetBlend - this.flightBlend) * Math.min(1, dt * 8);

    // Legs
    this.gaitPhase += planarSpeed * 2.4 * dt * Math.PI * 2 * 0.35;
    const moving = Math.min(1, planarSpeed / 1.5);

    for (const leg of this.legs) {
      const phase = this.gaitPhase + KokoRig.TRIPOD_OFFSET[leg.index];
      const swing = Math.sin(phase) * 0.38 * moving;
      const lift = Math.max(0, Math.cos(phase)) * 0.48 * moving;

      const crawlY = leg.hipRest.y + swing * leg.side;
      const crawlX = leg.hipRest.x - lift * 0.35;
      const tuckX = leg.hipRest.x + 0.42;
      const tuckY = leg.hipRest.y + 0.5 * leg.side * (leg.index < 2 ? -1 : 1);

      leg.hip.rotation.x = THREE.MathUtils.lerp(crawlX, tuckX, this.flightBlend);
      leg.hip.rotation.y = THREE.MathUtils.lerp(crawlY, tuckY, this.flightBlend);

      const crawlKneeX = leg.kneeRest.x - lift;
      const tuckKneeX = leg.kneeRest.x - 0.95;
      leg.knee.rotation.x = THREE.MathUtils.lerp(crawlKneeX, tuckKneeX, this.flightBlend);
    }

    // Wings
    const flutter = Math.sin(time * 22 * Math.PI * 2) * 0.16 * (state === 'Gliding' ? 0.15 : 1);
    const openPitch = 0.48 + flutter;
    this.wingLeft.rotation.x = THREE.MathUtils.lerp(0.026, openPitch, this.flightBlend);
    this.wingLeft.rotation.y = THREE.MathUtils.lerp(0, -0.72, this.flightBlend);
    this.wingLeft.rotation.z = THREE.MathUtils.lerp(0.1, -0.2, this.flightBlend);

    this.wingRight.rotation.x = THREE.MathUtils.lerp(0.026, openPitch, this.flightBlend);
    this.wingRight.rotation.y = THREE.MathUtils.lerp(0, 0.72, this.flightBlend);
    this.wingRight.rotation.z = THREE.MathUtils.lerp(-0.1, 0.2, this.flightBlend);

    // Antennae
    const sniffL = Math.sin(time * 3.1) * 0.14 + Math.sin(time * 7.3) * 0.05;
    const sniffR = Math.sin(time * 2.7 + 1.3) * 0.14 + Math.sin(time * 6.1) * 0.05;
    const sweepBack = THREE.MathUtils.lerp(Math.min(1, planarSpeed / 6) * 0.18, 0.58, this.flightBlend);
    this.antennaLeft.rotation.set(sweepBack * 0.45 + sniffL * 0.4, sniffL - sweepBack * 0.6, 0);
    this.antennaRight.rotation.set(sweepBack * 0.45 + sniffR * 0.4, -sniffR + sweepBack * 0.6, 0);

    // Body breathing / subtle bob
    const breathe = Math.sin(time * 2.2) * 0.004;
    const bob = Math.abs(Math.sin(this.gaitPhase)) * 0.008 * Math.min(1, planarSpeed);
    this.body.position.y = breathe + bob;
  }
}
