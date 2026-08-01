import Phaser from 'phaser';
import { ClassType, CHARACTER_CLASSES } from '../core/Character';

export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClassSelectScene' });
  }

  create(): void {
    this.add.text(400, 50, '选择你的职业', {
      font: 'bold 28px monospace', color: '#ffffff',
    }).setOrigin(0.5);

    const classes: ClassType[] = ['warrior', 'mage', 'thief'];
    const startY = 140;
    const gap = 150;

    classes.forEach((type, i) => {
      const c = CHARACTER_CLASSES[type];
      const cy = startY + i * gap;

      const card = this.add.rectangle(400, cy, 360, 120, 0x333333, 0.8)
        .setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x555555, 0.9));
      card.on('pointerout', () => card.setFillStyle(0x333333, 0.8));
      card.on('pointerdown', () => this.selectClass(type));

      this.add.text(400, cy - 35, c.name, {
        font: 'bold 22px monospace', color: '#ffcc44',
      }).setOrigin(0.5);

      const s = c.baseStats;
      const parts: string[] = [];
      if (s.hp) parts.push(`HP+${s.hp}`);
      if (s.attack) parts.push(`ATK+${s.attack}`);
      if (s.defense) parts.push(`DEF+${s.defense}`);
      if (s.speed) parts.push(`SPD+${s.speed}`);
      if (s.critRate) parts.push(`暴击${Math.round(s.critRate * 100)}%`);
      this.add.text(400, cy + 5, parts.join('  '), {
        font: '13px monospace', color: '#aaaaaa',
      }).setOrigin(0.5);

      const jobs = c.jobChanges.map(j => `${j.name}(${j.requiredLevel}级)`).join(' → ');
      this.add.text(400, cy + 30, `转职: ${jobs}`, {
        font: '12px monospace', color: '#888888',
      }).setOrigin(0.5);
    });
  }

  private selectClass(type: ClassType): void {
    this.scene.start('GameScene', { classType: type });
  }
}
