import * as THREE from 'three';
import { BossState } from '../types';

export class SurfaceAlignedCamera {
  private smoothedSurfaceUp = new THREE.Vector3(0, 1, 0);
  private smoothedForward = new THREE.Vector3(0, 0, 1);
  private orbitYaw = 0;
  private orbitPitch = 0.22; // slightly elevated shoulder view by default
  private isSwiping = false;
  private recenterTimer = 0;
  private lastTargetPos = new THREE.Vector3();

  private shakeTimer = 0;
  private shakeIntensity = 0;
  private readonly defaultFov = 62;
  private readonly raycaster = new THREE.Raycaster();

  constructor(
    public readonly camera: THREE.PerspectiveCamera,
    private readonly obstacles: THREE.Object3D[]
  ) {
    this.camera.fov = this.defaultFov;
    this.camera.updateProjectionMatrix();
  }

  public reset(targetPos: THREE.Vector3): void {
    this.smoothedSurfaceUp.set(0, 1, 0);
    this.smoothedForward.set(0, 0, 1);
    this.orbitYaw = 0;
    this.orbitPitch = 0.22;
    this.isSwiping = false;
    this.recenterTimer = 0;
    this.lastTargetPos.copy(targetPos);
    this.shakeTimer = 0;
  }

  public onSwipeStart(): void {
    this.isSwiping = true;
    this.recenterTimer = 0;
  }

  public addSwipeDelta(dx: number, dy: number): void {
    this.isSwiping = true;
    this.recenterTimer = 0;
    this.orbitYaw -= dx * 0.0065;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch + dy * 0.0055,
      -0.38,
      1.12
    );
  }

  public onSwipeEnd(): void {
    this.isSwiping = false;
    this.recenterTimer = 0;
  }

  public triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
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
    bossState: BossState
  ): void {
    // Dynamic combat FOV
    const targetFov =
      bossState === 'AngerCombat' || bossState === 'Mengamuk' ? 72 : this.defaultFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 4));
      this.camera.updateProjectionMatrix();
    }

    // Smooth Up vector toward surface normal
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

    // Auto-recenter gently while moving
    const moved = targetPos.distanceToSquared(this.lastTargetPos) > 0.0002;
    this.lastTargetPos.copy(targetPos);
    if (!this.isSwiping && moved) {
      this.recenterTimer += dt;
      if (this.recenterTimer >= 1.8) {
        this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, 0, Math.min(1, dt * 1.8));
        this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, 0.22, Math.min(1, dt * 1.8));
      }
    } else if (!moved) {
      this.recenterTimer = 0;
    }

    // Compute camera orbit direction
    const yawQ = new THREE.Quaternion().setFromAxisAngle(this.smoothedSurfaceUp, this.orbitYaw);
    const lookDir = this.smoothedForward.clone().applyQuaternion(yawQ).normalize();
    const camRight = new THREE.Vector3()
      .crossVectors(lookDir, this.smoothedSurfaceUp)
      .normalize();
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(camRight, -this.orbitPitch);
    const backDir = lookDir.clone().negate().applyQuaternion(pitchQ).normalize();

    const followDist = 2.45;
    const pivot = targetPos.clone().addScaledVector(this.smoothedSurfaceUp, 0.42);
    let desiredPos = pivot.clone().addScaledVector(backDir, followDist);

    // Anti-clipping raycast against kitchen walls & furniture
    const rayDir = desiredPos.clone().sub(pivot);
    const rayLen = rayDir.length();
    if (rayLen > 0.01) {
      rayDir.divideScalar(rayLen);
      this.raycaster.set(pivot, rayDir);
      this.raycaster.near = 0;
      this.raycaster.far = rayLen;
      const hits = this.raycaster.intersectObjects(this.obstacles, false);
      if (hits.length > 0) {
        const safeDist = Math.max(0.4, hits[0].distance - 0.14);
        desiredPos = pivot.clone().addScaledVector(rayDir, safeDist);
      }
    }

    // Camera Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      desiredPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      desiredPos.y += (Math.random() - 0.5) * this.shakeIntensity;
      desiredPos.z += (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.camera.position.lerp(desiredPos, Math.min(1, dt * 14));
    this.camera.up.copy(this.smoothedSurfaceUp);
    this.camera.lookAt(pivot.clone().addScaledVector(lookDir, 0.8));
  }
}
