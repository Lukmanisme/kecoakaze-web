import * as THREE from 'three';
import {
  BossState,
  IbuExpression,
  IbuHabit,
  WORLD_SCALE as S,
} from '../types';
import {
  Palette,
  createDasterTexture,
  createToonMaterial,
} from '../style/palette';

interface ArticulatedLeg {
  hip: THREE.Group;
  knee: THREE.Group;
  foot: THREE.Group;
}

interface ArticulatedArm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
}

export class IbuRig {
  public readonly root = new THREE.Group();
  public readonly visual = new THREE.Group();

  // Hierarchical articulated joints
  private readonly hipsGroup = new THREE.Group();
  private readonly skirtGroup = new THREE.Group();
  private readonly torsoGroup = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly leftArm: ArticulatedArm;
  private readonly rightArm: ArticulatedArm;
  private readonly leftLeg: ArticulatedLeg;
  private readonly rightLeg: ArticulatedLeg;

  private readonly browLeft = new THREE.Group();
  private readonly browRight = new THREE.Group();
  private readonly mouth = new THREE.Group();
  private readonly lidLeft = new THREE.Mesh();
  private readonly lidRight = new THREE.Mesh();

  private readonly broomProp = new THREE.Group();
  private readonly spoonProp = new THREE.Group();

  public readonly worldScale = (S * 1.65) / 2.4;

  private walkPhase = 0;
  private isArmed = false;
  private startleTimer = 0;
  private throwAnimTimer = 0;
  private smoothedHeadYaw = 0;
  private smoothedHeadPitch = 0;
  private readonly tmpEyeWorld = new THREE.Vector3();

  constructor() {
    this.root.name = 'Human_Boss_Ibu';
    this.visual.name = 'Ibu_Visual';
    this.visual.scale.setScalar(this.worldScale);
    this.root.add(this.visual);

    const skinMat = createToonMaterial(Palette.Skin);
    const dasterMat = createToonMaterial(0xffffff, { map: createDasterTexture() });
    const apronMat = createToonMaterial(Palette.Cream);
    const hairMat = createToonMaterial(Palette.Hair);
    const slipperMat = createToonMaterial(Palette.Red);
    const eyeWhiteMat = createToonMaterial(Palette.White);
    const pupilMat = createToonMaterial(Palette.Ink);
    const lipMat = createToonMaterial(0xc45a52);
    const curlerRedMat = createToonMaterial(Palette.Red);
    const curlerYellowMat = createToonMaterial(Palette.Mustard);
    const woodMat = createToonMaterial(Palette.WoodDark);
    const strawMat = createToonMaterial(Palette.Rattan);

    // 1. Pelvis / Hips root (y = 0.88 above floor so legs reach exact y = 0)
    this.hipsGroup.name = 'Ibu_HipsGroup';
    this.hipsGroup.position.set(0, 0.88, 0);
    this.visual.add(this.hipsGroup);

    // Skirt attached to hips
    this.skirtGroup.name = 'Ibu_SkirtGroup';
    this.hipsGroup.add(this.skirtGroup);
    const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.78, 16), dasterMat);
    skirtMesh.position.set(0, -0.18, 0);
    skirtMesh.scale.set(1.12, 1, 0.85);
    skirtMesh.castShadow = true;
    this.skirtGroup.add(skirtMesh);

    const apronSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.06), apronMat);
    apronSkirt.position.set(0, -0.08, 0.27);
    apronSkirt.rotation.x = -0.14;
    this.skirtGroup.add(apronSkirt);

    const apronPocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), apronMat);
    apronPocket.position.set(0, -0.1, 0.3);
    apronPocket.rotation.x = -0.14;
    this.skirtGroup.add(apronPocket);

    // 2. Articulated Legs (Hip -> Thigh -> Knee -> Calf -> Foot/Slipper at y = 0)
    const buildLeg = (side: number): ArticulatedLeg => {
      const hip = new THREE.Group();
      hip.name = side < 0 ? 'Ibu_LeftLegGroup' : 'Ibu_RightLegGroup';
      hip.position.set(side * 0.15, -0.1, 0); // y = 0.78 in visual
      this.hipsGroup.add(hip);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.38, 10), skinMat);
      thigh.position.set(0, -0.19, 0);
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.38, 0); // y = 0.40 in visual
      hip.add(knee);

      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skinMat);
      knee.add(kneeJoint);

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.35, 10), skinMat);
      calf.position.set(0, -0.175, 0);
      knee.add(calf);

      const foot = new THREE.Group();
      foot.position.set(0, -0.365, 0); // y = 0.035 in visual (half of 0.07 slipper height -> bottom at y = 0)
      knee.add(foot);

      const slipper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.25), slipperMat);
      slipper.position.set(0, 0, 0.05);
      slipper.castShadow = true;
      foot.add(slipper);

      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.025, 0.07), apronMat);
      strap.position.set(0, 0.03, 0.08);
      foot.add(strap);

      return { hip, knee, foot };
    };
    this.leftLeg = buildLeg(-1);
    this.rightLeg = buildLeg(1);

    // 3. Torso / Daster upper body attached cleanly to Hips
    this.torsoGroup.name = 'Ibu_TorsoGroup';
    this.torsoGroup.position.set(0, 0.18, 0); // pivot at waist (y = 1.06 visual)
    this.hipsGroup.add(this.torsoGroup);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.64, 14), dasterMat);
    chest.position.set(0, 0.32, 0);
    chest.scale.set(1.15, 1, 0.78);
    chest.castShadow = true;
    this.torsoGroup.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.2, 10), skinMat);
    neck.position.set(0, 0.69, 0);
    this.torsoGroup.add(neck);

    const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.05), apronMat);
    apronBib.position.set(0, 0.33, 0.21);
    this.torsoGroup.add(apronBib);

    // 4. Articulated Arms (Shoulder -> Upper Arm/Sleeve -> Elbow -> Forearm + Hand)
    const buildArm = (side: number): ArticulatedArm => {
      const shoulder = new THREE.Group();
      shoulder.name = side < 0 ? 'Ibu_LeftArmGroup' : 'Ibu_RightArmGroup';
      shoulder.position.set(side * 0.33, 0.52, 0.02); // y = 1.58 visual
      this.torsoGroup.add(shoulder);

      const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), dasterMat);
      shoulder.add(shoulderBall);

      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.092, 0.24, 10), dasterMat);
      sleeve.position.set(0, -0.12, 0);
      shoulder.add(sleeve);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.24, 0);
      shoulder.add(elbow);

      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), skinMat);
      elbow.add(elbowJoint);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.048, 0.28, 10), skinMat);
      forearm.position.set(0, -0.14, 0);
      elbow.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), skinMat);
      hand.position.set(0, -0.29, 0);
      elbow.add(hand);

      return { shoulder, elbow };
    };
    this.leftArm = buildArm(-1);
    this.rightArm = buildArm(1);

    // Broom (Sapu Lidi) attached cleanly to right hand/elbow
    this.broomProp.position.set(0.01, -0.29, 0.03);
    this.broomProp.rotation.set(1.25, 0, -0.12);
    const broomHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.45, 8), woodMat);
    broomHandle.position.set(0, 0.25, 0);
    this.broomProp.add(broomHandle);
    const broomBristle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 10), strawMat);
    broomBristle.position.set(0, -0.55, 0);
    broomBristle.rotation.x = Math.PI;
    this.broomProp.add(broomBristle);
    this.broomProp.visible = false;
    this.rightArm.elbow.add(this.broomProp);

    // Wooden Spatula / Sodet attached to right hand/elbow when cooking
    this.spoonProp.position.set(0, -0.29, 0.04);
    this.spoonProp.rotation.x = 1.32;
    const spoonShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8), woodMat);
    spoonShaft.position.y = 0.16;
    const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), woodMat);
    spoonHead.scale.set(1, 0.4, 1.3);
    spoonHead.position.y = 0.35;
    this.spoonProp.add(spoonShaft, spoonHead);
    this.rightArm.elbow.add(this.spoonProp);

    // 5. Head & Hair Bun (Konde) + Curlers attached cleanly to torso neck
    this.headGroup.name = 'Ibu_HeadGroup';
    this.headGroup.position.set(0, 0.86, 0); // y = 1.92 visual
    this.torsoGroup.add(this.headGroup);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), skinMat);
    skull.scale.set(0.96, 1.05, 0.96);
    skull.castShadow = true;
    this.headGroup.add(skull);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.282, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hairCap.position.set(0, 0.03, -0.02);
    hairCap.rotation.x = -0.22;
    this.headGroup.add(hairCap);

    const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), hairMat);
    hairBun.position.set(0, 0.16, -0.25);
    this.headGroup.add(hairBun);

    const curlerDefs: Array<{ pos: [number, number, number]; rot: [number, number, number]; mat: THREE.Material }> = [
      { pos: [-0.14, 0.25, 0.12], rot: [0.3, 0, 0.4], mat: curlerRedMat },
      { pos: [0.14, 0.25, 0.12], rot: [0.3, 0, -0.4], mat: curlerYellowMat },
      { pos: [0.0, 0.3, 0.04], rot: [0.1, 0, 0], mat: curlerRedMat },
    ];
    for (const c of curlerDefs) {
      const curler = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10), c.mat);
      curler.rotation.z = Math.PI * 0.5;
      const wrap = new THREE.Group();
      wrap.position.set(...c.pos);
      wrap.rotation.set(...c.rot);
      wrap.add(curler);
      this.headGroup.add(wrap);
    }

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), eyeWhiteMat);
      eye.scale.set(1, 1.1, 0.5);
      eye.position.set(side * 0.1, 0.05, 0.24);
      this.headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), pupilMat);
      pupil.position.set(side * 0.1, 0.05, 0.262);
      this.headGroup.add(pupil);

      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), eyeWhiteMat);
      hi.position.set(side * 0.1 + 0.01, 0.062, 0.278);
      this.headGroup.add(hi);
    }

    this.lidLeft.geometry = new THREE.BoxGeometry(0.11, 0.045, 0.04);
    this.lidLeft.material = skinMat;
    this.lidLeft.position.set(-0.1, 0.09, 0.255);
    this.headGroup.add(this.lidLeft);

    this.lidRight.geometry = new THREE.BoxGeometry(0.11, 0.045, 0.04);
    this.lidRight.material = skinMat;
    this.lidRight.position.set(0.1, 0.09, 0.255);
    this.headGroup.add(this.lidRight);

    this.browLeft.position.set(-0.1, 0.125, 0.258);
    this.browLeft.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.025), hairMat));
    this.headGroup.add(this.browLeft);

    this.browRight.position.set(0.1, 0.125, 0.258);
    this.browRight.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.025), hairMat));
    this.headGroup.add(this.browRight);

    this.mouth.position.set(0, -0.09, 0.25);
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.032, 0.03), lipMat);
    this.mouth.add(lips);
    this.headGroup.add(this.mouth);
  }

  public getEyeWorldPosition(): THREE.Vector3 {
    this.headGroup.getWorldPosition(this.tmpEyeWorld);
    return this.tmpEyeWorld;
  }

  public setArmed(armed: boolean): void {
    this.isArmed = armed;
    this.broomProp.visible = armed;
    this.spoonProp.visible = !armed;
  }

  public triggerStartle(): void {
    this.startleTimer = 0.45;
  }

  public triggerSandalThrow(): void {
    this.throwAnimTimer = 0.35;
  }

  public setExpression(expr: IbuExpression): void {
    this.browLeft.rotation.z = 0;
    this.browRight.rotation.z = 0;
    this.lidLeft.scale.y = 0.6;
    this.lidRight.scale.y = 0.6;
    this.mouth.scale.set(1, 1, 1);

    switch (expr) {
      case 'NeutralJudes':
        this.browLeft.rotation.z = -0.18;
        this.browRight.rotation.z = 0.18;
        this.lidLeft.scale.y = 0.9;
        this.lidRight.scale.y = 0.9;
        break;
      case 'Tasting':
        this.lidLeft.scale.y = 1.1;
        this.lidRight.scale.y = 1.1;
        this.mouth.scale.set(0.7, 1.3, 1);
        break;
      case 'Suspicious':
        this.browLeft.rotation.z = 0.22;
        this.browRight.rotation.z = -0.22;
        this.lidLeft.scale.y = 1.2;
        this.lidRight.scale.y = 0.7;
        break;
      case 'Shocked':
        this.browLeft.rotation.z = 0.35;
        this.browRight.rotation.z = -0.35;
        this.lidLeft.scale.y = 0.25;
        this.lidRight.scale.y = 0.25;
        this.mouth.scale.set(1.2, 2.5, 1);
        break;
      case 'AngryCombat':
        this.browLeft.rotation.z = -0.38;
        this.browRight.rotation.z = 0.38;
        this.lidLeft.scale.y = 0.8;
        this.lidRight.scale.y = 0.8;
        this.mouth.scale.set(1.4, 1.8, 1);
        break;
      case 'DefeatedPanic':
        this.browLeft.rotation.z = 0.42;
        this.browRight.rotation.z = -0.42;
        this.lidLeft.scale.y = 0.2;
        this.lidRight.scale.y = 0.2;
        this.mouth.scale.set(1.5, 2.8, 1);
        break;
    }
  }

  public updateAnimation(
    dt: number,
    time: number,
    moveSpeedRatio: number, // 0 = idle, ~0.6 = patrol/search, 1.0 = chase run
    bossState: BossState,
    habit: IbuHabit,
    broomSweepProgress = 0, // 0 = none, 0..1 = swing -> follow-through
    headLeadYawOffset = 0,
    windupProgress = 0
  ): void {
    const smoothRate = Math.min(1, dt * 11);
    const isMoving = moveSpeedRatio > 0.05;

    // 0. Startle Squash-and-Stretch Impulse (ALERT / SHOCKED)
    if (this.startleTimer > 0) {
      this.startleTimer = Math.max(0, this.startleTimer - dt);
      const u = 1 - this.startleTimer / 0.45;
      const bounce = Math.sin(u * Math.PI * 2) * (1 - u);
      const sy = 1 + bounce * 0.14;
      const sxz = 1 - bounce * 0.07;
      this.visual.scale.set(
        this.worldScale * sxz,
        this.worldScale * sy,
        this.worldScale * sxz
      );
    } else {
      this.visual.scale.setScalar(this.worldScale);
    }

    if (this.throwAnimTimer > 0) {
      this.throwAnimTimer = Math.max(0, this.throwAnimTimer - dt);
    }

    // 1. Lower Body Procedural Gait (Legs + Knees + Feet + Hips Bob & Roll)
    let hipY = 0.88;
    let hipRoll = 0;
    let torsoLeanX = 0;
    let torsoTwistY = 0;
    let targetHeadPitch = 0;
    let targetHeadYaw = THREE.MathUtils.clamp(headLeadYawOffset, -0.78, 0.78);

    if (isMoving) {
      const cycleSpeed = THREE.MathUtils.lerp(7.5, 11.5, moveSpeedRatio);
      this.walkPhase += dt * cycleSpeed;
      const s = Math.sin(this.walkPhase);
      const c = Math.cos(this.walkPhase);
      const strideAmp = THREE.MathUtils.lerp(0.38, 0.62, moveSpeedRatio);

      // Alternating hip swing
      this.leftLeg.hip.rotation.x = s * strideAmp;
      this.rightLeg.hip.rotation.x = -s * strideAmp;

      // Natural knee bend during forward swing & recovery
      const kneeBendL = Math.max(0, -c) * 0.72 + Math.max(0, s) * 0.22;
      const kneeBendR = Math.max(0, c) * 0.72 + Math.max(0, -s) * 0.22;
      this.leftLeg.knee.rotation.x = kneeBendL;
      this.rightLeg.knee.rotation.x = kneeBendR;

      // Foot / slipper clearance angle
      this.leftLeg.foot.rotation.x = -kneeBendL * 0.45;
      this.rightLeg.foot.rotation.x = -kneeBendR * 0.45;

      // Vertical bobbing, hip roll, skirt sway, and forward lean when chasing
      hipY = 0.88 + Math.abs(s) * 0.045 - (kneeBendL + kneeBendR) * 0.025;
      hipRoll = s * 0.075;
      this.skirtGroup.rotation.z = -s * 0.04;
      torsoLeanX = THREE.MathUtils.lerp(0.06, 0.22, moveSpeedRatio);
      torsoTwistY = -s * 0.1;

      // Arm counter-swing (with natural bent elbows)
      const armAmp = strideAmp * 0.78;
      this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.shoulder.rotation.x,
        -s * armAmp,
        smoothRate
      );
      this.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        this.leftArm.shoulder.rotation.z,
        -0.14,
        smoothRate
      );
      this.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.elbow.rotation.x,
        -0.42 - Math.max(0, -s) * 0.35,
        smoothRate
      );

      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.x,
        s * armAmp - (this.isArmed ? 0.35 : 0),
        smoothRate
      );
      this.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.z,
        0.14,
        smoothRate
      );
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.elbow.rotation.x,
        -0.48 - Math.max(0, s) * 0.35,
        smoothRate
      );
    } else {
      // Relax legs toward standing pose (cooking uses gentle knee bounce)
      const idleBounce = bossState === 'RoutineIdle' ? (Math.sin(time * 2.8) * 0.5 + 0.5) * 0.07 : 0;
      this.leftLeg.hip.rotation.x = THREE.MathUtils.lerp(this.leftLeg.hip.rotation.x, -idleBounce * 0.5, smoothRate);
      this.rightLeg.hip.rotation.x = THREE.MathUtils.lerp(this.rightLeg.hip.rotation.x, -idleBounce * 0.5, smoothRate);
      this.leftLeg.knee.rotation.x = THREE.MathUtils.lerp(this.leftLeg.knee.rotation.x, idleBounce, smoothRate);
      this.rightLeg.knee.rotation.x = THREE.MathUtils.lerp(this.rightLeg.knee.rotation.x, idleBounce, smoothRate);
      this.leftLeg.foot.rotation.x = THREE.MathUtils.lerp(this.leftLeg.foot.rotation.x, -idleBounce * 0.4, smoothRate);
      this.rightLeg.foot.rotation.x = THREE.MathUtils.lerp(this.rightLeg.foot.rotation.x, -idleBounce * 0.4, smoothRate);
      this.skirtGroup.rotation.z = THREE.MathUtils.lerp(this.skirtGroup.rotation.z, 0, smoothRate);
      hipY = 0.88 - idleBounce * 0.14 + Math.sin(time * 2.2) * 0.01;
    }

    // 2. State-Specific Expressive Upper-Body Animation
    if (bossState === 'MemeriksaSembunyi') {
      torsoLeanX = 0.44;
      targetHeadPitch = 0.26;
      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.x,
        -0.95 + Math.sin(time * 7.5) * 0.28,
        smoothRate
      );
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(this.rightArm.elbow.rotation.x, -0.45, smoothRate);
    } else if (bossState === 'Mengamuk' || bossState === 'PanicDefeated') {
      torsoLeanX = Math.sin(time * 16) * 0.14;
      targetHeadYaw = Math.sin(time * 14) * 0.28;
      this.leftArm.shoulder.rotation.x = -1.75 + Math.sin(time * 18) * 0.52;
      this.rightArm.shoulder.rotation.x = -1.75 - Math.sin(time * 18) * 0.52;
      this.leftArm.elbow.rotation.x = -0.5;
      this.rightArm.elbow.rotation.x = -0.5;
    } else if (bossState === 'WindupAttack') {
      // ATTACK Anticipation (0.8-1.0s): draw arm & broom high back while leaning torso backward
      const p = Math.min(1, windupProgress);
      torsoLeanX = THREE.MathUtils.lerp(0.0, -0.24, p);
      torsoTwistY = THREE.MathUtils.lerp(0, 0.35, p);
      targetHeadPitch = -0.1;
      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.6, -2.55, p);
      this.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(0.14, 0.38, p);
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.4, -0.78, p);
      this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.3, -1.15, p);
      this.leftArm.shoulder.rotation.z = -0.3;
    } else if (broomSweepProgress > 0) {
      // Fast Swing (0..0.38) + Follow-Through (0.38..1.0)
      if (broomSweepProgress < 0.38) {
        const u = broomSweepProgress / 0.38;
        const easeOut = 1 - Math.pow(1 - u, 3);
        torsoLeanX = THREE.MathUtils.lerp(-0.22, 0.32, easeOut);
        torsoTwistY = THREE.MathUtils.lerp(0.35, -0.55, easeOut);
        this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-2.55, 0.35, easeOut);
        this.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(0.3, -0.95, easeOut);
        this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.78, -0.12, easeOut);
      } else {
        const u = (broomSweepProgress - 0.38) / 0.62;
        const settle = Math.sin(u * Math.PI) * 0.14;
        torsoLeanX = THREE.MathUtils.lerp(0.32, 0.08, u);
        torsoTwistY = THREE.MathUtils.lerp(-0.55, 0, u);
        this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(0.35, -0.65, u) + settle;
        this.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(-0.95, 0, u);
        this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.12, -0.48, u);
      }
    } else if (this.throwAnimTimer > 0) {
      const u = 1 - this.throwAnimTimer / 0.35;
      torsoLeanX = THREE.MathUtils.lerp(-0.15, 0.25, u);
      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-2.2, 0.2, u);
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.7, -0.1, u);
    } else if (bossState === 'SuspiciousAlert' || bossState === 'ShockedFreeze') {
      targetHeadPitch = -0.22; // kepala mendongak kaget
      torsoLeanX = -0.08;
      this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(this.leftArm.shoulder.rotation.x, -0.7, smoothRate);
      this.leftArm.shoulder.rotation.z = -0.35;
      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(this.rightArm.shoulder.rotation.x, -0.75, smoothRate);
      this.rightArm.shoulder.rotation.z = 0.28;
    } else if (!isMoving && bossState === 'RoutineIdle') {
      switch (habit) {
        case 'CookingTaste': {
          this.spoonProp.visible = !this.isArmed;
          // Circular stirring motion at stove/counter with shoulder rhythm & occasional side glance
          const stirAngle = time * 4.4;
          const stirX = Math.sin(stirAngle);
          const stirZ = Math.cos(stirAngle);
          this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            this.rightArm.shoulder.rotation.x,
            -0.68 + stirX * 0.18,
            smoothRate
          );
          this.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            this.rightArm.shoulder.rotation.z,
            0.16 + stirZ * 0.14,
            smoothRate
          );
          this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            this.rightArm.elbow.rotation.x,
            -0.75 + stirZ * 0.16,
            smoothRate
          );
          this.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(
            this.rightArm.shoulder.rotation.y,
            stirX * 0.15,
            smoothRate
          );
          // Hand on hip / resting left arm
          this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(this.leftArm.shoulder.rotation.x, -0.2, smoothRate);
          this.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(this.leftArm.shoulder.rotation.z, -0.24, smoothRate);
          this.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(this.leftArm.elbow.rotation.x, -0.65, smoothRate);

          torsoTwistY = stirZ * 0.08;
          torsoLeanX = 0.06 + stirX * 0.03;
          // Occasional glance sideways to inspect counter / dining table
          const glanceWave = Math.sin(time * 0.72);
          targetHeadYaw = glanceWave > 0.62 ? Math.sin(time * 1.4) * 0.55 : headLeadYawOffset;
          targetHeadPitch = 0.08;
          break;
        }
        case 'WipingCounter':
          this.rightArm.shoulder.rotation.x = -0.82;
          this.rightArm.shoulder.rotation.z = Math.sin(time * 6.5) * 0.32;
          this.rightArm.elbow.rotation.x = -0.45;
          torsoTwistY = Math.sin(time * 6.5) * 0.08;
          targetHeadPitch = 0.15;
          break;
        case 'FanningHeat':
          this.leftArm.shoulder.rotation.x = -0.58;
          this.leftArm.shoulder.rotation.z = -0.28 + Math.sin(time * 9.0) * 0.25;
          this.leftArm.elbow.rotation.x = -0.85;
          targetHeadPitch = -0.06;
          break;
        case 'KosGrumbling':
          this.leftArm.shoulder.rotation.x = -0.35;
          this.leftArm.shoulder.rotation.z = -0.42;
          this.leftArm.elbow.rotation.x = -0.8;
          targetHeadYaw = Math.sin(time * 3.2) * 0.24;
          break;
      }
    } else if (!isMoving) {
      this.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(this.leftArm.shoulder.rotation.x, -0.08, smoothRate);
      this.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(this.leftArm.shoulder.rotation.z, -0.14, smoothRate);
      this.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(this.leftArm.elbow.rotation.x, -0.25, smoothRate);
      this.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.shoulder.rotation.x,
        this.isArmed ? -0.38 : -0.08,
        smoothRate
      );
      this.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(this.rightArm.shoulder.rotation.z, 0.14, smoothRate);
      this.rightArm.shoulder.rotation.y = THREE.MathUtils.lerp(this.rightArm.shoulder.rotation.y, 0, smoothRate);
      this.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(this.rightArm.elbow.rotation.x, -0.3, smoothRate);
    }

    // Smooth joint blending for hips, torso, and leading head rotation
    this.hipsGroup.position.y = THREE.MathUtils.lerp(this.hipsGroup.position.y, hipY, smoothRate);
    this.hipsGroup.rotation.z = THREE.MathUtils.lerp(this.hipsGroup.rotation.z, hipRoll, smoothRate);
    this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, torsoLeanX, smoothRate);
    this.torsoGroup.rotation.y = THREE.MathUtils.lerp(this.torsoGroup.rotation.y, torsoTwistY, smoothRate);

    this.smoothedHeadYaw = THREE.MathUtils.lerp(this.smoothedHeadYaw, targetHeadYaw, Math.min(1, dt * 13));
    this.smoothedHeadPitch = THREE.MathUtils.lerp(this.smoothedHeadPitch, targetHeadPitch, Math.min(1, dt * 11));
    this.headGroup.rotation.set(this.smoothedHeadPitch, this.smoothedHeadYaw, 0);
  }
}
