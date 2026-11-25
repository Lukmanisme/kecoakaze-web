import { InputState, KokoState } from '../types';

const TUTORIAL_DONE_KEY = 'kecoakaze_tutorial_done';

export class MicroTutorial {
  private active = false;
  private step = 0; // 0..3
  private stepElapsed = 0;
  private readonly stepDuration = 3.75;

  private readonly card = document.getElementById('micro-tutorial-card')!;
  private readonly stepBadge = document.getElementById('tutorial-step-badge')!;
  private readonly textEl = document.getElementById('tutorial-text')!;
  private readonly progressFill = document.getElementById('tutorial-progress-fill')!;
  private readonly skipBtn = document.getElementById('btn-tutorial-skip')!;

  constructor() {
    this.skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.complete();
    });
  }

  public shouldRunOnStart(): boolean {
    try {
      return window.localStorage.getItem(TUTORIAL_DONE_KEY) !== 'true';
    } catch {
      return false;
    }
  }

  public startIfFirstTime(isTouchMode: boolean): void {
    if (!this.shouldRunOnStart()) {
      this.hide();
      return;
    }
    this.start(isTouchMode);
  }

  public resetAndStart(isTouchMode: boolean): void {
    try {
      window.localStorage.removeItem(TUTORIAL_DONE_KEY);
    } catch {
      // Ignore storage error
    }
    this.start(isTouchMode);
  }

  public start(isTouchMode: boolean): void {
    this.active = true;
    this.step = 0;
    this.stepElapsed = 0;
    this.renderStep(isTouchMode);
    this.card.classList.remove('hidden');
  }

  public hide(): void {
    this.active = false;
    this.card.classList.add('hidden');
  }

  public complete(): void {
    this.active = false;
    this.card.classList.add('hidden');
    try {
      window.localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  }

  public update(
    dt: number,
    isActiveGameplay: boolean,
    isTouchMode: boolean,
    input: InputState,
    kokoState: KokoState,
    isNearTarget: boolean,
    isHiding: boolean
  ): void {
    if (!this.active) return;

    if (!isActiveGameplay) {
      this.card.classList.add('hidden');
      return;
    }
    this.card.classList.remove('hidden');

    this.stepElapsed += dt;
    let actionSatisfied = false;

    if (this.stepElapsed >= 0.75) {
      if (this.step === 0) {
        actionSatisfied = Math.hypot(input.moveX, input.moveY) > 0.35;
      } else if (this.step === 1) {
        actionSatisfied = kokoState === 'Flying' || kokoState === 'Gliding' || input.flyHeld;
      } else if (this.step === 2) {
        actionSatisfied = input.actionHeld && isNearTarget;
      } else if (this.step === 3) {
        actionSatisfied = input.dodgeJustPressed || isHiding;
      }
    }

    if (actionSatisfied || this.stepElapsed >= this.stepDuration) {
      this.step += 1;
      this.stepElapsed = 0;
      if (this.step >= 4) {
        this.complete();
        return;
      }
    }

    this.renderStep(isTouchMode);
    const totalPct = ((this.step + Math.min(1, this.stepElapsed / this.stepDuration)) / 4) * 100;
    this.progressFill.style.width = `${Math.round(totalPct)}%`;
  }

  private renderStep(isTouchMode: boolean): void {
    this.stepBadge.textContent = `TUTORIAL ${this.step + 1}/4`;
    const messages = isTouchMode
      ? [
          'Geser sisi kiri layar (Joystick) untuk merayap ke dinding & meja.',
          'Tahan TERBANG untuk naik, tahan LAYANG saat di udara.',
          'Dekati target berkilau & tahan tombol AKSI sampai penuh.',
          'Tekan ELAK saat bahaya merah muncul, atau masuk zona SEMBUNYI.',
        ]
      : [
          'Gunakan WASD untuk merayap 360° naik ke dinding & meja.',
          'Tahan Spasi untuk terbang naik, tahan Shift untuk melayang.',
          'Dekati target berkilau & tahan E / F sampai penuh.',
          'Tekan Q (ELAK) saat tanda bahaya merah muncul, atau masuk SEMBUNYI.',
        ];
    this.textEl.textContent = messages[this.step] ?? '';
  }
}
