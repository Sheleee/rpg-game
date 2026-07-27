import { describe, it, expect } from 'vitest';
import {
  Equipment,
  getEquipmentStats,
  calculateTotalStats,
  RARITY_MULTIPLIER,
} from '../core/Equipment';

describe('Equipment', () => {
  describe('getEquipmentStats', () => {
    it('should calculate stats with rarity multiplier', () => {
      const weapon: Equipment = {
        id: 'sword-1',
        name: '铁剑',
        slot: 'weapon',
        rarity: 'common',
        baseStats: { attack: 10 },
        affixes: [],
        level: 1,
      };

      const stats = getEquipmentStats(weapon);
      expect(stats.attack).toBe(10 * RARITY_MULTIPLIER.common);
    });

    it('should apply epic rarity multiplier', () => {
      const weapon: Equipment = {
        id: 'sword-2',
        name: '魔剑',
        slot: 'weapon',
        rarity: 'epic',
        baseStats: { attack: 10 },
        affixes: [],
        level: 1,
      };

      const stats = getEquipmentStats(weapon);
      expect(stats.attack).toBe(10 * RARITY_MULTIPLIER.epic);
    });

    it('should add affix bonuses', () => {
      const weapon: Equipment = {
        id: 'sword-3',
        name: '精灵剑',
        slot: 'weapon',
        rarity: 'rare',
        baseStats: { attack: 8 },
        affixes: [
          { stat: 'attack', value: 5 },
          { stat: 'critRate', value: 0.1 },
        ],
        level: 1,
      };

      const stats = getEquipmentStats(weapon);
      expect(stats.attack).toBe(8 * RARITY_MULTIPLIER.rare + 5);
      expect(stats.critRate).toBeCloseTo(0.1);
    });
  });

  describe('calculateTotalStats', () => {
    it('should sum stats from multiple equipments', () => {
      const equipments: Equipment[] = [
        {
          id: 'sword',
          name: '铁剑',
          slot: 'weapon',
          rarity: 'common',
          baseStats: { attack: 10 },
          affixes: [],
          level: 1,
        },
        {
          id: 'armor',
          name: '铁甲',
          slot: 'armor',
          rarity: 'common',
          baseStats: { defense: 8 },
          affixes: [],
          level: 1,
        },
      ];

      const stats = calculateTotalStats(equipments);
      expect(stats.attack).toBe(10);
      expect(stats.defense).toBe(8);
    });
  });
});
