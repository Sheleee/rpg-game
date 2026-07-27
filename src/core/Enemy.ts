export interface Enemy {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attackDamage: number;
  defense: number;
  expReward: number;
}

export function createEnemy(name: string, level: number): Enemy {
  const baseStats: Record<string, { hp: number; attack: number; defense: number; exp: number }> = {
    '哥布林': { hp: 30, attack: 5, defense: 2, exp: 10 },
    '史莱姆': { hp: 20, attack: 3, defense: 1, exp: 5 },
    '骷髅': { hp: 50, attack: 8, defense: 5, exp: 20 },
    '蝙蝠': { hp: 15, attack: 6, defense: 1, exp: 8 },
  };

  const base = baseStats[name] || { hp: 30, attack: 5, defense: 2, exp: 10 };
  const levelMultiplier = 1 + (level - 1) * 0.2;

  return {
    name,
    level,
    currentHp: Math.floor(base.hp * levelMultiplier),
    maxHp: Math.floor(base.hp * levelMultiplier),
    attackDamage: Math.floor(base.attack * levelMultiplier),
    defense: Math.floor(base.defense * levelMultiplier),
    expReward: Math.floor(base.exp * levelMultiplier),
  };
}
