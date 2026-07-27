import Phaser from 'phaser';
import { Enemy, createEnemy } from '../core/Enemy';

export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyData: Map<Phaser.Physics.Arcade.Sprite, Enemy> = new Map();
  private readonly SPAWN_AREA = { minX: 100, maxX: 700, minY: 100, maxY: 500 };
  private readonly CHASE_RANGE = 150;
  private readonly ENEMY_SPEED = 80;
  private readonly INITIAL_ENEMY_COUNT = 5;
  private readonly RESPAWN_DELAY = 3000;

  constructor(scene: Phaser.Scene, enemies: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.enemies = enemies;
  }

  spawnInitial(): void {
    for (let i = 0; i < this.INITIAL_ENEMY_COUNT; i++) {
      this.spawnEnemy();
    }
  }

  spawnEnemy(): void {
    const x = Phaser.Math.Between(this.SPAWN_AREA.minX, this.SPAWN_AREA.maxX);
    const y = Phaser.Math.Between(this.SPAWN_AREA.minY, this.SPAWN_AREA.maxY);
    const sprite = this.enemies.create(x, y, 'enemy');
    sprite.setCollideWorldBounds(true);
    this.enemyData.set(sprite, createEnemy('哥布林', 1));
  }

  update(playerX: number, playerY: number): void {
    this.enemies.getChildren().forEach((enemy) => {
      const sprite = enemy as Phaser.Physics.Arcade.Sprite;
      const body = sprite.body as Phaser.Physics.Arcade.Body;

      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, playerX, playerY);

      if (distance < this.CHASE_RANGE) {
        const angle = Math.atan2(playerY - sprite.y, playerX - sprite.x);
        body.setVelocity(
          Math.cos(angle) * this.ENEMY_SPEED,
          Math.sin(angle) * this.ENEMY_SPEED
        );
      } else {
        body.setVelocity(0);
      }
    });
  }

  getEnemyAt(x: number, y: number, range: number): { sprite: Phaser.Physics.Arcade.Sprite; enemy: Enemy } | null {
    for (const [sprite, enemy] of this.enemyData) {
      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, x, y);
      if (distance < range && enemy.currentHp > 0) {
        return { sprite, enemy };
      }
    }
    return null;
  }

  updateEnemyHp(sprite: Phaser.Physics.Arcade.Sprite, newHp: number): void {
    const enemy = this.enemyData.get(sprite);
    if (enemy) {
      enemy.currentHp = newHp;
    }
  }

  removeEnemy(sprite: Phaser.Physics.Arcade.Sprite): void {
    sprite.destroy();
    this.enemyData.delete(sprite);
    this.scene.time.delayedCall(this.RESPAWN_DELAY, () => this.spawnEnemy());
  }

  getEnemyData(sprite: Phaser.Physics.Arcade.Sprite): Enemy | undefined {
    return this.enemyData.get(sprite);
  }
}
