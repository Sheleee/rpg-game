import { Stats } from './Stats';
import { Equipment, EquipmentSlot, generateRandomEquipment } from './Equipment';

export interface EnemyTemplate {
  hp: number;
  attack: number;
  defense: number;
  exp: number;
  gold: number;
  dropRate: number;
  dropSlots: EquipmentSlot[];
}

export interface Enemy {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attackDamage: number;
  defense: number;
  expReward: number;
  /** 击杀掉落金币 */
  goldReward: number;
  /** 是否为 BOSS */
  isBoss: boolean;
}

const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // 新手村 / Village
  '史莱姆': { hp: 20, attack: 3, defense: 1, exp: 5, gold: 3, dropRate: 0.3, dropSlots: ['accessory1', 'accessory2'] },
  '蝙蝠': { hp: 15, attack: 6, defense: 1, exp: 8, gold: 4, dropRate: 0.25, dropSlots: ['accessory1'] },
  '哥布林': { hp: 30, attack: 5, defense: 2, exp: 10, gold: 6, dropRate: 0.4, dropSlots: ['weapon', 'armor'] },
  // 草原 / Grassland
  '野狼': { hp: 45, attack: 9, defense: 3, exp: 18, gold: 10, dropRate: 0.45, dropSlots: ['weapon', 'helmet'] },
  // 沙漠 / Desert
  '木乃伊': { hp: 70, attack: 12, defense: 6, exp: 30, gold: 16, dropRate: 0.5, dropSlots: ['armor', 'helmet'] },
  '沙漠蝎': { hp: 60, attack: 14, defense: 4, exp: 26, gold: 14, dropRate: 0.4, dropSlots: ['accessory1', 'accessory2'] },
  // 雪山 / Snow Mountain
  '雪怪': { hp: 100, attack: 18, defense: 8, exp: 45, gold: 24, dropRate: 0.5, dropSlots: ['armor', 'weapon'] },
  '冰骷髅': { hp: 85, attack: 16, defense: 7, exp: 38, gold: 20, dropRate: 0.45, dropSlots: ['weapon', 'helmet'] },
  '冰蝠': { hp: 55, attack: 20, defense: 3, exp: 30, gold: 18, dropRate: 0.35, dropSlots: ['accessory1'] },
  // BOSS
  '哥布林王': { hp: 260, attack: 14, defense: 6, exp: 120, gold: 80, dropRate: 1, dropSlots: ['weapon', 'armor'] },
  '狼王': { hp: 380, attack: 20, defense: 10, exp: 200, gold: 140, dropRate: 1, dropSlots: ['weapon', 'helmet', 'armor'] },
  '沙漠巨蝎': { hp: 520, attack: 28, defense: 14, exp: 320, gold: 220, dropRate: 1, dropSlots: ['weapon', 'armor', 'accessory1'] },
  '冰霜巨龙': { hp: 800, attack: 38, defense: 20, exp: 600, gold: 400, dropRate: 1, dropSlots: ['weapon', 'helmet', 'armor', 'accessory1', 'accessory2'] },
};

const DEFAULT_TEMPLATE: EnemyTemplate = { hp: 30, attack: 5, defense: 2, exp: 10, gold: 5, dropRate: 0.3, dropSlots: ['weapon'] };

export const BOSS_NAMES: string[] = ['哥布林王', '狼王', '沙漠巨蝎', '冰霜巨龙'];

export function isBossName(name: string): boolean {
  return BOSS_NAMES.includes(name);
}

export function createEnemy(name: string, level: number): Enemy {
  const template = ENEMY_TEMPLATES[name] ?? DEFAULT_TEMPLATE;
  const m = 1 + (level - 1) * 0.2;
  const boss = isBossName(name);
  // BOSS 额外放大
  const bossMul = boss ? 1.5 : 1;
  return {
    name, level,
    currentHp: Math.floor(template.hp * m * bossMul),
    maxHp: Math.floor(template.hp * m * bossMul),
    attackDamage: Math.floor(template.attack * m * bossMul),
    defense: Math.floor(template.defense * m),
    expReward: Math.floor(template.exp * m),
    goldReward: Math.floor(template.gold * m),
    isBoss: boss,
  };
}

export function getEnemyStats(enemy: Enemy): Stats {
  return {
    hp: enemy.maxHp, mp: 0, attack: enemy.attackDamage, defense: enemy.defense,
    speed: enemy.isBoss ? 60 : 80, critRate: enemy.isBoss ? 0.1 : 0.05, critDamage: 1.5,
  };
}

export function rollDrop(enemyName: string, enemyLevel: number): Equipment | null {
  const template = ENEMY_TEMPLATES[enemyName] ?? DEFAULT_TEMPLATE;
  if (Math.random() >= template.dropRate) return null;
  const slot = template.dropSlots[Math.floor(Math.random() * template.dropSlots.length)];
  return generateRandomEquipment(enemyLevel, slot);
}
