import Phaser from 'phaser';

export interface JoystickState {
  x: number;
  y: number;
  isActive: boolean;
}

export class VirtualJoystick {
  private base: Phaser.GameObjects.Ellipse;
  private thumb: Phaser.GameObjects.Ellipse;
  private container: Phaser.GameObjects.Container;

  private baseRadius: number;
  private thumbRadius: number;
  private state: JoystickState = { x: 0, y: 0, isActive: false };
  private pointerId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, baseRadius = 60, thumbRadius = 25) {
    this.baseRadius = baseRadius;
    this.thumbRadius = thumbRadius;

    this.base = scene.add.ellipse(0, 0, baseRadius * 2, baseRadius * 2, 0xffffff, 0.2);
    this.thumb = scene.add.ellipse(0, 0, thumbRadius * 2, thumbRadius * 2, 0xffffff, 0.5);

    this.container = scene.add.container(x, y, [this.base, this.thumb]);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, x, y);
      if (dist < baseRadius * 2) {
        this.pointerId = pointer.id;
        this.state.isActive = true;
        this.updateThumb(pointer.x, pointer.y);
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId && this.state.isActive) {
        this.updateThumb(pointer.x, pointer.y);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) {
        this.reset();
      }
    });
  }

  private updateThumb(pointerX: number, pointerY: number): void {
    const dx = pointerX - this.container.x;
    const dy = pointerY - this.container.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = this.baseRadius - this.thumbRadius;

    if (dist <= maxDist) {
      this.thumb.setPosition(dx, dy);
      this.state.x = dx / maxDist;
      this.state.y = dy / maxDist;
    } else {
      const ratio = maxDist / dist;
      this.thumb.setPosition(dx * ratio, dy * ratio);
      this.state.x = Math.cos(Math.atan2(dy, dx));
      this.state.y = Math.sin(Math.atan2(dy, dx));
    }
  }

  private reset(): void {
    this.thumb.setPosition(0, 0);
    this.state = { x: 0, y: 0, isActive: false };
    this.pointerId = -1;
  }

  getState(): JoystickState {
    return this.state;
  }
}
