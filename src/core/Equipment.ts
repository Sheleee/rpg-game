import { Stats, createStats, addStats } from './Stats';

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

const ZERO_STATS: Stats = {
  hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0,
};

export function getEquipmentStats(equipment: Equipment): Stats {
  const multiplier = RARITY_MULTIPLIER[equipment.rarity];

  // Apply base stats
  const baseWithMultiplier: Partial<Stats> = {};
  for (const [key, value] of Object.entries(equipment.baseStats)) {
    if (value !== undefined) {
      (baseWithMultiplier as Record<string, number>)[key] = value * multiplier;
    }
  }
  const withBase = addStats(ZERO_STATS, baseWithMultiplier);

  // Apply affixes
  const affixBonus: Partial<Stats> = {};
  for (const affix of equipment.affixes) {
    (affixBonus as Record<string, number>)[affix.stat] =
      ((affixBonus as Record<string, number>)[affix.stat] ?? 0) + affix.value;
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
