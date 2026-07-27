import Phaser from 'phaser';
import { Character, createCharacter, getCharacterStats } from '../core/Character';
import { saveGame } from '../core/SaveSystem';
import { HUDScene } from './HUDScene';
import { InputSystem } from '../systems/InputSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EnemyManager } from '../systems/EnemyManager';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { AttackButton } from '../ui/AttackButton';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private character!: Character;

  private inputSystem!: InputSystem;
  private combatSystem!: CombatSystem;
  private enemyManager!: EnemyManager;
  private joystick!: VirtualJoystick;
  private attackButton!: AttackButton;

  private lastHitTime = 0;
  private readonly PLAYER_SPEED = 160;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('GameScene: create()');
    this.character = createCharacter('勇者', 'warrior');

    this.add.text(400, 300, '游戏加载中...', {
      font: '24px monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.walls = this.physics.add.staticGroup();
    this.createWalls();

    this.player = this.physics.add.sprite(400, 300, 'player');
    this.player.setCollideWorldBounds(true);

    const enemies = this.physics.add.group();
    this.enemyManager = new EnemyManager(this, enemies);
    this.enemyManager.spawnInitial();

    this.inputSystem = new InputSystem(this);
    this.combatSystem = new CombatSystem();

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(enemies, this.walls);
    this.physics.add.overlap(this.player, enemies, this.handlePlayerEnemyCollision, undefined, this);

    this.physics.world.setBounds(0, 0, 800, 600);

    this.scene.launch('HUDScene');
    this.updateHUD();

    this.inputSystem.onAttack(() => this.handleAttack());
    this.joystick = new VirtualJoystick(this, 120, 500, 55, 24);
    this.attackButton = new AttackButton(this, 680, 500, 35, () => this.inputSystem.triggerAttack());

    this.input.keyboard!.on('keydown-ESC', () => {
      saveGame(this.character);
      console.log('游戏已保存！');
    });
  }

  update(): void {
    this.inputSystem.setJoystickState(this.joystick.getState());
    this.handleMovement();
    this.enemyManager.update(this.player.x, this.player.y);
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const input = this.inputSystem.getMovement();

    body.setVelocity(input.moveX * this.PLAYER_SPEED, input.moveY * this.PLAYER_SPEED);
  }

  private handleAttack(): void {
    const target = this.enemyManager.getEnemyAt(this.player.x, this.player.y, 50);
    if (!target) return;

    const result = this.combatSystem.tryAttack(
      this.character,
      target.enemy,
      this.player.x, this.player.y,
      target.sprite.x, target.sprite.y
    );

    if (!result) return;

    this.enemyManager.updateEnemyHp(target.sprite, result.updatedEnemy.currentHp);
    this.character = result.updatedCharacter;
    this.updateHUD();

    target.sprite.setTint(0xff0000);
    this.time.delayedCall(100, () => target.sprite.clearTint());
    this.showDamageNumber(target.sprite.x, target.sprite.y - 20, result.damage, result.isCrit);

    if (result.leveledUp) {
      this.showMessage('升级！');
    }

    if (result.isDead) {
      this.enemyManager.removeEnemy(target.sprite);
    }
  }

  private handlePlayerEnemyCollision(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    const enemyData = this.enemyManager.getEnemyData(enemySprite);

    if (enemyData && enemyData.currentHp > 0) {
      const now = Date.now();
      if (now - this.lastHitTime < 1000) return;
      this.lastHitTime = now;
      this.character = {
        ...this.character,
        currentHp: Math.max(0, this.character.currentHp - enemyData.attackDamage),
      };
      this.updateHUD();
      this.player.setTint(0xff0000);
      this.time.delayedCall(200, () => this.player.clearTint());

      if (this.character.currentHp <= 0) {
        this.showMessage('游戏结束！');
        this.scene.restart();
      }
    }
  }

  private createWalls(): void {
    const positions = [
      ...Array.from({ length: 25 }, (_, i) => ({ x: i * 32 + 16, y: 16 })),
      ...Array.from({ length: 25 }, (_, i) => ({ x: i * 32 + 16, y: 584 })),
      ...Array.from({ length: 18 }, (_, i) => ({ x: 16, y: i * 32 + 16 })),
      ...Array.from({ length: 18 }, (_, i) => ({ x: 784, y: i * 32 + 16 })),
    ];
    positions.forEach(pos => this.walls.create(pos.x, pos.y, 'wall'));
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    const text = this.add.text(x, y, `${damage}`, {
      font: isCrit ? 'bold 16px monospace' : '12px monospace',
      color: isCrit ? '#ffff00' : '#ffffff',
    });
    text.setOrigin(0.5);
    this.tweens.add({
      targets: text, y: y - 30, alpha: 0, duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showMessage(msg: string): void {
    const text = this.add.text(400, 300, msg, { font: '32px monospace', color: '#ff0000' });
    text.setOrigin(0.5);
    this.tweens.add({
      targets: text, alpha: 0, duration: 2000,
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
