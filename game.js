const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const arena = canvas.parentElement;
const $ = (id) => document.getElementById(id);
const sceneCanvas = document.getElementById('sceneCanvas');
const keys = new Set();
const mouse = { x: 0, y: 0, down: false, active: false };
const touch = { x: 0, y: 0, active: false };
let animationId;
let lastTime = 0;
let gameState = 'start';
let score = 0;
let wave = 1;
let mapIndex = 0;
let mapTransitionTimer = 0;
let waveKills = 0;
let waveTarget = 8;
let combo = 1;
let comboTimer = 0;
let waveTimer = 0;
let spawnTimer = 0;
let shake = 0;
let bossSpawnedThisWave = false;
let wallFlash = 0;
let wallCooldown = 0;
let audioContext;
let bestScore = Number(localStorage.getItem('lumenfall-best') || 0);
let particles = [];
let bullets = [];
let enemies = [];
let pickups = [];
let stars = [];
let holoScene;
let holoCamera;
let holoRenderer;
let holoGroup;
let holoParticles;

const player = { x: 0, y: 0, radius: 15, angle: 0, speed: 265, health: 100, maxHealth: 100, energy: 100, maxEnergy: 100, damage: 1, fireRate: .13, bulletSpeed: 610, pulsePower: 5, pulseRadius: 180, dashPower: 118, dashCooldown: 0, fireTimer: 0, pulseTimer: 0, pulseCooldown: 0 };
const enemyTypes = { drone: { hp: 2, speed: 61, radius: 14, color: '#ff668f', score: 100 }, hunter: { hp: 5, speed: 42, radius: 20, color: '#c975ff', score: 260 }, charger: { hp: 3, speed: 92, radius: 13, color: '#62b8ff', score: 180 }, boss: { hp: 80, speed: 25, radius: 45, color: '#ffbd70', score: 1800 } };
const mapThemes = [
  { name: 'SECTOR PRISMA', center: '16, 36, 58', edge: '7, 13, 24', grid: '111, 183, 205', wall: '#58f0d1', colors: ['#ff668f', '#c975ff', '#62b8ff'], shape: 0 },
  { name: 'YERMO FERRICO', center: '48, 27, 25', edge: '22, 13, 18', grid: '226, 132, 91', wall: '#ff9b54', colors: ['#ff7d54', '#ffc857', '#ef476f'], shape: 1 },
  { name: 'ABISMO GLACIAL', center: '16, 43, 61', edge: '5, 16, 31', grid: '104, 196, 230', wall: '#7be7ff', colors: ['#54d6ff', '#78a8ff', '#b4f4ff'], shape: 2 },
  { name: 'JARDIN UMBRIO', center: '25, 39, 32', edge: '9, 20, 18', grid: '133, 195, 130', wall: '#9cff75', colors: ['#a8e063', '#e2f07a', '#57c785'], shape: 3 }
];
const upgradePool = [
  { id: 'overclock', icon: '↯', title: 'OVERCLOCK', description: 'Reduce un 12% el intervalo entre disparos.', apply: () => { player.fireRate = Math.max(.055, player.fireRate * .88); } },
  { id: 'prism', icon: '◇', title: 'PRISM CORE', description: '+1 dano por proyectil.', apply: () => { player.damage += 1; } },
  { id: 'afterburn', icon: '»', title: 'AFTERBURN', description: '+8% velocidad de movimiento.', apply: () => { player.speed *= 1.08; } },
  { id: 'reactor', icon: '✦', title: 'REACTOR', description: '+25 energia maxima y carga completa.', apply: () => { player.maxEnergy += 25; player.energy = player.maxEnergy; } },
  { id: 'hull', icon: '+', title: 'HULL PLATING', description: '+25 casco maximo y reparacion.', apply: () => { player.maxHealth += 25; player.health = player.maxHealth; } },
  { id: 'pulse', icon: '◎', title: 'PULSE ARRAY', description: '+2.955 dano y +29.55 alcance del pulso.', apply: () => { player.pulsePower += 3 * .985; player.pulseRadius += 30 * .985; } },
  { id: 'velocity', icon: '➜', title: 'VELOCITY', description: '+20% velocidad de proyectil.', apply: () => { player.bulletSpeed *= 1.2; } },
  { id: 'vector', icon: '⇢', title: 'VECTOR DRIVE', description: '+25% distancia del dash.', apply: () => { player.dashPower *= 1.25; } }
];

function initHolographicScene() {
  if (!window.THREE || !sceneCanvas) return;
  holoScene = new THREE.Scene();
  holoCamera = new THREE.PerspectiveCamera(52, 1, 1, 900);
  holoCamera.position.set(0, 145, 210);
  holoCamera.lookAt(0, 0, 0);
  holoRenderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, alpha: true, antialias: true });
  holoRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  holoRenderer.setClearColor(0x000000, 0);
  holoGroup = new THREE.Group();
  holoScene.add(holoGroup);
  const grid = new THREE.GridHelper(520, 26, 0x1f8d9a, 0x123849);
  grid.position.y = -34;
  grid.material.transparent = true;
  grid.material.opacity = .34;
  holoGroup.add(grid);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x58f0d1, wireframe: true, transparent: true, opacity: .23 });
  [55, 105, 165].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 1.1, 8, 96), ringMaterial.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -28 + index * 5;
    ring.userData.spin = index % 2 ? -.0012 : .0018;
    holoGroup.add(ring);
  });
  for (let i = 0; i < 14; i++) {
    const towerHeight = random(22, 80);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(random(5, 15), towerHeight, random(5, 15)), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff5d9e : 0x58f0d1, wireframe: true, transparent: true, opacity: .16 }));
    tower.position.set(random(-210, 210), -32 + towerHeight / 2, random(-35, -155));
    tower.userData.phase = Math.random() * 5;
    holoGroup.add(tower);
  }
  const particlePositions = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) { particlePositions[i * 3] = random(-250, 250); particlePositions[i * 3 + 1] = random(-30, 180); particlePositions[i * 3 + 2] = random(-260, 80); }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  holoParticles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x9ceeff, size: 1.4, transparent: true, opacity: .62 }));
  holoScene.add(holoParticles);
  resizeHolographicScene();
}
function resizeHolographicScene() { if (!holoRenderer || !holoCamera) return; holoCamera.aspect = width() / Math.max(1, height()); holoCamera.updateProjectionMatrix(); holoRenderer.setSize(width(), height(), false); }
function renderHolographicScene(time) { if (!holoRenderer) return; holoGroup.rotation.y = Math.sin(time * .00008) * .04; holoGroup.children.forEach(object => { if (object.userData.spin) object.rotation.z += object.userData.spin; if (object.userData.phase) object.material.opacity = .1 + (Math.sin(time * .001 + object.userData.phase) + 1) * .05; }); holoParticles.rotation.y = time * .000025; holoRenderer.render(holoScene, holoCamera); }

function resize() { const rect = arena.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.floor(rect.width * ratio); canvas.height = Math.floor(rect.height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); if (!player.x) { player.x = rect.width / 2; player.y = rect.height / 2; } resizeHolographicScene(); }
function width() { return arena.clientWidth; }
function height() { return arena.clientHeight; }
function random(min, max) { return Math.random() * (max - min) + min; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function minionMultiplier() { return wave < 5 ? 1 : Math.min(2.2, 1.3 + (wave - 5) * .08); }
function earlyWaveMultiplier() { return wave <= 5 ? { health: 1.25, damage: 1.25, speed: 1.12 } : { health: 1, damage: 1, speed: 1 }; }
function currentMap() { return mapThemes[mapIndex % mapThemes.length]; }
function mapDifficultyMultiplier() { return 1.15 ** mapIndex; }
function shuffled(items) {
  const shuffledItems = [...items];
  for (let index = shuffledItems.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
  }
  return shuffledItems;
}
function weakenUpgrades() {
  const baseStats = { speed: 265, damage: 1, fireRate: .13, maxEnergy: 100, maxHealth: 100, bulletSpeed: 610, pulsePower: 5, pulseRadius: 180, dashPower: 118 };
  Object.entries(baseStats).forEach(([stat, base]) => { player[stat] = base + (player[stat] - base) * .95; });
  player.health = Math.min(player.health, player.maxHealth);
  player.energy = Math.min(player.energy, player.maxEnergy);
}
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }
function logEvent(text) {
  const log = $('eventLog');
  const entry = document.createElement('span');
  entry.textContent = text;
  log.prepend(entry);
  while (log.children.length > 3) log.lastElementChild.remove();
}
function beep(frequency, duration = .06, type = 'sine', volume = .025) { if (!audioContext) return; const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); }
function burst(x, y, color, count = 10, speed = 100) { for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const force = random(speed * .35, speed); particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, life: random(.3, .8), maxLife: .8, size: random(1, 3), color }); } }
function spawnEnemy(type = 'drone') {
  const side = Math.floor(Math.random() * 4);
  const margin = 48;
  const x = side === 0 ? -margin : side === 1 ? width() + margin : random(0, width());
  const y = side === 2 ? -margin : side === 3 ? height() + margin : random(0, height());
  const data = enemyTypes[type];
  const bossVariant = type === 'boss' && wave === 5 ? 'charger' : type === 'boss' && wave === 10 ? 'nova' : 'standard';
  const theme = currentMap();
  const earlyScale = earlyWaveMultiplier();
  const mapScale = mapDifficultyMultiplier();
  const globalStatScale = 1.05;
  const minionScale = type === 'boss' ? 1 : minionMultiplier();
  const bossScale = type === 'boss' ? 3 : 1;
  const bossDamageScale = type === 'boss' ? mapScale * 1.35 * earlyScale.damage * globalStatScale : 1;
  const hp = Math.ceil((data.hp + Math.floor(wave / 4)) * minionScale * mapScale * bossScale * earlyScale.health * globalStatScale);
  enemies.push({
    x, y, type, hp, maxHp: hp, radius: data.radius,
    color: type === 'boss' ? bossVariant === 'nova' ? '#c975ff' : data.color : theme.colors[type === 'hunter' ? 1 : type === 'charger' ? 2 : 0],
    speed: (data.speed + wave * 2) * mapScale * earlyScale.speed * globalStatScale * (type === 'boss' ? 1.08 : 1),
    contactDamage: (type === 'hunter' ? 17 : type === 'boss' ? 24 * 1.35 : 9) * minionScale * mapScale * earlyScale.damage * globalStatScale,
    bossDamageScale,
    mapShape: theme.shape,
    bossVariant,
    attackCooldown: bossVariant === 'charger' ? 3.2 : 4.2,
    attackState: 'idle', attackTimer: 0, attackAngle: 0, attackFlash: 0,
    wobble: Math.random() * 6, hit: 0
  });
}
function updateBossAttack(enemy, dt, targetAngle) {
  enemy.attackFlash = Math.max(0, enemy.attackFlash - dt);
  if (enemy.bossVariant === 'charger') {
    if (enemy.attackState === 'dash') {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        enemy.attackState = 'idle';
        enemy.attackCooldown = 3.2;
      }
      return { angle: enemy.attackAngle, speed: enemy.speed * 4 };
    }
    if (enemy.attackState === 'windup') {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        enemy.attackState = 'dash';
        enemy.attackTimer = .42;
      }
      return { angle: enemy.attackAngle, speed: enemy.speed * .08 };
    }
    enemy.attackCooldown -= dt;
    if (enemy.attackCooldown <= 0) {
      enemy.attackState = 'windup';
      enemy.attackTimer = .72;
      enemy.attackAngle = targetAngle;
    }
  } else if (enemy.bossVariant === 'nova') {
    if (enemy.attackState === 'windup') {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        enemy.attackState = 'idle';
        enemy.attackCooldown = 4.8;
        enemy.attackFlash = .3;
        if (distance(player, enemy) < 180) {
          player.health -= 26 * enemy.bossDamageScale;
          shake = Math.max(shake, 9);
          logEvent('NOVA // Pulso de area');
          beep(95, .22, 'sawtooth', .04);
        }
      }
    } else {
      enemy.attackCooldown -= dt;
      if (enemy.attackCooldown <= 0) {
        enemy.attackState = 'windup';
        enemy.attackTimer = 1.05;
      }
    }
  }
  return { angle: targetAngle, speed: enemy.speed };
}
function resetGame() { score = 0; wave = 1; waveKills = 0; waveTarget = 8; combo = 1; comboTimer = 0; waveTimer = 0; spawnTimer = .6; shake = 0; wallFlash = 0; wallCooldown = 0; bossSpawnedThisWave = false; bullets = []; enemies = []; pickups = []; particles = []; stars = []; player.health = 100; player.maxHealth = 100; player.energy = 100; player.maxEnergy = 100; player.speed = 265; player.damage = 1; player.fireRate = .13; player.bulletSpeed = 610; player.pulsePower = 5; player.pulseRadius = 180; player.dashPower = 118; player.dashCooldown = 0; player.fireTimer = 0; player.pulseCooldown = 0; player.x = width() / 2; player.y = height() / 2; for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * width(), y: Math.random() * height(), size: random(.5, 2), alpha: random(.2, .8), speed: random(4, 16) }); updateHud(); }
function startGame() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); mapIndex = 0; mapTransitionTimer = 0; resetGame(); gameState = 'playing'; $('startOverlay').classList.remove('active'); $('gameOverOverlay').classList.remove('active'); $('pauseOverlay').classList.remove('active'); $('upgradeOverlay').classList.remove('active'); $('objectiveText').textContent = 'ELIMINA LA OLEADA'; $('footerStatus').textContent = 'Sistema estable'; logEvent('SYS // Piloto conectado'); beep(320, .12, 'triangle', .04); }
function endGame() { gameState = 'gameover'; bestScore = Math.max(bestScore, score); localStorage.setItem('lumenfall-best', bestScore); $('finalScore').textContent = formatScore(score); $('finalWave').textContent = String(wave).padStart(2, '0'); $('bestScoreEnd').textContent = formatScore(bestScore); $('gameOverOverlay').classList.add('active'); $('upgradeOverlay').classList.remove('active'); $('footerStatus').textContent = 'Señal perdida'; beep(90, .4, 'sawtooth', .06); }
function togglePause() { if (gameState === 'playing') { gameState = 'paused'; $('pauseOverlay').classList.add('active'); } else if (gameState === 'paused') { gameState = 'playing'; $('pauseOverlay').classList.remove('active'); lastTime = performance.now(); } }
function fire() { if (player.fireTimer > 0 || gameState !== 'playing') return; player.fireTimer = player.fireRate; const angle = player.angle; bullets.push({ x: player.x + Math.cos(angle) * 21, y: player.y + Math.sin(angle) * 21, vx: Math.cos(angle) * player.bulletSpeed, vy: Math.sin(angle) * player.bulletSpeed, life: 1, damage: player.damage }); beep(270, .035, 'square', .018); burst(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20, '#58f0d1', 3, 35); }
function pulse() { if (gameState !== 'playing' || player.energy < 35 || player.pulseCooldown > 0) return; player.energy -= 35; player.pulseCooldown = 7; shake = 12; burst(player.x, player.y, '#ffd37a', 34, 250); enemies.forEach(enemy => { const d = distance(player, enemy); if (d < player.pulseRadius) { enemy.hp -= player.pulsePower; enemy.hit = .2; if (enemy.hp <= 0) destroyEnemy(enemy); } }); logEvent('CORE // Pulso liberado'); beep(110, .25, 'sine', .05); }
function moveWithWalls(deltaX, deltaY) { const inset = 28; const nextX = clamp(player.x + deltaX, inset, width() - inset); const nextY = clamp(player.y + deltaY, inset, height() - inset); const hitX = nextX !== player.x + deltaX; const hitY = nextY !== player.y + deltaY; player.x = nextX; player.y = nextY; if ((hitX || hitY) && wallCooldown <= 0) { wallFlash = 1; wallCooldown = .12; shake = Math.max(shake, 2); burst(player.x, player.y, '#58f0d1', 7, 55); beep(115, .045, 'square', .012); } }
function dash() { if (gameState !== 'playing' || player.energy < 20 || player.dashCooldown > 0) return; let dashX = 0; let dashY = 0; if (keys.has('w') || keys.has('arrowup')) dashY--; if (keys.has('s') || keys.has('arrowdown')) dashY++; if (keys.has('a') || keys.has('arrowleft')) dashX--; if (keys.has('d') || keys.has('arrowright')) dashX++; if (!dashX && !dashY) { dashX = Math.cos(player.angle); dashY = Math.sin(player.angle); } const magnitude = Math.hypot(dashX, dashY) || 1; player.energy -= 20; player.dashCooldown = 1.2; moveWithWalls(dashX / magnitude * player.dashPower, dashY / magnitude * player.dashPower); burst(player.x, player.y, '#ffd37a', 18, 160); logEvent('VECTOR // Dash ejecutado'); beep(680, .08, 'triangle', .035); }
function update(dt) { player.fireTimer = Math.max(0, player.fireTimer - dt); player.pulseCooldown = Math.max(0, player.pulseCooldown - dt); player.energy = Math.min(player.maxEnergy, player.energy + dt * 1.5); comboTimer -= dt; if (comboTimer <= 0) combo = 1; waveTimer += dt; if (waveKills >= waveTarget && enemies.length === 0) openUpgradeScreen();
  wallFlash = Math.max(0, wallFlash - dt * 3); wallCooldown = Math.max(0, wallCooldown - dt); player.dashCooldown = Math.max(0, player.dashCooldown - dt); let moveX = 0, moveY = 0; if (keys.has('w') || keys.has('arrowup')) moveY--; if (keys.has('s') || keys.has('arrowdown')) moveY++; if (keys.has('a') || keys.has('arrowleft')) moveX--; if (keys.has('d') || keys.has('arrowright')) moveX++; if (touch.active) { moveX += touch.x; moveY += touch.y; } const magnitude = Math.hypot(moveX, moveY) || 1; if (moveX || moveY) { moveWithWalls(moveX / magnitude * player.speed * dt, moveY / magnitude * player.speed * dt); burst(player.x, player.y, '#58f0d1', 1, 12); }
  if (mouse.active) player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x); if (mouse.down) fire(); if (keys.has(' ')) pulse();
  spawnTimer -= dt; if (spawnTimer <= 0 && waveKills < waveTarget) { if (wave % 5 === 0 && !bossSpawnedThisWave) { spawnEnemy('boss'); bossSpawnedThisWave = true; logEvent('ALERT // BOSS SIGNAL'); } else { const roll = Math.random(); spawnEnemy(roll < Math.min(.2, wave / 30) ? 'hunter' : roll < Math.min(.38, wave / 18) ? 'charger' : 'drone'); } spawnTimer = Math.max(.2, .9 - wave * .025); }
  bullets.forEach(bullet => { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; }); bullets = bullets.filter(b => b.life > 0 && b.x > -30 && b.x < width() + 30 && b.y > -30 && b.y < height() + 30);
  enemies.forEach(enemy => { const targetAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x); const movement = enemy.type === 'boss' ? updateBossAttack(enemy, dt, targetAngle) : { angle: targetAngle, speed: enemy.speed }; const weave = enemy.type === 'charger' ? Math.sin(enemy.wobble * 2) * .8 : 0; enemy.x += (Math.cos(movement.angle) - Math.sin(movement.angle) * weave) * movement.speed * dt; enemy.y += (Math.sin(movement.angle) + Math.cos(movement.angle) * weave) * movement.speed * dt; enemy.wobble += dt * (enemy.type === 'charger' ? 9 : 5); enemy.hit = Math.max(0, enemy.hit - dt); if (distance(player, enemy) < player.radius + enemy.radius) { const dashDamage = enemy.bossVariant === 'charger' && enemy.attackState === 'dash' ? 1.5 : 1; player.health -= enemy.contactDamage * dashDamage * dt; shake = enemy.type === 'boss' ? 7 : 4; } });
  bullets.forEach(bullet => enemies.forEach(enemy => { if (enemy.hp > 0 && distance(bullet, enemy) < enemy.radius + 5 && bullet.life > 0) { bullet.life = 0; enemy.hp -= bullet.damage; enemy.hit = .1; burst(bullet.x, bullet.y, enemy.color, 4, 40); if (enemy.hp <= 0) destroyEnemy(enemy); } })); enemies = enemies.filter(enemy => enemy.hp > 0); pickups.forEach(item => { item.life -= dt; if (distance(player, item) < 22) { if (item.kind === 'health') player.health = Math.min(player.maxHealth, player.health + 22); else player.energy = Math.min(player.maxEnergy, player.energy + 35); item.life = 0; beep(item.kind === 'health' ? 500 : 720, .1, 'sine', .04); } }); pickups = pickups.filter(item => item.life > 0);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.life -= dt; }); particles = particles.filter(p => p.life > 0); if (player.health <= 0) endGame(); updateHud(); }
function destroyEnemy(enemy) { if (enemy.dead) return; enemy.dead = true; const data = enemyTypes[enemy.type]; score += data.score * combo; waveKills++; combo = Math.min(12, combo + 1); comboTimer = 2.7; burst(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 45 : 16, enemy.type === 'boss' ? 300 : 130); shake = enemy.type === 'boss' ? 15 : 3; if (Math.random() < (enemy.type === 'boss' ? .9 : .14)) pickups.push({ x: enemy.x, y: enemy.y, kind: Math.random() < .5 ? 'health' : 'energy', life: 8 }); logEvent(`${enemy.type === 'boss' ? 'BOSS DOWN' : 'KILL'} // +${data.score * combo}`); beep(enemy.type === 'boss' ? 80 : 170 + combo * 12, .08, 'sawtooth', .025); }
function openUpgradeScreen() {
  gameState = 'upgrade';
  const choices = shuffled(upgradePool).slice(0, 3);
  const choiceContainer = $('upgradeChoices');
  const choiceElements = choices.map(upgrade => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.dataset.upgrade = upgrade.id;
    card.addEventListener('click', () => selectUpgrade(upgrade.id));

    const icon = document.createElement('b');
    icon.className = 'upgrade-icon';
    icon.textContent = upgrade.icon;

    const title = document.createElement('strong');
    title.textContent = upgrade.title;

    const description = document.createElement('span');
    description.textContent = upgrade.description;

    card.append(icon, title, description);
    return card;
  });
  choiceContainer.replaceChildren(...choiceElements);
  $('upgradeOverlay').classList.add('active');
  $('objectiveText').textContent = 'SISTEMA EN EVOLUCION';
  logEvent('SYS // Mejora disponible');
  beep(520, .18, 'triangle', .04);
}
function selectUpgrade(id) { const upgrade = upgradePool.find(item => item.id === id); if (!upgrade) return; upgrade.apply(); $('upgradeOverlay').classList.remove('active'); nextWave(); }
function nextWave() {
  wave++;
  waveKills = 0;
  waveTarget = 8 + (wave - 1) * 5;
  waveTimer = 0;
  spawnTimer = .8;
  bossSpawnedThisWave = false;
  player.health = Math.min(player.maxHealth, player.health + 12);
  player.energy = player.maxEnergy;
  const nextMapIndex = Math.floor((wave - 1) / 10);
  if (nextMapIndex > mapIndex) {
    mapIndex = nextMapIndex;
    weakenUpgrades();
    mapTransitionTimer = 3.2;
    gameState = 'mapTransition';
    $('objectiveText').textContent = 'CAMBIO DE SECTOR';
    logEvent(`MAP // ${currentMap().name}`);
  } else {
    gameState = 'playing';
    $('objectiveText').textContent = wave % 5 === 0 ? 'NEUTRALIZA EL BOSS' : 'ELIMINA LA OLEADA';
  }
  logEvent(`WAVE ${String(wave).padStart(2, '0')} // INCOMING`);
  beep(440, .2, 'triangle', .04);
}
function updateHud() { $('scoreValue').textContent = formatScore(score); $('waveValue').textContent = String(wave).padStart(2, '0'); $('comboValue').textContent = `x${combo}`; $('healthBar').style.width = `${Math.max(0, player.health / player.maxHealth * 100)}%`; $('healthText').textContent = `${Math.max(0, Math.ceil(player.health))}%`; $('energyBar').style.width = `${player.energy / player.maxEnergy * 100}%`; $('energyText').textContent = `${Math.ceil(player.energy)}%`; $('waveProgress').style.width = `${Math.min(100, waveKills / waveTarget * 100)}%`; $('waveHint').textContent = `${waveKills} / ${waveTarget} firmas neutralizadas`; $('bestScoreStart').textContent = formatScore(bestScore); $('rankValue').textContent = score > 15000 ? 'SPECTRE' : score > 6000 ? 'ACE' : score > 2000 ? 'PILOT' : 'ROOKIE'; }
function draw() { const w = width(), h = height(); const theme = currentMap(); ctx.clearRect(0, 0, w, h); ctx.save(); if (shake > 0) { ctx.translate(random(-shake, shake), random(-shake, shake)); shake *= .88; } const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .7); gradient.addColorStop(0, `rgba(${theme.center}, .76)`); gradient.addColorStop(1, `rgba(${theme.edge}, .56)`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h); drawGrid(w, h); drawWalls(w, h); stars.forEach(star => { star.y += star.speed * .008; if (star.y > h) star.y = 0; ctx.globalAlpha = star.alpha; ctx.fillStyle = theme.colors[2]; ctx.fillRect(star.x, star.y, star.size, star.size); }); ctx.globalAlpha = 1; pickups.forEach(drawPickup); bullets.forEach(drawBullet); enemies.forEach(drawEnemy); drawPlayer(); particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; ctx.restore(); }
function drawGrid(w, h) { const theme = currentMap(); ctx.strokeStyle = `rgba(${theme.grid}, .09)`; ctx.lineWidth = 1; const size = 46; for (let x = 0; x < w; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y < h; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.strokeStyle = `${theme.wall}55`; ctx.setLineDash([3, 10]); ctx.strokeRect(18, 18, w - 36, h - 36); ctx.setLineDash([]); }
function drawWalls(w, h) { const inset = 28; const color = currentMap().wall; ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = .12 + wallFlash * .65; ctx.shadowBlur = wallFlash * 18; ctx.shadowColor = color; ctx.lineWidth = wallFlash > .1 ? 3 : 1; ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2); if (wallFlash > .05) { ctx.fillStyle = color; ctx.globalAlpha = wallFlash * .05; ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2); } ctx.restore(); }
function drawPlayer() { ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle); ctx.shadowBlur = 26; ctx.shadowColor = '#58f0d1'; ctx.fillStyle = 'rgba(88,240,209,.26)'; ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-35, 0); ctx.lineTo(-18, 5); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#58f0d1'; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-11, -15); ctx.lineTo(-6, -3); ctx.lineTo(-18, -9); ctx.lineTo(-13, 0); ctx.lineTo(-18, 9); ctx.lineTo(-6, 3); ctx.lineTo(-11, 15); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#dffff8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-11, -15); ctx.lineTo(-6, -3); ctx.lineTo(-18, -9); ctx.moveTo(-13, 0); ctx.lineTo(-18, 9); ctx.lineTo(-6, 3); ctx.lineTo(-11, 15); ctx.stroke(); ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.ellipse(2, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#164d60'; ctx.beginPath(); ctx.ellipse(3, -1, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
function drawBullet(bullet) { ctx.fillStyle = '#dffff8'; ctx.shadowBlur = 10; ctx.shadowColor = '#58f0d1'; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.wobble);
  ctx.shadowBlur = enemy.hit ? 25 : 13;
  ctx.shadowColor = enemy.color;
  ctx.strokeStyle = enemy.color;
  ctx.lineWidth = enemy.type === 'boss' ? enemy.bossVariant === 'nova' ? 4 : 3 : 2;
  ctx.fillStyle = enemy.hit ? '#fff' : 'rgba(9,15,29,.92)';
  ctx.beginPath();
  if (enemy.type !== 'boss' && enemy.mapShape === 1) {
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 - Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * enemy.radius, Math.sin(angle) * enemy.radius);
    }
  } else if (enemy.type !== 'boss' && enemy.mapShape === 2) {
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * enemy.radius, Math.sin(angle) * enemy.radius);
    }
  } else if (enemy.type !== 'boss' && enemy.mapShape === 3) {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const radius = enemy.radius * (i % 2 ? .62 : 1);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  } else if (enemy.type === 'hunter') {
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius);
    ctx.lineTo(-enemy.radius, 0);
  } else if (enemy.type === 'charger') {
    ctx.moveTo(enemy.radius, 0);
    ctx.lineTo(-enemy.radius, -enemy.radius * .8);
    ctx.lineTo(-enemy.radius * .4, 0);
    ctx.lineTo(-enemy.radius, enemy.radius * .8);
  } else if (enemy.type === 'boss' && enemy.bossVariant === 'nova') {
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const radius = enemy.radius * (i % 2 ? .72 : 1);
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  } else if (enemy.type === 'boss') {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      ctx.lineTo(Math.cos(angle) * enemy.radius, Math.sin(angle) * enemy.radius);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      ctx.lineTo(Math.cos(angle) * enemy.radius, Math.sin(angle) * enemy.radius);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = enemy.bossVariant === 'nova' ? '#58f0d1' : enemy.color;
  ctx.globalAlpha = .55;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * .56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.type === 'boss' ? 8 + Math.sin(enemy.wobble) * 3 : 4 + Math.sin(enemy.wobble) * 2, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.type === 'boss' && enemy.bossVariant === 'nova') {
    ctx.strokeStyle = '#58f0d1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * .86, -enemy.wobble, -enemy.wobble + Math.PI * 1.4);
    ctx.stroke();
  } else if (enemy.type === 'boss') {
    ctx.strokeStyle = '#ffd37a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * .78, enemy.wobble, enemy.wobble + Math.PI * 1.35);
    ctx.stroke();
  }
  if (enemy.type === 'boss' && enemy.bossVariant === 'charger' && enemy.attackState === 'windup') {
    ctx.save();
    ctx.rotate(enemy.attackAngle - enemy.wobble);
    ctx.strokeStyle = '#ffd37a';
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(enemy.radius + 300, 0);
    ctx.stroke();
    ctx.restore();
  }
  if (enemy.type === 'boss' && enemy.bossVariant === 'nova' && (enemy.attackState === 'windup' || enemy.attackFlash > 0)) {
    const radius = enemy.attackFlash > 0 ? 180 : 180 * (1 - enemy.attackTimer / 1.05);
    ctx.strokeStyle = '#c975ff';
    ctx.globalAlpha = enemy.attackFlash > 0 ? enemy.attackFlash / .3 : .8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(-enemy.radius, enemy.radius + 7, enemy.radius * 2, 2);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(-enemy.radius, enemy.radius + 7, enemy.radius * 2 * enemy.hp / enemy.maxHp, 2);
  }
  ctx.restore();
}
function drawPickup(item) { ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(performance.now() / 700); ctx.strokeStyle = item.kind === 'health' ? '#ff668f' : '#ffd37a'; ctx.shadowBlur = 15; ctx.shadowColor = ctx.strokeStyle; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14); ctx.fillStyle = ctx.strokeStyle; ctx.font = 'bold 12px Space Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.kind === 'health' ? '+' : '✦', 0, 1); ctx.restore(); }
function drawMapTransition(w, h) {
  const progress = 1 - mapTransitionTimer / 3.2;
  const theme = currentMap();
  const centerX = w / 2;
  const centerY = h / 2;
  const pulse = Math.sin(performance.now() * .004) * 8;
  ctx.save();
  ctx.fillStyle = `rgba(3, 8, 17, ${.82 + Math.sin(progress * Math.PI) * .12})`;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = theme.wall;
  ctx.lineWidth = 1;
  ctx.globalAlpha = .45;
  [70, 105, 145].forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius + pulse * (index + 1) / 3, performance.now() * .0003 * (index % 2 ? -1 : 1), Math.PI * 1.6);
    ctx.stroke();
  });
  ctx.globalAlpha = .8;
  ctx.fillStyle = theme.wall;
  ctx.textAlign = 'center';
  ctx.font = '10px Space Mono';
  ctx.fillText('SECTOR RECONFIGURATION', 0, -48);
  ctx.font = '700 30px Barlow Condensed';
  ctx.fillText(theme.name, 0, 0);
  ctx.globalAlpha = .7;
  ctx.font = '10px Space Mono';
  ctx.fillText(`MAP ${String(mapIndex + 1).padStart(2, '0')}  /  AMENAZA +15%  /  MEJORAS -5%`, 0, 32);
  ctx.globalAlpha = .4;
  ctx.fillRect(-110, 56, 220, 2);
  ctx.globalAlpha = .95;
  ctx.fillRect(-110, 56, 220 * progress, 2);
  ctx.restore();
}
function loop(time) {
  const dt = Math.min(.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  if (gameState === 'playing') update(dt);
  if (gameState === 'mapTransition') {
    mapTransitionTimer = Math.max(0, mapTransitionTimer - dt);
    if (mapTransitionTimer === 0) {
      gameState = 'playing';
      $('objectiveText').textContent = wave % 5 === 0 ? 'NEUTRALIZA EL BOSS' : 'ELIMINA LA OLEADA';
    }
  }
  renderHolographicScene(time);
  draw();
  if (gameState === 'mapTransition') drawMapTransition(width(), height());
  animationId = requestAnimationFrame(loop);
}
function setMousePosition(event) { const rect = canvas.getBoundingClientRect(); mouse.x = event.clientX - rect.left; mouse.y = event.clientY - rect.top; mouse.active = true; const crosshair = $('crosshair'); crosshair.style.left = `${mouse.x}px`; crosshair.style.top = `${mouse.y}px`; }
canvas.addEventListener('mousemove', setMousePosition); canvas.addEventListener('mousedown', () => { mouse.down = true; }); window.addEventListener('mouseup', () => { mouse.down = false; }); window.addEventListener('resize', resize);
window.addEventListener('keydown', event => { const key = event.key.toLowerCase(); if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) { event.preventDefault(); keys.add(key); } if (key === 'shift') { event.preventDefault(); dash(); } if (gameState === 'upgrade' && ['1', '2', '3'].includes(key)) { const choice = $('upgradeChoices').querySelectorAll('.upgrade-card')[Number(key) - 1]; if (choice) choice.click(); } if (key === 'escape' || key === 'p') togglePause(); }); window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
$('startButton').addEventListener('click', startGame); $('resumeButton').addEventListener('click', togglePause); $('pauseButton').addEventListener('click', togglePause); $('restartButton').addEventListener('click', startGame); $('restartPauseButton').addEventListener('click', startGame); $('touchPulse').addEventListener('touchstart', event => { event.preventDefault(); pulse(); }); $('touchDash').addEventListener('touchstart', event => { event.preventDefault(); dash(); });
const joystick = $('joystick'); joystick.addEventListener('touchmove', event => { const rect = joystick.getBoundingClientRect(); const point = event.touches[0]; touch.x = clamp((point.clientX - (rect.left + rect.width / 2)) / 28, -1, 1); touch.y = clamp((point.clientY - (rect.top + rect.height / 2)) / 28, -1, 1); touch.active = true; joystick.firstElementChild.style.transform = `translate(${touch.x * 20}px, ${touch.y * 20}px)`; }); ['touchend','touchcancel'].forEach(name => joystick.addEventListener(name, () => { touch.active = false; touch.x = 0; touch.y = 0; joystick.firstElementChild.style.transform = ''; }));
initHolographicScene(); resize(); resetGame(); updateHud(); requestAnimationFrame(loop);
