import * as THREE from 'three';
import { ROOM_D, ROOM_H, ROOM_W, RoomBounds, WORLD_SCALE as S } from '../types';

export class SurfaceAlignedCamera {
  private smoothedSurfaceUp = new THREE.Vector3(0, 1, 0);
  private smoothedForward = new THREE.Vector3(0, 0, 1);
  private orbitYaw = 0;
  private orbitPitch = 0.22;
  private isSwiping = false;
  private isPointerLocked = false;
  private recenterTimer = 0;
  private lastTargetPos = new THREE.Vector3();
  private currentFollowDist = 2.45;

  private sensitivity = 1.0;
  private invertY = false;
  private autoFollow = true;
  private menuOrbitMode = true;
  private menuOrbitAngle = 0.45;

  private shakeTimer = 0;
  private shakeIntensity = 0;
  private readonly defaultFov = 62;
  private readonly raycaster = new THREE.Raycaster();
  private readonly sphereRadius = 0.24;

  private obstacles: THREE.Object3D[];
  private bounds: RoomBounds = {
    halfW: ROOM_W * 0.5 * S,
    halfD: ROOM_D * 0.5 * S,
    height: ROOM_H * S,
  };

  constructor(
    public readonly camera: THREE.PerspectiveCamera,
    obstacles: THREE.Object3D[]
  ) {
    this.obstacles = obstacles;
    this.camera.fov = this.defaultFov;
    this.camera.updateProjectionMatrix();
  }

  public configureLevel(obstacles: THREE.Object3D[], bounds?: RoomBounds): void {
    this.obstacles = obstacles;
    this.bounds = bounds ?? {
      halfW: ROOM_W * 0.5 * S,
      halfD: ROOM_D * 0.5 * S,
      height: ROOM_H * S,
    };
  }

  public reset(targetPos: THREE.Vector3): void {
    this.smoothedSurfaceUp.set(0, 1, 0);
    this.smoothedForward.set(0, 0, 1);
    this.orbitYaw = 0;
    this.orbitPitch = 0.22;
    this.isSwiping = false;
    this.recenterTimer = 0;
    this.lastTargetPos.copy(targetPos);
    this.currentFollowDist = 2.45;
    this.shakeTimer = 0;
  }

  public setPointerLocked(locked: boolean): void {
    this.isPointerLocked = locked;
    if (locked) this.recenterTimer = 0;
  }

  public setSensitivity(value: number): void {
    this.sensitivity = Math.max(0.2, Math.min(2.5, value));
  }

  public setInvertY(invert: boolean): void {
    this.invertY = invert;
  }

  public setAutoFollow(enabled: boolean): void {
    this.autoFollow = enabled;
  }

  public setMenuOrbit(enabled: boolean): void {
    if (this.menuOrbitMode === enabled) return;
    this.menuOrbitMode = enabled;
    if (!enabled) {
      this.orbitYaw = 0;
      this.orbitPitch = 0.22;
      this.recenterTimer = 0;
    }
  }

  public onSwipeStart(): void {
    this.isSwiping = true;
    this.recenterTimer = 0;
  }

  public addSwipeDelta(dx: number, dy: number, isInertia = false): void {
    if (!isInertia) {
      this.isSwiping = true;
      this.recenterTimer = 0;
    }
    const baseSens = this.isPointerLocked ? 0.0036 : 0.0065;
    const sens = baseSens * this.sensitivity;
    const ySign = this.invertY ? -1 : 1;
    this.orbitYaw -= dx * sens;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch + dy * sens * 0.85 * ySign,
      -0.42,
      1.15
    );
  }

  public onSwipeEnd(): void {
    this.isSwiping = false;
    this.recenterTimer = 0;
  }

  public triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  public getForward(out = new THREE.Vector3()): THREE.Vector3 {
    return this.camera.getWorldDirection(out);
  }

  public getUp(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();
  }

  public update(
    dt: number,
    targetPos: THREE.Vector3,
    targetQuat: THREE.Quaternion,
    surfaceNormal: THREE.Vector3,
    combatWideFov = false
  ): void {
    if (this.menuOrbitMode) {
      this.menuOrbitAngle += dt * 0.24;
      const orbitDist = 2.15;
      const pivot = targetPos.clone().add(new THREE.Vector3(0, 0.34, 0));
      const dir = new THREE.Vector3(
        Math.sin(this.menuOrbitAngle),
        0.38,
        Math.cos(this.menuOrbitAngle)
      ).normalize();

      let safeDist = orbitDist;
      this.raycaster.set(pivot, dir);
      this.raycaster.near = 0;
      this.raycaster.far = orbitDist + 0.1;
      const hits = this.raycaster.intersectObjects(this.obstacles, false);
      if (hits.length > 0) {
        safeDist = Math.max(0.55, hits[0].distance - this.sphereRadius);
      }

      const desired = pivot.clone().addScaledVector(dir, safeDist);
      const pad = 0.25;
      desired.x = THREE.MathUtils.clamp(desired.x, -this.bounds.halfW + pad, this.bounds.halfW - pad);
      desired.z = THREE.MathUtils.clamp(desired.z, -this.bounds.halfD + pad, this.bounds.halfD - pad);
      desired.y = THREE.MathUtils.clamp(desired.y, 0.28, this.bounds.height - pad);

      this.camera.position.lerp(desired, Math.min(1, dt * 4));
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(pivot);
      return;
    }

    const targetFov = combatWideFov ? 72 : this.defaultFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 4));
      this.camera.updateProjectionMatrix();
    }

    this.smoothedSurfaceUp
      .lerp(surfaceNormal, Math.min(1, dt / 0.32))
      .normalize();

    const targetForward = new THREE.Vector3(0, 0, 1).applyQuaternion(targetQuat);
    let forwardOnPlane = targetForward.clone().projectOnPlane(this.smoothedSurfaceUp);
    if (forwardOnPlane.lengthSq() < 0.001) {
      forwardOnPlane.set(0, 0, 1);
    }
    forwardOnPlane.normalize();
    this.smoothedForward.lerp(forwardOnPlane, Math.min(1, dt / 0.3)).normalize();

    const moved = targetPos.distanceToSquared(this.lastTargetPos) > 0.0002;
    this.lastTargetPos.copy(targetPos);
    if (this.autoFollow && !this.isSwiping && !this.isPointerLocked && moved) {
      this.recenterTimer += dt;
      if (this.recenterTimer >= 0.85) {
        this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, 0, Math.min(1, dt * 2.1));
        this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, 0.22, Math.min(1, dt * 2.1));
      }
    } else if (!moved) {
      this.recenterTimer = 0;
    }

    const yawQ = new THREE.Quaternion().setFromAxisAngle(this.smoothedSurfaceUp, this.orbitYaw);
    const lookDir = this.smoothedForward.clone().applyQuaternion(yawQ).normalize();
    const camRight = new THREE.Vector3()
      .crossVectors(lookDir, this.smoothedSurfaceUp)
      .normalize();
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(camRight, -this.orbitPitch);
    const backDir = lookDir.clone().negate().applyQuaternion(pitchQ).normalize();

    const maxFollowDist = 2.45;
    const pivot = targetPos.clone().addScaledVector(this.smoothedSurfaceUp, 0.42);

    let safeDist = maxFollowDist;
    const probeOffsets = [
      new THREE.Vector3(0, 0, 0),
      camRight.clone().multiplyScalar(this.sphereRadius),
      camRight.clone().multiplyScalar(-this.sphereRadius),
      this.smoothedSurfaceUp.clone().multiplyScalar(this.sphereRadius),
      this.smoothedSurfaceUp.clone().multiplyScalar(-this.sphereRadius * 0.6),
    ];

    for (const off of probeOffsets) {
      const origin = pivot.clone().add(off);
      this.raycaster.set(origin, backDir);
      this.raycaster.near = 0;
      this.raycaster.far = maxFollowDist + 0.1;
      const hits = this.raycaster.intersectObjects(this.obstacles, false);
      if (hits.length > 0) {
        const candidate = Math.max(0.38, hits[0].distance - this.sphereRadius);
        if (candidate < safeDist) safeDist = candidate;
      }
    }

    const distRate = safeDist < this.currentFollowDist ? 24 : 8;
    this.currentFollowDist = THREE.MathUtils.lerp(
      this.currentFollowDist,
      safeDist,
      Math.min(1, dt * distRate)
    );

    const desiredPos = pivot.clone().addScaledVector(backDir, this.currentFollowDist);

    const pad = 0.2;
    desiredPos.x = THREE.MathUtils.clamp(desiredPos.x, -this.bounds.halfW + pad, this.bounds.halfW - pad);
    desiredPos.z = THREE.MathUtils.clamp(desiredPos.z, -this.bounds.halfD + pad, this.bounds.halfD - pad);
    desiredPos.y = THREE.MathUtils.clamp(desiredPos.y, 0.16, this.bounds.height - pad);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      desiredPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      desiredPos.y += (Math.random() - 0.5) * this.shakeIntensity;
      desiredPos.z += (Math.random() - 0.5) * this.shakeIntensity;
      if (this.shakeTimer <= 0) this.shakeIntensity = 0;
    }

    this.camera.position.lerp(desiredPos, Math.min(1, dt * 18));
    this.camera.up.copy(this.smoothedSurfaceUp);
    this.camera.lookAt(pivot.clone().addScaledVector(lookDir, 0.8));
  }
}
