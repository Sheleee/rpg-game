import Phaser from 'phaser';
import { DialogPage, DialogOption } from '../data/dialogs';

// 对话面板：显示多页对话与选项，选项 action 通过回调交给 GameScene 处理

export class DialoguePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private options: Phaser.GameObjects.Text[] = [];
  private pages: DialogPage[] = [];
  private current = 0;
  private visible = false;

  /** 选项被点击时回调（action, data, goto） */
  onOption?: (option: DialogOption) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(400).setVisible(false);

    this.bg = scene.add.rectangle(400, 470, 720, 180, 0x111111, 0.95)
      .setStrokeStyle(2, 0x888888);
    this.container.add(this.bg);

    this.nameText = scene.add.text(80, 400, '', {
      font: 'bold 16px monospace', color: '#ffcc44',
    }).setDepth(401);
    this.container.add(this.nameText);

    this.bodyText = scene.add.text(80, 430, '', {
      font: '14px monospace', color: '#eeeeee', wordWrap: { width: 640 },
    }).setDepth(401);
    this.container.add(this.bodyText);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  show(pages: DialogPage[], startIndex = 0): void {
    this.pages = pages;
    this.current = startIndex;
    this.visible = true;
    this.container.setVisible(true);
    this.renderPage();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
    this.clearOptions();
  }

  private renderPage(): void {
    const page = this.pages[this.current];
    if (!page) {
      this.hide();
      return;
    }
    this.nameText.setText(page.speaker);
    this.bodyText.setText(page.text);
    this.clearOptions();

    if (page.options && page.options.length > 0) {
      page.options.forEach((opt, i) => {
        const t = this.scene.add.text(120, 500 + i * 30, opt.label, {
          font: '14px monospace', color: '#88ccff',
        }).setDepth(402).setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#ffffff'));
        t.on('pointerout', () => t.setColor('#88ccff'));
        t.on('pointerdown', () => this.handleOption(opt));
        this.container.add(t);
        this.options.push(t);
      });
    }
  }

  private clearOptions(): void {
    this.options.forEach(o => o.destroy());
    this.options = [];
  }

  private handleOption(opt: DialogOption): void {
    if (opt.goto !== undefined) {
      this.current = opt.goto;
      this.renderPage();
      return;
    }
    this.hide();
    this.onOption?.(opt);
  }
}
