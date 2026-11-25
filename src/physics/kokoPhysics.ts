import * as THREE from 'three';
import {
  AABBZone,
  ComputedStats,
  InputState,
  KokoState,
  ROOM_D,
  ROOM_H,
  ROOM_W,
  RoomBounds,
  WORLD_SCALE as S,
} from '../types';
import { KokoRig } from '../entities/kokoModel';
import { CrawlSurfaceType, ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { VFXManager } from '../vfx/VFXManager';
import { triggerMicroHaptic } from '../input/MobileTouchController';

export interface LevelPhysicsConfig {
  walkables: THREE.Object3D[];
  soapyZone: AABBZone | null;
  updraftZone: AABBZone | null;
  bounds?: RoomBounds;
}

export class KokoController {
  public state: KokoState = 'Crawling';
  // Physics collider center (separated from visual root so feet stay flush at hit.point + n * 0.004)
  public readonly position = new THREE.Vector3();
  public readonly visualPosition = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();
  public readonly quaternion = new THREE.Quaternion();
  public surfaceNormal = new THREE.Vector3(0, 1, 0);
  private targetSurfaceNormal = new THREE.Vector3(0, 1, 0);
  public isGrounded = true;
  public isOnSoapyFloor = false;
  public isInUpdraft = false;
  public isRidingFanWind = false;

  public stamina = 100;
  public maxStamina = 100;
  public isInvincible = false;
  public stageInvincible = false;

  private walkables: THREE.Object3D[];
  private soapyZone: AABBZone | null;
  private updraftZone: AABBZone | null;
  private bounds: RoomBounds = {
    halfW: ROOM_W * 0.5 * S,
    halfD: ROOM_D * 0.5 * S,
    height: ROOM_H * S,
  };

  private externalWindAccel = new THREE.Vector3();
  private zeroStaminaDrainThisFrame = false;

  private staminaRegenMult = 1;
  private dodgeCooldownDuration = 0.85;
  private dodgeImpulse = 11;
  private dodgeIframeDuration = 0.38;

  private flightTimer = 0;
  private iframeTimer = 0;
  private dodgeCooldown = 0;
  private stunTimer = 0;
  private currentYawEuler = 0;

  private readonly raycaster = new THREE.Raycaster();
  private readonly walkSpeed = 6.5;
  private readonly flyForwardSpeed = 9.0;
  private readonly flyAscendSpeed = 6.2;
  private readonly hoverGravity = 2.4;

  // Collider vs visual surface separation
  private readonly colliderRadius = 0.08;
  private readonly visualSurfaceOffset = 0.004;
  private readonly probeDist = 0.54;
  private readonly probeOffset = 0.22;

  // Reusable scratch vectors (zero per-frame GC)
  private readonly tmpOrigin = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpTargetVisual = new THREE.Vector3();
  private readonly tmpMatrix3 = new THREE.Matrix3();
  private readonly tmpWorldNormal = new THREE.Vector3();

  constructor(
    public readonly rig: KokoRig,
    config: LevelPhysicsConfig,
    private readonly sound: ProceduralAudioEngine,
    private readonly vfx: VFXManager
  ) {
    this.walkables = config.walkables;
    this.soapyZone = config.soapyZone;
    this.updraftZone = config.updraftZone;
    if (config.bounds) this.bounds = config.bounds;
  }

  public configureLevel(config: LevelPhysicsConfig): void {
    this.walkables = config.walkables;
    this.soapyZone = config.soapyZone;
    this.updraftZone = config.updraftZone;
    if (config.bounds) {
      this.bounds = config.bounds;
    } else {
      this.bounds = {
        halfW: ROOM_W * 0.5 * S,
        halfD: ROOM_D * 0.5 * S,
        height: ROOM_H * S,
      };
    }
    this.externalWindAccel.set(0, 0, 0);
    this.zeroStaminaDrainThisFrame = false;
    this.isRidingFanWind = false;
  }

  public applyStats(stats: ComputedStats): void {
    this.maxStamina = stats.maxStamina;
    this.staminaRegenMult = stats.staminaRegenMult;
    this.dodgeCooldownDuration = stats.dodgeCooldown;
    this.dodgeImpulse = stats.dodgeImpulse;
    this.dodgeIframeDuration = stats.dodgeIframeDuration;
    this.stamina = Math.min(this.maxStamina, Math.max(this.stamina, this.maxStamina));
  }

  public spawnAt(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.surfaceNormal.set(0, 1, 0);
    this.targetSurfaceNormal.set(0, 1, 0);
    this.quaternion.identity();
    this.state = 'Crawling';
    this.isGrounded = true;
    this.stamina = this.maxStamina;
    this.isInvincible = false;
    this.stageInvincible = false;
    this.iframeTimer = 0;
    this.dodgeCooldown = 0;
    this.stunTimer = 0;
    this.externalWindAccel.set(0, 0, 0);
    this.zeroStaminaDrainThisFrame = false;
    this.isRidingFanWind = false;

    const floorHit = this.raycastWalkables(
      this.tmpOrigin.set(pos.x, pos.y + 0.4, pos.z),
      this.tmpDir.set(0, -1, 0),
      1.5
    );
    if (floorHit) {
      const n = this.getWorldNormal(floorHit);
      this.surfaceNormal.copy(n);
      this.targetSurfaceNormal.copy(n);
      this.position.copy(floorHit.point).addScaledVector(n, this.colliderRadius);
      this.visualPosition.copy(floorHit.point).addScaledVector(n, this.visualSurfaceOffset);
    } else {
      this.position.y = this.colliderRadius;
      this.visualPosition.set(pos.x, this.visualSurfaceOffset, pos.z);
    }

    this.syncRigTransform(1);
    this.updateBlobShadow();
  }

  public applyWindEffect(accel: THREE.Vector3, zeroStaminaDrain: boolean): void {
    this.externalWindAccel.copy(accel);
    this.zeroStaminaDrainThisFrame = zeroStaminaDrain;
    this.isRidingFanWind = zeroStaminaDrain;
  }

  public applyKnockback(impulse: THREE.Vector3, stunDuration = 0): void {
    this.velocity.add(impulse);
    if (stunDuration > 0) {
      this.state = 'Stunned';
      this.stunTimer = stunDuration;
      this.isGrounded = false;
    }
  }

  public forceDropFromSurface(downwardImpulse = -4.5): void {
    if (this.state === 'Crawling' && this.position.y > 0.35) {
      this.isGrounded = false;
      this.surfaceNormal.set(0, 1, 0);
      this.targetSurfaceNormal.set(0, 1, 0);
      this.velocity.y = downwardImpulse;
      this.position.y -= 0.15;
    }
  }

  public get effectiveInvincible(): boolean {
    return this.isInvincible || this.stageInvincible;
  }

  public get dodgeCooldownRatio(): number {
    if (this.dodgeCooldown <= 0) return 0;
    return Math.min(1, this.dodgeCooldown / this.dodgeCooldownDuration);
  }

  public getSurfaceLabel(): string {
    if (this.state === 'Flying') return this.isRidingFanWind ? 'TERBANG · ARUS ANGIN' : 'TERBANG';
    if (this.state === 'Gliding') return this.isRidingFanWind ? 'MELAYANG · ARUS ANGIN' : 'MELAYANG';
    if (this.state === 'Stunned') return 'TERPENTAL';
    if (!this.isGrounded) return 'JATUH';
    if (this.surfaceNormal.y > 0.72) return 'MERAYAP · LANTAI';
    if (this.surfaceNormal.y < -0.72) return 'MERAYAP · PLAFON';
    return 'MERAYAP · DINDING 90°';
  }

  public update(
    dt: number,
    time: number,
    input: InputState,
    cameraForward: THREE.Vector3,
    cameraUp: THREE.Vector3
  ): void {
    if (this.iframeTimer > 0) {
      this.iframeTimer -= dt;
      if (this.iframeTimer <= 0) this.isInvincible = false;
    }
    if (this.dodgeCooldown > 0) this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    if (this.state === 'Stunned') {
      this.stunTimer -= dt;
      this.velocity.y -= 16 * dt;
      this.position.addScaledVector(this.velocity, dt);
      this.clampRoomBounds();
      if (this.position.y <= this.colliderRadius) {
        this.position.y = this.colliderRadius;
        this.velocity.multiplyScalar(0.5);
      }
      if (this.stunTimer <= 0) {
        this.state = 'Crawling';
        this.surfaceNormal.set(0, 1, 0);
        this.targetSurfaceNormal.set(0, 1, 0);
      }
      this.rig.updateAnimation(dt, time, this.state, 0);
      this.syncRigTransform(dt);
      this.updateBlobShadow();
      this.externalWindAccel.set(0, 0, 0);
      this.zeroStaminaDrainThisFrame = false;
      this.isRidingFanWind = false;
      return;
    }

    if (input.dodgeJustPressed && this.dodgeCooldown <= 0 && this.stamina >= 12) {
      this.performDodge(input, cameraForward);
    }

    if (this.state === 'Crawling') {
      this.stamina = Math.min(this.maxStamina, this.stamina + 30 * this.staminaRegenMult * dt);

      if (input.flyJustPressed && this.stamina >= 6) {
        this.takeoff();
      } else {
        this.processCrawling(dt, input, cameraForward, cameraUp);
      }
    } else if (this.state === 'Flying' || this.state === 'Gliding') {
      this.processFlight(dt, input, cameraForward);
    }

    this.clampRoomBounds();
    this.syncRigTransform(dt);
    this.updateBlobShadow();

    const planarVel = this.velocity
      .clone()
      .projectOnPlane(this.surfaceNormal)
      .length();
    this.rig.updateAnimation(dt, time, this.state, planarVel);

    // Reset per-frame wind impulses (reapplied before next step if inside cone)
    this.externalWindAccel.set(0, 0, 0);
    this.zeroStaminaDrainThisFrame = false;
    this.isRidingFanWind = false;
  }

  private takeoff(): void {
    this.state = 'Flying';
    this.flightTimer = 0;
    this.isGrounded = false;
    this.isOnSoapyFloor = false;
    this.velocity.addScaledVector(this.surfaceNormal, 4.2);
    this.position.addScaledVector(this.surfaceNormal, 0.16);
    this.sound.playTakeoff();
    triggerMicroHaptic(12);
  }

  private performDodge(input: InputState, cameraForward: THREE.Vector3): void {
    this.stamina = Math.max(0, this.stamina - 12);
    this.isInvincible = true;
    this.iframeTimer = this.dodgeIframeDuration;
    this.dodgeCooldown = this.dodgeCooldownDuration;

    const camFwd = cameraForward.clone().projectOnPlane(this.surfaceNormal);
    if (camFwd.lengthSq() < 0.001) {
      camFwd.set(0, 0, 1).applyQuaternion(this.quaternion).projectOnPlane(this.surfaceNormal);
    }
    camFwd.normalize();
    const camRight = new THREE.Vector3().crossVectors(camFwd, this.surfaceNormal).normalize();

    const dodgeDir = new THREE.Vector3();
    if (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1) {
      dodgeDir.addScaledVector(camRight, input.moveX).addScaledVector(camFwd, input.moveY);
    } else {
      dodgeDir.copy(camRight);
    }
    if (dodgeDir.lengthSq() < 0.001) dodgeDir.copy(camRight);
    dodgeDir.normalize();

    this.velocity.addScaledVector(dodgeDir, this.dodgeImpulse);
    const burstHit = this.raycastWalkables(
      this.position.clone().addScaledVector(this.surfaceNormal, 0.12),
      dodgeDir,
      this.dodgeImpulse * 0.14
    );
    const safeBurst = burstHit ? Math.max(0, burstHit.distance - 0.2) : this.dodgeImpulse * 0.11;
    this.position.addScaledVector(dodgeDir, safeBurst);
    this.vfx.spawnDodgeTrail(this.visualPosition, dodgeDir);
    this.sound.playDodgeWhoosh();
    triggerMicroHaptic(12);
  }

  private processCrawling(
    dt: number,
    input: InputState,
    cameraForward: THREE.Vector3,
    cameraUp: THREE.Vector3
  ): void {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    const span = 0.16;

    const origins = [
      this.position.clone(),
      this.position.clone().addScaledVector(forward, span),
      this.position.clone().addScaledVector(forward, -span),
      this.position.clone().addScaledVector(right, span),
      this.position.clone().addScaledVector(right, -span),
    ];

    const avgNormal = new THREE.Vector3();
    let hitCount = 0;
    let closestDist = Infinity;

    const downDir = this.surfaceNormal.clone().negate();
    for (const orig of origins) {
      const rayOrigin = orig.clone().addScaledVector(this.surfaceNormal, this.probeOffset);
      const hit = this.raycastWalkables(rayOrigin, downDir, this.probeDist + this.probeOffset);
      if (hit) {
        const hitN = this.getWorldNormal(hit);
        if (hitN.dot(this.surfaceNormal) > 0.35) {
          avgNormal.add(hitN);
          hitCount++;
          if (hit.distance < closestDist) closestDist = hit.distance;
        }
      }
    }

    let camDir = cameraForward.clone();
    const facingSurface = camDir.dot(this.surfaceNormal);
    const parallelThreshold = Math.abs(this.surfaceNormal.y) < 0.5 ? 0.5 : 0.85;
    if (Math.abs(facingSurface) > parallelThreshold) {
      camDir.copy(cameraUp).multiplyScalar(facingSurface > 0 ? -1 : 1);
    }

    let fwdBasis = camDir.projectOnPlane(this.surfaceNormal);
    if (fwdBasis.lengthSq() < 0.001) {
      fwdBasis = forward.clone().projectOnPlane(this.surfaceNormal);
    }
    fwdBasis.normalize();
    const rightBasis = new THREE.Vector3().crossVectors(fwdBasis, this.surfaceNormal).normalize();

    const inputLen = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const moveDir = new THREE.Vector3()
      .addScaledVector(fwdBasis, input.moveY)
      .addScaledVector(rightBasis, input.moveX);

    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();
    }

    // Convex edge wrapping (e.g., tabletop down over edge / chair edge / stove edge)
    if (hitCount === 0 && this.isGrounded && moveDir.lengthSq() > 0.001) {
      const wrapOrigin = this.position
        .clone()
        .addScaledVector(moveDir, 0.1)
        .addScaledVector(this.surfaceNormal, -0.18);
      const wrapBackDir = moveDir.clone().negate();
      const wrapHit = this.raycastWalkables(wrapOrigin, wrapBackDir, 0.44);
      if (wrapHit) {
        const wrapNormal = this.getWorldNormal(wrapHit);
        if (wrapNormal.dot(this.surfaceNormal) < 0.75) {
          this.targetSurfaceNormal.copy(wrapNormal);
          this.surfaceNormal.lerp(this.targetSurfaceNormal, Math.min(1, dt * 18)).normalize();
          this.position.lerp(
            wrapHit.point.clone().addScaledVector(wrapNormal, this.colliderRadius),
            Math.min(1, dt * 18)
          );
          hitCount = 1;
          closestDist = this.probeOffset + this.colliderRadius;
        }
      }
    }

    if (hitCount > 0) {
      this.isGrounded = true;
      if (avgNormal.lengthSq() > 0.001) {
        this.targetSurfaceNormal.copy(avgNormal.normalize());
      }
      this.surfaceNormal.lerp(this.targetSurfaceNormal, Math.min(1, dt * 15)).normalize();

      // Keep collider center consistently separated by colliderRadius from hit surface
      const surfaceOffset = closestDist - this.probeOffset;
      if (Math.abs(surfaceOffset) < 0.36) {
        this.position.addScaledVector(this.surfaceNormal, -(surfaceOffset - this.colliderRadius));
      }
    } else {
      this.isGrounded = false;
      this.targetSurfaceNormal.set(0, 1, 0);
      this.surfaceNormal.lerp(this.targetSurfaceNormal, Math.min(1, dt * 6)).normalize();
    }

    if (!this.isGrounded) {
      this.velocity.y -= 18 * dt;
      this.position.addScaledVector(this.velocity, dt);
      this.sound.tickCrawlSteps(dt, 0, 'floor');
      this.sound.updateWingSound(false, false, 0);

      const fallHit = this.raycastWalkables(
        this.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
        new THREE.Vector3(0, -1, 0),
        0.48
      );
      if (fallHit) {
        this.isGrounded = true;
        const n = this.getWorldNormal(fallHit);
        this.surfaceNormal.copy(n);
        this.targetSurfaceNormal.copy(n);
        this.position.copy(fallHit.point).addScaledVector(this.surfaceNormal, this.colliderRadius);
        this.velocity.set(0, 0, 0);
      }
      return;
    }

    // Concave corner climb (floor -> wall, floor -> table leg, wall -> ceiling)
    if (inputLen > 0.05 && moveDir.lengthSq() > 0.001) {
      const probeStart = this.position.clone().addScaledVector(this.surfaceNormal, 0.14);
      const wallReach = 0.28 + this.walkSpeed * dt;
      const wallHit = this.raycastWalkables(probeStart, moveDir, wallReach);
      if (wallHit) {
        const wallNormal = this.getWorldNormal(wallHit);
        if (wallNormal.dot(this.surfaceNormal) < 0.72 && wallNormal.dot(moveDir) < -0.3) {
          const rot = new THREE.Quaternion().setFromUnitVectors(this.surfaceNormal, wallNormal);
          this.targetSurfaceNormal.copy(wallNormal);
          this.surfaceNormal.lerp(wallNormal, Math.min(1, dt * 18)).normalize();
          moveDir.applyQuaternion(rot).normalize();
          this.position.lerp(
            wallHit.point.clone().addScaledVector(wallNormal, this.colliderRadius),
            Math.min(1, dt * 18)
          );
        }
      }
    }

    this.isOnSoapyFloor = this.soapyZone ? this.containsPoint(this.soapyZone, this.position) : false;

    const targetVel = moveDir.clone().multiplyScalar(this.walkSpeed * inputLen);
    // Apply external wind knockback while crawling in open wind cone
    if (this.externalWindAccel.lengthSq() > 0.001) {
      const windPlanar = this.externalWindAccel.clone().projectOnPlane(this.surfaceNormal);
      targetVel.addScaledVector(windPlanar, 0.48);
    }

    if (this.isOnSoapyFloor) {
      const slipBoost = targetVel.multiplyScalar(1.45);
      this.velocity.lerp(slipBoost, Math.min(1, dt * 3.0));
    } else {
      this.velocity.lerp(targetVel, Math.min(1, dt * 16));
    }

    this.position.addScaledVector(this.velocity, dt);

    // Align Koko's local +Y axis smoothly with surfaceNormal via quaternion.slerp
    const upVec = this.surfaceNormal.clone().normalize();
    let fwdVec =
      inputLen > 0.05 && moveDir.lengthSq() > 0.001
        ? moveDir.clone().projectOnPlane(upVec)
        : forward.clone().projectOnPlane(upVec);

    if (fwdVec.lengthSq() < 0.001) {
      fwdVec = new THREE.Vector3(0, 0, 1).projectOnPlane(upVec);
      if (fwdVec.lengthSq() < 0.001) fwdVec.set(1, 0, 0);
    }
    fwdVec.normalize();

    const rightVec = new THREE.Vector3().crossVectors(upVec, fwdVec).normalize();
    const basis = new THREE.Matrix4().makeBasis(rightVec, upVec, fwdVec);
    const targetQ = new THREE.Quaternion().setFromRotationMatrix(basis);
    this.quaternion.slerp(targetQ, Math.min(1, dt * 14));

    this.sound.updateWingSound(false, false, 0);
    const surfaceType: CrawlSurfaceType =
      this.surfaceNormal.y > 0.72 ? 'floor' : this.surfaceNormal.y < -0.72 ? 'ceiling' : 'wall';
    const crawlSpeed = inputLen > 0.08 && this.isGrounded ? this.velocity.length() : 0;
    this.sound.tickCrawlSteps(dt, crawlSpeed, surfaceType);
  }

  private processFlight(dt: number, input: InputState, cameraForward: THREE.Vector3): void {
    this.flightTimer += dt;
    this.sound.tickCrawlSteps(dt, 0, 'floor');

    let ascending = input.flyHeld;
    let gliding = input.glideHeld;
    const inputLen = Math.min(1, Math.hypot(input.moveX, input.moveY));

    if (!this.zeroStaminaDrainThisFrame) {
      if (ascending || inputLen > 0.05) {
        this.stamina = Math.max(0, this.stamina - 12 * dt);
        if (this.stamina <= 0) {
          ascending = false;
          gliding = true;
        }
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + 16 * this.staminaRegenMult * dt);
      }
    }

    this.state = gliding && !ascending ? 'Gliding' : 'Flying';

    const camFlatFwd = new THREE.Vector3(cameraForward.x, 0, cameraForward.z);
    if (camFlatFwd.lengthSq() < 0.001) camFlatFwd.set(0, 0, 1);
    camFlatFwd.normalize();
    const camFlatRight = new THREE.Vector3()
      .crossVectors(camFlatFwd, new THREE.Vector3(0, 1, 0))
      .normalize();

    const horizDir = new THREE.Vector3()
      .addScaledVector(camFlatFwd, input.moveY)
      .addScaledVector(camFlatRight, input.moveX);

    if (horizDir.lengthSq() > 0.005) {
      horizDir.normalize();
      this.currentYawEuler = Math.atan2(horizDir.x, horizDir.z);
    } else {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
      this.currentYawEuler = Math.atan2(fwd.x, fwd.z);
    }

    const desiredHorizVel = horizDir.multiplyScalar(this.flyForwardSpeed * inputLen);
    let verticalVel = ascending
      ? this.flyAscendSpeed
      : gliding
        ? -this.hoverGravity * 0.55
        : -this.hoverGravity;

    this.isInUpdraft = this.updraftZone ? this.containsPoint(this.updraftZone, this.position) : false;
    if (this.isInUpdraft) {
      verticalVel += 8.5;
      const t = performance.now() * 0.006;
      desiredHorizVel.x += Math.sin(t) * 2.4;
      desiredHorizVel.z += Math.cos(t * 1.3) * 2.4;
    }

    // Wind-tunnel glide boost from OscillatingFan
    if (this.externalWindAccel.lengthSq() > 0.001) {
      desiredHorizVel.x += this.externalWindAccel.x;
      desiredHorizVel.z += this.externalWindAccel.z;
      verticalVel += this.externalWindAccel.y;
    }

    const desiredVel = new THREE.Vector3(desiredHorizVel.x, verticalVel, desiredHorizVel.z);
    this.velocity.lerp(desiredVel, Math.min(1, dt * 6.5));

    const speed = this.velocity.length();
    if (speed > 0.05) {
      const moveDir = this.velocity.clone().normalize();
      const hit = this.raycastWalkables(this.position, moveDir, speed * dt + 0.3);
      if (hit) {
        const normal = this.getWorldNormal(hit);
        if (!ascending && this.flightTimer > 0.3) {
          this.landOnSurface(hit.point, normal);
          return;
        } else {
          const dot = this.velocity.dot(normal);
          if (dot < 0) this.velocity.addScaledVector(normal, -dot);
        }
      }
    }

    this.position.addScaledVector(this.velocity, dt);

    if (!ascending && this.flightTimer > 0.35) {
      const groundHit = this.raycastWalkables(
        this.position.clone().add(new THREE.Vector3(0, 0.15, 0)),
        new THREE.Vector3(0, -1, 0),
        0.38
      );
      if (groundHit) {
        this.landOnSurface(groundHit.point, this.getWorldNormal(groundHit));
        return;
      }
    }

    const pitch = input.moveY * 0.24;
    const roll = -input.moveX * 0.32;
    const euler = new THREE.Euler(pitch, this.currentYawEuler, roll, 'YXZ');
    const targetQ = new THREE.Quaternion().setFromEuler(euler);
    this.quaternion.slerp(targetQ, Math.min(1, dt * 7));

    this.sound.updateWingSound(true, this.state === 'Gliding', this.velocity.y);
  }

  private landOnSurface(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.state = 'Crawling';
    this.isGrounded = true;
    this.surfaceNormal.copy(normal).normalize();
    this.targetSurfaceNormal.copy(this.surfaceNormal);
    this.position.copy(point).addScaledVector(this.surfaceNormal, this.colliderRadius);
    this.visualPosition.copy(point).addScaledVector(this.surfaceNormal, this.visualSurfaceOffset);
    this.velocity.set(0, 0, 0);
    this.sound.updateWingSound(false, false, 0);
    this.sound.playLanding();
  }

  private clampRoomBounds(): void {
    // Allow closer proximity when crawling so Koko adheres cleanly to interior walls and ceiling
    const wallPad = this.state === 'Crawling' && this.isGrounded ? 0.06 : 0.16;
    const maxX = this.bounds.halfW - wallPad;
    const maxZ = this.bounds.halfD - wallPad;
    const maxY = this.bounds.height - wallPad;

    if (this.position.x < -maxX) this.position.x = -maxX;
    if (this.position.x > maxX) this.position.x = maxX;
    if (this.position.z < -maxZ) this.position.z = -maxZ;
    if (this.position.z > maxZ) this.position.z = maxZ;
    if (this.position.y < this.colliderRadius) {
      this.position.y = this.colliderRadius;
      if (this.state === 'Flying' || this.state === 'Gliding') {
        this.landOnSurface(
          new THREE.Vector3(this.position.x, 0, this.position.z),
          new THREE.Vector3(0, 1, 0)
        );
      }
    }
    if (this.position.y > maxY) this.position.y = maxY;
  }

  private updateBlobShadow(): void {
    if (this.state === 'Crawling' && this.isGrounded) {
      this.rig.blobShadow.visible = true;
      this.rig.blobShadow.position
        .copy(this.visualPosition)
        .addScaledVector(this.surfaceNormal, 0.002);
      this.rig.blobShadow.quaternion.copy(this.quaternion);
      this.rig.blobShadow.scale.setScalar(1.0);
      (this.rig.blobShadow.material as THREE.MeshBasicMaterial).opacity = 0.85;
      return;
    }

    const hit = this.raycastWalkables(
      this.tmpOrigin.set(this.position.x, this.position.y + 0.1, this.position.z),
      this.tmpDir.set(0, -1, 0),
      26
    );
    if (hit) {
      const hitNormal = this.getWorldNormal(hit);
      this.rig.blobShadow.visible = true;
      this.rig.blobShadow.position.copy(hit.point).addScaledVector(hitNormal, 0.002);
      this.rig.blobShadow.quaternion.setFromUnitVectors(
        this.tmpDir.set(0, 1, 0),
        hitNormal
      );
      const height = Math.max(0, this.position.y - hit.point.y);
      const scale = Math.max(0.28, 1.0 - height * 0.08);
      this.rig.blobShadow.scale.setScalar(scale);
      (this.rig.blobShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0.14,
        0.8 - height * 0.055
      );
    } else {
      this.rig.blobShadow.visible = false;
    }
  }

  private raycastWalkables(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    far: number
  ): THREE.Intersection | null {
    this.raycaster.set(origin, dir);
    this.raycaster.near = 0;
    this.raycaster.far = far;
    const hits = this.raycaster.intersectObjects(this.walkables, false);
    return hits.length > 0 ? hits[0] : null;
  }

  private getWorldNormal(hit: THREE.Intersection): THREE.Vector3 {
    if (!hit.face) return new THREE.Vector3(0, 1, 0);
    this.tmpMatrix3.getNormalMatrix(hit.object.matrixWorld);
    return this.tmpWorldNormal.copy(hit.face.normal).applyMatrix3(this.tmpMatrix3).normalize();
  }

  private containsPoint(zone: AABBZone, p: THREE.Vector3): boolean {
    return (
      p.x >= zone.min.x &&
      p.x <= zone.max.x &&
      p.y >= zone.min.y &&
      p.y <= zone.max.y &&
      p.z >= zone.min.z &&
      p.z <= zone.max.z
    );
  }

  private syncRigTransform(dt: number): void {
    if (this.state === 'Crawling' && this.isGrounded) {
      // Perpendicular surface-lock raycast: place visual feet flush at hit.point + surfaceNormal * 0.004
      this.tmpOrigin.copy(this.position).addScaledVector(this.surfaceNormal, 0.26);
      this.tmpDir.copy(this.surfaceNormal).negate();
      const snapHit = this.raycastWalkables(this.tmpOrigin, this.tmpDir, 0.85);
      if (snapHit) {
        const hitN = this.getWorldNormal(snapHit);
        if (hitN.dot(this.surfaceNormal) > 0.35) {
          this.tmpTargetVisual
            .copy(snapHit.point)
            .addScaledVector(this.surfaceNormal, this.visualSurfaceOffset);
          const distSq = this.visualPosition.distanceToSquared(this.tmpTargetVisual);
          if (distSq > 0.04) {
            this.visualPosition.lerp(this.tmpTargetVisual, Math.min(1, dt * 24));
          } else {
            this.visualPosition.copy(this.tmpTargetVisual);
          }
        } else {
          this.visualPosition.copy(this.position).addScaledVector(this.surfaceNormal, -this.colliderRadius + this.visualSurfaceOffset);
        }
      } else {
        this.visualPosition.copy(this.position).addScaledVector(this.surfaceNormal, -this.colliderRadius + this.visualSurfaceOffset);
      }
    } else {
      this.visualPosition.lerp(this.position, Math.min(1, dt * 20));
    }

    this.rig.root.position.copy(this.visualPosition);
    this.rig.root.quaternion.copy(this.quaternion);
  }
}
