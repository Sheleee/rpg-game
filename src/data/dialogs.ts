// NPC 对话数据。选项 action 由 GameScene 处理：
//   'open_shop'     打开商店
//   'accept_quest'  接取任务（data=quest id）
//   'complete'      关闭对话
//   'job_change'    打开转职面板

export type NpcType = 'village_chief' | 'merchant' | 'hunter' | 'trader' | 'sage';

export interface DialogOption {
  label: string;
  action?: 'open_shop' | 'accept_quest' | 'complete' | 'job_change';
  /** action 参数（如 quest id） */
  data?: string;
  /** 选中后跳转到的页面 index（默认关闭对话） */
  goto?: number;
}

export interface DialogPage {
  speaker: string;
  text: string;
  options?: DialogOption[];
}

export interface NpcInfo {
  type: NpcType;
  name: string;
  /** 区域限定：在该区域 start 房间出现 */
  zone?: string;
}

export const NPCS: Record<NpcType, NpcInfo> = {
  village_chief: { type: 'village_chief', name: '村长', zone: 'village' },
  merchant: { type: 'merchant', name: '商人', zone: 'village' },
  hunter: { type: 'hunter', name: '猎人', zone: 'grassland' },
  trader: { type: 'trader', name: '游商', zone: 'desert' },
  sage: { type: 'sage', name: '贤者', zone: 'snow' },
};

/** 每个区域 start 房间生成的 NPC */
export const ZONE_NPCS: Record<string, NpcType[]> = {
  village: ['village_chief', 'merchant'],
  grassland: ['hunter', 'merchant'],
  desert: ['trader', 'merchant'],
  snow: ['sage', 'merchant'],
};

export const DIALOGS: Record<NpcType, DialogPage[]> = {
  village_chief: [
    {
      speaker: '村长',
      text: '年轻的冒险者，欢迎来到新手村！村外的洞窟里有史莱姆和哥布林出没，你能帮我们解决它们吗？',
      options: [
        { label: '[接受任务] 猎杀史莱姆', action: 'accept_quest', data: 'q_slime_hunt' },
        { label: '[接受任务] 清除哥布林', action: 'accept_quest', data: 'q_goblin_clear' },
        { label: '再会', action: 'complete' },
      ],
    },
  ],
  merchant: [
    {
      speaker: '商人',
      text: '欢迎光临！我这里有上好的装备，明码标价，童叟无欺。',
      options: [
        { label: '[打开商店]', action: 'open_shop' },
        { label: '下次再说', action: 'complete' },
      ],
    },
  ],
  hunter: [
    {
      speaker: '猎人',
      text: '能从村庄走到这里，看来你有些本事。草原深处危机四伏，狼群正在肆虐。',
      options: [
        { label: '[接受任务] 深入草原', action: 'accept_quest', data: 'q_reach_grassland' },
        { label: '[接受任务] 狼王之刃', action: 'accept_quest', data: 'q_wolf_king' },
        { label: '谢谢你的情报', action: 'complete' },
      ],
    },
  ],
  trader: [
    {
      speaker: '游商',
      text: '沙漠商路被巨蝎封锁，货物运不出去。你若能除掉它，整个商队都会感谢你。',
      options: [
        { label: '[接受任务] 穿越沙漠', action: 'accept_quest', data: 'q_reach_desert' },
        { label: '[接受任务] 沙漠毒针', action: 'accept_quest', data: 'q_scorpion' },
        { label: '我只是路过', action: 'complete' },
      ],
    },
  ],
  sage: [
    {
      speaker: '贤者',
      text: '你终于来到了雪山。冰霜巨龙盘踞在龙巢之巅，唯有击败它，才能让这片大陆重归和平。',
      options: [
        { label: '[接受任务] 登顶雪山', action: 'accept_quest', data: 'q_reach_snow' },
        { label: '[接受任务] 屠龙者', action: 'accept_quest', data: 'q_dragon' },
        { label: '我会回来的', action: 'complete' },
      ],
    },
  ],
};

/** 靠近 NPC 时的交互提示 */
export function npcPrompt(npc: NpcInfo): string {
  return `[E] 与${npc.name}对话`;
}
