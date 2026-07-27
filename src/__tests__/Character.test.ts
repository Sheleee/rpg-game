import { describe, it, expect } from 'vitest';
import {
  createCharacter,
  getCharacterStats,
  equipItem,
  unequipItem,
  characterAttack,
  gainExp,
  CHARACTER_CLASSES,
} from '../core/Character';
import { Equipment } from '../core/Equipment';

describe('Character', () => {
  describe('createCharacter', () => {
    it('should create a warrior character with correct base stats', () => {
      const char = createCharacter('TestHero', 'warrior');
      expect(char.name).toBe('TestHero');
      expect(char.classType).toBe('warrior');
      expect(char.level).toBe(1);
      expect(char.currentHp).toBe(CHARACTER_CLASSES.warrior.baseStats.hp);
      expect(char.equipments).toEqual({});
    });

    it('should create a mage character', () => {
      const char = createCharacter('Mage', 'mage');
      expect(char.classType).toBe('mage');
      expect(char.currentHp).toBe(CHARACTER_CLASSES.mage.baseStats.hp);
    });
  });

  describe('getCharacterStats', () => {
    it('should return base stats without equipment', () => {
      const char = createCharacter('Hero', 'warrior');
      const stats = getCharacterStats(char);
      expect(stats.hp).toBe(CHARACTER_CLASSES.warrior.baseStats.hp);
      expect(stats.attack).toBe(CHARACTER_CLASSES.warrior.baseStats.attack);
    });

    it('should include equipment stats', () => {
      const char = createCharacter('Hero', 'warrior');
      const weapon: Equipment = {
        id: 'sword-1',
        name: '铁剑',
        slot: 'weapon',
        rarity: 'common',
        baseStats: { attack: 10 },
        affixes: [],
        level: 1,
      };

      const equipped = equipItem(char, weapon);
      const stats = getCharacterStats(equipped);
      expect(stats.attack).toBe((CHARACTER_CLASSES.warrior.baseStats.attack ?? 0) + 10);
    });
  });

  describe('equipItem / unequipItem', () => {
    it('should equip item to correct slot', () => {
      const char = createCharacter('Hero', 'warrior');
      const weapon: Equipment = {
        id: 'sword-1',
        name: '铁剑',
        slot: 'weapon',
        rarity: 'common',
        baseStats: { attack: 10 },
        affixes: [],
        level: 1,
      };

      const equipped = equipItem(char, weapon);
      expect(equipped.equipments.weapon).toEqual(weapon);
    });

    it('should unequip item from slot', () => {
      const char = createCharacter('Hero', 'warrior');
      const weapon: Equipment = {
        id: 'sword-1',
        name: '铁剑',
        slot: 'weapon',
        rarity: 'common',
        baseStats: { attack: 10 },
        affixes: [],
        level: 1,
      };

      const equipped = equipItem(char, weapon);
      const unequipped = unequipItem(equipped, 'weapon');
      expect(unequipped.equipments.weapon).toBeUndefined();
    });
  });

  describe('characterAttack', () => {
    it('should deal damage to defender', () => {
      const attacker = createCharacter('Hero', 'warrior');
      const defender = createCharacter('Enemy', 'warrior');
      const defenderStats = getCharacterStats(defender);

      const { result, newHp } = characterAttack(attacker, defender.currentHp, defenderStats.defense);
      expect(result.damage).toBeGreaterThan(0);
      expect(newHp).toBeLessThan(defender.currentHp);
    });
  });

  describe('gainExp', () => {
    it('should increase exp', () => {
      const char = createCharacter('Hero', 'warrior');
      const { character } = gainExp(char, 50);
      expect(character.exp).toBe(50);
      expect(character.level).toBe(1);
    });

    it('should level up when exp reaches 100', () => {
      const char = createCharacter('Hero', 'warrior');
      const { character, leveledUp } = gainExp(char, 150);
      expect(character.level).toBe(2);
      expect(character.exp).toBe(50);
      expect(leveledUp).toBe(true);
    });
  });
});
