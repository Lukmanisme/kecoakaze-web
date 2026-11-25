import * as THREE from 'three';
import { RgbMood } from '../types';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { VFXManager } from '../vfx/VFXManager';

export class RgbLightingSystem {
  public mood: RgbMood = 'chill';
  public flashbangWarningActive = false;
  public flashbangActive = false;
  public currentPrimaryHex = 0x5b6cff;
  public currentSecondaryHex = 0x9b59ff;

  private cycleTimer = 0;
  private flashTimer = 0;
  private nextFlashAt = 26; // every 25-30 seconds

  private readonly ambientLight: THREE.HemisphereLight;
  private readonly rgbDeskLight: THREE.PointLight;
  private readonly pcLight: THREE.PointLight;
  private readonly monitorLight: THREE.PointLight;

  constructor(
    scene: THREE.Scene,
    private readonly ledMeshes: THREE.Mesh[],
    deskPos: THREE.Vector3,
    pcPos: THREE.Vector3,
    monitorPos: THREE.Vector3,
    private readonly sound: ProceduralAudioEngine,
    private readonly vfx: VFXManager
  ) {
    this.ambientLight = new THREE.HemisphereLight(0x6e78c8, 0x1c1c2a, 0.85);
    scene.add(this.ambientLight);

    this.rgbDeskLight = new THREE.PointLight(0x7c4dff, 2.0, 26, 1.3);
    this.rgbDeskLight.position.copy(deskPos).add(new THREE.Vector3(0, 1.5, 0));
    this.rgbDeskLight.castShadow = false;
    scene.add(this.rgbDeskLight);

    this.pcLight = new THREE.PointLight(0x00e5ff, 1.4, 16, 1.4);
    this.pcLight.position.copy(pcPos).add(new THREE.Vector3(0, 1.2, 0));
    this.pcLight.castShadow = false;
    scene.add(this.pcLight);

    this.monitorLight = new THREE.PointLight(0x88ccff, 1.8, 22, 1.2);
    this.monitorLight.position.copy(monitorPos).add(new THREE.Vector3(0, 0.5, -1.5));
    this.monitorLight.castShadow = false;
    scene.add(this.monitorLight);
  }

  public reset(): void {
    this.mood = 'chill';
    this.cycleTimer = 0;
    this.flashTimer = 0;
    this.nextFlashAt = 25 + Math.random() * 5;
    this.flashbangWarningActive = false;
    this.flashbangActive = false;
    this.applyColors(0x5b6cff, 0x9b59ff, 1.6);
  }

  public getVisibilityMultiplier(isOnDesk: boolean): number {
    if (this.flashbangActive && isOnDesk) return 4.0;
    if (this.mood === 'chill') return isOnDesk ? 0.85 : 0.65;
    // reactive red/green
    return isOnDesk ? 1.15 : 0.9;
  }

  public update(dt: number, time: number, onToast: (msg: string) => void): void {
    this.flashTimer += dt;

    // 1.5s pre-warning before Monitor Flashbang Glare
    if (!this.flashbangActive && this.flashTimer >= this.nextFlashAt - 1.5) {
      if (!this.flashbangWarningActive) {
        this.flashbangWarningActive = true;
        onToast('⚡ MONITOR BERKEDIP! Berlindung dari meja!');
      }
    }

    if (!this.flashbangActive && this.flashTimer >= this.nextFlashAt) {
      this.flashbangActive = true;
      this.flashbangWarningActive = false;
      this.mood = 'flashbang';
      this.sound.playFlashbangGlare();
    }

    if (this.flashbangActive) {
      const elapsedFlash = this.flashTimer - this.nextFlashAt;
      if (elapsedFlash >= 2.0) {
        this.flashbangActive = false;
        this.flashTimer = 0;
        this.nextFlashAt = 25 + Math.random() * 5;
        this.mood = 'chill';
      } else {
        // Intense white glare
        this.currentPrimaryHex = 0xffffff;
        this.currentSecondaryHex = 0xffffff;
        this.ambientLight.intensity = 1.65;
        this.monitorLight.color.setHex(0xffffff);
        this.monitorLight.intensity = 7.5;
        this.rgbDeskLight.color.setHex(0xffffff);
        this.rgbDeskLight.intensity = 4.2;
        this.setLedColor(0xffffff);
        this.vfx.syncRgbGlow(0xffffff, 0xffffff, 'flashbang');
        return;
      }
    }

    // Cycle between Chill (Blue/Purple 12s) and Reactive (Red/Green 10s)
    this.cycleTimer = (this.cycleTimer + dt) % 22;
    if (this.cycleTimer < 12) {
      this.mood = 'chill';
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
      const c1 = new THREE.Color(0x3a6cff).lerp(new THREE.Color(0x9d4edd), pulse);
      const c2 = new THREE.Color(0x00d4ff).lerp(new THREE.Color(0x7b2cbf), pulse);
      this.applyColors(c1.getHex(), c2.getHex(), 1.6 + pulse * 0.4);
    } else {
      this.mood = 'reactive';
      const pulse = 0.5 + 0.5 * Math.sin(time * 4.2);
      const c1 = new THREE.Color(0xff3b4e).lerp(new THREE.Color(0x32e875), pulse);
      const c2 = new THREE.Color(0xff6b35).lerp(new THREE.Color(0x28df99), pulse);
      this.applyColors(c1.getHex(), c2.getHex(), 2.2 + pulse * 0.6);
    }
  }

  private applyColors(primary: number, secondary: number, deskIntensity: number): void {
    this.currentPrimaryHex = primary;
    this.currentSecondaryHex = secondary;
    this.ambientLight.intensity = 0.92;
    this.rgbDeskLight.color.setHex(primary);
    this.rgbDeskLight.intensity = deskIntensity;
    this.pcLight.color.setHex(secondary);
    this.pcLight.intensity = 1.6;
    this.monitorLight.color.setHex(primary);
    this.monitorLight.intensity = 1.85;
    this.setLedColor(primary);
    this.vfx.syncRgbGlow(primary, secondary, this.mood);
  }

  private setLedColor(hex: number): void {
    for (const m of this.ledMeshes) {
      const mat = m.material as THREE.MeshBasicMaterial | THREE.MeshToonMaterial;
      if ('emissive' in mat) {
        mat.emissive.setHex(hex);
      }
      mat.color.setHex(hex);
    }
  }
}
