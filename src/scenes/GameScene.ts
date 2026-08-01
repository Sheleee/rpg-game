import Phaser from 'phaser';
import {
  Character, createCharacter, getCharacterStats, gainExp, equipItem,
} from '../core/Character';
import { Stats, addStats } from '../core/Stats';
import { saveGame } from '../core/SaveSystem';
import {
  generateDungeon, getRoom, Dungeon, RoomData,
  ROOM_W, ROOM_H, roomCenterX, roomCenterY,
} from '../systems/DungeonManager';
import { createEnemy, rollDrop } from '../core/Enemy';
import { HUDScene } from './HUDScene';
import { InputSystem } from '../systems/InputSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { AttackButton } from '../ui/AttackButton';
import { LevelUpReward } from '../ui/LevelUpChoice';
import { Equipment } from '../core/Equipment';

const TILE = 32;
const COLS = ROOM_W / TILE;
const ROWS = ROOM_H / TILE;
const DOOR_W = TILE * 2;
const HALF_COLS = Math.floor(COLS / 2);
const HALF_ROWS = Math.floor(ROWS / 2);
const CORRIDOR_TILES = 4;
const CORRIDOR_LEN = CORRIDOR_TILES * TILE;

interface RoomEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  data: { name: string; level: number; currentHp: number; maxHp: number; attackDamage: number; defense: number; expReward: number };
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private groundLayer!: Phaser.GameObjects.Group;
  private character!: Character;

  private dungeon!: Dungeon;
  private curX = 0;
  private curY = 0;
  private roomEnemies: RoomEnemy[] = [];
  private chestSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private exitSprite: Phaser.GameObjects.Sprite | null = null;
  private doorArrows: Phaser.GameObjects.Text[] = [];

  private inputSystem!: InputSystem;
  private joystick: VirtualJoystick | null = null;
  private attackButton: AttackButton | null = null;
  private weaponSprite: Phaser.GameObjects.Sprite | null = null;
  private facingRight = true;

  private lastHitTime = 0;
  private isTransitioning = false;
  private bonusStats: Stats = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 };

  private readonly LIGHT_RADIUS = 180;
  private fogCanvas!: HTMLCanvasElement;
  private fogTexture!: Phaser.Textures.CanvasTexture;
  private fogImage!: Phaser.GameObjects.Image;

  private corridorDir: string | null = null;
  private corridorTarget: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: { classType?: string }): void {
    const cls = (data?.classType as 'warrior' | 'mage' | 'thief') || 'warrior';
    this.character = createCharacter('勇者', cls);
    this.bonusStats = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 };
    this.corridorDir = null;
    this.corridorTarget = null;

    this.walls = this.physics.add.staticGroup();
    this.groundLayer = this.add.group();

    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, ROOM_W, ROOM_H);

    this.inputSystem = new InputSystem(this);
    this.physics.add.collider(this.player, this.walls);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.setZoom(1.3);

    this.createWeapon();

    const gw = Number(this.game.config.width);
    const gh = Number(this.game.config.height);

    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = gw;
    this.fogCanvas.height = gh;
    this.fogTexture = this.textures.addCanvas('fog_tex', this.fogCanvas)!;
    this.fogImage = this.add.image(0, 0, 'fog_tex').setOrigin(0, 0).setDepth(200).setScrollFactor(0);

    const eff = this.getEffectiveStats();
    this.scene.launch('HUDScene', {
      currentHp: this.character.currentHp, maxHp: eff.hp,
      currentMp: this.character.currentMp, maxMp: eff.mp,
      level: this.character.level, exp: this.character.exp,
    });

    const hudRef = this.scene.get('HUDScene') as HUDScene;

    this.inputSystem.onAttack(() => this.handleAttack());

    const isTouch = this.sys.game.device.input.touch;
    const z = this.cameras.main.zoom;
    if (isTouch) {
      this.joystick = new VirtualJoystick(this, Math.round(120 / z), Math.round(500 / z), 55, 24);
      this.attackButton = new AttackButton(this, Math.round((gw - 120) / z), Math.round(500 / z), 35, () => this.inputSystem.triggerAttack());
    }

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.isTransitioning) return;
        const hud = this.scene.get('HUDScene') as HUDScene;
        if (hud.inventory.isVisible) {
          hud.inventory.hide();
          return;
        }
        saveGame(this.character);
        this.showFloatingText('游戏已保存！');
      });
      this.input.keyboard.on('keydown-I', () => {
        const hud = this.scene.get('HUDScene') as HUDScene;
        hud.inventory.setCharacter(this.character);
        hud.inventory.toggle();
      });
    }

    this.dungeon = generateDungeon(1);
    this.enterRoom(this.dungeon.startX, this.dungeon.startY);
  }

  update(): void {
    if (this.isTransitioning) return;
    if (this.joystick) this.inputSystem.setJoystickState(this.joystick.getState());
    this.handleMovement();
    this.updateWeaponPosition();
    this.updateEnemyAI();
    if (this.corridorDir) {
      this.checkCorridorEnd();
    } else {
      this.checkRoomTransition();
    }
    this.checkChestPickup();
    this.checkExit();
    this.updateFog();
    (this.scene.get('HUDScene') as HUDScene).updateMiniMap(this.dungeon, this.curX, this.curY, this.player.x, this.player.y);
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const input = this.inputSystem.getMovement();
    body.setVelocity(input.moveX * 160, input.moveY * 160);
    if (input.moveX !== 0) this.facingRight = input.moveX > 0;
  }

  private createWeapon(): void {
    const cls = this.character.classType;
    let key: string;
    if (cls === 'warrior') key = 'weapon_sword';
    else if (cls === 'mage') key = 'weapon_staff';
    else key = 'weapon_dagger';
    this.weaponSprite = this.add.sprite(this.player.x, this.player.y, key).setDepth(1);
  }

  private updateWeaponPosition(): void {
    if (!this.weaponSprite) return;
    const offX = this.facingRight ? 18 : -18;
    this.weaponSprite.setPosition(this.player.x + offX, this.player.y - 6);
    this.weaponSprite.setFlipX(!this.facingRight);
  }

  private handleAttack(): void {
    for (const re of this.roomEnemies) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, re.sprite.x, re.sprite.y);
      if (dist < 55 && re.data.currentHp > 0) {
        const atk = this.getEffectiveStats();
        const base = Math.max(1, atk.attack - re.data.defense);
        const isCrit = Math.random() < atk.critRate;
        const dmg = Math.floor(base * (isCrit ? atk.critDamage : 1));
        re.data.currentHp -= dmg;

        const cls = this.character.classType;
        if (cls === 'mage') {
          this.playMageAttack(this.player.x, this.player.y, re.sprite.x, re.sprite.y);
        } else if (cls === 'thief') {
          this.playThiefAttack(this.player.x, this.player.y, re.sprite.x, re.sprite.y);
        } else {
          this.playWarriorAttack(this.player.x, this.player.y, re.sprite.x, re.sprite.y);
        }
        this.playHitFlash(re.sprite);

        this.showDamageNumber(re.sprite.x, re.sprite.y - 20, dmg, isCrit);
        if (re.data.currentHp <= 0) this.onEnemyKilled(re);
        return;
      }
    }
  }

  private playWarriorAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const g = this.add.graphics().setDepth(150);
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arcRadius = 45;
    const startAngle = angle - 1.3;
    const endAngle = angle + 1.3;

    const state = { progress: 0 };
    this.tweens.add({
      targets: state,
      progress: { from: 0, to: 1 },
      duration: 180,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        g.clear();
        const currentEnd = startAngle + (endAngle - startAngle) * state.progress;
        g.lineStyle(5, 0xffcc00, 0.9);
        g.beginPath();
        g.arc(toX, toY, arcRadius, startAngle, currentEnd, false);
        g.strokePath();
        g.lineStyle(3, 0xffffee, 0.6);
        g.beginPath();
        g.arc(toX, toY, arcRadius * 0.75, startAngle, currentEnd, false);
        g.strokePath();
      },
      onComplete: () => {
        this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
      },
    });
  }

  private playMageAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const orb = this.add.circle(fromX, fromY, 8, 0x4488ff, 1).setDepth(150);
    const glow = this.add.circle(fromX, fromY, 14, 0x4488ff, 0.3).setDepth(149);

    this.tweens.add({
      targets: [orb, glow],
      x: toX, y: toY,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        const impact = this.add.circle(toX, toY, 24, 0x88ccff, 0.6).setDepth(150);
        this.tweens.add({
          targets: [impact, orb, glow],
          alpha: 0, scale: 1.5,
          duration: 200,
          onComplete: () => { impact.destroy(); orb.destroy(); glow.destroy(); },
        });
      },
    });
  }

  private playThiefAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const g = this.add.graphics().setDepth(150);

    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(toX - 15, toY - 15);
    g.lineTo(toX + 15, toY + 15);
    g.strokePath();

    g.lineStyle(2, 0xcccccc, 0.7);
    g.beginPath();
    g.moveTo(toX + 15, toY - 15);
    g.lineTo(toX - 15, toY + 15);
    g.strokePath();

    this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  private playHitFlash(sprite: Phaser.Physics.Arcade.Sprite): void {
    sprite.setTint(0xffffff);
    this.time.delayedCall(50, () => { if (sprite.active) sprite.clearTint(); });
    this.time.delayedCall(100, () => { if (sprite.active) sprite.setTint(0xffffff); });
    this.time.delayedCall(150, () => { if (sprite.active) sprite.clearTint(); });
  }

  private onEnemyKilled(re: RoomEnemy): void {
    const drop = rollDrop(re.data.name, re.data.level);
    if (drop) {
      if (!this.character.equipments[drop.slot]) {
        this.character = equipItem(this.character, drop);
        this.showEquipmentFloatingText(drop, true);
      } else {
        this.character.inventory.push(drop);
        this.showEquipmentFloatingText(drop, false);
      }
    }
    const { character, leveledUp } = gainExp(this.character, re.data.expReward);
    this.character = character;
    this.updateHUD();
    if (leveledUp) {
      this.isTransitioning = true;
      const hud = this.scene.get('HUDScene') as HUDScene;
      hud.levelUpUI.show(this.character.level, (reward) => {
        this.applyLevelUpReward(reward);
        this.isTransitioning = false;
        this.updateHUD();
      });
    }
    re.sprite.destroy();
    this.roomEnemies = this.roomEnemies.filter(e => e !== re);
    const room = getRoom(this.dungeon, this.curX, this.curY);
    if (room && room.enemyCount > 0 && this.roomEnemies.length === 0) {
      room.cleared = true;
      this.showFloatingText('房间已清除！');
    }
  }

  private applyLevelUpReward(reward: LevelUpReward): void {
    const result = reward.apply();
    if (reward.type === 'buff') {
      this.bonusStats = addStats(this.bonusStats, result.stats);
      const eff = this.getEffectiveStats();
      this.character.currentHp = eff.hp;
      this.character.currentMp = eff.mp;
    } else {
      for (const eq of result.inventory) this.character.inventory.push(eq);
    }
    this.showFloatingText(`获得: ${reward.label}`);
  }

  private getEffectiveStats(): Stats {
    return addStats(getCharacterStats(this.character), this.bonusStats);
  }

  private updateEnemyAI(): void {
    for (const re of this.roomEnemies) {
      if (re.data.currentHp <= 0) continue;
      const body = re.sprite.body as Phaser.Physics.Arcade.Body;
      const dist = Phaser.Math.Distance.Between(re.sprite.x, re.sprite.y, this.player.x, this.player.y);
      if (dist < 150) {
        const angle = Math.atan2(this.player.y - re.sprite.y, this.player.x - re.sprite.x);
        body.setVelocity(Math.cos(angle) * 80, Math.sin(angle) * 80);
      } else {
        body.setVelocity(0);
      }
      if (dist < 35 && re.data.currentHp > 0) {
        const now = Date.now();
        if (now - this.lastHitTime > 1000) {
          this.lastHitTime = now;
          this.character.currentHp = Math.max(0, this.character.currentHp - re.data.attackDamage);
          this.updateHUD();
          this.player.setTint(0xff0000);
          this.time.delayedCall(200, () => this.player.clearTint());
          if (this.character.currentHp <= 0) {
            this.showFloatingText('阵亡！');
            this.time.delayedCall(1000, () => this.scene.restart());
          }
        }
      }
    }
  }

  private enterRoom(x: number, y: number, entryDir?: string): void {
    const room = getRoom(this.dungeon, x, y);
    if (!room) return;

    this.curX = x;
    this.curY = y;
    room.explored = true;
    this.isTransitioning = true;
    this.corridorDir = null;
    this.corridorTarget = null;

    this.clearRoom();
    this.renderRoom(room);

    this.physics.world.setBounds(x * ROOM_W, y * ROOM_H, ROOM_W, ROOM_H);
    this.cameras.main.setBounds(x * ROOM_W, y * ROOM_H, ROOM_W, ROOM_H);

    if (entryDir) {
      let px: number, py: number;
      const hw = ROOM_W / 2, hh = ROOM_H / 2;
      switch (entryDir) {
        case 'left':  px = x * ROOM_W + TILE * 3; py = y * ROOM_H + hh; break;
        case 'right': px = (x + 1) * ROOM_W - TILE * 3; py = y * ROOM_H + hh; break;
        case 'up':    px = x * ROOM_W + hw; py = y * ROOM_H + TILE * 3; break;
        case 'down':  px = x * ROOM_W + hw; py = (y + 1) * ROOM_H - TILE * 3; break;
        default:      px = roomCenterX(x); py = roomCenterY(y);
      }
      this.player.setPosition(px, py);
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (pBody) { pBody.reset(px, py); pBody.setVelocity(0, 0); }
    } else {
      const cx = roomCenterX(x);
      const cy = roomCenterY(y);
      this.player.setPosition(cx, cy);
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (pBody) { pBody.reset(cx, cy); pBody.setVelocity(0, 0); }
    }

    this.cameras.main.stopFollow();
    const panX = entryDir ? this.player.x : roomCenterX(x);
    const panY = entryDir ? this.player.y : roomCenterY(y);
    this.cameras.main.pan(panX, panY, 200, 'Sine.easeInOut', true, (_cam: unknown, progress: number) => {
      if (progress >= 1) {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.isTransitioning = false;
      }
    });

    this.updateHUD();
    (this.scene.get('HUDScene') as HUDScene).updateMiniMap(this.dungeon, this.curX, this.curY, this.player.x, this.player.y);
  }

  private renderRoom(room: RoomData): void {
    const ox = this.curX * ROOM_W;
    const oy = this.curY * ROOM_H;

    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        this.groundLayer.add(
          this.add.image(ox + gx * TILE + 16, oy + gy * TILE + 16, 'ground').setDepth(-1)
        );
      }
    }

    for (let i = 0; i < COLS; i++) {
      if (!room.doors.up || (i < HALF_COLS - 1 || i > HALF_COLS)) {
        this.walls.create(ox + i * TILE + 16, oy + 16, 'wall');
      }
      if (!room.doors.down || (i < HALF_COLS - 1 || i > HALF_COLS)) {
        this.walls.create(ox + i * TILE + 16, oy + (ROWS - 1) * TILE + 16, 'wall');
      }
    }

    for (let i = 0; i < ROWS; i++) {
      if (!room.doors.left || (i < HALF_ROWS - 1 || i > HALF_ROWS)) {
        this.walls.create(ox + 16, oy + i * TILE + 16, 'wall');
      }
      if (!room.doors.right || (i < HALF_ROWS - 1 || i > HALF_ROWS)) {
        this.walls.create(ox + (COLS - 1) * TILE + 16, oy + i * TILE + 16, 'wall');
      }
    }

    this.physics.add.collider(this.player, this.walls);

    if ((room.content === 'enemies' || room.content === 'guarded_chest') && !room.cleared) {
      this.spawnRoomEnemies(room, ox, oy);
    }

    if (room.content === 'chest' || (room.content === 'guarded_chest' && room.cleared)) {
      this.chestSprite = this.physics.add.sprite(ox + ROOM_W / 2, oy + ROOM_H / 2 + 60, 'chest');
      this.chestSprite.setImmovable(true);
      this.physics.add.collider(this.player, this.chestSprite);
    }

    if (room.type === 'exit') {
      this.exitSprite = this.add.sprite(ox + ROOM_W / 2, oy + ROOM_H / 2, 'exit');
      this.add.text(ox + ROOM_W / 2, oy + ROOM_H / 2 - 30, '▼', {
        font: 'bold 20px monospace', color: '#44ffff',
      }).setOrigin(0.5).setDepth(50);
    }

    this.createDoorArrows(room, ox, oy);
  }

  private spawnRoomEnemies(room: RoomData, ox: number, oy: number): void {
    for (let i = 0; i < room.enemyCount; i++) {
      const x = ox + 60 + Math.random() * (ROOM_W - 120);
      const y = oy + 60 + Math.random() * (ROOM_H - 120);
      const sprite = this.physics.add.sprite(x, y, 'enemy');
      sprite.setCollideWorldBounds(true);
      this.roomEnemies.push({ sprite, data: createEnemy('哥布林', this.dungeon.level) });
      this.physics.add.collider(sprite, this.walls);
    }
  }

  private createDoorArrows(room: RoomData, ox: number, oy: number): void {
    const sty = { font: 'bold 22px monospace', color: '#ffcc44' } as const;
    if (room.doors.up) {
      this.doorArrows.push(this.add.text(ox + ROOM_W / 2, oy + 8, '▲', sty).setOrigin(0.5, 0).setDepth(60));
    }
    if (room.doors.down) {
      this.doorArrows.push(this.add.text(ox + ROOM_W / 2, oy + ROOM_H - 8, '▼', sty).setOrigin(0.5, 1).setDepth(60));
    }
    if (room.doors.left) {
      this.doorArrows.push(this.add.text(ox + 8, oy + ROOM_H / 2, '◄', sty).setOrigin(0, 0.5).setDepth(60));
    }
    if (room.doors.right) {
      this.doorArrows.push(this.add.text(ox + ROOM_W - 8, oy + ROOM_H / 2, '►', sty).setOrigin(1, 0.5).setDepth(60));
    }
  }

  private clearRoom(): void {
    this.roomEnemies.forEach(e => e.sprite.destroy());
    this.roomEnemies = [];
    if (this.chestSprite) { this.chestSprite.destroy(); this.chestSprite = null; }
    if (this.exitSprite) { this.exitSprite.destroy(); this.exitSprite = null; }
    this.walls.clear(true, true);
    this.groundLayer.clear(true, true);
    this.doorArrows.forEach(t => t.destroy());
    this.doorArrows = [];
  }

  private checkRoomTransition(): void {
    const room = getRoom(this.dungeon, this.curX, this.curY);
    if (!room) return;
    const ox = this.curX * ROOM_W;
    const oy = this.curY * ROOM_H;
    const px = this.player.x;
    const py = this.player.y;
    const margin = TILE * 3;

    if (room.doors.up && py < oy + margin) {
      const nx = this.curX, ny = this.curY - 1;
      if (getRoom(this.dungeon, nx, ny)) this.startCorridorTransition('up', nx, ny);
    } else if (room.doors.down && py > oy + ROOM_H - margin) {
      const nx = this.curX, ny = this.curY + 1;
      if (getRoom(this.dungeon, nx, ny)) this.startCorridorTransition('down', nx, ny);
    } else if (room.doors.left && px < ox + margin) {
      const nx = this.curX - 1, ny = this.curY;
      if (getRoom(this.dungeon, nx, ny)) this.startCorridorTransition('left', nx, ny);
    } else if (room.doors.right && px > ox + ROOM_W - margin) {
      const nx = this.curX + 1, ny = this.curY;
      if (getRoom(this.dungeon, nx, ny)) this.startCorridorTransition('right', nx, ny);
    }
  }

  private startCorridorTransition(dir: string, nx: number, ny: number): void {
    this.corridorDir = dir;
    this.corridorTarget = { x: nx, y: ny };
    this.generateCorridor(dir);
  }

  private generateCorridor(dir: string): void {
    const ox = this.curX * ROOM_W;
    const oy = this.curY * ROOM_H;

    let startX = 0, startY = 0, stepX = 0, stepY = 0;
    let doorCenterX = 0, doorCenterY = 0;

    if (dir === 'right') {
      doorCenterX = ox + ROOM_W;
      doorCenterY = oy + HALF_ROWS * TILE;
      startX = doorCenterX;
      startY = doorCenterY - TILE;
      stepX = TILE; stepY = 0;
    } else if (dir === 'left') {
      doorCenterX = ox;
      doorCenterY = oy + HALF_ROWS * TILE;
      startX = doorCenterX - TILE;
      startY = doorCenterY - TILE;
      stepX = -TILE; stepY = 0;
    } else if (dir === 'up') {
      doorCenterX = ox + HALF_COLS * TILE;
      doorCenterY = oy;
      startX = doorCenterX - TILE;
      startY = doorCenterY - TILE;
      stepX = 0; stepY = -TILE;
    } else if (dir === 'down') {
      doorCenterX = ox + HALF_COLS * TILE;
      doorCenterY = oy + ROOM_H;
      startX = doorCenterX - TILE;
      startY = doorCenterY;
      stepX = 0; stepY = TILE;
    }

    for (let t = 0; t < CORRIDOR_TILES; t++) {
      const cx = startX + t * stepX + (stepY === 0 ? 16 : 0);
      const cy = startY + t * stepY + (stepX === 0 ? 16 : 0);

      if (dir === 'right' || dir === 'left') {
        this.groundLayer.add(this.add.image(cx, cy, 'ground').setDepth(-1));
        this.groundLayer.add(this.add.image(cx, cy + TILE, 'ground').setDepth(-1));
        this.walls.create(cx, cy - TILE, 'wall');
        this.walls.create(cx, cy + TILE * 2, 'wall');
      } else {
        this.groundLayer.add(this.add.image(cx, cy, 'ground').setDepth(-1));
        this.groundLayer.add(this.add.image(cx + TILE, cy, 'ground').setDepth(-1));
        this.walls.create(cx - TILE, cy, 'wall');
        this.walls.create(cx + TILE * 2, cy, 'wall');
      }
    }

    let bx = ox, by = oy, bw = ROOM_W, bh = ROOM_H;
    if (dir === 'right') { bw += CORRIDOR_LEN; }
    else if (dir === 'left') { bx -= CORRIDOR_LEN; bw += CORRIDOR_LEN; }
    else if (dir === 'up') { by -= CORRIDOR_LEN; bh += CORRIDOR_LEN; }
    else if (dir === 'down') { bh += CORRIDOR_LEN; }

    this.physics.world.setBounds(bx, by, bw, bh);
    this.cameras.main.setBounds(bx, by, bw, bh);
  }

  private checkCorridorEnd(): void {
    if (!this.corridorDir || !this.corridorTarget) return;
    const ox = this.curX * ROOM_W;
    const oy = this.curY * ROOM_H;
    const px = this.player.x;
    const py = this.player.y;
    const threshold = TILE;

    let reached = false;
    if (this.corridorDir === 'right' && px >= ox + ROOM_W + CORRIDOR_LEN - threshold) reached = true;
    else if (this.corridorDir === 'left' && px <= ox - CORRIDOR_LEN + threshold) reached = true;
    else if (this.corridorDir === 'down' && py >= oy + ROOM_H + CORRIDOR_LEN - threshold) reached = true;
    else if (this.corridorDir === 'up' && py <= oy - CORRIDOR_LEN + threshold) reached = true;

    if (reached) {
      const entryMap: Record<string, string> = { right: 'left', left: 'right', down: 'up', up: 'down' };
      this.enterRoom(this.corridorTarget.x, this.corridorTarget.y, entryMap[this.corridorDir]);
    }
  }

  private checkChestPickup(): void {
    if (!this.chestSprite) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.chestSprite.x, this.chestSprite.y);
    if (dist < 40) {
      const drop = rollDrop('哥布林', this.dungeon.level) || rollDrop('骷髅', this.dungeon.level);
      if (drop) {
        if (!this.character.equipments[drop.slot]) {
          this.character = equipItem(this.character, drop);
          this.showEquipmentFloatingText(drop, true);
        } else {
          this.character.inventory.push(drop);
          this.showEquipmentFloatingText(drop, false);
        }
      } else {
        this.showFloatingText('宝箱是空的...');
      }
      this.chestSprite.destroy();
      this.chestSprite = null;
    }
  }

  private checkExit(): void {
    if (!this.exitSprite) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitSprite.x, this.exitSprite.y);
    if (dist < 50) {
      this.isTransitioning = true;
      this.showFloatingText(`进入第 ${this.dungeon.level + 1} 层...`);
      this.time.delayedCall(800, () => {
        this.clearRoom();
        this.dungeon = generateDungeon(this.dungeon.level + 1);
        this.enterRoom(this.dungeon.startX, this.dungeon.startY);
        this.isTransitioning = false;
      });
    }
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    const text = this.add.text(x, y, `${damage}`, {
      font: isCrit ? 'bold 16px monospace' : '12px monospace',
      color: isCrit ? '#ffff00' : '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: y - 30, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }

  private showEquipmentFloatingText(eq: Equipment, autoEquipped: boolean): void {
    const rarityColor: Record<string, string> = {
      common: '#aaaaaa', uncommon: '#00cc66', rare: '#4488ff', epic: '#aa44ff', legendary: '#ff8800',
    };
    const color = rarityColor[eq.rarity] || '#ffffff';
    const prefix = autoEquipped ? '装备' : '掉落';
    const msg = `${prefix} [${eq.name}]`;
    const text = this.add.text(this.player.x, this.player.y - 50, msg, {
      font: 'bold 14px monospace', color,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: text, y: this.player.y - 90, alpha: 0, duration: 1500, onComplete: () => text.destroy() });
  }

  private showFloatingText(msg: string): void {
    const text = this.add.text(this.player.x, this.player.y - 50, msg, {
      font: 'bold 14px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: text, y: this.player.y - 90, alpha: 0, duration: 1500, onComplete: () => text.destroy() });
  }

  private updateHUD(): void {
    const hudScene = this.scene.get('HUDScene') as HUDScene;
    if (!hudScene.inventory) return;
    hudScene.inventory.setCharacter(this.character);
    const stats = this.getEffectiveStats();
    hudScene.updateStats(this.character.currentHp, stats.hp, this.character.currentMp, stats.mp);
    hudScene.updateLevel(this.character.level, this.character.exp, 50 + this.character.level * 30);
  }

  private updateFog(): void {
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const fw = this.fogCanvas.width;
    const fh = this.fogCanvas.height;

    const ctx = this.fogCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, fw, fh);

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, fw, fh);

    const cx = this.player.x - cam.scrollX;
    const cy = this.player.y - cam.scrollY;
    const r = this.LIGHT_RADIUS;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, fw, fh);
    ctx.globalCompositeOperation = 'source-over';

    this.fogTexture.refresh();
  }
}
