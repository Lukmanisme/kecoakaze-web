import * as THREE from 'three';
import { HidingSpot, InteractiveProp, WORLD_SCALE as S } from '../types';
import { KitchenLevelData } from '../world/kitchenLevel';
import { KokoController } from '../physics/kokoPhysics';
import { IbuBossController } from '../ai/ibuBoss';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { SoundEngine } from '../audio/soundEngine';
import { ProgressionManager } from './progression';
import { ParticleFXManager } from '../effects/particleFx';

export interface StageCallbacks {
  onStoryMessage: (text: string, duration: number) => void;
  onToast: (text: string) => void;
  onStarUnlocked: (starIdx: number) => void;
  onStageClear: (
    stars: number,
    finalMomentum: number,
    dnaReward: number,
    totalDna: number
  ) => void;
  onKokoCaught: (reason: string) => void;
}

export class KitchenStageManager {
  public gauge = 0; // 0..100
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
    private readonly level: KitchenLevelData,
    private readonly koko: KokoController,
    private readonly ibu: IbuBossController,
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: SoundEngine,
    public readonly progression: ProgressionManager,
    private readonly particles: ParticleFXManager,
    private readonly callbacks: StageCallbacks
  ) {
    this.applyUpgrades();
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

    this.particles.clear();
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
      this.callbacks.onStarUnlocked(idx);
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
    this.sound.setCrawlActive(false);
    this.sound.setFlightBuzz(false, 0);
    this.sound.playIbuAnger();
    this.isPaused = true;
    this.callbacks.onKokoCaught(reason);
  }

  public update(dt: number, time: number, actionHeld: boolean): void {
    this.particles.update(dt);

    if (this.isPaused || !this.isStarted || this.isStageCleared) return;

    // 1. Update Hiding Spots
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
      const mat = spot.indicatorMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = inside ? 0.52 : 0.18;
      if (inside) this.activeHidingSpot = spot;
    }

    // 2. Update Interactive Props & Beacon Pulse
    this.nearbyProp = null;
    const objectiveProp = this.getCurrentObjectiveProp();
    for (const p of this.level.interactiveProps) {
      const isCurrentTarget = objectiveProp === p && !p.isRuined;
      p.beaconMesh.visible = isCurrentTarget;
      if (isCurrentTarget) {
        const pulse = 1 + Math.sin(time * 5) * 0.16;
        p.beaconMesh.scale.setScalar(pulse);
      }

      if (!p.isRuined && this.koko.position.distanceTo(p.position) <= p.interactionRadius) {
        if (!this.nearbyProp || p === objectiveProp) {
          this.nearbyProp = p;
        }
      }
    }

    if (this.nearbyProp && !this.nearbyProp.isRuined) {
      if (actionHeld) {
        this.nearbyProp.currentProgress += dt * this.sabotageSpeedMult;
        this.lastActionTime = time;
        this.actionTickSoundCooldown -= dt;
        if (this.actionTickSoundCooldown <= 0) {
          this.actionTickSoundCooldown = 0.18;
          this.sound.playActionTick();
        }
        if (this.nearbyProp.currentProgress >= this.nearbyProp.requiredHoldDuration) {
          this.completeSabotage(this.nearbyProp);
        }
      } else if (this.nearbyProp.currentProgress > 0) {
        this.nearbyProp.currentProgress = Math.max(0, this.nearbyProp.currentProgress - dt * 0.75);
      }
    }

    // 3. Momentum Gauge Decay (1%/sec after 8s idle)
    if (this.gaugeActive && !this.isFinaleActive) {
      if (time - this.lastActionTime > 8.0 && this.gauge > 0) {
        this.gauge = Math.max(0, this.gauge - 1.0 * dt);
      }
    }

    // 4. Finale Rampage Timer
    if (this.isFinaleActive) {
      this.finaleTimer += dt;
      if (this.finaleTimer >= this.finaleDuration) {
        this.isFinaleActive = false;
        this.isStageCleared = true;
        this.ibu.setBossState(
          'PanicDefeated',
          'AMPUNNN DAPUR GUE HANCURR TOTAL!! SANA KELUARR KECOAKKK!!'
        );
        this.sound.setCrawlActive(false);
        this.sound.setFlightBuzz(false, 0);
        this.sound.playStageClear();

        const clearBaseDna = 500;
        this.progression.recordStageClear(this.totalStars, this.gauge, clearBaseDna);
        this.callbacks.onStageClear(
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

    // Game Juice: particle burst + micro screen shake
    this.particles.spawnSabotageBurst(prop.type, prop.position);
    this.cam.triggerShake(0.18, 0.25);
    this.sound.playPrankComplete();

    // High-Risk High-Reward Momentum Bonus when Ibu is nearby
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
}
