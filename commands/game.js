const { generateWAMessageFromContent } = require("@innovatorssoft/baileys");
const crypto = require("crypto");

/**
 * Creates an interactive Snake Game (HTML, CSS, JS) payload
 * rendered via the WhatsApp GenAI Unified Response HTML primitive.
 *
 * @param {string} [userName='Player'] - Display name of the user
 * @returns {object} WhatsApp message payload
 */

function createSnakePage(userName = "Player") {
  const htmlPayload = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
:root {
  --neon-green: #10b981;
  --neon-cyan: #06b6d4;
  --neon-pink: #ec4899;
  --neon-yellow: #fbbf24;
  --bg-dark: #070a12;
  --card-bg: rgba(15, 23, 42, 0.85);
  --border-glow: rgba(16, 185, 129, 0.4);
}
html, body {
  width: 100%;
  margin: 0;
  padding: 0;
  background: var(--bg-dark);
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
}
body {
  padding: 8px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}
.game-container {
  width: 100%;
  max-width: 400px;
  background: radial-gradient(circle at 50% 0%, #064e3b 0%, #0b1522 55%, #030712 100%);
  border: 2px solid var(--border-glow);
  border-radius: 20px;
  padding: 12px;
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.25), inset 0 0 15px rgba(6, 182, 212, 0.15);
  position: relative;
  overflow: hidden;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
  z-index: 2;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--neon-green), var(--neon-cyan));
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 17px;
  box-shadow: 0 0 12px var(--neon-green);
}
.brand-title {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fff, var(--neon-green), var(--neon-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.player-pill {
  font-size: 11px;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 3px 9px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.player-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 6px #10b981;
  animation: blink 1.2s infinite;
}
@keyframes blink { 50% { opacity: 0.3; } }

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
}
.stat-box {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 5px 3px;
  text-align: center;
}
.stat-label {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}
.stat-val {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  margin-top: 1px;
}
.stat-box.highlight .stat-val { color: var(--neon-yellow); text-shadow: 0 0 6px var(--neon-yellow); }

/* Canvas Arena */
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 280px;
  background: #030712;
  border: 2px solid rgba(16, 185, 129, 0.35);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.9), 0 0 15px rgba(16, 185, 129, 0.15);
  margin-bottom: 10px;
}
#snakeCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Overlays */
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  z-index: 10;
}
.overlay.hidden { display: none !important; }
.overlay-title {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  margin-bottom: 4px;
  text-shadow: 0 0 12px var(--neon-green);
}
.overlay-title.gameover {
  color: #ef4444;
  text-shadow: 0 0 12px #ef4444;
}
.overlay-subtitle {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 12px;
}
.overlay-stats {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 14px;
  margin-bottom: 14px;
  font-size: 12px;
  width: 85%;
  display: flex;
  justify-content: space-between;
}
.btn-play {
  background: linear-gradient(135deg, var(--neon-green), var(--neon-cyan));
  color: #030712;
  border: none;
  font-weight: 900;
  font-size: 13px;
  padding: 10px 24px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
  touch-action: manipulation;
}
.btn-play:active {
  transform: scale(0.95);
  filter: brightness(1.2);
}

/* Speed / Difficulty Selector */
.difficulty-selector {
  display: flex;
  gap: 5px;
  margin-bottom: 12px;
}
.diff-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.diff-btn.active {
  background: rgba(16, 185, 129, 0.25);
  border-color: var(--neon-green);
  color: #fff;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

/* On-Screen D-Pad Controls */
.controls-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 2;
}
.dpad {
  display: grid;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: 5px;
  justify-content: center;
  align-items: center;
}
.dpad-btn {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95));
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #f8fafc;
  font-size: 17px;
  font-weight: 900;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.4);
  width: 44px;
  height: 44px;
  touch-action: manipulation;
}
.dpad-btn:active {
  transform: scale(0.92);
  background: linear-gradient(135deg, var(--neon-green), var(--neon-cyan));
  color: #030712;
  box-shadow: 0 0 12px var(--neon-green);
}
.dpad-up    { grid-column: 2; grid-row: 1; }
.dpad-left  { grid-column: 1; grid-row: 2; }
.dpad-pause { grid-column: 2; grid-row: 2; font-size: 12px; border-radius: 50%; width: 38px; height: 38px; margin: auto; }
.dpad-right { grid-column: 3; grid-row: 2; }
.dpad-down  { grid-column: 2; grid-row: 3; }

/* Footer */
.footer {
  text-align: center;
  font-size: 9px;
  color: #64748b;
  margin-top: 8px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 2;
}
</style>
</head>
<body>

<div class="game-container">
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">🐍</div>
      <div class="brand-title">CYBERSNAKE</div>
    </div>
    <div class="player-pill">
      <span class="player-dot"></span>
      <span>${userName}</span>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-bar">
    <div class="stat-box highlight">
      <div class="stat-label">Score</div>
      <div class="stat-val" id="scoreVal">0</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">High</div>
      <div class="stat-val" id="highVal">0</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Length</div>
      <div class="stat-val" id="lenVal">3</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Speed</div>
      <div class="stat-val" id="speedVal">1x</div>
    </div>
  </div>

  <!-- Arena -->
  <div class="canvas-wrapper">
    <canvas id="snakeCanvas"></canvas>

    <!-- Start Overlay -->
    <div class="overlay" id="startOverlay">
      <div class="overlay-title">🐍 CYBERSNAKE</div>
      <div class="overlay-subtitle">Collect energy nodes and beat the high score!</div>
      <div class="difficulty-selector">
        <button class="diff-btn" id="diffChill">Chill</button>
        <button class="diff-btn active" id="diffNormal">Normal</button>
        <button class="diff-btn" id="diffHyper">Hyper</button>
      </div>
      <button class="btn-play" id="btnStart">PLAY NOW</button>
    </div>

    <!-- Game Over Overlay -->
    <div class="overlay hidden" id="gameOverOverlay">
      <div class="overlay-title gameover">GAME OVER</div>
      <div class="overlay-subtitle" id="gameOverReason">Collision detected!</div>
      <div class="overlay-stats">
        <span>Final Score: <b id="finalScore" style="color: var(--neon-yellow);">0</b></span>
        <span>High Score: <b id="finalHigh" style="color: #34d399;">0</b></span>
      </div>
      <button class="btn-play" id="btnRetry">RETRY</button>
    </div>

    <!-- Pause Overlay -->
    <div class="overlay hidden" id="pauseOverlay">
      <div class="overlay-title">⏸️ PAUSED</div>
      <div class="overlay-subtitle">Game is paused</div>
      <button class="btn-play" id="btnResume">RESUME</button>
    </div>
  </div>

  <!-- D-Pad Controls -->
  <div class="controls-container">
    <div class="dpad">
      <button class="dpad-btn dpad-up" id="btnUp">▲</button>
      <button class="dpad-btn dpad-left" id="btnLeft">◀</button>
      <button class="dpad-btn dpad-pause" id="btnPause">⏸️</button>
      <button class="dpad-btn dpad-right" id="btnRight">▶</button>
      <button class="dpad-btn dpad-down" id="btnDown">▼</button>
    </div>
  </div>

  <div class="footer">
    ⚡ INNOVATORS BAILEYS · HTML5 CANVAS SNAKE
  </div>
</div>

<script>
(function() {
  var canvas = document.getElementById('snakeCanvas');
  var ctx = canvas.getContext('2d');

  var COLS = 20;
  var ROWS = 18;
  var cellW = 15;
  var cellH = 15;

  var snake = [];
  var direction = 'RIGHT';
  var nextDirection = 'RIGHT';
  var food = { x: 10, y: 9, type: 'normal' };
  var bonusFood = null;
  var bonusTimer = null;
  var particles = [];
  var popups = [];
  var score = 0;
  var high = 0;

  try {
    high = parseInt(localStorage.getItem('cybersnake_high') || '0', 10) || 0;
  } catch (e) {
    high = 0;
  }
  document.getElementById('highVal').textContent = high;

  var gameSpeed = 110; // ms per tick
  var isRunning = false;
  var isPaused = false;
  var lastTick = 0;
  var animFrameId = null;

  // Safe Draw Rounded Rect helper
  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.parentElement.clientWidth || 340;
    var h = rect.height || canvas.parentElement.clientHeight || 280;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cellW = w / COLS;
    cellH = h / ROWS;

    draw(w, h);
  }

  window.addEventListener('resize', resize);
  setTimeout(resize, 30);

  function setDifficulty(level, speed) {
    document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.getElementById('diff' + level.charAt(0).toUpperCase() + level.slice(1));
    if (btn) btn.classList.add('active');
    gameSpeed = speed;
    var speedLabels = { 'chill': '0.8x', 'normal': '1.0x', 'hyper': '1.4x' };
    document.getElementById('speedVal').textContent = speedLabels[level] || '1.0x';
  }

  document.getElementById('diffChill').onclick = function() { setDifficulty('chill', 145); };
  document.getElementById('diffNormal').onclick = function() { setDifficulty('normal', 110); };
  document.getElementById('diffHyper').onclick = function() { setDifficulty('hyper', 75); };

  function startGame() {
    document.getElementById('startOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');

    snake = [
      { x: 5, y: 9 },
      { x: 4, y: 9 },
      { x: 3, y: 9 }
    ];
    direction = 'RIGHT';
    nextDirection = 'RIGHT';
    score = 0;
    particles = [];
    popups = [];
    bonusFood = null;
    clearTimeout(bonusTimer);

    updateStats();
    spawnFood();
    scheduleBonus();

    isRunning = true;
    isPaused = false;
    lastTick = performance.now();

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    var pauseEl = document.getElementById('pauseOverlay');
    if (isPaused) {
      pauseEl.classList.remove('hidden');
    } else {
      pauseEl.classList.add('hidden');
      lastTick = performance.now();
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function gameOver(reason) {
    isRunning = false;
    clearTimeout(bonusTimer);

    if (score > high) {
      high = score;
      try {
        localStorage.setItem('cybersnake_high', high);
      } catch (e) {}
    }

    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalHigh').textContent = high;
    document.getElementById('gameOverReason').textContent = reason || 'Collision detected!';
    document.getElementById('gameOverOverlay').classList.remove('hidden');
  }

  function spawnFood() {
    var valid = false;
    var attempts = 0;
    while (!valid && attempts < 100) {
      attempts++;
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS)
      };
      valid = !snake.some(function(seg) { return seg.x === food.x && seg.y === food.y; });
    }
  }

  function scheduleBonus() {
    clearTimeout(bonusTimer);
    bonusTimer = setTimeout(function() {
      if (!isRunning || isPaused) return;
      var valid = false;
      var pos = { x: 0, y: 0 };
      var attempts = 0;
      while (!valid && attempts < 100) {
        attempts++;
        pos = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS)
        };
        valid = !snake.some(function(seg) { return seg.x === pos.x && seg.y === pos.y; }) &&
                (pos.x !== food.x || pos.y !== food.y);
      }
      bonusFood = { x: pos.x, y: pos.y, expires: performance.now() + 7000 };

      setTimeout(function() {
        bonusFood = null;
        scheduleBonus();
      }, 7000);
    }, Math.floor(Math.random() * 8000) + 6000);
  }

  function addParticles(x, y, color) {
    var px = (x + 0.5) * cellW;
    var py = (y + 0.5) * cellH;
    for (var i = 0; i < 12; i++) {
      particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        size: Math.random() * 3 + 2,
        life: 1,
        color: color
      });
    }
  }

  function addPopup(x, y, text, color) {
    popups.push({
      x: (x + 0.5) * cellW,
      y: (y + 0.5) * cellH,
      text: text,
      color: color,
      life: 1
    });
  }

  function gameLoop(now) {
    if (!isRunning || isPaused) return;

    if (now - lastTick >= gameSpeed) {
      lastTick = now;
      tick();
    }

    var rect = canvas.getBoundingClientRect();
    var w = rect.width || 340;
    var h = rect.height || 280;
    draw(w, h);

    if (isRunning && !isPaused) {
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function tick() {
    direction = nextDirection;
    var head = { x: snake[0].x, y: snake[0].y };

    if (direction === 'UP') head.y--;
    else if (direction === 'DOWN') head.y++;
    else if (direction === 'LEFT') head.x--;
    else if (direction === 'RIGHT') head.x++;

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOver('Crashed into the grid barrier!');
      return;
    }

    // Self collision
    if (snake.some(function(seg) { return seg.x === head.x && seg.y === head.y; })) {
      gameOver('Collided with your own tail!');
      return;
    }

    snake.unshift(head);

    // Eat Normal Food
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      addParticles(food.x, food.y, '#10b981');
      addPopup(food.x, food.y, '+10', '#10b981');
      spawnFood();
      updateStats();
    }
    // Eat Bonus Star
    else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
      score += 50;
      addParticles(bonusFood.x, bonusFood.y, '#fbbf24');
      addPopup(bonusFood.x, bonusFood.y, '⭐ +50', '#fbbf24');
      bonusFood = null;
      scheduleBonus();
      updateStats();
    }
    else {
      snake.pop();
    }
  }

  function updateStats() {
    document.getElementById('scoreVal').textContent = score;
    document.getElementById('lenVal').textContent = snake.length;
    if (score > high) {
      high = score;
      document.getElementById('highVal').textContent = high;
    }
  }

  function handleDirection(dir) {
    if (!isRunning) {
      startGame();
      return;
    }
    if (isPaused) {
      togglePause();
    }
    if (dir === 'UP' && direction !== 'DOWN') nextDirection = 'UP';
    else if (dir === 'DOWN' && direction !== 'UP') nextDirection = 'DOWN';
    else if (dir === 'LEFT' && direction !== 'RIGHT') nextDirection = 'LEFT';
    else if (dir === 'RIGHT' && direction !== 'LEFT') nextDirection = 'RIGHT';
  }

  // Bind Buttons
  document.getElementById('btnStart').onclick = startGame;
  document.getElementById('btnRetry').onclick = startGame;
  document.getElementById('btnResume').onclick = togglePause;
  document.getElementById('btnPause').onclick = togglePause;

  function bindDir(id, dir) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      handleDirection(dir);
    });
  }
  bindDir('btnUp', 'UP');
  bindDir('btnDown', 'DOWN');
  bindDir('btnLeft', 'LEFT');
  bindDir('btnRight', 'RIGHT');

  // Keyboard controls
  window.addEventListener('keydown', function(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') handleDirection('UP');
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') handleDirection('DOWN');
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') handleDirection('LEFT');
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') handleDirection('RIGHT');
    else if (e.code === 'Space' || e.code === 'KeyP') togglePause();
  });

  // Touch Swipe on Canvas
  var touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20) handleDirection('RIGHT');
        else if (dx < -20) handleDirection('LEFT');
      } else {
        if (dy > 20) handleDirection('DOWN');
        else if (dy < -20) handleDirection('UP');
      }
    }
  }, { passive: true });

  function draw(w, h) {
    ctx.clearRect(0, 0, w, h);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
    ctx.lineWidth = 1;
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, h);
      ctx.stroke();
    }
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(w, r * cellH);
      ctx.stroke();
    }

    // Normal Food
    if (food) {
      var fx = food.x * cellW + cellW / 2;
      var fy = food.y * cellH + cellH / 2;
      var rad = Math.min(cellW, cellH) * 0.38;

      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(fx, fy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fx - rad * 0.3, fy - rad * 0.3, rad * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bonus Star Food
    if (bonusFood) {
      var bx = (bonusFood.x + 0.5) * cellW;
      var by = (bonusFood.y + 0.5) * cellH;
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.font = Math.floor(Math.min(cellW, cellH) * 0.95) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', bx, by);
      ctx.restore();
    }

    // Snake
    snake.forEach(function(seg, idx) {
      var sx = seg.x * cellW;
      var sy = seg.y * cellH;
      var pad = 1.2;
      var sw = cellW - pad * 2;
      var sh = cellH - pad * 2;

      ctx.save();
      if (idx === 0) {
        // Head
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        drawRoundedRect(ctx, sx + pad, sy + pad, sw, sh, 5);

        // Eyes
        ctx.fillStyle = '#030712';
        var eyeSize = Math.max(1.5, Math.min(cellW, cellH) * 0.16);
        if (direction === 'RIGHT' || direction === 'LEFT') {
          var ex = direction === 'RIGHT' ? sx + cellW * 0.68 : sx + cellW * 0.25;
          ctx.beginPath();
          ctx.arc(ex, sy + cellH * 0.3, eyeSize, 0, Math.PI * 2);
          ctx.arc(ex, sy + cellH * 0.7, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          var ey = direction === 'DOWN' ? sy + cellH * 0.68 : sy + cellH * 0.25;
          ctx.beginPath();
          ctx.arc(sx + cellW * 0.3, ey, eyeSize, 0, Math.PI * 2);
          ctx.arc(sx + cellW * 0.7, ey, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Body
        var frac = 1 - (idx / snake.length) * 0.5;
        ctx.fillStyle = 'rgba(6, 182, 212, ' + Math.max(0.35, frac) + ')';
        drawRoundedRect(ctx, sx + pad, sy + pad, sw, sh, 3.5);
      }
      ctx.restore();
    });

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Popups
    for (var j = popups.length - 1; j >= 0; j--) {
      var pop = popups[j];
      pop.y -= 0.8;
      pop.life -= 0.025;
      if (pop.life <= 0) {
        popups.splice(j, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }

  // Draw initial preview
  snake = [
    { x: 5, y: 9 },
    { x: 4, y: 9 },
    { x: 3, y: 9 }
  ];
})();
</script>
</body>
</html>`;

  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: "GenAIUnifiedResponse",
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    __typename: "GenAIUnifiedResponseSection",
                    view_model: {
                      __typename: "GenAISingleLayoutViewModel",
                      primitive: {
                        __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                        trusted_sources: [],
                        payload: htmlPayload,
                      },
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}


async function snake(ctx) {
  try {
    const jid = ctx.chatJid;

    const userName = ctx.pushName || ctx.msg?.pushName || "Player";

    const content = createSnakePage(userName);

     const generated = generateWAMessageFromContent(jid, content, {
       userJid: ctx.sock.user?.id,
     });

     await ctx.sock.relayMessage(jid, generated.message, {
       messageId: generated.key.id,
     });
  } catch (error) {
    console.error("Snake error:", error);

    await ctx.reply(`❌ Snake error: ${error.message}`);
  }
}

function createLivePage(
  targetUrl = "https://tikdown.innovatorssoft.org/",
  title = "TikDown — TikTok Downloader",
) {
  const htmlPayload = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
:root {
  --primary: #06b6d4;
  --secondary: #8b5cf6;
  --accent: #ec4899;
  --bg-dark: #070a13;
  --card-bg: rgba(15, 23, 42, 0.85);
  --border-glow: rgba(6, 182, 212, 0.35);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
}
html, body {
  width: 100%;
  margin: 0;
  padding: 0;
  background: var(--bg-dark);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-x: hidden;
}
body {
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
}
.app-container {
  width: 100%;
  max-width: 420px;
  background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 55%, #030712 100%);
  border: 2px solid var(--border-glow);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 0 35px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.15);
  position: relative;
  overflow: hidden;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  box-shadow: 0 0 16px rgba(0, 242, 254, 0.5);
}
.brand-info h1 {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fff, #38bdf8, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-info p {
  font-size: 10px;
  color: var(--text-muted);
}
.live-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 4px 10px;
  border-radius: 999px;
}
.live-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 6px #10b981;
  animation: pulse 1.4s infinite;
}
@keyframes pulse { 50% { opacity: 0.3; } }

/* Hero Banner */
.hero {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(168, 85, 247, 0.15));
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  margin-bottom: 16px;
}
.hero h2 {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 4px;
}
.hero p {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Input Box */
.input-card {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 14px;
}
.input-label {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.url-input {
  width: 100%;
  background: #030712;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 12px;
  color: #fff;
  outline: none;
  transition: border-color 0.2s ease;
  user-select: auto;
  -webkit-user-select: auto;
}
.url-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
}
.btn-fetch {
  width: 100%;
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 800;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.15s ease;
  touch-action: manipulation;
}
.btn-fetch:active { transform: scale(0.97); }

/* Quick Action Chips */
.chips-row {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  overflow-x: auto;
}
.chip {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
}
.chip:active {
  background: rgba(6, 182, 212, 0.2);
  color: #fff;
}

/* Result Card */
.result-card {
  display: none;
  background: var(--card-bg);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 14px;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.result-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.result-thumb {
  width: 55px;
  height: 55px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1e1b4b, #3b82f6);
  display: grid;
  place-items: center;
  font-size: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.result-meta h4 {
  font-size: 13px;
  color: #fff;
  font-weight: 700;
  margin-bottom: 4px;
}
.result-meta p {
  font-size: 11px;
  color: var(--text-muted);
}
.download-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dl-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 11px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  touch-action: manipulation;
}
.dl-btn:active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.3));
  border-color: var(--primary);
}
.dl-tag {
  font-size: 10px;
  background: rgba(6, 182, 212, 0.2);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.feature-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px;
  text-align: center;
}
.feature-icon { font-size: 18px; margin-bottom: 4px; }
.feature-title { font-size: 11px; font-weight: 700; color: #fff; }
.feature-desc { font-size: 9px; color: var(--text-muted); margin-top: 2px; }

/* Direct Link CTA */
.cta-box {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
  border: 1px dashed rgba(56, 189, 248, 0.4);
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.4);
  margin-top: 8px;
  border: none;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease, filter 0.15s ease;
}
.cta-btn:active {
  transform: scale(0.97);
  filter: brightness(1.2);
}
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  margin-top: 8px;
  cursor: pointer;
  touch-action: manipulation;
}
.copy-btn:active {
  background: rgba(56, 189, 248, 0.2);
}

/* Footer */
.footer {
  text-align: center;
  font-size: 9px;
  color: #64748b;
  letter-spacing: 0.5px;
}
</style>
</head>
<body>

<div class="app-container">
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">🎬</div>
      <div class="brand-info">
        <h1>TIKDOWN</h1>
        <p>TikTok Video Downloader</p>
      </div>
    </div>
    <div class="live-badge">
      <span class="live-dot"></span>
      <span>ONLINE</span>
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <h2>Download TikTok Without Watermark</h2>
    <p>Fast, high-definition MP4 & MP3 audio extractor powered by TikDown Cloud.</p>
  </div>

  <!-- Input Form -->
  <div class="input-card">
    <div class="input-label">
      <span>TikTok Video Link</span>
      <span style="color: #a855f7; cursor: pointer;" id="btnPasteDemo">📋 Paste Demo</span>
    </div>
    <div class="input-group">
      <input type="text" id="videoUrl" class="url-input" placeholder="https://www.tiktok.com/@user/video/..." value="">
      <button class="btn-fetch" id="btnExtract">
        <span>⚡ Extract Video</span>
      </button>
    </div>
  </div>

  <!-- Quick Chips -->
  <div class="chips-row">
    <div class="chip" id="chipTrending">🔥 Trending Post</div>
    <div class="chip" id="chipMusic">🎵 Viral Sound</div>
    <div class="chip" id="chipHd">✨ 1080p HD Clip</div>
  </div>

  <!-- Result Preview Card -->
  <div class="result-card" id="resultCard">
    <div class="result-header">
      <div class="result-thumb">🎥</div>
      <div class="result-meta">
        <h4 id="videoTitle">TikTok Viral Video</h4>
        <p id="videoAuthor">@creator · 1080p HD Ready</p>
      </div>
    </div>
    <div class="download-options">
      <button class="dl-btn" id="dlNoWatermark">
        <span>📥 Download HD (No Watermark)</span>
        <span class="dl-tag">FAST MP4</span>
      </button>
      <button class="dl-btn" id="dlAudio">
        <span>🎵 Extract Audio Track</span>
        <span class="dl-tag">320K MP3</span>
      </button>
    </div>
  </div>

  <!-- Features Grid -->
  <div class="features-grid">
    <div class="feature-box">
      <div class="feature-icon">🚫</div>
      <div class="feature-title">No Watermark</div>
      <div class="feature-desc">Clean, original quality</div>
    </div>
    <div class="feature-box">
      <div class="feature-icon">⚡</div>
      <div class="feature-title">Ultra Fast</div>
      <div class="feature-desc">Direct high-speed stream</div>
    </div>
    <div class="feature-box">
      <div class="feature-icon">🎧</div>
      <div class="feature-title">Audio MP3</div>
      <div class="feature-desc">Extract sounds & music</div>
    </div>
    <div class="feature-box">
      <div class="feature-icon">🔒</div>
      <div class="feature-title">100% Free</div>
      <div class="feature-desc">No login or limit</div>
    </div>
  </div>

  <!-- Direct Web App Launcher -->
  <div class="cta-box">
    <div style="font-size: 13px; font-weight: 800; color: #fff;">Open Official Web Application</div>
    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Launch directly in your device browser:</div>
    <button class="cta-btn" id="btnLaunchApp">
      <span>🌐 Open TikDown (${targetUrl})</span>
    </button>
    <button class="copy-btn" id="btnCopyUrl">
      <span>📋 Copy URL to Clipboard</span>
    </button>
  </div>

  <div class="footer">
    ⚡ INNOVATORS BAILEYS · TIKDOWN LIVE GENAI WEB INTERFACE
  </div>
</div>

<script>
(function() {
  var target = "${targetUrl}";

  function launchUrl(url) {
    var dest = url || target;
    // 1. Direct location change (Triggers WebView external browser intent in WhatsApp)
    try {
      window.location.href = dest;
    } catch (e) {}

    // 2. Window.open fallbacks
    try { window.open(dest, '_top'); } catch (e) {}
    try { window.open(dest, '_system'); } catch (e) {}
    try { window.open(dest, '_blank'); } catch (e) {}

    // 3. Dynamic top-level anchor click
    try {
      var a = document.createElement('a');
      a.href = dest;
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { document.body.removeChild(a); }, 100);
    } catch (e) {}
  }

  function copyUrl(url) {
    var dest = url || target;
    var btn = document.getElementById('btnCopyUrl');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(dest).then(function() {
        if (btn) btn.innerHTML = '<span>✅ Copied to Clipboard!</span>';
        setTimeout(function() {
          if (btn) btn.innerHTML = '<span>📋 Copy URL to Clipboard</span>';
        }, 2000);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = dest;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (btn) btn.innerHTML = '<span>✅ Copied to Clipboard!</span>';
      setTimeout(function() {
        if (btn) btn.innerHTML = '<span>📋 Copy URL to Clipboard</span>';
      }, 2000);
    }
  }

  function pasteDemo() {
    document.getElementById('videoUrl').value = 'https://www.tiktok.com/@tiktok/video/7106594312292453678';
    extractVideo();
  }

  function setDemo(type) {
    if (type === 'trending') {
      document.getElementById('videoUrl').value = 'https://www.tiktok.com/@trending/video/7201948192839129381';
    } else if (type === 'music') {
      document.getElementById('videoUrl').value = 'https://www.tiktok.com/@music_hits/video/7192839128391283910';
    } else {
      document.getElementById('videoUrl').value = 'https://www.tiktok.com/@creative_hd/video/7281920391829102931';
    }
    extractVideo();
  }

  function extractVideo() {
    var input = document.getElementById('videoUrl').value.trim();
    var btn = document.getElementById('btnExtract');
    var resultCard = document.getElementById('resultCard');

    if (!input) {
      alert('Please enter or paste a valid TikTok link');
      return;
    }

    btn.innerHTML = '<span>⏳ Extracting Media...</span>';
    btn.style.opacity = '0.75';

    setTimeout(function() {
      btn.innerHTML = '<span>⚡ Extract Video</span>';
      btn.style.opacity = '1';
      resultCard.style.display = 'block';

      var match = input.match(/@([^/]+)/);
      var author = match ? '@' + match[1] : '@tiktok_creator';
      document.getElementById('videoAuthor').textContent = author + ' · 1080p HD Ready';
      document.getElementById('videoTitle').textContent = 'Extracted TikTok Clip #' + Math.floor(Math.random() * 8999 + 1000);
    }, 700);
  }

  // Event bindings
  var btnLaunch = document.getElementById('btnLaunchApp');
  if (btnLaunch) {
    btnLaunch.addEventListener('click', function(e) { e.preventDefault(); launchUrl(target); });
    btnLaunch.addEventListener('pointerdown', function(e) { e.preventDefault(); launchUrl(target); });
  }

  var btnCopy = document.getElementById('btnCopyUrl');
  if (btnCopy) {
    btnCopy.addEventListener('click', function(e) { e.preventDefault(); copyUrl(target); });
  }

  var btnExtractEl = document.getElementById('btnExtract');
  if (btnExtractEl) {
    btnExtractEl.addEventListener('click', extractVideo);
  }

  var btnPasteDemoEl = document.getElementById('btnPasteDemo');
  if (btnPasteDemoEl) {
    btnPasteDemoEl.addEventListener('click', pasteDemo);
  }

  var chipTrending = document.getElementById('chipTrending');
  if (chipTrending) {
    chipTrending.addEventListener('click', function() { setDemo('trending'); });
  }
  var chipMusic = document.getElementById('chipMusic');
  if (chipMusic) {
    chipMusic.addEventListener('click', function() { setDemo('music'); });
  }
  var chipHd = document.getElementById('chipHd');
  if (chipHd) {
    chipHd.addEventListener('click', function() { setDemo('hd'); });
  }

  var dlNoWatermark = document.getElementById('dlNoWatermark');
  if (dlNoWatermark) {
    dlNoWatermark.addEventListener('click', function() { launchUrl(target); });
  }
  var dlAudio = document.getElementById('dlAudio');
  if (dlAudio) {
    dlAudio.addEventListener('click', function() { launchUrl(target); });
  }
})();
</script>
</body>
</html>`;

  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: "GenAIUnifiedResponse",
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    __typename: "GenAIUnifiedResponseSection",
                    view_model: {
                      __typename: "GenAISingleLayoutViewModel",
                      primitive: {
                        __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                        trusted_sources: [
                          targetUrl,
                          "https://tikdown.innovatorssoft.org/",
                          "https://tikdown.innovatorssoft.org",
                        ],
                        payload: htmlPayload,
                      },
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

function createSamplePage(userName = "Commander") {
  const htmlPayload = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
:root {
  --primary: #06b6d4;
  --secondary: #8b5cf6;
  --accent: #ec4899;
  --bg-dark: #070a13;
  --card-bg: rgba(15, 23, 42, 0.75);
  --border-glow: rgba(6, 182, 212, 0.4);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg-dark);
  color: var(--text-main);
  padding: 10px;
  overflow-x: hidden;
  min-height: 100vh;
}
.dashboard {
  background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 50%, #030712 100%);
  border: 2px solid var(--border-glow);
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 0 35px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.15);
  position: relative;
  overflow: hidden;
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}
.dashboard::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%);
  pointer-events: none;
  animation: rotateGlow 12s linear infinite;
}
@keyframes rotateGlow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-icon {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 18px;
  box-shadow: 0 0 14px var(--primary);
  animation: pulseIcon 2s ease-in-out infinite alternate;
}
@keyframes pulseIcon { 0% { transform: scale(1); } 100% { transform: scale(1.08); filter: brightness(1.2); } }
.brand-title {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #fff, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #34d399;
}
.status-dot {
  width: 7px;
  height: 7px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
  animation: blink 1.2s infinite;
}
@keyframes blink { 50% { opacity: 0.3; } }

/* Profile Card */
.profile-card {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  display: grid;
  place-items: center;
  font-size: 20px;
  border: 2px solid #fff;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
}
.user-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}
.user-role {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.clock {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  background: rgba(6, 182, 212, 0.1);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

/* Navigation Tabs */
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}
.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.tab-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: #fff;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
}

/* Tab Content */
.tab-content { display: none; position: relative; z-index: 1; }
.tab-content.active { display: block; animation: fadeIn 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* Grid Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.metric-card {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px;
  position: relative;
  overflow: hidden;
}
.metric-card::after {
  content: '';
  position: absolute;
  top: 0; right: 0; width: 40px; height: 40px;
  background: radial-gradient(circle at top right, var(--primary), transparent 70%);
  opacity: 0.2;
}
.metric-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
.metric-value { font-size: 20px; font-weight: 800; color: #fff; margin-top: 4px; }
.metric-sub { font-size: 10px; color: #34d399; margin-top: 2px; font-weight: 600; }

/* Canvas Visualizer */
.canvas-box {
  background: #060913;
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 14px;
  padding: 10px;
  margin-bottom: 14px;
  position: relative;
}
.canvas-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
}
#waveCanvas {
  width: 100%;
  height: 80px;
  display: block;
  border-radius: 8px;
}

/* Control Hub */
.controls-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.control-row {
  background: var(--card-bg);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.control-info h4 { font-size: 13px; font-weight: 700; color: #fff; }
.control-info p { font-size: 10px; color: var(--text-muted); }

/* Custom Switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #334155;
  border-radius: 24px;
  transition: 0.3s;
}
.slider::before {
  position: absolute; content: "";
  height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}
input:checked + .slider { background: linear-gradient(135deg, var(--primary), var(--secondary)); box-shadow: 0 0 10px var(--primary); }
input:checked + .slider::before { transform: translateX(20px); }

/* Buttons */
.action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
.btn {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(6, 182, 212, 0.4);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.btn:active { transform: scale(0.96); filter: brightness(1.2); }
.btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.4);
}

/* Terminal Log */
.terminal {
  background: #040711;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  font-family: monospace;
  font-size: 11px;
  color: #38bdf8;
  height: 95px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.log-line { display: flex; gap: 6px; }
.log-time { color: var(--text-muted); }
.log-msg { color: #e2e8f0; }

/* Mini Game */
.game-arena {
  background: #040711;
  border: 2px dashed rgba(6, 182, 212, 0.4);
  border-radius: 16px;
  height: 200px;
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.target-node {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff, var(--accent) 60%, transparent 100%);
  box-shadow: 0 0 20px var(--accent);
  display: grid;
  place-items: center;
  font-size: 22px;
  cursor: pointer;
  animation: popNode 0.2s ease-out;
}
@keyframes popNode { 0% { transform: scale(0); } 100% { transform: scale(1); } }
.game-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 800;
  color: var(--primary);
}

/* Footer */
.footer {
  text-align: center;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 14px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}
</style>
</head>
<body>

<div class="dashboard" id="dashboard">
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div class="brand-title">CYBERPULSE</div>
    </div>
    <div class="status-pill">
      <span class="status-dot"></span>
      <span>ONLINE</span>
    </div>
  </div>

  <!-- Profile Section -->
  <div class="profile-card">
    <div class="user-meta">
      <div class="avatar">🚀</div>
      <div>
        <div class="user-name">${userName}</div>
        <div class="user-role">⭐ Core Level 42 · Quantum Tier</div>
      </div>
    </div>
    <div class="clock" id="liveClock">00:00:00</div>
  </div>

  <!-- Tab Buttons -->
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('system')">📊 Metrics</button>
    <button class="tab-btn" onclick="switchTab('controls')">⚡ Controls</button>
    <button class="tab-btn" onclick="switchTab('game')">🎮 Tap Rush</button>
  </div>

  <!-- Tab 1: System Metrics -->
  <div class="tab-content active" id="tab-system">
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Compute Core</div>
        <div class="metric-value" id="cpuLoad">3.8 GHz</div>
        <div class="metric-sub">⚡ 99.4% Efficiency</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Neural Sync</div>
        <div class="metric-value" id="syncPing">14 ms</div>
        <div class="metric-sub">🌐 Ultra-Low Jitter</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Quantum Power</div>
        <div class="metric-value" id="powerLevel">8,450 GW</div>
        <div class="metric-sub">🔥 Surge Active</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Firewall Status</div>
        <div class="metric-value" style="color: #34d399;">LOCKED</div>
        <div class="metric-sub">🛡️ Zero Intrusions</div>
      </div>
    </div>

    <div class="canvas-box">
      <div class="canvas-title">
        <span>Real-Time Wave Stream</span>
        <span id="fpsCount">60 FPS</span>
      </div>
      <canvas id="waveCanvas"></canvas>
    </div>
  </div>

  <!-- Tab 2: Controls Hub -->
  <div class="tab-content" id="tab-controls">
    <div class="controls-list">
      <div class="control-row">
        <div class="control-info">
          <h4>Turbo Overclock</h4>
          <p>Boost messaging pipeline throughput</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="turboSwitch" checked onchange="toggleControl('Turbo Overclock', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="control-row">
        <div class="control-info">
          <h4>Stealth Shield</h4>
          <p>Mask presence telemetry & signature</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="stealthSwitch" onchange="toggleControl('Stealth Shield', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="control-row">
        <div class="control-info">
          <h4>Auto Diagnostics</h4>
          <p>Continuous health telemetry</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="diagSwitch" checked onchange="toggleControl('Auto Diagnostics', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="action-grid">
      <button class="btn primary" onclick="boostPower()">🔥 Overcharge</button>
      <button class="btn" onclick="switchTheme()">🎨 Theme Cycle</button>
      <button class="btn" onclick="runDiagnostics()">🔍 Diagnostics</button>
      <button class="btn" onclick="clearLog()">🧹 Clear Logs</button>
    </div>

    <div class="terminal" id="terminalLog">
      <div class="log-line"><span class="log-time">[SYSTEM]</span><span class="log-msg">Neural Core initialized successfully.</span></div>
    </div>
  </div>

  <!-- Tab 3: Tap Rush Game -->
  <div class="tab-content" id="tab-game">
    <div class="game-arena" id="gameArena" onclick="missClick()">
      <div id="gameTarget" class="target-node" style="display: none;" onclick="hitNode(event)">💎</div>
      <div id="startPrompt" style="text-align: center;">
        <h3 style="color: #fff; margin-bottom: 8px;">Tap Rush Challenge</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Hit glowing quantum nodes before they expire!</p>
        <button class="btn primary" onclick="startGame(event)">▶️ Start Game</button>
      </div>
    </div>
    <div class="game-stats">
      <span>Score: <b id="gameScore" style="color: #fff;">0</b></span>
      <span>Combo: <b id="gameCombo" style="color: var(--accent);">0x</b></span>
      <span>High: <b id="gameHigh" style="color: #34d399;">0</b></span>
    </div>
  </div>

  <div class="footer">
    ⚡ INNOVATORS BAILEYS · GENAI UNIFIED WEB PRIMITIVE
  </div>
</div>

<script>
// Live Clock
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const clockEl = document.getElementById('liveClock');
  if (clockEl) {
    clockEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }
}
setInterval(updateClock, 1000);
updateClock();

// Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
  logMsg('Navigated to ' + tabId.toUpperCase() + ' tab.');
}

// Log Terminal
function logMsg(text) {
  const term = document.getElementById('terminalLog');
  if (!term) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStr = '[' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + ']';
  const row = document.createElement('div');
  row.className = 'log-line';
  row.innerHTML = '<span class="log-time">' + timeStr + '</span><span class="log-msg">' + text + '</span>';
  term.appendChild(row);
  term.scrollTop = term.scrollHeight;
}
function clearLog() {
  const term = document.getElementById('terminalLog');
  if (term) term.innerHTML = '<div class="log-line"><span class="log-time">[LOGS]</span><span class="log-msg">Terminal buffer cleared.</span></div>';
}

function toggleControl(name, state) {
  logMsg(name + ' switched ' + (state ? 'ON' : 'OFF'));
}

// Power Boost
let power = 8450;
function boostPower() {
  power += Math.floor(Math.random() * 850) + 150;
  document.getElementById('powerLevel').textContent = power.toLocaleString() + ' GW';
  logMsg('🔥 Overcharge pulse injected! Output: ' + power.toLocaleString() + ' GW');
}

// Run Diagnostics
function runDiagnostics() {
  logMsg('🔍 Running hardware integrity scan...');
  setTimeout(() => {
    const ping = Math.floor(Math.random() * 6) + 9;
    document.getElementById('syncPing').textContent = ping + ' ms';
    logMsg('✅ Scan complete: All subsystems operational (Latency: ' + ping + ' ms)');
  }, 600);
}

// Theme Switcher
const themes = [
  { primary: '#06b6d4', secondary: '#8b5cf6', glow: 'rgba(6, 182, 212, 0.4)' },
  { primary: '#10b981', secondary: '#06b6d4', glow: 'rgba(16, 185, 129, 0.4)' },
  { primary: '#ec4899', secondary: '#f59e0b', glow: 'rgba(236, 72, 153, 0.4)' },
  { primary: '#8b5cf6', secondary: '#3b82f6', glow: 'rgba(139, 92, 246, 0.4)' }
];
let themeIdx = 0;
function switchTheme() {
  themeIdx = (themeIdx + 1) % themes.length;
  const t = themes[themeIdx];
  document.documentElement.style.setProperty('--primary', t.primary);
  document.documentElement.style.setProperty('--secondary', t.secondary);
  document.documentElement.style.setProperty('--border-glow', t.glow);
  logMsg('🎨 Applied Theme Palette #' + (themeIdx + 1));
}

// Wave Canvas Animation
const canvas = document.getElementById('waveCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let step = 0;
  function resizeCanvas() {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function drawWave() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Wave 1
    ctx.beginPath();
    ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#06b6d4';
    for (let x = 0; x < w; x += 4) {
      const y = h / 2 + Math.sin((x * 0.015) + step) * (h * 0.28) + Math.cos((x * 0.03) - step) * (h * 0.12);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Wave 2
    ctx.beginPath();
    ctx.lineWidth = 1.5 * (window.devicePixelRatio || 1);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary') || '#8b5cf6';
    for (let x = 0; x < w; x += 4) {
      const y = h / 2 + Math.sin((x * 0.02) - (step * 1.3)) * (h * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    step += 0.045;
    requestAnimationFrame(drawWave);
  }
  drawWave();
}

// Tap Rush Mini-Game
let gameActive = false, score = 0, combo = 0, high = 0, targetTimer = null;
const emojis = ['💎', '⚡', '🔥', '⭐', '👾', '🚀'];

function startGame(e) {
  if (e) e.stopPropagation();
  gameActive = true;
  score = 0;
  combo = 0;
  updateGameUI();
  document.getElementById('startPrompt').style.display = 'none';
  document.getElementById('gameTarget').style.display = 'grid';
  spawnTarget();
  logMsg('🎮 Tap Rush Game Started!');
}

function spawnTarget() {
  if (!gameActive) return;
  const arena = document.getElementById('gameArena');
  const target = document.getElementById('gameTarget');
  if (!arena || !target) return;

  const maxX = arena.clientWidth - 55;
  const maxY = arena.clientHeight - 55;
  const randX = Math.max(10, Math.floor(Math.random() * maxX));
  const randY = Math.max(10, Math.floor(Math.random() * maxY));

  target.style.left = randX + 'px';
  target.style.top = randY + 'px';
  target.textContent = emojis[Math.floor(Math.random() * emojis.length)];

  clearTimeout(targetTimer);
  targetTimer = setTimeout(() => {
    if (gameActive) {
      combo = 0;
      updateGameUI();
      spawnTarget();
    }
  }, Math.max(800, 1600 - (score * 20)));
}

function hitNode(e) {
  if (e) e.stopPropagation();
  if (!gameActive) return;
  combo++;
  score += 10 * combo;
  if (score > high) high = score;
  updateGameUI();
  spawnTarget();
}

function missClick() {
  if (!gameActive) return;
  combo = 0;
  updateGameUI();
}

function updateGameUI() {
  document.getElementById('gameScore').textContent = score;
  document.getElementById('gameCombo').textContent = combo + 'x';
  document.getElementById('gameHigh').textContent = high;
}
</script>
</body>
</html>`;

  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: "GenAIUnifiedResponse",
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    __typename: "GenAIUnifiedResponseSection",
                    view_model: {
                      __typename: "GenAISingleLayoutViewModel",
                      primitive: {
                        __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                        trusted_sources: [],
                        payload: htmlPayload,
                      },
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

async function page(ctx) {
  try {
    const jid = ctx.chatJid;

    const userName = ctx.pushName || ctx.msg?.pushName || "Player";

    const content = createLivePage(userName);

    const generated = generateWAMessageFromContent(jid, content, {
      userJid: ctx.sock.user?.id,
    });

    await ctx.sock.relayMessage(jid, generated.message, {
      messageId: generated.key.id,
    });

    const content1 = createSamplePage(userName);

    const generated1 = generateWAMessageFromContent(jid, content1, {
      userJid: ctx.sock.user?.id,
    });

    await ctx.sock.relayMessage(jid, generated1.message, {
      messageId: generated1.key.id,
    });
  } catch (error) {
    console.error("Live page error:", error);

    await ctx.reply(`❌ Live page error: ${error.message}`);
  }
}

function createSlotsPage() {
  const htmlPayload = `<html><head><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;overflow:hidden;background:transparent;font-family:Arial,sans-serif;overscroll-behavior:none}body{padding:9px;background:radial-gradient(circle at 50% 12%,#5b2d18,#160908 55%,#030202)}.machine{position:relative;overflow:hidden;padding:13px 34px 18px 13px;border:4px solid #2b0c05;border-radius:30px;background:linear-gradient(105deg,#1e0704,#8c3515 8%,#3b1008 20%,#611e0c 52%,#2b0906 82%,#9c401b 94%,#2a0b06);box-shadow:inset 0 0 0 3px #e6a139,inset 0 0 0 7px #5d210b,inset 0 20px 35px #ffb52a22,0 8px 0 #210705,0 14px 24px #000c;touch-action:none}.machine:before{content:"";position:absolute;inset:8px;border:2px solid #ffba3d;border-radius:22px;pointer-events:none;box-shadow:inset 0 0 11px #ff7b00}.lights{height:9px;margin:0 14px 8px;border:2px solid #6f2608;border-radius:8px;background:repeating-radial-gradient(circle at 6px 50%,#fffbd3 0 2px,#ffbd00 3px 5px,#641800 6px 12px);box-shadow:0 0 12px #ff8a00;animation:lights .55s steps(2) infinite}.title{padding:11px 4px 8px;border:3px solid #ffc54c;border-radius:50% 50% 11px 11px/30% 30% 10px 10px;color:#fff2a1;background:radial-gradient(ellipse at 50% 0,#12b2bc,#075165 58%,#06182a);box-shadow:inset 0 0 0 4px #74300d,inset 0 -11px 18px #001726,0 4px 0 #3b1207;text-align:center;font:25px Impact,Arial Black,sans-serif;letter-spacing:1px;text-shadow:0 3px #8f1c0c,2px 0 #8f1c0c,-2px 0 #8f1c0c}.jackpot{width:75%;margin:5px auto 8px;padding:4px;border:2px solid #ffcf5b;border-radius:10px;color:#ffe7a1;background:linear-gradient(#741523,#29060e);box-shadow:inset 0 2px 5px #ff667744;text-align:center;font:bold 10px monospace;letter-spacing:1px}.stats{display:flex;margin:0 2px 9px;padding:5px;border:2px solid #b66b20;border-radius:9px;background:linear-gradient(#210c08,#070303);box-shadow:inset 0 0 9px #000,0 3px 0 #4a1909}.stat{flex:1;border-right:1px solid #754016;color:#d6a15b;text-align:center;font:bold 10px monospace}.stat:last-child{border:0}.stat b{display:block;margin-top:2px;color:#fff0bb;font-size:15px;text-shadow:0 0 6px #f80}.frame{position:relative;padding:9px;border:5px solid #9b4e12;border-radius:18px;background:linear-gradient(90deg,#4b1c08,#ffd873 5%,#6a2709 10%,#6a2709 90%,#ffd873 95%,#421506);box-shadow:inset 0 0 0 3px #2b0d05,0 4px 0 #301005,0 8px 15px #000b}.reelbox{position:relative;display:grid;grid-template-columns:repeat(5,1fr);height:192px;overflow:hidden;border:3px solid #1d0804;border-radius:11px;background:#140604;box-shadow:inset 0 13px 20px #000,inset 0 -13px 20px #000}.reel{position:relative;overflow:hidden;border-right:2px solid #6e421e;background:linear-gradient(90deg,#a58149,#fffce4 17%,#fffdf0 50%,#f7e9bd 82%,#8e6a38);box-shadow:inset 7px 0 8px #573b1d66,inset -7px 0 8px #573b1d66}.reel:last-child{border:0}.reel:after{content:"";position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(#3b1d0fbb 0,transparent 18%,transparent 80%,#281208cc 100%);box-shadow:inset 0 9px 11px #0005,inset 0 -9px 11px #0005}.strip{position:absolute;left:0;right:0;top:0;transform:translate3d(0,0,0);will-change:transform,filter}.strip.moving{filter:blur(1.4px) saturate(1.2)}.sym{height:64px;display:grid;place-items:center;border-bottom:1px solid #9f7e4f66;color:#d30f1c;font-family:Apple Color Emoji,Segoe UI Emoji,Arial Black,sans-serif;font-size:clamp(26px,8vw,40px);line-height:1;text-shadow:0 3px 0 #721018,0 0 4px #fff;transform:translateZ(0)}.sym.s4{font:900 42px Impact,Arial Black,sans-serif;color:#ef1726;-webkit-text-stroke:2px #850815;text-shadow:0 3px #5d0509,0 0 5px #fff}.sym.s5{font:900 16px Arial Black,sans-serif;color:#fff4c4;background:radial-gradient(ellipse at center,#e22d35 0,#6f0910 52%,transparent 54%);text-shadow:0 2px #401010}.sym.win{animation:win .5s ease-in-out infinite;background:radial-gradient(circle,#fff8a9,#ffae00 55%,transparent 72%)}.shine{position:absolute;z-index:3;inset:4px 8% 55%;border-radius:50%;background:linear-gradient(#fff7,transparent);pointer-events:none}.payline{position:absolute;z-index:4;left:9px;right:9px;height:3px;opacity:0;background:#fff5a1;box-shadow:0 0 7px #fff,0 0 14px #ff3d00;pointer-events:none}.payline.on{animation:line 1s ease infinite}.p0{top:20%}.p1{top:50%}.p2{top:80%}.message{height:34px;margin:9px 2px 7px;display:grid;place-items:center;border:2px solid #a55c19;border-radius:8px;color:#ffd46a;background:#150504;box-shadow:inset 0 0 8px #000;text-align:center;font:bold 14px monospace;text-shadow:0 0 7px #f60}.console{display:grid;grid-template-columns:1fr 1.7fr;gap:8px;margin:0 3px;padding:10px 9px 13px;border:3px solid #8e4914;border-radius:9px 9px 17px 17px;background:linear-gradient(#d69a49,#63300f 37%,#2a0b06 39%,#4b1509);box-shadow:inset 0 2px #ffe0a0,0 5px #1c0704,0 9px 12px #0008;transform:perspective(300px) rotateX(4deg)}button{height:53px;border:3px solid #351006;border-radius:13px;color:#fff;font-weight:900;touch-action:none}.bet{background:linear-gradient(#42c4df,#086184 53%,#03334c);box-shadow:inset 0 4px 4px #fff8,0 4px #051e2a}.spin{background:radial-gradient(circle at 50% 32%,#8aff77,#20a72d 47%,#075b17 76%);box-shadow:inset 0 4px 5px #e3ffdc,0 4px #07350e,0 0 14px #3cff4a;font-size:18px;text-shadow:0 2px #06420d}.tray{width:49%;height:19px;margin:14px auto 0;border:4px solid #48200b;border-radius:4px 4px 10px 10px;background:#090303;box-shadow:inset 0 6px 9px #000,0 3px #c47c29}.leverTrack{position:absolute;z-index:5;right:9px;top:211px;width:20px;height:150px;border:2px solid #3d1809;border-radius:13px;background:linear-gradient(90deg,#321006,#df9a39,#52200a);box-shadow:inset 0 0 5px #000}.lever{position:absolute;left:-4px;top:8px;width:28px;height:112px;transform-origin:50% 88%;transition:transform .34s cubic-bezier(.2,.8,.2,1);touch-action:none}.lever:before{content:"";position:absolute;left:11px;top:17px;width:7px;height:86px;border:2px solid #333;border-radius:4px;background:linear-gradient(90deg,#444,#fff 48%,#666 64%,#222)}.lever:after{content:"";position:absolute;left:0;width:29px;height:29px;border:3px solid #650000;border-radius:50%;background:radial-gradient(circle at 35% 25%,#fff,#ff7777 13%,#ed1720 37%,#850007 74%);box-shadow:inset -5px -6px 7px #490000,0 4px 5px #000,0 0 9px #f22}.lever.pull{transform:rotate(36deg)}.over{position:absolute;z-index:10;inset:0;display:grid;place-items:center;text-align:center;color:#ffe5a0;background:#080100ed}.over.off{display:none}.over h2{margin:0 0 8px;color:#ff3449;text-shadow:0 0 12px #f00}.over button{padding:0 22px;background:#ffd15a;color:#271204}@keyframes lights{50%{filter:brightness(1.7)}}@keyframes win{50%{transform:scale(1.09);filter:brightness(1.4)}}@keyframes line{50%{opacity:1}}
</style><style>.reelbox{display:block;height:205px;padding:0;background:#160704}
#reelCanvas{display:block;width:100%;height:100%;border-radius:8px;touch-action:none}
</style><style>body{padding:15px 13px 29px;perspective:950px}
.machine{transform-origin:50% 88%;transform:perspective(850px) rotateX(1.2deg) translateZ(0);box-shadow:inset 0 0 0 3px #f0b64b,inset 0 0 0 8px #501708,inset 14px 0 24px #ffb3421f,inset -15px 0 25px #16030199,0 9px 0 #180503,0 17px 0 #421508,0 27px 35px #000e}
.machine:after{content:"";position:absolute;z-index:-2;left:7%;right:7%;bottom:-30px;height:30px;border-radius:50%;background:radial-gradient(ellipse,#000d 0,#0008 42%,transparent 73%);filter:blur(4px)}
.title{transform:perspective(500px) rotateX(-3deg) translateZ(8px);box-shadow:inset 0 0 0 4px #74300d,inset 0 -13px 20px #001522,0 5px 0 #351006,0 10px 16px #0009}
.frame{transform:perspective(650px) rotateX(-1.5deg) translateZ(7px);box-shadow:inset 0 0 0 3px #2b0d05,inset 0 12px 13px #fff2b21c,0 6px 0 #291006,0 13px 19px #000c}
.console{transform:perspective(420px) rotateX(8deg) translateZ(5px);transform-origin:50% 0;box-shadow:inset 0 3px #ffe4ac,0 7px #1b0704,0 15px 20px #000b}
.machine.charging{animation:crateCharge .56s cubic-bezier(.36,.07,.19,.97) both}
.machine.charging .lights{animation:warningFlash .12s steps(2) infinite}
.machine.charging .frame{animation:frameTension .56s ease both}
.machine.charging .title{animation:signTension .56s ease both}
@keyframes crateCharge{0%{transform:perspective(850px) rotateX(1.2deg) rotateZ(0) translate(0,0) scale(1)}12%{transform:perspective(850px) rotateX(2deg) rotateZ(-.8deg) translate(-2px,1px) scale(.995)}25%{transform:perspective(850px) rotateX(.2deg) rotateZ(1deg) translate(3px,-1px) scale(1.008)}39%{transform:perspective(850px) rotateX(2.2deg) rotateZ(-1.15deg) translate(-3px,1px) scale(.998)}52%{transform:perspective(850px) rotateX(.3deg) rotateZ(.9deg) translate(3px,-2px) scale(1.012)}66%{transform:perspective(850px) rotateX(2deg) rotateZ(-.55deg) translate(-2px,1px) scale(1.004)}79%{transform:perspective(850px) rotateX(.7deg) rotateZ(.35deg) translate(1px,-1px) scale(1.01)}100%{transform:perspective(850px) rotateX(1.2deg) rotateZ(0) translate(0,0) scale(1)}}
@keyframes warningFlash{50%{filter:brightness(2.2) saturate(1.8);box-shadow:0 0 21px #ffca28}}
@keyframes frameTension{45%{transform:perspective(650px) rotateX(-2.5deg) translateZ(13px) scale(1.012)}100%{transform:perspective(650px) rotateX(-1.5deg) translateZ(7px)}}
@keyframes signTension{45%{transform:perspective(500px) rotateX(-5deg) translateZ(15px)}100%{transform:perspective(500px) rotateX(-3deg) translateZ(8px)}}
</style><style>.machine.charging{animation:leverDip .28s cubic-bezier(.25,.8,.25,1) both}
.machine.charging .frame,.machine.charging .title{animation:none}
.machine.reelKick{animation:reelKick .13s cubic-bezier(.2,.8,.3,1)}
@keyframes leverDip{0%{transform:perspective(850px) rotateX(1.2deg) translateY(0) scale(1)}42%{transform:perspective(850px) rotateX(2.4deg) translateY(3px) scale(.994)}72%{transform:perspective(850px) rotateX(.5deg) translateY(-2px) scale(1.004)}100%{transform:perspective(850px) rotateX(1.2deg) translateY(0) scale(1)}}
@keyframes reelKick{0%{transform:perspective(850px) rotateX(1.2deg) translateX(0)}35%{transform:perspective(850px) rotateX(1.7deg) translateX(-1.5px) translateY(1px)}70%{transform:perspective(850px) rotateX(.8deg) translateX(1px) translateY(-1px)}100%{transform:perspective(850px) rotateX(1.2deg) translateX(0)}}
</style><style>.machine.charging,.machine.reelKick{animation:none!important}
.machine.charging .frame,.machine.charging .title,.machine.charging .lights{animation:none!important}
.leverTrack{right:9px;top:211px;width:24px;height:158px;overflow:hidden;border-radius:12px}
.lever{left:0;top:7px;width:24px;height:100px;transform:none;transform-origin:50% 50%;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.lever:before{left:8px;top:18px;width:7px;height:77px}
.lever:after{left:0;top:0;width:24px;height:24px;border-width:2px}
.lever.pull{transform:translateY(47px)}
</style><style>
/* Fixed-pivot lever: the mount stays still; only the arm swings. */
.machine{
    padding-right:70px!important;
}

.leverTrack{
    position:absolute!important;
    right:8px!important;
    top:205px!important;
    width:56px!important;
    height:150px!important;
    overflow:hidden!important;
    border-radius:16px!important;
    transform:none!important;
}

.leverTrack:after{
    content:"";
    position:absolute;
    left:2px;
    bottom:1px;
    width:27px;
    height:27px;
    z-index:3;
    border:2px solid #5b2509;
    border-radius:50%;
    box-sizing:border-box;
    background:radial-gradient(circle at 35% 30%,#fff6c8 0 8%,#f7bd3d 9% 25%,#9b3d08 52%,#3a1205 76%);
    box-shadow:inset 0 0 0 3px #ffda67,0 2px 5px #000b;
}

.lever{
    position:absolute!important;
    left:2px!important;
    top:auto!important;
    bottom:9px!important;
    width:27px!important;
    height:105px!important;
    transform:rotate(0deg)!important;
    transform-origin:13.5px 95px!important;
    transition:transform .34s cubic-bezier(.2,.88,.25,1.08)!important;
    z-index:2!important;
}

.lever:before{
    left:10px!important;
    top:18px!important;
    width:7px!important;
    height:80px!important;
    border-radius:5px!important;
    background:linear-gradient(90deg,#321003 0,#f3c56f 20%,#fff5cf 43%,#9b4c18 72%,#260b02 100%)!important;
    box-shadow:0 2px 4px #000b!important;
}

.lever:after{
    left:1px!important;
    top:0!important;
    width:24px!important;
    height:24px!important;
    border-width:2px!important;
}

.lever.pull{
    transform:rotate(17deg)!important;
}

</style><style>
/* Front-facing pull: fixed lower pivot with perspective foreshortening. */
.lever{
    transform:none!important;
    transform-origin:50% 100%!important;
    transition:none!important;
}

.lever:before{
    transform:scaleY(1)!important;
    transform-origin:50% 100%!important;
    transition:transform .34s cubic-bezier(.2,.85,.25,1)!important;
}

.lever:after{
    transform:translateY(0) scale(1)!important;
    transform-origin:50% 50%!important;
    transition:transform .34s cubic-bezier(.2,.85,.25,1.08)!important;
}

.lever.pull{
    transform:none!important;
}

.lever.pull:before{
    transform:scaleY(.56)!important;
}

.lever.pull:after{
    transform:translateY(36px) scale(1.16)!important;
}

</style><style>
/* Rigid front-pulling lever assembly. */
.machine{padding-right:62px!important}
.leverTrack{right:8px!important;top:205px!important;width:47px!important;height:150px!important;overflow:hidden!important}
.leverTrack:after{left:9px!important;bottom:5px!important;width:27px!important;height:27px!important;z-index:4!important}
.lever{left:0!important;right:0!important;bottom:12px!important;top:auto!important;width:100%!important;height:112px!important;transform:none!important}
.lever:before,.lever:after{display:none!important}
.leverArm{position:absolute;left:20px;bottom:7px;width:7px;height:91px;border:2px solid #292929;border-radius:5px;box-sizing:border-box;background:linear-gradient(90deg,#3c3c3c,#fff 43%,#8a8a8a 68%,#252525);box-shadow:0 2px 4px #000b;transform:scaleY(1);transform-origin:50% 100%;transition:transform .34s cubic-bezier(.2,.82,.25,1)}
.leverKnob{position:absolute;left:-10px;top:-13px;width:27px;height:27px;border:3px solid #650000;border-radius:50%;box-sizing:border-box;background:radial-gradient(circle at 35% 25%,#fff,#ff7777 13%,#ed1720 37%,#850007 74%);box-shadow:inset -5px -6px 7px #490000,0 4px 5px #000,0 0 9px #f22;transform:scaleY(1) scale(1);transition:transform .34s cubic-bezier(.2,.82,.25,1)}
.lever.pull .leverArm{transform:scaleY(.52)}
.lever.pull .leverKnob{transform:scaleY(1.9231) scale(1.12)}

</style><style>
.leverTrack{display:none!important}
html,body{min-height:0!important}
body{padding:4px!important}
.machine{padding:8px 10px 10px!important;border-width:3px!important;border-radius:22px!important;box-shadow:inset 0 0 0 2px #e6a139,inset 0 0 0 5px #5d210b,inset 0 14px 25px #ffb52a22,0 5px 0 #210705,0 9px 16px #000c!important}
.machine:before{inset:6px!important;border-radius:17px!important}
.lights{height:7px!important;margin:0 12px 5px!important}
.title{padding:7px 4px 5px!important;font-size:21px!important}
.jackpot{margin:3px auto 5px!important;padding:3px!important}
.stats{margin:0 2px 6px!important;padding:4px!important}
.stat b{font-size:13px!important;margin-top:1px!important}
.frame{padding:6px!important;border-width:4px!important;border-radius:14px!important}
.reelbox{height:150px!important;border-radius:9px!important}
.message{height:29px!important;margin:6px 2px 5px!important;font-size:12px!important}
.console{gap:7px!important;margin:0 3px!important;padding:7px 8px 9px!important}
button{height:44px!important}
.spin{font-size:16px!important}
.tray{height:14px!important;margin-top:9px!important;border-width:3px!important}

</style><style>
body{background:radial-gradient(circle at 50% 8%,#1d6a50,#0f4938 48%,#07291f)!important}
.machine{border-color:#071f18!important;background:linear-gradient(110deg,#061e17,#1b644b 10%,#0b382a 24%,#15543f 54%,#092f24 82%,#28775a 94%,#071f18)!important;box-shadow:inset 0 0 0 2px #b9954d,inset 0 0 0 5px #163f31,inset 0 14px 24px #73d2a31c,0 5px 0 #041a13,0 9px 16px #000b!important}
.machine:before{border-color:#b59349!important;box-shadow:inset 0 0 9px #4fa57a66!important}
.lights{border-color:#123d2f!important;background:repeating-radial-gradient(circle at 6px 50%,#dfffdc 0 2px,#82c878 3px 5px,#164936 6px 12px)!important;box-shadow:0 0 9px #67b881!important}
.title{border-color:#b99a54!important;color:#e9e3bc!important;background:radial-gradient(ellipse at 50% 0,#2b8a6c,#11513f 58%,#082a24)!important;box-shadow:inset 0 0 0 4px #244f3d,inset 0 -10px 17px #061e19,0 4px 0 #071d16!important;text-shadow:0 2px #193f31,2px 0 #193f31,-2px 0 #193f31!important}
.jackpot{border-color:#a98c4d!important;color:#ded7ad!important;background:linear-gradient(#245d48,#0b3025)!important;box-shadow:inset 0 2px 5px #8ed3a233!important}
.stats,.message{border-color:#537d64!important;background:linear-gradient(#102d24,#061812)!important}
.stat{border-color:#416452!important;color:#91b59f!important}.stat b,.message{color:#e3dfbb!important;text-shadow:0 0 6px #62a77d!important}
.frame{border-color:#315c47!important;background:linear-gradient(90deg,#09271e,#b49a59 5%,#174936 10%,#174936 90%,#b49a59 95%,#09271e)!important;box-shadow:inset 0 0 0 3px #071b15,0 4px 0 #09271e,0 8px 15px #000a!important}
.reelbox{border-color:#071c15!important;background:#071a14!important;box-shadow:inset 0 9px 15px #0009,inset 0 -9px 15px #0009!important}
.shine{display:none!important}
.console{border-color:#416a53!important;background:linear-gradient(#9c8c59,#315d48 37%,#0a2e22 39%,#123e2f)!important;box-shadow:inset 0 2px #d9c992,0 5px #061d16,0 9px 12px #0008!important}
.bet{background:linear-gradient(#4f9a77,#216348 53%,#103d2d)!important;box-shadow:inset 0 4px 4px #d8ffe055,0 4px #092a20!important}
.spin{background:radial-gradient(circle at 50% 32%,#a8d96f,#4b8d46 47%,#1e542f 76%)!important;box-shadow:inset 0 4px 5px #e8ffd488,0 4px #12351e,0 0 12px #79b85c88!important}
.tray{border-color:#244d3a!important;background:#061a13!important;box-shadow:inset 0 6px 9px #000,0 3px #897945!important}
</style><style>
.payline{height:3px!important;background:linear-gradient(90deg,transparent,#dfff8a 18%,#fff5b0 50%,#7fe091 82%,transparent)!important;box-shadow:0 0 7px #efffa8,0 0 15px #65c984!important;transform:scaleX(.15);transform-origin:50% 50%}
.payline.on{opacity:1!important;animation:jungleLine 1.15s cubic-bezier(.2,.8,.2,1) infinite!important}
.machine.winner .message{animation:jungleDisplay .7s ease-in-out 2!important}
.machine.winner .lights{animation:jungleLights .22s steps(2) 6!important}
.machine.winner .title{animation:jungleTitle .7s ease-in-out 2!important}
@keyframes jungleLine{0%{transform:scaleX(.08);filter:brightness(1)}45%{transform:scaleX(1);filter:brightness(1.8)}75%,100%{transform:scaleX(1);opacity:0}}
@keyframes jungleDisplay{50%{color:#fff8bd;box-shadow:inset 0 0 14px #7ddc8a,0 0 13px #74ce82;filter:brightness(1.35)}}
@keyframes jungleLights{50%{filter:brightness(2.2) saturate(1.4)}}
@keyframes jungleTitle{50%{filter:brightness(1.35);text-shadow:0 0 12px #cfff91,0 2px #193f31}}
</style><style>
.machine{
    box-shadow:inset 0 0 0 2px #b9954d,inset 0 0 0 5px #163f31,inset 0 14px 24px #73d2a31c!important;
}
</style><style>
html,body{width:100%!important}
body{padding:0!important}
.machine{width:100%!important;margin:0!important}
</style></head><body><div class="machine" id="machine"><div class="lights"></div><div class="title">FRUIT BONANZA</div><div class="jackpot">JACKPOT · 10,000 CREDITS</div><div class="stats"><div class="stat">CREDITS<b id="credits">500</b></div><div class="stat">BET<b id="betValue">10</b></div><div class="stat">BEST WIN<b id="best">0</b></div></div><div class="frame"><div id="reelbox" class="reelbox"><canvas id="reelCanvas"></canvas></div><div class="shine"></div><i class="payline p0"></i><i class="payline p1"></i><i class="payline p2"></i></div><div id="message" class="message">SPIN TO PLAY</div><div class="console"><button id="bet" class="bet">BET +</button><button id="spin" class="spin">SPIN</button></div><div class="tray"></div><div class="leverTrack"><div id="lever" class="lever"><i class="leverArm"><i class="leverKnob"></i></i></div></div><div id="over" class="over off"><div><h2>GAME OVER</h2><p>Keine Credits mehr.<br>Best Win: <b id="finalBest">0</b></p><button id="restart">NEW GAME</button></div></div></div><script>(function(){
var labels=['🍒','🍋','🔔','💎','7','BAR'],weights=[30,25,18,12,8,7],pays=[2,3,5,8,12,20],credits=500,bet=10,best=0,busy=false,winCells=[],reels=[],sparks=[],winUntil=0,canvas=document.getElementById('reelCanvas'),ctx=canvas.getContext('2d'),C=document.getElementById('credits'),BV=document.getElementById('betValue'),BS=document.getElementById('best'),MSG=document.getElementById('message'),SP=document.getElementById('spin'),BT=document.getElementById('bet'),LV=document.getElementById('lever'),OV=document.getElementById('over'),FB=document.getElementById('finalBest'),MCH=document.getElementById('machine'),PL=document.querySelectorAll('.payline'),D=Math.min(devicePixelRatio||1,2),W,H,last=0,startTime=0;
function pick(){var n=Math.random()*100,s=0;for(var i=0;i<weights.length;i++){s+=weights[i];if(n<s)return i}return 0}
function buildStrip(){var a=[];for(var i=0;i<80;i++)a.push(pick());return a}
function resize(){var r=canvas.getBoundingClientRect();W=r.width;H=r.height;canvas.width=Math.round(W*D);canvas.height=Math.round(H*D);ctx.setTransform(D,0,0,D,0,0);draw()}
function ui(){C.textContent=credits;BV.textContent=bet;BS.textContent=best}
function clearWins(){winCells=[];sparks=[];winUntil=0;MCH.classList.remove('winner');for(var i=0;i<PL.length;i++)PL[i].classList.remove('on')}
for(var c=0;c<5;c++)reels.push({strip:buildStrip(),pos:Math.floor(Math.random()*60),speed:0,stop:0,stopped:true,decelStart:null,from:0,target:0});
function mod(n,m){return((n%m)+m)%m}
function symbol(col,row,index,x,y,w,h,curve){var value=reels[col].strip[mod(index,reels[col].strip.length)],won=winCells.some(function(v){return v[0]===col&&v[1]===row}),pulse=won?1+.09*Math.sin(performance.now()/85):1;if(won){var glow=ctx.createRadialGradient(x+w/2,y+h/2,2,x+w/2,y+h/2,w*.72);glow.addColorStop(0,'rgba(255,247,159,.92)');glow.addColorStop(.48,'rgba(119,205,94,.62)');glow.addColorStop(1,'rgba(44,126,75,0)');ctx.fillStyle=glow;ctx.fillRect(x,y,w,h)}ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(pulse,curve*pulse);ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=won?'#d9ff75':'rgba(18,55,38,.28)';ctx.shadowBlur=won?16:3;if(value===4){ctx.font='900 '+Math.floor(h*.72)+'px Impact,Arial Black';ctx.lineWidth=4;ctx.strokeStyle='#790914';ctx.strokeText('7',0,2);ctx.fillStyle='#f31c2b';ctx.fillText('7',0,2)}else if(value===5){ctx.font='900 '+Math.floor(h*.29)+'px Arial Black';ctx.fillStyle='#861019';ctx.beginPath();ctx.ellipse(0,0,w*.38,h*.25,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b4';ctx.fillText('BAR',0,1)}else{ctx.font=Math.floor(h*.56)+'px Apple Color Emoji,Segoe UI Emoji,sans-serif';ctx.fillText(labels[value],0,1)}ctx.restore()}
function draw(){if(!W||!H)return;ctx.clearRect(0,0,W,H);var rw=W/5,rh=H/3;for(var c=0;c<5;c++){var x=c*rw,reel=reels[c],base=Math.floor(reel.pos),frac=reel.pos-base;var bg=ctx.createLinearGradient(x,0,x+rw,0);bg.addColorStop(0,'#8f6a39');bg.addColorStop(.16,'#fff8d8');bg.addColorStop(.5,'#fffdf0');bg.addColorStop(.84,'#f0dfad');bg.addColorStop(1,'#79552c');ctx.fillStyle=bg;ctx.fillRect(x,0,rw,H);ctx.save();ctx.beginPath();ctx.rect(x,0,rw,H);ctx.clip();ctx.filter=reel.speed>5?'blur(1.3px)':'none';for(var k=-1;k<5;k++){var y=(k-frac)*rh,row=k;var center=(y+rh/2)/H,curve=.78+.22*Math.cos((center-.5)*Math.PI);symbol(c,row,base+k,x,y,rw,rh,curve);ctx.strokeStyle='rgba(92,57,20,.25)';ctx.beginPath();ctx.moveTo(x,y+rh);ctx.lineTo(x+rw,y+rh);ctx.stroke()}ctx.restore();ctx.filter='none';if(c){ctx.fillStyle='#573512';ctx.fillRect(x-1,0,2,H)}}var shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(23,7,2,.72)');shade.addColorStop(.13,'rgba(0,0,0,0)');shade.addColorStop(.48,'rgba(255,255,255,0)');shade.addColorStop(.86,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(20,5,1,.78)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(20,61,43,.45)';ctx.strokeRect(.5,.5,W-1,H-1);drawSparks()}
function drawSparks(){var now=performance.now();for(var i=0;i<sparks.length;i++){var s=sparks[i],t=(now-s.born)/1000;if(t<0)continue;var a=Math.max(0,1-t/1.25);if(!a)continue;ctx.save();ctx.globalAlpha=a;ctx.translate(s.x+s.vx*t,s.y+s.vy*t+85*t*t);ctx.rotate(t*s.spin);ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=5;ctx.fillRect(-s.size/2,-s.size/2,s.size,s.size*1.8);ctx.restore()}}
function celebrate(now){draw();if(now<winUntil)requestAnimationFrame(celebrate);else{sparks=[];MCH.classList.remove('winner');draw()}}
function startWin(){var colors=['#e7d277','#9ce277','#4ebc78','#fff4b0'];sparks=[];for(var i=0;i<34;i++)sparks.push({x:W*(.1+Math.random()*.8),y:H*(.28+Math.random()*.44),vx:(Math.random()-.5)*70,vy:-45-Math.random()*75,born:performance.now()+Math.random()*180,size:2+Math.random()*3,spin:(Math.random()-.5)*12,color:colors[i%colors.length]});winUntil=performance.now()+1450;MCH.classList.add('winner');requestAnimationFrame(celebrate)}
function frame(now){if(!busy)return;var dt=Math.min((now-last)/1000,.035);last=now;var stopped=0;for(var c=0;c<5;c++){var r=reels[c],elapsed=now-startTime;if(elapsed<180){r.speed=23*(elapsed/180);r.pos+=r.speed*dt}else if(elapsed<r.stop){r.speed=23;r.pos+=r.speed*dt}else{if(r.decelStart===null){r.decelStart=now;r.from=r.pos;r.target=Math.ceil(r.pos)+7}var p=Math.min(1,(now-r.decelStart)/720),ease=1-Math.pow(1-p,4);r.pos=r.from+(r.target-r.from)*ease;r.speed=(r.target-r.from)*4*Math.pow(1-p,3)/.72;if(p>=1){r.pos=r.target;r.speed=0;r.stopped=true}}if(r.stopped)stopped++}draw();if(stopped===5){busy=false;setTimeout(evaluate,150)}else requestAnimationFrame(frame)}
function boardValue(col,row){var r=reels[col];return r.strip[mod(Math.round(r.pos)+row,r.strip.length)]}
function evaluate(){LV.classList.remove('pull');var patterns=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]],total=0,wins=[];patterns.forEach(function(p,pi){var a=boardValue(0,p[0]),count=1;for(var x=1;x<5&&boardValue(x,p[x])===a;x++)count++;if(count>=3){total+=Math.floor(bet*pays[a]*(count===3?1:count===4?2:5));wins.push({p:p,n:count,line:pi})}});if(total){credits+=total;best=Math.max(best,total);wins.forEach(function(w){for(var x=0;x<w.n;x++)winCells.push([x,w.p[x]]);if(w.line<3)PL[w.line].classList.add('on')});MSG.textContent=total>=bet*20?'JACKPOT +'+total:'WIN +'+total;startWin()}else MSG.textContent='YOU LOOSER';SP.disabled=false;BT.disabled=false;ui();draw();if(credits<10)setTimeout(gameover,800);else if(bet>credits){bet=10;ui()}}
function spin(){if(busy||credits<bet)return;busy=true;clearWins();credits-=bet;ui();SP.disabled=true;BT.disabled=true;MSG.textContent='GOOD LUCK';LV.classList.add('pull');startTime=performance.now();last=startTime;for(var c=0;c<5;c++){reels[c].speed=0;reels[c].stop=1050+c*220;reels[c].stopped=false;reels[c].decelStart=null}requestAnimationFrame(frame)}
function gameover(){FB.textContent=best;OV.className='over'}
BT.onclick=function(){if(busy)return;bet=bet===10?20:bet===20?50:10;if(bet>credits)bet=10;ui()};SP.onclick=spin;LV.onclick=spin;document.getElementById('restart').onclick=function(){credits=500;bet=10;best=0;busy=false;OV.className='over off';MSG.textContent='SPIN TO PLAY';SP.disabled=false;BT.disabled=false;clearWins();ui();draw()};addEventListener('resize',resize);ui();resize();
})();
</script></body></html>`;

  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                __typename: "GenAIUnifiedResponse",
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    __typename: "GenAIUnifiedResponseSection",
                    view_model: {
                      __typename: "GenAISingleLayoutViewModel",
                      primitive: {
                        __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                        trusted_sources: [],
                        payload: htmlPayload,
                      },
                    },
                  },
                ],
              }),
            ).toString("base64"),
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

async function slots(ctx) {
  try {
    const jid = ctx.chatJid;

    const userName = ctx.pushName || ctx.msg?.pushName || "Player";

    const content = createSlotsPage(userName);

    const generated = generateWAMessageFromContent(jid, content, {
      userJid: ctx.sock.user?.id,
    });

    await ctx.sock.relayMessage(jid, generated.message, {
      messageId: generated.key.id,
    });
  } catch (error) {
    console.error("Slot error:", error);

    await ctx.reply(`❌ Slot error: ${error.message}`);
  }
}

module.exports = [
    {
    name: "snake",
    aliases: [],
    category: "games",
    description: "Play the classic Snake game.",
    execute: snake,
    },
    {
    name: "slots",
    aliases: [],
    category: "games",
    description: "Play the classic Slot Machine game.",
    execute: slots,
    },
    {
    name: "page",
    aliases: [],
    category: "games",
    description: "Play the classic Snake game.",
    execute: page,
    }
]
