import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveGame, loadGame, hasSaveData, deleteSave } from '../core/SaveSystem';
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

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and load character data', () => {
    const character = createCharacter('Hero', 'warrior');
    const saved = saveGame(character);
    expect(saved).toBe(true);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.character.name).toBe('Hero');
    expect(loaded?.character.classType).toBe('warrior');
  });

  it('should return null when no save exists', () => {
    const loaded = loadGame();
    expect(loaded).toBeNull();
  });

  it('should detect save data existence', () => {
    expect(hasSaveData()).toBe(false);
    
    const character = createCharacter('Hero', 'warrior');
    saveGame(character);
    
    expect(hasSaveData()).toBe(true);
  });

  it('should delete save data', () => {
    const character = createCharacter('Hero', 'warrior');
    saveGame(character);
    expect(hasSaveData()).toBe(true);

    deleteSave();
    expect(hasSaveData()).toBe(false);
  });
});
