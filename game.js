// Missile Defense Simulation Game Engine

class MissileDefenseGame {
    constructor() {
        this.canvas = document.getElementById('radar-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameRunning = false;
        this.gamePaused = false;
        this.currentWave = 1;
        this.score = 0;
        this.selectedWeapon = 'sam';
        this.selectedTarget = null;
        this.aiEnabled = false;
        this.aiMode = 'manual'; // manual, semi-auto, auto
        
        // Game objects
        this.threats = [];
        this.projectiles = [];
        this.explosions = [];
        this.defenseAssets = [];
        
        // Weapon systems
        this.weapons = {
            sam: { ammo: 12, maxAmmo: 12, range: 300, speed: 8, damage: 100, cooldown: 0 },
            ciws: { ammo: 50, maxAmmo: 50, range: 150, speed: 15, damage: 50, cooldown: 0 },
            laser: { ammo: Infinity, maxAmmo: Infinity, range: 400, speed: 20, damage: 75, cooldown: 0, maxCooldown: 180 },
            jamming: { ammo: Infinity, maxAmmo: Infinity, range: 200, speed: 0, damage: 0, cooldown: 0, maxCooldown: 300 }
        };
        
        // Center point of defense (radar center)
        this.defenseCenter = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        
        this.initializeEventListeners();
        this.startGameLoop();
        this.updateUI();
    }
    
    initializeEventListeners() {
        // Canvas click for targeting
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Weapon selection
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectWeapon(e.target.dataset.weapon));
        });
        
        // Game controls
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        
        // AI controls
        document.getElementById('ai-toggle').addEventListener('click', () => this.toggleAI());
        document.getElementById('ai-mode').addEventListener('click', () => this.cycleAIMode());
    }
    
    handleCanvasClick(e) {
        if (!this.gameRunning || this.gamePaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check if clicking on a threat to select it
        const clickedThreat = this.threats.find(threat => 
            this.getDistance(threat, { x: clickX, y: clickY }) < 20
        );
        
        if (clickedThreat) {
            this.selectedTarget = clickedThreat;
            this.updateTargetInfo();
        } else if (this.selectedTarget) {
            // Fire at selected target
            this.fireWeapon(this.selectedTarget);
        } else {
            // Fire at click position
            this.fireWeapon({ x: clickX, y: clickY });
        }
    }
    
    selectWeapon(weaponType) {
        if (this.weapons[weaponType] && (this.weapons[weaponType].ammo > 0 || this.weapons[weaponType].ammo === Infinity)) {
            this.selectedWeapon = weaponType;
            document.querySelectorAll('.weapon-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[data-weapon="${weaponType}"]`).classList.add('active');
        }
    }
    
    fireWeapon(target) {
        const weapon = this.weapons[this.selectedWeapon];
        
        // Check cooldown and ammo
        if (weapon.cooldown > 0 || weapon.ammo === 0) return;
        
        const distance = this.getDistance(this.defenseCenter, target);
        if (distance > weapon.range) return;
        
        // Create projectile
        const projectile = {
            x: this.defenseCenter.x,
            y: this.defenseCenter.y,
            targetX: target.x,
            targetY: target.y,
            speed: weapon.speed,
            damage: weapon.damage,
            type: this.selectedWeapon,
            trail: []
        };
        
        this.projectiles.push(projectile);
        
        // Consume ammo and set cooldown
        if (weapon.ammo !== Infinity) weapon.ammo--;
        if (weapon.maxCooldown) weapon.cooldown = weapon.maxCooldown;
        
        this.updateUI();
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.spawnWave();
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
    }
    
    pauseGame() {
        this.gamePaused = !this.gamePaused;
        document.getElementById('pause-btn').textContent = this.gamePaused ? 'Resume' : 'Pause';
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.currentWave = 1;
        this.score = 0;
        this.threats = [];
        this.projectiles = [];
        this.explosions = [];
        this.selectedTarget = null;
        
        // Reset weapons
        Object.keys(this.weapons).forEach(weaponType => {
            const weapon = this.weapons[weaponType];
            weapon.ammo = weapon.maxAmmo;
            weapon.cooldown = 0;
        });
        
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pause';
        
        this.updateUI();
        this.updateTargetInfo();
    }
    
    spawnWave() {
        const threatsToSpawn = Math.min(3 + this.currentWave, 10);
        
        for (let i = 0; i < threatsToSpawn; i++) {
            setTimeout(() => this.spawnThreat(), i * 2000); // Stagger spawning
        }
    }
    
    spawnThreat() {
        const threatTypes = ['fighter', 'missile', 'drone'];
        const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        
        // Spawn from random edge
        const edge = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        
        switch (edge) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = -50;
                vx = (Math.random() - 0.5) * 2;
                vy = Math.random() * 2 + 1;
                break;
            case 1: // Right
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
                vx = -(Math.random() * 2 + 1);
                vy = (Math.random() - 0.5) * 2;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 50;
                vx = (Math.random() - 0.5) * 2;
                vy = -(Math.random() * 2 + 1);
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * this.canvas.height;
                vx = Math.random() * 2 + 1;
                vy = (Math.random() - 0.5) * 2;
                break;
        }
        
        const threat = {
            id: Date.now() + Math.random(),
            type: type,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            health: this.getThreatHealth(type),
            maxHealth: this.getThreatHealth(type),
            speed: this.getThreatSpeed(type),
            size: this.getThreatSize(type),
            color: this.getThreatColor(type),
            jammed: false,
            jammedTime: 0
        };
        
        this.threats.push(threat);
    }
    
    getThreatHealth(type) {
        switch (type) {
            case 'fighter': return 150;
            case 'missile': return 50;
            case 'drone': return 75;
            default: return 100;
        }
    }
    
    getThreatSpeed(type) {
        switch (type) {
            case 'fighter': return 3;
            case 'missile': return 6;
            case 'drone': return 1.5;
            default: return 2;
        }
    }
    
    getThreatSize(type) {
        switch (type) {
            case 'fighter': return 8;
            case 'missile': return 4;
            case 'drone': return 6;
            default: return 6;
        }
    }
    
    getThreatColor(type) {
        switch (type) {
            case 'fighter': return '#ff4444';
            case 'missile': return '#ff8800';
            case 'drone': return '#8888ff';
            default: return '#ffffff';
        }
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused) return;
        
        // Update threats
        this.threats.forEach(threat => {
            if (threat.jammed) {
                threat.jammedTime--;
                if (threat.jammedTime <= 0) threat.jammed = false;
            } else {
                threat.x += threat.vx * threat.speed;
                threat.y += threat.vy * threat.speed;
            }
        });
        
        // Update projectiles
        this.projectiles.forEach(projectile => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < projectile.speed) {
                // Hit target
                this.createExplosion(projectile.targetX, projectile.targetY);
                this.checkProjectileHits(projectile);
                this.projectiles = this.projectiles.filter(p => p !== projectile);
            } else {
                // Move towards target
                projectile.trail.push({ x: projectile.x, y: projectile.y });
                if (projectile.trail.length > 10) projectile.trail.shift();
                
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;
            }
        });
        
        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.life--;
            explosion.radius += 2;
            return explosion.life > 0;
        });
        
        // Update weapon cooldowns
        Object.values(this.weapons).forEach(weapon => {
            if (weapon.cooldown > 0) weapon.cooldown--;
        });
        
        // Remove threats that are off screen or dead
        this.threats = this.threats.filter(threat => {
            if (threat.health <= 0) {
                this.score += this.getScoreForThreat(threat.type);
                return false;
            }
            return threat.x > -100 && threat.x < this.canvas.width + 100 && 
                   threat.y > -100 && threat.y < this.canvas.height + 100;
        });
        
        // Check for wave completion
        if (this.threats.length === 0 && this.gameRunning) {
            this.currentWave++;
            setTimeout(() => this.spawnWave(), 3000);
        }
        
        // AI processing
        if (this.aiEnabled) {
            this.processAI();
        }
        
        this.updateUI();
    }
    
    checkProjectileHits(projectile) {
        const hitRadius = projectile.type === 'laser' ? 5 : 30;
        
        this.threats.forEach(threat => {
            const distance = this.getDistance(projectile, threat);
            if (distance < hitRadius + threat.size) {
                threat.health -= projectile.damage;
                if (projectile.type === 'jamming') {
                    threat.jammed = true;
                    threat.jammedTime = 120; // 2 seconds at 60fps
                }
            }
        });
    }
    
    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            radius: 5,
            life: 30,
            color: '#ffff00'
        });
    }
    
    getScoreForThreat(type) {
        switch (type) {
            case 'fighter': return 100;
            case 'missile': return 200;
            case 'drone': return 50;
            default: return 75;
        }
    }
    
    processAI() {
        if (this.aiMode === 'manual') return;
        
        // Simple AI: target closest high-threat enemy
        const threats = this.threats.filter(t => !t.jammed);
        if (threats.length === 0) return;
        
        const prioritizedThreats = threats.sort((a, b) => {
            const aPriority = this.getThreatPriority(a);
            const bPriority = this.getThreatPriority(b);
            if (aPriority !== bPriority) return bPriority - aPriority;
            
            // If same priority, target closest
            const aDistance = this.getDistance(this.defenseCenter, a);
            const bDistance = this.getDistance(this.defenseCenter, b);
            return aDistance - bDistance;
        });
        
        const target = prioritizedThreats[0];
        const distance = this.getDistance(this.defenseCenter, target);
        
        // Select best weapon for target
        const bestWeapon = this.selectBestWeapon(target, distance);
        if (bestWeapon && this.weapons[bestWeapon].cooldown === 0) {
            this.selectedWeapon = bestWeapon;
            this.fireWeapon(target);
        }
    }
    
    getThreatPriority(threat) {
        switch (threat.type) {
            case 'missile': return 3;
            case 'fighter': return 2;
            case 'drone': return 1;
            default: return 1;
        }
    }
    
    selectBestWeapon(threat, distance) {
        const availableWeapons = Object.keys(this.weapons).filter(w => 
            this.weapons[w].cooldown === 0 && 
            (this.weapons[w].ammo > 0 || this.weapons[w].ammo === Infinity) &&
            this.weapons[w].range >= distance
        );
        
        // Weapon effectiveness matrix
        const effectiveness = {
            'fighter': ['sam', 'ciws', 'jamming', 'laser'],
            'missile': ['ciws', 'laser', 'sam', 'jamming'],
            'drone': ['laser', 'jamming', 'ciws', 'sam']
        };
        
        const preferred = effectiveness[threat.type] || ['sam', 'ciws', 'laser', 'jamming'];
        return preferred.find(w => availableWeapons.includes(w));
    }
    
    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        document.getElementById('ai-toggle').textContent = `AI: ${this.aiEnabled ? 'ON' : 'OFF'}`;
        document.getElementById('ai-toggle').classList.toggle('active', this.aiEnabled);
        document.getElementById('ai-mode').disabled = !this.aiEnabled;
    }
    
    cycleAIMode() {
        const modes = ['manual', 'semi-auto', 'auto'];
        const currentIndex = modes.indexOf(this.aiMode);
        this.aiMode = modes[(currentIndex + 1) % modes.length];
        document.getElementById('ai-mode').textContent = this.aiMode.charAt(0).toUpperCase() + this.aiMode.slice(1);
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw radar grid
        this.drawRadarGrid();
        
        // Draw defense center
        this.drawDefenseCenter();
        
        // Draw weapon ranges
        this.drawWeaponRange();
        
        // Draw threats
        this.threats.forEach(threat => this.drawThreat(threat));
        
        // Draw projectiles
        this.projectiles.forEach(projectile => this.drawProjectile(projectile));
        
        // Draw explosions
        this.explosions.forEach(explosion => this.drawExplosion(explosion));
        
        // Draw selected target indicator
        if (this.selectedTarget) {
            this.drawTargetIndicator(this.selectedTarget);
        }
    }
    
    drawRadarGrid() {
        this.ctx.strokeStyle = '#003300';
        this.ctx.lineWidth = 1;
        
        // Concentric circles
        for (let i = 1; i <= 5; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.defenseCenter.x, this.defenseCenter.y, i * 60, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Cross lines
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.defenseCenter.y);
        this.ctx.lineTo(this.canvas.width, this.defenseCenter.y);
        this.ctx.moveTo(this.defenseCenter.x, 0);
        this.ctx.lineTo(this.defenseCenter.x, this.canvas.height);
        this.ctx.stroke();
    }
    
    drawDefenseCenter() {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(this.defenseCenter.x, this.defenseCenter.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw crosshairs
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.defenseCenter.x - 15, this.defenseCenter.y);
        this.ctx.lineTo(this.defenseCenter.x + 15, this.defenseCenter.y);
        this.ctx.moveTo(this.defenseCenter.x, this.defenseCenter.y - 15);
        this.ctx.lineTo(this.defenseCenter.x, this.defenseCenter.y + 15);
        this.ctx.stroke();
    }
    
    drawWeaponRange() {
        const weapon = this.weapons[this.selectedWeapon];
        this.ctx.strokeStyle = '#004400';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.defenseCenter.x, this.defenseCenter.y, weapon.range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawThreat(threat) {
        this.ctx.fillStyle = threat.jammed ? '#666666' : threat.color;
        this.ctx.beginPath();
        this.ctx.arc(threat.x, threat.y, threat.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw health bar
        if (threat.health < threat.maxHealth) {
            const barWidth = threat.size * 2;
            const barHeight = 3;
            const healthPercent = threat.health / threat.maxHealth;
            
            this.ctx.fillStyle = '#444444';
            this.ctx.fillRect(threat.x - barWidth/2, threat.y - threat.size - 8, barWidth, barHeight);
            
            this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            this.ctx.fillRect(threat.x - barWidth/2, threat.y - threat.size - 8, barWidth * healthPercent, barHeight);
        }
        
        // Draw threat type indicator
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(threat.type.charAt(0).toUpperCase(), threat.x, threat.y + 2);
    }
    
    drawProjectile(projectile) {
        // Draw trail
        this.ctx.strokeStyle = this.getProjectileColor(projectile.type);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        projectile.trail.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.stroke();
        
        // Draw projectile
        this.ctx.fillStyle = this.getProjectileColor(projectile.type);
        this.ctx.beginPath();
        this.ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    getProjectileColor(type) {
        switch (type) {
            case 'sam': return '#00ff00';
            case 'ciws': return '#ffff00';
            case 'laser': return '#ff00ff';
            case 'jamming': return '#00ffff';
            default: return '#ffffff';
        }
    }
    
    drawExplosion(explosion) {
        this.ctx.fillStyle = explosion.color;
        this.ctx.globalAlpha = explosion.life / 30;
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    
    drawTargetIndicator(target) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, target.size + 10, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('wave').textContent = `Wave: ${this.currentWave}`;
        document.getElementById('threats-remaining').textContent = `Threats: ${this.threats.length}`;
        
        // Update weapon display
        Object.keys(this.weapons).forEach(weaponType => {
            const weapon = this.weapons[weaponType];
            const btn = document.querySelector(`[data-weapon="${weaponType}"]`);
            const display = btn.querySelector('.ammo, .cooldown');
            
            if (weapon.ammo === Infinity) {
                if (weapon.cooldown > 0) {
                    display.textContent = `(${Math.ceil(weapon.cooldown / 60)}s)`;
                    btn.disabled = true;
                } else {
                    display.textContent = '(Ready)';
                    btn.disabled = false;
                }
            } else {
                display.textContent = `(${weapon.ammo})`;
                btn.disabled = weapon.ammo === 0;
            }
        });
    }
    
    updateTargetInfo() {
        const infoDiv = document.getElementById('target-details');
        if (this.selectedTarget) {
            const distance = Math.round(this.getDistance(this.defenseCenter, this.selectedTarget));
            infoDiv.innerHTML = `
                <strong>${this.selectedTarget.type.toUpperCase()}</strong><br>
                Health: ${this.selectedTarget.health}/${this.selectedTarget.maxHealth}<br>
                Distance: ${distance}px<br>
                Speed: ${this.selectedTarget.speed.toFixed(1)}<br>
                ${this.selectedTarget.jammed ? '<span style="color: #ffff00;">JAMMED</span>' : ''}
            `;
        } else {
            infoDiv.textContent = 'Click on a threat to select';
        }
    }
    
    getDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MissileDefenseGame();
});