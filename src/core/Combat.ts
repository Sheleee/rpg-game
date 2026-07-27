import { Stats } from './Stats';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isDead: boolean;
}

export function calculateDamage(attacker: Stats, defender: Stats): CombatResult {
  const baseDamage = Math.max(1, attacker.attack - defender.defense);

  const isCrit = Math.random() < attacker.critRate;
  const critMultiplier = isCrit ? attacker.critDamage : 1;

  const damage = Math.floor(baseDamage * critMultiplier);

  return {
    damage,
    isCrit,
    isDead: false,
  };
}

export function applyDamage(currentHp: number, damage: number): { hp: number; isDead: boolean } {
  const hp = Math.max(0, currentHp - damage);
  return { hp, isDead: hp <= 0 };
}

// 统一伤害计算：攻击方属性 → 目标当前HP → 新HP + 结果
export function dealDamage(attackerStats: Stats, targetCurrentHp: number, targetDefense: number): {
  damage: number;
  isCrit: boolean;
  newHp: number;
  isDead: boolean;
} {
  const fakeDefender: Stats = { hp: targetCurrentHp, mp: 0, attack: 0, defense: targetDefense, speed: 0, critRate: 0, critDamage: 1 };
  const result = calculateDamage(attackerStats, fakeDefender);
  const { hp: newHp, isDead } = applyDamage(targetCurrentHp, result.damage);
  return { damage: result.damage, isCrit: result.isCrit, newHp, isDead };
}
