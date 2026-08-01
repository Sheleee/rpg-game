import { describe, it, expect } from 'vitest';
import {
  ZONES, zoneForLevel, isBossLevel, isFinalBossLevel, zoneProgress, nextZoneHint,
} from '../core/Regions';
import { createEnemy, isBossName } from '../core/Enemy';
import { addGold } from '../core/Character';

describe('Regions', () => {
  it('should have 4 zones in order', () => {
    expect(ZONES.map(z => z.id)).toEqual(['village', 'grassland', 'desert', 'snow']);
  });

  it('should map levels to correct zones', () => {
    expect(zoneForLevel(1).id).toBe('village');
    expect(zoneForLevel(3).id).toBe('village');
    expect(zoneForLevel(4).id).toBe('grassland');
    expect(zoneForLevel(6).id).toBe('grassland');
    expect(zoneForLevel(7).id).toBe('desert');
    expect(zoneForLevel(9).id).toBe('desert');
    expect(zoneForLevel(10).id).toBe('snow');
    expect(zoneForLevel(99).id).toBe('snow'); // 超出按最后区域
  });

  it('should mark zone-max level as boss level', () => {
    expect(isBossLevel(3)).toBe(true);
    expect(isBossLevel(6)).toBe(true);
    expect(isBossLevel(9)).toBe(true);
    expect(isBossLevel(12)).toBe(true);
    expect(isBossLevel(1)).toBe(false);
    expect(isBossLevel(4)).toBe(false);
  });

  it('should detect final boss level', () => {
    expect(isFinalBossLevel(12)).toBe(true);
    expect(isFinalBossLevel(3)).toBe(false);
  });

  it('should report zone progress', () => {
    expect(zoneProgress(1)).toEqual({ index: 0, total: 4 });
    expect(zoneProgress(7)).toEqual({ index: 2, total: 4 });
    expect(zoneProgress(12)).toEqual({ index: 3, total: 4 });
  });

  it('should hint next zone', () => {
    expect(nextZoneHint(3)).toBe('草原');
    expect(nextZoneHint(6)).toBe('沙漠');
    expect(nextZoneHint(9)).toBe('雪山');
  });

  it('should spawn zone enemies and bosses', () => {
    // 各区域怪物池可正常创建
    for (const zone of ZONES) {
      for (const name of zone.enemyPool) {
        const enemy = createEnemy(name, zone.minLevel);
        expect(enemy.maxHp).toBeGreaterThan(0);
        expect(enemy.goldReward).toBeGreaterThan(0);
        expect(enemy.isBoss).toBe(false);
      }
      const boss = createEnemy(zone.bossName, zone.maxLevel);
      expect(boss.isBoss).toBe(true);
      expect(boss.maxHp).toBeGreaterThan(createEnemy(zone.enemyPool[0], zone.minLevel).maxHp);
    }
    expect(isBossName('冰霜巨龙')).toBe(true);
  });

  it('should support gold economy helpers', () => {
    const char = addGold({ ...createChar(), gold: 0 }, 50);
    expect(char.gold).toBe(50);
  });
});

// 简化辅助（避免引入完整 createCharacter 依赖树）
function createChar() {
  return {
    name: 't', classType: 'warrior' as const, level: 1, exp: 0,
    currentHp: 100, currentMp: 50, equipments: {}, inventory: [],
    gold: 0, jobName: null, jobBonus: {},
  };
}
