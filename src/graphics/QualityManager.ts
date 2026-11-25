import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures';
import { VFXManager } from '../vfx/VFXManager';

export type QualityTier = 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW';
export type QualityMode = 'AUTO' | QualityTier;

export interface QualityPreset {
  tier: QualityTier;
  labelId: string;
  pixelRatio: number;
  shadowEnabled: boolean;
  shadowMapSize: number;
  shadowType: THREE.ShadowMapType;
  particleScale: number;
  enableAmbientDust: boolean;
  anisotropy: number;
}

const QUALITY_STORAGE_KEY = 'kecoakaze_quality_mode_v1';

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  ULTRA: {
    tier: 'ULTRA',
    labelId: 'ULTRA',
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2.0),
    shadowEnabled: true,
    shadowMapSize: 2048,
    shadowType: THREE.PCFSoftShadowMap,
    particleScale: 1.0,
    enableAmbientDust: true,
    anisotropy: 8,
  },
  HIGH: {
    tier: 'HIGH',
    labelId: 'TINGGI',
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    shadowEnabled: true,
    shadowMapSize: 1024,
    shadowType: THREE.PCFSoftShadowMap,
    particleScale: 0.75,
    enableAmbientDust: true,
    anisotropy: 4,
  },
  MEDIUM: {
    tier: 'MEDIUM',
    labelId: 'SEDANG',
    pixelRatio: 1.15,
    shadowEnabled: true,
    shadowMapSize: 512,
    shadowType: THREE.BasicShadowMap,
    particleScale: 0.45,
    enableAmbientDust: false,
    anisotropy: 2,
  },
  LOW: {
    tier: 'LOW',
    labelId: 'RINGAN',
    pixelRatio: 0.85,
    shadowEnabled: false,
    shadowMapSize: 512,
    shadowType: THREE.BasicShadowMap,
    particleScale: 0.2,
    enableAmbientDust: false,
    anisotropy: 1,
  },
};

const TIER_ORDER: QualityTier[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

export class QualityManager {
  public mode: QualityMode = 'AUTO';
  public activeTier: QualityTier;
  public currentFps = 60;

  private shadowLights: THREE.DirectionalLight[] = [];
  private activeShadowLight: THREE.DirectionalLight | null = null;
  private scene: THREE.Scene | null = null;

  // Moving average over a 2.0-second window with hysteresis
  private readonly samples: Array<{ dt: number }> = [];
  private sampleSum = 0;
  private lowFpsStreak = 0;
  private highFpsStreak = 0;
  private autoUpgradeCount = 0;
  private readonly maxAutoUpgradesPerSession = 2;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly textures: ProceduralTextures,
    private readonly vfx: VFXManager,
    private readonly onToast: (msg: string) => void
  ) {
    const saved = this.loadMode();
    this.mode = saved;
    const detected = this.detectInitialTier();
    this.activeTier = saved === 'AUTO' ? detected : saved;
    this.applyPreset(this.activeTier);
  }

  public registerShadowLights(lights: THREE.DirectionalLight[], scene?: THREE.Scene): void {
    this.shadowLights = lights;
    if (scene) this.scene = scene;
    if (!this.activeShadowLight && lights.length > 0) {
      this.activeShadowLight = lights[0];
    }
    this.syncShadowLights();
  }

  public setActiveShadowLight(light: THREE.DirectionalLight): void {
    this.activeShadowLight = light;
    this.syncShadowLights();
  }

  public setMode(mode: QualityMode): void {
    this.mode = mode;
    this.saveMode(mode);
    this.lowFpsStreak = 0;
    this.highFpsStreak = 0;
    const nextTier = mode === 'AUTO' ? this.detectInitialTier() : mode;
    this.applyPreset(nextTier);
  }

  public getPreset(): QualityPreset {
    return QUALITY_PRESETS[this.activeTier];
  }

  public getStatusSummary(): string {
    const preset = this.getPreset();
    const fpsStr = `${Math.round(this.currentFps)} FPS`;
    return this.mode === 'AUTO'
      ? `Mode: AUTO (${preset.labelId} · ${fpsStr})`
      : `Mode: MANUAL (${preset.labelId} · ${fpsStr})`;
  }

  public recordFrame(dt: number, isActiveGameplay: boolean): void {
    if (document.hidden || !isActiveGameplay || dt <= 0 || dt > 0.25) return;

    this.samples.push({ dt });
    this.sampleSum += dt;
    while (this.sampleSum > 2.0 && this.samples.length > 1) {
      const removed = this.samples.shift()!;
      this.sampleSum -= removed.dt;
    }

    if (this.samples.length < 15 || this.sampleSum <= 0.4) return;
    this.currentFps = this.samples.length / this.sampleSum;

    if (this.mode !== 'AUTO') return;

    const tierIdx = TIER_ORDER.indexOf(this.activeTier);
    if (this.currentFps < 32 && tierIdx > 0) {
      this.lowFpsStreak += dt;
      this.highFpsStreak = 0;
      if (this.lowFpsStreak >= 2.5) {
        this.lowFpsStreak = 0;
        const lowerTier = TIER_ORDER[tierIdx - 1];
        this.applyPreset(lowerTier);
        this.samples.length = 0;
        this.sampleSum = 0;
        const label = QUALITY_PRESETS[lowerTier].labelId;
        this.onToast(`⚙ Grafis disesuaikan ke Mode ${label} agar lancar`);
      }
    } else if (
      this.currentFps > 55 &&
      tierIdx < TIER_ORDER.length - 1 &&
      this.autoUpgradeCount < this.maxAutoUpgradesPerSession
    ) {
      this.highFpsStreak += dt;
      this.lowFpsStreak = 0;
      if (this.highFpsStreak >= 8.0) {
        this.highFpsStreak = 0;
        this.autoUpgradeCount++;
        const higherTier = TIER_ORDER[tierIdx + 1];
        this.applyPreset(higherTier);
        this.samples.length = 0;
        this.sampleSum = 0;
        const label = QUALITY_PRESETS[higherTier].labelId;
        this.onToast(`✨ Performa stabil! Grafis dinaikkan ke Mode ${label}`);
      }
    } else {
      this.lowFpsStreak = Math.max(0, this.lowFpsStreak - dt * 0.5);
      this.highFpsStreak = Math.max(0, this.highFpsStreak - dt * 0.5);
    }
  }

  public applyPreset(tier: QualityTier): void {
    this.activeTier = tier;
    const p = QUALITY_PRESETS[tier];
    const shadowModeChanged =
      this.renderer.shadowMap.enabled !== p.shadowEnabled ||
      this.renderer.shadowMap.type !== p.shadowType;

    this.renderer.setPixelRatio(p.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = p.shadowEnabled;
    this.renderer.shadowMap.type = p.shadowType;

    if (shadowModeChanged && this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        if (Array.isArray(mesh.material)) {
          for (const m of mesh.material) m.needsUpdate = true;
        } else {
          mesh.material.needsUpdate = true;
        }
      });
    }

    this.syncShadowLights();
    this.textures.setAnisotropy(p.anisotropy);
    this.vfx.setQualityConfig(p.particleScale, p.enableAmbientDust);
  }

  private syncShadowLights(): void {
    const p = QUALITY_PRESETS[this.activeTier];
    let shadowChanged = false;

    for (const light of this.shadowLights) {
      const shouldCast = p.shadowEnabled && light === this.activeShadowLight;
      if (light.castShadow !== shouldCast) {
        light.castShadow = shouldCast;
        shadowChanged = true;
      }

      if (light.shadow.mapSize.x !== p.shadowMapSize || light.shadow.mapSize.y !== p.shadowMapSize) {
        if (light.shadow.map) {
          light.shadow.map.dispose();
          light.shadow.map = null;
        }
        light.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
        shadowChanged = true;
      }
    }

    if (shadowChanged) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  public detectInitialTier(): QualityTier {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const mem = nav.deviceMemory ?? 4;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const isMobile = coarse || (nav.maxTouchPoints > 0 && window.innerWidth <= 1024);

    let gpuName = '';
    try {
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        gpuName = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      }
    } catch {
      gpuName = '';
    }

    let score = 0;
    if (!isMobile) score += 2;
    if (cores >= 8) score += 2;
    else if (cores >= 4) score += 1;
    else score -= 1;

    if (mem >= 8) score += 2;
    else if (mem >= 4) score += 1;
    else if (mem <= 2) score -= 2;

    if (/swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) 4|adreno \(tm\) 5/.test(gpuName)) {
      score -= 3;
    } else if (/rtx|gtx|radeon rx|apple m|apple gpu/.test(gpuName)) {
      score += 2;
    }

    if (score >= 5 && !isMobile) return 'ULTRA';
    if (score >= 2) return 'HIGH';
    if (score >= 0) return 'MEDIUM';
    return 'LOW';
  }

  private loadMode(): QualityMode {
    try {
      const raw = localStorage.getItem(QUALITY_STORAGE_KEY);
      if (raw === 'AUTO' || raw === 'ULTRA' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'LOW') {
        return raw;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'AUTO';
  }

  private saveMode(mode: QualityMode): void {
    try {
      localStorage.setItem(QUALITY_STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors
    }
  }
}
