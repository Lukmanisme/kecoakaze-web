import * as THREE from 'three';

export type ParticleBurstKind =
  | 'veg'
  | 'soup'
  | 'table'
  | 'drink_splash'
  | 'lan_sparks'
  | 'screen_terror';

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  scaleShrink: boolean;
}

export class ParticleFXManager {
  private readonly particles: BurstParticle[] = [];
  private readonly boxGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private readonly puffGeo = new THREE.SphereGeometry(0.18, 6, 6);

  constructor(private readonly scene: THREE.Scene) {}

  public spawnBurst(kind: ParticleBurstKind, origin: THREE.Vector3): void {
    switch (kind) {
      case 'veg':
        this.emitBurst(origin, [0xe89b3c, 0xb9463f, 0x5f9e58, 0x8be08f], 22, 5.5, 16, false);
        break;
      case 'soup':
        this.emitBurst(origin, [0x6ea63a, 0xe89b3c, 0xede6d3], 16, 6.2, 15, false);
        this.emitBurst(origin.clone().add(new THREE.Vector3(0, 0.25, 0)), [0xffffff, 0xdff5f0], 14, 2.8, -3.2, true);
        break;
      case 'table':
        this.emitBurst(origin, [0xd1a867, 0x7a4128, 0xb9463f, 0xf1d45c], 26, 6.8, 17, false);
        break;
      case 'drink_splash':
        this.emitBurst(origin, [0x45f59c, 0x00e5ff, 0xf4f1e8], 22, 5.8, 15, false);
        break;
      case 'lan_sparks':
        this.emitBurst(origin, [0x42d4ff, 0xffd54f, 0xffffff], 26, 7.6, 12, false);
        break;
      case 'screen_terror':
        this.emitBurst(origin, [0xffbf52, 0x59e0ba, 0xff5f8f, 0xffffff], 28, 6.5, 10, false);
        break;
    }
  }

  private emitBurst(
    origin: THREE.Vector3,
    palette: number[],
    count: number,
    speed: number,
    gravity: number,
    isPuff: boolean
  ): void {
    for (let i = 0; i < count; i++) {
      const color = palette[i % palette.length];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isPuff ? 0.68 : 0.95,
      });
      const mesh = new THREE.Mesh(isPuff ? this.puffGeo : this.boxGeo, mat);
      mesh.position.copy(origin).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.45,
          Math.random() * 0.25,
          (Math.random() - 0.5) * 0.45
        )
      );
      const scale = (isPuff ? 0.8 : 0.65) + Math.random() * 0.75;
      mesh.scale.setScalar(scale);
      mesh.raycast = () => {};
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.3 + Math.random() * 0.7) * speed;
      const up = (isPuff ? 1.8 : 2.6) + Math.random() * speed * 0.75;

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(angle) * horiz, up, Math.sin(angle) * horiz),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        life: 0,
        maxLife: isPuff ? 0.85 + Math.random() * 0.4 : 0.65 + Math.random() * 0.45,
        gravity,
        scaleShrink: !isPuff,
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;
      p.mesh.rotation.z += p.rotSpeed.z * dt;

      const t = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (p.scaleShrink ? 0.95 : 0.68) * (1 - t);
      if (p.scaleShrink) {
        p.mesh.scale.multiplyScalar(1 - dt * 0.55);
      } else {
        p.mesh.scale.multiplyScalar(1 + dt * 0.7);
      }
    }
  }

  public clear(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles.length = 0;
  }
}
