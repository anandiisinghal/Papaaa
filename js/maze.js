/**
 * maze.js — Maze generation (recursive backtracker), rendering, and player movement
 */

const CELL = 40;          // cell size in px
const COLS = 15;          // maze columns  (medium difficulty)
const ROWS = 13;          // maze rows
const WALL = 3;           // wall thickness

let canvas, ctx;
let grid = [];
let playerPos = { x: 0, y: 0 };
let dadImage = null;
let dadLoaded = false;
let animFrame = 0;
let animTick = 0;
let mazeComplete = false;

// ── Monster ───────────────────────────────────────────────────
let monster = { x: 0, y: 0 };   // starts top-right corner
let monsterActive = false;
let monsterTimer = null;
let monsterMoveInterval = null;
const MONSTER_SPAWN_DELAY = 6000;       // appears after 6 seconds
const MONSTER_SPEED = 300;              // ms per step (lower = faster)

// ── Direction vectors ─────────────────────────────────────────
const DIR = {
  N: { dx:  0, dy: -1, bit: 1, opp: 'S' },
  S: { dx:  0, dy:  1, bit: 2, opp: 'N' },
  E: { dx:  1, dy:  0, bit: 4, opp: 'W' },
  W: { dx: -1, dy:  0, bit: 8, opp: 'E' },
};

// Each cell stores which walls are OPEN (bit flags)
function initGrid() {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = { open: 0, visited: false };
    }
  }
}

function carve(x, y) {
  grid[y][x].visited = true;
  const dirs = shuffle(['N','S','E','W']);
  for (const d of dirs) {
    const { dx, dy, bit, opp } = DIR[d];
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !grid[ny][nx].visited) {
      grid[y][x].open |= bit;
      grid[ny][nx].open |= DIR[opp].bit;
      carve(nx, ny);
    }
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateMaze() {
  initGrid();
  carve(0, 0);
}

// ── Drawing ───────────────────────────────────────────────────
function drawMaze() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background inside maze
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw cells
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawCell(x, y);
    }
  }

  // Goal cell highlight
  const gx = (COLS - 1) * CELL;
  const gy = (ROWS - 1) * CELL;
  const pulse = 0.6 + 0.4 * Math.sin(animTick * 0.08);
  ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.35})`;
  ctx.fillRect(gx + WALL, gy + WALL, CELL - WALL * 2, CELL - WALL * 2);

  // Goal trophy
  ctx.font = `${CELL * 0.6}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆', gx + CELL / 2, gy + CELL / 2);
// Draw monster
  if (monsterActive) drawMonster();
  // Draw player (dad)
  drawPlayer();
}

function drawCell(x, y) {
  const px = x * CELL;
  const py = y * CELL;
  const cell = grid[y][x];

  // Path colour: subtle gradient feel via alternating tint
  const isEven = (x + y) % 2 === 0;
  ctx.fillStyle = isEven ? '#1f0d3a' : '#190830';
  ctx.fillRect(px, py, CELL, CELL);

  ctx.fillStyle = '#4a2080';   // wall colour

  // North wall
  if (!(cell.open & DIR.N.bit)) {
    ctx.fillRect(px, py, CELL, WALL);
  }
  // South wall
  if (!(cell.open & DIR.S.bit)) {
    ctx.fillRect(px, py + CELL - WALL, CELL, WALL);
  }
  // East wall
  if (!(cell.open & DIR.E.bit)) {
    ctx.fillRect(px + CELL - WALL, py, WALL, CELL);
  }
  // West wall
  if (!(cell.open & DIR.W.bit)) {
    ctx.fillRect(px, py, WALL, CELL);
  }

  // Outer border
  ctx.fillStyle = '#6a30c0';
  if (x === 0)        ctx.fillRect(0, py, WALL, CELL);
  if (x === COLS - 1) ctx.fillRect(canvas.width - WALL, py, WALL, CELL);
  if (y === 0)        ctx.fillRect(px, 0, CELL, WALL);
  if (y === ROWS - 1) ctx.fillRect(px, canvas.height - WALL, CELL, WALL);
}

function drawPlayer() {
  const px = playerPos.x * CELL + CELL / 2;
  const py = playerPos.y * CELL + CELL / 2;
  const r  = CELL * 0.42;

  // Bobbing animation
  const bob = Math.sin(animTick * 0.12) * 2.5;

  if (dadLoaded) {
    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py + bob, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(dadImage, px - r, py - r + bob, r * 2, r * 2);
    ctx.restore();

    // Glowing ring (pulses)
    const pulse = 0.7 + 0.3 * Math.sin(animTick * 0.1);
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12 + 10 * pulse;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(px, py + bob, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Spinning star halo around the icon ✨
    ctx.save();
    const starCount = 5;
    for (let s = 0; s < starCount; s++) {
        const angle = (animTick * 0.04) + (s / starCount) * Math.PI * 2;
        const sx = px + Math.cos(angle) * (r + 8);
        const sy = py + bob + Math.sin(angle) * (r + 8);
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(animTick * 0.1 + s);
        ctx.fillText('⭐', sx, sy);
    }
    ctx.restore();

  } else {
    // Fallback emoji avatar
    ctx.save();
    ctx.font = `${CELL * 0.75}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillText('🦸‍♂️', px, py + bob);
    ctx.restore();
  }
}
// ── Monster drawing ───────────────────────────────────────────
function drawMonster() {
  const mx = monster.x * CELL + CELL / 2;
  const my = monster.y * CELL + CELL / 2;
  const r  = CELL * 0.38;
  const t  = animTick;

  const bounce = Math.abs(Math.sin(t * 0.18)) * 3;
  const by = my - bounce;

  // ── Track facing direction from movement (no other state needed) ──
  if (typeof drawMonster.lastX === 'undefined') {
    drawMonster.lastX = monster.x;
    drawMonster.facing = 1; // 1 = facing right, -1 = facing left
  }
  if (monster.x > drawMonster.lastX) drawMonster.facing = 1;
  else if (monster.x < drawMonster.lastX) drawMonster.facing = -1;
  drawMonster.lastX = monster.x;

  ctx.save();

  // ── Mirror around the monster's own center (flip look only) ──
  ctx.translate(mx, by);
  ctx.scale(drawMonster.facing, 1);
  ctx.translate(-mx, -by);

  // ── Soft glow ──
  const glow = ctx.createRadialGradient(mx, by, 1, mx, by, r * 2);
  glow.addColorStop(0, 'rgba(80,255,120,0.22)');
  glow.addColorStop(1, 'rgba(80,255,120,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mx, by, r * 2, 0, Math.PI * 2);
  ctx.fill();

  // ── Tail ──
  const tailWag = Math.sin(t * 0.18) * 6;
  ctx.fillStyle = '#3ddc68';
  ctx.beginPath();
  ctx.moveTo(mx - r * 0.3, by + r * 0.6);
  ctx.quadraticCurveTo(
    mx - r * 1.5, by + r * 0.9 + tailWag,
    mx - r * 1.8, by + r * 0.4 + tailWag
  );
  ctx.quadraticCurveTo(
    mx - r * 1.4, by + r * 0.2 + tailWag,
    mx - r * 0.5, by + r * 0.5
  );
  ctx.closePath();
  ctx.fill();

  // ── Body ──
  ctx.fillStyle = '#3ddc68';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = r * 0.26;
  ctx.beginPath();
  ctx.ellipse(mx, by + r * 0.2, r * 0.85, r * 1.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Tummy (lighter belly) ──
  ctx.fillStyle = '#b8f5c8';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.08, by + r * 0.45, r * 0.48, r * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Spots on back ──
  ctx.fillStyle = '#2ab856';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.45, by - r * 0.1, r * 0.13, r * 0.1, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.55, by + r * 0.3, r * 0.1, r * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Head ──
  ctx.fillStyle = '#3ddc68';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.25, by - r * 0.85, r * 0.68, r * 0.58, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // ── Snout ──
  ctx.fillStyle = '#5ae888';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.78, by - r * 0.72, r * 0.32, r * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Nostrils ──
  ctx.fillStyle = '#2ab856';
  ctx.beginPath();
  ctx.arc(mx + r * 0.88, by - r * 0.78, r * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + r * 0.72, by - r * 0.76, r * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // ── Big cute eye (white) ──
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.38, by - r * 1.02, r * 0.26, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Iris ──
  ctx.fillStyle = '#1a6b3a';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.4, by - r * 1.0, r * 0.16, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Pupil ──
  ctx.fillStyle = '#0a1a0f';
  ctx.beginPath();
  ctx.arc(mx + r * 0.41, by - r * 1.0, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // ── Eye shine ──
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(mx + r * 0.47, by - r * 1.06, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // ── Eyelash (cute!) ──
  ctx.strokeStyle = '#1a4a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx + r * 0.22, by - r * 1.25);
  ctx.lineTo(mx + r * 0.18, by - r * 1.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx + r * 0.36, by - r * 1.28);
  ctx.lineTo(mx + r * 0.35, by - r * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx + r * 0.5, by - r * 1.24);
  ctx.lineTo(mx + r * 0.52, by - r * 1.37);
  ctx.stroke();

  // ── Tiny blush cheeks ──
  ctx.fillStyle = 'rgba(255,150,150,0.35)';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.62, by - r * 0.88, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Smile ──
  ctx.strokeStyle = '#1a5c2a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(mx + r * 0.62, by - r * 0.64);
  ctx.quadraticCurveTo(mx + r * 0.78, by - r * 0.55, mx + r * 0.94, by - r * 0.62);
  ctx.stroke();

  // ── Tiny arms ──
  ctx.fillStyle = '#3ddc68';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.7, by + r * 0.05, r * 0.18, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx - r * 0.1, by + r * 0.1, r * 0.16, r * 0.11, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Little feet ──
  ctx.fillStyle = '#2ab856';
  ctx.beginPath();
  ctx.ellipse(mx + r * 0.3, by + r * 1.12, r * 0.28, r * 0.15, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(mx - r * 0.2, by + r * 1.12, r * 0.28, r * 0.15, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // ── Back spikes ──
  ctx.fillStyle = '#27c75a';
  const spikes = [
    { x: mx + r * 0.05, y: by - r * 1.1,  h: r * 0.28 },
    { x: mx - r * 0.18, y: by - r * 0.85, h: r * 0.22 },
    { x: mx - r * 0.35, y: by - r * 0.55, h: r * 0.18 },
    { x: mx - r * 0.42, y: by - r * 0.22, h: r * 0.14 },
  ];
  spikes.forEach(({ x, y, h }) => {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + r * 0.1, y);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

// ── Monster AI (BFS shortest path through maze) ───────────────
function monsterStep() {
  if (!monsterActive || mazeComplete) return;

  const path = bfsPath(monster, playerPos);
  if (path && path.length > 0) {
    monster = { ...path[0] };
  }

  // Caught the player?
  if (monster.x === playerPos.x && monster.y === playerPos.y) {
    caughtByMonster();
  }
}

function bfsPath(from, to) {
  const queue   = [{ x: from.x, y: from.y, path: [] }];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  visited[from.y][from.x] = true;

  while (queue.length) {
    const { x, y, path } = queue.shift();
    if (x === to.x && y === to.y) return path;

    for (const [d, dx, dy] of [['N',0,-1],['S',0,1],['E',1,0],['W',-1,0]]) {
      const bit = { N:1, S:2, E:4, W:8 }[d];
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS &&
          !visited[ny][nx] && (grid[y][x].open & bit)) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return null;
}

function caughtByMonster() {
  monsterActive = false;
  clearInterval(monsterMoveInterval);
  playWall();           // reuse wall-hit sound or add a custom one
  showCaughtScreen();
}

function showCaughtScreen() {
  const overlay = document.getElementById('caughtOverlay');
  overlay.classList.add('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    resetMaze();
  }, 2200);
}

// ── Player movement ───────────────────────────────────────────
function movePlayer(dx, dy) {
  if (mazeComplete) return;
  const { x, y } = playerPos;
  const nx = x + dx, ny = y + dy;

  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;

  // Check if wall blocks movement
  let canMove = false;
  if (dx === 1  && (grid[y][x].open & DIR.E.bit)) canMove = true;
  if (dx === -1 && (grid[y][x].open & DIR.W.bit)) canMove = true;
  if (dy === 1  && (grid[y][x].open & DIR.S.bit)) canMove = true;
  if (dy === -1 && (grid[y][x].open & DIR.N.bit)) canMove = true;

  if (canMove) {
    playerPos = { x: nx, y: ny };
    playMove();
    checkWin();
  } else {
    playWall();
  }
}

function checkWin() {
  if (playerPos.x === COLS - 1 && playerPos.y === ROWS - 1) {
    mazeComplete = true;
    playWin();
    setTimeout(showPopup, 600);
  }
}

// ── Animation loop ────────────────────────────────────────────
function gameLoop() {
  animTick++;
  drawMaze();
  requestAnimationFrame(gameLoop);
}

// ── Init ──────────────────────────────────────────────────────
function initMaze() {
  canvas = document.getElementById('mazeCanvas');
  ctx    = canvas.getContext('2d');
  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;

  generateMaze();

  // Load dad photo
  dadImage = new Image();
  dadImage.onload  = () => { dadLoaded = true; };
  dadImage.onerror = () => { dadLoaded = false; };
  dadImage.src = CONFIG.DAD_PHOTO;

  gameLoop();
  // Start monster timer on first load
  monsterTimer = setTimeout(() => {
    monsterActive = true;
    playMonsterSpawn();
    monsterMoveInterval = setInterval(monsterStep, MONSTER_SPEED);
  }, MONSTER_SPAWN_DELAY);
}

function resetMaze() {
  mazeComplete  = false;
  playerPos     = { x: 0, y: 0 };
  monster       = { x: 0, y: 0 };
  monsterActive = false;
  generateMaze();
  closePopup();
  clearTimeout(monsterTimer);
  clearInterval(monsterMoveInterval);

  // Spawn monster after delay
  monsterTimer = setTimeout(() => {
    monsterActive = true;
    playMonsterSpawn();
    monsterMoveInterval = setInterval(monsterStep, MONSTER_SPEED);
  }, MONSTER_SPAWN_DELAY);
}
