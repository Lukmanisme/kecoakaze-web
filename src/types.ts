import * as THREE from 'three';

export const WORLD_SCALE = 6.5; // 1 meter nyata = 6.5 unit game
export const ROOM_W = 8.0;
export const ROOM_D = 6.5;
export const ROOM_H = 3.2;
export const WALL_T = 0.15;

export type StageId = 'bab1' | 'bab2';

export interface RoomBounds {
  halfW: number;
  halfD: number;
  height: number;
}

export type KokoState =
  | 'Crawling'
  | 'Flying'
  | 'Gliding'
  | 'Stunned'
  | 'Dead';

export type BossState =
  | 'RoutineIdle'
  | 'SuspiciousAlert'
  | 'ShockedFreeze'
  | 'CariSapu'
  | 'MencariKoko'
  | 'Marah'
  | 'CariTutup'
  | 'Mengamuk'
  | 'MemeriksaSembunyi'
  | 'WindupAttack'
  | 'AngerCombat'
  | 'PanicDefeated';

export type GamerState =
  | 'HEADSET_ON'
  | 'RELAXED'
  | 'HEADSET_OFF'
  | 'SWAT_ATTACK'
  | 'PANIC_DEFEATED';

export type RgbMood = 'chill' | 'reactive' | 'flashbang';

export type IbuHabit =
  | 'CookingTaste'
  | 'WipingCounter'
  | 'FanningHeat'
  | 'KosGrumbling';

export type IbuExpression =
  | 'NeutralJudes'
  | 'Tasting'
  | 'Suspicious'
  | 'Shocked'
  | 'AngryCombat'
  | 'DefeatedPanic';

export type KitchenStation =
  | 'Kulkas'
  | 'MejaDapur'
  | 'Kompor'
  | 'MejaMakan'
  | 'TempatSapu';

export type KeisenganType = 0 | 1 | 2;

export type HidingSafetyType = 'Safe' | 'Risky';

export interface HidingSpot {
  id: string;
  name: string;
  safety: HidingSafetyType;
  position: THREE.Vector3;
  halfExtents: THREE.Vector3;
  inspectStandOffset: THREE.Vector3;
  isKokoInside: boolean;
  indicatorMesh: THREE.Mesh;
}

export interface InteractiveProp {
  type: KeisenganType;
  targetName: string;
  actionVerb: string;
  requiredHoldDuration: number;
  interactionRadius: number;
  position: THREE.Vector3;
  currentProgress: number;
  isRuined: boolean;
  isDiscovered: boolean;
  pristineObjects: THREE.Object3D[];
  ruinedVisual: THREE.Object3D;
  beaconMesh: THREE.Mesh;
}

export interface AABBZone {
  name: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface InputState {
  moveX: number;
  moveY: number;
  flyHeld: boolean;
  flyJustPressed: boolean;
  glideHeld: boolean;
  dodgeJustPressed: boolean;
  actionHeld: boolean;
}

export type UpgradeKey = 'sayap' | 'kaki' | 'refleks' | 'rahang';

export interface UpgradeLevels {
  sayap: number;
  kaki: number;
  refleks: number;
  rahang: number;
}

export interface PlayerSaveData {
  dna: number;
  bestStars: number;
  bestStarsByStage: {
    bab1: number;
    bab2: number;
  };
  bestMomentum: number;
  clears: number;
  upgrades: UpgradeLevels;
}

export interface ComputedStats {
  maxStamina: number;
  staminaRegenMult: number;
  stealthFactor: number;
  dodgeCooldown: number;
  dodgeImpulse: number;
  dodgeIframeDuration: number;
  sabotageSpeedMult: number;
}

export interface HudSnapshot {
  stageId: StageId;
  chapterLabel: string;
  objectiveTitle: string;
  objectiveHint: string;
  targetPosition: THREE.Vector3 | null;
  targetMarkerText: string;
  activeHidingSpot: HidingSpot | null;
  gauge: number;
  stars: [boolean, boolean, boolean];
  threatStatus: string;
  threatColor: string;
  detection: number;
  isWindingUp: boolean;
  windupProgress: number;
  windupWarningText: string;
  bossWorldPos: THREE.Vector3;
  bossHeadHeight: number;
  bossDialogue: string;
  bossBadge: '!' | '?' | null;
  nearbyProp: InteractiveProp | null;
  extraStatusTag: string;
  isFinaleActive: boolean;
  isStageCleared: boolean;
}

export interface StageController {
  readonly stageId: StageId;
  isPaused: boolean;
  isStarted: boolean;
  isStageCleared: boolean;
  resetStage(): void;
  applyUpgrades(): void;
  update(dt: number, time: number, input: InputState, camFwd: THREE.Vector3, camUp: THREE.Vector3): void;
  getHudSnapshot(): HudSnapshot;
  setActive(active: boolean): void;
}
