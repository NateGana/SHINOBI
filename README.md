# SHINOBI: NATE'S DOMAIN
Original 2D ninja action game. Plain HTML5 Canvas + CSS + vanilla JS. No dependencies.

## Run
Open `index.html` in a modern browser (no server needed).

## Controls
WASD/Arrows move · Mouse aim · Click/Space shuriken · Shift dash · Q Wind Shuriken (20 energy, piercing) · E Triple Throw (15) · R Shadow Storm (60) · Esc pause.
Mobile: left joystick, right buttons (auto-aims at nearest enemy).

## Modes
- Training Dojo: respawning dummies, practice every skill.
- Survival: endless waves of rogues, assassins, guards, beasts.
- Boss: Nate (unlocks at level 3). Three phases (70% / 35% health). Red circles are telegraphed attacks: move out before they fill. Dash (Shift) grants brief invulnerability.

## Progress
Saved in LocalStorage key `shinobi_player` (level, XP, coins, upgrades, boss victory, best wave). Spend coins in the menu shop (Health/Attack/Defense). Defeating Nate the first time grants a one-time bonus.

## Files
index.html, css/style.css, js/{utils,storage,game-engine,boss-nate,app}.js
