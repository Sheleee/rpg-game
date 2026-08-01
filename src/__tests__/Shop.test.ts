import { describe, it, expect } from 'vitest';
import { shopPrice, generateShopStock, canAfford, buyItem } from '../core/Shop';
import { createCharacter, addGold } from '../core/Character';
import { generateRandomEquipment } from '../core/Equipment';

describe('Shop', () => {
  it('should price higher rarity equipment higher', () => {
    const common = generateRandomEquipment(1, 'weapon');
    const legendary = generateRandomEquipment(1, 'weapon');
    // 强制品质比较：直接构造
    const eq = (rarity: 'common' | 'legendary') => ({
      id: 'x', name: 'test', slot: 'weapon' as const,
      rarity, baseStats: { attack: 5 }, affixes: [], level: 1,
    });
    expect(shopPrice(eq('legendary'))).toBeGreaterThan(shopPrice(eq('common')));
  });

  it('should price higher level equipment higher', () => {
    const eq = (level: number) => ({
      id: 'x', name: 'test', slot: 'weapon' as const,
      rarity: 'common' as const, baseStats: { attack: 5 }, affixes: [], level,
    });
    expect(shopPrice(eq(10))).toBeGreaterThan(shopPrice(eq(1)));
  });

  it('should generate stock with prices', () => {
    const stock = generateShopStock(3, 4);
    expect(stock.length).toBeGreaterThan(0);
    for (const item of stock) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.equipment.slot).toBeTruthy();
    }
  });

  it('should check affordability', () => {
    const char = createCharacter('Hero', 'warrior');
    expect(canAfford(char, 10)).toBe(false);
    const rich = addGold(char, 100);
    expect(canAfford(rich, 10)).toBe(true);
  });

  it('should buy item and deduct gold', () => {
    const char = addGold(createCharacter('Hero', 'warrior'), 500);
    const stock = generateShopStock(1, 1);
    const item = stock[0];

    const result = buyItem(char, item);
    expect(result).not.toBeNull();
    expect(result!.gold).toBe(500 - item.price);
    expect(result!.inventory).toContain(item.equipment);
  });

  it('should reject purchase when gold insufficient', () => {
    const char = createCharacter('Hero', 'warrior');
    const stock = generateShopStock(5, 1);
    const item = stock[0];

    const result = buyItem(char, item);
    expect(result).toBeNull();
    expect(char.gold).toBe(0);
  });
});
