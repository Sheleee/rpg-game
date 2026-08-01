import Phaser from 'phaser';
import { Character } from '../core/Character';
import { ShopItem, shopPrice } from '../core/Shop';
import { getEquipmentStats } from '../core/Equipment';

// 商店面板：列出商品、价格与购买按钮（E 打开）

export class ShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Text[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private stock: ShopItem[] = [];
  private character: Character | null = null;
  private visible = false;

  /** 点击购买时回调（返回 false 表示金币不足已拒绝） */
  onBuy?: (item: ShopItem) => boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(430).setVisible(false);

    const bg = scene.add.rectangle(400, 300, 560, 440, 0x111111, 0.95)
      .setStrokeStyle(2, 0xccaa44);
    this.container.add(bg);

    const title = scene.add.text(400, 100, '—— 商人 的商店 ——', {
      font: 'bold 18px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(431);
    this.container.add(title);

    this.goldText = scene.add.text(400, 130, '', {
      font: 'bold 14px monospace', color: '#ffdd44',
    }).setOrigin(0.5).setDepth(431);
    this.container.add(this.goldText);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  show(stock: ShopItem[], character: Character): void {
    this.stock = stock;
    this.character = character;
    this.visible = true;
    this.container.setVisible(true);
    this.redraw();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  refresh(character: Character): void {
    this.character = character;
    this.redraw();
  }

  private redraw(): void {
    this.rows.forEach(t => t.destroy());
    this.rows = [];

    if (!this.character) return;
    this.goldText.setText(`金币: ${this.character.gold}`);

    let y = 170;
    if (this.stock.length === 0) {
      this.addRow(120, y, '(货架空空如也)', '#666666', false);
      return;
    }

    for (const item of this.stock) {
      const eq = item.equipment;
      const rarityColor: Record<string, string> = {
        common: '#aaaaaa', uncommon: '#00cc66', rare: '#4488ff', epic: '#aa44ff', legendary: '#ff8800',
      };
      const color = rarityColor[eq.rarity] || '#ffffff';
      const stats = getEquipmentStats(eq);
      const statStr = Object.entries(stats)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => (k === 'critRate' || k === 'critDamage') ? `${k}${(v * 100).toFixed(0)}%` : `${k}+${v}`)
        .join(' ');

      this.addRow(120, y, `[${eq.name}] Lv.${eq.level}  ${statStr}`, color, false);
      this.addRow(430, y, `$${item.price}`, '#ffdd44', false);

      const buy = this.scene.add.text(530, y, '[买]', {
        font: 'bold 13px monospace', color: '#ffff44',
      }).setDepth(432).setInteractive({ useHandCursor: true });
      buy.on('pointerdown', () => {
        // 结果与刷新由 GameScene 的 onBuy 回调处理（金币显示随最新角色引用更新）
        if (this.onBuy) this.onBuy(item);
      });
      this.container.add(buy);
      this.rows.push(buy);

      y += 32;
    }
  }

  private addRow(x: number, y: number, text: string, color: string, interactive: boolean): void {
    const t = this.scene.add.text(x, y, text, {
      font: '12px monospace', color, wordWrap: { width: 300 },
    }).setDepth(432);
    this.container.add(t);
    this.rows.push(t);
  }
}

export { shopPrice };
