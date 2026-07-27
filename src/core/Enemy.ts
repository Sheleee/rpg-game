import { Stats } from './Stats';

export interface EnemyTemplate {
  hp: number;
  attack: number;
  defense: number;
  exp: number;
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

// 敌人模板数据库
const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  '哥布林': { hp: 30, attack: 5, defense: 2, exp: 10 },
  '史莱姆': { hp: 20, attack: 3, defense: 1, exp: 5 },
  '骷髅': { hp: 50, attack: 8, defense: 5, exp: 20 },
  '蝙蝠': { hp: 15, attack: 6, defense: 1, exp: 8 },
};

const DEFAULT_TEMPLATE: EnemyTemplate = { hp: 30, attack: 5, defense: 2, exp: 10 };

export function createEnemy(name: string, level: number): Enemy {
  const template = ENEMY_TEMPLATES[name] ?? DEFAULT_TEMPLATE;
  const levelMultiplier = 1 + (level - 1) * 0.2;

  return {
    name,
    level,
    currentHp: Math.floor(template.hp * levelMultiplier),
    maxHp: Math.floor(template.hp * levelMultiplier),
    attackDamage: Math.floor(template.attack * levelMultiplier),
    defense: Math.floor(template.defense * levelMultiplier),
    expReward: Math.floor(template.exp * levelMultiplier),
  };
}

export function getEnemyStats(enemy: Enemy): Stats {
  return {
    hp: enemy.maxHp,
    mp: 0,
    attack: enemy.attackDamage,
    defense: enemy.defense,
    speed: 80,
    critRate: 0.05,
    critDamage: 1.5,
  };
}
