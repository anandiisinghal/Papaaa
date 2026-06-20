/**
 * balloons.js — Renders 4 clickable balloons that pop to reveal words
 */

function buildBalloons() {
  const row = document.getElementById('balloonsRow');
  row.innerHTML = '';

  CONFIG.BALLOON_WORDS.forEach((word, i) => {
    const color = CONFIG.BALLOON_COLORS[i] || '#FF6B6B';

    const wrapper = document.createElement('div');
    wrapper.className = 'balloon-wrapper';
    wrapper.style.animationDelay = `${i * 0.18}s`;

    wrapper.innerHTML = `
      <div class="balloon-outer" id="balloon-${i}" onclick="popBalloon(${i})" style="--bcolor:${color}">
        <div class="balloon-body">
          <div class="balloon-shine"></div>
          <span class="balloon-emoji">🎈</span>
        </div>
        <div class="balloon-string"></div>
      </div>
      <div class="balloon-word" id="word-${i}" style="color:${color}">
        ${word}
      </div>
    `;

    row.appendChild(wrapper);
  });
}

function popBalloon(i) {
  const balloon = document.getElementById(`balloon-${i}`);
  const wordEl  = document.getElementById(`word-${i}`);

  if (!balloon || balloon.classList.contains('popped')) return;

  // Pop burst animation
  balloon.classList.add('popped');
  playPop();

  // Confetti burst
  spawnConfetti(balloon);

  // Show word
  setTimeout(() => {
    wordEl.classList.add('visible');
  }, 300);
}

function spawnConfetti(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;

  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.left = `${cx}px`;
    dot.style.top  = `${cy}px`;
    const angle = Math.random() * 360;
    const dist  = 40 + Math.random() * 70;
    const dx = Math.cos(angle * Math.PI / 180) * dist;
    const dy = Math.sin(angle * Math.PI / 180) * dist;
    dot.style.setProperty('--dx', `${dx}px`);
    dot.style.setProperty('--dy', `${dy}px`);
    dot.style.background = CONFIG.BALLOON_COLORS[Math.floor(Math.random() * CONFIG.BALLOON_COLORS.length)];
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 900);
  }
}
