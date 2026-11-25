import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';

export interface MobileTouchSnapshot {
  moveX: number;
  moveY: number;
  flyHeld: boolean;
  glideHeld: boolean;
  actionHeld: boolean;
}

export function triggerMicroHaptic(ms = 12): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // Safe no-op on Safari iOS or restricted browsers
    }
  }
}

export class MobileTouchController {
  public moveX = 0;
  public moveY = 0;
  public flyHeld = false;
  public glideHeld = false;
  public actionHeld = false;

  private flyJustPressed = false;
  private dodgeJustPressed = false;
  private touchMode = false;

  // Strict per-input pointerId isolation
  private joystickPointerId: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private readonly joyMaxRadius = 46;
  private readonly joyDeadzone = 0.12;

  private cameraPointerId: number | null = null;
  private lastCamX = 0;
  private lastCamY = 0;
  private camVelX = 0;
  private camVelY = 0;

  private flyPointerId: number | null = null;
  private glidePointerId: number | null = null;
  private actionPointerId: number | null = null;

  // DOM elements
  private readonly lookZone = document.getElementById('touch-look-zone')!;
  private readonly floatingJoystick = document.getElementById('floating-joystick')!;
  private readonly joystickKnob = document.getElementById('joystick-knob')!;
  private readonly actionCluster = document.getElementById('action-cluster')!;

  private readonly btnFly = document.getElementById('btn-fly')!;
  private readonly flyStaminaRing = document.getElementById('fly-stamina-ring')!;
  private readonly btnDodge = document.getElementById('btn-dodge')!;
  private readonly dodgeCooldownEl = document.getElementById('dodge-cooldown-overlay')!;
  private readonly btnGlide = document.getElementById('btn-glide')!;
  private readonly btnAction = document.getElementById('btn-action')!;
  private readonly btnActionLabel = document.getElementById('btn-action-label')!;
  private readonly actionRing = document.getElementById('action-ring-progress')!;

  constructor(
    private readonly cam: SurfaceAlignedCamera,
    private readonly sound: ProceduralAudioEngine,
    private readonly canAcceptGameplayInput: () => boolean,
    private readonly onPointerLockRequest: () => void,
    private readonly onTouchAutoDetected: () => void
  ) {
    this.bindEvents();
  }

  public setTouchMode(enabled: boolean): void {
    this.touchMode = enabled;
    this.actionCluster.classList.toggle('hidden', !enabled);
    if (!enabled) {
      this.resetAllTouches();
    }
  }

  public resetAllTouches(): void {
    this.joystickPointerId = null;
    this.cameraPointerId = null;
    this.flyPointerId = null;
    this.glidePointerId = null;
    this.actionPointerId = null;

    this.moveX = 0;
    this.moveY = 0;
    this.flyHeld = false;
    this.glideHeld = false;
    this.actionHeld = false;
    this.flyJustPressed = false;
    this.dodgeJustPressed = false;
    this.camVelX = 0;
    this.camVelY = 0;

    this.floatingJoystick.classList.add('hidden');
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.btnFly.classList.remove('active');
    this.btnGlide.classList.remove('active');
    this.btnDodge.classList.remove('active');
    this.btnAction.classList.remove('active');
  }

  public consumeTriggers(): { flyJustPressed: boolean; dodgeJustPressed: boolean } {
    const out = {
      flyJustPressed: this.flyJustPressed,
      dodgeJustPressed: this.dodgeJustPressed,
    };
    this.flyJustPressed = false;
    this.dodgeJustPressed = false;
    return out;
  }

  public updateInertia(dt: number, isPointerLocked: boolean): void {
    if (isPointerLocked) {
      this.camVelX = 0;
      this.camVelY = 0;
      return;
    }
    if (this.cameraPointerId === null && (Math.abs(this.camVelX) > 0.05 || Math.abs(this.camVelY) > 0.05)) {
      this.cam.addSwipeDelta(this.camVelX * dt * 60, this.camVelY * dt * 60, true);
      const damping = Math.exp(-10 * dt);
      this.camVelX *= damping;
      this.camVelY *= damping;
    }
  }

  public updateButtonsVisual(params: {
    staminaRatio: number;
    dodgeCooldownRatio: number;
    isAirborne: boolean;
    hasContextualAction: boolean;
    contextualLabel: string;
    contextualProgress: number;
    isInHidingSpot: boolean;
  }): void {
    if (!this.touchMode) return;

    // 1. TERBANG stamina ring (circumference 2 * pi * 28 = 175.9)
    const circFly = 175.9;
    this.flyStaminaRing.style.strokeDashoffset = `${circFly * (1 - Math.max(0, Math.min(1, params.staminaRatio)))}`;

    // 2. ELAK cooldown overlay
    const cd = Math.max(0, Math.min(1, params.dodgeCooldownRatio));
    this.dodgeCooldownEl.classList.toggle('hidden', cd <= 0.02);
    this.dodgeCooldownEl.style.transform = `scaleY(${cd})`;
    this.btnDodge.classList.toggle('cooldown', cd > 0.02);

    // 3. LAYANG dimmed on ground/wall, lit bright when airborne
    this.btnGlide.classList.toggle('airborne-lit', params.isAirborne);

    // 4. AKSI contextual highlight & radial progress ring (circumference 2 * pi * 27 = 169.65)
    const activeCtx = params.hasContextualAction || params.isInHidingSpot;
    this.btnAction.classList.toggle('contextual-hot', params.hasContextualAction);
    this.btnAction.classList.toggle('stealth-lit', !params.hasContextualAction && params.isInHidingSpot);
    this.btnActionLabel.textContent = params.hasContextualAction
      ? params.contextualLabel
      : params.isInHidingSpot
        ? 'AMAN'
        : 'AKSI';

    const circAction = 169.65;
    this.actionRing.style.strokeDashoffset = `${circAction * (1 - Math.max(0, Math.min(1, params.contextualProgress)))}`;
    this.btnAction.classList.toggle('dimmed', !activeCtx);
  }

  private updateFloatingJoystick(clientX: number, clientY: number): void {
    let dx = clientX - this.joystickCenterX;
    let dy = clientY - this.joystickCenterY;
    const rawDist = Math.hypot(dx, dy);

    if (rawDist > this.joyMaxRadius) {
      dx = (dx / rawDist) * this.joyMaxRadius;
      dy = (dy / rawDist) * this.joyMaxRadius;
    }

    this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const norm = Math.min(1, rawDist / this.joyMaxRadius);
    if (norm <= this.joyDeadzone) {
      this.moveX = 0;
      this.moveY = 0;
      return;
    }

    const analog = (norm - this.joyDeadzone) / (1 - this.joyDeadzone);
    const dirX = dx / (rawDist || 1);
    const dirY = dy / (rawDist || 1);
    const clampedMag = Math.min(1, rawDist / this.joyMaxRadius);
    const dirNorm = Math.hypot(dirX, dirY) || 1;
    this.moveX = (dirX / dirNorm) * analog * (clampedMag > 0 ? 1 : 0);
    this.moveY = -(dirY / dirNorm) * analog * (clampedMag > 0 ? 1 : 0);
  }

  private bindEvents(): void {
    window.addEventListener(
      'touchstart',
      () => {
        if (!this.touchMode) {
          this.onTouchAutoDetected();
        }
      },
      { passive: true }
    );

    // Full-screen touch/pointer surface with strict left-vs-right & pointerId isolation
    this.lookZone.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      if (!this.canAcceptGameplayInput()) return;

      // Desktop mouse behavior: request pointer lock or drag fallback
      if (e.pointerType === 'mouse' && !this.touchMode) {
        this.onPointerLockRequest();
        if (this.cameraPointerId === null) {
          this.cameraPointerId = e.pointerId;
          this.lastCamX = e.clientX;
          this.lastCamY = e.clientY;
          this.camVelX = 0;
          this.camVelY = 0;
          this.cam.onSwipeStart();
        }
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const leftZoneLimit = w * 0.45;
      const topHudClearance = h <= 540 ? 96 : 112;

      // Left Zone (< 45% viewport width, below top HUD cards) => Floating Virtual Joystick
      if (e.clientX < leftZoneLimit && e.clientY >= topHudClearance && this.joystickPointerId === null) {
        this.joystickPointerId = e.pointerId;
        const pad = 56;
        this.joystickCenterX = Math.max(pad, Math.min(leftZoneLimit - pad * 0.65, e.clientX));
        this.joystickCenterY = Math.max(topHudClearance + pad * 0.4, Math.min(h - pad, e.clientY));

        this.floatingJoystick.style.left = `${this.joystickCenterX}px`;
        this.floatingJoystick.style.top = `${this.joystickCenterY}px`;
        this.floatingJoystick.classList.remove('hidden');
        this.updateFloatingJoystick(e.clientX, e.clientY);
        return;
      }

      // Right Zone (>= 45% viewport width or upper free area) => Multi-Touch Camera Trackpad
      if (this.cameraPointerId === null) {
        this.cameraPointerId = e.pointerId;
        this.lastCamX = e.clientX;
        this.lastCamY = e.clientY;
        this.camVelX = 0;
        this.camVelY = 0;
        this.cam.onSwipeStart();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joystickPointerId) {
        this.updateFloatingJoystick(e.clientX, e.clientY);
        return;
      }

      if (e.pointerId === this.cameraPointerId && !document.pointerLockElement) {
        const dx = e.clientX - this.lastCamX;
        const dy = e.clientY - this.lastCamY;
        this.lastCamX = e.clientX;
        this.lastCamY = e.clientY;
        this.camVelX = dx * 0.65;
        this.camVelY = dy * 0.65;
        this.cam.addSwipeDelta(dx, dy);
      }
    });

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.moveX = 0;
        this.moveY = 0;
        this.floatingJoystick.classList.add('hidden');
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
      if (e.pointerId === this.cameraPointerId) {
        this.cameraPointerId = null;
        this.cam.onSwipeEnd();
      }
      if (e.pointerId === this.flyPointerId) {
        this.flyPointerId = null;
        this.flyHeld = false;
        this.btnFly.classList.remove('active');
      }
      if (e.pointerId === this.glidePointerId) {
        this.glidePointerId = null;
        this.glideHeld = false;
        this.btnGlide.classList.remove('active');
      }
      if (e.pointerId === this.actionPointerId) {
        this.actionPointerId = null;
        this.actionHeld = false;
        this.btnAction.classList.remove('active');
      }
    };

    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);

    // Thumb-arc button bindings with dedicated pointerId capture
    this.btnFly.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      if (this.flyPointerId !== null) return;
      this.flyPointerId = e.pointerId;
      try {
        this.btnFly.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      if (!this.flyHeld) {
        this.flyJustPressed = true;
      }
      this.flyHeld = true;
      this.btnFly.classList.add('active');
    });

    this.btnGlide.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      if (this.glidePointerId !== null) return;
      this.glidePointerId = e.pointerId;
      try {
        this.btnGlide.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      this.glideHeld = true;
      this.btnGlide.classList.add('active');
    });

    this.btnDodge.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.dodgeJustPressed = true;
      this.btnDodge.classList.add('active');
      setTimeout(() => this.btnDodge.classList.remove('active'), 120);
    });

    this.btnAction.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      if (this.actionPointerId !== null) return;
      this.actionPointerId = e.pointerId;
      try {
        this.btnAction.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      this.actionHeld = true;
      this.btnAction.classList.add('active');
    });
  }
}
