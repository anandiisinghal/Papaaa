/**
 * app.js — Entry point: keyboard input, popup logic, background decoration
 */

// ── Sound Effects (Web Audio API — no files needed!) ──────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playMove() {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

function playWall() {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function playWin() {
  const ctx = getAudio();
  const notes = [523, 659, 784, 1047]; // C E G C — victory chord
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
    gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.13);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.4);
    osc.start(ctx.currentTime + i * 0.13);
    osc.stop(ctx.currentTime + i * 0.13 + 0.4);
  });
}

function playPop() {
  const ctx = getAudio();
  // Noise burst for balloon pop
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + 0.15);

  // Pitch sweep after pop
  const osc = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc.connect(g2);
  g2.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
  g2.gain.setValueAtTime(0.2, ctx.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
function playMonsterSpawn() {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}
// ── Keyboard controls ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); movePlayer(0, -1); break;
    case 'ArrowDown':  case 's': case 'S': e.preventDefault(); movePlayer(0,  1); break;
    case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); movePlayer(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': e.preventDefault(); movePlayer(1,  0); break;
  }
});

// ── Touch / swipe controls (mobile) ──────────────────────────
let touchStart = null;
document.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) return;   // too small
  if (absDx > absDy) {
    movePlayer(dx > 0 ? 1 : -1, 0);
  } else {
    movePlayer(0, dy > 0 ? 1 : -1);
  }
  touchStart = null;
}, { passive: true });

// ── Popup ─────────────────────────────────────────────────────
function showPopup() {
  // Populate quotes
  const container = document.getElementById('quotesContainer');
  container.innerHTML = '';
  CONFIG.QUOTES.forEach((q, i) => {
    const p = document.createElement('p');
    p.className = 'quote-line';
    p.textContent = q;
    p.style.animationDelay = `${0.2 + i * 0.3}s`;
    container.appendChild(p);
  });

  // Populate balloons
  buildBalloons();

  document.getElementById('overlay').classList.add('active');
  document.getElementById('popup').classList.add('active');
}

function closePopup() {
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('popup').classList.remove('active');
}

// Click overlay to close
document.getElementById('overlay').addEventListener('click', closePopup);

// ── Floating background elements ──────────────────────────────
const BG_SYMBOLS = ['⭐','💫','✨','🌟','❤️','🦸','💪','🛡️','⚡','🔥','🎈','🎉'];

function buildBackground() {
  const container = document.getElementById('bgElements');
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('span');
    el.textContent = BG_SYMBOLS[Math.floor(Math.random() * BG_SYMBOLS.length)];
    el.className   = 'bg-icon';
    el.style.left  = `${Math.random() * 100}%`;
    el.style.top   = `${Math.random() * 100}%`;
    el.style.fontSize = `${14 + Math.random() * 22}px`;
    el.style.animationDuration  = `${5 + Math.random() * 10}s`;
    el.style.animationDelay     = `${Math.random() * 8}s`;
    el.style.opacity = 0.12 + Math.random() * 0.18;
    container.appendChild(el);
  }
}

// ── Boot ──────────────────────────────────────────────────────
buildBackground();
initMaze();
