import Phaser from 'phaser';
import { Enemy, createEnemy, rollDrop } from '../core/Enemy';
import { Equipment } from '../core/Equipment';

const ENEMY_TYPES = ['哥布林', '史莱姆', '骷髅', '蝙蝠'];

export interface WaveConfig {
  wave: number;
  enemies: { type: string; count: number }[];
}

function generateWave(wave: number): WaveConfig {
  const count = 2 + wave * 2;
  const types = ENEMY_TYPES.slice(0, Math.min(2 + Math.floor(wave / 2), ENEMY_TYPES.length));
  return {
    wave,
    enemies: [{ type: types[wave % types.length], count }],
  };
}

export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyData: Map<Phaser.Physics.Arcade.Sprite, Enemy> = new Map();
  private readonly SPAWN = { minX: 100, maxX: 700, minY: 100, maxY: 500 };
  private readonly CHASE_RANGE = 150;
  private readonly ENEMY_SPEED = 80;

  public currentWave = 0;
  public waveActive = false;
  public onWaveClear?: () => void;
  public onDrop?: (eq: Equipment) => void;

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.enemies = enemies;
  }

  startNextWave(): void {
    this.currentWave++;
    this.waveActive = true;
    const config = generateWave(this.currentWave);
    for (const group of config.enemies) {
      for (let i = 0; i < group.count; i++) {
        const level = Math.min(this.currentWave, 10);
        this.spawnEnemy(group.type, level);
      }
    }
  }

  spawnEnemy(type: string, level: number): void {
    const x = Phaser.Math.Between(this.SPAWN.minX, this.SPAWN.maxX);
    const y = Phaser.Math.Between(this.SPAWN.minY, this.SPAWN.maxY);
    const sprite = this.enemies.create(x, y, 'enemy');
    sprite.setCollideWorldBounds(true);
    this.enemyData.set(sprite, createEnemy(type, level));
  }

  update(playerX: number, playerY: number): void {
    this.enemies.getChildren().forEach((enemy) => {
      const sprite = enemy as Phaser.Physics.Arcade.Sprite;
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, playerX, playerY);
      if (dist < this.CHASE_RANGE) {
        const angle = Math.atan2(playerY - sprite.y, playerX - sprite.x);
        body.setVelocity(Math.cos(angle) * this.ENEMY_SPEED, Math.sin(angle) * this.ENEMY_SPEED);
      } else {
        body.setVelocity(0);
      }
    });
  }

  getEnemyAt(x: number, y: number, range: number): { sprite: Phaser.Physics.Arcade.Sprite; enemy: Enemy } | null {
    for (const [sprite, enemy] of this.enemyData) {
      const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, x, y);
      if (dist < range && enemy.currentHp > 0) return { sprite, enemy };
    }
    return null;
  }

  updateEnemyHp(sprite: Phaser.Physics.Arcade.Sprite, newHp: number): void {
    const enemy = this.enemyData.get(sprite);
    if (enemy) enemy.currentHp = newHp;
  }

  removeEnemy(sprite: Phaser.Physics.Arcade.Sprite): void {
    const enemy = this.enemyData.get(sprite);
    if (enemy) {
      const drop = rollDrop(enemy.name, enemy.level);
      if (drop && this.onDrop) this.onDrop(drop);
    }
    sprite.destroy();
    this.enemyData.delete(sprite);

    if (this.waveActive && this.enemyData.size === 0) {
      this.waveActive = false;
      if (this.onWaveClear) this.onWaveClear();
    }
  }

  getEnemyData(sprite: Phaser.Physics.Arcade.Sprite): Enemy | undefined {
    return this.enemyData.get(sprite);
  }

  getActiveCount(): number {
    return this.enemyData.size;
  }
}
