import { Stats, createStats, addStats } from './Stats';
import { Equipment, EquipmentSlot, calculateTotalStats } from './Equipment';
import { calculateDamage, applyDamage, CombatResult } from './Combat';

export type ClassType = 'warrior' | 'mage' | 'thief';

export interface CharacterClass {
  type: ClassType;
  name: string;
  baseStats: Partial<Stats>;
  perLevelStats: Partial<Stats>;
  jobChanges: JobChange[];
}

export interface JobChange {
  name: string;
  requiredLevel: number;
  statBonus: Partial<Stats>;
}

export const CHARACTER_CLASSES: Record<ClassType, CharacterClass> = {
  warrior: {
    type: 'warrior', name: '战士',
    baseStats: { hp: 150, mp: 30, attack: 12, defense: 8, speed: 90 },
    perLevelStats: { hp: 12, mp: 3, attack: 3, defense: 2, speed: 1 },
    jobChanges: [
      { name: '圣骑士', requiredLevel: 10, statBonus: { hp: 50, defense: 10, attack: 5 } },
      { name: '狂战士', requiredLevel: 10, statBonus: { hp: 30, attack: 15, speed: 10 } },
    ],
  },
  mage: {
    type: 'mage', name: '法师',
    baseStats: { hp: 80, mp: 100, attack: 6, defense: 4, speed: 95 },
    perLevelStats: { hp: 6, mp: 10, attack: 3, defense: 1, speed: 1 },
    jobChanges: [
      { name: '元素师', requiredLevel: 10, statBonus: { mp: 50, attack: 10 } },
      { name: '召唤师', requiredLevel: 10, statBonus: { mp: 30, hp: 20, defense: 5 } },
    ],
  },
  thief: {
    type: 'thief', name: '盗贼',
    baseStats: { hp: 100, mp: 40, attack: 10, defense: 5, speed: 130, critRate: 0.15 },
    perLevelStats: { hp: 8, mp: 3, attack: 3, defense: 1, speed: 3 },
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
  inventory: Equipment[];
  /** 金币（商店货币） */
  gold: number;
  /** 已转职的终职名称（未转职为 null） */
  jobName: string | null;
  /** 转职属性加成（由 applyJobChange 写入） */
  jobBonus: Partial<Stats>;
}

export function createCharacter(name: string, classType: ClassType): Character {
  const c = CHARACTER_CLASSES[classType];
  return {
    name, classType, level: 1, exp: 0,
    currentHp: c.baseStats.hp ?? 100,
    currentMp: c.baseStats.mp ?? 50,
    equipments: {},
    inventory: [],
    gold: 0,
    jobName: null,
    jobBonus: {},
  };
}

/** 增加 / 扣除金币（扣除时保证不为负） */
export function addGold(character: Character, amount: number): Character {
  return { ...character, gold: Math.max(0, character.gold + amount) };
}

/** 转职：设置终职名称并应用职业属性加成（仅一次） */
export function applyJobChange(character: Character, jobName: string): Character {
  if (character.jobName) return character;
  // 从职业定义中查找对应终职，应用其属性加成
  const c = CHARACTER_CLASSES[character.classType];
  const job = c.jobChanges.find(j => j.name === jobName);
  return {
    ...character,
    jobName,
    jobBonus: job?.statBonus ?? {},
  };
}

export function getCharacterStats(character: Character): Stats {
  const c = CHARACTER_CLASSES[character.classType];
  const base = createStats(c.baseStats);
  const levelBonus: Partial<Stats> = {};
  for (const key of Object.keys(c.perLevelStats) as (keyof Stats)[]) {
    const v = c.perLevelStats[key];
    if (v !== undefined) levelBonus[key] = v * (character.level - 1);
  }
  const withLevel = addStats(base, levelBonus);
  const equipped = Object.values(character.equipments).filter(Boolean) as Equipment[];
  const eqStats = calculateTotalStats(equipped);
  const withEq = addStats(withLevel, eqStats);
  // 转职加成
  return addStats(withEq, character.jobBonus ?? {});
}

export function equipItem(character: Character, eq: Equipment): Character {
  const old = character.equipments[eq.slot];
  const inv = character.inventory.filter(i => i.id !== eq.id);
  if (old) inv.push(old);
  return {
    ...character,
    equipments: { ...character.equipments, [eq.slot]: eq },
    inventory: inv,
  };
}

export function unequipItem(character: Character, slot: EquipmentSlot): Character {
  const old = character.equipments[slot];
  if (!old) return character;
  const inv = [...character.inventory, old];
  const eq = { ...character.equipments };
  delete eq[slot];
  return { ...character, equipments: eq, inventory: inv };
}

export function characterAttack(attacker: Character, defenderCurrentHp: number, defenderDefense: number): {
  result: CombatResult; newHp: number;
} {
  const attackerStats = getCharacterStats(attacker);
  const fakeDefender: Stats = {
    hp: defenderCurrentHp, mp: 0, attack: 0, defense: defenderDefense,
    speed: 0, critRate: 0, critDamage: 1,
  };
  const result = calculateDamage(attackerStats, fakeDefender);
  const { hp: newHp, isDead } = applyDamage(defenderCurrentHp, result.damage);
  return { result: { ...result, isDead }, newHp };
}

export function gainExp(character: Character, amount: number): {
  character: Character; leveledUp: boolean;
} {
  let newExp = character.exp + amount;
  let newLevel = character.level;
  let leveledUp = false;

  while (newExp >= expToNext(newLevel)) {
    newExp -= expToNext(newLevel);
    newLevel++;
    leveledUp = true;
  }

  const result = { ...character, exp: newExp, level: newLevel };

  if (leveledUp) {
    const c = CHARACTER_CLASSES[character.classType];
    const stats = getCharacterStats(result);
    result.currentHp = stats.hp;
    result.currentMp = stats.mp;
  }

  return { character: result, leveledUp };
}

function expToNext(level: number): number {
  return 50 + level * 30;
}
