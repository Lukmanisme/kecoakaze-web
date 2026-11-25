import * as THREE from 'three';
import { HudSnapshot, InputState, StageController, StageId } from '../types';
import { KokoController } from '../physics/kokoPhysics';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { MAX_UPGRADE_LEVEL, ProgressionManager, UPGRADE_DEFS } from '../game/progression';
import { QualityManager, QualityMode } from '../graphics/QualityManager';
import { MobileTouchController } from '../input/MobileTouchController';
import { SettingsManager } from '../game/SettingsManager';
import { MicroTutorial } from './MicroTutorial';

export interface StageBridge {
  getActiveStage: () => StageController;
  getSelectedStageId: () => StageId;
  selectAndLoadStage: (id: StageId, startImmediately: boolean) => void;
  progression: ProgressionManager;
  quality: QualityManager;
  settings: SettingsManager;
  isFlashbangGlare: () => boolean;
}

export class HUDController {
  private readonly keys = new Set<string>();
  private keyFlyJustPressed = false;
  private keyDodgeJustPressed = false;

  private touchMode = false;
  private isPointerLocked = false;
  private suppressAutoPauseOnUnlock = false;

  private storyUntil = 0;
  private storyShownAt = 0;
  private toastUntil = 0;
  private labReturnTarget: 'start' | 'result' = 'start';
  private settingsReturnTarget: 'start' | 'pause' = 'start';
  private resetConfirmUntil = 0;

  private bridge: StageBridge | null = null;
  private readonly touchCtrl: MobileTouchController;
  private readonly tutorial: MicroTutorial;

  // DOM refs
  private readonly worldOverlays = document.getElementById('world-overlays')!;
  private readonly hudLayer = document.getElementById('hud-layer')!;
  private readonly objectiveChapter = document.getElementById('objective-chapter')!;
  private readonly objectiveTitle = document.getElementById('objective-title')!;
  private readonly objectiveHint = document.getElementById('objective-hint')!;
  private readonly hidingBadge = document.getElementById('hiding-badge')!;
  private readonly momentumPct = document.getElementById('momentum-pct')!;
  private readonly momentumFill = document.getElementById('momentum-fill')!;
  private readonly starEls = [
    document.getElementById('star-1')!,
    document.getElementById('star-2')!,
    document.getElementById('star-3')!,
  ];
  private readonly threatStatus = document.getElementById('threat-status')!;
  private readonly threatDot = document.getElementById('threat-dot')!;
  private readonly detectionFill = document.getElementById('detection-fill')!;
  private readonly surfaceStatus = document.getElementById('surface-status')!;
  private readonly staminaFill = document.getElementById('stamina-fill')!;
  private readonly dnaHudBadge = document.getElementById('dna-hud-badge')!;
  private readonly storyCard = document.getElementById('story-card')!;
  private readonly storyText = document.getElementById('story-text')!;
  private readonly toastBanner = document.getElementById('toast-banner')!;
  private readonly targetMarker = document.getElementById('target-marker')!;
  private readonly targetChevron = document.getElementById('target-chevron')!;
  private readonly targetLabel = document.getElementById('target-label')!;
  private readonly ibuBubble = document.getElementById('ibu-bubble')!;
  private readonly ibuAlertBadge = document.getElementById('ibu-alert-badge')!;
  private readonly ibuDialogue = document.getElementById('ibu-dialogue')!;

  private readonly flashbangGlare = document.getElementById('flashbang-glare-overlay')!;
  private readonly dangerVignette = document.getElementById('danger-vignette')!;
  private readonly threatIndicator = document.getElementById('threat-direction-indicator')!;
  private readonly threatArrow = document.getElementById('threat-arrow')!;
  private readonly threatWarningText = document.getElementById('threat-warning-text')!;
  private readonly threatWindupFill = document.getElementById('threat-windup-fill')!;

  private readonly pointerLockHint = document.getElementById('pointer-lock-hint')!;
  private readonly desktopHints = document.getElementById('desktop-hints')!;
  private readonly desktopActionPrompt = document.getElementById('desktop-action-prompt')!;
  private readonly desktopActionText = document.getElementById('desktop-action-text')!;
  private readonly desktopActionFill = document.getElementById('desktop-action-fill')!;

  private readonly btnMute = document.getElementById('btn-mute')!;
  private readonly btnTouchToggle = document.getElementById('btn-touch-toggle')!;
  private readonly btnPauseTouch = document.getElementById('btn-pause-touch')!;
  private readonly btnPause = document.getElementById('btn-pause')!;
  private readonly lookZone = document.getElementById('touch-look-zone')!;

  private readonly startOverlay = document.getElementById('start-overlay')!;
  private readonly startSaveSummary = document.getElementById('start-save-summary')!;
  private readonly startStageDesc = document.getElementById('start-stage-desc')!;
  private readonly startChecklist = document.getElementById('start-checklist')!;
  private readonly btnSelectBab1 = document.getElementById('btn-select-bab1')!;
  private readonly btnSelectBab2 = document.getElementById('btn-select-bab2')!;
  private readonly bab1StarsEl = document.getElementById('bab1-best-stars')!;
  private readonly bab1MomentumEl = document.getElementById('bab1-best-momentum')!;
  private readonly bab2StarsEl = document.getElementById('bab2-best-stars')!;
  private readonly bab2StatusTagEl = document.getElementById('bab2-status-tag')!;

  private readonly pauseOverlay = document.getElementById('pause-overlay')!;
  private readonly settingsOverlay = document.getElementById('settings-overlay')!;
  private readonly resultOverlay = document.getElementById('result-overlay')!;
  private readonly resultKicker = document.getElementById('result-kicker')!;
  private readonly resultTitle = document.getElementById('result-title')!;
  private readonly resultSubtitle = document.getElementById('result-subtitle')!;
  private readonly resultTotalDna = document.getElementById('result-total-dna')!;
  private readonly btnNextBab2 = document.getElementById('btn-next-bab2')!;

  private readonly labOverlay = document.getElementById('lab-overlay')!;
  private readonly labDnaBalance = document.getElementById('lab-dna-balance')!;
  private readonly labGrid = document.getElementById('lab-grid')!;
  private readonly caughtOverlay = document.getElementById('caught-overlay')!;
  private readonly caughtReason = document.getElementById('caught-reason')!;
  private readonly pauseQualityStatus = document.getElementById('pause-quality-status')!;
  private readonly qualityButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.quality-btn[data-qmode]')
  );

  // Settings modal DOM controls
  private readonly setSensInput = document.getElementById('set-sens') as HTMLInputElement;
  private readonly setSensVal = document.getElementById('set-sens-val')!;
  private readonly setInvertYBtn = document.getElementById('set-invert-y')!;
  private readonly setAutoFollowBtn = document.getElementById('set-autofollow')!;
  private readonly setVolInput = document.getElementById('set-vol') as HTMLInputElement;
  private readonly setVolVal = document.getElementById('set-vol-val')!;
  private readonly setMuteBtn = document.getElementById('set-mute')!;
  private readonly btnReplayTutorial = document.getElementById('btn-replay-tutorial')!;
  private readonly btnResetSave = document.getElementById('btn-reset-save')!;

  private readonly projVec = new THREE.Vector3();

  constructor(
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: ProceduralAudioEngine
  ) {
    this.tutorial = new MicroTutorial();
    this.touchCtrl = new MobileTouchController(
      cam,
      sound,
      () => {
        const st = this.bridge?.getActiveStage();
        return Boolean(st?.isStarted && !st.isPaused && !st.isStageCleared);
      },
      () => this.tryLockPointer(),
      () => this.setTouchMode(true)
    );

    this.touchMode = this.detectInitialTouch();
    this.applyTouchModeUI();
    this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
    this.bindKeyboardAndLock();
  }

  private detectInitialTouch(): boolean {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const hasTouch = navigator.maxTouchPoints > 0 && window.innerWidth <= 1024;
    return coarse || hasTouch;
  }

  private setTouchMode(enabled: boolean): void {
    this.touchMode = enabled;
    if (enabled && document.pointerLockElement) {
      this.releasePointerLockSafe();
    }
    this.applyTouchModeUI();
  }

  private applyTouchModeUI(): void {
    this.touchCtrl.setTouchMode(this.touchMode);
    this.hudLayer.classList.toggle('touch-active', this.touchMode);
    this.desktopHints.classList.toggle('hidden', this.touchMode);
    this.btnTouchToggle.classList.toggle('active', this.touchMode);
    this.btnPauseTouch.textContent = `📱 MODE TOUCH: ${this.touchMode ? 'ON' : 'OFF'}`;
  }

  private tryLockPointer(): void {
    if (this.touchMode || document.pointerLockElement) return;
    try {
      const maybePromise = this.lookZone.requestPointerLock() as unknown as Promise<void> | undefined;
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
    } catch {
      // Fallback drag mode stays active
    }
  }

  private releasePointerLockSafe(): void {
    if (!document.pointerLockElement) return;
    this.suppressAutoPauseOnUnlock = true;
    try {
      document.exitPointerLock();
    } catch {
      this.suppressAutoPauseOnUnlock = false;
    }
  }

  public bindStageBridge(bridge: StageBridge): void {
    this.bridge = bridge;
    this.refreshStartMenu();
    this.refreshSettingsUI();

    this.btnSelectBab1.addEventListener('click', () => {
      this.sound.unlock();
      bridge.selectAndLoadStage('bab1', false);
      this.cam.setMenuOrbit(true);
      this.refreshStartMenu();
    });

    this.btnSelectBab2.addEventListener('click', () => {
      this.sound.unlock();
      bridge.selectAndLoadStage('bab2', false);
      this.cam.setMenuOrbit(true);
      this.refreshStartMenu();
    });

    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.sound.unlock();
      this.startOverlay.classList.add('hidden');
      this.cam.setMenuOrbit(false);
      bridge.selectAndLoadStage(bridge.getSelectedStageId(), true);
      this.tutorial.startIfFirstTime(this.touchMode);
      this.tryLockPointer();
    });

    const togglePause = () => {
      const st = bridge.getActiveStage();
      if (!st.isStarted || st.isStageCleared) return;
      st.isPaused = !st.isPaused;
      this.pauseOverlay.classList.toggle('hidden', !st.isPaused);
      this.clearInputs();
      if (st.isPaused) {
        this.sound.stopAllLoops();
        this.releasePointerLockSafe();
        this.refreshQualityUI();
      } else {
        this.tryLockPointer();
      }
    };

    this.btnPause.addEventListener('click', togglePause);

    document.getElementById('btn-resume')!.addEventListener('click', () => {
      const st = bridge.getActiveStage();
      st.isPaused = false;
      this.pauseOverlay.classList.add('hidden');
      this.tryLockPointer();
    });

    const restartCurrent = () => {
      const st = bridge.getActiveStage();
      this.pauseOverlay.classList.add('hidden');
      this.settingsOverlay.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.caughtOverlay.classList.add('hidden');
      this.labOverlay.classList.add('hidden');
      this.cam.setMenuOrbit(false);
      st.isPaused = false;
      st.isStarted = true;
      st.resetStage();
      this.clearInputs();
      this.tryLockPointer();
    };

    const openMainMenu = () => {
      const st = bridge.getActiveStage();
      st.isPaused = false;
      st.isStarted = false;
      this.sound.stopAllLoops();
      this.tutorial.hide();
      this.pauseOverlay.classList.add('hidden');
      this.settingsOverlay.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.caughtOverlay.classList.add('hidden');
      this.labOverlay.classList.add('hidden');
      this.releasePointerLockSafe();
      this.clearInputs();
      bridge.selectAndLoadStage(bridge.getSelectedStageId(), false);
      this.cam.setMenuOrbit(true);
      this.refreshStartMenu();
      this.startOverlay.classList.remove('hidden');
    };

    document.getElementById('btn-pause-restart')!.addEventListener('click', restartCurrent);
    document.getElementById('btn-restart')!.addEventListener('click', restartCurrent);
    document.getElementById('btn-retry')!.addEventListener('click', restartCurrent);

    document.getElementById('btn-pause-menu')!.addEventListener('click', openMainMenu);
    document.getElementById('btn-result-menu')!.addEventListener('click', openMainMenu);
    document.getElementById('btn-caught-menu')!.addEventListener('click', openMainMenu);

    this.btnNextBab2.addEventListener('click', () => {
      this.sound.unlock();
      this.resultOverlay.classList.add('hidden');
      this.clearInputs();
      this.cam.setMenuOrbit(false);
      bridge.selectAndLoadStage('bab2', true);
      this.tryLockPointer();
    });

    // Lab Mutasi modal
    document.getElementById('btn-start-lab')!.addEventListener('click', () => {
      this.sound.unlock();
      this.openLab('start');
    });
    document.getElementById('btn-result-lab')!.addEventListener('click', () => {
      this.sound.unlock();
      this.openLab('result');
    });
    document.getElementById('btn-lab-close')!.addEventListener('click', () => {
      this.labOverlay.classList.add('hidden');
      if (this.labReturnTarget === 'start') {
        this.refreshStartMenu();
        this.startOverlay.classList.remove('hidden');
      } else {
        this.resultTotalDna.textContent = `TOTAL DNA TERSIMPAN: ${bridge.progression.save.dna}`;
        this.resultOverlay.classList.remove('hidden');
      }
    });

    // Settings modal navigation
    const openSettings = (from: 'start' | 'pause') => {
      this.settingsReturnTarget = from;
      this.resetConfirmUntil = 0;
      this.btnResetSave.classList.remove('confirming');
      this.btnResetSave.textContent = '🗑 Reset Data Game';
      this.startOverlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
      this.refreshSettingsUI();
      this.settingsOverlay.classList.remove('hidden');
    };

    document.getElementById('btn-start-settings')!.addEventListener('click', () => {
      this.sound.unlock();
      openSettings('start');
    });
    document.getElementById('btn-pause-settings')!.addEventListener('click', () => {
      this.sound.unlock();
      openSettings('pause');
    });
    document.getElementById('btn-settings-close')!.addEventListener('click', () => {
      this.settingsOverlay.classList.add('hidden');
      if (this.settingsReturnTarget === 'start') {
        this.refreshStartMenu();
        this.startOverlay.classList.remove('hidden');
      } else {
        this.refreshQualityUI();
        this.pauseOverlay.classList.remove('hidden');
      }
    });

    // Real-time settings controls
    this.setSensInput.addEventListener('input', () => {
      bridge.settings.setCameraSensitivity(parseFloat(this.setSensInput.value));
    });
    this.setInvertYBtn.addEventListener('click', () => {
      bridge.settings.setInvertY(!bridge.settings.settings.invertY);
    });
    this.setAutoFollowBtn.addEventListener('click', () => {
      bridge.settings.setMobileAutoFollow(!bridge.settings.settings.mobileAutoFollow);
    });
    this.setVolInput.addEventListener('input', () => {
      const vol = parseInt(this.setVolInput.value, 10) / 100;
      bridge.settings.setMasterVolume(vol);
      if (vol > 0 && bridge.settings.settings.isMuted) {
        bridge.settings.setMuted(false);
      }
    });
    this.setMuteBtn.addEventListener('click', () => {
      this.sound.unlock();
      bridge.settings.setMuted(!bridge.settings.settings.isMuted);
    });

    this.btnReplayTutorial.addEventListener('click', () => {
      this.tutorial.resetAndStart(this.touchMode);
      if (this.settingsReturnTarget === 'pause') {
        this.settingsOverlay.classList.add('hidden');
        const st = bridge.getActiveStage();
        st.isPaused = false;
        this.tryLockPointer();
      } else {
        this.showToast('🔄 Tutorial aktif saat misi dimulai!');
      }
    });

    this.btnResetSave.addEventListener('click', () => {
      const now = performance.now() * 0.001;
      if (now > this.resetConfirmUntil) {
        this.resetConfirmUntil = now + 3.5;
        this.btnResetSave.classList.add('confirming');
        this.btnResetSave.textContent = '⚠ Yakin Reset? (Klik Lagi)';
        return;
      }
      this.resetConfirmUntil = 0;
      this.btnResetSave.classList.remove('confirming');
      this.btnResetSave.textContent = '🗑 Reset Data Game';
      bridge.progression.resetAllData();
      bridge.settings.resetSettings();
      this.tutorial.resetAndStart(this.touchMode);
      if (!bridge.getActiveStage().isStarted) this.tutorial.hide();
      bridge.getActiveStage().applyUpgrades();
      this.refreshStartMenu();
      this.refreshSettingsUI();
      this.showToast('🗑 Seluruh data & DNA di-reset ke awal');
    });

    this.btnTouchToggle.addEventListener('click', () => {
      this.setTouchMode(!this.touchMode);
      this.showToast(this.touchMode ? '📱 Mode Touch Diaktifkan' : '🖱 Mode Desktop Aktif');
    });

    this.btnPauseTouch.addEventListener('click', () => {
      this.setTouchMode(!this.touchMode);
    });

    for (const btn of this.qualityButtons) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.qmode as QualityMode | undefined;
        if (!mode) return;
        bridge.settings.setGraphicsQuality(mode);
        this.refreshQualityUI();
        this.refreshSettingsUI();
        this.showToast(`⚙ Kualitas Grafis: ${bridge.quality.getStatusSummary()}`);
      });
    }
    this.refreshQualityUI();

    this.btnMute.addEventListener('click', () => {
      this.sound.unlock();
      bridge.settings.setMuted(!bridge.settings.settings.isMuted);
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.lookZone;
      this.cam.setPointerLocked(this.isPointerLocked);

      if (!this.isPointerLocked) {
        if (this.suppressAutoPauseOnUnlock) {
          this.suppressAutoPauseOnUnlock = false;
          return;
        }
        const st = bridge.getActiveStage();
        const noModalOpen =
          this.startOverlay.classList.contains('hidden') &&
          this.resultOverlay.classList.contains('hidden') &&
          this.caughtOverlay.classList.contains('hidden') &&
          this.labOverlay.classList.contains('hidden') &&
          this.settingsOverlay.classList.contains('hidden');

        if (st.isStarted && !st.isPaused && !st.isStageCleared && noModalOpen) {
          st.isPaused = true;
          this.sound.stopAllLoops();
          this.refreshQualityUI();
          this.pauseOverlay.classList.remove('hidden');
          this.clearInputs();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!this.settingsOverlay.classList.contains('hidden')) {
          document.getElementById('btn-settings-close')!.click();
          return;
        }
        const st = bridge.getActiveStage();
        const noModalOpen =
          this.startOverlay.classList.contains('hidden') &&
          this.resultOverlay.classList.contains('hidden') &&
          this.caughtOverlay.classList.contains('hidden') &&
          this.labOverlay.classList.contains('hidden');

        if (st.isStarted && !st.isStageCleared && noModalOpen) {
          if (e.code === 'Escape' && this.isPointerLocked) return;
          togglePause();
        }
      }
      if (e.code === 'KeyM') {
        this.sound.unlock();
        bridge.settings.setMuted(!bridge.settings.settings.isMuted);
      }
    });
  }

  public refreshSettingsUI(): void {
    if (!this.bridge) return;
    const s = this.bridge.settings.settings;
    this.setSensInput.value = s.cameraSensitivity.toFixed(1);
    this.setSensVal.textContent = `${s.cameraSensitivity.toFixed(1)}x`;

    this.setInvertYBtn.textContent = s.invertY ? 'ON' : 'OFF';
    this.setInvertYBtn.classList.toggle('active', s.invertY);

    this.setAutoFollowBtn.textContent = s.mobileAutoFollow ? 'ON' : 'OFF';
    this.setAutoFollowBtn.classList.toggle('active', s.mobileAutoFollow);

    const volPct = Math.round(s.masterVolume * 100);
    this.setVolInput.value = String(volPct);
    this.setVolVal.textContent = `${volPct}%`;
    this.setMuteBtn.textContent = s.isMuted ? '🔇' : '🔊';
    this.setMuteBtn.classList.toggle('active', !s.isMuted);
    this.btnMute.textContent = s.isMuted ? '🔇' : '🔊';

    this.refreshQualityUI();
  }

  public refreshStartMenu(): void {
    if (!this.bridge) return;
    const { dna, bestStarsByStage, bestMomentum } = this.bridge.progression.save;
    const selected = this.bridge.getSelectedStageId();

    this.startSaveSummary.textContent = `MUTATION DNA: ${dna}`;
    this.bab1StarsEl.textContent = [1, 2, 3].map((i) => (i <= bestStarsByStage.bab1 ? '★' : '☆')).join(' ');
    this.bab1MomentumEl.textContent = `Rekor Momentum: ${bestMomentum}%`;

    this.bab2StarsEl.textContent = [1, 2, 3].map((i) => (i <= bestStarsByStage.bab2 ? '★' : '☆')).join(' ');
    const bab2Unlocked = bestStarsByStage.bab1 > 0 || bestStarsByStage.bab2 > 0;
    this.bab2StatusTagEl.textContent = bab2Unlocked ? 'TERBUKA' : 'MODE UJI COBA';

    this.btnSelectBab1.classList.toggle('active', selected === 'bab1');
    this.btnSelectBab2.classList.toggle('active', selected === 'bab2');

    if (selected === 'bab1') {
      this.startStageDesc.innerHTML =
        'Koko lapar di dapur rumah tertutup. Merayap 360°, sabotase <b>3 target keisengan</b>, dan sembunyi di celah aman!';
      this.startChecklist.innerHTML =
        '<div>1. <b>Curi Cemilan</b> — Sayur di Meja Dapur (Talenan)</div>' +
        '<div>2. <b>Sabotase Sup</b> — Panci Sup di Kompor Gas Melon</div>' +
        '<div>3. <b>Pesta di Meja</b> — Hidangan di Meja Makan</div>';
    } else {
      this.startStageDesc.innerHTML =
        'Menyusup ke kamar gaming gelap penuh neon! Manfaatkan <b>kipas angin berosilasi</b>, hindari <b>flashbang monitor</b>, dan waspadai <b>raket nyamuk elektrik</b>!';
      this.startChecklist.innerHTML =
        '<div>1. <b>Kontaminasi Minuman</b> — Kaleng energi di sisi kiri meja</div>' +
        '<div>2. <b>Sabotase Koneksi LAN</b> — Cabut kabel LAN di belakang PC</div>' +
        '<div>3. <b>Teror Layar Monitor</b> — Naik rak dinding &amp; meluncur lewat angin kipas!</div>';
    }
  }

  private openLab(from: 'start' | 'result'): void {
    this.labReturnTarget = from;
    this.startOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
    this.renderLab();
    this.labOverlay.classList.remove('hidden');
  }

  private renderLab(): void {
    if (!this.bridge) return;
    const prog = this.bridge.progression;
    const save = prog.save;
    this.labDnaBalance.textContent = `MUTATION DNA: ${save.dna}`;
    this.labGrid.innerHTML = '';

    for (const def of UPGRADE_DEFS) {
      const lvl = save.upgrades[def.key];
      const cost = prog.getNextCost(def.key);

      const card = document.createElement('div');
      card.className = 'lab-item';

      const head = document.createElement('div');
      head.className = 'lab-item-head';
      const title = document.createElement('div');
      title.className = 'lab-item-title';
      title.textContent = def.title;

      const pips = document.createElement('div');
      pips.className = 'lab-pips';
      for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
        const pip = document.createElement('span');
        pip.className = i < lvl ? 'lab-pip filled' : 'lab-pip';
        pips.appendChild(pip);
      }
      head.append(title, pips);

      const desc = document.createElement('div');
      desc.className = 'lab-item-desc';
      desc.textContent = def.desc;

      const bonus = document.createElement('div');
      bonus.className = 'lab-item-bonus';
      bonus.textContent = def.bonusText(lvl);

      const btn = document.createElement('button');
      btn.className = 'lab-buy-btn';
      if (cost === null) {
        btn.textContent = 'LEVEL MAKSIMAL';
        btn.disabled = true;
      } else {
        btn.textContent = `UPGRADE Lv.${lvl + 1} (${cost} DNA)`;
        btn.disabled = save.dna < cost;
        btn.addEventListener('click', () => {
          if (prog.buyUpgrade(def.key)) {
            this.bridge?.getActiveStage().applyUpgrades();
            this.sound.playStarUnlock();
            this.renderLab();
          }
        });
      }

      card.append(head, desc, bonus, btn);
      this.labGrid.appendChild(card);
    }
  }

  public refreshQualityUI(): void {
    if (!this.bridge) return;
    this.pauseQualityStatus.textContent = this.bridge.quality.getStatusSummary();
    const curMode = this.bridge.quality.mode;
    for (const btn of this.qualityButtons) {
      btn.classList.toggle('active', btn.dataset.qmode === curMode);
    }
  }

  public showStory(text: string, duration: number): void {
    const now = performance.now() * 0.001;
    this.storyText.textContent = text;
    this.storyShownAt = now;
    this.storyUntil = now + Math.min(3.5, duration);
    this.storyCard.classList.remove('faded');
  }

  public showToast(text: string): void {
    this.toastBanner.textContent = text;
    this.toastBanner.classList.remove('hidden');
    this.toastUntil = performance.now() * 0.001 + 2.6;
  }

  public showCaught(reason: string): void {
    this.clearInputs();
    this.sound.stopAllLoops();
    this.releasePointerLockSafe();
    this.caughtReason.textContent = `${reason} Semua progres stage di-reset ke awal.`;
    this.caughtOverlay.classList.remove('hidden');
  }

  public showStageResult(
    stageId: StageId,
    stars: number,
    finalMomentum: number,
    dnaEarned: number,
    totalDna: number
  ): void {
    this.clearInputs();
    this.sound.stopAllLoops();
    this.releasePointerLockSafe();

    if (stageId === 'bab1') {
      this.resultKicker.textContent = 'BAB 01 SELESAI';
      this.resultTitle.textContent = 'DAPUR HURU-HARA / SELESAI';
      this.resultSubtitle.innerHTML =
        'Koko selamat. Ibu menyerah pada dapurnya yang kacau.<br/>Dari balik pintu, terdengar suara game si Anak...';
      this.btnNextBab2.classList.remove('hidden');
    } else {
      this.resultKicker.textContent = 'BAB 02 SELESAI';
      this.resultTitle.textContent = 'BAB 02 SELESAI: KAMAR SI GAMER';
      this.resultSubtitle.innerHTML =
        'Kursi gaming terjungkal dan Si Gamer lari tunggang-langgang!<br/>Koko menguasai kamar gaming dengan sempurna.';
      this.btnNextBab2.classList.add('hidden');
    }

    document.getElementById('result-momentum')!.textContent =
      `MOMENTUM TEROR AKHIR: ${Math.round(finalMomentum)}%`;
    document.getElementById('result-dna')!.textContent = `+${dnaEarned} MUTATION DNA`;
    this.resultTotalDna.textContent = `TOTAL DNA TERSIMPAN: ${totalDna}`;
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`res-star-${i}`)!.classList.toggle('active', i <= stars);
    }
    this.resultOverlay.classList.remove('hidden');
  }

  public consumeInput(): InputState {
    let kx = 0;
    let ky = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) ky += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ky -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;

    const kLen = Math.hypot(kx, ky);
    let moveX = this.touchCtrl.moveX;
    let moveY = this.touchCtrl.moveY;
    if (kLen > 0) {
      moveX = kx / kLen;
      moveY = ky / kLen;
    }

    const touchTriggers = this.touchCtrl.consumeTriggers();
    const state: InputState = {
      moveX,
      moveY,
      flyHeld: this.touchCtrl.flyHeld || this.keys.has('Space'),
      flyJustPressed: this.keyFlyJustPressed || touchTriggers.flyJustPressed,
      glideHeld:
        this.touchCtrl.glideHeld ||
        this.keys.has('ShiftLeft') ||
        this.keys.has('ShiftRight'),
      dodgeJustPressed: this.keyDodgeJustPressed || touchTriggers.dodgeJustPressed,
      actionHeld: this.touchCtrl.actionHeld || this.keys.has('KeyE') || this.keys.has('KeyF'),
    };

    this.keyFlyJustPressed = false;
    this.keyDodgeJustPressed = false;
    return state;
  }

  public updateHUD(
    dt: number,
    time: number,
    snap: HudSnapshot,
    koko: KokoController,
    input: InputState,
    totalDna: number,
    isPaused: boolean,
    isStarted: boolean
  ): void {
    // Keep HUD & world overlays hidden when browsing the Live 3D Backdrop Main Menu
    this.hudLayer.classList.toggle('hidden', !isStarted);
    this.worldOverlays.classList.toggle('hidden', !isStarted);

    if (!isStarted) {
      this.flashbangGlare.classList.add('hidden');
      this.dangerVignette.classList.add('hidden');
      this.threatIndicator.classList.add('hidden');
      return;
    }

    this.touchCtrl.updateInertia(dt, this.isPointerLocked);

    const isNarrow = window.innerWidth <= 768;
    this.objectiveChapter.textContent = snap.chapterLabel;
    this.objectiveTitle.textContent = isNarrow ? snap.shortObjectiveTitle : snap.objectiveTitle;
    this.objectiveHint.textContent = snap.objectiveHint;

    if (snap.activeHidingSpot) {
      this.hidingBadge.classList.remove('hidden');
      const risky = snap.activeHidingSpot.safety === 'Risky';
      this.hidingBadge.classList.toggle('risky', risky);
      this.hidingBadge.textContent = risky
        ? `SEMBUNYI BERISIKO · ${snap.activeHidingSpot.name}`
        : `SEMBUNYI AMAN · ${snap.activeHidingSpot.name}`;
    } else {
      this.hidingBadge.classList.add('hidden');
    }

    const pct = Math.round(snap.gauge);
    this.momentumPct.textContent = `${pct}%`;
    this.momentumFill.style.width = `${pct}%`;
    for (let i = 0; i < 3; i++) {
      this.starEls[i].classList.toggle('unlocked', snap.stars[i]);
    }

    this.detectionFill.style.width = `${Math.round(snap.detection)}%`;
    this.threatStatus.textContent = isNarrow ? snap.shortThreatBadge : snap.threatStatus;
    this.threatStatus.style.color = snap.threatColor;
    this.threatDot.style.background = snap.threatColor;
    this.detectionFill.style.background = snap.threatColor;

    this.surfaceStatus.textContent = koko.getSurfaceLabel() + snap.extraStatusTag;
    const staminaRatio = koko.stamina / Math.max(1, koko.maxStamina);
    const staminaPctStr = `${Math.round(staminaRatio * 100)}%`;
    if (this.touchMode) {
      this.staminaFill.style.width = '100%';
      this.staminaFill.style.height = staminaPctStr;
    } else {
      this.staminaFill.style.height = '100%';
      this.staminaFill.style.width = staminaPctStr;
    }
    this.dnaHudBadge.textContent = `${totalDna} DNA`;
    if (isPaused) this.refreshQualityUI();

    const glareOn = Boolean(this.bridge?.isFlashbangGlare()) && isStarted && !isPaused;
    this.flashbangGlare.classList.toggle('hidden', !glareOn);

    const showLockHint =
      !this.touchMode &&
      !this.isPointerLocked &&
      isStarted &&
      !isPaused &&
      !snap.isStageCleared;
    this.pointerLockHint.classList.toggle('hidden', !showLockHint);

    const hasNearbyTarget = Boolean(snap.nearbyProp && !snap.nearbyProp.isRuined);
    const propProgress = hasNearbyTarget && snap.nearbyProp
      ? Math.min(1, snap.nearbyProp.currentProgress / snap.nearbyProp.requiredHoldDuration)
      : 0;

    if (hasNearbyTarget && snap.nearbyProp && !this.touchMode) {
      this.desktopActionPrompt.classList.remove('hidden');
      this.desktopActionText.textContent = `Tahan [E / F] ${snap.nearbyProp.actionVerb} — ${snap.nearbyProp.targetName}`;
      this.desktopActionFill.style.width = `${Math.round(propProgress * 100)}%`;
    } else {
      this.desktopActionPrompt.classList.add('hidden');
    }

    this.touchCtrl.updateButtonsVisual({
      staminaRatio,
      dodgeCooldownRatio: koko.dodgeCooldownRatio,
      isAirborne: koko.state === 'Flying' || koko.state === 'Gliding',
      hasContextualAction: hasNearbyTarget,
      contextualLabel: snap.nearbyProp?.actionVerb ?? 'AKSI',
      contextualProgress: propProgress,
      isInHidingSpot: Boolean(snap.activeHidingSpot),
    });

    this.tutorial.update(
      dt,
      isStarted && !isPaused && !snap.isStageCleared,
      this.touchMode,
      input,
      koko.state,
      hasNearbyTarget,
      Boolean(snap.activeHidingSpot)
    );

    // Windup Danger Vignette & Directional Arrow
    if (snap.isWindingUp && !isPaused && !snap.isStageCleared) {
      this.dangerVignette.classList.remove('hidden');
      this.threatIndicator.classList.remove('hidden');
      this.threatWarningText.textContent = snap.windupWarningText;
      this.threatWindupFill.style.width = `${Math.round(snap.windupProgress * 100)}%`;

      const camFwd = this.cam.getForward(new THREE.Vector3());
      const camRight = new THREE.Vector3().crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();
      const toBoss = snap.bossWorldPos.clone().sub(koko.position);
      toBoss.y = 0;
      if (toBoss.lengthSq() > 0.001) {
        toBoss.normalize();
        const flatFwd = new THREE.Vector3(camFwd.x, 0, camFwd.z).normalize();
        const flatRight = new THREE.Vector3(camRight.x, 0, camRight.z).normalize();
        const angle = Math.atan2(toBoss.dot(flatRight), toBoss.dot(flatFwd));
        this.threatArrow.style.transform = `rotate(${THREE.MathUtils.radToDeg(angle)}deg)`;
      }
    } else {
      this.dangerVignette.classList.add('hidden');
      this.threatIndicator.classList.add('hidden');
    }

    const playerMoved =
      Math.hypot(input.moveX, input.moveY) > 0.15 || input.flyHeld || input.actionHeld;
    if (time > this.storyUntil || (playerMoved && time - this.storyShownAt > 0.35)) {
      this.storyCard.classList.add('faded');
    }
    if (time > this.toastUntil) {
      this.toastBanner.classList.add('hidden');
    }

    this.updateWorldMarker(snap.targetPosition, snap.targetIndexLabel);
    this.updateBossBubble(snap);
  }

  private updateWorldMarker(pos: THREE.Vector3 | null, indexLabel: string): void {
    if (!pos) {
      this.targetMarker.classList.add('hidden');
      return;
    }
    this.targetMarker.classList.remove('hidden');
    this.projVec.copy(pos).add(new THREE.Vector3(0, 1.35, 0));
    this.projVec.project(this.cam.camera);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const rawX = (this.projVec.x * 0.5 + 0.5) * w;
    const rawY = (-this.projVec.y * 0.5 + 0.5) * h;
    const behind = this.projVec.z > 1;

    const topSafe = w <= 768 ? 106 : 114;
    const bottomSafe = h - (this.touchMode ? 176 : 64);
    const padX = this.touchMode ? 48 : 34;

    const onScreen =
      !behind &&
      rawX >= padX &&
      rawX <= w - padX &&
      rawY >= topSafe &&
      rawY <= bottomSafe;

    if (onScreen) {
      this.targetLabel.textContent = indexLabel;
      this.targetChevron.style.transform = 'rotate(90deg)';
      this.targetMarker.style.left = `${rawX}px`;
      this.targetMarker.style.top = `${rawY}px`;
      return;
    }

    // Off-screen or behind: clamp neatly to safe viewport edges and orient chevron toward target
    const cx = w * 0.5;
    const cy = h * 0.5;
    let dx = rawX - cx;
    let dy = rawY - cy;
    if (behind) {
      dx = -dx;
      dy = Math.abs(dy) < 40 ? 120 : -dy;
    }

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = THREE.MathUtils.radToDeg(angleRad);
    this.targetChevron.style.transform = `rotate(${angleDeg}deg)`;
    this.targetLabel.textContent = behind ? `${indexLabel} · BLK` : indexLabel;

    const halfW = Math.max(20, (this.targetMarker.offsetWidth || 64) * 0.5);
    const halfH = Math.max(14, (this.targetMarker.offsetHeight || 28) * 0.5);
    const minX = padX + halfW;
    const maxX = Math.max(minX, w - padX - halfW);
    const minY = topSafe + halfH;
    const maxY = Math.max(minY, bottomSafe - halfH);

    // Intersect ray from center with safe bounding box
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const tx = Math.abs(cos) > 0.001 ? ((cos > 0 ? maxX : minX) - cx) / cos : 1e6;
    const ty = Math.abs(sin) > 0.001 ? ((sin > 0 ? maxY : minY) - cy) / sin : 1e6;
    const t = Math.min(Math.abs(tx), Math.abs(ty));

    const edgeX = THREE.MathUtils.clamp(cx + cos * t, minX, maxX);
    const edgeY = THREE.MathUtils.clamp(cy + sin * t, minY, maxY);

    this.targetMarker.style.left = `${edgeX}px`;
    this.targetMarker.style.top = `${edgeY}px`;
  }

  private updateBossBubble(snap: HudSnapshot): void {
    const headPos = snap.bossWorldPos.clone().add(new THREE.Vector3(0, snap.bossHeadHeight, 0));
    this.projVec.copy(headPos).project(this.cam.camera);

    if (this.projVec.z > 1 || this.projVec.x < -1.1 || this.projVec.x > 1.1) {
      this.ibuBubble.classList.add('hidden');
      return;
    }

    this.ibuBubble.classList.remove('hidden');
    this.ibuDialogue.textContent = snap.bossDialogue;

    if (snap.bossBadge === '!') {
      this.ibuAlertBadge.classList.remove('hidden');
      this.ibuAlertBadge.textContent = '!';
      this.ibuAlertBadge.style.background = '#ff6e5c';
    } else if (snap.bossBadge === '?') {
      this.ibuAlertBadge.classList.remove('hidden');
      this.ibuAlertBadge.textContent = '?';
      this.ibuAlertBadge.style.background = '#ffbf52';
    } else {
      this.ibuAlertBadge.classList.add('hidden');
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pad = 16;
    const bubbleW = Math.min(w - pad * 2, Math.max(120, this.ibuBubble.offsetWidth || 200));
    const bubbleH = Math.max(48, this.ibuBubble.offsetHeight || 72);
    const halfW = bubbleW * 0.5;
    const topSafe = pad + bubbleH + 92;
    const bottomSafe = h - 72;

    const x = THREE.MathUtils.clamp((this.projVec.x * 0.5 + 0.5) * w, pad + halfW, Math.max(pad + halfW, w - pad - halfW));
    const y = THREE.MathUtils.clamp((-this.projVec.y * 0.5 + 0.5) * h, topSafe, Math.max(topSafe, bottomSafe));
    this.ibuBubble.style.left = `${x}px`;
    this.ibuBubble.style.top = `${y}px`;
  }

  private clearInputs(): void {
    this.keys.clear();
    this.keyFlyJustPressed = false;
    this.keyDodgeJustPressed = false;
    this.touchCtrl.resetAllTouches();
  }

  private bindKeyboardAndLock(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.keys.has('Space')) {
        this.keyFlyJustPressed = true;
      }
      if (e.code === 'KeyQ' && !this.keys.has('KeyQ')) {
        this.keyDodgeJustPressed = true;
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => this.clearInputs());

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const st = this.bridge?.getActiveStage();
      if (!st?.isStarted || st.isPaused) return;
      this.cam.addSwipeDelta(e.movementX, e.movementY);
    });
  }
}
