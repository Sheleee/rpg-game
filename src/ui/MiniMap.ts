import Phaser from 'phaser';
import { Dungeon } from '../systems/DungeonManager';

const SIZE = 180;
const HALF = SIZE / 2;
const RADIUS = 78;
const CELL = 20;
const GAP = 2;

const WOOD_COLORS = ['#6B3A1F', '#8B5A2B', '#A0522D', '#5C2E0A', '#CD853F'];

export class MiniMap {
  private scene: Phaser.Scene;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = scene.textures.addCanvas('mm_canvas', this.canvas)!;
    this.image = scene.add.image(0, 0, 'mm_canvas').setOrigin(0, 0).setDepth(300);
  }

  draw(dungeon: Dungeon, curX: number, curY: number, playerWorldX: number, playerWorldY: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADIUS, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const step = CELL + GAP;
    const ox = HALF - curX * step - step / 2;
    const oy = HALF - curY * step - step / 2;

    for (let gy = 0; gy < dungeon.grid.length; gy++) {
      for (let gx = 0; gx < dungeon.grid[gy].length; gx++) {
        const room = dungeon.grid[gy][gx];
        if (!room || !room.explored) continue;

        const rx = Math.round(ox + gx * step);
        const ry = Math.round(oy + gy * step);
        if (rx + CELL < -step || rx > SIZE + step || ry + CELL < -step || ry > SIZE + step) continue;

        let color = '#555555';
        if (room.type === 'start') color = '#44cc44';
        else if (room.type === 'exit') color = '#4488ff';
        else if (room.content === 'enemies' && !room.cleared) color = '#cc4444';
        else if (room.content === 'chest') color = '#ccaa44';
        else if (room.content === 'guarded_chest' && !room.cleared) color = '#cc6644';
        else if (room.cleared) color = '#666666';

        ctx.fillStyle = color;
        ctx.fillRect(rx, ry, CELL, CELL);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, CELL, CELL);

        if (room.content === 'chest' || room.content === 'guarded_chest') {
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(rx + CELL / 2 - 2, ry + CELL / 2 - 2, 4, 4);
        }

        if (room.type === 'exit') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx + CELL / 2 - 1, ry + 3, 2, CELL - 6);
        }
      }
    }

    const relX = (playerWorldX - (curX * 800 + 400)) / 800;
    const relY = (playerWorldY - (curY * 600 + 300)) / 600;
    const px = Math.round(HALF + relX * CELL);
    const py = Math.round(HALF + relY * CELL);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 3, py - 3, 7, 7);

    ctx.restore();

    this.drawBorder(ctx);

    this.texture.refresh();
  }

  private drawBorder(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(HALF, HALF, RADIUS, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5C2E0A';
    ctx.stroke();

    const numPixels = 36;
    const pixelSize = 5;
    for (let i = 0; i < numPixels; i++) {
      const a = (i / numPixels) * Math.PI * 2;
      const px = Math.round(HALF + (RADIUS - 3) * Math.cos(a));
      const py = Math.round(HALF + (RADIUS - 3) * Math.sin(a));
      ctx.fillStyle = WOOD_COLORS[i % WOOD_COLORS.length];
      ctx.fillRect(px - 2, py - 2, pixelSize, pixelSize);

      if (i % 2 === 0) {
        const ax = Math.round(HALF + (RADIUS + 1) * Math.cos(a));
        const ay = Math.round(HALF + (RADIUS + 1) * Math.sin(a));
        ctx.fillStyle = '#4A2208';
        ctx.fillRect(ax - 1, ay - 1, 3, 3);
      }
    }
  }
}
