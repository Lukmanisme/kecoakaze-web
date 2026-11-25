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

export class IbuRig {
  public readonly root = new THREE.Group();
  public readonly visual = new THREE.Group();

  private readonly head = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly skirt = new THREE.Group();
  private readonly armLeft = new THREE.Group();
  private readonly armRight = new THREE.Group();
  private readonly legLeft = new THREE.Group();
  private readonly legRight = new THREE.Group();

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

    // Torso
    this.visual.add(this.torso);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.64, 14), dasterMat);
    chest.position.set(0, 1.38, 0);
    chest.scale.set(1.15, 1, 0.78);
    chest.castShadow = true;
    this.torso.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 10), skinMat);
    neck.position.set(0, 1.74, 0);
    this.torso.add(neck);

    const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.05), apronMat);
    apronBib.position.set(0, 1.39, 0.21);
    this.torso.add(apronBib);

    // Skirt
    this.visual.add(this.skirt);
    const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.82, 16), dasterMat);
    skirtMesh.position.set(0, 0.72, 0);
    skirtMesh.scale.set(1.12, 1, 0.85);
    skirtMesh.castShadow = true;
    this.skirt.add(skirtMesh);

    const apronSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.06), apronMat);
    apronSkirt.position.set(0, 0.82, 0.27);
    apronSkirt.rotation.x = -0.14;
    this.skirt.add(apronSkirt);

    const apronPocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), apronMat);
    apronPocket.position.set(0, 0.8, 0.3);
    apronPocket.rotation.x = -0.14;
    this.skirt.add(apronPocket);

    // Legs & Red Slippers
    const buildLeg = (group: THREE.Group, side: number): void => {
      group.position.set(side * 0.15, 0.46, 0);
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.42, 10), skinMat);
      calf.position.set(0, -0.22, 0);
      group.add(calf);

      const slipper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.25), slipperMat);
      slipper.position.set(0, -0.42, 0.05);
      slipper.castShadow = true;
      group.add(slipper);
      this.visual.add(group);
    };
    buildLeg(this.legLeft, -1);
    buildLeg(this.legRight, 1);

    // Arms
    const buildArm = (group: THREE.Group, side: number): void => {
      group.position.set(side * 0.34, 1.56, 0.02);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.24, 10), dasterMat);
      sleeve.position.set(0, -0.1, 0);
      group.add(sleeve);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.34, 10), skinMat);
      forearm.position.set(0, -0.34, 0.06);
      forearm.rotation.x = -0.25;
      group.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skinMat);
      hand.position.set(0, -0.5, 0.12);
      group.add(hand);

      this.visual.add(group);
    };
    buildArm(this.armLeft, -1);
    buildArm(this.armRight, 1);

    // Broom (Sapu Lidi) attached to right arm
    this.broomProp.position.set(0.02, -0.46, 0.18);
    this.broomProp.rotation.set(0.95, 0, -0.15);
    const broomHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.45, 8), woodMat);
    broomHandle.position.set(0, 0.25, 0);
    this.broomProp.add(broomHandle);
    const broomBristle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 10), strawMat);
    broomBristle.position.set(0, -0.55, 0);
    broomBristle.rotation.x = Math.PI;
    this.broomProp.add(broomBristle);
    this.broomProp.visible = false;
    this.armRight.add(this.broomProp);

    // Wooden Spoon attached to right arm when cooking
    this.spoonProp.position.set(0, -0.48, 0.16);
    this.spoonProp.rotation.x = 1.1;
    const spoonShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 8), woodMat);
    spoonShaft.position.y = 0.16;
    const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), woodMat);
    spoonHead.scale.set(1, 0.4, 1.3);
    spoonHead.position.y = 0.35;
    this.spoonProp.add(spoonShaft, spoonHead);
    this.armRight.add(this.spoonProp);

    // Head
    this.head.position.set(0, 1.92, 0);
    this.visual.add(this.head);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 14), skinMat);
    skull.scale.set(0.96, 1.05, 0.96);
    skull.castShadow = true;
    this.head.add(skull);

    // Hair & Cepol (bun) + 3 curlers (no cigarette)
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.282, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    hairCap.position.set(0, 0.03, -0.02);
    hairCap.rotation.x = -0.22;
    this.head.add(hairCap);

    const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), hairMat);
    hairBun.position.set(0, 0.16, -0.25);
    this.head.add(hairBun);

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
      this.head.add(wrap);
    }

    // Eyes, Eyelids, Brows, Mouth
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), eyeWhiteMat);
      eye.scale.set(1, 1.1, 0.5);
      eye.position.set(side * 0.1, 0.05, 0.24);
      this.head.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), pupilMat);
      pupil.position.set(side * 0.1, 0.05, 0.262);
      this.head.add(pupil);

      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), eyeWhiteMat);
      hi.position.set(side * 0.1 + 0.01, 0.062, 0.278);
      this.head.add(hi);
    }

    this.lidLeft.geometry = new THREE.BoxGeometry(0.11, 0.045, 0.04);
    this.lidLeft.material = skinMat;
    this.lidLeft.position.set(-0.1, 0.09, 0.255);
    this.head.add(this.lidLeft);

    this.lidRight.geometry = new THREE.BoxGeometry(0.11, 0.045, 0.04);
    this.lidRight.material = skinMat;
    this.lidRight.position.set(0.1, 0.09, 0.255);
    this.head.add(this.lidRight);

    this.browLeft.position.set(-0.1, 0.125, 0.258);
    this.browLeft.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.025), hairMat));
    this.head.add(this.browLeft);

    this.browRight.position.set(0.1, 0.125, 0.258);
    this.browRight.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.025), hairMat));
    this.head.add(this.browRight);

    this.mouth.position.set(0, -0.09, 0.25);
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.032, 0.03), lipMat);
    this.mouth.add(lips);
    this.head.add(this.mouth);
  }

  public getEyeWorldPosition(): THREE.Vector3 {
    const p = new THREE.Vector3(0, 1.95 * this.worldScale, 0.25 * this.worldScale);
    return p.applyQuaternion(this.root.quaternion).add(this.root.position);
  }

  public setArmed(armed: boolean): void {
    this.isArmed = armed;
    this.broomProp.visible = armed;
    this.spoonProp.visible = !armed;
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
    isMoving: boolean,
    bossState: BossState,
    habit: IbuHabit,
    broomSweepAngle = 0
  ): void {
    // Walking leg & arm swing
    if (isMoving) {
      this.walkPhase += dt * 9.5;
      const swing = Math.sin(this.walkPhase) * 0.5;
      this.legLeft.rotation.x = swing;
      this.legRight.rotation.x = -swing;
      this.skirt.rotation.z = Math.sin(this.walkPhase) * 0.05;
      this.torso.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04;
      this.armLeft.rotation.x = -swing * 0.5;
      this.armRight.rotation.x = swing * 0.5;
    } else {
      this.legLeft.rotation.x *= 0.85;
      this.legRight.rotation.x *= 0.85;
      this.skirt.rotation.z *= 0.85;
      this.torso.position.y = Math.sin(time * 2.2) * 0.015;
    }

    // Habit / State upper-body pose
    if (bossState === 'MemeriksaSembunyi') {
      this.torso.rotation.x = 0.42;
      this.head.rotation.x = 0.28;
      this.armRight.rotation.x = -0.9 + Math.sin(time * 8) * 0.25;
      return;
    }

    if (bossState === 'Mengamuk' || bossState === 'PanicDefeated') {
      this.torso.rotation.x = Math.sin(time * 18) * 0.12;
      this.armLeft.rotation.x = -1.6 + Math.sin(time * 20) * 0.5;
      this.armRight.rotation.x = -1.6 - Math.sin(time * 20) * 0.5;
      this.head.rotation.y = Math.sin(time * 16) * 0.22;
      return;
    }

    if (bossState === 'WindupAttack') {
      this.torso.rotation.x = -0.14;
      this.armRight.rotation.x = -2.35;
      this.armRight.rotation.z = 0.28;
      this.armLeft.rotation.x = -1.25;
      this.head.rotation.set(-0.08, 0, 0);
      return;
    }

    if (bossState === 'AngerCombat') {
      this.torso.rotation.x = 0.08;
      this.armRight.rotation.x = -0.85 + broomSweepAngle;
      this.armRight.rotation.y = broomSweepAngle * 0.8;
      this.armLeft.rotation.x = -0.45;
      this.head.rotation.set(0, 0, 0);
      return;
    }

    this.torso.rotation.x = 0;
    this.head.rotation.set(0, 0, 0);
    this.armRight.rotation.y = 0;

    if (!isMoving && bossState === 'RoutineIdle') {
      switch (habit) {
        case 'CookingTaste':
          this.spoonProp.visible = !this.isArmed;
          this.armRight.rotation.x = -0.75 + Math.sin(time * 5.2) * 0.18;
          this.armLeft.rotation.x = -0.25;
          this.armLeft.rotation.z = -0.22;
          break;
        case 'WipingCounter':
          this.armRight.rotation.x = -0.85;
          this.armRight.rotation.z = Math.sin(time * 6.5) * 0.28;
          break;
        case 'FanningHeat':
          this.armLeft.rotation.x = -0.55;
          this.armLeft.rotation.z = -0.3 + Math.sin(time * 9.0) * 0.22;
          break;
        case 'KosGrumbling':
          this.armLeft.rotation.x = -0.35;
          this.armLeft.rotation.z = -0.45;
          this.head.rotation.y = Math.sin(time * 3.5) * 0.18;
          break;
      }
    } else if (!isMoving) {
      this.armLeft.rotation.z = -0.18;
      this.armRight.rotation.z = 0.12;
    }
  }
}
