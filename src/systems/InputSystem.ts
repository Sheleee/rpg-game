import Phaser from 'phaser';
import { JoystickState } from '../ui/VirtualJoystick';

export interface MovementInput {
  moveX: number;
  moveY: number;
}

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key };
  private attackCallbacks: (() => void)[] = [];
  private joystickState: JoystickState = { x: 0, y: 0, isActive: false };

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    scene.input.keyboard!.on('keydown-SPACE', () => {
      for (const cb of this.attackCallbacks) cb();
    });
  }

  setJoystickState(state: JoystickState): void {
    this.joystickState = state;
  }

  getMovement(): MovementInput {
    const input = { moveX: 0, moveY: 0 };

    if (this.joystickState.isActive) {
      input.moveX = this.joystickState.x;
      input.moveY = this.joystickState.y;
      return input;
    }

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      input.moveX = -1;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      input.moveX = 1;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      input.moveY = -1;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      input.moveY = 1;
    }

    return input;
  }

  onAttack(callback: () => void): void {
    this.attackCallbacks.push(callback);
  }

  triggerAttack(): void {
    for (const cb of this.attackCallbacks) cb();
  }
}
