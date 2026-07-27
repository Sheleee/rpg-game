import Phaser from 'phaser';

export class AttackButton {
  private button: Phaser.GameObjects.Ellipse;
  private label: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  private _isPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 40, onAttack: () => void) {
    this.button = scene.add.ellipse(0, 0, radius * 2, radius * 2, 0xff4444, 0.8);
    this.label = scene.add.text(0, 0, '攻', {
      font: 'bold 24px monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.button, this.label]);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.button.setInteractive(new Phaser.Geom.Ellipse(0, 0, radius * 2, radius * 2), Phaser.Geom.Ellipse.Contains);

    this.button.on('pointerdown', () => {
      this._isPressed = true;
      this.button.setAlpha(0.5);
      onAttack();
    });

    this.button.on('pointerup', () => {
      this._isPressed = false;
      this.button.setAlpha(0.8);
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this._isPressed = false;
      this.button.setAlpha(0.8);
    });
  }

  get isPressed(): boolean {
    return this._isPressed;
  }
}
