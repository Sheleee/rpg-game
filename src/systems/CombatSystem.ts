import { Character, getCharacterStats, characterAttack, gainExp } from '../core/Character';
import { Enemy, getEnemyStats } from '../core/Enemy';

export interface AttackResult {
  damage: number;
  isCrit: boolean;
  isDead: boolean;
  expGain: number;
  leveledUp: boolean;
  updatedCharacter: Character;
  updatedEnemy: Enemy;
}

export class CombatSystem {
  private lastAttackTime = 0;
  private readonly ATTACK_COOLDOWN = 500;
  private readonly ATTACK_RANGE = 50;

  canAttack(): boolean {
    const now = Date.now();
    return now - this.lastAttackTime >= this.ATTACK_COOLDOWN;
  }

  tryAttack(
    attacker: Character,
    enemy: Enemy,
    attackerX: number,
    attackerY: number,
    enemyX: number,
    enemyY: number
  ): AttackResult | null {
    if (!this.canAttack()) return null;

    const distance = Math.hypot(enemyX - attackerX, enemyY - attackerY);
    if (distance >= this.ATTACK_RANGE) return null;

    this.lastAttackTime = Date.now();

    const { result, newHp } = characterAttack(attacker, enemy.currentHp, enemy.defense);
    const updatedEnemy: Enemy = { ...enemy, currentHp: newHp };

    let updatedCharacter = attacker;
    let leveledUp = false;

    if (result.isDead) {
      const { character: newChar, leveledUp: didLevel } = gainExp(attacker, enemy.expReward);
      updatedCharacter = newChar;
      leveledUp = didLevel;
    }

    return {
      damage: result.damage,
      isCrit: result.isCrit,
      isDead: result.isDead,
      expGain: result.isDead ? enemy.expReward : 0,
      leveledUp,
      updatedCharacter,
      updatedEnemy,
    };
  }

  tryTakeDamage(
    character: Character,
    enemy: Enemy,
    lastHitTime: number,
    cooldown: number = 1000
  ): Character | null {
    const now = Date.now();
    if (now - lastHitTime < cooldown) return null;

    return {
      ...character,
      currentHp: Math.max(0, character.currentHp - enemy.attackDamage),
    };
  }

  getEnemyStats(enemy: Enemy) {
    return getEnemyStats(enemy);
  }
}
