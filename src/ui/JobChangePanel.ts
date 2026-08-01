import Phaser from 'phaser';
import { Character, CHARACTER_CLASSES, ClassType } from '../core/Character';

// 转职面板：等级达标后弹出，从两个终职中选择一个

export class JobChangePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(450).setVisible(false);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** 显示转职选择（character 需已到转职等级） */
  show(character: Character, onSelect: (jobName: string) => void): void {
    this.visible = true;
    this.container.setVisible(true);
    this.container.removeAll(true);

    const c = CHARACTER_CLASSES[character.classType as ClassType];
    const jobs = c.jobChanges.filter(j => character.level >= j.requiredLevel);

    const bg = this.scene.add.rectangle(400, 300, 560, 360, 0x111111, 0.96)
      .setStrokeStyle(3, 0xffcc44).setDepth(450);
    this.container.add(bg);

    const title = this.scene.add.text(400, 130, '✦ 转职 ✦', {
      font: 'bold 26px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(451);
    this.container.add(title);

    const sub = this.scene.add.text(400, 165, `你的 ${c.name} 已具备转职资格，选择你的命运之路：`, {
      font: '13px monospace', color: '#cccccc',
    }).setOrigin(0.5).setDepth(451);
    this.container.add(sub);

    jobs.forEach((job, i) => {
      const y = 230 + i * 90;
      const card = this.scene.add.rectangle(400, y, 460, 72, 0x333333, 0.9)
        .setStrokeStyle(2, 0x8866cc).setInteractive({ useHandCursor: true }).setDepth(451);
      card.on('pointerover', () => card.setFillStyle(0x555555, 0.95));
      card.on('pointerout', () => card.setFillStyle(0x333333, 0.9));
      card.on('pointerdown', () => {
        this.hide();
        onSelect(job.name);
      });
      this.container.add(card);

      const name = this.scene.add.text(400, y - 12, `${job.name}  (Lv.${job.requiredLevel})`, {
        font: 'bold 18px monospace', color: '#ffffff',
      }).setOrigin(0.5).setDepth(452);
      this.container.add(name);

      const bonus = Object.entries(job.statBonus)
        .map(([k, v]) => {
          if (k === 'critRate' || k === 'critDamage') return `${k} +${(v as number * 100).toFixed(0)}%`;
          return `${k} +${v}`;
        })
        .join('  ');
      this.container.add(this.scene.add.text(400, y + 18, bonus, {
        font: '12px monospace', color: '#88ccff',
      }).setOrigin(0.5).setDepth(452));
    });
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }
}
