import * as THREE from 'three';
import {
  HidingSpot,
  HudSnapshot,
  InputState,
  InteractiveProp,
  StageController,
  StageId,
  WORLD_SCALE as S,
} from '../types';
import { GamerRoomData } from '../world/gamerRoomLevel';
import { KokoController } from '../physics/kokoPhysics';
import { GamerBossController } from '../ai/gamerBoss';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { ProgressionManager } from './progression';
import { VFXManager } from '../vfx/VFXManager';
import { StageCallbacks } from './stageManager';
import { triggerMicroHaptic } from '../input/MobileTouchController';

export class GamerRoomStageManager implements StageController {
  public readonly stageId: StageId = 'bab2';
  public gauge = 0;
  public gaugeActive = false;
  public stars: [boolean, boolean, boolean] = [false, false, false];
  public isFinaleActive = false;
  public isStageCleared = false;
  public isPaused = false;
  public isStarted = false;

  public activeHidingSpot: HidingSpot | null = null;
  public nearbyProp: InteractiveProp | null = null;

  private currentObjectiveIndex: 0 | 1 | 2 = 0;
  private sabotageSpeedMult = 1;
  private runBonusDna = 0;
  private lastActionTime = 0;
  private finaleTimer = 0;
  private readonly finaleDuration = 3.5;
  private actionTickSoundCooldown = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly room: GamerRoomData,
    private readonly koko: KokoController,
    private readonly gamer: GamerBossController,
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: ProceduralAudioEngine,
    public readonly progression: ProgressionManager,
    private readonly vfx: VFXManager,
    private readonly callbacks: StageCallbacks
  ) {
    this.applyUpgrades();
  }

  public setActive(active: boolean): void {
    this.room.root.visible = active;
    this.gamer.rig.root.visible = active;
    if (active) {
      this.scene.background = new THREE.Color(0x131628);
      this.scene.fog = new THREE.Fog(0x131628, 48, 125);
      this.koko.configureLevel({
        walkables: this.room.walkables,
        soapyZone: null,
        updraftZone: null,
        bounds: this.room.bounds,
      });
      this.cam.configureLevel(this.room.obstacles, this.room.bounds);
    } else {
      this.vfx.reset();
      this.sound.stopAllLoops();
    }
  }

  public applyUpgrades(): void {
    const stats = this.progression.getComputedStats();
    this.sabotageSpeedMult = stats.sabotageSpeedMult;
    this.koko.applyStats(stats);
    this.gamer.applyStats(stats);
  }

  public resetStage(): void {
    this.applyUpgrades();
    this.gauge = 0;
    this.gaugeActive = false;
    this.stars = [false, false, false];
    this.currentObjectiveIndex = 0;
    this.isFinaleActive = false;
    this.isStageCleared = false;
    this.finaleTimer = 0;
    this.runBonusDna = 0;
    this.activeHidingSpot = null;
    this.nearbyProp = null;

    this.vfx.reset();
    this.koko.spawnAt(this.room.kokoSpawn);
    this.gamer.reset();
    this.room.fan.reset();
    this.room.rgbLighting.reset();
    this.room.setMonitorConnectionLost(false);
    this.cam.reset(this.room.kokoSpawn);

    for (const p of this.room.interactiveProps) {
      p.isRuined = false;
      p.isDiscovered = false;
      p.currentProgress = 0;
      p.ruinedVisual.visible = false;
      for (const obj of p.pristineObjects) obj.visible = true;
    }

    for (const h of this.room.hidingSpots) {
      h.isKokoInside = false;
    }

    this.callbacks.onStoryMessage(
      'BAB 02 / KAMAR SI GAMER — Sabotase minuman, kabel LAN & monitor!',
      2.5
    );
  }

  public get totalStars(): number {
    return (this.stars[0] ? 1 : 0) + (this.stars[1] ? 1 : 0) + (this.stars[2] ? 1 : 0);
  }

  public getCurrentObjectiveProp(): InteractiveProp | null {
    if (this.isFinaleActive || this.isStageCleared) return null;
    const p = this.room.interactiveProps[this.currentObjectiveIndex];
    return p && !p.isRuined ? p : null;
  }

  public handleKokoHit(reason: string): void {
    if (this.isFinaleActive || this.isStageCleared || this.koko.effectiveInvincible) return;
    this.sound.stopAllLoops();
    this.sound.playVocalReaction('gamer', 'tilted');
    this.isPaused = true;
    this.callbacks.onKokoCaught(reason);
  }

  public update(
    dt: number,
    time: number,
    input: InputState,
    camFwd: THREE.Vector3,
    camUp: THREE.Vector3
  ): void {
    if (this.isPaused || !this.isStarted || this.isStageCleared) {
      this.vfx.updateSwatterSparks(dt, false, 0);
      this.sound.stopAllLoops();
      if (!this.isStarted) {
        this.koko.rig.updateAnimation(dt, time, this.koko.state, 0);
        this.room.rgbLighting.update(dt, time, () => {});
      }
      this.cam.update(
        dt,
        this.koko.position,
        this.koko.quaternion,
        this.koko.surfaceNormal,
        false
      );
      return;
    }

    // 1. Oscillating Fan wind physics + RGB Lighting cycle
    this.room.fan.update(dt, this.koko, camFwd, (msg) => this.callbacks.onToast(msg));
    this.room.rgbLighting.update(dt, time, (msg) => this.callbacks.onToast(msg));

    // 2. Koko 360 Physics
    this.koko.update(dt, time, input, camFwd, camUp);

    // 3. Hiding Spots
    this.activeHidingSpot = null;
    for (const spot of this.room.hidingSpots) {
      const dx = Math.abs(this.koko.position.x - spot.position.x);
      const dy = Math.abs(this.koko.position.y - spot.position.y);
      const dz = Math.abs(this.koko.position.z - spot.position.z);
      const inside =
        dx <= spot.halfExtents.x &&
        dy <= spot.halfExtents.y &&
        dz <= spot.halfExtents.z;

      spot.isKokoInside = inside;
      (spot.indicatorMesh.material as THREE.MeshBasicMaterial).opacity = inside ? 0.56 : 0.2;
      if (inside) this.activeHidingSpot = spot;
    }

    // 4. Sequential 3-Target Sabotage
    this.nearbyProp = null;
    for (let i = 0; i < this.room.interactiveProps.length; i++) {
      const p = this.room.interactiveProps[i];
      const isCurrentTarget = i === this.currentObjectiveIndex && !p.isRuined && !this.isFinaleActive;
      p.beaconMesh.visible = isCurrentTarget;
      if (isCurrentTarget) {
        p.beaconMesh.scale.setScalar(1 + Math.sin(time * 5) * 0.16);
      }
      if (isCurrentTarget && this.koko.position.distanceTo(p.position) <= p.interactionRadius) {
        this.nearbyProp = p;
      }
    }

    if (this.nearbyProp && !this.nearbyProp.isRuined) {
      if (input.actionHeld) {
        this.nearbyProp.currentProgress += dt * this.sabotageSpeedMult;
        this.lastActionTime = time;
        this.actionTickSoundCooldown -= dt;
        if (this.actionTickSoundCooldown <= 0) {
          this.actionTickSoundCooldown = 0.16;
          this.vfx.spawnTickParticle(this.nearbyProp.position, 0x59e0ba);
          this.sound.playSabotageProgress(
            this.nearbyProp.currentProgress / Math.max(0.01, this.nearbyProp.requiredHoldDuration)
          );
        }
        if (this.nearbyProp.currentProgress >= this.nearbyProp.requiredHoldDuration) {
          this.completeBab2Target(this.nearbyProp);
        }
      } else if (this.nearbyProp.currentProgress > 0) {
        this.nearbyProp.currentProgress = Math.max(0, this.nearbyProp.currentProgress - dt * 0.75);
      }
    }

    // 5. Momentum Gauge Decay
    if (this.gaugeActive && !this.isFinaleActive) {
      if (time - this.lastActionTime > 8.0 && this.gauge > 0) {
        this.gauge = Math.max(0, this.gauge - 1.0 * dt);
      }
    }

    // 6. Gamer Boss AI & Camera
    const isCrawlingMoving =
      this.koko.state === 'Crawling' && this.koko.velocity.lengthSq() > 0.25;
    const isFlying = this.koko.state === 'Flying' || this.koko.state === 'Gliding';

    this.gamer.update(
      dt,
      time,
      this.koko.position,
      camFwd,
      isCrawlingMoving,
      isFlying,
      this.koko.effectiveInvincible,
      this.activeHidingSpot
    );

    this.vfx.updateSwatterSparks(dt, this.gamer.isTelegraphingSwat, this.gamer.windupProgress);
    this.vfx.updateKokoStealthRim(
      this.koko.rig.getCarapaceMaterials(),
      true,
      this.activeHidingSpot?.safety === 'Safe',
      this.isKokoOnDesk(),
      this.room.rgbLighting.mood,
      this.room.rgbLighting.currentPrimaryHex
    );

    const combatFov =
      this.gamer.state === 'SWAT_ATTACK' || this.gamer.state === 'PANIC_DEFEATED';
    this.cam.update(
      dt,
      this.koko.position,
      this.koko.quaternion,
      this.koko.surfaceNormal,
      combatFov
    );

    // 7. Finale Timer
    if (this.isFinaleActive) {
      this.finaleTimer += dt;
      if (this.finaleTimer >= this.finaleDuration) {
        this.isFinaleActive = false;
        this.isStageCleared = true;
        this.sound.stopAllLoops();
        this.sound.playStageClear();

        const clearReward = 1000;
        this.progression.recordStageClear('bab2', this.totalStars, this.gauge, clearReward);
        this.callbacks.onStageClear(
          'bab2',
          this.totalStars,
          this.gauge,
          clearReward + this.runBonusDna,
          this.progression.save.dna
        );
      }
    }
  }

  private isKokoOnDesk(): boolean {
    return (
      this.koko.position.x >= this.room.deskZoneMin.x &&
      this.koko.position.x <= this.room.deskZoneMax.x &&
      this.koko.position.y >= this.room.deskZoneMin.y &&
      this.koko.position.z >= this.room.deskZoneMin.z
    );
  }

  private completeBab2Target(prop: InteractiveProp): void {
    prop.currentProgress = prop.requiredHoldDuration;
    prop.isRuined = true;
    prop.isDiscovered = true;
    prop.ruinedVisual.visible = true;
    for (const obj of prop.pristineObjects) obj.visible = false;

    const idx = prop.type;
    this.stars[idx] = true;
    const floor = [35, 68, 95][idx];
    this.gauge = Math.min(100, Math.max(this.gauge + 35, floor));
    this.gaugeActive = true;
    this.lastActionTime = performance.now() * 0.001;

    // High-Risk Bonus if Si Gamer is close
    if (this.koko.position.distanceTo(this.gamer.rig.root.position) <= 2.9 * S) {
      this.gauge = Math.min(100, this.gauge + 15);
      this.progression.addDna(30);
      this.runBonusDna += 30;
      this.sound.playHighRiskBonus();
    }

    this.sound.playSabotageComplete();
    triggerMicroHaptic(18);
    if (idx === 0) {
      // Target 01: Kontaminasi Minuman
      this.vfx.spawnSabotageBurst(prop.position, 'soda_fizz');
      this.cam.triggerShake(0.2, 0.25);
      this.gamer.triggerDrinkChoke(this.koko.position);
      this.currentObjectiveIndex = 1;
      this.callbacks.onToast('★ BINTANG 1! Minuman Energi Terkontaminasi!');
      this.callbacks.onStoryMessage(
        'SI GAMER / "UHUKK!! Rasa minumannya aneh banget?!"\nHeadset terbuka sebelah! Menyelinap ke belakang casing PC!',
        8
      );
    } else if (idx === 1) {
      // Target 02: Sabotase Koneksi LAN
      this.vfx.spawnSabotageBurst(prop.position, 'lan_sparks');
      this.room.setMonitorConnectionLost(true);
      this.cam.triggerShake(0.42, 0.45);

      // Desk slam drops Koko if crawling on top/sides of the desk
      if (this.isKokoOnDesk()) {
        this.koko.forceDropFromSurface(-5.0);
      }

      this.gamer.triggerLanCutLag(this.koko.position);
      this.currentObjectiveIndex = 2;
      this.callbacks.onToast('★ BINTANG 2! Koneksi LAN Putus (PING 999ms)!');
      this.callbacks.onStoryMessage(
        'SI GAMER / "WOOY PING 999ms!! Siapa yang cabut kabel?!"\nDia menyalakan senter HP! Panjat poster ke rak dinding, lalu meluncur lewat kipas angin ke atas monitor!',
        10
      );
    } else {
      // Target 03: Teror di Layar Monitor -> Finale Bab 02
      this.vfx.spawnSabotageBurst(prop.position, 'screen_dust');
      this.isFinaleActive = true;
      this.finaleTimer = 0;
      this.koko.stageInvincible = true;
      this.cam.triggerShake(0.45, 2.5);
      this.gamer.triggerPanicDefeat(this.koko.position);
      this.callbacks.onToast('★ BINTANG 3! Teror Sempurna di Layar!');
      this.callbacks.onStoryMessage(
        'KOKO / "Misi Bab 02 sukses! Kursi gaming sampai terjungkal!"',
        6
      );
    }
  }

  public getHudSnapshot(): HudSnapshot {
    const target = this.getCurrentObjectiveProp();
    const done = [0, 1, 2].filter((i) => this.stars[i]).length;

    const titles = [
      '01 / KONTAMINASI MINUMAN',
      '02 / SABOTASE KONEKSI LAN',
      '03 / TEROR DI LAYAR MONITOR',
    ];
    const shortNames = ['Minuman', 'Kabel LAN', 'Monitor'];
    const hints = [
      'Merayap ke ujung kiri meja. Tahan AKSI (E/F) di kaleng minuman energi.',
      'Menyelinap ke belakang casing PC kanan. Tahan AKSI (E/F) cabut kabel LAN.',
      'Panjat poster ke rak dinding kiri, manfaatkan angin kipas menuju atas monitor!',
    ];

    let objectiveTitle = 'KAMAR SI GAMER SELESAI';
    let shortObjectiveTitle = 'Selesai (3/3)';
    let objectiveHint = 'Si Gamer kabur ketakutan keluar kamar!';
    if (this.isFinaleActive) {
      objectiveTitle = 'FINALE / GAMER PANIK TOTAL';
      shortObjectiveTitle = 'FINALE · Sukses!';
    } else if (target) {
      objectiveTitle = `${titles[target.type]}   ${done}/3`;
      shortObjectiveTitle = `0${target.type + 1} · ${shortNames[target.type]} (${done}/3)`;
      objectiveHint = hints[target.type];
    }

    let threatStatus = 'HEADSET ON · FOKUS RANKED';
    let shortThreatBadge = 'GAMER: FOKUS';
    let threatColor = '#59e0ba';
    switch (this.gamer.state) {
      case 'PANIC_DEFEATED':
        threatStatus = 'SI GAMER KABUR / KOKO MENANG';
        shortThreatBadge = 'GAMER: KABUR';
        break;
      case 'RELAXED':
        threatStatus = 'RELAXED · SATU HEADSET TERBUKA';
        shortThreatBadge = 'GAMER: WASPADA';
        threatColor = '#ffbf52';
        break;
      case 'HEADSET_OFF':
        threatStatus = 'HEADSET OFF · SENTER HP AKTIF!';
        shortThreatBadge = 'GAMER: SENTER!';
        threatColor = '#ff9844';
        break;
      case 'SWAT_ATTACK':
        threatStatus = this.gamer.isTelegraphingSwat
          ? '⚡ RAKET NYAMUK! TEKAN [Q] ELAK!'
          : 'BAHAYA / MENGHINDAR!';
        shortThreatBadge = this.gamer.isTelegraphingSwat ? 'GAMER: AWAS!' : 'GAMER: BAHAYA!';
        threatColor = '#ff4433';
        break;
    }

    const badge: '!' | '?' | null =
      this.gamer.state === 'SWAT_ATTACK' || this.gamer.state === 'PANIC_DEFEATED'
        ? '!'
        : this.gamer.state === 'HEADSET_OFF' || this.gamer.detection > 25
          ? '?'
          : null;

    const moodLabel =
      this.room.rgbLighting.mood === 'flashbang'
        ? ' · ⚡ FLASHBANG!'
        : this.room.rgbLighting.mood === 'chill'
          ? ' · RGB CHILL'
          : ' · RGB REAKTIF';

    return {
      stageId: 'bab2',
      chapterLabel: 'KECOAKAZE / BAB 02',
      objectiveTitle,
      shortObjectiveTitle,
      objectiveHint,
      targetPosition: target && !target.isRuined ? target.position : null,
      targetMarkerText: target ? `0${target.type + 1}\n${target.targetName}` : '',
      targetIndexLabel: target ? `0${target.type + 1}` : '',
      activeHidingSpot: this.activeHidingSpot,
      gauge: this.gauge,
      stars: this.stars,
      threatStatus,
      shortThreatBadge,
      threatColor,
      detection: this.gamer.detection,
      isWindingUp: this.gamer.isTelegraphingSwat,
      windupProgress: this.gamer.windupProgress,
      windupWarningText: '⚡ RAKET NYAMUK ELEKTRIK! TEKAN [Q] ELAK',
      bossWorldPos: this.gamer.rig.root.position,
      bossHeadHeight: 2.38 * this.gamer.rig.worldScale,
      bossDialogue: this.gamer.activeDialogue,
      bossBadge: badge,
      nearbyProp: this.nearbyProp,
      extraStatusTag: moodLabel,
      isFinaleActive: this.isFinaleActive,
      isStageCleared: this.isStageCleared,
    };
  }

  public get isFlashbangGlare(): boolean {
    return this.room.rgbLighting.flashbangActive;
  }
}
