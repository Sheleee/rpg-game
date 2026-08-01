# 像素 RPG / Pixel RPG

> 一款俯视角、实时动作的像素风 Web RPG 游戏。
> A top-down, real-time action pixel-style RPG built for the browser.

## 简介 / Introduction

**中文**：玩家操控单个角色，在包含多区域的世界地图中探索、战斗、完成任务，通过装备与升级不断变强。支持职业选择、转职路线、随机词条装备、地下城与 BOSS 战。

**English**: Control a single hero to explore a multi-zone world map, fight monsters, complete quests, and grow stronger through gear and leveling. Features class selection, class advancement, randomly-rolled equipment, dungeons and boss fights.

---

## 功能特性 / Features

- 🎮 **实时动作战斗** — 移动、攻击、碰撞判定与伤害计算 / Real-time action combat with movement, attacking and damage calculation
- 🗡️ **职业系统** — 战士 / 法师 / 盗贼 三大基础职业，各两条转职路线共 6 个终职 / 3 base classes (Warrior / Mage / Rogue), each with 2 advancement paths (6 final classes)
- 🛡️ **装备系统** — 武器 / 头盔 / 铠甲 / 饰品 槽位，随机词条（1–3 条），品质分级 普通 → 传说 / Weapon, Helm, Armor, Accessory slots with 1–3 random affixes; rarity from Common to Legendary
- 🗺️ **多区域地图** — 新手村、草原、沙漠、雪山，含副本与最终 BOSS / Multiple zones (starter village, grassland, desert, snow mountain) with dungeons and a final boss
- 🏰 **地下城与 BOSS** — 独立怪物等级与掉落表 / Dungeons with their own monster levels and loot tables
- 🎒 **背包与装备面板** — 拾取、穿戴、属性实时计算 / Inventory and equipment panels with live stat calculation
- 📍 **小地图** — 区域内导航 / In-zone minimap
- 📈 **升级成长** — 升级时选择成长方向 / Level-up growth choices
- 📦 **存档系统** — 基于 `localStorage` 的自动 / 手动存档 / Auto & manual save via `localStorage`
- 📱 **移动端适配** — 虚拟摇杆 + 攻击按钮，支持触控 / Virtual joystick & attack button, touch-friendly

---

## 技术栈 / Tech Stack

| 项目 / Item | 选择 / Choice |
|---|---|
| 引擎 / Engine | [Phaser 3](https://phaser.io) |
| 语言 / Language | TypeScript |
| 构建 / Build | Vite |
| 测试 / Testing | Vitest |
| 运行环境 / Runtime | 浏览器（Web） |

---

## 快速开始 / Getting Started

```bash
# 安装依赖 / Install dependencies
npm install

# 启动开发服务器 / Start dev server
npm run dev

# 构建生产版本 / Build for production
npm run build

# 预览生产构建 / Preview production build
npm run preview
```

打开浏览器访问 Vite 输出的本地地址（默认 `http://localhost:5173`）即可开始游戏。

---

## 游戏内容 / Gameplay

### 职业 / Classes

| 基础职业 / Base Class | 定位 / Role | 转职 A / Path A | 转职 B / Path B |
|---|---|---|---|
| 战士 / Warrior | 近战坦克 / Melee tank | 圣骑士 / Paladin | 狂战士 / Berserker |
| 法师 / Mage | 远程输出 / Ranged damage | 元素师 / Elementalist | 召唤师 / Summoner |
| 盗贼 / Rogue | 敏捷刺客 / Agile assassin | 刺客 / Assassin | 游侠 / Ranger |

### 装备品质 / Equipment Quality

`普通 Common` → `优秀 Uncommon` → `稀有 Rare` → `史诗 Epic` → `传说 Legendary`

### 区域地图 / Zones

```
世界地图 World Map
├── 新手村 Starter Village（村庄、森林、洞穴副本）
├── 草原 Grassland（野外、废墟、商人营地）
├── 沙漠 Desert（绿洲、古代遗迹、沙漠神殿）
└── 雪山 Snow Mountain（雪山脚下、冰洞、龙巢 BOSS）
```

---

## 操作方式 / Controls

| 操作 / Action | 桌面端 / Desktop | 移动端 / Mobile |
|---|---|---|
| 移动 / Move | 方向键 或 WASD / Arrow keys or WASD | 虚拟摇杆 / Virtual joystick |
| 攻击 / Attack | 空格键 / Space | 攻击按钮 / Attack button |
| 背包 / Inventory | `I` | 界面按钮 / UI button |
| 菜单 / Menu | `ESC` | 界面按钮 / UI button |

---

## 项目结构 / Project Structure

```
├── src/
│   ├── core/          # 核心逻辑：角色、战斗、装备、存档 / core logic: character, combat, equipment, save
│   ├── scenes/        # Phaser 场景：Boot、职业选择、Game、HUD / Phaser scenes
│   ├── systems/       # 系统：战斗、敌人、地下城、输入 / systems: combat, enemy, dungeon, input
│   ├── ui/            # UI 组件：背包、小地图、摇杆、升级选择 / UI components
│   ├── graphics/      # 程序化像素精灵生成 / procedural pixel sprite generation
│   └── __tests__/     # Vitest 单元测试 / unit tests
├── public/            # 静态资源 / static assets
├── index.html
└── package.json
```

---

## 测试 / Testing

```bash
npm run test       # 监听模式 / watch mode
npm run test:run   # 单次运行 / run once
```

---

## 路线图 / Roadmap

### ✅ 已完成 / Completed

- [x] 角色移动与碰撞 / character movement & collision
- [x] 战斗系统（攻击、受伤、死亡）/ combat system
- [x] 敌人 AI / enemy AI
- [x] 装备系统（拾取、穿戴、属性）/ equipment system
- [x] UI 系统（HUD、背包）/ UI system (HUD, inventory)

### 🚧 未实现目标 / Upcoming Goals

> 以下功能**尚未实现**，是项目接下来的开发目标（按 `CONTEXT.md` 中的开发优先级排序）。
> The following features are **not yet implemented** and are the project's next development goals (ordered by priority from `CONTEXT.md`).

| 优先级 / Priority | 目标 / Goal | 说明 / Description |
|---|---|---|
| P1 | NPC 对话系统 / NPC dialogue | NPC 对话呈现剧情，支持对话选项影响剧情走向或获得不同奖励 / NPC dialogue boxes with branching options that affect the story or rewards |
| P1 | 任务系统 / quest system | 主线 + 支线任务：接取、追踪、完成与奖励 / Main & side quests: accept, track, complete and reward |
| P1 | 多区域地图切换 / multi-zone map switching | 传送点 / 边界触发切换区域，各区域独立怪物等级与掉落表 / Zone switching via portals or borders; per-zone monster levels and loot tables |
| P1 | 存档系统 / save system | localStorage 自动 / 手动存档：角色状态、装备、任务进度、地图解锁 / Auto & manual save via localStorage: character state, gear, quest progress, unlocked zones |
| P2 | 转职系统 / class advancement | 达到等级后触发转职任务，3 基础职业 → 6 终职 / Advancement quests at level thresholds, 3 base classes → 6 final classes |
| P2 | 商店系统 / shop system | 金币购买基础装备，不同区域提供不同商品 / Buy base gear with gold; shops vary by zone |
| P2 | BOSS 战 / boss fights | 洞穴副本、沙漠神殿、雪山龙巢等 BOSS 战 / Boss fights in caves, the desert temple, and the snow dragon's lair |
| P3 | 音频系统 / audio system | 各区域独立 BGM + 攻击 / 受伤 / 拾取 / UI / 对话 / 升级音效 / Per-zone BGM and SFX for attack, hit, pickup, UI, dialogue and level-up |

---

## 许可证 / License

MIT License — 详见 `LICENSE`（如有）。

*项目仍在积极开发中，功能与文档会持续更新。*
*This project is under active development; features and docs are updated continuously.*
