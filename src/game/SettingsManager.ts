import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { SurfaceAlignedCamera } from '../camera/surfaceCamera';
import { QualityManager, QualityMode } from '../graphics/QualityManager';

export interface GameSettings {
  cameraSensitivity: number;
  invertY: boolean;
  mobileAutoFollow: boolean;
  masterVolume: number;
  isMuted: boolean;
  graphicsQuality: QualityMode;
}

const SETTINGS_KEY = 'kecoakaze_settings';

function defaultSettings(): GameSettings {
  return {
    cameraSensitivity: 1.0,
    invertY: false,
    mobileAutoFollow: true,
    masterVolume: 0.8,
    isMuted: false,
    graphicsQuality: 'AUTO',
  };
}

export class SettingsManager {
  private data: GameSettings;
  private cam: SurfaceAlignedCamera | null = null;
  private audio: ProceduralAudioEngine | null = null;
  private quality: QualityManager | null = null;
  private onUiSync: (() => void) | null = null;

  constructor() {
    this.data = this.load();
  }

  public get settings(): GameSettings {
    return this.data;
  }

  public bindTargets(targets: {
    cam: SurfaceAlignedCamera;
    audio: ProceduralAudioEngine;
    quality: QualityManager;
    onUiSync?: () => void;
  }): void {
    this.cam = targets.cam;
    this.audio = targets.audio;
    this.quality = targets.quality;
    this.onUiSync = targets.onUiSync ?? null;
    this.applyAll();
  }

  public applyAll(): void {
    if (this.cam) {
      this.cam.setSensitivity(this.data.cameraSensitivity);
      this.cam.setInvertY(this.data.invertY);
      this.cam.setAutoFollow(this.data.mobileAutoFollow);
    }
    if (this.audio) {
      this.audio.setVolume(this.data.masterVolume);
      this.audio.setMuted(this.data.isMuted);
    }
    if (this.quality && this.quality.mode !== this.data.graphicsQuality) {
      this.quality.setMode(this.data.graphicsQuality);
    }
    this.onUiSync?.();
  }

  public setCameraSensitivity(val: number): void {
    this.data.cameraSensitivity = Math.max(0.2, Math.min(2.5, Math.round(val * 10) / 10));
    this.cam?.setSensitivity(this.data.cameraSensitivity);
    this.persist();
    this.onUiSync?.();
  }

  public setInvertY(invert: boolean): void {
    this.data.invertY = invert;
    this.cam?.setInvertY(invert);
    this.persist();
    this.onUiSync?.();
  }

  public setMobileAutoFollow(enabled: boolean): void {
    this.data.mobileAutoFollow = enabled;
    this.cam?.setAutoFollow(enabled);
    this.persist();
    this.onUiSync?.();
  }

  public setMasterVolume(vol: number): void {
    this.data.masterVolume = Math.max(0, Math.min(1, vol));
    this.audio?.setVolume(this.data.masterVolume);
    this.persist();
    this.onUiSync?.();
  }

  public setMuted(muted: boolean): void {
    this.data.isMuted = muted;
    this.audio?.setMuted(muted);
    this.persist();
    this.onUiSync?.();
  }

  public setGraphicsQuality(mode: QualityMode): void {
    this.data.graphicsQuality = mode;
    this.quality?.setMode(mode);
    this.persist();
    this.onUiSync?.();
  }

  public resetSettings(): void {
    this.data = defaultSettings();
    this.persist();
    this.applyAll();
  }

  private load(): GameSettings {
    const def = defaultSettings();
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return def;
      const p = JSON.parse(raw) as Partial<GameSettings>;
      const q = p.graphicsQuality;
      const validQ: QualityMode =
        q === 'AUTO' || q === 'ULTRA' || q === 'HIGH' || q === 'MEDIUM' || q === 'LOW'
          ? q
          : 'AUTO';
      return {
        cameraSensitivity:
          typeof p.cameraSensitivity === 'number' && !Number.isNaN(p.cameraSensitivity)
            ? Math.max(0.2, Math.min(2.5, p.cameraSensitivity))
            : def.cameraSensitivity,
        invertY: typeof p.invertY === 'boolean' ? p.invertY : def.invertY,
        mobileAutoFollow:
          typeof p.mobileAutoFollow === 'boolean' ? p.mobileAutoFollow : def.mobileAutoFollow,
        masterVolume:
          typeof p.masterVolume === 'number' && !Number.isNaN(p.masterVolume)
            ? Math.max(0, Math.min(1, p.masterVolume))
            : def.masterVolume,
        isMuted: typeof p.isMuted === 'boolean' ? p.isMuted : def.isMuted,
        graphicsQuality: validQ,
      };
    } catch {
      return def;
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors
    }
  }
}
