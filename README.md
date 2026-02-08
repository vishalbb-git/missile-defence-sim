# AEGIS Defense Command

A tactical missile defense simulation game built with HTML5 Canvas, vanilla JavaScript, and CSS. Command advanced defensive systems against waves of incoming threats in this immersive military-style simulation.

![Game Screenshot](screenshot.png)

## Overview

Take command of the AEGIS Defense System and protect your base from increasingly sophisticated aerial and orbital threats. Deploy surface-to-air missiles, close-in weapon systems, directed energy weapons, and more to intercept hostile targets before they reach your installations.

## Features

### Core Gameplay
- **Wave-Based Defense**: Face progressively harder waves of threats with unique compositions
- **Multiple Threat Types**: 8 distinct enemy types including ICBMs, hypersonic missiles, stealth bombers, drone swarms, and orbital strikes
- **Advanced Weapon Systems**: 6 defensive weapon types each with unique capabilities:
  - **SAM Battery**: Long-range surface-to-air missiles
  - **CIWS Phalanx**: Rapid-fire close-in weapon system
  - **DEW Laser**: Instant-hit directed energy weapon
  - **EMP Burst**: Area-effect electronic warfare
  - **Railgun**: High-velocity kinetic penetrator
  - **Shield Boost**: Defensive barrier regeneration

### Visual & UI Features
- Immersive military HUD interface with sci-fi aesthetics
- Real-time radar sweep with threat detection
- Dynamic particle effects and explosions
- Shield dome visualization with health indicators
- Threat intel log with real-time updates
- Screen shake effects on impacts

### AI Assistance
- Toggleable AI defense system
- Multiple AI modes: Manual, Semi-Auto, Auto
- Smart weapon selection based on threat type

### Technical Features
- Responsive canvas rendering at 60 FPS
- Efficient particle and projectile systems
- Wave-based spawning with dynamic difficulty
- Combo system for consecutive kills
- Local high score tracking

## How to Play

1. **Start the Game**: Click "LAUNCH SIMULATION" after the boot sequence
2. **Select Weapons**: Click on weapon buttons in the right panel or use them directly
3. **Target Threats**: Click on incoming threats to select them, then fire
4. **Or Click to Fire**: Click anywhere on the radar to fire at the nearest threat
5. **Manage Resources**: Watch your ammo counts and cooldowns
6. **Survive Waves**: Clear all threats to advance to the next wave

### Threat Types

| Threat | Color | Speed | HP | Damage | Priority |
|--------|-------|-------|-----|--------|----------|
| ICBM | 🔴 Red | Slow | 200 | 35 | High |
| Cruise Missile | 🟠 Orange | Medium | 80 | 20 | Medium |
| Hypersonic | 🟣 Magenta | Very Fast | 120 | 30 | High |
| Drone Swarm | 🔵 Blue | Slow | 40 | 8 | Low |
| Stealth Bomber | 🟢 Teal | Slow | 160 | 25 | Medium |
| Fighter Jet | 🟡 Yellow | Fast | 100 | 15 | Medium |
| Sea Missile | 🔴 Pink | Fast | 90 | 22 | Medium |
| Orbital Strike | 🔵 Cyan | Slow | 250 | 50 | High |

### Weapon Specifications

| Weapon | Range | Speed | Damage | Ammo | Cooldown |
|--------|-------|-------|--------|------|----------|
| SAM | 320 | 9 | 110 | 15 | 30 frames |
| CIWS | 160 | 18 | 45 | 60 | 6 frames |
| Laser | 440 | Instant | 80 | ∞ | 150 frames |
| EMP | 180 | Instant | Disable | 3 | 300 frames |
| Railgun | 500 | 40 | 250 | 8 | 120 frames |
| Shield | Self | Instant | +40 HP | 5 | 180 frames |

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/vishalbb-git/missile-defence-sim.git

# Navigate to the project directory
cd missile-defence-sim

# Open in your preferred browser
open index.html
```

### Web Server (Recommended)

For the best experience with proper font loading:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`

## Project Structure

```
missile-defence-sim/
├── index.html          # Main HTML structure
├── game.js             # Core game engine and logic
├── styles.css          # Military HUD styling
├── README.md           # This documentation
└── .git/               # Git repository
```

### File Breakdown

#### `index.html`
- Boot screen with initialization sequence
- HUD layout with stats panels
- Weapon selection interface
- Game canvas and overlays
- Responsive structure

#### `game.js`
- **AegisDefenseGame Class**: Main game controller
- **Threat System**: Enemy spawning, movement, and AI
- **Weapon System**: Firing mechanics, projectiles, effects
- **Rendering Engine**: Canvas drawing for all visual elements
- **UI Management**: HUD updates and interaction handling

#### `styles.css`
- CSS custom properties for theme consistency
- Military/sci-fi visual styling
- Responsive layouts for different screen sizes
- Animation keyframes for effects

## Architecture

### Game Loop
```javascript
update() → render() → requestAnimationFrame(loop)
```

### Core Systems
1. **Entity Management**: Arrays for threats, projectiles, particles, effects
2. **Collision Detection**: Distance-based hit calculations
3. **Wave Spawning**: Timed threat generation with difficulty scaling
4. **State Management**: Game state, pause, game over handling
5. **Rendering Pipeline**: Layered canvas drawing (background → entities → UI)

### Key Classes & Objects
- `THREAT_DEFS`: Configuration for all enemy types
- `WEAPON_DEFS`: Configuration for all weapon systems
- `AegisDefenseGame`: Main game controller class

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires HTML5 Canvas and ES6+ JavaScript support.

## Performance Tips

- The game runs at 60 FPS target
- Particle count is automatically managed
- Off-screen entities are cleaned up
- Responsive canvas sizing on window resize

## Future Enhancements

Potential features for future development:
- Multiplayer cooperative mode
- Additional weapon types (missile interceptors, drone countermeasures)
- Weather effects impacting radar visibility
- Upgrade system between waves
- Leaderboard with persistent storage
- Mobile touch controls
- Sound effects and background music

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Credits

- **Fonts**: Orbitron, Share Tech Mono, Rajdhani (Google Fonts)
- **Design**: Military/sci-fi UI inspired by real CIC and radar systems
- **Concept**: Classic missile defense games with modern web technologies

## Contact

Project Link: [https://github.com/vishalbb-git/missile-defence-sim](https://github.com/vishalbb-git/missile-defence-sim)

---

**Commander, the defense grid is ready. Awaiting your orders.**
