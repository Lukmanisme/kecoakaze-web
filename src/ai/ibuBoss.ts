import * as THREE from 'three';
import {
  BossState,
  ComputedStats,
  HidingSpot,
  IbuHabit,
  InteractiveProp,
  KitchenStation,
  ROOM_D,
  ROOM_W,
  WORLD_SCALE as S,
} from '../types';
import { IbuRig } from '../entities/ibuModel';
import { KitchenLevelData } from '../world/kitchenLevel';
import { SoundEngine } from '../audio/soundEngine';
import { Palette, createToonMaterial } from '../style/palette';

interface SandalShot {
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  elapsed: number;
  duration: number;
}

export class IbuBossController {
  public bossState: BossState = 'RoutineIdle';
  public habit: IbuHabit = 'CookingTaste';
  public detection = 0; // 0..100
  public isArmed = false;
  public activeDialogue = 'Supnya udah mendidih harum, tinggal goreng tempe sebentar.';
  public currentTrial: 0 | 1 | 2 = 0;

  // Telegraphing state (1.0s windup before broom/sandal)
  public pendingAttack: 'broom' | 'sandal' | null = null;
  public windupTimer = 0;
  public readonly windupDuration = 1.0;

  private stealthFactor = 1.0;

  private currentStation: KitchenStation = 'MejaDapur';
  private targetStation: KitchenStation = 'MejaDapur';
  private isMoving = false;
  private stationTimer = 0;
  private stationDuration = 8.0;
  private moveTargetPos = new THREE.Vector3();
  private moveTargetYaw = 0;
  private baseYaw = 0;

  private habitTimer = 0;
  private habitDuration = 8.5;
  private shockTimer = 0;
  private searchTimer = 0;
  private reactionTimer = 0;
  private isReacting = false;

  private targetHidingSpot: HidingSpot | null = null;
  private inspectTimer = 0;

  private combatTimer = 0;
  private broomSweepTimer = 0;
  private isBroomSweeping = false;
  private broomHitDealt = false;
  private readonly sandals: SandalShot[] = [];

  private readonly visionConeMesh: THREE.Mesh;
  private readonly broomTelegraphMesh: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  private readonly viewDistBase = 6.2;
  private readonly viewAngleDeg = 110;
  private readonly hearingRadiusBase = 3.0;
  private readonly detectionRate = 48;

  private static readonly COOKING_LINES = [
    'Hmm... kurang gurih dikit kuahnya, tambahin bumbu dikit lagi.',
    'Gula jawa habis lagi, anak-anak kos ngabisin ya...',
    'Supnya udah mendidih harum, tinggal goreng tempe sebentar.',
  ];
  private static readonly WIPING_LINES = [
    'Meja lengket begini siapa yang tumpahin kopi kemarin?!',
    'Capek tiap hari bersihin dapur, bocah kos ga ada yang sadar diri!',
  ];
  private static readonly FANNING_LINES = [
    'Hadeeehh hareudang pisan, panas banget hawanya...',
    'Daster kesayangan sampe basah kuyup begini...',
  ];
  private static readonly GRUMBLING_LINES = [
    'Token listrik bunyi mulu, anak kamar 3 nyalain AC 16 derajat nih!',
    'Galon air baru beli kemarin udah ludes lagi...',
  ];

  constructor(
    private readonly scene: THREE.Scene,
    public readonly rig: IbuRig,
    private readonly level: KitchenLevelData,
    private readonly sound: SoundEngine,
    private readonly onPropDiscovered: (prop: InteractiveProp) => void,
    private readonly onKokoHit: (reason: string) => void
  ) {
    const viewWorld = this.viewDistBase * this.rig.worldScale * 0.42;
    const coneAngle = THREE.MathUtils.degToRad(this.viewAngleDeg);
    const coneGeo = new THREE.CircleGeometry(viewWorld, 24, Math.PI * 0.5 - coneAngle * 0.5, coneAngle);
    coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x59e0ba,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.visionConeMesh = new THREE.Mesh(coneGeo, coneMat);
    this.visionConeMesh.position.y = 0.08;
    this.visionConeMesh.raycast = () => {};
    this.rig.root.add(this.visionConeMesh);

    const sweepGeo = new THREE.RingGeometry(0.4, 2.8 * this.rig.worldScale * 0.45, 24, 1, -Math.PI * 0.5, Math.PI);
    sweepGeo.rotateX(-Math.PI / 2);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0xff4433,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.broomTelegraphMesh = new THREE.Mesh(sweepGeo, sweepMat);
    this.broomTelegraphMesh.position.y = 0.15;
    this.broomTelegraphMesh.visible = false;
    this.broomTelegraphMesh.raycast = () => {};
    this.rig.root.add(this.broomTelegraphMesh);

    this.reset();
  }

  public applyStats(stats: ComputedStats): void {
    this.stealthFactor = stats.stealthFactor;
    this.visionConeMesh.scale.setScalar(this.stealthFactor);
  }

  public get isWindingUp(): boolean {
    return this.bossState === 'WindupAttack';
  }

  public get windupProgress(): number {
    return Math.min(1, this.windupTimer / this.windupDuration);
  }

  public reset(): void {
    this.rig.root.position.copy(this.level.ibuSpawn);
    this.rig.root.rotation.set(0, 0, 0);
    this.bossState = 'RoutineIdle';
    this.habit = 'CookingTaste';
    this.detection = 0;
    this.isArmed = false;
    this.rig.setArmed(false);
    this.rig.setExpression('Tasting');
    this.activeDialogue = IbuBossController.COOKING_LINES[0];

    this.currentTrial = 0;
    this.currentStation = 'MejaDapur';
    this.targetStation = 'MejaDapur';
    this.isMoving = false;
    this.stationTimer = 0;
    this.stationDuration = 7.5;
    this.baseYaw = 0;

    this.habitTimer = 0;
    this.habitDuration = 9.0;
    this.shockTimer = 0;
    this.searchTimer = 0;
    this.reactionTimer = 0;
    this.isReacting = false;
    this.targetHidingSpot = null;
    this.inspectTimer = 0;
    this.combatTimer = 0;
    this.pendingAttack = null;
    this.windupTimer = 0;
    this.isBroomSweeping = false;
    this.broomTelegraphMesh.visible = false;

    for (const s of this.sandals) {
      this.scene.remove(s.mesh);
    }
    this.sandals.length = 0;
  }

  public setBossState(state: BossState, dialogue?: string): void {
    if (dialogue) this.activeDialogue = dialogue;
    if (this.bossState === state) return;
    this.bossState = state;

    switch (state) {
      case 'RoutineIdle':
        this.rig.setExpression(this.habit === 'CookingTaste' ? 'Tasting' : 'NeutralJudes');
        break;
      case 'SuspiciousAlert':
        this.rig.setExpression('Suspicious');
        this.sound.playIbuAlert();
        break;
      case 'ShockedFreeze':
        this.rig.setExpression('Shocked');
        this.sound.playIbuGasp();
        break;
      case 'WindupAttack':
        this.rig.setExpression('AngryCombat');
        this.sound.playWindupWarning();
        break;
      case 'CariSapu':
      case 'AngerCombat':
      case 'Mengamuk':
        this.rig.setExpression('AngryCombat');
        this.sound.playIbuAnger();
        break;
      case 'Marah':
        this.rig.setExpression('Shocked');
        this.sound.playIbuAnger();
        break;
      case 'MencariKoko':
      case 'MemeriksaSembunyi':
        this.rig.setExpression('Suspicious');
        break;
      case 'PanicDefeated':
        this.rig.setExpression('DefeatedPanic');
        this.sound.playIbuPanic();
        break;
    }
  }

  public update(
    dt: number,
    time: number,
    kokoPos: THREE.Vector3,
    isKokoFlying: boolean,
    isKokoInvincible: boolean,
    activeHidingSpot: HidingSpot | null
  ): void {
    this.updateSandals(dt, kokoPos, isKokoInvincible);

    if (this.bossState === 'PanicDefeated') {
      this.rig.root.position.x += Math.sin(time * 30) * 0.06;
      this.visionConeMesh.visible = false;
      this.broomTelegraphMesh.visible = false;
      this.rig.updateAnimation(dt, time, false, this.bossState, this.habit);
      return;
    }

    if (this.bossState === 'Mengamuk') {
      this.rig.root.position.x += Math.sin(time * 26) * 0.08;
      this.visionConeMesh.visible = false;
      this.broomTelegraphMesh.visible = false;
      this.rig.updateAnimation(dt, time, false, this.bossState, this.habit);
      return;
    }

    this.visionConeMesh.visible = true;
    this.processPerception(dt, kokoPos, isKokoFlying, activeHidingSpot);
    this.updateVisionConeVisual();

    if (this.isReacting) {
      this.reactionTimer += dt;
      if (this.reactionTimer >= 2.5) {
        this.isReacting = false;
        this.reactionTimer = 0;
        this.setBossState('RoutineIdle');
        this.advanceRoutineSequence();
      }
      this.rig.updateAnimation(dt, time, false, this.bossState, this.habit);
      return;
    }

    switch (this.bossState) {
      case 'RoutineIdle':
        if (this.isMoving) {
          this.updateStationMovement(dt);
        } else {
          this.updateStationWork(dt);
          this.updateHabitCycle(dt);
        }
        break;

      case 'SuspiciousAlert':
        this.faceToward(kokoPos, dt * 4);
        break;

      case 'ShockedFreeze':
        this.shockTimer += dt;
        this.activeDialogue = 'ASTAGFIRULLAH KECOAKK!! JANGAN DEKET-DEKET DASTER GUE!!';
        if (this.shockTimer >= 1.0) {
          this.shockTimer = 0;
          if (this.isArmed) {
            this.setBossState('AngerCombat', 'Sini lu kecoak laknat, rasain sapu lidi!');
          } else {
            this.setBossState('CariSapu', 'Tunggu ya kecoak, gue ambil sapu lidi dulu!!');
          }
        }
        break;

      case 'CariSapu': {
        const sapuPos = this.level.stations.TempatSapu;
        const arrived = this.moveTowardPos(sapuPos, dt, 2.4 * S * 0.28);
        if (arrived) {
          this.isArmed = true;
          this.rig.setArmed(true);
          this.searchTimer = 0;
          this.setBossState('MencariKoko', 'Mana tuh kecoak tadi... awas ya kalo ketemu!');
        }
        break;
      }

      case 'MencariKoko': {
        this.searchTimer += dt;
        const sweep = Math.sin(time * 2.5) * 0.78;
        this.smoothYaw(this.baseYaw + sweep, dt * 3.5);
        if (this.searchTimer >= 8.5) {
          this.searchTimer = 0;
          this.detection = 0;
          this.setBossState('RoutineIdle', 'Hhh... udah kabur kali ya. Lanjut masak deh.');
        }
        break;
      }

      case 'WindupAttack':
        this.updateWindupAttack(dt, time, kokoPos, activeHidingSpot);
        break;

      case 'AngerCombat':
        this.updateCombat(dt, kokoPos, isKokoInvincible, activeHidingSpot);
        break;

      case 'MemeriksaSembunyi':
        this.updateInspectHiding(dt, kokoPos, isKokoInvincible);
        break;
    }

    const sweepAngle = this.isBroomSweeping
      ? Math.sin(this.broomSweepTimer * 10) * 1.15
      : 0;
    this.rig.updateAnimation(
      dt,
      time,
      this.isMoving ||
        this.bossState === 'CariSapu' ||
        (this.bossState === 'AngerCombat' && !this.isBroomSweeping),
      this.bossState,
      this.habit,
      sweepAngle
    );
  }

  private updateStationWork(dt: number): void {
    this.stationTimer += dt;
    this.checkPropDiscovery();

    if (this.stationTimer >= this.stationDuration) {
      this.stationTimer = 0;
      this.advanceRoutineSequence();
    }
  }

  private checkPropDiscovery(): void {
    const props = this.level.interactiveProps;
    if (this.currentStation === 'MejaDapur' && props[0].isRuined && !props[0].isDiscovered) {
      this.triggerDiscovery(props[0], 'IH JOROKKK!! BAHAN SAYUR GUE DIKEROKOTIN KECOAK!!');
      this.isArmed = true;
      this.rig.setArmed(true);
      this.currentTrial = 1;
    } else if (this.currentStation === 'Kompor' && props[1].isRuined && !props[1].isDiscovered) {
      this.triggerDiscovery(props[1], 'ASTAGFIRULLAH PANCI SUP GUE KEMASUKAN KECOAK!!');
      this.currentTrial = 2;
    } else if (this.currentStation === 'MejaMakan' && props[2].isRuined && !props[2].isDiscovered) {
      props[2].isDiscovered = true;
      this.onPropDiscovered(props[2]);
    }
  }

  private triggerDiscovery(prop: InteractiveProp, line: string): void {
    prop.isDiscovered = true;
    this.isReacting = true;
    this.reactionTimer = 0;
    this.setBossState('Marah', line);
    this.onPropDiscovered(prop);
  }

  private advanceRoutineSequence(): void {
    if (this.currentTrial === 0) {
      if (this.currentStation === 'Kulkas') {
        this.navigateTo('MejaDapur', 8.0);
      } else {
        this.navigateTo('Kulkas', 5.0);
      }
    } else if (this.currentTrial === 1) {
      if (this.currentStation === 'Kulkas') {
        this.navigateTo('MejaDapur', 7.5);
      } else if (this.currentStation === 'MejaDapur') {
        this.navigateTo('Kompor', 9.0);
      } else {
        this.navigateTo('Kulkas', 5.0);
      }
    } else {
      if (this.currentStation === 'Kulkas') {
        this.navigateTo('MejaDapur', 6.5);
      } else if (this.currentStation === 'MejaDapur') {
        this.navigateTo('Kompor', 7.5);
      } else if (this.currentStation === 'Kompor') {
        this.navigateTo('MejaMakan', 5.5);
      } else {
        this.navigateTo('Kulkas', 5.0);
      }
    }
  }

  private navigateTo(station: KitchenStation, duration: number): void {
    this.targetStation = station;
    this.stationDuration = duration;
    this.stationTimer = 0;
    this.moveTargetPos.copy(this.level.stations[station]);
    this.moveTargetYaw = station === 'MejaMakan' ? Math.PI : 0;
    this.isMoving = true;
  }

  private updateStationMovement(dt: number): void {
    const arrived = this.moveTowardPos(this.moveTargetPos, dt, 1.85 * S * 0.26);
    if (arrived) {
      this.isMoving = false;
      this.currentStation = this.targetStation;
      this.baseYaw = this.moveTargetYaw;
      this.smoothYaw(this.moveTargetYaw, 1);
    }
  }

  private updateHabitCycle(dt: number): void {
    this.habitTimer += dt;
    let targetYaw = this.baseYaw;
    switch (this.habit) {
      case 'WipingCounter':
        targetYaw = this.baseYaw - 0.85;
        break;
      case 'FanningHeat':
        targetYaw = this.baseYaw + 2.35;
        break;
      case 'KosGrumbling':
        targetYaw = this.baseYaw + Math.PI;
        break;
    }
    this.smoothYaw(targetYaw, dt * 4.5);

    if (this.habitTimer >= this.habitDuration) {
      this.habitTimer = 0;
      if (this.habit !== 'CookingTaste') {
        this.habit = 'CookingTaste';
        this.habitDuration = 8.5 + Math.random() * 3.5;
        this.activeDialogue =
          IbuBossController.COOKING_LINES[
            Math.floor(Math.random() * IbuBossController.COOKING_LINES.length)
          ];
        this.rig.setExpression('Tasting');
      } else {
        const list: IbuHabit[] = ['WipingCounter', 'FanningHeat', 'KosGrumbling'];
        this.habit = list[Math.floor(Math.random() * list.length)];
        this.habitDuration = 3.2 + Math.random() * 1.4;
        this.rig.setExpression('NeutralJudes');
        const pool =
          this.habit === 'WipingCounter'
            ? IbuBossController.WIPING_LINES
            : this.habit === 'FanningHeat'
              ? IbuBossController.FANNING_LINES
              : IbuBossController.GRUMBLING_LINES;
        this.activeDialogue = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  private processPerception(
    dt: number,
    kokoPos: THREE.Vector3,
    isKokoFlying: boolean,
    activeHidingSpot: HidingSpot | null
  ): void {
    if (
      this.bossState === 'AngerCombat' ||
      this.bossState === 'WindupAttack' ||
      this.bossState === 'MemeriksaSembunyi'
    ) {
      return;
    }

    if (activeHidingSpot && activeHidingSpot.safety === 'Safe') {
      this.detection = Math.max(0, this.detection - this.detectionRate * 0.65 * dt);
      if (this.detection <= 5 && this.bossState === 'SuspiciousAlert') {
        this.setBossState('RoutineIdle');
      }
      return;
    }

    let effDist = this.viewDistBase * this.rig.worldScale * 0.45 * this.stealthFactor;
    let effAngle = this.viewAngleDeg;
    let rateMult = this.stealthFactor;

    if (this.bossState === 'RoutineIdle') {
      if (this.habit === 'CookingTaste') {
        effDist *= 0.65;
        effAngle *= 0.6;
        rateMult *= 0.6;
      } else if (this.habit === 'WipingCounter') {
        effDist *= 0.75;
        effAngle *= 0.75;
        rateMult *= 0.75;
      }
    }

    const eyePos = this.rig.getEyeWorldPosition();
    const toKoko = kokoPos.clone().sub(eyePos);
    const dist = toKoko.length();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rig.root.quaternion);

    let canSee = false;
    if (dist <= effDist) {
      const horizDir = new THREE.Vector3(toKoko.x, 0, toKoko.z).normalize();
      const angleDeg = THREE.MathUtils.radToDeg(forward.angleTo(horizDir));
      if (angleDeg <= effAngle * 0.5) {
        this.raycaster.set(eyePos, toKoko.clone().normalize());
        this.raycaster.near = 0.2;
        this.raycaster.far = dist - 0.15;
        const hits = this.raycaster.intersectObjects(this.level.obstacles, false);
        if (hits.length === 0) canSee = true;
      }
    }

    const hearRadius = this.hearingRadiusBase * this.rig.worldScale * 0.45 * this.stealthFactor;
    const canHear = isKokoFlying && dist <= hearRadius;

    if (canSee || canHear) {
      const mult = (canSee && canHear ? 1.5 : 1.0) * rateMult;
      this.detection = Math.min(100, this.detection + this.detectionRate * mult * dt);

      if (canHear && !canSee) {
        this.activeDialogue = 'Eh suara desingan sayap apaan tuh?!';
      } else if (canSee) {
        this.activeDialogue = 'Lho... itu kecoak gerak-gerak di situ?!';
      }

      if (this.detection >= 100) {
        this.shockTimer = 0;
        if (this.isArmed) {
          this.setBossState('AngerCombat', 'KETAUAN LU KECOAKK!!');
        } else {
          this.setBossState('ShockedFreeze');
        }
      } else if (this.bossState === 'MencariKoko' && canSee) {
        this.setBossState('AngerCombat', 'KETEMU LU!! RASAIN SAPU LIDI!');
      } else if (this.detection > 25 && this.bossState === 'RoutineIdle') {
        this.setBossState('SuspiciousAlert');
      }
    } else {
      this.detection = Math.max(0, this.detection - this.detectionRate * 0.45 * dt);
      if (this.detection <= 5 && this.bossState === 'SuspiciousAlert') {
        this.setBossState('RoutineIdle');
      }
    }
  }

  private updateWindupAttack(
    dt: number,
    time: number,
    kokoPos: THREE.Vector3,
    activeHidingSpot: HidingSpot | null
  ): void {
    if (activeHidingSpot) {
      this.pendingAttack = null;
      this.windupTimer = 0;
      this.broomTelegraphMesh.visible = false;
      this.targetHidingSpot = activeHidingSpot;
      this.inspectTimer = 0;
      this.setBossState('MemeriksaSembunyi', 'Mana tuh kecoak nyelip di mana dia?!');
      return;
    }

    this.faceToward(kokoPos, dt * 8);
    this.windupTimer += dt;

    if (this.pendingAttack === 'broom') {
      this.broomTelegraphMesh.visible = true;
      const mat = this.broomTelegraphMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.abs(Math.sin(time * 14)) * 0.45;
    }

    if (this.windupTimer >= this.windupDuration) {
      const atk = this.pendingAttack;
      this.pendingAttack = null;
      this.windupTimer = 0;
      this.bossState = 'AngerCombat';

      if (atk === 'broom') {
        this.isBroomSweeping = true;
        this.broomSweepTimer = 0;
        this.broomHitDealt = false;
        this.broomTelegraphMesh.visible = true;
        this.activeDialogue = 'Jangan deket-deket meja gue!!';
        this.sound.playBroomSweep();
      } else {
        this.broomTelegraphMesh.visible = false;
        this.throwSandal(kokoPos);
      }
    }
  }

  private updateCombat(
    dt: number,
    kokoPos: THREE.Vector3,
    isKokoInvincible: boolean,
    activeHidingSpot: HidingSpot | null
  ): void {
    if (activeHidingSpot) {
      this.targetHidingSpot = activeHidingSpot;
      this.inspectTimer = 0;
      this.isBroomSweeping = false;
      this.broomTelegraphMesh.visible = false;
      this.setBossState('MemeriksaSembunyi', 'Mana tuh kecoak nyelip di mana dia?!');
      return;
    }

    if (this.isBroomSweeping) {
      this.broomSweepTimer += dt;
      if (this.broomSweepTimer >= 0.35 && !this.broomHitDealt) {
        this.broomHitDealt = true;
        const dist = this.rig.root.position.distanceTo(kokoPos);
        if (dist <= 3.0 * this.rig.worldScale * 0.45 && kokoPos.y < 1.3 * S && !isKokoInvincible) {
          this.onKokoHit('Koko kena gebukan sapu lidi Ibu!');
          return;
        }
      }
      if (this.broomSweepTimer >= 0.85) {
        this.isBroomSweeping = false;
        this.broomTelegraphMesh.visible = false;
      }
      return;
    }

    this.faceToward(kokoPos, dt * 6);
    const distToKoko = this.rig.root.position.distanceTo(kokoPos);
    const meleeRange = 2.6 * this.rig.worldScale * 0.45;

    if (distToKoko > meleeRange * 0.9) {
      this.moveTowardPos(kokoPos, dt, 1.55 * S * 0.25);
    }

    this.combatTimer += dt;
    if (this.combatTimer >= 1.65) {
      this.combatTimer = 0;
      this.pendingAttack = distToKoko <= meleeRange && kokoPos.y < 1.2 * S ? 'broom' : 'sandal';
      this.windupTimer = 0;
      const line =
        this.pendingAttack === 'broom'
          ? 'AWAS LU! RASAIN SAPU LIDI!!'
          : 'AWAS LU! SIAP-SIAP SANDAL SWALLOW!!';
      this.setBossState('WindupAttack', line);
    }
  }

  private updateInspectHiding(
    dt: number,
    kokoPos: THREE.Vector3,
    isKokoInvincible: boolean
  ): void {
    if (!this.targetHidingSpot) {
      this.setBossState('RoutineIdle');
      return;
    }

    const inspectPos = this.targetHidingSpot.position
      .clone()
      .add(this.targetHidingSpot.inspectStandOffset);
    inspectPos.y = 0;
    inspectPos.x = THREE.MathUtils.clamp(inspectPos.x, -ROOM_W * 0.45 * S, ROOM_W * 0.45 * S);
    inspectPos.z = THREE.MathUtils.clamp(inspectPos.z, -ROOM_D * 0.45 * S, ROOM_D * 0.45 * S);

    const arrived = this.moveTowardPos(inspectPos, dt, 1.9 * S * 0.25);
    if (!arrived) return;

    this.faceToward(this.targetHidingSpot.position, dt * 6);
    this.inspectTimer += dt;
    this.activeDialogue = 'Nyelip di kolong ya lu?! Sini keluar!!';

    if (this.inspectTimer >= 2.0) {
      const spot = this.targetHidingSpot;
      this.targetHidingSpot = null;
      this.inspectTimer = 0;
      this.detection = 0;

      if (spot.safety === 'Safe') {
        this.setBossState(
          'RoutineIdle',
          'Hadehh sempit banget ga nyampe sapunya! Awas lu ya!'
        );
      } else {
        this.activeDialogue = 'KETEMU DI BALIK PERABOT! RASAIN SAPU GUE!';
        this.sound.playBroomSweep();
        if (spot.isKokoInside && !isKokoInvincible && this.rig.root.position.distanceTo(kokoPos) < 12) {
          this.onKokoHit(`Ibu menjangkau persembunyian berisiko (${spot.name})!`);
          return;
        }
        this.setBossState('RoutineIdle');
      }
    }
  }

  private throwSandal(kokoPos: THREE.Vector3): void {
    this.activeDialogue = 'Nih makan sandal Swallow!!';
    this.sound.playSandalThrow();

    const mesh = new THREE.Group();
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.14, 1.35),
      createToonMaterial(Palette.Teal)
    );
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.05, 6, 12, Math.PI),
      createToonMaterial(Palette.White)
    );
    strap.position.set(0, 0.12, 0.18);
    mesh.add(sole, strap);

    const startPos = this.rig.root.position
      .clone()
      .add(new THREE.Vector3(0, 1.45 * this.rig.worldScale, 0));
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.sandals.push({
      mesh,
      startPos,
      targetPos: kokoPos.clone(),
      elapsed: 0,
      duration: 0.9,
    });
  }

  private updateSandals(dt: number, kokoPos: THREE.Vector3, isInvincible: boolean): void {
    for (let i = this.sandals.length - 1; i >= 0; i--) {
      const s = this.sandals[i];
      s.elapsed += dt;
      const t = Math.min(1, s.elapsed / s.duration);
      const pos = new THREE.Vector3().lerpVectors(s.startPos, s.targetPos, t);
      pos.y += Math.sin(t * Math.PI) * 3.2;
      s.mesh.position.copy(pos);
      s.mesh.rotation.x += dt * 14;
      s.mesh.rotation.z += dt * 9;

      if (pos.distanceTo(kokoPos) < 0.72 && !isInvincible) {
        this.scene.remove(s.mesh);
        this.sandals.splice(i, 1);
        this.onKokoHit('Koko tertimpa lemparan sandal Swallow Ibu!');
        return;
      }

      if (t >= 1) {
        this.scene.remove(s.mesh);
        this.sandals.splice(i, 1);
      }
    }
  }

  private updateVisionConeVisual(): void {
    const mat = this.visionConeMesh.material as THREE.MeshBasicMaterial;
    if (
      this.bossState === 'AngerCombat' ||
      this.bossState === 'WindupAttack' ||
      this.detection > 75
    ) {
      mat.color.setHex(0xff5544);
      mat.opacity = 0.25;
    } else if (this.detection > 25 || this.bossState === 'SuspiciousAlert') {
      mat.color.setHex(0xffbf52);
      mat.opacity = 0.2;
    } else {
      mat.color.setHex(0x59e0ba);
      mat.opacity = 0.13;
    }
  }

  private moveTowardPos(target: THREE.Vector3, dt: number, speed: number): boolean {
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
    const targetYaw = Math.atan2(dx, dz);
    this.smoothYaw(targetYaw, dt * 7);
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
