import * as THREE from 'three';
import { ComputedStats, GamerState, HidingSpot, WORLD_SCALE as S } from '../types';
import { GamerRig } from '../entities/gamerModel';
import { GamerRoomData } from '../world/gamerRoomLevel';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';

export class GamerBossController {
  public state: GamerState = 'HEADSET_ON';
  public detection = 0; // 0..100
  public activeDialogue = 'Gas terus push rank... jangan sampe lag!';

  public isTelegraphingSwat = false;
  public swatTelegraphTimer = 0;
  public readonly swatTelegraphDuration = 1.1;

  private isSwingingSwat = false;
  private swatSwingTimer = 0;
  private swatHitDealt = false;

  private isSeated = true;
  private stateTimer = 0;
  private inspectPhase = 0;
  private stealthFactor = 1.0;
  private lastKokoPos = new THREE.Vector3();
  private lastCamFwd = new THREE.Vector3(0, 0, 1);

  private readonly visionConeMesh: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  private readonly viewDistBase = 5.6;
  private readonly detectionRate = 48;

  private readonly patrolPoints: THREE.Vector3[];

  constructor(
    public readonly rig: GamerRig,
    private readonly room: GamerRoomData,
    private readonly sound: ProceduralAudioEngine,
    private readonly onKokoHit: (reason: string) => void
  ) {
    // Vision cone mesh on floor
    const coneGeo = new THREE.CircleGeometry(this.viewDistBase * this.rig.worldScale * 0.44, 24, 0, Math.PI * 0.6);
    coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x59e0ba,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.visionConeMesh = new THREE.Mesh(coneGeo, coneMat);
    this.visionConeMesh.position.y = 0.08;
    this.visionConeMesh.raycast = () => {};
    this.rig.root.add(this.visionConeMesh);

    this.patrolPoints = [
      new THREE.Vector3(2.2 * S, 0, 1.55 * S), // Behind PC right side
      new THREE.Vector3(1.0 * S, 0, 1.3 * S),  // Under desk center
      new THREE.Vector3(-0.2 * S, 0, 1.5 * S), // Left desk / cables
    ];

    this.reset();
  }

  public applyStats(stats: ComputedStats): void {
    this.stealthFactor = stats.stealthFactor;
  }

  public reset(): void {
    this.state = 'HEADSET_ON';
    this.detection = 0;
    this.isSeated = true;
    this.stateTimer = 0;
    this.inspectPhase = 0;
    this.isTelegraphingSwat = false;
    this.swatTelegraphTimer = 0;
    this.isSwingingSwat = false;
    this.swatSwingTimer = 0;
    this.activeDialogue = 'Gas terus push rank... jangan sampe lag!';

    this.rig.root.position.copy(this.room.gamerChairPos);
    this.rig.root.rotation.set(0, 0, 0);
    this.room.chairGroup.position.copy(this.room.gamerChairPos);
    this.room.chairGroup.rotation.set(0, 0, 0);
  }

  public triggerDrinkChoke(kokoPos: THREE.Vector3): void {
    const { pan, gain } = this.sound.computeSpatialPanAndGain(
      this.rig.root.position,
      kokoPos,
      44,
      this.lastCamFwd
    );
    this.sound.playVocalReaction('gamer', 'choke', pan, gain);
    this.state = 'RELAXED';
    this.isSeated = true;
    this.stateTimer = 0;
    this.detection = Math.max(this.detection, 20);
    this.activeDialogue = 'UHUKK!! Kok minumannya bau aneh?! Apa itu di kiri meja?!';
  }

  public triggerLanCutLag(kokoPos: THREE.Vector3): void {
    const { pan, gain } = this.sound.computeSpatialPanAndGain(
      this.rig.root.position,
      kokoPos,
      44,
      this.lastCamFwd
    );
    this.sound.playVocalReaction('gamer', 'tilted', pan, gain);
    this.state = 'HEADSET_OFF';
    this.isSeated = false;
    this.stateTimer = 0;
    this.inspectPhase = 0;
    this.activeDialogue = 'WOOOY PING 999ms!! KABEL LAN GUE PUTUS?!';
  }

  public triggerPanicDefeat(kokoPos: THREE.Vector3): void {
    this.state = 'PANIC_DEFEATED';
    this.isSeated = false;
    this.isTelegraphingSwat = false;
    this.isSwingingSwat = false;
    this.activeDialogue = 'MAMA!! ADA KECOAK TERBANG DI MUKA GUE!! AMPUNNN!!';
    const { pan, gain } = this.sound.computeSpatialPanAndGain(
      this.rig.root.position,
      kokoPos,
      44,
      this.lastCamFwd
    );
    this.sound.playVocalReaction('gamer', 'panic', pan, gain);
    // Topple gaming chair backward
    this.room.chairGroup.rotation.x = -1.38;
    this.room.chairGroup.position.z = this.room.gamerChairPos.z - 0.35 * S;
  }

  public get windupProgress(): number {
    return Math.min(1, this.swatTelegraphTimer / this.swatTelegraphDuration);
  }

  public update(
    dt: number,
    time: number,
    kokoPos: THREE.Vector3,
    camFwd: THREE.Vector3,
    isKokoCrawlingMoving: boolean,
    isKokoFlying: boolean,
    isKokoInvincible: boolean,
    activeHidingSpot: HidingSpot | null
  ): void {
    this.lastKokoPos.copy(kokoPos);
    this.lastCamFwd.copy(camFwd);
    if (this.state === 'PANIC_DEFEATED') {
      this.visionConeMesh.visible = false;
      const doorExit = new THREE.Vector3(-2.2 * S, 0, -2.75 * S);
      this.moveToward(doorExit, dt, 3.8 * S * 0.35);
      this.rig.updatePose(dt, time, this.state, true, false);
      return;
    }

    this.visionConeMesh.visible = true;
    this.stateTimer += dt;

    // Desk Flashbang Glare check: if Monitor emits white flashbang & Koko is on open desk without cover
    const isOnDesk =
      kokoPos.x >= this.room.deskZoneMin.x &&
      kokoPos.x <= this.room.deskZoneMax.x &&
      kokoPos.y >= this.room.deskZoneMin.y &&
      kokoPos.y <= this.room.deskZoneMax.y &&
      kokoPos.z >= this.room.deskZoneMin.z &&
      kokoPos.z <= this.room.deskZoneMax.z;

    if (this.room.rgbLighting.flashbangActive && isOnDesk && !activeHidingSpot) {
      this.detection = 100;
      this.activeDialogue = 'LHO CAHAYA PUTIH— ADA KECOAK DI ATAS MEJA!!';
      this.enterSwatAttack();
    }

    if (this.state !== 'SWAT_ATTACK') {
      this.processPerception(
        dt,
        kokoPos,
        isKokoCrawlingMoving,
        isKokoFlying,
        isOnDesk,
        activeHidingSpot
      );
    }

    this.updateVisionConeVisual();

    let isMoving = false;
    let swatSwing = 0;

    switch (this.state) {
      case 'HEADSET_ON':
        this.isSeated = true;
        this.rig.root.position.copy(this.room.gamerChairPos);
        this.smoothYaw(0, dt * 6);
        if (this.stateTimer >= 16) {
          this.state = 'RELAXED';
          this.stateTimer = 0;
          this.activeDialogue = 'Istirahat bentar ah... cek cemilan sama rak figuran.';
        }
        break;

      case 'RELAXED': {
        this.isSeated = true;
        this.rig.root.position.copy(this.room.gamerChairPos);
        // Periodically looks left (energy drink/shelf) and right (PC)
        const lookWave = Math.sin(time * 0.95) * 1.15;
        this.smoothYaw(lookWave, dt * 4);
        if (this.stateTimer >= 12) {
          this.state = 'HEADSET_ON';
          this.stateTimer = 0;
          this.activeDialogue = 'Oke lanjut queue ranked lagi!';
        }
        break;
      }

      case 'HEADSET_OFF': {
        this.isSeated = false;
        const target = this.patrolPoints[this.inspectPhase % this.patrolPoints.length];
        const arrived = this.moveToward(target, dt, 1.9 * S * 0.3);
        isMoving = !arrived;
        if (arrived) {
          // Shine phone flashlight toward PC back & under desk
          this.smoothYaw(0.15 + Math.sin(time * 2.5) * 0.65, dt * 4);
          if (this.stateTimer >= 3.2) {
            this.stateTimer = 0;
            this.inspectPhase++;
            if (this.inspectPhase >= 4 && this.detection < 35) {
              this.state = 'RELAXED';
              this.isSeated = true;
              this.rig.root.position.copy(this.room.gamerChairPos);
              this.activeDialogue = 'Aneh... perasaan ada yang gerak di kolong meja.';
            }
          }
        }
        break;
      }

      case 'SWAT_ATTACK':
        this.isSeated = false;
        if (this.isTelegraphingSwat) {
          this.faceToward(kokoPos, dt * 8);
          this.swatTelegraphTimer += dt;
          if (this.swatTelegraphTimer >= this.swatTelegraphDuration) {
            this.isTelegraphingSwat = false;
            this.isSwingingSwat = true;
            this.swatSwingTimer = 0;
            this.swatHitDealt = false;
            this.activeDialogue = 'RASAIN RAKET NYAMUK TEGANGAN TINGGI!!';
            const { pan, gain } = this.sound.computeSpatialPanAndGain(
              this.rig.root.position,
              kokoPos,
              42,
              this.lastCamFwd
            );
            this.sound.playSwatterSnap(pan, gain);
          }
        } else if (this.isSwingingSwat) {
          this.swatSwingTimer += dt;
          swatSwing = Math.sin(this.swatSwingTimer * 12) * 1.4;
          if (this.swatSwingTimer >= 0.25 && !this.swatHitDealt) {
            this.swatHitDealt = true;
            const dist = this.rig.root.position.distanceTo(kokoPos);
            if (dist <= 2.65 * this.rig.worldScale * 0.48 && !isKokoInvincible && !activeHidingSpot) {
              this.onKokoHit('Koko tersengat raket nyamuk elektrik Si Gamer!');
              return;
            }
          }
          if (this.swatSwingTimer >= 0.7) {
            this.isSwingingSwat = false;
            this.detection = 35;
            this.state = 'HEADSET_OFF';
            this.stateTimer = 0;
            this.inspectPhase = 0;
            this.activeDialogue = 'Meleset?! Kemana tuh kecoak?!';
          }
        }
        break;
    }

    this.rig.updatePose(
      dt,
      time,
      this.state,
      isMoving,
      this.isSeated,
      swatSwing,
      this.isTelegraphingSwat
    );
  }

  private enterSwatAttack(): void {
    if (this.state === 'SWAT_ATTACK') return;
    this.state = 'SWAT_ATTACK';
    this.isSeated = false;
    this.isTelegraphingSwat = true;
    this.swatTelegraphTimer = 0;
    this.isSwingingSwat = false;
    this.activeDialogue = 'AWAS LU!! GUE SETRUM PAKE RAKET NYAMUK!!';
    const { pan, gain } = this.sound.computeSpatialPanAndGain(
      this.rig.root.position,
      this.lastKokoPos,
      42,
      this.lastCamFwd
    );
    this.sound.playSwatterTelegraph(pan, gain);
  }

  private processPerception(
    dt: number,
    kokoPos: THREE.Vector3,
    isKokoCrawlingMoving: boolean,
    isKokoFlying: boolean,
    isOnDesk: boolean,
    activeHidingSpot: HidingSpot | null
  ): void {
    if (activeHidingSpot && activeHidingSpot.safety === 'Safe') {
      this.detection = Math.max(0, this.detection - this.detectionRate * 0.7 * dt);
      return;
    }

    const rgbVis = this.room.rgbLighting.getVisibilityMultiplier(isOnDesk);
    let viewAngle = 60;
    let hearRadius = 0;

    if (this.state === 'HEADSET_ON') {
      viewAngle = 60;
      hearRadius = 0; // Immune to crawling & distant sounds with headset on
    } else if (this.state === 'RELAXED') {
      viewAngle = 112;
      hearRadius = isKokoFlying ? 2.5 * this.rig.worldScale * 0.45 : 0;
    } else if (this.state === 'HEADSET_OFF') {
      viewAngle = 95;
      hearRadius = isKokoFlying
        ? 5.2 * this.rig.worldScale * 0.45
        : isKokoCrawlingMoving
          ? 1.5 * this.rig.worldScale * 0.45
          : 0;
    }

    const effDist = this.viewDistBase * this.rig.worldScale * 0.45 * this.stealthFactor;
    const eyePos = this.rig.getEyeWorldPosition();
    const toKoko = kokoPos.clone().sub(eyePos);
    const dist = toKoko.length();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rig.root.quaternion);

    let canSee = false;
    if (dist <= effDist) {
      const horizDir = new THREE.Vector3(toKoko.x, 0, toKoko.z).normalize();
      const angleDeg = THREE.MathUtils.radToDeg(forward.angleTo(horizDir));
      if (angleDeg <= viewAngle * 0.5) {
        this.raycaster.set(eyePos, toKoko.clone().normalize());
        this.raycaster.near = 0.2;
        this.raycaster.far = dist - 0.15;
        const hits = this.raycaster.intersectObjects(this.room.obstacles, false);
        if (hits.length === 0) canSee = true;
      }
    }

    const canHear = hearRadius > 0 && dist <= hearRadius * this.stealthFactor;

    if (canSee || canHear) {
      const rate = this.detectionRate * this.stealthFactor * rgbVis * (canSee && canHear ? 1.45 : 1.0);
      this.detection = Math.min(100, this.detection + rate * dt);

      if (canHear && !canSee && this.state === 'HEADSET_OFF') {
        this.faceToward(kokoPos, dt * 6);
        this.activeDialogue = 'Suara kepakan apaan tuh?!';
      }

      if (this.detection >= 100) {
        this.enterSwatAttack();
      }
    } else {
      this.detection = Math.max(0, this.detection - this.detectionRate * 0.42 * dt);
    }
  }

  private updateVisionConeVisual(): void {
    const mat = this.visionConeMesh.material as THREE.MeshBasicMaterial;
    const scaleAngle = this.state === 'HEADSET_ON' ? 0.58 : this.state === 'RELAXED' ? 1.0 : 0.85;
    this.visionConeMesh.scale.set(scaleAngle, 1, 1);

    if (this.state === 'SWAT_ATTACK' || this.detection > 75) {
      mat.color.setHex(0xff4455);
      mat.opacity = 0.25;
    } else if (this.detection > 25 || this.state === 'HEADSET_OFF') {
      mat.color.setHex(0xffbf52);
      mat.opacity = 0.2;
    } else {
      mat.color.setHex(0x59e0ba);
      mat.opacity = 0.12;
    }
  }

  private moveToward(target: THREE.Vector3, dt: number, speed: number): boolean {
    const dx = target.x - this.rig.root.position.x;
    const dz = target.z - this.rig.root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.35) {
      this.rig.root.position.x = target.x;
      this.rig.root.position.z = target.z;
      return true;
    }
    const step = Math.min(dist, speed * dt);
    this.rig.root.position.x += (dx / dist) * step;
    this.rig.root.position.z += (dz / dist) * step;
    this.smoothYaw(Math.atan2(dx, dz), dt * 7);
    return false;
  }

  private faceToward(target: THREE.Vector3, factor: number): void {
    const dx = target.x - this.rig.root.position.x;
    const dz = target.z - this.rig.root.position.z;
    if (dx * dx + dz * dz < 0.001) return;
    this.smoothYaw(Math.atan2(dx, dz), factor);
  }

  private smoothYaw(targetYaw: number, factor: number): void {
    let diff = targetYaw - this.rig.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rig.root.rotation.y += diff * Math.min(1, factor);
  }
}
