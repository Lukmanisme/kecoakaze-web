import * as THREE from 'three';

export const WORLD_SCALE = 6.5; // 1 meter nyata = 6.5 unit game (sama dengan KitchenPropFactory.S)
export const ROOM_W = 8.0;
export const ROOM_D = 6.5;
export const ROOM_H = 2.7;
export const WALL_T = 0.15;

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
  | 'AngerCombat'
  | 'PanicDefeated';

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

export type KeisenganType = 0 | 1 | 2; // 0: BahanMejaDapur, 1: PanciSup, 2: MejaMakan

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
