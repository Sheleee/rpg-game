import { Stats, STAT_KEYS, addStats } from './Stats';

export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'accessory1' | 'accessory2';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Affix {
  stat: keyof Stats;
  value: number;
}

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  baseStats: Partial<Stats>;
  affixes: Affix[];
  level: number;
}

export const RARITY_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
};

// 零值种子，用于属性累加
const ZERO_STATS: Stats = {
  hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0,
};

export function getEquipmentStats(equipment: Equipment): Stats {
  const multiplier = RARITY_MULTIPLIER[equipment.rarity];

  // 应用基础属性（含品质倍率）
  const baseWithMultiplier: Partial<Stats> = {};
  for (const key of STAT_KEYS) {
    const value = equipment.baseStats[key];
    if (value !== undefined) {
      baseWithMultiplier[key] = value * multiplier;
    }
  }
  const withBase = addStats(ZERO_STATS, baseWithMultiplier);

  // 应用随机词条
  const affixBonus: Partial<Stats> = {};
  for (const affix of equipment.affixes) {
    affixBonus[affix.stat] = (affixBonus[affix.stat] ?? 0) + affix.value;
  }

  return addStats(withBase, affixBonus);
}

export function calculateTotalStats(equipments: Equipment[]): Stats {
  let current = ZERO_STATS;

  for (const equip of equipments) {
    const equipStats = getEquipmentStats(equip);
    current = addStats(current, equipStats);
  }

  return current;
}
