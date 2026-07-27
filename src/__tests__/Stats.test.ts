import { describe, it, expect } from 'vitest';
import { createStats, addStats, BASE_STATS } from '../core/Stats';

describe('Stats', () => {
  describe('createStats', () => {
    it('should create stats with default values', () => {
      const stats = createStats();
      expect(stats).toEqual(BASE_STATS);
    });

    it('should override specific stats', () => {
      const stats = createStats({ hp: 200, attack: 50 });
      expect(stats.hp).toBe(200);
      expect(stats.attack).toBe(50);
      expect(stats.defense).toBe(BASE_STATS.defense);
    });
  });

  describe('addStats', () => {
    it('should add bonus stats to base stats', () => {
      const base = createStats({ hp: 100, attack: 10 });
      const bonus = { hp: 50, attack: 5 };
      const result = addStats(base, bonus);
      expect(result.hp).toBe(150);
      expect(result.attack).toBe(15);
    });

    it('should handle missing bonus stats', () => {
      const base = createStats({ hp: 100 });
      const result = addStats(base, {});
      expect(result.hp).toBe(100);
      expect(result.attack).toBe(BASE_STATS.attack);
    });
  });
});
