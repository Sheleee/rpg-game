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
  common: 1.0, uncommon: 1.2, rare: 1.5, epic: 2.0, legendary: 3.0,
};

const ZERO_STATS: Stats = {
  hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0,
};

const EQUIPMENT_NAMES: Record<EquipmentSlot, string[]> = {
  weapon: ['铁剑', '钢刀', '法杖', '匕首', '战斧', '长弓'],
  helmet: ['铁盔', '皮帽', '法冠', '头巾', '战盔', '兜帽'],
  armor: ['铁甲', '皮甲', '法袍', '锁甲', '板甲', '布衣'],
  accessory1: ['戒指', '项链', '护符', '手镯', '耳环', '徽章'],
  accessory2: ['戒指', '项链', '护符', '手镯', '耳环', '徽章'],
};

const RARITY_PREFIX: Record<ItemRarity, string> = {
  common: '', uncommon: '精良', rare: '稀有', epic: '史诗', legendary: '传说',
};

const AFFIX_POOLS: { stat: keyof Stats; min: number; max: number }[] = [
  { stat: 'attack', min: 1, max: 8 },
  { stat: 'defense', min: 1, max: 6 },
  { stat: 'hp', min: 5, max: 30 },
  { stat: 'mp', min: 3, max: 20 },
  { stat: 'speed', min: 2, max: 12 },
  { stat: 'critRate', min: 0.01, max: 0.08 },
  { stat: 'critDamage', min: 0.05, max: 0.3 },
];

const SLOT_BASE_STATS: Record<EquipmentSlot, Partial<Stats>> = {
  weapon: { attack: 5 },
  helmet: { defense: 3, mp: 5 },
  armor: { defense: 5, hp: 10 },
  accessory1: {},
  accessory2: {},
};

let _nextId = 1;
function nextId(): string { return `eq_${_nextId++}_${Date.now()}`; }

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(): ItemRarity {
  const r = Math.random();
  if (r < 0.5) return 'common';
  if (r < 0.8) return 'uncommon';
  if (r < 0.94) return 'rare';
  if (r < 0.99) return 'epic';
  return 'legendary';
}

export function generateRandomEquipment(enemyLevel: number, forcedSlot?: EquipmentSlot): Equipment {
  const slot = forcedSlot ?? pick(['weapon', 'helmet', 'armor', 'accessory1']);
  const rarity = rollRarity();
  const name = `${RARITY_PREFIX[rarity]}${pick(EQUIPMENT_NAMES[slot])}`;
  const level = Math.max(1, enemyLevel + Math.floor(Math.random() * 3) - 1);

  const baseStats: Partial<Stats> = { ...SLOT_BASE_STATS[slot] };
  for (const key of STAT_KEYS) {
    const v = baseStats[key];
    if (v !== undefined) baseStats[key] = Math.round(v * (1 + (level - 1) * 0.1));
  }

  const affixCount = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }[rarity];
  const usedStats = new Set<keyof Stats>();
  const affixes: Affix[] = [];
  for (let i = 0; i < affixCount; i++) {
    const pool = AFFIX_POOLS.filter(a => !usedStats.has(a.stat));
    if (pool.length === 0) break;
    const choice = pick(pool);
    usedStats.add(choice.stat);
    const value = Math.round((choice.min + Math.random() * (choice.max - choice.min)) * (1 + (level - 1) * 0.05));
    affixes.push({ stat: choice.stat, value });
  }

  return { id: nextId(), name, slot, rarity, baseStats, affixes, level };
}

export function getEquipmentStats(equipment: Equipment): Stats {
  const multiplier = RARITY_MULTIPLIER[equipment.rarity];
  const baseWithMultiplier: Partial<Stats> = {};
  for (const key of STAT_KEYS) {
    const value = equipment.baseStats[key];
    if (value !== undefined) baseWithMultiplier[key] = value * multiplier;
  }
  const withBase = addStats(ZERO_STATS, baseWithMultiplier);
  const affixBonus: Partial<Stats> = {};
  for (const affix of equipment.affixes) {
    affixBonus[affix.stat] = (affixBonus[affix.stat] ?? 0) + affix.value;
  }
  return addStats(withBase, affixBonus);
}

export function calculateTotalStats(equipments: Equipment[]): Stats {
  let current = ZERO_STATS;
  for (const equip of equipments) current = addStats(current, getEquipmentStats(equip));
  return current;
}
