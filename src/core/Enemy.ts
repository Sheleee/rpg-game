import { Stats } from './Stats';
import { Equipment, EquipmentSlot, generateRandomEquipment } from './Equipment';

export interface EnemyTemplate {
  hp: number;
  attack: number;
  defense: number;
  exp: number;
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
}

const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  '哥布林': { hp: 30, attack: 5, defense: 2, exp: 10, dropRate: 0.4, dropSlots: ['weapon', 'armor'] },
  '史莱姆': { hp: 20, attack: 3, defense: 1, exp: 5, dropRate: 0.3, dropSlots: ['accessory1', 'accessory2'] },
  '骷髅': { hp: 50, attack: 8, defense: 5, exp: 20, dropRate: 0.5, dropSlots: ['weapon', 'helmet', 'armor'] },
  '蝙蝠': { hp: 15, attack: 6, defense: 1, exp: 8, dropRate: 0.25, dropSlots: ['accessory1'] },
};

const DEFAULT_TEMPLATE: EnemyTemplate = { hp: 30, attack: 5, defense: 2, exp: 10, dropRate: 0.3, dropSlots: ['weapon'] };

export function createEnemy(name: string, level: number): Enemy {
  const template = ENEMY_TEMPLATES[name] ?? DEFAULT_TEMPLATE;
  const m = 1 + (level - 1) * 0.2;
  return {
    name, level,
    currentHp: Math.floor(template.hp * m),
    maxHp: Math.floor(template.hp * m),
    attackDamage: Math.floor(template.attack * m),
    defense: Math.floor(template.defense * m),
    expReward: Math.floor(template.exp * m),
  };
}

export function getEnemyStats(enemy: Enemy): Stats {
  return {
    hp: enemy.maxHp, mp: 0, attack: enemy.attackDamage, defense: enemy.defense,
    speed: 80, critRate: 0.05, critDamage: 1.5,
  };
}

export function rollDrop(enemyName: string, enemyLevel: number): Equipment | null {
  const template = ENEMY_TEMPLATES[enemyName] ?? DEFAULT_TEMPLATE;
  if (Math.random() >= template.dropRate) return null;
  const slot = template.dropSlots[Math.floor(Math.random() * template.dropSlots.length)];
  return generateRandomEquipment(enemyLevel, slot);
}
