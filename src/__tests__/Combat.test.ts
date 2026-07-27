import { describe, it, expect, vi } from 'vitest';
import { calculateDamage, applyDamage } from '../core/Combat';
import { createStats } from '../core/Stats';

describe('Combat', () => {
  describe('calculateDamage', () => {
    it('should calculate damage as attack minus defense', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // No crit
      const attacker = createStats({ attack: 20 });
      const defender = createStats({ defense: 10 });

      const result = calculateDamage(attacker, defender);
      expect(result.damage).toBe(10); // 20 - 10
      expect(result.isCrit).toBe(false);
    });

    it('should apply critical damage multiplier', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0); // Always crit
      const attacker = createStats({ attack: 20, critRate: 1.0, critDamage: 2.0 });
      const defender = createStats({ defense: 10 });

      const result = calculateDamage(attacker, defender);
      expect(result.damage).toBe(20); // (20 - 10) * 2.0
      expect(result.isCrit).toBe(true);
    });

    it('should have minimum damage of 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1);
      const attacker = createStats({ attack: 5 });
      const defender = createStats({ defense: 100 });

      const result = calculateDamage(attacker, defender);
      expect(result.damage).toBe(1);
    });
  });

  describe('applyDamage', () => {
    it('should reduce HP by damage amount', () => {
      const { hp, isDead } = applyDamage(100, 30);
      expect(hp).toBe(70);
      expect(isDead).toBe(false);
    });

    it('should not go below 0 HP', () => {
      const { hp, isDead } = applyDamage(50, 100);
      expect(hp).toBe(0);
      expect(isDead).toBe(true);
    });

    it('should handle 0 damage', () => {
      const { hp, isDead } = applyDamage(100, 0);
      expect(hp).toBe(100);
      expect(isDead).toBe(false);
    });
  });
});
