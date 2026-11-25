import * as THREE from 'three';

export interface CeramicOptions {
  variant: 'floor40' | 'backsplash';
  colorA: string;
  colorB: string;
  groutColor: string;
  repeatX: number;
  repeatY: number;
  roughness?: number;
}

export interface WoodOptions {
  key: string;
  baseHex: string;
  altHex: string;
  grainHex: string;
  planks?: number;
  repeatX?: number;
  repeatY?: number;
  roughness?: number;
}

export interface PlasticOptions {
  colorHex: number;
  variant?: 'satin' | 'galon';
  roughness?: number;
}

export interface MetalOptions {
  variant: 'stainless' | 'powder';
  colorHex: number;
  roughness?: number;
}

export class ProceduralTextures {
  private readonly cachedTextures: THREE.CanvasTexture[] = [];
  private readonly materialCache = new Map<string, THREE.MeshStandardMaterial>();
  private currentAnisotropy = 4;

  // Shared micro bump & roughness maps to save GPU memory across similar materials
  private satinPlasticBump: THREE.CanvasTexture | null = null;
  private satinPlasticRough: THREE.CanvasTexture | null = null;
  private brushedMetalMap: THREE.CanvasTexture | null = null;
  private brushedMetalRough: THREE.CanvasTexture | null = null;
  private powderMetalBump: THREE.CanvasTexture | null = null;
  private powderMetalRough: THREE.CanvasTexture | null = null;

  constructor(private readonly maxSupportedAnisotropy = 8) {}

  public setAnisotropy(target: number): void {
    const clamped = Math.max(1, Math.min(this.maxSupportedAnisotropy, target));
    if (clamped === this.currentAnisotropy) return;
    this.currentAnisotropy = clamped;
    for (const tex of this.cachedTextures) {
      tex.anisotropy = clamped;
      tex.needsUpdate = true;
    }
  }

  public getAnisotropy(): number {
    return this.currentAnisotropy;
  }

  private registerTex(tex: THREE.CanvasTexture, srgb: boolean, rx = 1, ry = 1): THREE.CanvasTexture {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = this.currentAnisotropy;
    tex.needsUpdate = true;
    this.cachedTextures.push(tex);
    return tex;
  }

  /**
   * 1. KERAMIK PBR (Lantai 40x40 cm & Backsplash Dinding)
   * Menghasilkan map warna, bumpMap cekung pada nat, dan roughnessMap (ubin licin vs nat matte).
   */
  public createCeramicMaterial(opts: CeramicOptions): THREE.MeshStandardMaterial {
    const cacheKey = `ceramic:${opts.variant}:${opts.colorA}:${opts.colorB}:${opts.groutColor}:${opts.repeatX.toFixed(2)}:${opts.repeatY.toFixed(2)}`;
    const existing = this.materialCache.get(cacheKey);
    if (existing) return existing;

    const size = 256;
    const cols = opts.variant === 'floor40' ? 2 : 2;
    const rows = opts.variant === 'floor40' ? 2 : 4;
    const cellW = size / cols;
    const cellH = size / rows;
    const groutW = opts.variant === 'floor40' ? 5 : 4;

    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const dctx = diffCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d')!;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isAlt = opts.variant === 'floor40' ? (x + y) % 2 === 1 : y % 2 === 1;
        dctx.fillStyle = isAlt ? opts.colorB : opts.colorA;
        dctx.fillRect(x * cellW, y * cellH, cellW, cellH);

        // Tile surface high in bump, glossy low value in roughnessMap
        bctx.fillStyle = '#ececec';
        bctx.fillRect(x * cellW, y * cellH, cellW, cellH);
        rctx.fillStyle = opts.variant === 'floor40' ? '#424242' : '#3a3a3a';
        rctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }

    // Subtle organic glaze speckles
    for (let i = 0; i < 220; i++) {
      const px = (i * 73) % size;
      const py = (i * 137) % size;
      dctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(60,55,48,0.04)';
      dctx.fillRect(px, py, 3, 3);
      rctx.fillStyle = i % 2 === 0 ? 'rgba(90,90,90,0.18)' : 'rgba(40,40,40,0.15)';
      rctx.fillRect(px, py, 4, 4);
    }

    // Grout lines (recessed in bumpMap, matte in roughnessMap)
    dctx.strokeStyle = opts.groutColor;
    dctx.lineWidth = groutW;
    bctx.strokeStyle = '#1c1c1c';
    bctx.lineWidth = groutW + 1;
    rctx.strokeStyle = '#e8e8e8';
    rctx.lineWidth = groutW + 1;

    const strokeGrid = (ctx: CanvasRenderingContext2D) => {
      for (let c = 0; c <= cols; c++) {
        const x = c * cellW + (opts.variant === 'backsplash' ? 0 : 0);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * cellH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    };
    strokeGrid(dctx);
    strokeGrid(bctx);
    strokeGrid(rctx);

    const map = this.registerTex(new THREE.CanvasTexture(diffCanvas), true, opts.repeatX, opts.repeatY);
    const bumpMap = this.registerTex(new THREE.CanvasTexture(bumpCanvas), false, opts.repeatX, opts.repeatY);
    const roughnessMap = this.registerTex(new THREE.CanvasTexture(roughCanvas), false, opts.repeatX, opts.repeatY);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      bumpMap,
      bumpScale: 0.032,
      roughnessMap,
      roughness: opts.roughness ?? 0.26,
      metalness: 0.04,
      envMapIntensity: 0.9,
    });
    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  /**
   * 2. KAYU PBR (Jati / Mahoni matte dengan bumpMap serat halus)
   */
  public createWoodMaterial(opts: WoodOptions): THREE.MeshStandardMaterial {
    const rx = opts.repeatX ?? 1;
    const ry = opts.repeatY ?? 1;
    const cacheKey = `wood:${opts.key}:${opts.baseHex}:${rx.toFixed(2)}:${ry.toFixed(2)}`;
    const existing = this.materialCache.get(cacheKey);
    if (existing) return existing;

    const size = 256;
    const planks = opts.planks ?? 4;
    const plankH = size / planks;

    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const dctx = diffCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d')!;

    for (let i = 0; i < planks; i++) {
      dctx.fillStyle = i % 2 === 0 ? opts.baseHex : opts.altHex;
      dctx.fillRect(0, i * plankH, size, plankH);

      bctx.fillStyle = '#c8c8c8';
      bctx.fillRect(0, i * plankH, size, plankH);

      rctx.fillStyle = i % 2 === 0 ? '#bdbdbd' : '#c9c9c9';
      rctx.fillRect(0, i * plankH, size, plankH);

      // Plank seam
      dctx.strokeStyle = opts.grainHex;
      dctx.lineWidth = 3;
      dctx.beginPath();
      dctx.moveTo(0, i * plankH);
      dctx.lineTo(size, i * plankH);
      dctx.stroke();

      bctx.strokeStyle = '#383838';
      bctx.lineWidth = 3;
      bctx.beginPath();
      bctx.moveTo(0, i * plankH);
      bctx.lineTo(size, i * plankH);
      bctx.stroke();

      // Organic wood grain waves
      for (let g = 0; g < 6; g++) {
        const y = i * plankH + (g + 0.5) * (plankH / 6.2);
        const wave = ((g + i) % 2 === 0 ? 1 : -1) * (3 + (g % 3) * 1.5);
        dctx.strokeStyle = opts.grainHex;
        dctx.globalAlpha = 0.28 + (g % 2) * 0.12;
        dctx.lineWidth = 1.6;
        dctx.beginPath();
        dctx.moveTo(0, y);
        dctx.bezierCurveTo(size * 0.32, y - wave, size * 0.68, y + wave, size, y);
        dctx.stroke();

        bctx.strokeStyle = '#848484';
        bctx.lineWidth = 1.4;
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.bezierCurveTo(size * 0.32, y - wave, size * 0.68, y + wave, size, y);
        bctx.stroke();
      }
      dctx.globalAlpha = 1;
    }

    const map = this.registerTex(new THREE.CanvasTexture(diffCanvas), true, rx, ry);
    const bumpMap = this.registerTex(new THREE.CanvasTexture(bumpCanvas), false, rx, ry);
    const roughnessMap = this.registerTex(new THREE.CanvasTexture(roughCanvas), false, rx, ry);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      bumpMap,
      bumpScale: 0.024,
      roughnessMap,
      roughness: opts.roughness ?? 0.74,
      metalness: 0.0,
      envMapIntensity: 0.38,
    });
    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  /**
   * 3. PLASTIK PBR (Satin-matte mikro-tekstur & Galon Air Mineral semi-transparan)
   */
  public createPlasticMaterial(opts: PlasticOptions): THREE.MeshStandardMaterial {
    const variant = opts.variant ?? 'satin';
    const cacheKey = `plastic:${variant}:${opts.colorHex}:${opts.roughness ?? 'def'}`;
    const existing = this.materialCache.get(cacheKey);
    if (existing) return existing;

    if (variant === 'galon') {
      const mat = new THREE.MeshStandardMaterial({
        color: opts.colorHex,
        roughness: opts.roughness ?? 0.16,
        metalness: 0.06,
        transparent: true,
        opacity: 0.72,
        envMapIntensity: 1.25,
      });
      this.materialCache.set(cacheKey, mat);
      return mat;
    }

    this.ensureSatinPlasticMaps();
    const mat = new THREE.MeshStandardMaterial({
      color: opts.colorHex,
      bumpMap: this.satinPlasticBump,
      bumpScale: 0.008,
      roughnessMap: this.satinPlasticRough,
      roughness: opts.roughness ?? 0.48,
      metalness: 0.0,
      envMapIntensity: 0.65,
    });
    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  /**
   * 4. LOGAM PBR (Stainless Steel brushed vs Powder-Coated / Dicat)
   */
  public createMetalMaterial(opts: MetalOptions): THREE.MeshStandardMaterial {
    const cacheKey = `metal:${opts.variant}:${opts.colorHex}:${opts.roughness ?? 'def'}`;
    const existing = this.materialCache.get(cacheKey);
    if (existing) return existing;

    if (opts.variant === 'stainless') {
      this.ensureBrushedMetalMaps();
      const mat = new THREE.MeshStandardMaterial({
        color: opts.colorHex,
        bumpMap: this.brushedMetalMap,
        bumpScale: 0.01,
        roughnessMap: this.brushedMetalRough,
        metalness: 0.88,
        roughness: opts.roughness ?? 0.24,
        envMapIntensity: 1.35,
      });
      this.materialCache.set(cacheKey, mat);
      return mat;
    }

    // Powder-coated / painted metal (LPG melon cylinder, iron bars, table frames)
    this.ensurePowderMetalMaps();
    const mat = new THREE.MeshStandardMaterial({
      color: opts.colorHex,
      bumpMap: this.powderMetalBump,
      bumpScale: 0.012,
      roughnessMap: this.powderMetalRough,
      metalness: 0.35,
      roughness: opts.roughness ?? 0.45,
      envMapIntensity: 0.85,
    });
    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  /**
   * Helper PBR matte (cat dinding, kain, kulit, makanan, kardus) agar harmonis dengan scene.environment.
   */
  public createMatteMaterial(
    colorHex: number,
    options: {
      map?: THREE.Texture;
      emissive?: number;
      emissiveIntensity?: number;
      roughness?: number;
      metalness?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
      envMapIntensity?: number;
    } = {}
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: options.map ? 0xffffff : colorHex,
      map: options.map,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 1,
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0.0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      envMapIntensity: options.envMapIntensity ?? 0.42,
    });
  }

  /**
   * Static lightweight indoor PMREM environment map for metallic & ceramic reflections (zero per-frame cost).
   */
  public buildIndoorEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
    const envScene = new THREE.Scene();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(14, 9, 14),
      new THREE.MeshBasicMaterial({ color: 0x625a4e, side: THREE.BackSide })
    );
    envScene.add(box);

    // Warm indoor ceiling glow strip
    const ceilingLightPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 3.2),
      new THREE.MeshBasicMaterial({ color: 0xfff5dc, side: THREE.DoubleSide })
    );
    ceilingLightPanel.position.set(0, 4.3, 0);
    ceilingLightPanel.rotation.x = Math.PI * 0.5;
    envScene.add(ceilingLightPanel);

    // Cool fill bounce panel (window/RGB accent feel)
    const sideAccent = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3.5),
      new THREE.MeshBasicMaterial({ color: 0x8db8c8, side: THREE.DoubleSide })
    );
    sideAccent.position.set(-6.8, 1.2, 0);
    sideAccent.rotation.y = Math.PI * 0.5;
    envScene.add(sideAccent);

    const floorBounce = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0x8b7e6b, side: THREE.DoubleSide })
    );
    floorBounce.position.set(0, -4.3, 0);
    floorBounce.rotation.x = -Math.PI * 0.5;
    envScene.add(floorBounce);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTarget = pmrem.fromScene(envScene, 0.04);

    // Clean up source helper objects immediately
    box.geometry.dispose();
    (box.material as THREE.Material).dispose();
    ceilingLightPanel.geometry.dispose();
    (ceilingLightPanel.material as THREE.Material).dispose();
    sideAccent.geometry.dispose();
    (sideAccent.material as THREE.Material).dispose();
    floorBounce.geometry.dispose();
    (floorBounce.material as THREE.Material).dispose();
    pmrem.dispose();

    return envTarget.texture;
  }

  private ensureSatinPlasticMaps(): void {
    if (this.satinPlasticBump && this.satinPlasticRough) return;
    const size = 128;
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size;
    bCanvas.height = size;
    const bctx = bCanvas.getContext('2d')!;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rctx = rCanvas.getContext('2d')!;

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#787878';
    rctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 650; i++) {
      const x = (i * 53) % size;
      const y = (i * 97) % size;
      bctx.fillStyle = i % 2 === 0 ? '#949494' : '#6c6c6c';
      bctx.fillRect(x, y, 2, 2);
      rctx.fillStyle = i % 3 === 0 ? '#8c8c8c' : '#666666';
      rctx.fillRect(x, y, 2, 2);
    }

    this.satinPlasticBump = this.registerTex(new THREE.CanvasTexture(bCanvas), false, 3, 3);
    this.satinPlasticRough = this.registerTex(new THREE.CanvasTexture(rCanvas), false, 3, 3);
  }

  private ensureBrushedMetalMaps(): void {
    if (this.brushedMetalMap && this.brushedMetalRough) return;
    const size = 128;
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size;
    bCanvas.height = size;
    const bctx = bCanvas.getContext('2d')!;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rctx = rCanvas.getContext('2d')!;

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#3d3d3d';
    rctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 2) {
      bctx.fillStyle = y % 4 === 0 ? '#9e9e9e' : '#646464';
      bctx.fillRect(0, y, size, 1);
      rctx.fillStyle = y % 6 === 0 ? '#505050' : '#333333';
      rctx.fillRect(0, y, size, 1);
    }

    this.brushedMetalMap = this.registerTex(new THREE.CanvasTexture(bCanvas), false, 2, 2);
    this.brushedMetalRough = this.registerTex(new THREE.CanvasTexture(rCanvas), false, 2, 2);
  }

  private ensurePowderMetalMaps(): void {
    if (this.powderMetalBump && this.powderMetalRough) return;
    const size = 128;
    const bCanvas = document.createElement('canvas');
    bCanvas.width = size;
    bCanvas.height = size;
    const bctx = bCanvas.getContext('2d')!;

    const rCanvas = document.createElement('canvas');
    rCanvas.width = size;
    rCanvas.height = size;
    const rctx = rCanvas.getContext('2d')!;

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#737373';
    rctx.fillRect(0, 0, size, size);

    // Powder texture & subtle edge wear band
    for (let i = 0; i < 420; i++) {
      const x = (i * 41) % size;
      const y = (i * 83) % size;
      bctx.fillStyle = i % 2 === 0 ? '#969696' : '#686868';
      bctx.fillRect(x, y, 2, 2);
      rctx.fillStyle = i % 2 === 0 ? '#858585' : '#606060';
      rctx.fillRect(x, y, 3, 2);
    }
    rctx.strokeStyle = '#3c3c3c';
    rctx.lineWidth = 4;
    rctx.strokeRect(2, 2, size - 4, size - 4);

    this.powderMetalBump = this.registerTex(new THREE.CanvasTexture(bCanvas), false, 2, 2);
    this.powderMetalRough = this.registerTex(new THREE.CanvasTexture(rCanvas), false, 2, 2);
  }
}
