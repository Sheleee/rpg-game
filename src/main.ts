import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';

window.addEventListener('error', (e) => {
  document.body.innerHTML += `<pre style="color:red;background:#000;padding:10px;font-size:14px;position:fixed;top:0;left:0;z-index:99999;max-height:100vh;overflow:auto;white-space:pre-wrap;word-break:break-all">${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n${(e.error as Error)?.stack || ''}</pre>`;
});

window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += `<pre style="color:red;background:#000;padding:10px;font-size:14px;position:fixed;top:200px;left:0;z-index:99999">${e.reason?.stack || e.reason}</pre>`;
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  pixelArt: true,
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, ClassSelectScene, GameScene, HUDScene],
};

const game = new Phaser.Game(config);

export default game;
