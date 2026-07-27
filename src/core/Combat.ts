import { Stats } from './Stats';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isDead: boolean;
}

export function calculateDamage(attacker: Stats, defender: Stats): CombatResult {
  // Base damage = attack - defense (minimum 1)
  const baseDamage = Math.max(1, attacker.attack - defender.defense);

  // Critical hit check
  const isCrit = Math.random() < attacker.critRate;
  const critMultiplier = isCrit ? attacker.critDamage : 1;

  // Final damage
  const damage = Math.floor(baseDamage * critMultiplier);

  return {
    damage,
    isCrit,
    isDead: false, // Will be determined by the caller
  };
}

export function applyDamage(currentHp: number, damage: number): { hp: number; isDead: boolean } {
  const hp = Math.max(0, currentHp - damage);
  return {
    hp,
    isDead: hp <= 0,
  };
}
