export type StatType = keyof Stats;

export const STAT_KEYS: StatType[] = ['hp', 'mp', 'attack', 'defense', 'speed', 'critRate', 'critDamage'];

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
  hp: 100, mp: 50, attack: 10, defense: 5, speed: 100, critRate: 0.05, critDamage: 1.5,
};

export function createStats(overrides: Partial<Stats> = {}): Stats {
  return { ...BASE_STATS, ...overrides };
}

export function addStats(base: Stats, bonus: Partial<Stats>): Stats {
  const result = { ...base };
  for (const key of STAT_KEYS) {
    result[key] = base[key] + (bonus[key] ?? 0);
  }
  return result;
}
