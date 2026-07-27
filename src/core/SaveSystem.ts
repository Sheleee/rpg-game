import { Character } from '../core/Character';

export interface SaveData {
  version: number;
  character: Character;
  timestamp: number;
  playTime: number;
}

const SAVE_KEY = 'rpg-game-save';
const SAVE_VERSION = 1;

export function saveGame(character: Character, playTime: number = 0): boolean {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      character,
      timestamp: Date.now(),
      playTime,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);
    
    // Version migration if needed
    if (data.version < SAVE_VERSION) {
      return migrateSaveData(data);
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

function migrateSaveData(data: SaveData): SaveData {
  // Future version migrations go here
  return {
    ...data,
    version: SAVE_VERSION,
  };
}
