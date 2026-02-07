// =============================================
//  AEGIS DEFENSE COMMAND - Enhanced Game Engine
// =============================================

// ── Boot sequence ────────────────────────────
(function bootSequence() {
    const bar = document.getElementById('boot-progress-bar');
    const status = document.getElementById('boot-status');
    const enterBtn = document.getElementById('enter-btn');
    const messages = [
        'LOADING RADAR SUBSYSTEMS...',
        'CALIBRATING SAM BATTERIES...',
        'INITIALIZING CIWS PHALANX...',
        'CHARGING DIRECTED ENERGY WEAPON...',
        'LOADING THREAT DATABASE...',
        'ESTABLISHING SATELLITE LINK...',
        'SHIELD GENERATOR ONLINE...',
        'ALL SYSTEMS NOMINAL'
    ];
    let step = 0;
    const iv = setInterval(() => {
        if (step >= messages.length) {
            clearInterval(iv);
            bar.style.width = '100%';
            status.textContent = 'READY';
            enterBtn.style.display = 'inline-block';
            return;
        }
        bar.style.width = ((step + 1) / messages.length * 100) + '%';
        status.textContent = messages[step];
        step++;
    }, 400);

    enterBtn.addEventListener('click', () => {
        document.getElementById('boot-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        window.game = new AegisDefenseGame();
    });
})();

// ── Utility ──────────────────────────────────
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randRange = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ── Constants ────────────────────────────────
const THREAT_DEFS = {
    icbm:      { label: 'ICBM',           color: '#ff4444', glow: '#ff000088', hp: 200, speed: 3.5,  size: 7,  score: 300, priority: 5, damage: 35 },
    cruise:    { label: 'Cruise Missile',  color: '#ff8800', glow: '#ff880088', hp: 80,  speed: 4.0,  size: 5,  score: 200, priority: 4, damage: 20 },
    hypersonic:{ label: 'Hypersonic',      color: '#ff00ff', glow: '#ff00ff88', hp: 120, speed: 7.0,  size: 5,  score: 400, priority: 5, damage: 30 },
    drone:     { label: 'Drone Swarm',     color: '#6688ff', glow: '#6688ff88', hp: 40,  speed: 1.8,  size: 4,  score: 60,  priority: 2, damage: 8  },
    stealth:   { label: 'Stealth Bomber',  color: '#44ffaa', glow: '#44ffaa88', hp: 160, speed: 2.5,  size: 7,  score: 350, priority: 3, damage: 25 },
    fighter:   { label: 'Fighter Jet',     color: '#ffff44', glow: '#ffff4488', hp: 100, speed: 4.5,  size: 6,  score: 150, priority: 3, damage: 15 },
    seaMissile:{ label: 'Sea Missile',     color: '#ff4488', glow: '#ff448888', hp: 90,  speed: 5.0,  size: 5,  score: 250, priority: 4, damage: 22 },
    orbital:   { label: 'Orbital Strike',  color: '#00ffff', glow: '#00ffff88', hp: 250, speed: 2.0,  size: 8,  score: 500, priority: 5, damage: 50 }
};

const WEAPON_DEFS = {
    sam:     { ammo: 15, maxAmmo: 15, range: 320, speed: 9,  damage: 110, cooldownMax: 30,  color: '#00ff66', trailLen: 14 },
    ciws:    { ammo: 60, maxAmmo: 60, range: 160, speed: 18, damage: 45,  cooldownMax: 6,   color: '#ffdd00', trailLen: 6  },
    laser:   { ammo: Infinity, maxAmmo: Infinity, range: 440, speed: 50, damage: 80, cooldownMax: 150, color: '#cc44ff', trailLen: 0 },
    emp:     { ammo: 3,  maxAmmo: 3,  range: 180, speed: 0,  damage: 0,   cooldownMax: 300, color: '#ffaa00', trailLen: 0  },
    railgun: { ammo: 8,  maxAmmo: 8,  range: 500, speed: 40, damage: 250, cooldownMax: 120, color: '#4499ff', trailLen: 20 },
    shield:  { ammo: 5,  maxAmmo: 5,  range: 0,   speed: 0,  damage: 0,   cooldownMax: 180, color: '#00ffaa', trailLen: 0  }
};

// ── Main Game Class ──────────────────────────
class AegisDefenseGame {
    constructor() {
        this.canvas = document.getElementById('radar-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // State
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.wave = 1;
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.bestCombo = 1;
        this.totalIntercepted = 0;
        this.totalMissed = 0;
        this.totalFired = 0;
        this.elapsedFrames = 0;
        this.selectedWeapon = 'sam';
        this.selectedTarget = null;
        this.aiEnabled = false;
        this.aiMode = 'manual';

        // Base
        this.baseHealth = 100;
        this.baseMaxHealth = 100;
        this.shieldHealth = 100;
        this.shieldMaxHealth = 100;
        this.shieldActive = true;

        // Weapons runtime
        this.weapons = {};
        for (const [k, v] of Object.entries(WEAPON_DEFS)) {
            this.weapons[k] = { ammo: v.ammo, cooldown: 0 };
        }

        // Objects
        this.threats = [];
        this.projectiles = [];
        this.particles = [];
        this.explosions = [];
        this.floatingTexts = [];
        this.laserBeams = [];
        this.empWaves = [];

        // Radar sweep
        this.radarAngle = 0;

        // Stars (background)
        this.stars = Array.from({ length: 200 }, () => ({
            x: Math.random(), y: Math.random(), s: randRange(0.3, 1.5), b: Math.random()
        }));

        // City buildings
        this.buildings = this.generateBuildings();

        // FPS
        this.fps = 60;
        this.frameCount = 0;
        this.fpsTimer = performance.now();

        this.center = { x: 0, y: 0 };
        this.updateCenter();

        this.bindEvents();
        this.loop(performance.now());
    }

    resizeCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;
        this.updateCenter();
        this.buildings = this.generateBuildings();
    }

    updateCenter() {
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    }

    generateBuildings() {
        const blds = [];
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * TAU + randRange(-0.1, 0.1);
            const r = randRange(18, 45);
            const w = randRange(6, 14);
            const h = randRange(12, 30);
            blds.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, w, h, intact: true });
        }
        return blds;
    }

    // ── Events ───────────────────────────────
    bindEvents() {
        this.canvas.addEventListener('click', e => this.onCanvasClick(e));
        this.canvas.addEventListener('contextmenu', e => { e.preventDefault(); });

        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectWeapon(btn.dataset.weapon));
        });

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('ai-toggle').addEventListener('click', () => this.toggleAI());
        document.getElementById('ai-mode').addEventListener('click', () => this.cycleAIMode());
        document.getElementById('restart-btn').addEventListener('click', () => { this.resetGame(); this.startGame(); });
    }

    onCanvasClick(e) {
        if (!this.running || this.paused || this.gameOver) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Try to select a threat
        const clicked = this.threats.find(t => dist(t, { x: mx, y: my }) < t.size + 14);
        if (clicked) {
            this.selectedTarget = clicked;
            this.updateTargetInfo();
            return;
        }
        // Fire at closest threat near click or at click point
        const nearby = this.threats.filter(t => dist(t, { x: mx, y: my }) < 60).sort((a, b) => dist(a, { x: mx, y: my }) - dist(b, { x: mx, y: my }));
        if (nearby.length) {
            this.fireWeapon(nearby[0]);
        } else {
            this.fireWeapon({ x: mx, y: my });
        }
    }

    selectWeapon(type) {
        if (!WEAPON_DEFS[type]) return;
        this.selectedWeapon = type;
        document.querySelectorAll('.weapon-btn').forEach(b => b.classList.toggle('active', b.dataset.weapon === type));
    }

    // ── Weapon firing ────────────────────────
    fireWeapon(target) {
        const type = this.selectedWeapon;
        const def = WEAPON_DEFS[type];
        const state = this.weapons[type];
        if (state.cooldown > 0) return;
        if (state.ammo !== Infinity && state.ammo <= 0) return;

        // Shield boost is special
        if (type === 'shield') {
            this.shieldHealth = clamp(this.shieldHealth + 40, 0, this.shieldMaxHealth);
            this.shieldActive = true;
            if (state.ammo !== Infinity) state.ammo--;
            state.cooldown = def.cooldownMax;
            this.addLog('Shield recharged +40%', 'system-entry');
            this.spawnParticles(this.center.x, this.center.y, '#00ffaa', 30, 60);
            this.updateUI();
            return;
        }

        // EMP is area effect centered on base
        if (type === 'emp') {
            if (state.ammo !== Infinity) state.ammo--;
            state.cooldown = def.cooldownMax;
            this.totalFired++;
            this.empWaves.push({ x: this.center.x, y: this.center.y, radius: 0, maxRadius: def.range, life: 40 });
            this.threats.forEach(t => {
                if (dist(this.center, t) < def.range) {
                    t.jammed = true;
                    t.jammedTime = 180;
                    t.health -= 20;
                }
            });
            this.addLog('EMP BURST DEPLOYED', 'warning');
            this.updateUI();
            return;
        }

        const d = dist(this.center, target);
        if (d > def.range && def.range > 0) return;

        // Laser is instant beam
        if (type === 'laser') {
            state.cooldown = def.cooldownMax;
            this.totalFired++;
            this.laserBeams.push({
                x1: this.center.x, y1: this.center.y,
                x2: target.x, y2: target.y,
                life: 15, color: def.color
            });
            // Damage threats near target
            this.threats.forEach(t => {
                if (dist(t, target) < 25) {
                    t.health -= def.damage;
                    this.spawnParticles(t.x, t.y, def.color, 8, 20);
                }
            });
            this.updateUI();
            return;
        }

        // Projectile weapons
        if (state.ammo !== Infinity) state.ammo--;
        state.cooldown = def.cooldownMax;
        this.totalFired++;

        const angle = Math.atan2(target.y - this.center.y, target.x - this.center.x);
        this.projectiles.push({
            x: this.center.x, y: this.center.y,
            tx: target.x, ty: target.y,
            vx: Math.cos(angle) * def.speed,
            vy: Math.sin(angle) * def.speed,
            type, damage: def.damage,
            trail: [], trailLen: def.trailLen,
            life: 300
        });
        this.updateUI();
    }

    // ── Game flow ────────────────────────────
    startGame() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.gameOver = false;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        this.spawnWave();
    }

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pause-btn').textContent = this.paused ? '▶ RESUME' : '⏸ PAUSE';
    }

    resetGame() {
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.wave = 1;
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.bestCombo = 1;
        this.totalIntercepted = 0;
        this.totalMissed = 0;
        this.totalFired = 0;
        this.elapsedFrames = 0;
        this.baseHealth = this.baseMaxHealth;
        this.shieldHealth = this.shieldMaxHealth;
        this.shieldActive = true;
        this.threats = [];
        this.projectiles = [];
        this.particles = [];
        this.explosions = [];
        this.floatingTexts = [];
        this.laserBeams = [];
        this.empWaves = [];
        this.selectedTarget = null;
        this.buildings = this.generateBuildings();

        for (const [k, v] of Object.entries(WEAPON_DEFS)) {
            this.weapons[k] = { ammo: v.ammo, cooldown: 0 };
        }

        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = '⏸ PAUSE';
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('alert-banner').classList.add('hidden');
        document.getElementById('alert-indicator').classList.remove('danger');
        document.getElementById('alert-text').textContent = 'STANDBY';

        const logDiv = document.getElementById('threat-log');
        logDiv.innerHTML = '<div class="log-entry system-entry">SYS: Defense grid reset.</div>';

        this.updateUI();
        this.updateTargetInfo();
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-wave').textContent = this.wave - 1;
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('start-btn').disabled = true;
    }

    // ── Wave management ──────────────────────
    spawnWave() {
        if (!this.running || this.gameOver) return;
        const count = Math.min(3 + this.wave * 2, 24);
        const waveTypes = this.getWaveTypes();

        this.showWaveAnnounce();
        this.addLog(`━━ WAVE ${this.wave} ━━  ${count} threats inbound`, 'warning');

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!this.running || this.gameOver) return;
                this.spawnThreat(waveTypes);
            }, i * randRange(600, 1800));
        }
    }

    getWaveTypes() {
        const w = this.wave;
        const types = ['fighter', 'cruise', 'drone'];
        if (w >= 2) types.push('icbm');
        if (w >= 3) types.push('seaMissile');
        if (w >= 4) types.push('stealth');
        if (w >= 5) types.push('hypersonic');
        if (w >= 7) types.push('orbital');
        return types;
    }

    spawnThreat(allowedTypes) {
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const def = THREAT_DEFS[type];
        const W = this.canvas.width, H = this.canvas.height;
        const cx = this.center.x, cy = this.center.y;

        let x, y;
        // Orbital comes from top center, seaMissile from bottom
        if (type === 'orbital') {
            x = cx + randRange(-W * 0.3, W * 0.3);
            y = -40;
        } else if (type === 'seaMissile') {
            x = Math.random() < 0.5 ? randRange(-40, -10) : randRange(W + 10, W + 40);
            y = H * 0.6 + randRange(0, H * 0.35);
        } else {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) { x = randRange(0, W); y = -30; }
            else if (edge === 1) { x = W + 30; y = randRange(0, H); }
            else if (edge === 2) { x = randRange(0, W); y = H + 30; }
            else { x = -30; y = randRange(0, H); }
        }

        const angle = Math.atan2(cy - y, cx - x) + randRange(-0.4, 0.4);
        const speedMult = 1 + (this.wave - 1) * 0.05;
        const hpMult = 1 + (this.wave - 1) * 0.1;

        const threat = {
            id: Date.now() + Math.random(),
            type, def,
            x, y,
            vx: Math.cos(angle) * def.speed * speedMult,
            vy: Math.sin(angle) * def.speed * speedMult,
            health: Math.round(def.hp * hpMult),
            maxHealth: Math.round(def.hp * hpMult),
            speed: def.speed * speedMult,
            size: def.size,
            color: def.color,
            glow: def.glow,
            jammed: false,
            jammedTime: 0,
            stealthVisible: type !== 'stealth',
            age: 0,
            trail: []
        };

        this.threats.push(threat);
        this.addLog(`DETECT: ${def.label} inbound`, 'hostile');
    }

    showWaveAnnounce() {
        const el = document.getElementById('wave-announce');
        document.getElementById('wave-announce-text').textContent = `WAVE ${this.wave}`;
        const subs = [
            'INCOMING THREATS DETECTED',
            'DEFENSE PERIMETER BREACHED',
            'HOSTILE SIGNATURES INBOUND',
            'MULTIPLE CONTACTS ON RADAR',
            'BRACE FOR IMPACT'
        ];
        document.getElementById('wave-announce-sub').textContent = subs[Math.floor(Math.random() * subs.length)];
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 2500);
    }

    // ── Update loop ──────────────────────────
    update() {
        if (!this.running || this.paused || this.gameOver) return;
        this.elapsedFrames++;

        // Combo decay
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.combo = 1;
        }

        // Radar sweep
        this.radarAngle = (this.radarAngle + 0.012) % TAU;

        // Stealth reveal under radar sweep
        this.threats.forEach(t => {
            if (t.type === 'stealth') {
                const ta = Math.atan2(t.y - this.center.y, t.x - this.center.x);
                let diff = ((ta - this.radarAngle) % TAU + TAU) % TAU;
                t.stealthVisible = diff < 0.3 || t.health < t.maxHealth * 0.5;
            }
        });

        // Update threats
        this.threats.forEach(t => {
            t.age++;
            if (t.jammed) {
                t.jammedTime--;
                if (t.jammedTime <= 0) t.jammed = false;
                // Jammed threats drift randomly
                t.x += randRange(-0.5, 0.5);
                t.y += randRange(-0.5, 0.5);
            } else {
                // Home towards center with slight wobble
                const toCenter = Math.atan2(this.center.y - t.y, this.center.x - t.x);
                const current = Math.atan2(t.vy, t.vx);
                let steer = toCenter - current;
                if (steer > Math.PI) steer -= TAU;
                if (steer < -Math.PI) steer += TAU;
                const steerRate = t.type === 'hypersonic' ? 0.03 : t.type === 'drone' ? 0.06 : 0.02;
                const newAngle = current + clamp(steer, -steerRate, steerRate);
                t.vx = Math.cos(newAngle) * t.speed;
                t.vy = Math.sin(newAngle) * t.speed;
                t.x += t.vx;
                t.y += t.vy;
            }

            // Trail
            t.trail.push({ x: t.x, y: t.y });
            if (t.trail.length > 12) t.trail.shift();

            // Drone spawns particles
            if (t.type === 'drone' && t.age % 8 === 0) {
                this.particles.push({ x: t.x, y: t.y, vx: randRange(-0.5, 0.5), vy: randRange(-0.5, 0.5), life: 15, maxLife: 15, color: t.color, size: 1.5 });
            }

            // Check if hit base
            if (dist(t, this.center) < 30) {
                this.applyDamage(t.def.damage);
                this.createExplosion(t.x, t.y, t.color, 40);
                this.spawnParticles(t.x, t.y, t.color, 20, 40);
                this.shakeScreen();
                t.health = 0;
                this.totalMissed++;
                this.addLog(`IMPACT: ${t.def.label} hit base!`, 'hostile');

                // Damage nearby buildings
                this.buildings.forEach(b => {
                    if (b.intact && dist(b, t) < 40) b.intact = false;
                });
            }
        });

        // Remove dead / off-screen threats
        this.threats = this.threats.filter(t => {
            if (t.health <= 0 && dist(t, this.center) >= 30) {
                // Killed by weapon
                const pts = t.def.score * this.combo;
                this.score += pts;
                this.totalIntercepted++;
                this.comboTimer = 120;
                this.combo = Math.min(this.combo + 1, 10);
                if (this.combo > this.bestCombo) this.bestCombo = this.combo;
                this.createExplosion(t.x, t.y, t.color, 30);
                this.spawnParticles(t.x, t.y, t.color, 15, 35);
                this.addFloatingText(t.x, t.y - 15, `+${pts}`, t.color);
                this.addLog(`KILL: ${t.def.label} destroyed (+${pts})`, 'intercept');
                return false;
            }
            if (t.health <= 0) return false;
            return t.x > -120 && t.x < this.canvas.width + 120 && t.y > -120 && t.y < this.canvas.height + 120;
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.life--;
            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > proj.trailLen) proj.trail.shift();

            // Check hit
            let hit = false;
            this.threats.forEach(t => {
                const hitR = proj.type === 'railgun' ? 8 : 18;
                if (dist(proj, t) < hitR + t.size) {
                    t.health -= proj.damage;
                    this.spawnParticles(t.x, t.y, WEAPON_DEFS[proj.type].color, 6, 15);
                    hit = true;
                }
            });

            if (hit || proj.life <= 0 || dist(proj, { x: proj.tx, y: proj.ty }) < 12) {
                if (!hit) {
                    this.createExplosion(proj.x, proj.y, WEAPON_DEFS[proj.type].color, 12);
                }
                return false;
            }
            return true;
        });

        // Particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // gravity
            p.life--;
            return p.life > 0;
        });

        // Explosions
        this.explosions = this.explosions.filter(e => {
            e.life--;
            e.radius += e.growRate;
            return e.life > 0;
        });

        // Floating texts
        this.floatingTexts = this.floatingTexts.filter(f => {
            f.y -= 0.8;
            f.life--;
            return f.life > 0;
        });

        // Laser beams
        this.laserBeams = this.laserBeams.filter(l => { l.life--; return l.life > 0; });

        // EMP waves
        this.empWaves = this.empWaves.filter(e => {
            e.radius += (e.maxRadius / 25);
            e.life--;
            return e.life > 0;
        });

        // Weapon cooldowns
        for (const w of Object.values(this.weapons)) {
            if (w.cooldown > 0) w.cooldown--;
        }

        // Shield regen
        if (this.shieldHealth < this.shieldMaxHealth && this.shieldActive) {
            this.shieldHealth = Math.min(this.shieldHealth + 0.02, this.shieldMaxHealth);
        }

        // Wave check
        if (this.threats.length === 0 && this.running && !this.gameOver) {
            this.wave++;
            // Replenish some ammo each wave
            for (const [k, def] of Object.entries(WEAPON_DEFS)) {
                if (def.ammo !== Infinity) {
                    this.weapons[k].ammo = Math.min(this.weapons[k].ammo + Math.ceil(def.maxAmmo * 0.3), def.maxAmmo);
                }
            }
            this.addLog('Wave cleared! Resupplying...', 'system-entry');
            setTimeout(() => this.spawnWave(), 3500);
        }

        // AI
        if (this.aiEnabled && this.aiMode !== 'manual') this.processAI();

        // Alert level
        const closestDist = this.threats.reduce((m, t) => Math.min(m, dist(t, this.center)), Infinity);
        const alertEl = document.getElementById('alert-indicator');
        const alertText = document.getElementById('alert-text');
        if (closestDist < 120) {
            alertEl.classList.add('danger');
            alertText.textContent = 'CRITICAL';
        } else if (closestDist < 250) {
            alertEl.classList.remove('danger');
            alertEl.style.borderColor = 'var(--warning)';
            alertText.textContent = 'WARNING';
            alertText.style.color = 'var(--warning)';
        } else {
            alertEl.classList.remove('danger');
            alertEl.style.borderColor = '';
            alertText.style.color = '';
            alertText.textContent = this.running ? 'ACTIVE' : 'STANDBY';
        }

        // Game over check
        if (this.baseHealth <= 0) {
            this.endGame();
        }

        this.updateUI();
    }

    applyDamage(dmg) {
        if (this.shieldActive && this.shieldHealth > 0) {
            const absorbed = Math.min(dmg * 0.7, this.shieldHealth);
            this.shieldHealth -= absorbed;
            dmg -= absorbed;
            if (this.shieldHealth <= 0) {
                this.shieldActive = false;
                this.shieldHealth = 0;
                this.addLog('WARNING: Shield collapsed!', 'hostile');
            }
        }
        this.baseHealth = Math.max(0, this.baseHealth - dmg);
    }

    // ── AI ────────────────────────────────────
    processAI() {
        if (this.threats.length === 0) return;
        const sorted = [...this.threats].sort((a, b) => {
            const pa = a.def.priority, pb = b.def.priority;
            if (pa !== pb) return pb - pa;
            return dist(a, this.center) - dist(b, this.center);
        });

        const target = sorted[0];
        const d = dist(target, this.center);

        // Pick best weapon
        const best = this.pickBestWeapon(target, d);
        if (best) {
            const prev = this.selectedWeapon;
            this.selectedWeapon = best;
            this.fireWeapon(target);
            this.selectedWeapon = prev;
        }
    }

    pickBestWeapon(threat, d) {
        const pref = {
            icbm: ['railgun', 'sam', 'laser', 'ciws'],
            cruise: ['sam', 'ciws', 'laser', 'railgun'],
            hypersonic: ['railgun', 'laser', 'sam', 'ciws'],
            drone: ['ciws', 'laser', 'emp', 'sam'],
            stealth: ['laser', 'railgun', 'sam', 'ciws'],
            fighter: ['sam', 'ciws', 'laser', 'railgun'],
            seaMissile: ['ciws', 'sam', 'laser', 'railgun'],
            orbital: ['railgun', 'laser', 'sam', 'ciws']
        };
        const order = pref[threat.type] || ['sam', 'ciws', 'laser', 'railgun'];
        for (const w of order) {
            const def = WEAPON_DEFS[w];
            const state = this.weapons[w];
            if (state.cooldown > 0) continue;
            if (state.ammo !== Infinity && state.ammo <= 0) continue;
            if (def.range > 0 && d > def.range) continue;
            return w;
        }
        return null;
    }

    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        const btn = document.getElementById('ai-toggle');
        btn.textContent = `AI: ${this.aiEnabled ? 'ONLINE' : 'OFFLINE'}`;
        btn.classList.toggle('active', this.aiEnabled);
        document.getElementById('ai-mode').disabled = !this.aiEnabled;
    }

    cycleAIMode() {
        const modes = ['manual', 'semi-auto', 'auto'];
        this.aiMode = modes[(modes.indexOf(this.aiMode) + 1) % modes.length];
        document.getElementById('ai-mode').textContent = `MODE: ${this.aiMode.toUpperCase()}`;
    }

    // ── Rendering ────────────────────────────
    render() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const cx = this.center.x, cy = this.center.y;

        // Clear
        ctx.fillStyle = '#020408';
        ctx.fillRect(0, 0, W, H);

        // Stars
        this.stars.forEach(s => {
            const flicker = 0.5 + 0.5 * Math.sin(this.elapsedFrames * 0.03 + s.b * 100);
            ctx.fillStyle = `rgba(150,180,220,${flicker * 0.5})`;
            ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
        });

        // Radar grid
        this.drawRadarGrid(ctx, cx, cy);

        // Radar sweep
        this.drawRadarSweep(ctx, cx, cy);

        // Buildings / city
        this.drawCity(ctx);

        // Shield dome
        this.drawShield(ctx, cx, cy);

        // Weapon range
        this.drawWeaponRange(ctx, cx, cy);

        // Threats
        this.threats.forEach(t => this.drawThreat(ctx, t));

        // Projectiles
        this.projectiles.forEach(p => this.drawProjectile(ctx, p));

        // Laser beams
        this.laserBeams.forEach(l => this.drawLaser(ctx, l));

        // EMP waves
        this.empWaves.forEach(e => this.drawEMP(ctx, e));

        // Explosions
        this.explosions.forEach(e => this.drawExplosion(ctx, e));

        // Particles
        this.particles.forEach(p => this.drawParticle(ctx, p));

        // Floating text
        this.floatingTexts.forEach(f => this.drawFloatingText(ctx, f));

        // Defense center
        this.drawDefenseCenter(ctx, cx, cy);

        // Selected target bracket
        if (this.selectedTarget && this.threats.includes(this.selectedTarget)) {
            this.drawTargetBracket(ctx, this.selectedTarget);
        } else {
            this.selectedTarget = null;
        }

        // HUD overlays on canvas
        this.drawCanvasHUD(ctx, W, H);
    }

    drawRadarGrid(ctx, cx, cy) {
        ctx.strokeStyle = 'rgba(0,100,140,0.15)';
        ctx.lineWidth = 1;
        const maxR = Math.max(this.canvas.width, this.canvas.height) * 0.6;
        for (let i = 1; i <= 8; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, i * maxR / 8, 0, TAU);
            ctx.stroke();
        }

        // Radial lines
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
            ctx.stroke();
        }

        // Distance labels
        ctx.fillStyle = 'rgba(0,180,220,0.25)';
        ctx.font = '9px "Share Tech Mono"';
        ctx.textAlign = 'center';
        for (let i = 1; i <= 4; i++) {
            ctx.fillText(`${i * 100}m`, cx, cy - i * maxR / 8 + 12);
        }
    }

    drawRadarSweep(ctx, cx, cy) {
        const maxR = Math.max(this.canvas.width, this.canvas.height) * 0.6;
        const grad = ctx.createConicalGradient ?
            null : null; // fallback

        // Sweep line
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.radarAngle);

        // Sweep gradient fan
        const sweepGrad = ctx.createLinearGradient(0, 0, maxR, 0);
        sweepGrad.addColorStop(0, 'rgba(0,229,255,0.15)');
        sweepGrad.addColorStop(1, 'rgba(0,229,255,0)');
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxR, -0.15, 0);
        ctx.closePath();
        ctx.fill();

        // Bright sweep line
        ctx.strokeStyle = 'rgba(0,229,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(maxR, 0);
        ctx.stroke();

        ctx.restore();
    }

    drawCity(ctx) {
        this.buildings.forEach(b => {
            if (b.intact) {
                // Building
                ctx.fillStyle = '#0a2040';
                ctx.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
                // Windows
                ctx.fillStyle = 'rgba(0,229,255,0.2)';
                for (let wy = b.y - b.h + 3; wy < b.y - 2; wy += 5) {
                    for (let wx = b.x - b.w / 2 + 2; wx < b.x + b.w / 2 - 2; wx += 4) {
                        if (Math.random() > 0.3)
                            ctx.fillRect(wx, wy, 2, 2);
                    }
                }
                // Roof light
                ctx.fillStyle = 'rgba(255,50,50,0.6)';
                ctx.fillRect(b.x - 1, b.y - b.h - 2, 2, 2);
            } else {
                // Destroyed rubble
                ctx.fillStyle = '#1a1008';
                ctx.fillRect(b.x - b.w / 2, b.y - b.h * 0.3, b.w, b.h * 0.3);
                ctx.fillStyle = 'rgba(255,100,0,0.15)';
                ctx.fillRect(b.x - b.w / 2, b.y - b.h * 0.3, b.w, b.h * 0.3);
            }
        });
    }

    drawShield(ctx, cx, cy) {
        if (this.shieldHealth <= 0) return;
        const alpha = (this.shieldHealth / this.shieldMaxHealth) * 0.15;
        const pulse = 0.03 * Math.sin(this.elapsedFrames * 0.05);

        ctx.save();
        ctx.strokeStyle = `rgba(0,150,255,${alpha + 0.1 + pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, 55, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner glow
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 60);
        grad.addColorStop(0, `rgba(0,100,255,${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0,100,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    drawWeaponRange(ctx, cx, cy) {
        const def = WEAPON_DEFS[this.selectedWeapon];
        if (!def || def.range <= 0) return;
        ctx.save();
        ctx.strokeStyle = `${def.color}33`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, def.range, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawDefenseCenter(ctx, cx, cy) {
        // Outer ring
        const pulse = 1 + 0.1 * Math.sin(this.elapsedFrames * 0.06);
        ctx.save();
        ctx.strokeStyle = 'rgba(0,229,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 12 * pulse, 0, TAU);
        ctx.stroke();

        // Inner dot
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
        grad.addColorStop(0, '#00e5ff');
        grad.addColorStop(1, '#004060');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, TAU);
        ctx.fill();

        // Crosshair
        ctx.strokeStyle = 'rgba(0,229,255,0.4)';
        ctx.lineWidth = 1;
        const ch = 20;
        ctx.beginPath();
        ctx.moveTo(cx - ch, cy); ctx.lineTo(cx - 8, cy);
        ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + ch, cy);
        ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy - 8);
        ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + ch);
        ctx.stroke();
        ctx.restore();
    }

    drawThreat(ctx, t) {
        if (t.type === 'stealth' && !t.stealthVisible) return; // cloaked

        const alpha = t.type === 'stealth' && t.stealthVisible ? 0.6 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Trail
        if (t.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = `${t.color}30`;
            ctx.lineWidth = 1;
            for (let i = 0; i < t.trail.length; i++) {
                i === 0 ? ctx.moveTo(t.trail[i].x, t.trail[i].y) : ctx.lineTo(t.trail[i].x, t.trail[i].y);
            }
            ctx.stroke();
        }

        // Glow
        const glowR = t.size + 8;
        const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, glowR);
        grd.addColorStop(0, t.glow);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(t.x, t.y, glowR, 0, TAU);
        ctx.fill();

        // Shape
        ctx.fillStyle = t.jammed ? '#666' : t.color;
        this.drawThreatShape(ctx, t);

        // Health bar
        if (t.health < t.maxHealth) {
            const bw = t.size * 3;
            const bh = 3;
            const bx = t.x - bw / 2;
            const by = t.y - t.size - 10;
            const pct = t.health / t.maxHealth;
            ctx.fillStyle = '#111';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = pct > 0.5 ? '#00ff66' : pct > 0.25 ? '#ffaa00' : '#ff3344';
            ctx.fillRect(bx, by, bw * pct, bh);
        }

        // Label
        ctx.fillStyle = t.jammed ? '#888' : '#fff';
        ctx.font = '8px "Share Tech Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(t.def.label.substring(0, 3).toUpperCase(), t.x, t.y + t.size + 12);

        // Jammed indicator
        if (t.jammed) {
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size + 6, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawThreatShape(ctx, t) {
        const { x, y, size, type } = t;
        ctx.beginPath();
        switch (type) {
            case 'icbm':
                // Pointed missile shape
                ctx.moveTo(x, y - size * 1.5);
                ctx.lineTo(x + size * 0.6, y + size);
                ctx.lineTo(x - size * 0.6, y + size);
                ctx.closePath();
                ctx.fill();
                break;
            case 'cruise':
                // Slim missile
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size * 0.4, y + size * 0.8);
                ctx.lineTo(x, y + size * 0.5);
                ctx.lineTo(x - size * 0.4, y + size * 0.8);
                ctx.closePath();
                ctx.fill();
                break;
            case 'hypersonic':
                // Diamond / chevron
                ctx.moveTo(x, y - size * 1.3);
                ctx.lineTo(x + size * 0.8, y);
                ctx.lineTo(x, y + size * 0.6);
                ctx.lineTo(x - size * 0.8, y);
                ctx.closePath();
                ctx.fill();
                break;
            case 'drone':
                // Small circle cluster
                for (let i = 0; i < 3; i++) {
                    const a = (i / 3) * TAU + this.elapsedFrames * 0.05;
                    ctx.moveTo(x + Math.cos(a) * size * 0.8 + size * 0.3, y + Math.sin(a) * size * 0.8);
                    ctx.arc(x + Math.cos(a) * size * 0.8, y + Math.sin(a) * size * 0.8, size * 0.3, 0, TAU);
                }
                ctx.fill();
                break;
            case 'stealth':
                // Boomerang / stealth shape
                ctx.moveTo(x, y - size * 0.3);
                ctx.lineTo(x + size * 1.4, y + size * 0.5);
                ctx.lineTo(x + size * 0.3, y);
                ctx.lineTo(x, y + size * 0.4);
                ctx.lineTo(x - size * 0.3, y);
                ctx.lineTo(x - size * 1.4, y + size * 0.5);
                ctx.closePath();
                ctx.fill();
                break;
            case 'fighter':
                // Arrow shape
                ctx.moveTo(x, y - size * 1.2);
                ctx.lineTo(x + size * 0.9, y + size * 0.6);
                ctx.lineTo(x + size * 0.2, y + size * 0.2);
                ctx.lineTo(x - size * 0.2, y + size * 0.2);
                ctx.lineTo(x - size * 0.9, y + size * 0.6);
                ctx.closePath();
                ctx.fill();
                break;
            case 'seaMissile':
                // Rounded missile
                ctx.arc(x, y, size, 0, TAU);
                ctx.fill();
                // Fins
                ctx.fillRect(x - size * 1.2, y - 1, size * 2.4, 2);
                break;
            case 'orbital':
                // Hexagonal with glow
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU;
                    const px = x + Math.cos(a) * size;
                    const py = y + Math.sin(a) * size;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                // Inner detail
                ctx.fillStyle = `${t.color}88`;
                ctx.beginPath();
                ctx.arc(x, y, size * 0.4, 0, TAU);
                ctx.fill();
                break;
            default:
                ctx.arc(x, y, size, 0, TAU);
                ctx.fill();
        }
    }

    drawProjectile(ctx, p) {
        const def = WEAPON_DEFS[p.type];
        ctx.save();

        // Trail
        if (p.trail.length > 1) {
            for (let i = 1; i < p.trail.length; i++) {
                const alpha = i / p.trail.length;
                ctx.strokeStyle = `${def.color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = 2 * alpha;
                ctx.beginPath();
                ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
                ctx.stroke();
            }
        }

        // Head glow
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
        gr.addColorStop(0, '#fff');
        gr.addColorStop(0.3, def.color);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, TAU);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, TAU);
        ctx.fill();

        ctx.restore();
    }

    drawLaser(ctx, l) {
        ctx.save();
        const alpha = l.life / 15;

        // Outer beam
        ctx.strokeStyle = `rgba(200,100,255,${alpha * 0.3})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        // Inner beam
        ctx.strokeStyle = `rgba(255,200,255,${alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        // Core
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        ctx.restore();
    }

    drawEMP(ctx, e) {
        const alpha = e.life / 40;
        ctx.save();
        ctx.strokeStyle = `rgba(255,170,0,${alpha * 0.6})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner glow
        ctx.strokeStyle = `rgba(255,220,100,${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.7, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    drawExplosion(ctx, e) {
        ctx.save();
        const alpha = e.life / e.maxLife;

        // Outer ring
        ctx.strokeStyle = `${e.color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, TAU);
        ctx.stroke();

        // Inner glow
        const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gr.addColorStop(0, `${e.color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`);
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, TAU);
        ctx.fill();

        ctx.restore();
    }

    drawParticle(ctx, p) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `${p.color}${Math.floor(alpha * 220).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, TAU);
        ctx.fill();
    }

    drawFloatingText(ctx, f) {
        const alpha = f.life / f.maxLife;
        ctx.save();
        ctx.font = 'bold 12px "Orbitron"';
        ctx.textAlign = 'center';
        ctx.fillStyle = `${f.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }

    drawTargetBracket(ctx, t) {
        const s = t.size + 14;
        const l = 6;
        ctx.save();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;

        // Corners
        // Top-left
        ctx.beginPath();
        ctx.moveTo(t.x - s, t.y - s + l); ctx.lineTo(t.x - s, t.y - s); ctx.lineTo(t.x - s + l, t.y - s);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(t.x + s - l, t.y - s); ctx.lineTo(t.x + s, t.y - s); ctx.lineTo(t.x + s, t.y - s + l);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(t.x + s, t.y + s - l); ctx.lineTo(t.x + s, t.y + s); ctx.lineTo(t.x + s - l, t.y + s);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(t.x - s + l, t.y + s); ctx.lineTo(t.x - s, t.y + s); ctx.lineTo(t.x - s, t.y + s - l);
        ctx.stroke();

        ctx.restore();

        // Distance line to center
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,0,0.15)';
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(this.center.x, this.center.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawCanvasHUD(ctx, W, H) {
        ctx.save();
        ctx.font = '9px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.4)';

        // Top-left coordinates
        ctx.textAlign = 'left';
        ctx.fillText(`GRID: ${W}x${H}`, 8, 14);
        ctx.fillText(`SECTOR: ALPHA-7`, 8, 26);

        // Top-right
        ctx.textAlign = 'right';
        const t = Math.floor(this.elapsedFrames / 60);
        ctx.fillText(`T+${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, W - 8, 14);

        // Compass at top center
        ctx.textAlign = 'center';
        ctx.fillText('N', W / 2, 14);
        ctx.fillText('S', W / 2, H - 6);
        ctx.textAlign = 'left';
        ctx.fillText('W', 8, H / 2 + 4);
        ctx.textAlign = 'right';
        ctx.fillText('E', W - 8, H / 2 + 4);

        // Active weapon indicator bottom-center
        if (this.running) {
            const wName = this.selectedWeapon.toUpperCase();
            const def = WEAPON_DEFS[this.selectedWeapon];
            ctx.textAlign = 'center';
            ctx.font = '11px "Orbitron"';
            ctx.fillStyle = def.color;
            ctx.fillText(`[ ${wName} ]`, W / 2, H - 12);
        }

        ctx.restore();
    }

    // ── FX Helpers ───────────────────────────
    createExplosion(x, y, color, size) {
        this.explosions.push({
            x, y, color,
            radius: 2,
            growRate: size / 20,
            life: 30,
            maxLife: 30
        });
    }

    spawnParticles(x, y, color, count, speed) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const s = Math.random() * speed * 0.1;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: randRange(15, 40),
                maxLife: 40,
                color,
                size: randRange(1, 3.5)
            });
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60 });
    }

    shakeScreen() {
        document.getElementById('canvas-wrapper').classList.add('screen-shake');
        setTimeout(() => document.getElementById('canvas-wrapper').classList.remove('screen-shake'), 300);
    }

    addLog(msg, cls = '') {
        const log = document.getElementById('threat-log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${cls}`;
        const t = Math.floor(this.elapsedFrames / 60);
        entry.textContent = `[${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}] ${msg}`;
        log.appendChild(entry);
        if (log.children.length > 60) log.removeChild(log.firstChild);
        log.scrollTop = log.scrollHeight;
    }

    // ── UI Updates ───────────────────────────
    updateUI() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('threats-remaining').textContent = this.threats.length;
        document.getElementById('combo').textContent = `x${this.combo}`;

        // Base health
        const hpPct = (this.baseHealth / this.baseMaxHealth) * 100;
        document.getElementById('base-health-bar').style.width = hpPct + '%';
        document.getElementById('base-health-text').textContent = Math.round(hpPct) + '%';
        const hpBar = document.getElementById('base-health-bar');
        hpBar.style.background = hpPct > 50 ? 'linear-gradient(90deg,#00cc44,#00ff66)' :
            hpPct > 25 ? 'linear-gradient(90deg,#cc8800,#ffaa00)' : 'linear-gradient(90deg,#cc0022,#ff3344)';

        // Shield
        const shPct = (this.shieldHealth / this.shieldMaxHealth) * 100;
        document.getElementById('shield-bar').style.width = shPct + '%';
        document.getElementById('shield-text').textContent = Math.round(shPct) + '%';

        // Timer
        const t = Math.floor(this.elapsedFrames / 60);
        document.getElementById('time-display').textContent =
            `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

        // Weapons
        for (const [k, def] of Object.entries(WEAPON_DEFS)) {
            const state = this.weapons[k];
            const ammoEl = document.getElementById(`${k}-ammo`);
            const barEl = document.getElementById(`${k}-bar`) || document.getElementById(`${k === 'shield' ? 'shield-boost' : k}-bar`);

            if (def.ammo === Infinity) {
                ammoEl.textContent = state.cooldown > 0 ? `${Math.ceil(state.cooldown / 60)}s` : 'RDY';
            } else {
                ammoEl.textContent = state.ammo;
            }

            // Status bar = ammo fraction or cooldown fraction
            if (barEl) {
                if (def.ammo === Infinity) {
                    barEl.style.width = state.cooldown > 0 ? `${(1 - state.cooldown / def.cooldownMax) * 100}%` : '100%';
                } else {
                    barEl.style.width = `${(state.ammo / def.maxAmmo) * 100}%`;
                }
            }

            const btn = document.querySelector(`[data-weapon="${k}"]`);
            if (btn) {
                btn.disabled = (state.ammo !== Infinity && state.ammo <= 0) || state.cooldown > 0;
                if (btn.classList.contains('active') && btn.disabled) {
                    // keep visual but show disabled state
                }
            }
        }

        // Stats
        document.getElementById('stat-intercepted').textContent = this.totalIntercepted;
        document.getElementById('stat-missed').textContent = this.totalMissed;
        document.getElementById('stat-accuracy').textContent =
            this.totalFired > 0 ? Math.round((this.totalIntercepted / this.totalFired) * 100) + '%' : '--';
        document.getElementById('stat-best-combo').textContent = `x${this.bestCombo}`;

        // Object count
        document.getElementById('object-count').textContent =
            this.threats.length + this.projectiles.length + this.particles.length + this.explosions.length;

        // Difficulty label
        const diffLabels = ['EASY', 'NORMAL', 'HARD', 'EXTREME', 'NIGHTMARE'];
        document.getElementById('difficulty-display').textContent =
            diffLabels[Math.min(Math.floor((this.wave - 1) / 3), diffLabels.length - 1)];
    }

    updateTargetInfo() {
        const el = document.getElementById('target-details');
        if (!this.selectedTarget || !this.threats.includes(this.selectedTarget)) {
            el.className = 'target-details-empty';
            el.textContent = 'Click a threat to inspect';
            this.selectedTarget = null;
            return;
        }
        const t = this.selectedTarget;
        const d = Math.round(dist(t, this.center));
        const hpPct = Math.round((t.health / t.maxHealth) * 100);
        el.className = '';
        el.innerHTML = `
            <div style="color:${t.color};font-family:'Orbitron';font-size:12px;font-weight:600;margin-bottom:4px;">${t.def.label}</div>
            <div>Health: <span style="color:${hpPct > 50 ? '#00ff66' : hpPct > 25 ? '#ffaa00' : '#ff3344'}">${t.health}/${t.maxHealth}</span> (${hpPct}%)</div>
            <div>Distance: <span style="color:var(--primary)">${d}m</span></div>
            <div>Speed: <span style="color:var(--primary)">${t.speed.toFixed(1)}</span></div>
            <div>Priority: <span style="color:${t.def.priority >= 4 ? '#ff3344' : '#ffaa00'}">${t.def.priority}/5</span></div>
            <div>Damage: <span style="color:#ff6644">${t.def.damage}</span></div>
            ${t.jammed ? '<div style="color:#ffaa00;">⚡ JAMMED</div>' : ''}
            ${t.type === 'stealth' ? '<div style="color:#44ffaa;">◇ STEALTH</div>' : ''}
        `;
    }

    // ── Game loop ────────────────────────────
    loop(timestamp) {
        // FPS
        this.frameCount++;
        if (timestamp - this.fpsTimer >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = timestamp;
            document.getElementById('fps-display').textContent = this.fps;
        }

        this.update();
        this.render();
        if (this.selectedTarget) this.updateTargetInfo();
        requestAnimationFrame(ts => this.loop(ts));
    }
}
