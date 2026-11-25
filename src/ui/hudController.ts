import * as THREE from 'three';
import { InputState } from '../types';
import { KokoController } from '../physics/kokoPhysics';
import { IbuBossController } from '../ai/ibuBoss';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { KitchenStageManager } from '../game/stageManager';
import { SoundEngine } from '../audio/soundEngine';

export class HUDController {
  private readonly keys = new Set<string>();
  private flyJustPressed = false;
  private dodgeJustPressed = false;
  private mobileFlyHeld = false;
  private mobileGlideHeld = false;
  private mobileActionHeld = false;
  private mobileMoveX = 0;
  private mobileMoveY = 0;

  private pointerLookId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;
  private joyPointerId: number | null = null;

  private storyUntil = 0;
  private toastUntil = 0;

  // DOM refs
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
  private readonly storyCard = document.getElementById('story-card')!;
  private readonly storyText = document.getElementById('story-text')!;
  private readonly toastBanner = document.getElementById('toast-banner')!;
  private readonly targetMarker = document.getElementById('target-marker')!;
  private readonly ibuBubble = document.getElementById('ibu-bubble')!;
  private readonly ibuAlertBadge = document.getElementById('ibu-alert-badge')!;
  private readonly ibuDialogue = document.getElementById('ibu-dialogue')!;

  private readonly btnAction = document.getElementById('btn-action')!;
  private readonly btnActionLabel = document.getElementById('btn-action-label')!;
  private readonly actionRing = document.getElementById('action-ring-progress')!;
  private readonly btnMute = document.getElementById('btn-mute')!;
  private readonly btnPause = document.getElementById('btn-pause')!;

  private readonly startOverlay = document.getElementById('start-overlay')!;
  private readonly pauseOverlay = document.getElementById('pause-overlay')!;
  private readonly resultOverlay = document.getElementById('result-overlay')!;
  private readonly caughtOverlay = document.getElementById('caught-overlay')!;
  private readonly caughtReason = document.getElementById('caught-reason')!;
  private readonly epilogNote = document.getElementById('epilog-note')!;

  private readonly projVec = new THREE.Vector3();

  constructor(
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: SoundEngine
  ) {
    this.bindInputs();
  }

  public bindStageActions(stage: KitchenStageManager): void {
    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.sound.unlock();
      this.startOverlay.classList.add('hidden');
      stage.isStarted = true;
      stage.resetStage();
    });

    this.btnPause.addEventListener('click', () => {
      if (!stage.isStarted || stage.isStageCleared) return;
      stage.isPaused = !stage.isPaused;
      this.pauseOverlay.classList.toggle('hidden', !stage.isPaused);
      this.clearInputs();
    });

    document.getElementById('btn-resume')!.addEventListener('click', () => {
      stage.isPaused = false;
      this.pauseOverlay.classList.add('hidden');
    });

    const restartAll = () => {
      this.pauseOverlay.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');
      this.caughtOverlay.classList.add('hidden');
      this.epilogNote.classList.add('hidden');
      stage.isPaused = false;
      stage.resetStage();
      this.clearInputs();
    };

    document.getElementById('btn-pause-restart')!.addEventListener('click', restartAll);
    document.getElementById('btn-restart')!.addEventListener('click', restartAll);
    document.getElementById('btn-retry')!.addEventListener('click', restartAll);

    document.getElementById('btn-epilog')!.addEventListener('click', () => {
      this.epilogNote.classList.toggle('hidden');
    });

    this.btnMute.addEventListener('click', () => {
      this.sound.unlock();
      this.sound.setMuted(!this.sound.muted);
      this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (stage.isStarted && !stage.isStageCleared && this.caughtOverlay.classList.contains('hidden')) {
          stage.isPaused = !stage.isPaused;
          this.pauseOverlay.classList.toggle('hidden', !stage.isPaused);
          this.clearInputs();
        }
      }
      if (e.code === 'KeyM') {
        this.sound.unlock();
        this.sound.setMuted(!this.sound.muted);
        this.btnMute.textContent = this.sound.muted ? '🔇' : '🔊';
      }
    });
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
    this.caughtReason.textContent = `${reason} Semua progres stage di-reset ke awal.`;
    this.caughtOverlay.classList.remove('hidden');
  }

  public showStageResult(stars: number, finalMomentum: number, dnaReward: number): void {
    this.clearInputs();
    document.getElementById('result-momentum')!.textContent =
      `MOMENTUM TEROR AKHIR: ${Math.round(finalMomentum)}%`;
    document.getElementById('result-dna')!.textContent = `+${dnaReward} MUTATION DNA`;
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
    stage: KitchenStageManager,
    koko: KokoController,
    ibu: IbuBossController
  ): void {
    // 1. Objective & Hint
    const target = stage.getCurrentObjectiveProp();
    const discoveredCount = [0, 1, 2].filter((i) => stage.stars[i]).length;

    const titles = ['01 / CURI CEMILAN', '02 / SABOTASE SUP', '03 / PESTA DI MEJA'];
    const hints = [
      'Dekati bahan sayur di Meja Dapur. Tahan AKSI (E/F) untuk makan.',
      'Tunggu Ibu menjauh dari kompor. Dekati wajan/panci, tahan AKSI (E/F).',
      'Manfaatkan celah rutinitas. Dekati hidangan di Meja Makan, tahan AKSI (E/F).',
    ];

    if (!target || stage.isFinaleActive || stage.isStageCleared) {
      this.objectiveTitle.textContent = stage.isStageCleared
        ? 'DAPUR BERHASIL DILEWATI'
        : 'FINALE / DAPUR HURU-HARA';
      this.objectiveHint.textContent = 'Koko selamat. Ibu butuh waktu menenangkan diri!';
      this.targetMarker.classList.add('hidden');
    } else {
      const idx = target.type;
      this.objectiveTitle.textContent = `${titles[idx]}   ${discoveredCount}/3`;
      this.objectiveHint.textContent = target.isRuined
        ? 'Keisengan siap! Menjauh & tunggu Ibu menemukannya.'
        : hints[idx];
    }

    // 2. Hiding badge
    if (stage.activeHidingSpot) {
      this.hidingBadge.classList.remove('hidden');
      const risky = stage.activeHidingSpot.safety === 'Risky';
      this.hidingBadge.classList.toggle('risky', risky);
      this.hidingBadge.textContent = risky
        ? `SEMBUNYI BERISIKO · ${stage.activeHidingSpot.name}`
        : `SEMBUNYI AMAN · ${stage.activeHidingSpot.name}`;
    } else {
      this.hidingBadge.classList.add('hidden');
    }

    // 3. Momentum & Stars
    const pct = Math.round(stage.gauge);
    this.momentumPct.textContent = `${pct}%`;
    this.momentumFill.style.width = `${pct}%`;
    for (let i = 0; i < 3; i++) {
      this.starEls[i].classList.toggle('unlocked', stage.stars[i]);
    }

    // 4. Threat Status & Surface
    const det = Math.round(ibu.detection);
    this.detectionFill.style.width = `${det}%`;
    let statusText = 'IBU SIBUK / JAGA JARAK';
    let color = '#59e0ba';
    switch (ibu.bossState) {
      case 'PanicDefeated':
        statusText = 'IBU MENYERAH / KOKO SELAMAT';
        color = '#59e0ba';
        break;
      case 'Mengamuk':
        statusText = 'FINALE / DAPUR HURU-HARA';
        color = '#ffbf52';
        break;
      case 'MencariKoko':
      case 'MemeriksaSembunyi':
        statusText = 'IBU MENCARI / TETAP SEMBUNYI';
        color = '#ffbf52';
        break;
      case 'AngerCombat':
      case 'ShockedFreeze':
      case 'CariSapu':
        statusText = 'BAHAYA / PUTUS GARIS PANDANG!';
        color = '#ff6e5c';
        break;
      case 'SuspiciousAlert':
      case 'Marah':
        statusText = 'IBU WASPADA / CARI CELAH';
        color = '#ffbf52';
        break;
    }
    this.threatStatus.textContent = statusText;
    this.threatStatus.style.color = color;
    this.detectionFill.style.background = color;

    let surf = koko.getSurfaceLabel();
    if (koko.isOnSoapyFloor) surf += ' · LICIN!';
    if (koko.isInUpdraft) surf += ' · UPDRAFT!';
    this.surfaceStatus.textContent = surf;

    // 5. Stamina
    this.staminaFill.style.width = `${Math.round((koko.stamina / koko.maxStamina) * 100)}%`;

    // 6. Contextual Action Button + Radial Progress
    if (stage.nearbyProp && !stage.nearbyProp.isRuined) {
      this.btnAction.classList.remove('hidden');
      this.btnActionLabel.textContent = stage.nearbyProp.actionVerb;
      const prog = Math.min(
        1,
        stage.nearbyProp.currentProgress / stage.nearbyProp.requiredHoldDuration
      );
      const circ = 175.9;
      this.actionRing.style.strokeDashoffset = `${circ * (1 - prog)}`;
    } else {
      this.btnAction.classList.add('hidden');
      this.actionRing.style.strokeDashoffset = '175.9';
    }

    // 7. Story & Toast fade
    if (time > this.storyUntil) {
      this.storyCard.classList.add('faded');
    }
    if (time > this.toastUntil) {
      this.toastBanner.classList.add('hidden');
    }

    // 8. World-Projected Target Marker & Ibu Overhead Bubble
    this.updateWorldMarker(target && !target.isRuined ? target : null);
    this.updateIbuBubble(ibu);
  }

  private updateWorldMarker(target: ReturnType<KitchenStageManager['getCurrentObjectiveProp']>): void {
    if (!target) {
      this.targetMarker.classList.add('hidden');
      return;
    }
    this.targetMarker.classList.remove('hidden');
    this.projVec.copy(target.position).add(new THREE.Vector3(0, 1.4, 0));
    this.projVec.project(this.cam.camera);

    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = (this.projVec.x * 0.5 + 0.5) * w;
    let y = (-this.projVec.y * 0.5 + 0.5) * h;
    const behind = this.projVec.z > 1;
    if (behind) {
      x = w - x;
      y = h - 90;
    }
    x = THREE.MathUtils.clamp(x, 70, w - 70);
    y = THREE.MathUtils.clamp(y, 95, h - 110);

    this.targetMarker.style.left = `${x}px`;
    this.targetMarker.style.top = `${y}px`;
    this.targetMarker.textContent = `${behind ? 'DI BELAKANG / ' : ''}0${target.type + 1}\n${target.targetName}`;
  }

  private updateIbuBubble(ibu: IbuBossController): void {
    const headPos = ibu.rig.root.position
      .clone()
      .add(new THREE.Vector3(0, 2.38 * ibu.rig.worldScale, 0));
    this.projVec.copy(headPos).project(this.cam.camera);

    if (this.projVec.z > 1 || this.projVec.x < -1.1 || this.projVec.x > 1.1) {
      this.ibuBubble.classList.add('hidden');
      return;
    }

    this.ibuBubble.classList.remove('hidden');
    const x = THREE.MathUtils.clamp((this.projVec.x * 0.5 + 0.5) * window.innerWidth, 110, window.innerWidth - 110);
    const y = THREE.MathUtils.clamp((-this.projVec.y * 0.5 + 0.5) * window.innerHeight, 90, window.innerHeight - 60);
    this.ibuBubble.style.left = `${x}px`;
    this.ibuBubble.style.top = `${y}px`;

    this.ibuDialogue.textContent = ibu.activeDialogue;

    if (
      ibu.bossState === 'AngerCombat' ||
      ibu.bossState === 'ShockedFreeze' ||
      ibu.bossState === 'Mengamuk'
    ) {
      this.ibuAlertBadge.classList.remove('hidden');
      this.ibuAlertBadge.textContent = '!';
      this.ibuAlertBadge.style.background = '#ff6e5c';
    } else if (
      ibu.bossState === 'SuspiciousAlert' ||
      ibu.bossState === 'MencariKoko' ||
      ibu.bossState === 'MemeriksaSembunyi'
    ) {
      this.ibuAlertBadge.classList.remove('hidden');
      this.ibuAlertBadge.textContent = '?';
      this.ibuAlertBadge.style.background = '#ffbf52';
    } else {
      this.ibuAlertBadge.classList.add('hidden');
    }
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

    // Camera Look Drag / Swipe
    const lookZone = document.getElementById('touch-look-zone')!;
    lookZone.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      if (this.pointerLookId !== null) return;
      this.pointerLookId = e.pointerId;
      this.lastLookX = e.clientX;
      this.lastLookY = e.clientY;
      this.cam.onSwipeStart();
    });

    window.addEventListener('pointermove', (e) => {
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

    // Virtual Joystick
    const joyZone = document.getElementById('joystick-zone')!;
    const joyKnob = document.getElementById('joystick-knob')!;
    const maxRadius = 46;

    const updateJoy = (clientX: number, clientY: number) => {
      const rect = joyZone.getBoundingClientRect();
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

    joyZone.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.joyPointerId = e.pointerId;
      joyZone.setPointerCapture(e.pointerId);
      updateJoy(e.clientX, e.clientY);
    });

    joyZone.addEventListener('pointermove', (e) => {
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
    joyZone.addEventListener('pointerup', resetJoy);
    joyZone.addEventListener('pointercancel', resetJoy);

    // Mobile Touch Action Buttons
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
