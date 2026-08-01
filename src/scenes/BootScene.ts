import Phaser from 'phaser';
import { generateAllTextures } from '../graphics/SpriteGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    generateAllTextures(this);
    this.scene.start('ClassSelectScene');
  }
}
