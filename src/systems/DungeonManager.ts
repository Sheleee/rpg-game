export const ROOM_W = 800;
export const ROOM_H = 600;

export type RoomContent = 'empty' | 'enemies' | 'chest' | 'guarded_chest';

export interface RoomData {
  gridX: number;
  gridY: number;
  type: 'start' | 'normal' | 'exit';
  content: RoomContent;
  cleared: boolean;
  explored: boolean;
  enemyCount: number;
  doors: { up: boolean; down: boolean; left: boolean; right: boolean };
}

export interface Dungeon {
  level: number;
  grid: (RoomData | null)[][];
  gridSize: number;
  startX: number;
  startY: number;
  exitX: number;
  exitY: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function floodFill(grid: (RoomData | null)[][], startX: number, startY: number): Set<string> {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited.add(`${startX},${startY}`);
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length && grid[ny][nx] && !visited.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return visited;
}

function hasEmptyNeighbor(grid: (RoomData | null)[][], x: number, y: number, gridSize: number): boolean {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] === null) return true;
  }
  return false;
}

function neighborCount(grid: (RoomData | null)[][], x: number, y: number, gridSize: number): number {
  let count = 0;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] !== null) count++;
  }
  return count;
}

export function generateDungeon(level: number): Dungeon {
  const gridSize = Math.min(3 + Math.floor(level / 2), 7);
  const grid: (RoomData | null)[][] = [];

  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = null;
    }
  }

  const startX = 0;
  const startY = Math.floor(gridSize / 2);

  grid[startY][startX] = {
    gridX: startX, gridY: startY, type: 'normal', content: 'empty',
    cleared: true, explored: false, enemyCount: 0,
    doors: { up: false, down: false, left: false, right: false },
  };

  // --- 不规则房间位置：有机扩张算法 ---
  const targetRoomCount = Math.min(
    Math.floor(gridSize * gridSize * (0.4 + Math.random() * 0.35)),
    gridSize * gridSize
  );
  const placed: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const frontier: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const maxIter = 500;

  for (let iter = 0; iter < maxIter && placed.length < targetRoomCount; iter++) {
    if (frontier.length === 0) break;

    const idx = Math.floor(Math.random() * frontier.length);
    const cell = frontier[idx];
    frontier.splice(idx, 1);

    if (neighborCount(grid, cell.x, cell.y, gridSize) >= 3) continue;

    const shuffled = shuffle(dirs);
    let expanded = false;

    for (const [dx, dy] of shuffled) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      if (grid[ny][nx] !== null) continue;

      if (Math.random() < 0.65) {
        grid[ny][nx] = {
          gridX: nx, gridY: ny, type: 'normal', content: 'empty',
          cleared: true, explored: false, enemyCount: 0,
          doors: { up: false, down: false, left: false, right: false },
        };
        placed.push({ x: nx, y: ny });
        frontier.push({ x: nx, y: ny });
        expanded = true;
      }
      break;
    }

    if (!expanded && hasEmptyNeighbor(grid, cell.x, cell.y, gridSize)) {
      frontier.push(cell);
    }
  }

  const reachable = floodFill(grid, startX, startY);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] && !reachable.has(`${x},${y}`)) {
        grid[y][x] = null;
      }
    }
  }

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const r = grid[y][x];
      if (!r) continue;
      r.doors = {
        up: y > 0 && grid[y - 1][x] !== null,
        down: y < gridSize - 1 && grid[y + 1][x] !== null,
        left: x > 0 && grid[y][x - 1] !== null,
        right: x < gridSize - 1 && grid[y][x + 1] !== null,
      };
    }
  }

  grid[startY][startX]!.type = 'start';
  grid[startY][startX]!.explored = true;

  const reachableRooms: { x: number; y: number }[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] && !(x === startX && y === startY)) {
        reachableRooms.push({ x, y });
      }
    }
  }

  if (reachableRooms.length === 0) {
    return { level, grid, gridSize, startX, startY, exitX: startX, exitY: startY };
  }

  // --- 随机出口数量 ---
  const maxAdditional = Math.min(Math.floor(level / 2) + 1, 3);
  let numExits = 1;
  for (let i = 0; i < maxAdditional && i < reachableRooms.length - 1; i++) {
    if (Math.random() < 0.5) numExits++;
  }
  numExits = Math.min(numExits, 4, reachableRooms.length);

  const sorted = [...reachableRooms].sort((a, b) =>
    dist(startX, startY, b.x, b.y) - dist(startX, startY, a.x, a.y)
  );

  for (let i = 0; i < numExits; i++) {
    grid[sorted[i].y][sorted[i].x]!.type = 'exit';
  }

  const exitX = sorted[0]?.x ?? startX;
  const exitY = sorted[0]?.y ?? startY;

  const contentRooms = reachableRooms.filter(
    ({ x, y }) => grid[y][x]?.type !== 'exit'
  );
  const shuffled = shuffle(contentRooms);
  const enemyBase = 1 + Math.floor(level / 2);
  for (const coord of shuffled) {
    const r = grid[coord.y][coord.x]!;
    const roll = Math.random();
    if (roll < 0.3) {
      r.content = 'empty';
    } else if (roll < 0.65) {
      r.content = 'enemies';
      r.cleared = false;
      r.enemyCount = enemyBase + Math.floor(Math.random() * 3);
    } else if (roll < 0.8) {
      r.content = 'chest';
    } else {
      r.content = 'guarded_chest';
      r.cleared = false;
      r.enemyCount = enemyBase + Math.floor(Math.random() * 2);
    }
  }

  return { level, grid, gridSize, startX, startY, exitX, exitY };
}

export function getRoom(dungeon: Dungeon, x: number, y: number): RoomData | null {
  if (y < 0 || y >= dungeon.grid.length) return null;
  if (x < 0 || x >= dungeon.grid[y].length) return null;
  return dungeon.grid[y][x];
}

export function getAdjacentRooms(dungeon: Dungeon, x: number, y: number): { dir: string; room: RoomData | null }[] {
  return [
    { dir: 'up', room: getRoom(dungeon, x, y - 1) },
    { dir: 'down', room: getRoom(dungeon, x, y + 1) },
    { dir: 'left', room: getRoom(dungeon, x - 1, y) },
    { dir: 'right', room: getRoom(dungeon, x + 1, y) },
  ];
}

export function roomCenterX(x: number): number {
  return x * ROOM_W + ROOM_W / 2;
}

export function roomCenterY(y: number): number {
  return y * ROOM_H + ROOM_H / 2;
}
