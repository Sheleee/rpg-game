import { Stats, createStats, addStats } from './Stats';
import { Equipment, EquipmentSlot, calculateTotalStats, getEquipmentStats } from './Equipment';
import { calculateDamage, applyDamage, CombatResult } from './Combat';

export type ClassType = 'warrior' | 'mage' | 'thief';

export interface CharacterClass {
  type: ClassType;
  name: string;
  baseStats: Partial<Stats>;
  jobChanges: JobChange[];
}

export interface JobChange {
  name: string;
  requiredLevel: number;
  statBonus: Partial<Stats>;
}

export const CHARACTER_CLASSES: Record<ClassType, CharacterClass> = {
  warrior: {
    type: 'warrior',
    name: '战士',
    baseStats: { hp: 150, mp: 30, attack: 12, defense: 8, speed: 90 },
    jobChanges: [
      { name: '圣骑士', requiredLevel: 10, statBonus: { hp: 50, defense: 10, attack: 5 } },
      { name: '狂战士', requiredLevel: 10, statBonus: { hp: 30, attack: 15, speed: 10 } },
    ],
  },
  mage: {
    type: 'mage',
    name: '法师',
    baseStats: { hp: 80, mp: 100, attack: 6, defense: 4, speed: 95 },
    jobChanges: [
      { name: '元素师', requiredLevel: 10, statBonus: { mp: 50, attack: 10 } },
      { name: '召唤师', requiredLevel: 10, statBonus: { mp: 30, hp: 20, defense: 5 } },
    ],
  },
  thief: {
    type: 'thief',
    name: '盗贼',
    baseStats: { hp: 100, mp: 40, attack: 10, defense: 5, speed: 130, critRate: 0.15 },
    jobChanges: [
      { name: '刺客', requiredLevel: 10, statBonus: { attack: 10, critRate: 0.1, critDamage: 0.5 } },
      { name: '游侠', requiredLevel: 10, statBonus: { speed: 20, attack: 8 } },
    ],
  },
};

export interface Character {
  name: string;
  classType: ClassType;
  level: number;
  exp: number;
  currentHp: number;
  currentMp: number;
  equipments: Partial<Record<EquipmentSlot, Equipment>>;
}

export function createCharacter(name: string, classType: ClassType): Character {
  const characterClass = CHARACTER_CLASSES[classType];
  return {
    name,
    classType,
    level: 1,
    exp: 0,
    currentHp: characterClass.baseStats.hp ?? 100,
    currentMp: characterClass.baseStats.mp ?? 50,
    equipments: {},
  };
}

export function getCharacterStats(character: Character): Stats {
  const characterClass = CHARACTER_CLASSES[character.classType];
  const baseStats = createStats(characterClass.baseStats);

  // Get all equipped items
  const equippedItems = Object.values(character.equipments).filter(Boolean) as Equipment[];

  // Calculate equipment stats
  const equipmentStats = calculateTotalStats(equippedItems);

  // Add base + equipment stats
  return addStats(baseStats, equipmentStats);
}

export function equipItem(character: Character, equipment: Equipment): Character {
  return {
    ...character,
    equipments: {
      ...character.equipments,
      [equipment.slot]: equipment,
    },
  };
}

export function unequipItem(character: Character, slot: EquipmentSlot): Character {
  const newEquipments = { ...character.equipments };
  delete newEquipments[slot];
  return {
    ...character,
    equipments: newEquipments,
  };
}

export function characterAttack(attacker: Character, defender: Character): {
  result: CombatResult;
  updatedDefender: Character;
} {
  const attackerStats = getCharacterStats(attacker);
  const defenderStats = getCharacterStats(defender);

  const result = calculateDamage(attackerStats, defenderStats);
  const { hp: newHp, isDead } = applyDamage(defender.currentHp, result.damage);

  return {
    result: { ...result, isDead },
    updatedDefender: { ...defender, currentHp: newHp },
  };
}

export function gainExp(character: Character, amount: number): {
  character: Character;
  leveledUp: boolean;
} {
  let newExp = character.exp + amount;
  let newLevel = character.level;
  let leveledUp = false;

  // Simple level up: 100 exp per level
  while (newExp >= 100) {
    newExp -= 100;
    newLevel++;
    leveledUp = true;
  }

  return {
    character: { ...character, exp: newExp, level: newLevel },
    leveledUp,
  };
}
