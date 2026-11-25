import * as THREE from 'three';
import { WORLD_SCALE as S } from '../types';
import { Palette, createToonMaterial } from '../style/palette';
import { KokoController } from '../physics/kokoPhysics';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { VFXManager } from '../vfx/VFXManager';

export class OscillatingFan {
  public readonly root = new THREE.Group();
  private readonly headPivot = new THREE.Group();
  private readonly blades = new THREE.Group();

  // 4s sweep Kasur -> Meja, 1s pause, 4s sweep back, 1s pause (total 10s cycle)
  private cycleTime = 0;
  private readonly sweepDuration = 4.0;
  private readonly pauseDuration = 1.0;

  // Base diagonal yaw & 100-degree sweep (-50 to +50 deg around base)
  private readonly baseYaw = THREE.MathUtils.degToRad(34);
  private readonly halfSweepRad = THREE.MathUtils.degToRad(50);

  private readonly coneLength = 6.6 * S;
  private readonly coneHalfAngle = THREE.MathUtils.degToRad(24);
  private readonly grilleHitRadius = 0.5 * S;

  private hitCooldown = 0;

  constructor(
    position: THREE.Vector3,
    walkables: THREE.Object3D[],
    obstacles: THREE.Object3D[],
    private readonly sound: ProceduralAudioEngine,
    vfx: VFXManager
  ) {
    this.root.name = 'Oscillating_Fan';
    this.root.position.copy(position);

    const darkMat = createToonMaterial(Palette.SlateDark);
    const steelMat = createToonMaterial(Palette.Steel);
    const bladeMat = createToonMaterial(0x59e0ba);
    const accentMat = createToonMaterial(0x3a6cff, { emissive: 0x1a38aa, emissiveIntensity: 0.6 });

    // Base & stand pole
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * S, 0.32 * S, 0.06 * S, 16), darkMat);
    base.position.y = 0.03 * S;
    base.castShadow = true;
    base.receiveShadow = true;
    this.root.add(base);
    walkables.push(base);
    obstacles.push(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * S, 0.045 * S, 1.38 * S, 10), steelMat);
    pole.position.y = 0.72 * S;
    pole.castShadow = true;
    this.root.add(pole);
    walkables.push(pole);

    // Head Pivot
    this.headPivot.position.set(0, 1.44 * S, 0);
    this.headPivot.rotation.y = this.baseYaw;
    this.root.add(this.headPivot);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * S, 0.13 * S, 0.24 * S, 12), darkMat);
    motor.rotation.x = Math.PI * 0.5;
    motor.position.z = -0.06 * S;
    this.headPivot.add(motor);

    // Front Grille Rings
    const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.28 * S, 0.015 * S, 8, 22), steelMat);
    cageRing.position.z = 0.14 * S;
    this.headPivot.add(cageRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.14 * S, 0.01 * S, 6, 18), accentMat);
    innerRing.position.z = 0.17 * S;
    this.headPivot.add(innerRing);

    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.06 * S, 0.03 * S, 12), accentMat);
    hubCap.rotation.x = Math.PI * 0.5;
    hubCap.position.z = 0.18 * S;
    this.headPivot.add(hubCap);

    // Spinning Blades
    this.blades.position.z = 0.11 * S;
    this.headPivot.add(this.blades);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.09 * S, 0.24 * S, 0.015 * S), bladeMat);
      const a = (i / 3) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.13 * S, Math.sin(a) * 0.13 * S, 0);
      b.rotation.z = a + 0.4;
      b.rotation.y = 0.35;
      this.blades.add(b);
    }

    // Wind Streamlines & 40 Floating Dust Motes managed centrally by VFXManager
    vfx.attachFanWindRig(this.headPivot, this.coneLength, this.coneHalfAngle);
  }

  public reset(): void {
    this.cycleTime = 0;
    this.hitCooldown = 0;
    this.headPivot.rotation.y = this.baseYaw - this.halfSweepRad;
  }

  public getHeadWorldDirection(out = new THREE.Vector3()): THREE.Vector3 {
    const yaw = this.headPivot.rotation.y;
    return out.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  }

  public getHeadWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(
      this.root.position.x,
      this.root.position.y + this.headPivot.position.y,
      this.root.position.z
    );
  }

  public update(
    dt: number,
    koko: KokoController,
    camFwd: THREE.Vector3,
    onToast: (msg: string) => void
  ): void {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;

    // Spin blades
    this.blades.rotation.z += dt * 26;

    // 100-degree oscillation cycle: 4s forward, 1s pause, 4s back, 1s pause
    const fullCycle = (this.sweepDuration + this.pauseDuration) * 2;
    this.cycleTime = (this.cycleTime + dt) % fullCycle;

    let sweepFactor = 0; // 0 = Kasur (-50 deg), 1 = Meja Gaming (+50 deg)
    if (this.cycleTime < this.sweepDuration) {
      const t = this.cycleTime / this.sweepDuration;
      sweepFactor = 0.5 - 0.5 * Math.cos(t * Math.PI);
    } else if (this.cycleTime < this.sweepDuration + this.pauseDuration) {
      sweepFactor = 1;
    } else if (this.cycleTime < this.sweepDuration * 2 + this.pauseDuration) {
      const t = (this.cycleTime - (this.sweepDuration + this.pauseDuration)) / this.sweepDuration;
      sweepFactor = 0.5 + 0.5 * Math.cos(t * Math.PI);
    } else {
      sweepFactor = 0;
    }

    this.headPivot.rotation.y =
      this.baseYaw - this.halfSweepRad + sweepFactor * (this.halfSweepRad * 2);

    // Physics Interaction & Spatial Wind Audio with Koko
    const headPos = this.getHeadWorldPosition();
    const windDir = this.getHeadWorldDirection();
    const toKokoDir = koko.position.clone().sub(headPos);
    const fanDist = toKokoDir.length();
    const alignment =
      fanDist > 0.01 ? Math.max(0, windDir.dot(toKokoDir.clone().divideScalar(fanDist))) : 0;
    const { pan } = this.sound.computeSpatialPanAndGain(headPos, koko.position, 46, camFwd);
    this.sound.updateFanWind(fanDist, alignment, pan);

    const grillePos = headPos.clone().addScaledVector(windDir, 0.18 * S);

    // 1. Grille turbulence bounce (< 0.5m)
    const distToGrille = koko.position.distanceTo(grillePos);
    if (distToGrille < this.grilleHitRadius) {
      if (this.hitCooldown <= 0) {
        this.hitCooldown = 0.7;
        const bounce = koko.position.clone().sub(grillePos);
        if (bounce.lengthSq() < 0.001) bounce.copy(windDir);
        bounce.y = Math.max(0.35, bounce.y);
        bounce.normalize().multiplyScalar(14);
        koko.applyKnockback(bounce, 0.55);
        this.sound.playFanHit();
        onToast('🌀 Kena Jaring Kipas! Koko terpental!');
      }
      return;
    }

    // 2. Wind Cone Check
    const toKoko = koko.position.clone().sub(headPos);
    const forwardDist = toKoko.dot(windDir);
    if (forwardDist <= 0.2 * S || forwardDist > this.coneLength) return;

    const closestOnAxis = headPos.clone().addScaledVector(windDir, forwardDist);
    const perpDist = koko.position.distanceTo(closestOnAxis);
    const coneRadiusAtDist = 0.35 * S + Math.tan(this.coneHalfAngle) * forwardDist;

    if (perpDist <= coneRadiusAtDist) {
      const falloff = 1 - (forwardDist / this.coneLength) * 0.35;
      const isAirborne = koko.state === 'Flying' || koko.state === 'Gliding';

      if (isAirborne) {
        // Wind-tunnel glide boost with ZERO stamina drain
        const boost = windDir.clone().multiplyScalar(12.5 * falloff);
        boost.y = 2.6 * falloff;
        koko.applyWindEffect(boost, true);
      } else if (koko.state === 'Crawling') {
        // Knockback while crawling in open wind cone
        const push = windDir.clone().multiplyScalar(9.5 * falloff);
        koko.applyWindEffect(push, false);
      }
    }
  }
}
