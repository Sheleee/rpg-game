import { Character } from '../core/Character';
import { QuestState } from '../core/Quests';
import { ZoneId } from '../core/Regions';

export interface SaveData {
  /** 存档版本（由 saveGame 填充） */
  version?: number;
  character: Character;
  /** 任务进度 */
  questStates: QuestState[];
  /** 当前地下城层数 */
  dungeonLevel: number;
  /** 当前所在区域 */
  zoneId: ZoneId;
  /** 已完成的剧情事件（预留） */
  completedEvents: string[];
  /** 保存时间戳（由 saveGame 填充） */
  timestamp?: number;
  playTime?: number;
}

const SAVE_KEY = 'rpg-game-save';
const SAVE_VERSION = 2;

export function saveGame(data: SaveData): boolean {
  try {
    const payload: SaveData = {
      ...data,
      version: SAVE_VERSION,
      timestamp: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
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
    if ((data.version ?? 0) < SAVE_VERSION) {
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
  const char = data.character;
  // 旧存档补充新增字段
  if (char.gold === undefined) char.gold = 0;
  if (char.jobName === undefined) char.jobName = null;
  if (char.jobBonus === undefined) char.jobBonus = {};
  return {
    ...data,
    version: SAVE_VERSION,
    character: char,
    questStates: data.questStates ?? [],
    dungeonLevel: data.dungeonLevel ?? 1,
    zoneId: data.zoneId ?? 'village',
    completedEvents: data.completedEvents ?? [],
  };
}
