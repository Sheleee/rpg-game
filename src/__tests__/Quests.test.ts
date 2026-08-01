import { describe, it, expect } from 'vitest';
import { QuestManager, QUESTS, questReward, getQuest } from '../core/Quests';

describe('QuestManager', () => {
  it('should accept a quest and track progress', () => {
    const qm = new QuestManager();
    expect(qm.accept('q_slime_hunt')).toBe(true);
    expect(qm.isActive('q_slime_hunt')).toBe(true);
    expect(qm.accept('q_slime_hunt')).toBe(false); // 不可重复接
  });

  it('should not accept quest with unmet prerequisite', () => {
    const qm = new QuestManager();
    // q_goblin_clear 需要先完成 q_slime_hunt
    expect(qm.canAccept('q_goblin_clear', 1)).toBe(false);
    expect(qm.accept('q_goblin_clear')).toBe(false);
  });

  it('should accept quest after prerequisite completed', () => {
    const qm = new QuestManager();
    qm.accept('q_slime_hunt');
    // 完成 5 只史莱姆
    for (let i = 0; i < 5; i++) qm.recordKill('史莱姆', false);
    expect(qm.isCompleted('q_slime_hunt')).toBe(true);
    expect(qm.canAccept('q_goblin_clear', 1)).toBe(true);
    expect(qm.accept('q_goblin_clear')).toBe(true);
  });

  it('should complete kill quest when enough enemies killed', () => {
    const qm = new QuestManager();
    qm.accept('q_slime_hunt');
    const completed = qm.recordKill('史莱姆', false);
    expect(completed).toHaveLength(0); // 未完成

    for (let i = 0; i < 3; i++) qm.recordKill('史莱姆', false); // 累计 4/5
    const done = qm.recordKill('史莱姆', false); // 第 5 只
    expect(done).toEqual(['q_slime_hunt']);
    expect(qm.isCompleted('q_slime_hunt')).toBe(true);
  });

  it('should not count wrong enemy type', () => {
    const qm = new QuestManager();
    qm.accept('q_slime_hunt');
    qm.recordKill('哥布林', false);
    const state = qm.getState('q_slime_hunt');
    expect(state?.goals[0].current).toBe(0);
  });

  it('should complete boss quest only on matching boss kill', () => {
    const qm = new QuestManager();
    // 完成前置 q_reach_grassland
    qm.accept('q_reach_grassland');
    qm.recordReachZone('grassland');
    expect(qm.accept('q_wolf_king')).toBe(true);
    expect(qm.recordKill('哥布林王', true)).toHaveLength(0);
    const done = qm.recordKill('狼王', true);
    expect(done).toEqual(['q_wolf_king']);
  });

  it('should complete reach quest on entering zone', () => {
    const qm = new QuestManager();
    qm.accept('q_reach_grassland');
    const done = qm.recordReachZone('grassland');
    expect(done).toEqual(['q_reach_grassland']);
  });

  it('should serialize and restore state', () => {
    const qm = new QuestManager();
    qm.accept('q_slime_hunt');
    qm.recordKill('史莱姆', false);
    qm.recordKill('史莱姆', false);

    const saved = qm.serialize();
    const qm2 = new QuestManager(saved);
    expect(qm2.isActive('q_slime_hunt')).toBe(true);
    expect(qm2.getState('q_slime_hunt')?.goals[0].current).toBe(2);

    // 继续击杀可完成
    for (let i = 0; i < 3; i++) qm2.recordKill('史莱姆', false);
    expect(qm2.isCompleted('q_slime_hunt')).toBe(true);
  });

  it('should have valid quest definitions', () => {
    expect(QUESTS.length).toBeGreaterThan(0);
    for (const q of QUESTS) {
      expect(getQuest(q.id)).toBeDefined();
      expect(q.goals.length).toBeGreaterThan(0);
      const reward = questReward(q.id);
      expect(reward.exp).toBeGreaterThan(0);
      expect(reward.gold).toBeGreaterThan(0);
    }
    // 所有 requires 都指向存在的任务
    for (const q of QUESTS) {
      if (q.requires) expect(getQuest(q.requires)).toBeDefined();
    }
  });
});
