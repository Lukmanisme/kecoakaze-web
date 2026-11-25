import * as THREE from 'three';
import { RgbMood, WORLD_SCALE as S } from '../types';

export type SabotageVfxPreset =
  | 'veggies'
  | 'soup_steam'
  | 'crumbs'
  | 'soda_fizz'
  | 'lan_sparks'
  | 'screen_dust';

interface PooledParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  rotVel: THREE.Vector3;
  color: THREE.Color;
  baseScale: number;
  scaleRate: number;
  gravity: number;
  bounceFloorY: number; // < 0 means no bounce
  life: number;
  maxLife: number;
}

interface FanDustMote {
  dist: number;
  radial: number;
  angle: number;
  speed: number;
}

const POOL_SIZE = 220;
const DUST_COUNT = 40;
const SPARK_ARCS = 4;
const SPARK_SEGS_PER_ARC = 6;

export class VFXManager {
  // 1. Pooled InstancedMesh Particle System (Zero per-frame GC)
  private readonly pool: PooledParticle[] = [];
  private readonly instancedMesh: THREE.InstancedMesh;
  private readonly dummyMatrix = new THREE.Matrix4();
  private readonly dummyPos = new THREE.Vector3();
  private readonly dummyQuat = new THREE.Quaternion();
  private readonly dummyScale = new THREE.Vector3();
  private readonly zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private poolCursor = 0;

  // 2. Fan Wind Streamlines (7 curved additive ribbons with UV scroll) & 40 Dust Motes
  private fanWindGroup: THREE.Group | null = null;
  private fanStreamTex: THREE.CanvasTexture | null = null;
  private fanDustPoints: THREE.Points | null = null;
  private readonly fanDustMotes: FanDustMote[] = [];
  private fanConeLength = 6.6 * S;
  private fanConeHalfAngle = THREE.MathUtils.degToRad(24);

  // 3. Electric Swatter Zig-Zag Arcs & Flash
  private swatterLines: THREE.LineSegments | null = null;
  private swatterLinePositions: Float32Array | null = null;
  private swatterFlashMesh: THREE.Mesh | null = null;
  private swatterReseedTimer = 0;
  private swatterSparkEmitTimer = 0;
  private readonly tmpWorldVec = new THREE.Vector3();

  // 4. Fake Volumetric RGB Glow Meshes (AdditiveBlending, depthWrite: false)
  private readonly rgbGlowMeshes: THREE.Mesh[] = [];
  private monitorGlareCone: THREE.Mesh | null = null;
  private radialGlowTex: THREE.CanvasTexture | null = null;
  private coneGlowTex: THREE.CanvasTexture | null = null;
  private readonly tmpColorA = new THREE.Color();
  private readonly tmpColorB = new THREE.Color();

  constructor(private readonly scene: THREE.Scene) {
    // Initialize InstancedMesh Pool
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, POOL_SIZE);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.raycast = () => {};

    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color(0xffffff),
        baseScale: 1,
        scaleRate: 0,
        gravity: 14,
        bounceFloorY: -1,
        life: 0,
        maxLife: 1,
      });
      this.instancedMesh.setMatrixAt(i, this.zeroMatrix);
      this.instancedMesh.setColorAt(i, this.tmpColorA.setHex(0xffffff));
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.instancedMesh);
  }

  // -----------------------------------------------------------------
  // 1. OSCILLATING FAN WIND STREAMLINES & 40 DUST MOTES
  // -----------------------------------------------------------------
  public attachFanWindRig(
    headPivot: THREE.Group,
    coneLength: number,
    coneHalfAngle: number
  ): void {
    this.fanConeLength = coneLength;
    this.fanConeHalfAngle = coneHalfAngle;

    const group = new THREE.Group();
    group.name = 'VFX_FanWind';
    group.position.set(0, 0, 0.22 * S);
    headPivot.add(group);
    this.fanWindGroup = group;

    // Procedural UV-scroll streamline ribbon texture (fade-in -> bright streaks -> fade-out)
    this.fanStreamTex = this.createStreamlineTexture();
    const ribbonMat = new THREE.MeshBasicMaterial({
      map: this.fanStreamTex,
      color: 0x9df4ff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // 7 curved streamline ribbons fanned inside the wind cone
    const ribbonCount = 7;
    for (let i = 0; i < ribbonCount; i++) {
      const frac = i / (ribbonCount - 1) - 0.5; // -0.5..+0.5
      const yawSpread = frac * coneHalfAngle * 1.45;
      const yOffset = Math.sin(i * 1.7) * 0.18 * S;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.sin(yawSpread) * 0.2 * S, yOffset * 0.3, 0.1 * S),
        new THREE.Vector3(
          Math.sin(yawSpread) * coneLength * 0.35,
          yOffset + Math.cos(i) * 0.12 * S,
          coneLength * 0.33
        ),
        new THREE.Vector3(
          Math.sin(yawSpread) * coneLength * 0.7,
          yOffset * 0.5 - 0.08 * S,
          coneLength * 0.67
        ),
        new THREE.Vector3(Math.sin(yawSpread) * coneLength * 0.96, yOffset * 0.2, coneLength * 0.96),
      ]);

      const ribbonGeo = this.buildRibbonGeometry(curve, 18, 0.11 * S);
      const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbonMesh.raycast = () => {};
      group.add(ribbonMesh);
    }

    // 40 Micro Dust Motes
    this.fanDustMotes.length = 0;
    const positions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      this.fanDustMotes.push({
        dist: Math.random() * coneLength,
        radial: 0.1 + Math.random() * 0.85,
        angle: Math.random() * Math.PI * 2,
        speed: 13 + Math.random() * 9,
      });
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      map: this.getRadialGlowTexture(),
      color: 0xc2f8ff,
      size: 0.34,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(dustGeo, dustMat);
    pts.raycast = () => {};
    group.add(pts);
    this.fanDustPoints = pts;
  }

  private buildRibbonGeometry(
    curve: THREE.CatmullRomCurve3,
    segments: number,
    halfWidth: number
  ): THREE.BufferGeometry {
    const pos: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    const pts = curve.getPoints(segments);

    for (let i = 0; i <= segments; i++) {
      const p = pts[i];
      const u = i / segments;
      // Taper width slightly at tips
      const w = halfWidth * (0.65 + 0.55 * Math.sin(u * Math.PI));
      pos.push(p.x, p.y - w, p.z, p.x, p.y + w, p.z);
      uvs.push(u * 2.5, 0, u * 2.5, 1);
      if (i < segments) {
        const base = i * 2;
        idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    return geo;
  }

  private updateFanWindVfx(dt: number): void {
    if (!this.fanWindGroup || !this.fanWindGroup.visible) return;
    if (this.fanStreamTex) {
      this.fanStreamTex.offset.x = (this.fanStreamTex.offset.x - dt * 2.4) % 1;
    }
    if (this.fanDustPoints) {
      const attr = this.fanDustPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < DUST_COUNT; i++) {
        const m = this.fanDustMotes[i];
        m.dist += m.speed * dt;
        if (m.dist > this.fanConeLength) m.dist = 0.08 * S;
        const maxR = Math.max(0.22 * S, Math.tan(this.fanConeHalfAngle) * m.dist);
        const r = m.radial * maxR;
        attr.setXYZ(i, Math.cos(m.angle) * r, Math.sin(m.angle) * r * 0.55, m.dist);
      }
      attr.needsUpdate = true;
    }
  }

  // -----------------------------------------------------------------
  // 2. SABOTAGE PARTICLE POOL, TICK PARTICLES & DODGE TRAIL
  // -----------------------------------------------------------------
  public spawnSabotageBurst(position: THREE.Vector3, preset: SabotageVfxPreset): void {
    switch (preset) {
      case 'veggies':
        // Potongan hijau & oranye memantul di talenan
        this.emitBurst(position, [0x5f9e58, 0x8be08f, 0xe89b3c, 0xff7043], 24, 5.4, 17, 1.0, -0.3, position.y - 0.18);
        break;
      case 'soup_steam':
        // Uap putih/kuning naik ke atas dengan ekspansi skala
        this.emitBurst(position, [0xffffff, 0xfff3b0, 0xdff7d8], 20, 2.2, -3.6, 1.3, 1.35, -1);
        break;
      case 'crumbs':
        // Remah cokelat/krem di meja makan
        this.emitBurst(position, [0xa9774f, 0xd1a867, 0xede6d3, 0x7a4128], 26, 6.4, 17, 0.95, -0.2, position.y - 0.14);
        break;
      case 'soda_fizz':
        // Percikan gelembung hijau neon dari kaleng minuman
        this.emitBurst(position, [0x45f59c, 0x00e5ff, 0xaaff44], 24, 5.8, 12, 0.85, 0.5, -1);
        break;
      case 'lan_sparks':
        // Percikan korsleting kuning-oranye singkat di belakang PC
        this.emitBurst(position, [0xffd54f, 0xff9100, 0xffffff], 28, 8.2, 16, 0.72, -1.2, -1);
        break;
      case 'screen_dust':
        // Kepulan debu & kilau statis di layar monitor
        this.emitBurst(position, [0xb8f6ff, 0xffbf52, 0xffffff, 0x59e0ba], 26, 5.6, 7.5, 1.0, 0.6, -1);
        break;
    }
  }

  public spawnTickParticle(position: THREE.Vector3, colorHex = 0xffbf52): void {
    const p = this.allocParticle();
    p.pos.set(
      position.x + (Math.random() - 0.5) * 0.4,
      position.y + 0.12 + Math.random() * 0.2,
      position.z + (Math.random() - 0.5) * 0.4
    );
    p.vel.set((Math.random() - 0.5) * 1.6, 2.2 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6);
    p.rot.set(Math.random() * 3, Math.random() * 3, 0);
    p.rotVel.set(6, 8, 4);
    p.color.setHex(colorHex);
    p.baseScale = 0.55 + Math.random() * 0.35;
    p.scaleRate = -0.8;
    p.gravity = 7.5;
    p.bounceFloorY = -1;
    p.life = 0;
    p.maxLife = 0.38;
  }

  public spawnDodgeTrail(position: THREE.Vector3, velocityDir: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      const p = this.allocParticle();
      p.pos.set(
        position.x + (Math.random() - 0.5) * 0.35,
        position.y + 0.1 + Math.random() * 0.25,
        position.z + (Math.random() - 0.5) * 0.35
      );
      p.vel.set(
        -velocityDir.x * (1.8 + Math.random() * 2.2) + (Math.random() - 0.5) * 1.1,
        0.5 + Math.random() * 0.8,
        -velocityDir.z * (1.8 + Math.random() * 2.2) + (Math.random() - 0.5) * 1.1
      );
      p.rot.set(0, Math.random() * 3, 0);
      p.rotVel.set(3, 5, 3);
      p.color.setHex(i % 2 === 0 ? 0x9df4ff : 0x59e0ba);
      p.baseScale = 0.72 + Math.random() * 0.35;
      p.scaleRate = -1.4;
      p.gravity = 1.2;
      p.bounceFloorY = -1;
      p.life = 0;
      p.maxLife = 0.34;
    }
  }

  private emitBurst(
    origin: THREE.Vector3,
    palette: number[],
    count: number,
    speed: number,
    gravity: number,
    baseScale: number,
    scaleRate: number,
    bounceFloorY: number
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      p.pos.set(
        origin.x + (Math.random() - 0.5) * 0.4,
        origin.y + Math.random() * 0.22,
        origin.z + (Math.random() - 0.5) * 0.4
      );
      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.3 + Math.random() * 0.7) * speed;
      const up = (gravity < 0 ? 1.6 : 2.5) + Math.random() * speed * 0.65;
      p.vel.set(Math.cos(angle) * horiz, up, Math.sin(angle) * horiz);
      p.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      p.rotVel.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      p.color.setHex(palette[i % palette.length]);
      p.baseScale = baseScale * (0.7 + Math.random() * 0.6);
      p.scaleRate = scaleRate;
      p.gravity = gravity;
      p.bounceFloorY = bounceFloorY;
      p.life = 0;
      p.maxLife = gravity < 0 ? 0.95 + Math.random() * 0.4 : 0.62 + Math.random() * 0.38;
    }
  }

  private allocParticle(): PooledParticle {
    const p = this.pool[this.poolCursor];
    this.poolCursor = (this.poolCursor + 1) % POOL_SIZE;
    p.active = true;
    return p;
  }

  // -----------------------------------------------------------------
  // 3. ELECTRIC SWATTER ZIG-ZAG ARCS & SPARKS (Bab 02 SWAT_ATTACK)
  // -----------------------------------------------------------------
  public attachSwatterRig(racketNetRoot: THREE.Group): void {
    const totalVerts = SPARK_ARCS * SPARK_SEGS_PER_ARC * 2;
    this.swatterLinePositions = new Float32Array(totalVerts * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.swatterLinePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5cf2ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(geo, lineMat);
    lines.position.set(0, 0.65, 0.02);
    lines.visible = false;
    lines.raycast = () => {};
    racketNetRoot.add(lines);
    this.swatterLines = lines;

    const flashGeo = new THREE.PlaneGeometry(0.68, 0.68);
    const flashMat = new THREE.MeshBasicMaterial({
      map: this.getRadialGlowTexture(),
      color: 0x7df9ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(0, 0.65, 0.03);
    flash.visible = false;
    flash.raycast = () => {};
    racketNetRoot.add(flash);
    this.swatterFlashMesh = flash;
  }

  public updateSwatterSparks(
    dt: number,
    isTelegraphing: boolean,
    progress: number
  ): void {
    if (!this.swatterLines || !this.swatterLinePositions || !this.swatterFlashMesh) return;

    if (!isTelegraphing) {
      this.swatterLines.visible = false;
      this.swatterFlashMesh.visible = false;
      return;
    }

    this.swatterLines.visible = true;
    this.swatterFlashMesh.visible = true;

    // Brief intense flash right before swing executes
    const flashMat = this.swatterFlashMesh.material as THREE.MeshBasicMaterial;
    const preSwingSpike = progress > 0.85 ? (progress - 0.85) / 0.15 : 0;
    flashMat.opacity = 0.22 + preSwingSpike * 0.72;
    this.swatterFlashMesh.scale.setScalar(1.0 + preSwingSpike * 0.85);

    // Re-randomize zig-zag arc vertices every 40ms
    this.swatterReseedTimer += dt;
    if (this.swatterReseedTimer >= 0.04) {
      this.swatterReseedTimer = 0;
      const arr = this.swatterLinePositions;
      let ptr = 0;
      const radius = 0.2;

      for (let a = 0; a < SPARK_ARCS; a++) {
        const ang0 = Math.random() * Math.PI * 2;
        const ang1 = ang0 + Math.PI * (0.65 + Math.random() * 0.7);
        const x0 = Math.cos(ang0) * radius;
        const y0 = Math.sin(ang0) * radius;
        const x1 = Math.cos(ang1) * radius;
        const y1 = Math.sin(ang1) * radius;

        let px = x0;
        let py = y0;
        let pz = 0;
        for (let s = 1; s <= SPARK_SEGS_PER_ARC; s++) {
          const t = s / SPARK_SEGS_PER_ARC;
          const jitter = s === SPARK_SEGS_PER_ARC ? 0 : 0.055;
          const nx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * jitter;
          const ny = y0 + (y1 - y0) * t + (Math.random() - 0.5) * jitter;
          const nz = (Math.random() - 0.5) * jitter;

          arr[ptr++] = px;
          arr[ptr++] = py;
          arr[ptr++] = pz;
          arr[ptr++] = nx;
          arr[ptr++] = ny;
          arr[ptr++] = nz;

          px = nx;
          py = ny;
          pz = nz;
        }
      }
      (this.swatterLines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    // Emit small electric spark particles from the racket world position
    this.swatterSparkEmitTimer += dt;
    if (this.swatterSparkEmitTimer >= 0.09) {
      this.swatterSparkEmitTimer = 0;
      this.swatterLines.getWorldPosition(this.tmpWorldVec);
      const p = this.allocParticle();
      p.pos.copy(this.tmpWorldVec);
      p.vel.set((Math.random() - 0.5) * 4.2, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4.2);
      p.rot.set(0, 0, 0);
      p.rotVel.set(8, 8, 8);
      p.color.setHex(progress > 0.85 ? 0xffffff : 0x5cf2ff);
      p.baseScale = 0.5;
      p.scaleRate = -1.5;
      p.gravity = 9;
      p.bounceFloorY = -1;
      p.life = 0;
      p.maxLife = 0.25;
    }
  }

  // -----------------------------------------------------------------
  // 4. FAKE VOLUMETRIC RGB GLOW, MONITOR FLASHBANG & CARAPACE RIM-LIGHT
  // -----------------------------------------------------------------
  public attachRgbGlowRig(
    parent: THREE.Object3D,
    deskCenter: THREE.Vector3,
    pcCenter: THREE.Vector3,
    monitorCenter: THREE.Vector3
  ): void {
    const radialTex = this.getRadialGlowTexture();
    const coneTex = this.getConeGlowTexture();

    const makeGlowPlane = (w: number, h: number, pos: THREE.Vector3, rotX: number, opacity: number) => {
      const mat = new THREE.MeshBasicMaterial({
        map: radialTex,
        color: 0x5b6cff,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.copy(pos);
      mesh.rotation.x = rotX;
      mesh.raycast = () => {};
      parent.add(mesh);
      this.rgbGlowMeshes.push(mesh);
      return mesh;
    };

    // Desk LED volumetric glow plane along desk back/surface
    makeGlowPlane(
      2.8 * S,
      1.2 * S,
      deskCenter.clone().add(new THREE.Vector3(0, 0.04 * S, 0.1 * S)),
      -Math.PI * 0.5,
      0.32
    );

    // PC Case tempered-glass aura
    makeGlowPlane(
      0.75 * S,
      0.75 * S,
      pcCenter.clone().add(new THREE.Vector3(-0.22 * S, 0, 0)),
      0,
      0.38
    );

    // Monitor front volumetric light cone (faces -Z toward desk & Gamer)
    const coneMat = new THREE.MeshBasicMaterial({
      map: coneTex,
      color: 0x7c9eff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * S, 1.15 * S), coneMat);
    cone.position.copy(monitorCenter).add(new THREE.Vector3(0, -0.22 * S, -0.58 * S));
    cone.rotation.x = -Math.PI * 0.38;
    cone.raycast = () => {};
    parent.add(cone);
    this.monitorGlareCone = cone;
  }

  public syncRgbGlow(
    primaryHex: number,
    secondaryHex: number,
    mood: RgbMood
  ): void {
    this.tmpColorA.setHex(primaryHex);
    this.tmpColorB.setHex(secondaryHex);

    if (this.rgbGlowMeshes[0]) {
      const m = this.rgbGlowMeshes[0].material as THREE.MeshBasicMaterial;
      m.color.copy(this.tmpColorA);
      m.opacity = mood === 'flashbang' ? 0.65 : mood === 'reactive' ? 0.38 : 0.28;
    }
    if (this.rgbGlowMeshes[1]) {
      const m = this.rgbGlowMeshes[1].material as THREE.MeshBasicMaterial;
      m.color.copy(this.tmpColorB);
      m.opacity = mood === 'flashbang' ? 0.62 : 0.36;
    }
    if (this.monitorGlareCone) {
      const m = this.monitorGlareCone.material as THREE.MeshBasicMaterial;
      m.color.copy(this.tmpColorA);
      m.opacity = mood === 'flashbang' ? 0.72 : mood === 'reactive' ? 0.28 : 0.2;
    }
  }

  public updateKokoStealthRim(
    materials: THREE.MeshToonMaterial[],
    isBab2: boolean,
    isInSafeCover: boolean,
    isOnDesk: boolean,
    mood: RgbMood,
    primaryHex: number
  ): void {
    if (!isBab2) {
      // Bab 01 clean subtle teal rim tint
      for (const m of materials) {
        m.emissive.setHex(0x1b362b);
        m.emissiveIntensity = 0.28;
      }
      return;
    }

    if (isInSafeCover) {
      for (const m of materials) {
        m.emissive.setHex(0x0b1622);
        m.emissiveIntensity = 0.14;
      }
      return;
    }

    if (mood === 'flashbang' && isOnDesk) {
      for (const m of materials) {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity = 1.55;
      }
      return;
    }

    const intensity = isOnDesk ? (mood === 'reactive' ? 0.85 : 0.62) : 0.3;
    for (const m of materials) {
      m.emissive.setHex(primaryHex);
      m.emissiveIntensity = intensity;
    }
  }

  // -----------------------------------------------------------------
  // MAIN FRAME UPDATE & RESET
  // -----------------------------------------------------------------
  public update(dt: number): void {
    this.updateFanWindVfx(dt);

    let dirty = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.instancedMesh.setMatrixAt(i, this.zeroMatrix);
        continue;
      }

      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);

      if (p.bounceFloorY >= 0 && p.pos.y < p.bounceFloorY) {
        p.pos.y = p.bounceFloorY;
        p.vel.y = Math.abs(p.vel.y) * 0.42;
        p.vel.x *= 0.72;
        p.vel.z *= 0.72;
      }

      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;

      const t = p.life / p.maxLife;
      const s = Math.max(0.02, p.baseScale * (1 + p.scaleRate * t) * (1 - t * 0.45));

      this.dummyPos.copy(p.pos);
      this.dummyQuat.setFromEuler(p.rot);
      this.dummyScale.setScalar(s);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);

      this.instancedMesh.setMatrixAt(i, this.dummyMatrix);
      this.instancedMesh.setColorAt(i, p.color);
    }

    if (dirty) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public reset(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i].active = false;
      this.instancedMesh.setMatrixAt(i, this.zeroMatrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.poolCursor = 0;
    this.swatterReseedTimer = 0;
    this.swatterSparkEmitTimer = 0;
    if (this.swatterLines) this.swatterLines.visible = false;
    if (this.swatterFlashMesh) this.swatterFlashMesh.visible = false;
  }

  // -----------------------------------------------------------------
  // PROCEDURAL TEXTURE HELPERS
  // -----------------------------------------------------------------
  private getRadialGlowTexture(): THREE.CanvasTexture {
    if (this.radialGlowTex) return this.radialGlowTex;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.radialGlowTex = tex;
    return tex;
  }

  private getConeGlowTexture(): THREE.CanvasTexture {
    if (this.coneGlowTex) return this.coneGlowTex;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.coneGlowTex = tex;
    return tex;
  }

  private createStreamlineTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 32);

    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.25)');
    grad.addColorStop(0.8, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 10, 256, 12);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
