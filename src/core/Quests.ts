import { Equipment } from './Equipment';
import { ZoneId } from './Regions';

// 任务系统：kill=击杀指定怪物, boss=击杀 BOSS, reach=到达区域, talk=与 NPC 对话

export type QuestGoalType = 'kill' | 'boss' | 'reach' | 'talk';

export interface QuestGoal {
  type: QuestGoalType;
  target: string;
  count: number;
  current: number;
}

export interface QuestRewards {
  exp: number;
  gold: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  giver: string;
  goals: Omit<QuestGoal, 'current'>[];
  rewards: QuestRewards;
}

export interface QuestState {
  id: string;
  goals: QuestGoal[];
  status: 'active' | 'completed';
}

export interface QuestDefinition extends Quest {
  /** 前置任务 id（完成它之后才能接取），可选 */
  requires?: string;
  /** 接取前置条件：最低等级 */
  minLevel?: number;
}

// ---- 预设任务 ----
export const QUESTS: QuestDefinition[] = [
  {
    id: 'q_slime_hunt',
    title: '猎杀史莱姆',
    description: '新手村的史莱姆最近泛滥成灾，去地下洞窟消灭 5 只史莱姆。',
    giver: '村长',
    goals: [{ type: 'kill', target: '史莱姆', count: 5 }],
    rewards: { exp: 40, gold: 30 },
  },
  {
    id: 'q_goblin_clear',
    title: '清除哥布林',
    description: '洞窟深处的哥布林开始威胁村庄，消灭 8 只哥布林。',
    giver: '村长',
    requires: 'q_slime_hunt',
    goals: [{ type: 'kill', target: '哥布林', count: 8 }],
    rewards: { exp: 80, gold: 60 },
  },
  {
    id: 'q_reach_grassland',
    title: '深入草原',
    description: '穿过村庄洞窟的深处，抵达草原区域。',
    giver: '猎人',
    goals: [{ type: 'reach', target: 'grassland', count: 1 }],
    rewards: { exp: 100, gold: 50 },
  },
  {
    id: 'q_wolf_king',
    title: '狼王之刃',
    description: '草原深处的狼王祸害牧民，击败它。',
    giver: '猎人',
    requires: 'q_reach_grassland',
    goals: [{ type: 'boss', target: '狼王', count: 1 }],
    rewards: { exp: 250, gold: 150 },
  },
  {
    id: 'q_reach_desert',
    title: '穿越沙漠',
    description: '继续深入，抵达沙漠区域。',
    giver: '游商',
    goals: [{ type: 'reach', target: 'desert', count: 1 }],
    rewards: { exp: 200, gold: 100 },
  },
  {
    id: 'q_scorpion',
    title: '沙漠毒针',
    description: '沙漠巨蝎威胁商路，击败它。',
    giver: '游商',
    requires: 'q_reach_desert',
    goals: [{ type: 'boss', target: '沙漠巨蝎', count: 1 }],
    rewards: { exp: 400, gold: 250 },
  },
  {
    id: 'q_reach_snow',
    title: '登顶雪山',
    description: '最终试炼：抵达雪山区域。',
    giver: '贤者',
    goals: [{ type: 'reach', target: 'snow', count: 1 }],
    rewards: { exp: 300, gold: 200 },
  },
  {
    id: 'q_dragon',
    title: '屠龙者',
    description: '传说冰霜巨龙沉睡于龙巢，击败它，成为真正的英雄！',
    giver: '贤者',
    requires: 'q_reach_snow',
    goals: [{ type: 'boss', target: '冰霜巨龙', count: 1 }],
    rewards: { exp: 1000, gold: 500 },
  },
];

export function getQuest(id: string): QuestDefinition | undefined {
  return QUESTS.find(q => q.id === id);
}

export function getQuestTitle(id: string): string {
  return getQuest(id)?.title ?? id;
}

export class QuestManager {
  private states = new Map<string, QuestState>();

  constructor(initial?: QuestState[]) {
    if (initial) {
      for (const s of initial) this.states.set(s.id, s);
    }
  }

  /** 已接 / 已完成的任务 id 集合 */
  get ids(): string[] {
    return [...this.states.keys()];
  }

  /** 进行中的任务状态列表 */
  get active(): QuestState[] {
    return [...this.states.values()].filter(s => s.status === 'active');
  }

  /** 已完成的任务 id 列表 */
  get completedIds(): string[] {
    return [...this.states.values()].filter(s => s.status === 'completed').map(s => s.id);
  }

  getState(id: string): QuestState | undefined {
    return this.states.get(id);
  }

  isActive(id: string): boolean {
    return this.states.get(id)?.status === 'active';
  }

  isCompleted(id: string): boolean {
    return this.states.get(id)?.status === 'completed';
  }

  /** 是否满足接取前置条件（未接、未完成、前置完成、等级达标） */
  canAccept(id: string, playerLevel: number): boolean {
    const def = getQuest(id);
    if (!def) return false;
    if (this.states.has(id)) return false;
    if (def.requires && !this.isCompleted(def.requires)) return false;
    if (def.minLevel && playerLevel < def.minLevel) return false;
    return true;
  }

  /** 接取任务（返回是否成功；自动校验前置与等级） */
  accept(id: string, playerLevel = 1): boolean {
    const def = getQuest(id);
    if (!def || this.states.has(id)) return false;
    if (def.requires && !this.isCompleted(def.requires)) return false;
    if (def.minLevel && playerLevel < def.minLevel) return false;
    this.states.set(id, {
      id,
      goals: def.goals.map(g => ({ ...g, current: 0 })),
      status: 'active',
    });
    return true;
  }

  /** 记录一次击杀（返回本次击杀后新完成的任务 id 列表） */
  recordKill(enemyName: string, isBoss: boolean): string[] {
    const completed: string[] = [];
    for (const state of this.active) {
      const def = getQuest(state.id);
      if (!def) continue;
      let changed = false;
      for (const goal of state.goals) {
        const matches = goal.type === 'boss'
          ? (isBoss && goal.target === enemyName)
          : (goal.type === 'kill' && goal.target === enemyName);
        if (matches && goal.current < goal.count) {
          goal.current++;
          changed = true;
        }
      }
      if (changed && this.checkCompletion(state)) completed.push(state.id);
    }
    return completed;
  }

  /** 记录到达区域（返回新完成的任务 id 列表） */
  recordReachZone(zoneId: ZoneId): string[] {
    const completed: string[] = [];
    for (const state of this.active) {
      const def = getQuest(state.id);
      if (!def) continue;
      let changed = false;
      for (const goal of state.goals) {
        if (goal.type === 'reach' && goal.target === zoneId && goal.current < goal.count) {
          goal.current++;
          changed = true;
        }
      }
      if (changed && this.checkCompletion(state)) completed.push(state.id);
    }
    return completed;
  }

  /** 记录与 NPC 对话（返回新完成的任务 id 列表） */
  recordTalk(npcName: string): string[] {
    const completed: string[] = [];
    for (const state of this.active) {
      const def = getQuest(state.id);
      if (!def) continue;
      let changed = false;
      for (const goal of state.goals) {
        if (goal.type === 'talk' && goal.target === npcName && goal.current < goal.count) {
          goal.current++;
          changed = true;
        }
      }
      if (changed && this.checkCompletion(state)) completed.push(state.id);
    }
    return completed;
  }

  /** 目标是否全部达成（不修改状态） */
  isGoalsComplete(state: QuestState): boolean {
    return state.goals.every(g => g.current >= g.count);
  }

  private checkCompletion(state: QuestState): boolean {
    if (this.isGoalsComplete(state)) {
      state.status = 'completed';
      return true;
    }
    return false;
  }

  /** 序列化（用于存档） */
  serialize(): QuestState[] {
    return [...this.states.values()];
  }
}

/** 结算任务奖励（金币 / 经验，由调用方应用） */
export function questReward(id: string): QuestRewards {
  return getQuest(id)?.rewards ?? { exp: 0, gold: 0 };
}
