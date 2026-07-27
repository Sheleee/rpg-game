import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    console.log('BootScene: create()');
    this.createPlaceholderTextures();
    this.scene.start('GameScene');
  }

  private createPlaceholderTextures(): void {
    const playerGraphics = this.make.graphics({});
    playerGraphics.fillStyle(0x00ff00, 1);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    const enemyGraphics = this.make.graphics({});
    enemyGraphics.fillStyle(0xff0000, 1);
    enemyGraphics.fillRect(0, 0, 32, 32);
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();

    const groundGraphics = this.make.graphics({});
    groundGraphics.fillStyle(0x3d5c3a, 1);
    groundGraphics.fillRect(0, 0, 32, 32);
    groundGraphics.generateTexture('ground', 32, 32);
    groundGraphics.destroy();

    const wallGraphics = this.make.graphics({});
    wallGraphics.fillStyle(0x8b4513, 1);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.generateTexture('wall', 32, 32);
    wallGraphics.destroy();
  }
}
