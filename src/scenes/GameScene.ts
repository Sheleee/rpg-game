import Phaser from 'phaser';
import { Character, createCharacter, characterAttack, gainExp, getCharacterStats } from '../core/Character';
import { Enemy, createEnemy } from '../core/Enemy';
import { HUDScene } from './HUDScene';
import { saveGame } from '../core/SaveSystem';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  
  private character!: Character;
  private enemyData: Map<Phaser.Physics.Arcade.Sprite, Enemy> = new Map();
  
  private readonly PLAYER_SPEED = 160;
  private lastAttackTime = 0;
  private readonly ATTACK_COOLDOWN = 500;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Load or create character
    this.character = createCharacter('勇者', 'warrior');
    
    // Create walls
    this.walls = this.physics.add.staticGroup();
    this.createWalls();
    
    // Create player
    this.player = this.physics.add.sprite(400, 300, 'player');
    this.player.setCollideWorldBounds(true);
    
    // Create enemies
    this.enemies = this.physics.add.group();
    this.createEnemies();
    
    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    // Setup collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    
    // Player-enemy collision for damage
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);
    
    // Launch HUD
    this.scene.launch('HUDScene');
    this.updateHUD();
    
    // Attack input (Space)
    this.input.keyboard!.on('keydown-SPACE', this.handleAttack, this);
    
    // Save with S key
    this.input.keyboard!.on('keydown-ESC', () => {
      saveGame(this.character);
      console.log('Game saved!');
    });
  }

  update(): void {
    this.handlePlayerMovement();
    this.updateEnemies();
  }

  private handlePlayerMovement(): void {
    const velocity = this.player.body as Phaser.Physics.Arcade.Body;
    
    velocity.setVelocity(0);
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocity.setVelocityX(-this.PLAYER_SPEED);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocity.setVelocityX(this.PLAYER_SPEED);
    }
    
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocity.setVelocityY(-this.PLAYER_SPEED);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocity.setVelocityY(this.PLAYER_SPEED);
    }
  }

  private handleAttack(): void {
    const now = Date.now();
    if (now - this.lastAttackTime < this.ATTACK_COOLDOWN) return;
    this.lastAttackTime = now;

    // Check each enemy in range
    this.enemies.getChildren().forEach((enemy) => {
      const sprite = enemy as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        sprite.x, sprite.y
      );

      if (distance < 50) {
        const enemyData = this.enemyData.get(sprite);
        if (enemyData && enemyData.currentHp > 0) {
          const { result, updatedDefender } = characterAttack(this.character, {
            name: enemyData.name,
            classType: 'warrior',
            level: enemyData.level,
            exp: 0,
            currentHp: enemyData.currentHp,
            currentMp: 0,
            equipments: {},
          });

          enemyData.currentHp = updatedDefender.currentHp;

          // Flash enemy red
          sprite.setTint(0xff0000);
          this.time.delayedCall(100, () => sprite.clearTint());

          // Show damage number
          this.showDamageNumber(sprite.x, sprite.y - 20, result.damage, result.isCrit);

          if (result.isDead) {
            const expGain = enemyData.expReward;
            const { character: newChar, leveledUp } = gainExp(this.character, expGain);
            this.character = newChar;
            this.updateHUD();

            if (leveledUp) {
              this.showMessage('升级!');
            }

            sprite.destroy();
            this.enemyData.delete(sprite);

            // Respawn after delay
            this.time.delayedCall(3000, () => this.spawnEnemy());
          }
        }
      }
    });
  }

  private handlePlayerEnemyCollision(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const enemyData = this.enemyData.get(enemySprite);
    
    if (enemyData && enemyData.currentHp > 0) {
      // Take damage from enemy
      const now = Date.now();
      if (now - this.lastAttackTime > 1000) {
        this.character = {
          ...this.character,
          currentHp: Math.max(0, this.character.currentHp - enemyData.attackDamage),
        };
        this.updateHUD();

        // Flash player
        this.player.setTint(0xff0000);
        this.time.delayedCall(200, () => this.player.clearTint());

        if (this.character.currentHp <= 0) {
          this.showMessage('游戏结束!');
          this.scene.restart();
        }
      }
    }
  }

  private updateEnemies(): void {
    this.enemies.getChildren().forEach((enemy) => {
      const sprite = enemy as Phaser.Physics.Arcade.Sprite;
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      
      const distance = Phaser.Math.Distance.Between(
        sprite.x, sprite.y,
        this.player.x, this.player.y
      );
      
      if (distance < 150) {
        this.physics.moveToObject(sprite, this.player, 80);
      } else {
        body.setVelocity(0);
      }
    });
  }

  private createWalls(): void {
    const wallPositions = [
      ...Array.from({ length: 25 }, (_, i) => ({ x: i * 32 + 16, y: 16 })),
      ...Array.from({ length: 25 }, (_, i) => ({ x: i * 32 + 16, y: 584 })),
      ...Array.from({ length: 18 }, (_, i) => ({ x: 16, y: i * 32 + 16 })),
      ...Array.from({ length: 18 }, (_, i) => ({ x: 784, y: i * 32 + 16 })),
    ];
    
    wallPositions.forEach(pos => {
      this.walls.create(pos.x, pos.y, 'wall');
    });
  }

  private createEnemies(): void {
    for (let i = 0; i < 5; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const x = Phaser.Math.Between(100, 700);
    const y = Phaser.Math.Between(100, 500);
    const sprite = this.enemies.create(x, y, 'enemy');
    sprite.setCollideWorldBounds(true);
    this.enemyData.set(sprite, createEnemy('哥布林', 1));
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    const color = isCrit ? '#ffff00' : '#ffffff';
    const text = this.add.text(x, y, `${damage}`, {
      font: isCrit ? 'bold 16px monospace' : '12px monospace',
      color,
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showMessage(msg: string): void {
    const text = this.add.text(400, 300, msg, {
      font: '32px monospace',
      color: '#ff0000',
    });
    text.setOrigin(0.5);
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 2000,
      onComplete: () => text.destroy(),
    });
  }

  private updateHUD(): void {
    const stats = getCharacterStats(this.character);
    const hudScene = this.scene.get('HUDScene') as HUDScene;
    hudScene.updateStats(this.character.currentHp, stats.hp, this.character.currentMp, stats.mp);
    hudScene.updateLevel(this.character.level, this.character.exp, 100);
  }
}
