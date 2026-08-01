import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame, hasSaveData, deleteSave, SaveData } from '../core/SaveSystem';
import { createCharacter } from '../core/Character';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

function makeSave(): SaveData {
  const character = createCharacter('Hero', 'warrior');
  return {
    character,
    questStates: [],
    dungeonLevel: 1,
    zoneId: 'village',
    completedEvents: [],
  };
}

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and load character data', () => {
    const data = makeSave();
    const saved = saveGame(data);
    expect(saved).toBe(true);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.character.name).toBe('Hero');
    expect(loaded?.character.classType).toBe('warrior');
    expect(loaded?.character.gold).toBe(0);
    expect(loaded?.character.jobName).toBeNull();
  });

  it('should save quest and zone state', () => {
    const data = makeSave();
    data.character.gold = 123;
    data.questStates = [{ id: 'q_test', goals: [], status: 'active' }];
    data.dungeonLevel = 5;
    data.zoneId = 'grassland';
    saveGame(data);

    const loaded = loadGame();
    expect(loaded?.character.gold).toBe(123);
    expect(loaded?.questStates).toHaveLength(1);
    expect(loaded?.questStates[0].id).toBe('q_test');
    expect(loaded?.dungeonLevel).toBe(5);
    expect(loaded?.zoneId).toBe('grassland');
  });

  it('should return null when no save exists', () => {
    const loaded = loadGame();
    expect(loaded).toBeNull();
  });

  it('should detect save data existence', () => {
    expect(hasSaveData()).toBe(false);

    saveGame(makeSave());
    expect(hasSaveData()).toBe(true);
  });

  it('should delete save data', () => {
    saveGame(makeSave());
    expect(hasSaveData()).toBe(true);

    deleteSave();
    expect(hasSaveData()).toBe(false);
  });

  it('should migrate legacy save (missing gold/jobName/questStates)', () => {
    // 模拟 v1 存档（只有 character）
    const legacy = {
      version: 1,
      character: { ...createCharacter('Old', 'mage'), gold: undefined, jobName: undefined },
      timestamp: Date.now(),
      playTime: 0,
    };
    localStorage.setItem('rpg-game-save', JSON.stringify(legacy));

    const loaded = loadGame();
    expect(loaded?.version).toBe(2);
    expect(loaded?.character.gold).toBe(0);
    expect(loaded?.character.jobName).toBeNull();
    expect(loaded?.questStates).toEqual([]);
    expect(loaded?.dungeonLevel).toBe(1);
    expect(loaded?.zoneId).toBe('village');
  });
});
