import * as THREE from 'three';
import { GamerState, WORLD_SCALE as S } from '../types';
import { Palette, createToonMaterial } from '../style/palette';

export class GamerRig {
  public readonly root = new THREE.Group();
  public readonly visual = new THREE.Group();
  public readonly worldScale = (S * 1.7) / 2.4;

  private readonly head = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly armLeft = new THREE.Group();
  private readonly armRight = new THREE.Group();
  private readonly legLeft = new THREE.Group();
  private readonly legRight = new THREE.Group();

  private readonly headsetOnGroup = new THREE.Group();
  private readonly headsetTiltedGroup = new THREE.Group();
  private readonly phoneGroup = new THREE.Group();
  private readonly flashlightCone: THREE.Mesh;
  private readonly flashlightSpot: THREE.SpotLight;

  private readonly racketGroup = new THREE.Group();
  private readonly racketSparkMesh: THREE.Mesh;
  private readonly racketLight: THREE.PointLight;

  private walkPhase = 0;

  constructor() {
    this.root.name = 'Human_Boss_Gamer';
    this.visual.scale.setScalar(this.worldScale);
    this.root.add(this.visual);

    const skinMat = createToonMaterial(Palette.Skin);
    const hoodieMat = createToonMaterial(0x28324d);
    const hoodieAccentMat = createToonMaterial(0x4de3b2);
    const shortsMat = createToonMaterial(0x1b1e29);
    const hairMat = createToonMaterial(0x241c24);
    const darkMat = createToonMaterial(0x161820);
    const rgbCupMat = createToonMaterial(0x00d4ff, { emissive: 0x0099ff, emissiveIntensity: 1.2 });
    const racketRimMat = createToonMaterial(0xff5252);
    const racketNetMat = createToonMaterial(0x90a4ae, { transparent: true, opacity: 0.55 });
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0x55e6ff,
      transparent: true,
      opacity: 0.85,
    });

    // Torso (Gaming Hoodie)
    this.visual.add(this.torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.32), hoodieMat);
    chest.position.set(0, 1.32, 0);
    chest.castShadow = true;
    this.torso.add(chest);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.34), hoodieAccentMat);
    stripe.position.set(0, 1.08, 0);
    this.torso.add(stripe);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 10), skinMat);
    neck.position.set(0, 1.72, 0);
    this.torso.add(neck);

    // Pelvis / Shorts
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.3), shortsMat);
    hips.position.set(0, 0.88, 0);
    this.visual.add(hips);

    // Legs
    const buildLeg = (g: THREE.Group, side: number): void => {
      g.position.set(side * 0.14, 0.82, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.42, 10), shortsMat);
      thigh.position.set(0, -0.2, 0);
      g.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.42, 10), skinMat);
      shin.position.set(0, -0.58, 0);
      g.add(shin);
      const sock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), createToonMaterial(0xf4f1e8));
      sock.position.set(0, -0.78, 0.04);
      g.add(sock);
      this.visual.add(g);
    };
    buildLeg(this.legLeft, -1);
    buildLeg(this.legRight, 1);

    // Arms
    const buildArm = (g: THREE.Group, side: number): void => {
      g.position.set(side * 0.34, 1.58, 0.02);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.3, 10), hoodieMat);
      sleeve.position.set(0, -0.14, 0);
      g.add(sleeve);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.3, 10), skinMat);
      forearm.position.set(0, -0.4, 0.08);
      forearm.rotation.x = -0.35;
      g.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), skinMat);
      hand.position.set(0, -0.52, 0.16);
      g.add(hand);
      this.visual.add(g);
    };
    buildArm(this.armLeft, -1);
    buildArm(this.armRight, 1);

    // Phone Flashlight on Left Hand
    this.phoneGroup.position.set(0, -0.52, 0.22);
    const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.02), darkMat);
    const phoneGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    phoneGlow.position.z = 0.012;
    this.phoneGroup.add(phoneBody, phoneGlow);

    const coneGeo = new THREE.ConeGeometry(0.85, 3.2, 16, 1, true);
    coneGeo.translate(0, -1.6, 0);
    coneGeo.rotateX(-Math.PI * 0.5);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff5cc,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.flashlightCone = new THREE.Mesh(coneGeo, coneMat);
    this.flashlightCone.position.z = 0.03;
    this.flashlightCone.raycast = () => {};
    this.phoneGroup.add(this.flashlightCone);

    this.flashlightSpot = new THREE.SpotLight(0xfff5d6, 4.5, 22, 0.52, 0.45, 1.2);
    this.flashlightSpot.position.set(0, 0, 0.04);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, -0.4, 4);
    this.phoneGroup.add(spotTarget);
    this.flashlightSpot.target = spotTarget;
    this.phoneGroup.add(this.flashlightSpot);

    this.phoneGroup.visible = false;
    this.armLeft.add(this.phoneGroup);

    // Electric Mosquito Racket on Right Hand
    this.racketGroup.position.set(0, -0.5, 0.22);
    this.racketGroup.rotation.x = 1.05;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.34, 8), darkMat);
    handle.position.y = 0.15;
    const neckRacket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.2, 8), racketRimMat);
    neckRacket.position.y = 0.38;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 18), racketRimMat);
    hoop.position.y = 0.65;
    const net = new THREE.Mesh(new THREE.CircleGeometry(0.21, 16), racketNetMat);
    net.position.y = 0.65;
    this.racketSparkMesh = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.03, 6, 16), sparkMat);
    this.racketSparkMesh.position.y = 0.65;
    this.racketSparkMesh.visible = false;
    this.racketLight = new THREE.PointLight(0x45e8ff, 0, 12, 1.5);
    this.racketLight.position.set(0, 0.65, 0);

    this.racketGroup.add(handle, neckRacket, hoop, net, this.racketSparkMesh, this.racketLight);
    this.racketGroup.visible = false;
    this.armRight.add(this.racketGroup);

    // Head + Messy Gamer Hair + Glasses + Headset
    this.head.position.set(0, 1.9, 0);
    this.visual.add(this.head);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), skinMat);
    skull.scale.set(0.96, 1.04, 0.96);
    skull.castShadow = true;
    this.head.add(skull);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.255, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hair.position.set(0, 0.04, -0.02);
    hair.rotation.x = -0.25;
    this.head.add(hair);

    // Glasses + Eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), darkMat);
      eye.position.set(side * 0.085, 0.04, 0.22);
      this.head.add(eye);
      const lensFrame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.02), darkMat);
      lensFrame.position.set(side * 0.085, 0.04, 0.235);
      this.head.add(lensFrame);
    }

    // Headset ON
    const bandOn = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.026, 8, 18, Math.PI), darkMat);
    bandOn.rotation.y = Math.PI * 0.5;
    bandOn.position.y = 0.05;
    this.headsetOnGroup.add(bandOn);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12), darkMat);
      cup.rotation.z = Math.PI * 0.5;
      cup.position.set(side * 0.25, 0.02, 0);
      const led = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14), rgbCupMat);
      led.rotation.y = Math.PI * 0.5;
      led.position.set(side * 0.285, 0.02, 0);
      this.headsetOnGroup.add(cup, led);
    }
    this.head.add(this.headsetOnGroup);

    // Headset One-Side Tilted
    const bandTilt = bandOn.clone();
    bandTilt.rotation.z = -0.35;
    this.headsetTiltedGroup.add(bandTilt);
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12), darkMat);
    cupL.rotation.z = Math.PI * 0.5;
    cupL.position.set(-0.25, 0.02, 0);
    const cupR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12), darkMat);
    cupR.rotation.z = Math.PI * 0.5;
    cupR.position.set(0.24, 0.05, -0.14);
    this.headsetTiltedGroup.add(cupL, cupR);
    this.headsetTiltedGroup.visible = false;
    this.head.add(this.headsetTiltedGroup);
  }

  public getEyeWorldPosition(): THREE.Vector3 {
    const p = new THREE.Vector3(0, 1.9 * this.worldScale, 0.24 * this.worldScale);
    return p.applyQuaternion(this.root.quaternion).add(this.root.position);
  }

  public updatePose(
    dt: number,
    time: number,
    state: GamerState,
    isMoving: boolean,
    isSeated: boolean,
    swatSwing = 0,
    isTelegraphing = false
  ): void {
    // Headset visibility
    this.headsetOnGroup.visible = state === 'HEADSET_ON';
    this.headsetTiltedGroup.visible = state === 'RELAXED';

    // Phone Flashlight in HEADSET_OFF
    this.phoneGroup.visible = state === 'HEADSET_OFF';
    this.flashlightSpot.intensity = state === 'HEADSET_OFF' ? 5.0 : 0;

    // Electric Mosquito Racket in SWAT_ATTACK
    this.racketGroup.visible = state === 'SWAT_ATTACK';
    if (isTelegraphing) {
      const flicker = Math.sin(time * 48) > 0;
      this.racketSparkMesh.visible = flicker;
      this.racketSparkMesh.scale.setScalar(1 + Math.sin(time * 32) * 0.12);
      this.racketLight.intensity = flicker ? 4.5 : 1.2;
    } else {
      this.racketSparkMesh.visible = false;
      this.racketLight.intensity = 0;
    }

    if (isSeated) {
      // Sitting in gaming chair
      this.visual.position.y = -0.34;
      this.legLeft.rotation.x = -1.45;
      this.legRight.rotation.x = -1.45;
      this.torso.rotation.x = state === 'HEADSET_ON' ? 0.14 : 0.02;

      if (state === 'HEADSET_ON') {
        // Typing / mouse hand micro motion
        this.armLeft.rotation.set(-0.95 + Math.sin(time * 12) * 0.06, 0, 0);
        this.armRight.rotation.set(-0.95 + Math.cos(time * 9) * 0.05, Math.sin(time * 5) * 0.08, 0);
      } else {
        // Relaxed leaning / snacking
        this.armLeft.rotation.set(-0.65, 0, -0.15);
        this.armRight.rotation.set(-0.65, 0, 0.15);
      }
      return;
    }

    // Standing / Walking / Swatting / Panic
    this.visual.position.y = 0;
    if (isMoving) {
      this.walkPhase += dt * 10;
      const s = Math.sin(this.walkPhase) * 0.52;
      this.legLeft.rotation.x = s;
      this.legRight.rotation.x = -s;
    } else {
      this.legLeft.rotation.x *= 0.82;
      this.legRight.rotation.x *= 0.82;
    }

    if (state === 'PANIC_DEFEATED') {
      this.torso.rotation.x = -0.1;
      this.armLeft.rotation.set(-2.4 + Math.sin(time * 22) * 0.45, 0, -0.35);
      this.armRight.rotation.set(-2.4 - Math.sin(time * 22) * 0.45, 0, 0.35);
      return;
    }

    if (state === 'SWAT_ATTACK') {
      if (isTelegraphing) {
        this.torso.rotation.x = -0.15;
        this.armRight.rotation.set(-2.3, 0, 0.35);
        this.armLeft.rotation.set(-0.6, 0, -0.2);
      } else {
        this.torso.rotation.x = 0.22;
        this.armRight.rotation.set(-0.8 + swatSwing, swatSwing * 0.7, 0);
      }
      return;
    }

    // HEADSET_OFF flashlight inspection
    this.torso.rotation.x = 0.25;
    this.armLeft.rotation.set(-1.15, 0, 0);
    this.armRight.rotation.set(-0.35, 0, 0.18);
  }
}
