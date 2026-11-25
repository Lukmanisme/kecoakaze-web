import { ComputedStats, PlayerSaveData, StageId, UpgradeKey } from '../types';

const STORAGE_KEY = 'kecoakaze_web_save_v1';
export const MAX_UPGRADE_LEVEL = 3;

export interface UpgradeDefinition {
  key: UpgradeKey;
  title: string;
  desc: string;
  costs: [number, number, number];
  bonusText: (level: number) => string;
}

export const UPGRADE_DEFS: UpgradeDefinition[] = [
  {
    key: 'sayap',
    title: 'Sayap Aerodinamis',
    desc: 'Menambah kapasitas & regenerasi stamina SAYAP saat merayap atau melayang.',
    costs: [100, 220, 400],
    bonusText: (lvl) => `Stamina ${100 + lvl * 25} · Regen +${lvl * 20}%`,
  },
  {
    key: 'kaki',
    title: 'Kaki Senyap',
    desc: 'Mengurangi jarak & kecepatan deteksi penglihatan maupun pendengaran musuh.',
    costs: [120, 240, 420],
    bonusText: (lvl) => `Deteksi Musuh -${lvl * 12}%`,
  },
  {
    key: 'refleks',
    title: 'Refleks Kilat',
    desc: 'Mempercepat cooldown & menambah jarak dash tombol ELAK (Q).',
    costs: [100, 200, 380],
    bonusText: (lvl) => `Cooldown ${(0.85 - lvl * 0.15).toFixed(2)}s · Dash +${lvl * 22}%`,
  },
  {
    key: 'rahang',
    title: 'Rahang Rakus',
    desc: 'Mempercepat durasi tahan tombol AKSI (E/F) saat menyabotase target.',
    costs: [110, 230, 400],
    bonusText: (lvl) => `Kecepatan Sabotase +${lvl * 20}%`,
  },
];

function defaultSave(): PlayerSaveData {
  return {
    dna: 0,
    bestStars: 0,
    bestStarsByStage: { bab1: 0, bab2: 0 },
    bestMomentum: 0,
    clears: 0,
    upgrades: {
      sayap: 0,
      kaki: 0,
      refleks: 0,
      rahang: 0,
    },
  };
}

export class ProgressionManager {
  private data: PlayerSaveData;

  constructor() {
    this.data = this.load();
  }

  public get save(): PlayerSaveData {
    return this.data;
  }

  private load(): PlayerSaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
      const legacyBest = typeof parsed.bestStars === 'number' ? Math.min(3, Math.max(0, parsed.bestStars)) : 0;
      return {
        dna: typeof parsed.dna === 'number' && parsed.dna >= 0 ? Math.floor(parsed.dna) : 0,
        bestStars: legacyBest,
        bestStarsByStage: {
          bab1: typeof parsed.bestStarsByStage?.bab1 === 'number'
            ? Math.min(3, Math.max(0, parsed.bestStarsByStage.bab1))
            : legacyBest,
          bab2: typeof parsed.bestStarsByStage?.bab2 === 'number'
            ? Math.min(3, Math.max(0, parsed.bestStarsByStage.bab2))
            : 0,
        },
        bestMomentum: typeof parsed.bestMomentum === 'number' ? Math.min(100, Math.max(0, parsed.bestMomentum)) : 0,
        clears: typeof parsed.clears === 'number' ? Math.max(0, parsed.clears) : 0,
        upgrades: {
          sayap: clampLvl(parsed.upgrades?.sayap),
          kaki: clampLvl(parsed.upgrades?.kaki),
          refleks: clampLvl(parsed.upgrades?.refleks),
          rahang: clampLvl(parsed.upgrades?.rahang),
        },
      };
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  public addDna(amount: number): void {
    if (amount <= 0) return;
    this.data.dna += Math.round(amount);
    this.persist();
  }

  public recordStageClear(stageId: StageId, stars: number, finalMomentum: number, rewardDna: number): void {
    this.data.dna += Math.round(rewardDna);
    this.data.bestStarsByStage[stageId] = Math.max(this.data.bestStarsByStage[stageId], stars);
    this.data.bestStars = Math.max(
      this.data.bestStars,
      this.data.bestStarsByStage.bab1,
      this.data.bestStarsByStage.bab2
    );
    this.data.bestMomentum = Math.max(this.data.bestMomentum, Math.round(finalMomentum));
    this.data.clears += 1;
    this.persist();
  }

  public resetAllData(): void {
    this.data = defaultSave();
    this.persist();
  }

  public getNextCost(key: UpgradeKey): number | null {
    const lvl = this.data.upgrades[key];
    if (lvl >= MAX_UPGRADE_LEVEL) return null;
    const def = UPGRADE_DEFS.find((d) => d.key === key)!;
    return def.costs[lvl];
  }

  public buyUpgrade(key: UpgradeKey): boolean {
    const cost = this.getNextCost(key);
    if (cost === null || this.data.dna < cost) return false;
    this.data.dna -= cost;
    this.data.upgrades[key] += 1;
    this.persist();
    return true;
  }

  public getComputedStats(): ComputedStats {
    const u = this.data.upgrades;
    return {
      maxStamina: 100 + u.sayap * 25,
      staminaRegenMult: 1 + u.sayap * 0.2,
      stealthFactor: 1 - u.kaki * 0.12,
      dodgeCooldown: Math.max(0.35, 0.85 - u.refleks * 0.15),
      dodgeImpulse: 11 * (1 + u.refleks * 0.22),
      dodgeIframeDuration: 0.38 + u.refleks * 0.06,
      sabotageSpeedMult: 1 + u.rahang * 0.2,
    };
  }
}

function clampLvl(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(v)));
}
