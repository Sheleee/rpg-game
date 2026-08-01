import { Character } from './Character';
import { Equipment, generateRandomEquipment, ItemRarity, EquipmentSlot } from './Equipment';

// 商店系统：定价、生成库存、购买

export interface ShopItem {
  equipment: Equipment;
  price: number;
}

const RARITY_PRICE_BASE: Record<ItemRarity, number> = {
  common: 25, uncommon: 60, rare: 150, epic: 350, legendary: 900,
};

/** 根据装备品质 / 等级 / 词条数计算售价 */
export function shopPrice(eq: Equipment): number {
  const base = RARITY_PRICE_BASE[eq.rarity];
  const levelFactor = 1 + (eq.level - 1) * 0.15;
  const affixBonus = eq.affixes.length * 12;
  return Math.round(base * levelFactor + affixBonus);
}

const SHOP_SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'accessory1', 'accessory2'];

/** 生成商店库存（数量按等级增长，权重偏向当前区域等级附近） */
export function generateShopStock(zoneLevel: number, count = 4): ShopItem[] {
  const items: ShopItem[] = [];
  const usedSlots = new Set<EquipmentSlot>();
  for (let i = 0; i < count; i++) {
    const available = SHOP_SLOTS.filter(s => !usedSlots.has(s));
    if (available.length === 0) break;
    const slot = available[Math.floor(Math.random() * available.length)];
    usedSlots.add(slot);
    const eq = generateRandomEquipment(zoneLevel, slot);
    items.push({ equipment: eq, price: shopPrice(eq) });
  }
  return items;
}

export function canAfford(character: Character, price: number): boolean {
  return character.gold >= price;
}

/** 购买：扣金币并把装备放入背包；金币不足返回 null */
export function buyItem(character: Character, item: ShopItem): Character | null {
  if (!canAfford(character, item.price)) return null;
  return {
    ...character,
    gold: character.gold - item.price,
    inventory: [...character.inventory, item.equipment],
  };
}
