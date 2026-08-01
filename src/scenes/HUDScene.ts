import Phaser from 'phaser';
import { MiniMap } from '../ui/MiniMap';
import { Dungeon } from '../systems/DungeonManager';
import { InventoryPanel } from '../ui/InventoryPanel';
import { LevelUpChoice } from '../ui/LevelUpChoice';

const MARGIN = 10;
const BAR_W = 152;
const BAR_H = 14;

export class HUDScene extends Phaser.Scene {
  private hpFill!: Phaser.GameObjects.Graphics;
  private mpFill!: Phaser.GameObjects.Graphics;
  private expFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  private currentHp = 100;
  private maxHp = 100;
  private currentMp = 50;
  private maxMp = 50;
  private level = 1;
  private exp = 0;
  private expToNext = 100;
  private miniMap: MiniMap | null = null;
  private pendingDungeon: Dungeon | null = null;
  private pendingX = 0;
  private pendingY = 0;

  private goldText!: Phaser.GameObjects.Text;
  private zoneText!: Phaser.GameObjects.Text;
  private gold = 0;
  private zoneName = '';
  private dungeonLevel = 1;
  private jobName: string | null = null;

  private _inventory!: InventoryPanel;
  private _levelUpUI!: LevelUpChoice;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(data?: Record<string, number>): void {
    if (data) {
      this.currentHp = data.currentHp ?? this.currentHp;
      this.maxHp = data.maxHp ?? this.maxHp;
      this.currentMp = data.currentMp ?? this.currentMp;
      this.maxMp = data.maxMp ?? this.maxMp;
      this.level = data.level ?? this.level;
      this.exp = data.exp ?? this.exp;
    }

    this.drawFrame(MARGIN, MARGIN);
    this.hpFill = this.add.graphics().setDepth(10);

    const mpY = MARGIN + BAR_H + 6;
    this.drawFrame(MARGIN, mpY);
    this.mpFill = this.add.graphics().setDepth(10);

    const expY = mpY + BAR_H + 6;
    this.drawFrame(MARGIN, expY);
    this.expFill = this.add.graphics().setDepth(10);

    this.hpText = this.add.text(MARGIN + BAR_W + 6, MARGIN - 1, '', {
      font: '11px monospace', color: '#ffffff',
    });
    this.mpText = this.add.text(MARGIN + BAR_W + 6, mpY - 1, '', {
      font: '11px monospace', color: '#ffffff',
    });
    this.levelText = this.add.text(MARGIN, expY + BAR_H + 4, '', {
      font: '13px monospace', color: '#ffff00',
    });

    // 金币（右上角）
    this.goldText = this.add.text(Number(this.game.config.width) - MARGIN, MARGIN, '', {
      font: 'bold 14px monospace', color: '#ffdd44',
    }).setOrigin(1, 0).setDepth(20);

    // 区域信息（右下角）
    this.zoneText = this.add.text(Number(this.game.config.width) - MARGIN, Number(this.game.config.height) - MARGIN, '', {
      font: '13px monospace', color: '#88ccff',
    }).setOrigin(1, 1).setDepth(20);

    // 操作提示（左下角）
    this.add.text(MARGIN, Number(this.game.config.height) - MARGIN, '[E]对话  [J]任务  [I]背包  [M]静音', {
      font: '11px monospace', color: '#777777',
    }).setOrigin(0, 1).setDepth(20);

    this.updateDisplay();
    this.miniMap = new MiniMap(this);
    if (this.pendingDungeon) {
      this.miniMap.draw(this.pendingDungeon, this.pendingX, this.pendingY, 0, 0);
      this.pendingDungeon = null;
    }

    this._inventory = new InventoryPanel(this, this);
    this._levelUpUI = new LevelUpChoice(this);
  }

  get inventory(): InventoryPanel { return this._inventory; }
  get levelUpUI(): LevelUpChoice { return this._levelUpUI; }

  updateMiniMap(dungeon: Dungeon, curX: number, curY: number, playerWorldX: number, playerWorldY: number): void {
    if (this.miniMap) {
      this.miniMap.draw(dungeon, curX, curY, playerWorldX, playerWorldY);
    } else {
      this.pendingDungeon = dungeon;
      this.pendingX = curX;
      this.pendingY = curY;
    }
  }

  private drawFrame(x: number, y: number): void {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(x - 1, y - 1, BAR_W + 2, BAR_H + 2);
    g.lineStyle(1, 0x555555, 1);
    g.strokeRect(x, y, BAR_W, BAR_H);
    g.fillStyle(0x111111, 1);
    g.fillRect(x, y, BAR_W, BAR_H);
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

  updateGold(gold: number): void {
    this.gold = gold;
    this.goldText.setText(`💰 ${gold}`);
  }

  updateZone(zoneName: string, dungeonLevel: number, jobName: string | null): void {
    this.zoneName = zoneName;
    this.dungeonLevel = dungeonLevel;
    this.jobName = jobName;
    this.zoneText.setText(`${zoneName} 第${dungeonLevel}层${jobName ? `  ·  ${jobName}` : ''}`);
  }

  private updateDisplay(): void {
    if (!this.hpFill) return;
    const fx = MARGIN + 2;
    const fw = BAR_W - 4;
    const fh = BAR_H - 4;

    this.hpFill.clear();
    this.drawFill(this.hpFill, fx, MARGIN + 2, fw, fh, this.currentHp / this.maxHp, 0xff4444);
    this.hpText.setText(`HP ${this.currentHp}/${this.maxHp}`);

    const mpY = MARGIN + BAR_H + 6;
    this.mpFill.clear();
    this.drawFill(this.mpFill, fx, mpY + 2, fw, fh, this.currentMp / this.maxMp, 0x4488ff);
    this.mpText.setText(`MP ${this.currentMp}/${this.maxMp}`);

    const expY = mpY + BAR_H + 6;
    this.expFill.clear();
    this.drawFill(this.expFill, fx, expY + 2, fw, fh, this.exp / this.expToNext, 0xccaa44);
    this.levelText.setText(`Lv.${this.level}`);
  }

  private drawFill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number): void {
    const fillW = Math.round(w * Math.max(0, Math.min(1, pct)));
    if (fillW <= 0) return;

    const r = (color >>> 16) & 0xff;
    const gr = (color >>> 8) & 0xff;
    const b = color & 0xff;
    const dark = Phaser.Display.Color.GetColor(Math.round(r * 0.6), Math.round(gr * 0.6), Math.round(b * 0.6));

    g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
    g.fillRect(x, y, fillW, 1);
    for (let row = 1; row + 1 < h; row++) {
      g.fillStyle(row % 2 === 0 ? dark : Phaser.Display.Color.GetColor(r, gr, b), 1);
      g.fillRect(x, y + row, fillW, 1);
    }
    g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
    g.fillRect(x, y + h - 1, fillW, 1);

    g.fillStyle(0x000000, 0.3);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + fillW - 1, y, 1, h);
  }
}