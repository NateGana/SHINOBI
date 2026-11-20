// Nate, the Shadow Emperor. Each phase has its own attack list so patterns are easy to tune.
function makeNate() {
  // Sample values: tuned so the fight is hard but winnable with upgrades.
  return { x: W / 2, y: 110, r: 34, hp: 5000, max: 5000, def: 10, atk: 25, phase: 1, cd: 2.5, dashT: 0, dx: 0, dy: 0, flash: 0 };
}
function nateShot(b, ang, dmg) { G.eshots.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, r: 9, dmg, life: 3, col: '#E9BD65' }); }
function updateNate(b, dt) {
  const p = G.p;
  if (b.hp <= 0) { if (!b.dying) { b.dying = true; G.eshots = []; G.zones = []; spark(b.x, b.y, '#C93636', 60); G.shake = 20; endGame(true); } return; }
  if (G.over) return; // stop his AI once the fight has ended
  const ratio = b.hp / b.max, phase = ratio > 0.7 ? 1 : ratio > 0.35 ? 2 : 3;
  if (phase !== b.phase) { b.phase = phase; G.shake = 15; banner(phase === 2 ? 'PHASE 2 — SHADOW MASTER' : 'PHASE 3 — SHADOW EMPEROR'); b.cd = 1.5; }
  if (b.flash > 0) b.flash -= dt;
  const d = U.dist(b, p), a = U.ang(b, p), spd = [0, 110, 140, 170][phase];
  if (b.dashT > 0) { // dash attack: lunges in a straight line
    b.dashT -= dt; b.x += b.dx * 600 * dt; b.y += b.dy * 600 * dt;
    if (d < b.r + p.r) damagePlayer(b.atk + 10 * phase);
  } else if (d > 280) { b.x += Math.cos(a) * spd * dt; b.y += Math.sin(a) * spd * dt; }
  else if (d < 140) { b.x -= Math.cos(a) * spd * 0.6 * dt; b.y -= Math.sin(a) * spd * 0.6 * dt; }
  b.x = U.clamp(b.x, 40, W - 40); b.y = U.clamp(b.y, 40, H - 40);
  b.cd -= dt; if (b.cd > 0) return;
  const roll = Math.random();
  // Attack choice depends on distance and phase, with some randomness so it is not predictable.
  if (phase === 1) {
    if (d > 250 || roll < 0.5) { [-0.2, 0, 0.2].forEach(o => nateShot(b, a + o, 18)); b.cd = 1.4; }
    else { b.dx = Math.cos(a); b.dy = Math.sin(a); b.dashT = 0.25; b.cd = 1.8; }
  } else if (phase === 2) {
    if (roll < 0.35) { for (let i = -2; i <= 2; i++) nateShot(b, a + i * 0.2, 22); b.cd = 1.2; }
    else if (roll < 0.7) { G.zones.push({ x: b.x, y: b.y, r: 150, t: 0, max: 0.9, dmg: 45 }); b.cd = 1.4; }
    else { G.zones.push({ x: p.x, y: p.y, r: 90, t: 0, max: 0.8, dmg: 50 }); b.cd = 1; }
  } else {
    if (roll < 0.3) { for (let i = 0; i < 16; i++) nateShot(b, i * Math.PI / 8, 26); b.cd = 1.1; }
    else if (roll < 0.55) { G.zones.push({ x: b.x, y: b.y, r: 220, t: 0, max: 1, dmg: 60 }); b.cd = 1.2; }
    else if (roll < 0.8) { // short teleport next to the player, followed by a delayed shockwave
      b.x = U.clamp(p.x + U.rand(-160, 160), 40, W - 40); b.y = U.clamp(p.y + U.rand(-160, 160), 40, H - 40); spark(b.x, b.y, '#7c3aed', 20);
      G.zones.push({ x: b.x, y: b.y, r: 130, t: 0, max: 0.9, dmg: 55 }); b.cd = 1.2;
    } else { for (let i = -3; i <= 3; i++) nateShot(b, a + i * 0.15, 26); b.cd = 0.8; }
  }
}
function drawNate(ctx, b) {
  ctx.save(); ctx.shadowColor = b.phase === 3 ? '#C93636' : '#7c3aed'; ctx.shadowBlur = 20 + 10 * b.phase; // aura grows with phase
  ctx.fillStyle = b.flash > 0 ? '#fff' : '#15151A'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
  ctx.fillStyle = '#C93636'; ctx.fillRect(b.x - b.r, b.y - 6, b.r * 2, 8); // armor band
  ctx.fillStyle = '#ff3030'; ctx.fillRect(b.x - 14, b.y - 18, 8, 4); ctx.fillRect(b.x + 6, b.y - 18, 8, 4); // glowing eyes
  ctx.restore();
}
