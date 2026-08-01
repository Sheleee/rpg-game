import Phaser from 'phaser';
import { ClassType, CHARACTER_CLASSES } from '../core/Character';
import { hasSaveData, deleteSave, loadGame } from '../core/SaveSystem';
import { zoneForLevel } from '../core/Regions';

export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClassSelectScene' });
  }

  create(): void {
    this.add.text(400, 40, '选择你的职业', {
      font: 'bold 28px monospace', color: '#ffffff',
    }).setOrigin(0.5);

    const hasSave = hasSaveData();
    const startY = hasSave ? 250 : 140;
    const gap = 130;

    if (hasSave) {
      const save = loadGame();
      const zone = save ? zoneForLevel(save.dungeonLevel) : null;
      const info = save
        ? `${save.character.name}  Lv.${save.character.level}  ${save.character.classType}  ·  ${zone?.name ?? ''}`
        : '';

      // 继续游戏
      const continueBtn = this.add.rectangle(400, 120, 360, 56, 0x224466, 0.95)
        .setStrokeStyle(2, 0x44cc88).setInteractive({ useHandCursor: true });
      continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x335577, 0.95));
      continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x224466, 0.95));
      continueBtn.on('pointerdown', () => this.scene.start('GameScene', { load: true }));

      this.add.text(400, 108, '▶ 继续游戏', {
        font: 'bold 20px monospace', color: '#44cc88',
      }).setOrigin(0.5);
      this.add.text(400, 134, info, {
        font: '12px monospace', color: '#88aacc',
      }).setOrigin(0.5);

      // 删除存档
      const delBtn = this.add.text(400, 168, '[删除存档]', {
        font: '13px monospace', color: '#cc6666',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      delBtn.on('pointerdown', () => {
        deleteSave();
        this.scene.restart();
      });
    }

    const classes: ClassType[] = ['warrior', 'mage', 'thief'];

    classes.forEach((type, i) => {
      const c = CHARACTER_CLASSES[type];
      const cy = startY + i * gap;

      const card = this.add.rectangle(400, cy, 360, 110, 0x333333, 0.8)
        .setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x555555, 0.9));
      card.on('pointerout', () => card.setFillStyle(0x333333, 0.8));
      card.on('pointerdown', () => this.selectClass(type));

      this.add.text(400, cy - 32, c.name, {
        font: 'bold 22px monospace', color: '#ffcc44',
      }).setOrigin(0.5);

      const s = c.baseStats;
      const parts: string[] = [];
      if (s.hp) parts.push(`HP+${s.hp}`);
      if (s.attack) parts.push(`ATK+${s.attack}`);
      if (s.defense) parts.push(`DEF+${s.defense}`);
      if (s.speed) parts.push(`SPD+${s.speed}`);
      if (s.critRate) parts.push(`暴击${Math.round(s.critRate * 100)}%`);
      this.add.text(400, cy + 2, parts.join('  '), {
        font: '13px monospace', color: '#aaaaaa',
      }).setOrigin(0.5);

      const jobs = c.jobChanges.map(j => `${j.name}(${j.requiredLevel}级)`).join(' → ');
      this.add.text(400, cy + 28, `转职: ${jobs}`, {
        font: '12px monospace', color: '#888888',
      }).setOrigin(0.5);
    });
  }

  private selectClass(type: ClassType): void {
    this.scene.start('GameScene', { classType: type });
  }
}
