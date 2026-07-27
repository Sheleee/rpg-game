import Phaser from 'phaser';

export class HUDScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private mpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expBar!: Phaser.GameObjects.Graphics;

  private currentHp = 100;
  private maxHp = 100;
  private currentMp = 50;
  private maxMp = 50;
  private level = 1;
  private exp = 0;
  private expToNext = 100;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    const margin = 10;
    const barWidth = 150;
    const barHeight = 16;

    // HP bar background
    this.add.rectangle(margin + barWidth / 2, margin + barHeight / 2, barWidth, barHeight, 0x333333);
    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(margin + barWidth + 5, margin, '', {
      font: '12px monospace',
      color: '#ffffff',
    });

    // MP bar background
    const mpY = margin + barHeight + 5;
    this.add.rectangle(margin + barWidth / 2, mpY + barHeight / 2, barWidth, barHeight, 0x333333);
    this.mpBar = this.add.graphics();
    this.mpText = this.add.text(margin + barWidth + 5, mpY, '', {
      font: '12px monospace',
      color: '#ffffff',
    });

    // EXP bar background
    const expY = mpY + barHeight + 5;
    this.add.rectangle(margin + barWidth / 2, expY + barHeight / 2, barWidth, barHeight, 0x333333);
    this.expBar = this.add.graphics();

    // Level text
    this.levelText = this.add.text(margin, expY + barHeight + 5, '', {
      font: '14px monospace',
      color: '#ffff00',
    });

    this.updateDisplay();
  }

  updateStats(hp: number, maxHp: number, mp: number, maxMp: number): void {
    this.currentHp = hp;
    this.maxHp = maxHp;
    this.currentMp = mp;
    this.maxMp = maxMp;
    this.updateDisplay();
  }

  updateLevel(level: number, exp: number, expToNext: number): void {
    this.level = level;
    this.exp = exp;
    this.expToNext = expToNext;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const margin = 10;
    const barWidth = 150;
    const barHeight = 16;

    // Update HP bar
    this.hpBar.clear();
    this.hpBar.fillStyle(0x00ff00, 1);
    const hpPercent = Math.max(0, this.currentHp / this.maxHp);
    this.hpBar.fillRect(margin, margin, barWidth * hpPercent, barHeight);
    this.hpText.setText(`HP: ${this.currentHp}/${this.maxHp}`);

    // Update MP bar
    const mpY = margin + barHeight + 5;
    this.mpBar.clear();
    this.mpBar.fillStyle(0x0088ff, 1);
    const mpPercent = Math.max(0, this.currentMp / this.maxMp);
    this.mpBar.fillRect(margin, mpY, barWidth * mpPercent, barHeight);
    this.mpText.setText(`MP: ${this.currentMp}/${this.maxMp}`);

    // Update EXP bar
    const expY = mpY + barHeight + 5;
    this.expBar.clear();
    this.expBar.fillStyle(0xffff00, 1);
    const expPercent = Math.max(0, this.exp / this.expToNext);
    this.expBar.fillRect(margin, expY, barWidth * expPercent, barHeight);

    // Update level text
    this.levelText.setText(`Lv.${this.level}`);
  }
}
