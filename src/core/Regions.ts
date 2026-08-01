// 多区域系统：将地下城「层数 level」映射到不同的世界区域。
// 每个区域有独立的怪物池、难度范围、BOSS 与 BGM 风格。

export type ZoneId = 'village' | 'grassland' | 'desert' | 'snow';

export interface ZoneConfig {
  id: ZoneId;
  name: string;
  nameEn: string;
  /** 该区域起始 dungeon level（含） */
  minLevel: number;
  /** 该区域最深 dungeon level（含），此层出口为 BOSS 战 */
  maxLevel: number;
  /** 区域怪物池 */
  enemyPool: string[];
  /** 区域 BOSS 名称 */
  bossName: string;
  /** BGM 速度（bpm） */
  bgmTempo: number;
  /** BGM 根音频率（Hz） */
  bgmRoot: number;
  /** 房间渲染色调（氛围） */
  tint: number;
  /** 区域简介 */
  desc: string;
}

export const ZONES: ZoneConfig[] = [
  {
    id: 'village', name: '新手村', nameEn: 'Starter Village',
    minLevel: 1, maxLevel: 3,
    enemyPool: ['史莱姆', '蝙蝠', '哥布林'],
    bossName: '哥布林王',
    bgmTempo: 96, bgmRoot: 261.63, // C4
    tint: 0x88cc88,
    desc: '宁静的村庄地下洞窟，怪物较弱，适合历练。',
  },
  {
    id: 'grassland', name: '草原', nameEn: 'Grassland',
    minLevel: 4, maxLevel: 6,
    enemyPool: ['哥布林', '骷髅', '野狼'],
    bossName: '狼王',
    bgmTempo: 108, bgmRoot: 293.66, // D4
    tint: 0xaacc66,
    desc: '广袤草原，狼群出没，冒险者的试炼场。',
  },
  {
    id: 'desert', name: '沙漠', nameEn: 'Desert',
    minLevel: 7, maxLevel: 9,
    enemyPool: ['骷髅', '木乃伊', '沙漠蝎'],
    bossName: '沙漠巨蝎',
    bgmTempo: 120, bgmRoot: 329.63, // E4
    tint: 0xccaa55,
    desc: '酷热沙漠与古老遗迹，危险的死亡之地。',
  },
  {
    id: 'snow', name: '雪山', nameEn: 'Snow Mountain',
    minLevel: 10, maxLevel: 12,
    enemyPool: ['雪怪', '冰骷髅', '冰蝠'],
    bossName: '冰霜巨龙',
    bgmTempo: 132, bgmRoot: 349.23, // F4
    tint: 0x99ccff,
    desc: '终局雪山，传说巨龙沉睡于龙巢。',
  },
];

/** 按 dungeon level 获取所在区域 */
export function zoneForLevel(level: number): ZoneConfig {
  for (const zone of ZONES) {
    if (level >= zone.minLevel && level <= zone.maxLevel) return zone;
  }
  return ZONES[ZONES.length - 1]; // 超过最深区域按最后区域处理
}

/** 该层是否为区域最深层（BOSS 层） */
export function isBossLevel(level: number): boolean {
  const zone = zoneForLevel(level);
  return level >= zone.maxLevel;
}

/** 是否已到达最终区域（雪山）的最深层 */
export function isFinalBossLevel(level: number): boolean {
  const last = ZONES[ZONES.length - 1];
  return level >= last.maxLevel;
}

/** 下一层所处区域（用于提示） */
export function nextZoneHint(level: number): string {
  const nextLevel = level + 1;
  const zone = zoneForLevel(nextLevel);
  return zone.name;
}

/** 区域进度：当前区域 index / 总数 */
export function zoneProgress(level: number): { index: number; total: number } {
  const zone = zoneForLevel(level);
  const index = ZONES.findIndex(z => z.id === zone.id);
  return { index, total: ZONES.length };
}
