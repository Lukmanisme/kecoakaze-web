import * as THREE from 'three';
import {
  AABBZone,
  InputState,
  KokoState,
  ROOM_D,
  ROOM_H,
  ROOM_W,
  WORLD_SCALE as S,
} from '../types';
import { KokoRig } from '../entities/kokoModel';
import { SoundEngine } from '../audio/soundEngine';

export class KokoController {
  public state: KokoState = 'Crawling';
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();
  public readonly quaternion = new THREE.Quaternion();
  public surfaceNormal = new THREE.Vector3(0, 1, 0);
  public isGrounded = true;
  public isOnSoapyFloor = false;
  public isInUpdraft = false;

  public stamina = 100;
  public readonly maxStamina = 100;
  public isInvincible = false;
  public stageInvincible = false;

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
  private readonly probeDist = 0.52;
  private readonly probeOffset = 0.16;

  constructor(
    private readonly rig: KokoRig,
    private readonly walkables: THREE.Object3D[],
    private readonly soapyZone: AABBZone,
    private readonly updraftZone: AABBZone,
    private readonly sound: SoundEngine
  ) {}

  public spawnAt(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.surfaceNormal.set(0, 1, 0);
    this.quaternion.identity();
    this.state = 'Crawling';
    this.isGrounded = true;
    this.stamina = this.maxStamina;
    this.isInvincible = false;
    this.stageInvincible = false;
    this.iframeTimer = 0;
    this.dodgeCooldown = 0;
    this.stunTimer = 0;
    this.syncRigTransform();
  }

  public get effectiveInvincible(): boolean {
    return this.isInvincible || this.stageInvincible;
  }

  public getSurfaceLabel(): string {
    if (this.state === 'Flying') return 'TERBANG';
    if (this.state === 'Gliding') return 'MELAYANG';
    if (this.state === 'Stunned') return 'PUSING';
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
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

    if (this.state === 'Stunned') {
      this.stunTimer -= dt;
      this.velocity.y -= 16 * dt;
      this.position.addScaledVector(this.velocity, dt);
      this.clampRoomBounds();
      if (this.position.y <= 0.08) {
        this.position.y = 0.08;
        this.velocity.set(0, 0, 0);
      }
      if (this.stunTimer <= 0) {
        this.state = 'Crawling';
        this.surfaceNormal.set(0, 1, 0);
      }
      this.rig.updateAnimation(dt, time, this.state, 0);
      this.syncRigTransform();
      return;
    }

    // Dodge action
    if (input.dodgeJustPressed && this.dodgeCooldown <= 0 && this.stamina >= 15) {
      this.performDodge(input);
    }

    if (this.state === 'Crawling') {
      this.stamina = Math.min(this.maxStamina, this.stamina + 30 * dt);

      if (input.flyJustPressed && this.stamina >= 6) {
        this.takeoff();
      } else {
        this.processCrawling(dt, input, cameraForward, cameraUp);
      }
    } else if (this.state === 'Flying' || this.state === 'Gliding') {
      this.processFlight(dt, input, cameraForward);
    }

    this.clampRoomBounds();
    this.updateBlobShadow();

    const planarVel = this.velocity
      .clone()
      .projectOnPlane(this.surfaceNormal)
      .length();
    this.rig.updateAnimation(dt, time, this.state, planarVel);
    this.syncRigTransform();
  }

  private takeoff(): void {
    this.state = 'Flying';
    this.flightTimer = 0;
    this.isGrounded = false;
    this.isOnSoapyFloor = false;
    this.velocity.addScaledVector(this.surfaceNormal, 4.2);
    this.position.addScaledVector(this.surfaceNormal, 0.16);
    this.sound.playTakeoff();
  }

  private performDodge(input: InputState): void {
    this.stamina = Math.max(0, this.stamina - 15);
    this.isInvincible = true;
    this.iframeTimer = 0.38;
    this.dodgeCooldown = 0.85;

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const dir =
      Math.abs(input.moveX) > 0.1
        ? right.multiplyScalar(Math.sign(input.moveX))
        : input.moveY < -0.1
          ? forward.multiplyScalar(-1)
          : right;

    this.velocity.addScaledVector(dir.normalize(), 11);
    this.sound.playDodge();
  }

  private processCrawling(
    dt: number,
    input: InputState,
    cameraForward: THREE.Vector3,
    cameraUp: THREE.Vector3
  ): void {
    // 5-Point Surface Probe
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    const span = 0.24;

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
        const n = this.getWorldNormal(hit);
        avgNormal.add(n);
        hitCount++;
        if (hit.distance < closestDist) closestDist = hit.distance;
      }
    }

    if (hitCount > 0) {
      this.isGrounded = true;
      avgNormal.normalize();
      this.surfaceNormal.lerp(avgNormal, Math.min(1, dt * 14)).normalize();

      // Snap cleanly to surface distance
      const surfaceOffset = closestDist - this.probeOffset;
      if (Math.abs(surfaceOffset) < 0.35) {
        this.position.addScaledVector(this.surfaceNormal, -(surfaceOffset - 0.02));
      }
    } else {
      this.isGrounded = false;
      this.surfaceNormal.lerp(new THREE.Vector3(0, 1, 0), Math.min(1, dt * 6)).normalize();
    }

    if (!this.isGrounded) {
      this.velocity.y -= 18 * dt;
      this.position.addScaledVector(this.velocity, dt);
      this.sound.setCrawlActive(false);

      // Try catching floor/surface during fall
      const fallHit = this.raycastWalkables(
        this.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
        new THREE.Vector3(0, -1, 0),
        0.45
      );
      if (fallHit) {
        this.isGrounded = true;
        this.surfaceNormal.copy(this.getWorldNormal(fallHit));
        this.position.copy(fallHit.point).addScaledVector(this.surfaceNormal, 0.02);
        this.velocity.set(0, 0, 0);
      }
      return;
    }

    // Camera-relative basis projected onto current surface plane
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

      // Check forward wall/corner transition to climb onto walls, counters, fridge, ceiling
      const probeStart = this.position.clone().addScaledVector(this.surfaceNormal, 0.24);
      const wallReach = 0.45 + this.walkSpeed * dt;
      const wallHit = this.raycastWalkables(probeStart, moveDir, wallReach);
      if (wallHit) {
        const wallNormal = this.getWorldNormal(wallHit);
        if (wallNormal.dot(this.surfaceNormal) < 0.72 && wallNormal.dot(moveDir) < -0.35) {
          const rot = new THREE.Quaternion().setFromUnitVectors(this.surfaceNormal, wallNormal);
          this.surfaceNormal.copy(wallNormal);
          moveDir.applyQuaternion(rot).normalize();
          this.position.copy(wallHit.point).addScaledVector(this.surfaceNormal, 0.03);
        }
      }
    }

    // Check Soapy Floor Hazard
    this.isOnSoapyFloor = this.containsPoint(this.soapyZone, this.position);

    const targetVel = moveDir.clone().multiplyScalar(this.walkSpeed * inputLen);
    if (this.isOnSoapyFloor) {
      // Slippery soap slide: preserve momentum + boost speed
      const slipBoost = targetVel.multiplyScalar(1.45);
      this.velocity.lerp(slipBoost, Math.min(1, dt * 3.0));
    } else {
      this.velocity.lerp(targetVel, Math.min(1, dt * 16));
    }

    this.position.addScaledVector(this.velocity, dt);

    // Align quaternion Up to surfaceNormal, and Forward to moveDir
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    const alignQ = new THREE.Quaternion().setFromUnitVectors(currentUp, this.surfaceNormal);
    const targetQ = alignQ.multiply(this.quaternion.clone());
    this.quaternion.slerp(targetQ, Math.min(1, dt * 14));

    if (inputLen > 0.05 && moveDir.lengthSq() > 0.001) {
      const lookM = new THREE.Matrix4().lookAt(
        moveDir,
        new THREE.Vector3(0, 0, 0),
        this.surfaceNormal
      );
      const lookQ = new THREE.Quaternion().setFromRotationMatrix(lookM);
      this.quaternion.slerp(lookQ, Math.min(1, dt * 10));
    }

    this.sound.setFlightBuzz(false, 0);
    this.sound.setCrawlActive(inputLen > 0.08 && this.isGrounded);
  }

  private processFlight(dt: number, input: InputState, cameraForward: THREE.Vector3): void {
    this.flightTimer += dt;
    this.sound.setCrawlActive(false);

    let ascending = input.flyHeld;
    let gliding = input.glideHeld;
    const inputLen = Math.min(1, Math.hypot(input.moveX, input.moveY));

    if (ascending || inputLen > 0.05) {
      this.stamina = Math.max(0, this.stamina - 12 * dt);
      if (this.stamina <= 0) {
        ascending = false;
        gliding = true;
      }
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 16 * dt);
    }

    this.state = gliding && !ascending ? 'Gliding' : 'Flying';

    // Camera-relative horizontal flight steering (intuitive for both desktop & mobile)
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

    // Thermal Updraft above Kompor Gas
    this.isInUpdraft = this.containsPoint(this.updraftZone, this.position);
    if (this.isInUpdraft) {
      verticalVel += 8.5;
      const t = performance.now() * 0.006;
      desiredHorizVel.x += Math.sin(t) * 2.4;
      desiredHorizVel.z += Math.cos(t * 1.3) * 2.4;
    }

    const desiredVel = new THREE.Vector3(desiredHorizVel.x, verticalVel, desiredHorizVel.z);
    this.velocity.lerp(desiredVel, Math.min(1, dt * 6.5));

    // Prevent flying straight through walls/furniture
    const speed = this.velocity.length();
    if (speed > 0.05) {
      const moveDir = this.velocity.clone().normalize();
      const hit = this.raycastWalkables(this.position, moveDir, speed * dt + 0.32);
      if (hit) {
        const normal = this.getWorldNormal(hit);
        if (!ascending && this.flightTimer > 0.3) {
          // Automatic landing on contact when not holding fly!
          this.landOnSurface(hit.point, normal);
          return;
        } else {
          // Slide along wall/ceiling while holding fly
          const dot = this.velocity.dot(normal);
          if (dot < 0) this.velocity.addScaledVector(normal, -dot);
        }
      }
    }

    this.position.addScaledVector(this.velocity, dt);

    // Check ground beneath for auto-landing when not holding fly
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

    // Smooth flight orientation with pitch/bank
    const pitch = input.moveY * 0.24;
    const roll = -input.moveX * 0.32;
    const euler = new THREE.Euler(pitch, this.currentYawEuler, roll, 'YXZ');
    const targetQ = new THREE.Quaternion().setFromEuler(euler);
    this.quaternion.slerp(targetQ, Math.min(1, dt * 7));

    const speedRatio = Math.min(1.5, this.velocity.length() / this.flyForwardSpeed);
    this.sound.setFlightBuzz(true, speedRatio);
  }

  private landOnSurface(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.state = 'Crawling';
    this.isGrounded = true;
    this.surfaceNormal.copy(normal).normalize();
    this.position.copy(point).addScaledVector(this.surfaceNormal, 0.02);
    this.velocity.set(0, 0, 0);
    this.sound.setFlightBuzz(false, 0);
    this.sound.playLanding();
  }

  private clampRoomBounds(): void {
    const maxX = ROOM_W * 0.5 * S - 0.35;
    const maxZ = ROOM_D * 0.5 * S - 0.35;
    const maxY = ROOM_H * S - 0.25;

    if (this.position.x < -maxX) this.position.x = -maxX;
    if (this.position.x > maxX) this.position.x = maxX;
    if (this.position.z < -maxZ) this.position.z = -maxZ;
    if (this.position.z > maxZ) this.position.z = maxZ;
    if (this.position.y < 0.02) {
      this.position.y = 0.02;
      if (this.state === 'Flying' || this.state === 'Gliding') {
        this.landOnSurface(new THREE.Vector3(this.position.x, 0, this.position.z), new THREE.Vector3(0, 1, 0));
      }
    }
    if (this.position.y > maxY) this.position.y = maxY;
  }

  private updateBlobShadow(): void {
    const hit = this.raycastWalkables(
      this.position.clone().add(new THREE.Vector3(0, 0.1, 0)),
      new THREE.Vector3(0, -1, 0),
      18
    );
    if (hit) {
      this.rig.blobShadow.visible = true;
      this.rig.blobShadow.position.copy(hit.point).add(new THREE.Vector3(0, 0.015, 0));
      const height = Math.max(0, this.position.y - hit.point.y);
      const scale = Math.max(0.4, 1 - height * 0.06);
      this.rig.blobShadow.scale.setScalar(scale);
      (this.rig.blobShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0.15,
        0.75 - height * 0.05
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
    return hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld)
      .normalize();
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

  private syncRigTransform(): void {
    this.rig.root.position.copy(this.position);
    this.rig.root.quaternion.copy(this.quaternion);
  }
}
