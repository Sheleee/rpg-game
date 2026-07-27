export type StatType = 'hp' | 'mp' | 'attack' | 'defense' | 'speed' | 'critRate' | 'critDamage';

export interface Stats {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
}

export const BASE_STATS: Stats = {
  hp: 100,
  mp: 50,
  attack: 10,
  defense: 5,
  speed: 100,
  critRate: 0.05,
  critDamage: 1.5,
};

export function createStats(overrides: Partial<Stats> = {}): Stats {
  return { ...BASE_STATS, ...overrides };
}

export function addStats(base: Stats, bonus: Partial<Stats>): Stats {
  return {
    hp: base.hp + (bonus.hp ?? 0),
    mp: base.mp + (bonus.mp ?? 0),
    attack: base.attack + (bonus.attack ?? 0),
    defense: base.defense + (bonus.defense ?? 0),
    speed: base.speed + (bonus.speed ?? 0),
    critRate: base.critRate + (bonus.critRate ?? 0),
    critDamage: base.critDamage + (bonus.critDamage ?? 0),
  };
}

export function multiplyStats(base: Stats, multiplier: Partial<Stats>): Stats {
  return {
    hp: base.hp * (multiplier.hp ?? 1),
    mp: base.mp * (multiplier.mp ?? 1),
    attack: base.attack * (multiplier.attack ?? 1),
    defense: base.defense * (multiplier.defense ?? 1),
    speed: base.speed * (multiplier.speed ?? 1),
    critRate: base.critRate * (multiplier.critRate ?? 1),
    critDamage: base.critDamage * (multiplier.critDamage ?? 1),
  };
}
