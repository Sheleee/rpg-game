import Phaser from 'phaser';
import { Character, getCharacterStats, equipItem, unequipItem } from '../core/Character';
import { Equipment, EquipmentSlot, getEquipmentStats } from '../core/Equipment';
import { Stats } from '../core/Stats';
import { HUDScene } from '../scenes/HUDScene';

export class InventoryPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private items: Phaser.GameObjects.Container[] = [];
  private visible = false;
  private hud: HUDScene;
  private character!: Character;

  constructor(scene: Phaser.Scene, hud: HUDScene) {
    this.scene = scene;
    this.hud = hud;
    this.bg = scene.add.rectangle(400, 300, 500, 460, 0x111111, 0.95)
      .setStrokeStyle(2, 0x888888).setDepth(250);
    this.container = scene.add.container(0, 0, [this.bg]);
    this.container.setDepth(250);
    this.container.setVisible(false);

    const title = scene.add.text(400, 70, '背包 / 装备', {
      font: 'bold 20px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(251);
    this.container.add(title);

    const closeBtn = scene.add.text(640, 70, '[X]', {
      font: 'bold 18px monospace', color: '#ff6666',
    }).setOrigin(0.5).setDepth(251).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    if (scene.input.keyboard) {
      scene.input.keyboard.on('keydown-ESC', () => { if (this.visible) this.hide(); });
    }
  }

  setCharacter(char: Character): void {
    this.character = char;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    this.redraw();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  redraw(): void {
    if (!this.character) return;
    this.items.forEach(c => c.destroy());
    this.items = [];

    const stats = getCharacterStats(this.character);
    this.drawStatsSection(100, stats);

    const slotOrder: EquipmentSlot[] = ['weapon', 'helmet', 'armor', 'accessory1', 'accessory2'];
    const slotLabels: Record<EquipmentSlot, string> = {
      weapon: '武器', helmet: '头盔', armor: '盔甲', accessory1: '饰品1', accessory2: '饰品2',
    };

    let y = 170;
    this.addLabel(165, y - 5, '--- 已装备 ---', 0x888888, false);
    y += 20;
    for (const slot of slotOrder) {
      const item = this.character.equipments[slot];
      const label = `${slotLabels[slot]}: `;
      if (item) {
        this.addItemRow(165, y, label, item, () => {
          this.character = unequipItem(this.character, slot);
          this.redraw();
          this.syncHUD();
        }, '卸下');
      } else {
        this.addLabel(165, y, `${label}空`, 0x666666, false);
      }
      y += 24;
    }

    y += 10;
    this.addLabel(165, y - 5, `--- 背包 (${this.character.inventory.length}) ---`, 0x888888, false);
    y += 20;

    if (this.character.inventory.length === 0) {
      this.addLabel(165, y, '(空)', 0x555555, false);
    } else {
      for (const item of this.character.inventory) {
        if (y > 480) break;
        this.addItemRow(165, y, '', item, () => {
          this.character = equipItem(this.character, item);
          this.redraw();
          this.syncHUD();
        }, '装备');
        y += 24;
      }
    }
  }

  private drawStatsSection(y: number, stats: Stats): void {
    const parts: string[] = [
      `HP ${stats.hp}`, `MP ${stats.mp}`, `ATK ${stats.attack}`,
      `DEF ${stats.defense}`, `SPD ${stats.speed}`,
      `暴击 ${(stats.critRate * 100).toFixed(0)}%`,
      `暴伤 ${(stats.critDamage * 100).toFixed(0)}%`,
    ];
    this.addLabel(165, y, parts.join('  |  '), 0x88ccff, false);
  }

  private addLabel(x: number, y: number, text: string, color: number, interactive: boolean): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.scene.add.text(x, y, text, { font: '12px monospace', color: hex }).setDepth(251);
    this.container.add(t);
    this.items.push(t as unknown as Phaser.GameObjects.Container);
  }

  private addItemRow(x: number, y: number, prefix: string, item: Equipment, action: () => void, btnText: string): void {
    const rarityColor: Record<string, string> = {
      common: '#aaaaaa', uncommon: '#00cc66', rare: '#4488ff', epic: '#aa44ff', legendary: '#ff8800',
    };
    const color = rarityColor[item.rarity] || '#ffffff';
    const eqStats = getEquipmentStats(item);
    const statStr = Object.entries(eqStats)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => {
        if (k === 'critRate' || k === 'critDamage') return `${k} ${(v * 100).toFixed(0)}%`;
        return `${k} +${v}`;
      })
      .join(' ');
    const text = `${prefix}[${item.name}] ${statStr}`;
    const label = this.scene.add.text(x, y, text, { font: '11px monospace', color }).setDepth(251);
    this.container.add(label);
    this.items.push(label as unknown as Phaser.GameObjects.Container);

    const btn = this.scene.add.text(x + 460, y, `[${btnText}]`, {
      font: '11px monospace', color: '#ffff44',
    }).setDepth(251).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', action);
    this.container.add(btn);
    this.items.push(btn as unknown as Phaser.GameObjects.Container);
  }

  private syncHUD(): void {
    const stats = getCharacterStats(this.character);
    this.hud.updateStats(this.character.currentHp, stats.hp, this.character.currentMp, stats.mp);
    this.hud.updateLevel(this.character.level, this.character.exp, 50 + this.character.level * 30);
  }
}
