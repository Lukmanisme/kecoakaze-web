import * as THREE from 'three';
import { HudSnapshot, InputState, StageController, StageId } from '../types';
import { KokoController } from '../physics/kokoPhysics';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { MAX_UPGRADE_LEVEL, ProgressionManager, UPGRADE_DEFS } from '../game/progression';

export interface StageBridge {
  getActiveStage: () => StageController;
  getSelectedStageId: () => StageId;
  selectAndLoadStage: (id: StageId, startImmediately: boolean) => void;
  progression: ProgressionManager;
  isFlashbangGlare: () => boolean;
}

export class HUDController {
  private readonly keys = new Set<string>();
  private flyJustPressed = false;
  private dodgeJustPressed = false;
  private mobileFlyHeld = false;
  private mobileGlideHeld = false;
  private mobileActionHeld = false;
  private mobileMoveX = 0;
  private mobileMoveY = 0;

  private touchMode = false;
  private isPointerLocked = false;
  private suppressAutoPauseOnUnlock = false;

  private pointerLookId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;
  private joyPointerId: number | null = null;

  private storyUntil = 0;
  private toastUntil = 0;
  private labReturnTarget: 'start' | 'result' = 'start';

  private bridge: StageBridge | null = null;

  // DOM refs
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
  private readonly detectionFill = document.getElementById('detection-fill')!;
  private readonly surfaceStatus = document.getElementById('surface-status')!;
  private readonly staminaFill = document.getElementById('stamina-fill')!;
  private readonly dnaHudBadge = document.getElementById('dna-hud-badge')!;
  private readonly storyCard = document.getElementById('story-card')!;
  private readonly storyText = document.getElementById('story-text')!;
  private readonly toastBanner = document.getElementById('toast-banner')!;
  private readonly targetMarker = document.getElementById('target-marker')!;
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

  private readonly joystickZone = document.getElementById('joystick-zone')!;
  private readonly actionCluster = document.getElementById('action-cluster')!;
  private readonly btnAction = document.getElementById('btn-action')!;
  private readonly btnActionLabel = document.getElementById('btn-action-label')!;
  private readonly actionRing = document.getElementById('action-ring-progress')!;
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
  private readonly bab2StarsEl = document.getElementById('bab2-best-stars')!;

  private readonly pauseOverlay = document.getElementById('pause-overlay')!;
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

  private readonly projVec = new THREE.Vector3();

  constructor(
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: ProceduralAudioEngine
  ) {
    this.touchMode = this.detectInitialTouch();
    this.applyTouchModeUI();
    this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
    this.bindInputs();
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
    this.joystickZone.classList.toggle('hidden', !this.touchMode);
    this.actionCluster.classList.toggle('hidden', !this.touchMode);
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

    this.btnSelectBab1.addEventListener('click', () => {
      this.sound.unlock();
      bridge.selectAndLoadStage('bab1', false);
      this.refreshStartMenu();
    });

    this.btnSelectBab2.addEventListener('click', () => {
      this.sound.unlock();
      bridge.selectAndLoadStage('bab2', false);
      this.refreshStartMenu();
    });

    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.sound.unlock();
      this.startOverlay.classList.add('hidden');
      bridge.selectAndLoadStage(bridge.getSelectedStageId(), true);
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
      this.resultOverlay.classList.add('hidden');
      this.caughtOverlay.classList.add('hidden');
      this.labOverlay.classList.add('hidden');
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
      this.pauseOverlay.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.caughtOverlay.classList.add('hidden');
      this.labOverlay.classList.add('hidden');
      this.releasePointerLockSafe();
      this.clearInputs();
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

    this.btnTouchToggle.addEventListener('click', () => {
      this.setTouchMode(!this.touchMode);
      this.showToast(this.touchMode ? '📱 Mode Touch Diaktifkan' : '🖱 Mode Desktop Aktif');
    });

    this.btnPauseTouch.addEventListener('click', () => {
      this.setTouchMode(!this.touchMode);
    });

    this.btnMute.addEventListener('click', () => {
      this.sound.unlock();
      this.sound.setMuted(!this.sound.muted);
      this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
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
          this.labOverlay.classList.contains('hidden');

        if (st.isStarted && !st.isPaused && !st.isStageCleared && noModalOpen) {
          st.isPaused = true;
          this.sound.stopAllLoops();
          this.pauseOverlay.classList.remove('hidden');
          this.clearInputs();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
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
        this.sound.setMuted(!this.sound.muted);
        this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
      }
    });
  }

  public refreshStartMenu(): void {
    if (!this.bridge) return;
    const { dna, bestStarsByStage } = this.bridge.progression.save;
    const selected = this.bridge.getSelectedStageId();

    this.startSaveSummary.textContent = `MUTATION DNA: ${dna}`;
    this.bab1StarsEl.textContent = [1, 2, 3].map((i) => (i <= bestStarsByStage.bab1 ? '★' : '☆')).join(' ');
    this.bab2StarsEl.textContent = [1, 2, 3].map((i) => (i <= bestStarsByStage.bab2 ? '★' : '☆')).join(' ');

    this.btnSelectBab1.classList.toggle('active', selected === 'bab1');
    this.btnSelectBab2.classList.toggle('active', selected === 'bab2');

    if (selected === 'bab1') {
      this.startStageDesc.innerHTML =
        'Koko lapar di dapur rumah. Merayap 360°, sabotase <b>3 target keisengan</b>, dan bersembunyi di celah aman saat dikejar Ibu!';
      this.startChecklist.innerHTML =
        '<div>1. <b>Curi Cemilan</b> — Sayur di Meja Dapur (Talenan)</div>' +
        '<div>2. <b>Sabotase Sup</b> — Wajan / Panci di Kompor Gas</div>' +
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

  public showStory(text: string, duration: number): void {
    this.storyText.textContent = text;
    this.storyUntil = performance.now() * 0.001 + duration;
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
    let moveX = this.mobileMoveX;
    let moveY = this.mobileMoveY;
    if (kLen > 0) {
      moveX = kx / kLen;
      moveY = ky / kLen;
    }

    const state: InputState = {
      moveX,
      moveY,
      flyHeld: this.mobileFlyHeld || this.keys.has('Space'),
      flyJustPressed: this.flyJustPressed,
      glideHeld: this.mobileGlideHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      dodgeJustPressed: this.dodgeJustPressed,
      actionHeld: this.mobileActionHeld || this.keys.has('KeyE') || this.keys.has('KeyF'),
    };

    this.flyJustPressed = false;
    this.dodgeJustPressed = false;
    return state;
  }

  public updateHUD(
    time: number,
    snap: HudSnapshot,
    koko: KokoController,
    totalDna: number,
    isPaused: boolean,
    isStarted: boolean
  ): void {
    this.objectiveChapter.textContent = snap.chapterLabel;
    this.objectiveTitle.textContent = snap.objectiveTitle;
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
    this.threatStatus.textContent = snap.threatStatus;
    this.threatStatus.style.color = snap.threatColor;
    this.detectionFill.style.background = snap.threatColor;

    this.surfaceStatus.textContent = koko.getSurfaceLabel() + snap.extraStatusTag;
    this.staminaFill.style.width = `${Math.round((koko.stamina / koko.maxStamina) * 100)}%`;
    this.dnaHudBadge.textContent = `${totalDna} DNA`;

    // Monitor Flashbang Glare overlay
    const glareOn = Boolean(this.bridge?.isFlashbangGlare()) && isStarted && !isPaused;
    this.flashbangGlare.classList.toggle('hidden', !glareOn);

    const showLockHint =
      !this.touchMode &&
      !this.isPointerLocked &&
      isStarted &&
      !isPaused &&
      !snap.isStageCleared;
    this.pointerLockHint.classList.toggle('hidden', !showLockHint);

    // Contextual Sabotage Prompt
    if (snap.nearbyProp && !snap.nearbyProp.isRuined) {
      const prog = Math.min(
        1,
        snap.nearbyProp.currentProgress / snap.nearbyProp.requiredHoldDuration
      );
      if (this.touchMode) {
        this.btnAction.classList.remove('hidden');
        this.btnActionLabel.textContent = snap.nearbyProp.actionVerb;
        const circ = 175.9;
        this.actionRing.style.strokeDashoffset = `${circ * (1 - prog)}`;
        this.desktopActionPrompt.classList.add('hidden');
      } else {
        this.btnAction.classList.add('hidden');
        this.desktopActionPrompt.classList.remove('hidden');
        this.desktopActionText.textContent = `Tahan [E / F] ${snap.nearbyProp.actionVerb} — ${snap.nearbyProp.targetName}`;
        this.desktopActionFill.style.width = `${Math.round(prog * 100)}%`;
      }
    } else {
      this.btnAction.classList.add('hidden');
      this.actionRing.style.strokeDashoffset = '175.9';
      this.desktopActionPrompt.classList.add('hidden');
    }

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

    if (time > this.storyUntil) {
      this.storyCard.classList.add('faded');
    }
    if (time > this.toastUntil) {
      this.toastBanner.classList.add('hidden');
    }

    this.updateWorldMarker(snap.targetPosition, snap.targetMarkerText);
    this.updateBossBubble(snap);
  }

  private updateWorldMarker(pos: THREE.Vector3 | null, label: string): void {
    if (!pos) {
      this.targetMarker.classList.add('hidden');
      return;
    }
    this.targetMarker.classList.remove('hidden');
    this.projVec.copy(pos).add(new THREE.Vector3(0, 1.4, 0));
    this.projVec.project(this.cam.camera);

    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = (this.projVec.x * 0.5 + 0.5) * w;
    let y = (-this.projVec.y * 0.5 + 0.5) * h;
    const behind = this.projVec.z > 1;
    this.targetMarker.textContent = `${behind ? 'DI BELAKANG / ' : ''}${label}`;

    const pad = 16;
    const markerW = Math.min(w - pad * 2, Math.max(96, this.targetMarker.offsetWidth || 168));
    const markerH = Math.max(36, this.targetMarker.offsetHeight || 52);
    const halfW = markerW * 0.5;
    const topSafe = (w <= 760 ? 116 : 124) + markerH;
    const bottomSafe = h - (w <= 760 ? 228 : 134);

    if (behind) {
      x = w - x;
      y = bottomSafe;
    }
    x = THREE.MathUtils.clamp(x, pad + halfW, Math.max(pad + halfW, w - pad - halfW));
    y = THREE.MathUtils.clamp(y, topSafe, Math.max(topSafe, bottomSafe));

    this.targetMarker.style.left = `${x}px`;
    this.targetMarker.style.top = `${y}px`;
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
    this.mobileMoveX = 0;
    this.mobileMoveY = 0;
    this.mobileFlyHeld = false;
    this.mobileGlideHeld = false;
    this.mobileActionHeld = false;
    this.flyJustPressed = false;
    this.dodgeJustPressed = false;
  }

  private bindInputs(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.keys.has('Space')) {
        this.flyJustPressed = true;
      }
      if (e.code === 'KeyQ' && !this.keys.has('KeyQ')) {
        this.dodgeJustPressed = true;
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => this.clearInputs());

    window.addEventListener(
      'touchstart',
      () => {
        if (!this.touchMode) {
          this.setTouchMode(true);
        }
      },
      { passive: true }
    );

    this.lookZone.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      const st = this.bridge?.getActiveStage();
      if (
        e.pointerType === 'mouse' &&
        !this.touchMode &&
        !this.isPointerLocked &&
        st?.isStarted &&
        !st?.isPaused &&
        !st?.isStageCleared
      ) {
        this.tryLockPointer();
      }
      if (this.pointerLookId !== null) return;
      this.pointerLookId = e.pointerId;
      this.lastLookX = e.clientX;
      this.lastLookY = e.clientY;
      this.cam.onSwipeStart();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const st = this.bridge?.getActiveStage();
      if (!st?.isStarted || st.isPaused) return;
      this.cam.addSwipeDelta(e.movementX, e.movementY);
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isPointerLocked) return;
      if (e.pointerId === this.pointerLookId) {
        const dx = e.clientX - this.lastLookX;
        const dy = e.clientY - this.lastLookY;
        this.lastLookX = e.clientX;
        this.lastLookY = e.clientY;
        this.cam.addSwipeDelta(dx, dy);
      }
    });

    const endLook = (e: PointerEvent) => {
      if (e.pointerId === this.pointerLookId) {
        this.pointerLookId = null;
        this.cam.onSwipeEnd();
      }
    };
    window.addEventListener('pointerup', endLook);
    window.addEventListener('pointercancel', endLook);

    const joyKnob = document.getElementById('joystick-knob')!;
    const maxRadius = 46;

    const updateJoy = (clientX: number, clientY: number) => {
      const rect = this.joystickZone.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.mobileMoveX = dx / maxRadius;
      this.mobileMoveY = -dy / maxRadius;
    };

    this.joystickZone.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.joyPointerId = e.pointerId;
      this.joystickZone.setPointerCapture(e.pointerId);
      updateJoy(e.clientX, e.clientY);
    });

    this.joystickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      updateJoy(e.clientX, e.clientY);
    });

    const resetJoy = (e: PointerEvent) => {
      if (e.pointerId !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.mobileMoveX = 0;
      this.mobileMoveY = 0;
      joyKnob.style.transform = 'translate(-50%, -50%)';
    };
    this.joystickZone.addEventListener('pointerup', resetJoy);
    this.joystickZone.addEventListener('pointercancel', resetJoy);

    const bindHoldBtn = (
      id: string,
      onStart: () => void,
      onEnd: () => void
    ) => {
      const el = document.getElementById(id)!;
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.sound.unlock();
        el.classList.add('active');
        onStart();
      });
      const stop = (e: PointerEvent) => {
        e.stopPropagation();
        el.classList.remove('active');
        onEnd();
      };
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointercancel', stop);
      el.addEventListener('pointerleave', stop);
    };

    bindHoldBtn(
      'btn-fly',
      () => {
        if (!this.mobileFlyHeld) this.flyJustPressed = true;
        this.mobileFlyHeld = true;
      },
      () => {
        this.mobileFlyHeld = false;
      }
    );

    bindHoldBtn(
      'btn-glide',
      () => {
        this.mobileGlideHeld = true;
      },
      () => {
        this.mobileGlideHeld = false;
      }
    );

    bindHoldBtn(
      'btn-dodge',
      () => {
        this.dodgeJustPressed = true;
      },
      () => {}
    );

    bindHoldBtn(
      'btn-action',
      () => {
        this.mobileActionHeld = true;
      },
      () => {
        this.mobileActionHeld = false;
      }
    );
  }
}
