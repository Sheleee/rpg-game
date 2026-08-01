import Phaser from 'phaser';
import { QuestManager, getQuestTitle } from '../core/Quests';

// 任务日志面板：显示进行中 / 已完成任务（J 键切换）

export class QuestLogPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Text[] = [];
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(420).setVisible(false);

    const bg = scene.add.rectangle(400, 300, 460, 420, 0x111111, 0.95)
      .setStrokeStyle(2, 0x888888);
    this.container.add(bg);

    const title = scene.add.text(400, 110, '任务日志 (J 关闭)', {
      font: 'bold 18px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(421);
    this.container.add(title);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(manager: QuestManager): void {
    if (this.visible) this.hide();
    else this.show(manager);
  }

  show(manager: QuestManager): void {
    this.visible = true;
    this.container.setVisible(true);
    this.redraw(manager);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  private redraw(manager: QuestManager): void {
    this.rows.forEach(t => t.destroy());
    this.rows = [];

    const active = manager.active;
    const completed = manager.completedIds;

    let y = 160;
    if (active.length === 0) {
      this.addRow(120, y, '(暂无进行中的任务)', '#666666');
      y += 30;
    } else {
      for (const state of active) {
        this.addRow(120, y, `▸ ${getQuestTitle(state.id)}`, '#ffffff');
        y += 20;
        for (const goal of state.goals) {
          const pct = `${Math.min(goal.current, goal.count)}/${goal.count}`;
          this.addRow(140, y, `  ${goalDesc(goal)} ${pct}`, '#aaaaaa');
          y += 18;
        }
        y += 8;
      }
    }

    y += 10;
    this.addRow(120, y, `--- 已完成 (${completed.length}) ---`, '#888888');
    y += 22;
    for (const id of completed) {
      this.addRow(140, y, `✓ ${getQuestTitle(id)}`, '#44cc66');
      y += 18;
    }
  }

  private addRow(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, {
      font: '13px monospace', color, wordWrap: { width: 380 },
    }).setDepth(421);
    this.container.add(t);
    this.rows.push(t);
  }
}

function goalDesc(goal: { type: string; target: string }): string {
  switch (goal.type) {
    case 'kill': return `击杀 ${goal.target}`;
    case 'boss': return `击败 BOSS ${goal.target}`;
    case 'reach': return `抵达区域 ${goal.target}`;
    case 'talk': return `与 ${goal.target} 对话`;
    default: return goal.target;
  }
}
