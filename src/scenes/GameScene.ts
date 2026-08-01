import Phaser from 'phaser';
import {
  Character, createCharacter, getCharacterStats, gainExp, equipItem,
  addGold, applyJobChange,
} from '../core/Character';
import { Stats, addStats } from '../core/Stats';
import { loadGame, saveGame } from '../core/SaveSystem';
import {
  generateDungeon, getRoom, Dungeon, RoomData,
  ROOM_W, ROOM_H, roomCenterX, roomCenterY,
} from '../systems/DungeonManager';
import { createEnemy, rollDrop, isBossName } from '../core/Enemy';
import { zoneForLevel, ZoneConfig, isFinalBossLevel, ZONES } from '../core/Regions';
import { QuestManager, questReward, getQuestTitle } from '../core/Quests';
import { generateShopStock, buyItem, ShopItem } from '../core/Shop';
import { HUDScene } from './HUDScene';
import { InputSystem } from '../systems/InputSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { AttackButton } from '../ui/AttackButton';
import { LevelUpReward } from '../ui/LevelUpChoice';
import { DialoguePanel } from '../ui/DialoguePanel';
import { QuestLogPanel } from '../ui/QuestLogPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { JobChangePanel } from '../ui/JobChangePanel';
import { Equipment } from '../core/Equipment';
import { DIALOGS, NpcType, NPCS, npcPrompt } from '../data/dialogs';
import { AudioManager } from '../systems/AudioManager';

const TILE = 32;
const COLS = ROOM_W / TILE;
const ROWS = ROOM_H / TILE;
const HALF_COLS = Math.floor(COLS / 2);
const HALF_ROWS = Math.floor(ROWS / 2);
const CORRIDOR_TILES = 4;
const CORRIDOR_LEN = CORRIDOR_TILES * TILE;

interface RoomEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  data: { name: string; level: number; currentHp: number; maxHp: number; attackDamage: number; defense: number; expReward: number; goldReward: number; isBoss: boolean };
}

interface RoomNpc {
  sprite: Phaser.GameObjects.Sprite;
  type: NpcType;
}

export interface GameSceneData {
  classType?: 'warrior' | 'mage' | 'thief';
  /** 读档继续 */
  load?: boolean;
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
  private roomNpcs: RoomNpc[] = [];
  private chestSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private exitSprite: Phaser.GameObjects.Sprite | null = null;
  private doorArrows: Phaser.GameObjects.Text[] = [];
  private npcPromptText: Phaser.GameObjects.Text | null = null;
  private nearbyNpc: RoomNpc | null = null;

  private bossHpBg: Phaser.GameObjects.Graphics | null = null;
  private bossHpFill: Phaser.GameObjects.Graphics | null = null;
  private bossHpText: Phaser.GameObjects.Text | null = null;

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

  /** 当前地下城层数 */
  private dungeonLevel = 1;

  /** 物理碰撞器（进房时销毁重建，防泄漏） */
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  /** 房间附属文本（随房间清理） */
  private roomTexts: Phaser.GameObjects.Text[] = [];

  // ---- 新系统状态 ----
  private questManager!: QuestManager;
  private dialogue!: DialoguePanel;
  private questLog!: QuestLogPanel;
  private shopPanel!: ShopPanel;
  private jobChange!: JobChangePanel;
  private zone!: ZoneConfig;
  private shopStock: ShopItem[] = [];
  private audioUnlocked = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: GameSceneData): void {
    // 初始化角色 / 存档
    if (data?.load) {
      const save = loadGame();
      if (save) {
        this.character = save.character;
        this.questManager = new QuestManager(save.questStates);
        this.dungeonLevel = save.dungeonLevel;
        // 区域以存档 zoneId 为准（与层数推导不一致时优先 zoneId）
        this.zone = ZONES.find(z => z.id === save.zoneId) ?? zoneForLevel(save.dungeonLevel);
      } else {
        this.newGame(data);
      }
    } else {
      this.newGame(data);
    }

    // zone 兜底：若上面未赋值（newGame 分支），由层数推导
    if (!this.zone) this.zone = zoneForLevel(this.dungeonLevel);
    this.bonusStats = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0 };
    this.corridorDir = null;
    this.corridorTarget = null;
    this.nearbyNpc = null;

    this.walls = this.physics.add.staticGroup();
    this.groundLayer = this.add.group();

    this.player = this.physics.add.sprite(0, 0, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, ROOM_W, ROOM_H);

    this.inputSystem = new InputSystem(this);

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

    // UI 面板
    this.dialogue = new DialoguePanel(this);
    this.questLog = new QuestLogPanel(this);
    this.shopPanel = new ShopPanel(this);
    this.jobChange = new JobChangePanel(this);

    this.dialogue.onOption = (opt) => this.handleDialogOption(opt);
    this.shopPanel.onBuy = (item) => this.handleBuy(item);

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
        // 优先关闭各面板
        if (this.shopPanel.isVisible) { this.shopPanel.hide(); return; }
        if (this.questLog.isVisible) { this.questLog.hide(); return; }
        if (this.jobChange.isVisible) { this.jobChange.hide(); return; }
        if (this.dialogue.isVisible) { this.dialogue.hide(); return; }
        if (hud.inventory.isVisible) {
          hud.inventory.hide();
          return;
        }
        this.autoSave();
        this.showFloatingText('游戏已保存！');
      });
      this.input.keyboard.on('keydown-I', () => {
        if (this.dialogue.isVisible || this.shopPanel.isVisible || this.jobChange.isVisible) return;
        const hud = this.scene.get('HUDScene') as HUDScene;
        hud.inventory.setCharacter(this.character);
        hud.inventory.toggle();
        AudioManager.playSfx('ui');
      });
      this.input.keyboard.on('keydown-J', () => {
        if (this.dialogue.isVisible || this.shopPanel.isVisible || this.jobChange.isVisible) return;
        this.questLog.toggle(this.questManager);
        AudioManager.playSfx('ui');
      });
      this.input.keyboard.on('keydown-E', () => this.tryInteract());
      this.input.keyboard.on('keydown-M', () => {
        const next = !AudioManager.isMuted();
        AudioManager.setMuted(next);
        this.showFloatingText(next ? '静音 ON' : '静音 OFF');
      });
    }

    // 首次交互解锁音频
    this.input.once('pointerdown', () => this.unlockAudio());
    this.input.keyboard?.once('keydown', () => this.unlockAudio());

    // 恢复区域 BGM
    AudioManager.startBgm(this.zone.bgmTempo, this.zone.bgmRoot);

    this.dungeon = generateDungeon(this.dungeonLevel, this.zone);
    this.enterRoom(this.dungeon.startX, this.dungeon.startY);
  }

  private newGame(data?: GameSceneData): void {
    const cls = (data?.classType as 'warrior' | 'mage' | 'thief') || 'warrior';
    this.character = createCharacter('勇者', cls);
    this.questManager = new QuestManager();
    this.dungeonLevel = 1;
  }

  private unlockAudio(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    AudioManager.unlock();
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
    this.checkNearbyNpc();
    this.updateFog();
    (this.scene.get('HUDScene') as HUDScene).updateMiniMap(this.dungeon, this.curX, this.curY, this.player.x, this.player.y);
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // 面板打开时禁止移动（防带面板走出房间）
    if (this.dialogue.isVisible || this.shopPanel.isVisible || this.jobChange.isVisible || this.questLog.isVisible) {
      body.setVelocity(0);
      return;
    }
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
    if (this.isTransitioning) return;
    if (this.dialogue.isVisible || this.shopPanel.isVisible || this.jobChange.isVisible || this.questLog.isVisible) return;
    for (const re of this.roomEnemies) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, re.sprite.x, re.sprite.y);
      const range = re.data.isBoss ? 85 : 55;
      if (dist < range && re.data.currentHp > 0) {
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
        AudioManager.playSfx('attack');

        this.showDamageNumber(re.sprite.x, re.sprite.y - 20, dmg, isCrit);
        if (re.data.isBoss) this.updateBossHp();
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

  /** 注册碰撞器并纳入管理（进房时统一销毁） */
  private addCollider(
    a: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    b: Phaser.Types.Physics.Arcade.ArcadeColliderType,
  ): void {
    this.colliders.push(this.physics.add.collider(a, b));
  }

  /** 创建房间附属文本（随房间清理） */
  private addRoomText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, style);
    this.roomTexts.push(t);
    return t;
  }

  private onEnemyKilled(re: RoomEnemy): void {
    // 掉落装备
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

    // 金币掉落
    if (re.data.goldReward > 0) {
      this.character = addGold(this.character, re.data.goldReward);
      this.showFloatingText(`+${re.data.goldReward} 金币`);
      AudioManager.playSfx('gold');
    }

    // 经验（敌人）
    const { character, leveledUp } = gainExp(this.character, re.data.expReward);
    this.character = character;

    // 任务进度（击杀 / BOSS）——任务奖励经验可能再次升级
    const completed = this.questManager.recordKill(re.data.name, re.data.isBoss);
    const questLeveled = this.settleQuests(completed);

    // 统一处理升级奖励（只弹一次 UI）
    if (leveledUp || questLeveled) {
      this.showLevelUpUI();
    }
    this.updateHUD();

    // BOSS 击败
    if (re.data.isBoss) {
      this.hideBossHp();
      this.showFloatingText(`✦ 击败 BOSS: ${re.data.name}！`);
      AudioManager.playSfx('boss');
      const room = getRoom(this.dungeon, this.curX, this.curY);
      if (room) {
        room.cleared = true;
        // 出口传送门由 renderRoom 依据房间状态重建（离开再进入也能推进）
        this.exitSprite = this.add.sprite(this.curX * ROOM_W + ROOM_W / 2, this.curY * ROOM_H + ROOM_H / 2, 'exit');
        this.addRoomText(this.curX * ROOM_W + ROOM_W / 2, this.curY * ROOM_H + ROOM_H / 2 - 30, '▼ 前往下一区域', {
          font: 'bold 16px monospace', color: '#44ffff',
        }).setOrigin(0.5).setDepth(50);
      }
    } else {
      AudioManager.playSfx('hit');
    }

    re.sprite.destroy();
    this.roomEnemies = this.roomEnemies.filter(e => e !== re);
    const room = getRoom(this.dungeon, this.curX, this.curY);
    if (room && room.content !== 'boss' && room.enemyCount > 0 && this.roomEnemies.length === 0) {
      room.cleared = true;
      this.showFloatingText('房间已清除！');
    }
  }

  /** 弹出升级奖励选择（若等级已提升） */
  private showLevelUpUI(): void {
    AudioManager.playSfx('levelup');
    this.isTransitioning = true;
    const hud = this.scene.get('HUDScene') as HUDScene;
    hud.levelUpUI.show(this.character.level, (reward) => {
      this.applyLevelUpReward(reward);
      this.isTransitioning = false;
      this.updateHUD();
      this.checkJobChange();
    });
  }

  /** 结算完成任务奖励（经验/金币），返回是否因此升级 */
  private settleQuests(completedIds: string[]): boolean {
    let leveledUp = false;
    for (const id of completedIds) {
      const reward = questReward(id);
      this.character = addGold(this.character, reward.gold);
      const { character, leveledUp: didLevel } = gainExp(this.character, reward.exp);
      this.character = character;
      if (didLevel) leveledUp = true;
      this.showFloatingText(`任务完成: ${getQuestTitle(id)} (+${reward.exp}经验 +${reward.gold}金币)`);
      AudioManager.playSfx('quest');
    }
    return leveledUp;
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

  /** 转职检查：达到等级且未转职时弹出转职面板 */
  private checkJobChange(): void {
    if (this.character.jobName) return;
    if (this.character.level < 10) return;
    if (this.jobChange.isVisible || this.dialogue.isVisible) return;
    this.time.delayedCall(400, () => {
      if (this.character.level >= 10 && !this.character.jobName && !this.dialogue.isVisible && !this.jobChange.isVisible) {
        this.jobChange.show(this.character, (jobName) => {
          this.character = applyJobChange(this.character, jobName);
          AudioManager.playSfx('levelup');
          this.showFloatingText(`✦ 转职成功: ${jobName}！`);
          this.updateHUD();
        });
      }
    });
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
          AudioManager.playSfx('hit');
          this.player.setTint(0xff0000);
          this.time.delayedCall(200, () => this.player.clearTint());
          if (this.character.currentHp <= 0) {
            AudioManager.playSfx('death');
            this.showFloatingText('阵亡！');
            this.time.delayedCall(1000, () => this.scene.restart({ load: true }));
          }
        }
      }
    }
  }

  // ---- NPC 交互 ----

  private checkNearbyNpc(): void {
    let nearest: RoomNpc | null = null;
    let bestDist = 70;
    for (const npc of this.roomNpcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = npc;
      }
    }
    this.nearbyNpc = nearest;
    if (nearest) {
      if (!this.npcPromptText) {
        this.npcPromptText = this.add.text(nearest.sprite.x, nearest.sprite.y - 46, '', {
          font: 'bold 12px monospace', color: '#ffff88',
        }).setOrigin(0.5).setDepth(80);
      }
      this.npcPromptText.setPosition(nearest.sprite.x, nearest.sprite.y - 46);
      this.npcPromptText.setText(npcPrompt(NPCS[nearest.type]));
      this.npcPromptText.setVisible(true);
    } else if (this.npcPromptText) {
      this.npcPromptText.setVisible(false);
    }
  }

  private tryInteract(): void {
    if (this.isTransitioning) return;
    if (this.dialogue.isVisible) return;
    if (!this.nearbyNpc) return;
    this.dialogue.show(DIALOGS[this.nearbyNpc.type]);
    AudioManager.playSfx('dialogue');
    if (this.nearbyNpc.type === 'merchant') AudioManager.playSfx('shop');
  }

  private handleDialogOption(opt: { label: string; action?: string; data?: string }): void {
    switch (opt.action) {
      case 'accept_quest': {
        const id = opt.data;
        if (!id) break;
        if (this.questManager.canAccept(id, this.character.level)) {
          this.questManager.accept(id, this.character.level);
          this.showFloatingText(`已接受任务: ${getQuestTitle(id)}`);
          AudioManager.playSfx('quest');
        } else if (this.questManager.isActive(id)) {
          this.showFloatingText('该任务进行中');
        } else if (this.questManager.isCompleted(id)) {
          this.showFloatingText('该任务已完成');
        } else {
          this.showFloatingText('前置任务未完成，无法接取');
        }
        break;
      }
      case 'open_shop': {
        this.shopStock = generateShopStock(this.dungeonLevel);
        this.shopPanel.show(this.shopStock, this.character);
        AudioManager.playSfx('shop');
        break;
      }
      case 'job_change':
        this.checkJobChange();
        break;
      case 'complete':
      default:
        break;
    }
  }

  private handleBuy(item: ShopItem): boolean {
    const result = buyItem(this.character, item);
    if (result) {
      this.character = result;
      // 刷新面板（传入最新角色引用，金币实时更新）
      this.shopPanel.refresh(this.character);
      this.showFloatingText(`购买成功: [${item.equipment.name}]`);
      AudioManager.playSfx('buy');
      this.updateHUD();
      return true;
    }
    this.showFloatingText('金币不足！');
    AudioManager.playSfx('ui');
    return false;
  }

  // ---- 房间与层 ----

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

    this.addCollider(this.player, this.walls);

    // 区域氛围（地板色调）
    if (this.zone.id !== 'village') {
      const tintImg = this.add.rectangle(ox + ROOM_W / 2, oy + ROOM_H / 2, ROOM_W, ROOM_H, this.zone.tint, 0.06)
        .setDepth(-0.5).setOrigin(0.5);
      this.groundLayer.add(tintImg);
    }

    if ((room.content === 'enemies' || room.content === 'guarded_chest') && !room.cleared) {
      this.spawnRoomEnemies(room, ox, oy);
    }

    if (room.content === 'boss' && !room.cleared) {
      this.spawnBoss(room, ox, oy);
    }

    if ((room.content === 'chest' && !room.chestOpened) || (room.content === 'guarded_chest' && room.cleared && !room.chestOpened)) {
      this.chestSprite = this.physics.add.sprite(ox + ROOM_W / 2, oy + ROOM_H / 2 + 60, 'chest');
      this.chestSprite.setImmovable(true);
      this.addCollider(this.player, this.chestSprite);
    }

    if (room.type === 'exit') {
      this.exitSprite = this.add.sprite(ox + ROOM_W / 2, oy + ROOM_H / 2, 'exit');
      this.addRoomText(ox + ROOM_W / 2, oy + ROOM_H / 2 - 30, '▼ 前往下一层', {
        font: 'bold 14px monospace', color: '#44ffff',
      }).setOrigin(0.5).setDepth(50);
    }

    // BOSS 房：击败后出口由房间状态驱动（离开再进入依然可推进）
    if (room.type === 'boss' && room.cleared && !this.exitSprite) {
      this.exitSprite = this.add.sprite(ox + ROOM_W / 2, oy + ROOM_H / 2, 'exit');
      this.addRoomText(ox + ROOM_W / 2, oy + ROOM_H / 2 - 30, '▼ 前往下一区域', {
        font: 'bold 16px monospace', color: '#44ffff',
      }).setOrigin(0.5).setDepth(50);
    }

    // NPC（start 房间）
    for (const npcType of room.npcs) {
      this.spawnNpc(npcType, ox, oy);
    }

    this.createDoorArrows(room, ox, oy);
  }

  private spawnNpc(npcType: NpcType, ox: number, oy: number): void {
    const isMerchant = npcType === 'merchant';
    const idx = this.roomNpcs.length;
    const x = ox + ROOM_W / 2 + (idx === 0 ? -140 : 140);
    const y = oy + ROOM_H / 2 + 90;
    const sprite = this.add.sprite(x, y, isMerchant ? 'merchant' : 'npc').setDepth(2);
    // 用 tint 区分不同 NPC
    const tints: Partial<Record<NpcType, number>> = {
      village_chief: 0xffffff, hunter: 0x88cc66, trader: 0xddbb66, sage: 0x99ccff,
    };
    if (!isMerchant && tints[npcType]) sprite.setTint(tints[npcType]!);
    this.roomNpcs.push({ sprite, type: npcType });

    // NPC 名字
    this.addRoomText(x, y - 34, NPCS[npcType].name, {
      font: 'bold 11px monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);
  }

  private spawnRoomEnemies(room: RoomData, ox: number, oy: number): void {
    for (let i = 0; i < room.enemyCount; i++) {
      const x = ox + 60 + Math.random() * (ROOM_W - 120);
      const y = oy + 60 + Math.random() * (ROOM_H - 120);
      const sprite = this.physics.add.sprite(x, y, 'enemy');
      sprite.setCollideWorldBounds(true);
      const pool = this.zone.enemyPool;
      const enemyName = pool[Math.floor(Math.random() * pool.length)];
      this.roomEnemies.push({ sprite, data: createEnemy(enemyName, this.dungeonLevel) });
      this.addCollider(sprite, this.walls);
    }
  }

  private spawnBoss(room: RoomData, ox: number, oy: number): void {
    const x = ox + ROOM_W / 2;
    const y = oy + ROOM_H / 2 + 20;
    const sprite = this.physics.add.sprite(x, y, 'boss');
    sprite.setCollideWorldBounds(true);
    sprite.setScale(1.8);
    this.roomEnemies.push({ sprite, data: createEnemy(this.zone.bossName, this.dungeonLevel) });
    this.addCollider(sprite, this.walls);

    // BOSS 血条（屏幕顶部）
    const gw = Number(this.game.config.width);
    this.bossHpBg = this.add.graphics().setDepth(210).setScrollFactor(0);
    this.bossHpFill = this.add.graphics().setDepth(211).setScrollFactor(0);
    this.bossHpText = this.add.text(gw / 2, 8, this.zone.bossName, {
      font: 'bold 14px monospace', color: '#ff6666',
    }).setOrigin(0.5, 0).setDepth(212).setScrollFactor(0);
    this.updateBossHp();
  }

  private updateBossHp(): void {
    const boss = this.roomEnemies.find(e => e.data.isBoss && e.data.currentHp > 0);
    if (!boss) return;
    const gw = Number(this.game.config.width);
    const bw = 300, bx = (gw - bw) / 2, by = 28, bh = 10;
    const pct = Math.max(0, boss.data.currentHp / boss.data.maxHp);

    this.bossHpBg?.clear();
    this.bossHpBg?.fillStyle(0x111111, 0.9);
    this.bossHpBg?.fillRect(bx, by, bw, bh);
    this.bossHpBg?.lineStyle(1, 0x884444, 1);
    this.bossHpBg?.strokeRect(bx, by, bw, bh);

    this.bossHpFill?.clear();
    this.bossHpFill?.fillStyle(0xcc2222, 1);
    this.bossHpFill?.fillRect(bx + 1, by + 1, Math.round((bw - 2) * pct), bh - 2);

    this.bossHpText?.setText(`${boss.data.name}  ${boss.data.currentHp}/${boss.data.maxHp}`);
  }

  private hideBossHp(): void {
    this.bossHpBg?.destroy();
    this.bossHpFill?.destroy();
    this.bossHpText?.destroy();
    this.bossHpBg = null;
    this.bossHpFill = null;
    this.bossHpText = null;
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
    this.roomNpcs.forEach(n => n.sprite.destroy());
    this.roomNpcs = [];
    if (this.chestSprite) { this.chestSprite.destroy(); this.chestSprite = null; }
    if (this.exitSprite) { this.exitSprite.destroy(); this.exitSprite = null; }
    this.hideBossHp();
    this.walls.clear(true, true);
    this.groundLayer.clear(true, true);
    this.doorArrows.forEach(t => t.destroy());
    this.doorArrows = [];
    this.roomTexts.forEach(t => t.destroy());
    this.roomTexts = [];
    // 销毁本房间注册的碰撞器，防止跨房间累积
    this.colliders.forEach(c => c.destroy());
    this.colliders = [];
    if (this.npcPromptText) { this.npcPromptText.destroy(); this.npcPromptText = null; }
    this.nearbyNpc = null;
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
      const drop = rollDrop(this.zone.enemyPool[0], this.dungeonLevel) || rollDrop('骷髅', this.dungeonLevel);
      if (drop) {
        if (!this.character.equipments[drop.slot]) {
          this.character = equipItem(this.character, drop);
          this.showEquipmentFloatingText(drop, true);
        } else {
          this.character.inventory.push(drop);
          this.showEquipmentFloatingText(drop, false);
        }
      } else {
        const gold = 10 + Math.floor(Math.random() * 20);
        this.character = addGold(this.character, gold);
        this.showFloatingText(`宝箱: +${gold} 金币`);
        AudioManager.playSfx('pickup');
      }
      this.chestSprite.destroy();
      this.chestSprite = null;
      // 标记已开启，防止进出房间无限刷新
      const room = getRoom(this.dungeon, this.curX, this.curY);
      if (room) room.chestOpened = true;
    }
  }

  private checkExit(): void {
    if (!this.exitSprite) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitSprite.x, this.exitSprite.y);
    if (dist < 50) {
      this.advanceLevel();
    }
  }

  /** 进入下一层（区域切换 / BOSS 层判定 / 通关结局） */
  private advanceLevel(): void {
    this.isTransitioning = true;

    // 最终 BOSS（冰霜巨龙）已被击败 → 通关结局
    if (isFinalBossLevel(this.dungeonLevel)) {
      this.showVictory();
      return;
    }

    const nextLevel = this.dungeonLevel + 1;
    const nextZone = zoneForLevel(nextLevel);
    const zoneChanged = nextZone.id !== this.zone.id;

    if (zoneChanged) {
      this.showFloatingText(`✦ 进入新区域: ${nextZone.name}！`);
    } else {
      this.showFloatingText(`进入第 ${nextLevel} 层...`);
    }

    this.time.delayedCall(800, () => {
      // 任务：到达区域（传送完成后结算，避免升级 UI 与层切换并发）
      const completed = this.questManager.recordReachZone(nextZone.id);
      const leveled = this.settleQuests(completed);

      this.dungeonLevel = nextLevel;
      this.zone = nextZone;
      AudioManager.startBgm(this.zone.bgmTempo, this.zone.bgmRoot);
      this.clearRoom();
      this.dungeon = generateDungeon(this.dungeonLevel, this.zone);
      this.enterRoom(this.dungeon.startX, this.dungeon.startY);
      this.autoSave();
      // 升级面板在 enterRoom 的相机 pan 完成后弹出，避免 isTransitioning 被 pan 回调覆盖
      if (leveled) {
        this.time.delayedCall(300, () => this.showLevelUpUI());
      }
    });
  }

  /** 通关结算画面 */
  private showVictory(): void {
    AudioManager.stopBgm();
    AudioManager.playSfx('levelup');
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9).setDepth(600).setScrollFactor(0);
    this.add.text(400, 200, '🏆 通关！', {
      font: 'bold 44px monospace', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(601).setScrollFactor(0);
    this.add.text(400, 270, '你击败了冰霜巨龙，成为大陆的英雄！', {
      font: '18px monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(601).setScrollFactor(0);
    const job = this.character.jobName ? ` · ${this.character.jobName}` : '';
    this.add.text(400, 310, `最终等级 Lv.${this.character.level} · ${this.character.classType}${job} · ${this.character.gold} 金币`, {
      font: '15px monospace', color: '#88ccff',
    }).setOrigin(0.5).setDepth(601).setScrollFactor(0);
    this.add.text(400, 380, '3 秒后返回标题画面...', {
      font: '13px monospace', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(601).setScrollFactor(0);
    this.time.delayedCall(3000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('ClassSelectScene');
    });
  }

  /** 自动 / 手动存档 */
  private autoSave(): void {
    saveGame({
      character: this.character,
      questStates: this.questManager.serialize(),
      dungeonLevel: this.dungeonLevel,
      zoneId: this.zone.id,
      completedEvents: [],
      playTime: 0,
    });
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
    hudScene.updateGold(this.character.gold);
    hudScene.updateZone(this.zone.name, this.dungeonLevel, this.character.jobName);
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
