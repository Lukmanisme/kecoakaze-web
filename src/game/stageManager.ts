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
import { KitchenLevelData } from '../world/kitchenLevel';
import { KokoController } from '../physics/kokoPhysics';
import { IbuBossController } from '../ai/ibuBoss';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { ProgressionManager } from './progression';
import { SabotageVfxPreset, VFXManager } from '../vfx/VFXManager';
import { triggerMicroHaptic } from '../input/MobileTouchController';

export interface StageCallbacks {
  onStoryMessage: (text: string, duration: number) => void;
  onToast: (text: string) => void;
  onStageClear: (
    stageId: StageId,
    stars: number,
    finalMomentum: number,
    dnaReward: number,
    totalDna: number
  ) => void;
  onKokoCaught: (reason: string) => void;
}

export class KitchenStageManager implements StageController {
  public readonly stageId: StageId = 'bab1';
  public gauge = 0;
  public gaugeActive = false;
  public stars: [boolean, boolean, boolean] = [false, false, false];
  public isFinaleActive = false;
  public isStageCleared = false;
  public isPaused = false;
  public isStarted = false;

  public activeHidingSpot: HidingSpot | null = null;
  public nearbyProp: InteractiveProp | null = null;

  private sabotageSpeedMult = 1;
  private runBonusDna = 0;
  private lastActionTime = 0;
  private finaleTimer = 0;
  private readonly finaleDuration = 3.5;
  private readonly starThresholds = [30, 60, 90];
  private actionTickSoundCooldown = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly level: KitchenLevelData,
    private readonly koko: KokoController,
    private readonly ibu: IbuBossController,
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: ProceduralAudioEngine,
    public readonly progression: ProgressionManager,
    private readonly vfx: VFXManager,
    private readonly callbacks: StageCallbacks
  ) {
    this.applyUpgrades();
  }

  public setActive(active: boolean): void {
    this.level.root.visible = active;
    this.ibu.rig.root.visible = active;
    if (active) {
      this.scene.background = new THREE.Color(0x282520);
      this.scene.fog = new THREE.Fog(0x282520, 48, 110);
      this.koko.configureLevel({
        walkables: this.level.walkables,
        soapyZone: this.level.soapyZone,
        updraftZone: this.level.updraftZone,
      });
      this.cam.configureLevel(this.level.obstacles);
      this.sound.setStoveAmbience(true);
      this.vfx.updateKokoStealthRim(this.koko.rig.getCarapaceMaterials(), false, false, false, 'chill', 0);
    } else {
      this.vfx.reset();
      this.sound.stopAllLoops();
    }
  }

  public applyUpgrades(): void {
    const stats = this.progression.getComputedStats();
    this.sabotageSpeedMult = stats.sabotageSpeedMult;
    this.koko.applyStats(stats);
    this.ibu.applyStats(stats);
  }

  public resetStage(): void {
    this.applyUpgrades();
    this.gauge = 0;
    this.gaugeActive = false;
    this.stars = [false, false, false];
    this.isFinaleActive = false;
    this.isStageCleared = false;
    this.finaleTimer = 0;
    this.runBonusDna = 0;
    this.activeHidingSpot = null;
    this.nearbyProp = null;

    this.vfx.reset();
    this.koko.spawnAt(this.level.kokoSpawn);
    this.ibu.reset();
    this.cam.reset(this.level.kokoSpawn);

    for (const p of this.level.interactiveProps) {
      p.isRuined = false;
      p.isDiscovered = false;
      p.currentProgress = 0;
      p.ruinedVisual.visible = false;
      for (const obj of p.pristineObjects) obj.visible = true;
    }

    for (const h of this.level.hidingSpots) {
      h.isKokoInside = false;
    }

    this.callbacks.onStoryMessage(
      'BAB 01 / DAPUR HURU-HARA\nKoko lapar. Ibu hendak bersih-bersih. Cari makan, buat pengalihan, dan bertahan hidup!',
      11
    );
  }

  public get totalStars(): number {
    return (this.stars[0] ? 1 : 0) + (this.stars[1] ? 1 : 0) + (this.stars[2] ? 1 : 0);
  }

  public getCurrentObjectiveProp(): InteractiveProp | null {
    for (const p of this.level.interactiveProps) {
      if (!p.isDiscovered) return p;
    }
    return null;
  }

  public handlePropDiscovered(prop: InteractiveProp): void {
    this.lastActionTime = performance.now() * 0.001;
    const idx = prop.type;

    if (!this.stars[idx]) {
      this.stars[idx] = true;
      const floor = this.starThresholds[idx] + 5;
      this.gauge = Math.min(100, Math.max(this.gauge + 35, floor));
      this.gaugeActive = true;
      this.progression.addDna(50);
      this.runBonusDna += 50;
      this.sound.playStarUnlock();
      this.callbacks.onToast(`★ BINTANG ${idx + 1} TERBUKA! (+50 DNA)`);
    }

    const reactions = [
      'IBU / "Wortelnya kok tinggal segini? Ini bekas gigitan siapa?!"',
      'IBU / "Sup buat makan malam! Koko, kamu bikin Ibu masak ulang!"',
      'KOKO / "Satu dapur heboh. Saatnya kepakkan sayap dan kabur!"',
    ];
    this.callbacks.onStoryMessage(reactions[idx], 7);

    if (idx === 2 && !this.isFinaleActive && !this.isStageCleared) {
      this.triggerFinale();
    }
  }

  private triggerFinale(): void {
    this.isFinaleActive = true;
    this.finaleTimer = 0;
    this.koko.stageInvincible = true;
    this.ibu.setBossState(
      'Mengamuk',
      'MEJA MAKAN GUE DIACAK-ACAKKK!! MATI LU SEMUA KECOAKKK!!'
    );
    this.cam.triggerShake(0.45, 2.8);
    this.callbacks.onStoryMessage(
      'KOKO / "Aku cuma cari makan... kok satu dapur jadi heboh?"',
      6
    );
  }

  public handleKokoHit(reason: string): void {
    if (this.isFinaleActive || this.isStageCleared || this.koko.effectiveInvincible) return;
    this.sound.stopAllLoops();
    this.sound.playVocalReaction('ibu', 'angry');
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
    this.animateUpdraftParticles(dt);

    if (this.isPaused || !this.isStarted || this.isStageCleared) {
      this.sound.stopAllLoops();
      if (!this.isStarted) {
        this.koko.rig.updateAnimation(dt, time, this.koko.state, 0);
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
    this.sound.setStoveAmbience(true);

    this.koko.update(dt, time, input, camFwd, camUp);

    // 1. Hiding Spots
    this.activeHidingSpot = null;
    for (const spot of this.level.hidingSpots) {
      const dx = Math.abs(this.koko.position.x - spot.position.x);
      const dy = Math.abs(this.koko.position.y - spot.position.y);
      const dz = Math.abs(this.koko.position.z - spot.position.z);
      const inside =
        dx <= spot.halfExtents.x &&
        dy <= spot.halfExtents.y &&
        dz <= spot.halfExtents.z;

      spot.isKokoInside = inside;
      (spot.indicatorMesh.material as THREE.MeshBasicMaterial).opacity = inside ? 0.52 : 0.18;
      if (inside) this.activeHidingSpot = spot;
    }

    // 2. Interactive Props
    this.nearbyProp = null;
    const objectiveProp = this.getCurrentObjectiveProp();
    for (const p of this.level.interactiveProps) {
      const isCurrentTarget = objectiveProp === p && !p.isRuined;
      p.beaconMesh.visible = isCurrentTarget;
      if (isCurrentTarget) {
        p.beaconMesh.scale.setScalar(1 + Math.sin(time * 5) * 0.16);
      }
      if (!p.isRuined && this.koko.position.distanceTo(p.position) <= p.interactionRadius) {
        if (!this.nearbyProp || p === objectiveProp) {
          this.nearbyProp = p;
        }
      }
    }

    if (this.nearbyProp && !this.nearbyProp.isRuined) {
      if (input.actionHeld) {
        this.nearbyProp.currentProgress += dt * this.sabotageSpeedMult;
        this.lastActionTime = time;
        this.actionTickSoundCooldown -= dt;
        if (this.actionTickSoundCooldown <= 0) {
          this.actionTickSoundCooldown = 0.16;
          this.vfx.spawnTickParticle(this.nearbyProp.position);
          this.sound.playSabotageProgress(
            this.nearbyProp.currentProgress / Math.max(0.01, this.nearbyProp.requiredHoldDuration)
          );
        }
        if (this.nearbyProp.currentProgress >= this.nearbyProp.requiredHoldDuration) {
          this.completeSabotage(this.nearbyProp);
        }
      } else if (this.nearbyProp.currentProgress > 0) {
        this.nearbyProp.currentProgress = Math.max(0, this.nearbyProp.currentProgress - dt * 0.75);
      }
    }

    // 3. Momentum Gauge Decay
    if (this.gaugeActive && !this.isFinaleActive) {
      if (time - this.lastActionTime > 8.0 && this.gauge > 0) {
        this.gauge = Math.max(0, this.gauge - 1.0 * dt);
      }
    }

    // 4. Ibu AI & Camera
    this.ibu.update(
      dt,
      time,
      this.koko.position,
      camFwd,
      this.koko.state === 'Flying' || this.koko.state === 'Gliding',
      this.koko.effectiveInvincible,
      this.activeHidingSpot
    );

    const combatFov =
      this.ibu.bossState === 'AngerCombat' ||
      this.ibu.bossState === 'WindupAttack' ||
      this.ibu.bossState === 'Mengamuk';
    this.cam.update(
      dt,
      this.koko.position,
      this.koko.quaternion,
      this.koko.surfaceNormal,
      combatFov
    );

    // 5. Finale Rampage Timer
    if (this.isFinaleActive) {
      this.finaleTimer += dt;
      if (this.finaleTimer >= this.finaleDuration) {
        this.isFinaleActive = false;
        this.isStageCleared = true;
        this.ibu.setBossState(
          'PanicDefeated',
          'AMPUNNN DAPUR GUE HANCURR TOTAL!! SANA KELUARR KECOAKKK!!'
        );
        this.sound.stopAllLoops();
        this.sound.playStageClear();

        const clearBaseDna = 500;
        this.progression.recordStageClear('bab1', this.totalStars, this.gauge, clearBaseDna);
        this.callbacks.onStageClear(
          'bab1',
          this.totalStars,
          this.gauge,
          clearBaseDna + this.runBonusDna,
          this.progression.save.dna
        );
      }
    }
  }

  private completeSabotage(prop: InteractiveProp): void {
    prop.currentProgress = prop.requiredHoldDuration;
    prop.isRuined = true;
    prop.ruinedVisual.visible = true;
    for (const obj of prop.pristineObjects) obj.visible = false;

    const preset: SabotageVfxPreset =
      prop.type === 0 ? 'veggies' : prop.type === 1 ? 'soup_steam' : 'crumbs';
    this.vfx.spawnSabotageBurst(prop.position, preset);
    this.cam.triggerShake(0.18, 0.25);
    this.sound.playSabotageComplete();
    triggerMicroHaptic(18);

    const distToIbu = this.koko.position.distanceTo(this.ibu.rig.root.position);
    if (distToIbu <= 2.9 * S) {
      this.gauge = Math.min(100, this.gauge + 18);
      this.gaugeActive = true;
      this.progression.addDna(25);
      this.runBonusDna += 25;
      this.sound.playHighRiskBonus();
      this.callbacks.onToast('⚡ AKSI NEKAT! +18% MOMENTUM & +25 DNA');
    }

    this.callbacks.onStoryMessage(
      'KOKO / "Misi kecil selesai. Jangan ketahuan dulu!"\nMenjauh; bintang terbuka saat Ibu menemukan keisengan.',
      6
    );
  }

  private animateUpdraftParticles(dt: number): void {
    const attr = this.level.updraftParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const origin = this.level.updraftParticles.geometry.userData.origin as THREE.Vector3;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) + dt * 5.2;
      if (y > origin.y + 8.0) y = origin.y;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  }

  public getHudSnapshot(): HudSnapshot {
    const target = this.getCurrentObjectiveProp();
    const discoveredCount = [0, 1, 2].filter((i) => this.stars[i]).length;
    const titles = ['01 / CURI CEMILAN', '02 / SABOTASE SUP', '03 / PESTA DI MEJA'];
    const hints = [
      'Dekati bahan sayur di Meja Dapur. Tahan AKSI (E/F) untuk makan.',
      'Tunggu Ibu menjauh dari kompor. Dekati wajan/panci, tahan AKSI (E/F).',
      'Manfaatkan celah rutinitas. Dekati hidangan di Meja Makan, tahan AKSI (E/F).',
    ];

    let objectiveTitle = 'DAPUR BERHASIL DILEWATI';
    let objectiveHint = 'Koko selamat. Ibu butuh waktu menenangkan diri!';
    if (!this.isStageCleared && !this.isFinaleActive && target) {
      objectiveTitle = `${titles[target.type]}   ${discoveredCount}/3`;
      objectiveHint = target.isRuined
        ? 'Keisengan siap! Menjauh & tunggu Ibu menemukannya.'
        : hints[target.type];
    } else if (this.isFinaleActive) {
      objectiveTitle = 'FINALE / DAPUR HURU-HARA';
    }

    let threatStatus = 'IBU SIBUK / JAGA JARAK';
    let threatColor = '#59e0ba';
    switch (this.ibu.bossState) {
      case 'PanicDefeated':
        threatStatus = 'IBU MENYERAH / KOKO SELAMAT';
        break;
      case 'Mengamuk':
        threatStatus = 'FINALE / DAPUR HURU-HARA';
        threatColor = '#ffbf52';
        break;
      case 'MencariKoko':
      case 'MemeriksaSembunyi':
        threatStatus = 'IBU MENCARI / TETAP SEMBUNYI';
        threatColor = '#ffbf52';
        break;
      case 'WindupAttack':
        threatStatus = '⚠ ANCAMAN! SIAP ELAK [Q]!';
        threatColor = '#ff4433';
        break;
      case 'AngerCombat':
      case 'ShockedFreeze':
      case 'CariSapu':
        threatStatus = 'BAHAYA / PUTUS GARIS PANDANG!';
        threatColor = '#ff6e5c';
        break;
      case 'SuspiciousAlert':
      case 'Marah':
        threatStatus = 'IBU WASPADA / CARI CELAH';
        threatColor = '#ffbf52';
        break;
    }

    const badge: '!' | '?' | null =
      this.ibu.bossState === 'AngerCombat' ||
      this.ibu.bossState === 'WindupAttack' ||
      this.ibu.bossState === 'ShockedFreeze' ||
      this.ibu.bossState === 'Mengamuk'
        ? '!'
        : this.ibu.bossState === 'SuspiciousAlert' ||
            this.ibu.bossState === 'MencariKoko' ||
            this.ibu.bossState === 'MemeriksaSembunyi'
          ? '?'
          : null;

    let extraStatusTag = '';
    if (this.koko.isOnSoapyFloor) extraStatusTag = ' · LICIN!';
    if (this.koko.isInUpdraft) extraStatusTag = ' · UPDRAFT!';

    return {
      stageId: 'bab1',
      chapterLabel: 'KECOAKAZE / BAB 01',
      objectiveTitle,
      objectiveHint,
      targetPosition: target && !target.isRuined && !this.isFinaleActive && !this.isStageCleared ? target.position : null,
      targetMarkerText: target ? `0${target.type + 1}\n${target.targetName}` : '',
      activeHidingSpot: this.activeHidingSpot,
      gauge: this.gauge,
      stars: this.stars,
      threatStatus,
      threatColor,
      detection: this.ibu.detection,
      isWindingUp: this.ibu.isWindingUp,
      windupProgress: this.ibu.windupProgress,
      windupWarningText: '⚠ BAHAYA SAPU/SANDAL! TEKAN [Q] ELAK',
      bossWorldPos: this.ibu.rig.root.position,
      bossHeadHeight: 2.38 * this.ibu.rig.worldScale,
      bossDialogue: this.ibu.activeDialogue,
      bossBadge: badge,
      nearbyProp: this.nearbyProp,
      extraStatusTag,
      isFinaleActive: this.isFinaleActive,
      isStageCleared: this.isStageCleared,
    };
  }
}
