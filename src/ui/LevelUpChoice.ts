import Phaser from 'phaser';
import { Stats, addStats } from '../core/Stats';
import { Equipment, generateRandomEquipment } from '../core/Equipment';

export interface LevelUpReward {
  type: 'buff' | 'equipment';
  label: string;
  description: string;
  apply: () => { stats: Stats; inventory: Equipment[] };
}

function randomBuffs(level: number): LevelUpReward[] {
  const pool: LevelUpReward[] = [
    {
      type: 'buff', label: '生命强化', description: '最大HP +20',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { hp: 20 }), inventory: [] }),
    },
    {
      type: 'buff', label: '魔力增幅', description: '最大MP +15',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { mp: 15 }), inventory: [] }),
    },
    {
      type: 'buff', label: '力量提升', description: '攻击力 +4',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { attack: 4 }), inventory: [] }),
    },
    {
      type: 'buff', label: '铁壁', description: '防御力 +3',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { defense: 3 }), inventory: [] }),
    },
    {
      type: 'buff', label: '迅捷', description: '速度 +5',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { speed: 5 }), inventory: [] }),
    },
    {
      type: 'buff', label: '暴击率', description: '暴击率 +5%',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { critRate: 0.05 }), inventory: [] }),
    },
    {
      type: 'buff', label: '暴击伤害', description: '暴击伤害 +30%',
      apply: () => ({ stats: addStats({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, { critDamage: 0.3 }), inventory: [] }),
    },
  ];

  // 装备类奖励（具体装备在抽取时生成）
  const zero = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 };
  pool.push({
    type: 'equipment', label: '', description: '',
    apply: () => ({ stats: zero, inventory: [] }),
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.min(3, shuffled.length);
  const result: LevelUpReward[] = [];
  for (let i = 0; i < count; i++) {
    const r = shuffled[i];
    if (r.type === 'equipment') {
      const eq = generateRandomEquipment(level);
      result.push({
        type: 'equipment', label: eq.name, description: `${eq.rarity} ${eq.slot}`,
        apply: () => ({ stats: { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 }, inventory: [eq] }),
      });
    } else {
      result.push(r);
    }
  }
  return result;
}

export class LevelUpChoice {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callback: (reward: LevelUpReward) => void = () => {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
    const bg = scene.add.rectangle(400, 300, 500, 350, 0x111111, 0.95)
      .setStrokeStyle(2, 0xffcc44);
    this.container.add(bg);

    const title = scene.add.text(400, 130, '升级奖励！选择一个', {
      font: 'bold 20px monospace', color: '#ffcc44',
    }).setOrigin(0.5);
    this.container.add(title);
  }

  show(level: number, onChosen: (reward: LevelUpReward) => void): void {
    this.callback = onChosen;
    const rewards = randomBuffs(level);

    this.container.removeAll(true);
    const bg = this.scene.add.rectangle(400, 300, 500, 350, 0x111111, 0.95)
      .setStrokeStyle(2, 0xffcc44).setDepth(500);
    this.container.add(bg);

    const title = this.scene.add.text(400, 130, `升级奖励！Lv.${level} 选择一个`, {
      font: 'bold 18px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(501);
    this.container.add(title);

    rewards.forEach((reward, i) => {
      const y = 200 + i * 70;
      const card = this.scene.add.rectangle(400, y, 420, 58, 0x333333, 0.9)
        .setStrokeStyle(1, 0x666666).setInteractive({ useHandCursor: true }).setDepth(501);
      card.on('pointerover', () => card.setFillStyle(0x555555, 0.9));
      card.on('pointerout', () => card.setFillStyle(0x333333, 0.9));
      card.on('pointerdown', () => {
        this.container.setVisible(false);
        this.callback(reward);
      });
      this.container.add(card);

      const label = this.scene.add.text(400, y - 8, reward.label, {
        font: 'bold 16px monospace', color: '#ffffff',
      }).setOrigin(0.5).setDepth(502);
      this.container.add(label);

      const desc = this.scene.add.text(400, y + 14, reward.description, {
        font: '12px monospace', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(502);
      this.container.add(desc);
    });

    this.container.setVisible(true);
  }
}
