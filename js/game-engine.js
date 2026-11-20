// Core game: player, shurikens, enemies, abilities, combat, rendering.
const W = 960, H = 540;
const G = { mode: null, run: false, paused: false, keys: {}, mouse: { x: W / 2, y: H / 2 }, down: false, joy: { x: 0, y: 0 },
  touch: false, enemies: [], shots: [], eshots: [], zones: [], fx: [], txt: [], p: null, boss: null, wave: 0, t: 0, shake: 0, kills: 0, last: 0, earned: 0 };

const TYPES = { // sample stats; tweak freely
  dummy:    { hp: 80,  atk: 0,  def: 0,  spd: 0,   r: 18, xp: 5,  col: '#a67c52' },
  rogue:    { hp: 70,  atk: 10, def: 2,  spd: 70,  r: 16, xp: 15, col: '#6b7280', ranged: 1 },
  assassin: { hp: 90,  atk: 14, def: 3,  spd: 170, r: 15, xp: 25, col: '#7c3aed' },
  guard:    { hp: 220, atk: 20, def: 10, spd: 100, r: 18, xp: 50, col: '#C93636' },
  beast:    { hp: 420, atk: 35, def: 6,  spd: 55,  r: 32, xp: 90, col: '#3f3f46' }
};

function playerStats() {
  const d = Save.data, L = d.lvl - 1;
  return { maxHp: 100 + 20 * L + d.up.hp * 20, maxEn: 100, atk: 20 + 3 * L + d.up.atk * 3, def: 2 + L + d.up.def * 2 };
}
function newPlayer() {
  const s = playerStats();
  return Object.assign({ x: W / 2, y: H - 120, r: 14, hp: s.maxHp, en: s.maxEn, ang: 0, cd: 0, dashCd: 0, qCd: 0, eCd: 0, rCd: 0, dashT: 0, inv: 0, dx: 0, dy: 0, state: 'IDLE' }, s);
}
function spawn(type, x, y) { const t = TYPES[type]; G.enemies.push(Object.assign({ type, x, y, hp: t.hp, max: t.hp, cd: 1, flash: 0, dead: false }, t)); }

function startGame(mode) {
  Object.assign(G, { mode, enemies: [], shots: [], eshots: [], zones: [], fx: [], txt: [], boss: null, wave: 0, t: 0, kills: 0, earned: 0, run: true, paused: false, over: false });
  G.p = newPlayer();
  if (mode === 'training') { spawn('dummy', 300, 200); spawn('dummy', 660, 200); spawn('dummy', 480, 120); }
  if (mode === 'boss') { G.boss = makeNate(); banner('THE SHADOW EMPEROR HAS ARRIVED.'); }
  G.last = performance.now(); requestAnimationFrame(loop);
}
function banner(text) { const b = document.getElementById('banner'); b.textContent = text; b.classList.remove('hidden'); setTimeout(() => b.classList.add('hidden'), 2200); }
function floatText(x, y, s, col = '#fff') { G.txt.push({ x, y, s, col, t: 0.8 }); }
function spark(x, y, col = '#E9BD65', n = 8) { for (let i = 0; i < n; i++) G.fx.push({ x, y, vx: U.rand(-150, 150), vy: U.rand(-150, 150), t: 0.4, col }); }

// ---------- input actions ----------
function aimAngle() {
  const p = G.p;
  if (G.touch) { // no mouse on phones: aim at the nearest enemy
    const live = G.enemies.filter(e => !e.dead).concat(G.boss && G.boss.hp > 0 ? [G.boss] : []);
    if (live.length) return U.ang(p, live.sort((a, b) => U.dist(a, p) - U.dist(b, p))[0]);
    return p.ang;
  }
  return U.ang(p, G.mouse);
}
function shotDmg() { return G.p.atk + Save.data.up.atk * 2; }
function fire(a, o = {}) {
  const sp = o.sp || 620;
  G.shots.push(Object.assign({ x: G.p.x, y: G.p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, r: 8, dmg: shotDmg(), pierce: false, hit: [], life: 1.3, col: '#ddd' }, o));
}
function act(name) {
  const p = G.p; if (!G.run || G.paused || G.over || p.state === 'DEFEATED') return;
  const a = aimAngle(); p.ang = a;
  if (name === 'shoot' && p.cd <= 0) { p.cd = 0.28; fire(a); U.beep(700, .05); }
  if (name === 'dash' && p.dashCd <= 0) {
    // Dash keeps the player invulnerable for a brief window.
    const k = G.keys;
    let dx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), dy = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (G.joy.x || G.joy.y) { dx = G.joy.x; dy = G.joy.y; }
    if (!dx && !dy) { dx = Math.cos(a); dy = Math.sin(a); }
    const m = Math.hypot(dx, dy); p.dx = dx / m; p.dy = dy / m; p.dashT = 0.18; p.inv = 0.3; p.dashCd = 1.2; p.state = 'DASHING'; U.beep(300, .1, 'sawtooth');
  }
  if (name === 'q' && p.qCd <= 0 && p.en >= 20) { p.en -= 20; p.qCd = 4; fire(a, { sp: 800, r: 16, dmg: shotDmg() * 3, pierce: true, col: '#3988FF' }); U.beep(900, .15, 'sine'); }
  if (name === 'e' && p.eCd <= 0 && p.en >= 15) { p.en -= 15; p.eCd = 3; [-0.25, 0, 0.25].forEach(o => fire(a + o)); U.beep(500, .1); }
  if (name === 'r' && p.rCd <= 0 && p.en >= 60) {
    p.en -= 60; p.rCd = 15; G.shake = 10;
    for (let i = 0; i < 16; i++) fire(i * Math.PI / 8, { sp: 450, dmg: shotDmg() * 1.5, pierce: true, col: '#E9BD65', life: 0.9 });
    U.beep(150, .4, 'sawtooth');
  }
}

// ---------- damage ----------
function damagePlayer(raw) {
  const p = G.p; if (p.inv > 0 || p.state === 'DEFEATED') return;
  const d = Math.max(Math.ceil(raw * 0.25), raw - p.def); // never fully negated
  p.hp -= d; p.inv = 0.5; G.shake = 6; floatText(p.x, p.y - 20, '-' + d, '#C93636'); U.beep(120, .12, 'sawtooth');
  if (p.hp <= 0) { p.hp = 0; p.state = 'DEFEATED'; endGame(false); }
}
function hitEnemy(e, s) {
  const crit = Math.random() < 0.15, raw = s.dmg * (crit ? 2 : 1);
  const d = Math.max(Math.ceil(raw * 0.2), Math.round(raw - e.def)); // minimum damage so high defense is never immunity
  e.hp -= d; e.flash = 0.1; spark(s.x, s.y); floatText(e.x, e.y - e.r - 6, (crit ? '!' : '') + d, crit ? '#E9BD65' : '#fff'); U.beep(250, .05);
  if (e === G.boss) return;
  if (e.hp <= 0 && !e.dead) { // dead flag guards against double rewards
    e.dead = true; G.kills++; gainXp(e.xp, Math.round(e.xp / 3));
  }
}
function gainXp(xp, coins) {
  const d = Save.data; d.xp += xp; d.coins += coins; G.earned += xp;
  while (d.xp >= d.lvl * 100) { d.xp -= d.lvl * 100; d.lvl++; const s = playerStats(), p = G.p; Object.assign(p, s); p.hp = s.maxHp; floatText(p.x, p.y - 40, 'LEVEL UP!', '#E9BD65'); U.beep(880, .3, 'sine'); }
  Save.save();
}
function endGame(win) {
  if (G.over) return; G.over = true;
  if (win && G.mode === 'boss' && !Save.data.boss) { Save.data.boss = 1; gainXp(1000, 500); }
  if (G.mode === 'survival' && G.wave > Save.data.best) { Save.data.best = G.wave; Save.save(); }
  setTimeout(() => {
    G.run = false;
    document.getElementById('overT').textContent = win ? 'YOU DEFEATED NATE.' : 'DEFEATED';
    document.getElementById('overP').textContent = `Enemies defeated: ${G.kills} · XP earned: ${G.earned} · Time: ${Math.round(G.t)}s` + (G.mode === 'survival' ? ` · Wave ${G.wave}` : '');
    document.getElementById('over').classList.remove('hidden');
  }, win ? 1500 : 600);
}

// ---------- update ----------
function update(dt) {
  const p = G.p, k = G.keys; G.t += dt;
  ['cd', 'dashCd', 'qCd', 'eCd', 'rCd', 'inv'].forEach(n => p[n] = Math.max(0, p[n] - dt));
  p.en = Math.min(p.maxEn, p.en + 6 * dt);
  if (p.state !== 'DEFEATED') {
    p.ang = aimAngle();
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.dx * 700 * dt; p.y += p.dy * 700 * dt; if (p.dashT <= 0) p.state = 'IDLE'; }
    else {
      let dx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + G.joy.x, dy = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0) + G.joy.y;
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      p.x += dx * 220 * dt; p.y += dy * 220 * dt; p.state = m ? 'MOVING' : 'IDLE';
      if (G.down || k[' ']) act('shoot');
    }
    // Keep the player inside the arena.
    p.x = U.clamp(p.x, p.r, W - p.r); p.y = U.clamp(p.y, p.r, H - p.r);
  }
  const targets = G.enemies.filter(e => !e.dead).concat(G.boss && G.boss.hp > 0 ? [G.boss] : []);
  G.shots.forEach(s => {
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += 20 * dt; s.life -= dt;
    targets.forEach(e => { // each shuriken damages a target at most once
      if (!s.dead && !s.hit.includes(e) && Math.hypot(s.x - e.x, s.y - e.y) < e.r + s.r) { s.hit.push(e); hitEnemy(e, s); if (!s.pierce) s.dead = true; }
    });
    if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) s.dead = true;
  });
  G.shots = G.shots.filter(s => !s.dead && s.life > 0);
  G.eshots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (Math.hypot(s.x - p.x, s.y - p.y) < s.r + p.r) { damagePlayer(s.dmg); s.life = 0; } });
  G.eshots = G.eshots.filter(s => s.life > 0);
  G.zones.forEach(z => { z.t += dt; if (z.t >= z.max) { if (Math.hypot(z.x - p.x, z.y - p.y) < z.r + p.r) damagePlayer(z.dmg); spark(z.x, z.y, '#C93636', 20); G.shake = 8; z.done = true; } });
  G.zones = G.zones.filter(z => !z.done);
  G.enemies.forEach(e => { if (e.flash > 0) e.flash -= dt; if (!e.dead) enemyAI(e, dt); });
  G.enemies = G.enemies.filter(e => !e.dead);
  if (G.boss) updateNate(G.boss, dt);
  if (G.mode === 'training') { const dummies = G.enemies.length; for (let i = dummies; i < 3; i++) spawn('dummy', U.rand(150, 800), U.rand(100, 260)); }
  if (G.mode === 'survival' && !G.enemies.length) {
    G.wave++; banner('WAVE ' + G.wave); const types = ['rogue', 'assassin', 'guard', 'beast'];
    for (let i = 0; i < 2 + G.wave; i++) spawn(types[Math.floor(Math.random() * Math.min(4, 1 + G.wave / 2))], U.rand(40, W - 40), 30);
  }
  G.txt.forEach(t => { t.t -= dt; t.y -= 30 * dt; }); G.txt = G.txt.filter(t => t.t > 0);
  G.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }); G.fx = G.fx.filter(f => f.t > 0);
  G.shake = Math.max(0, G.shake - 30 * dt);
}

function enemyAI(e, dt) {
  const p = G.p, d = U.dist(e, p), a = U.ang(e, p); e.cd -= dt;
  if (e.type === 'dummy') return;
  if (e.ranged) { // rogue keeps distance and throws kunai
    const want = d > 260 ? 1 : d < 180 ? -1 : 0; e.x += Math.cos(a) * e.spd * want * dt; e.y += Math.sin(a) * e.spd * want * dt;
    if (e.cd <= 0 && d < 420) { e.cd = 1.8; G.eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 6, dmg: e.atk, life: 2, col: '#aaa' }); }
  } else { // melee types rush the player; stronger ones hit harder
    if (d > e.r + p.r) { e.x += Math.cos(a) * e.spd * dt; e.y += Math.sin(a) * e.spd * dt; }
    else if (e.cd <= 0) { e.cd = e.type === 'assassin' ? 0.7 : 1.3; damagePlayer(e.atk); }
  }
}

// ---------- drawing ----------
function draw(ctx) {
  const dark = G.boss ? (G.boss.phase === 3 ? 0.55 : 0.3) : 0;
  ctx.save(); if (G.shake) ctx.translate(U.rand(-G.shake, G.shake), U.rand(-G.shake, G.shake));
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, G.boss ? '#2a0f14' : '#2b3a4a'); bg.addColorStop(1, '#191B25'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d2230'; [[0, 160, 200, 60], [260, 140, 260, 40], [620, 170, 340, 70]].forEach(m => { ctx.beginPath(); ctx.moveTo(m[0], 230); ctx.lineTo(m[0] + m[2] / 2, m[1] - m[3] + 40); ctx.lineTo(m[0] + m[2], 230); ctx.fill(); });
  ctx.fillStyle = G.mode === 'boss' ? '#241418' : G.mode === 'survival' ? '#18241c' : '#2a2a20'; ctx.fillRect(0, 230, W, H - 230);
  ctx.fillStyle = '#F97316'; [[40, 260], [920, 260], [40, 500], [920, 500]].forEach(l => { ctx.beginPath(); ctx.arc(l[0], l[1], 6, 0, 7); ctx.fill(); }); // lanterns
  G.zones.forEach(z => { ctx.strokeStyle = '#C93636'; ctx.fillStyle = `rgba(201,54,54,${0.15 + 0.3 * z.t / z.max})`; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); ctx.stroke(); }); // warning telegraph
  G.enemies.forEach(e => drawBody(ctx, e, e.flash > 0 ? '#fff' : e.col, e.r));
  if (G.boss && G.boss.hp > 0) drawNate(ctx, G.boss);
  drawBody(ctx, G.p, G.p.inv > 0 && Math.floor(G.t * 20) % 2 ? '#888' : '#F97316', G.p.r, true);
  G.shots.forEach(s => { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = s.col; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s.r * 0.4 : s.r * 1.3, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); });
  G.eshots.forEach(s => { ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
  G.fx.forEach(f => { ctx.fillStyle = f.col; ctx.fillRect(f.x, f.y, 3, 3); });
  ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; G.txt.forEach(t => { ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y); });
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function drawBody(ctx, e, col, r, isPlayer) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.fill();
  if (isPlayer) { ctx.fillStyle = '#C93636'; ctx.fillRect(e.x - r, e.y - r * 0.6, r * 2, 5); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x + Math.cos(e.ang) * 7, e.y + Math.sin(e.ang) * 7, 3, 0, 7); ctx.fill(); }
  else if (e.max) { ctx.fillStyle = '#15151A'; ctx.fillRect(e.x - r, e.y - r - 10, r * 2, 4); ctx.fillStyle = '#43C878'; ctx.fillRect(e.x - r, e.y - r - 10, r * 2 * Math.max(0, e.hp / e.max), 4); }
}

// ---------- loop & HUD ----------
function loop(now) {
  if (!G.run) return;
  const dt = Math.min(0.05, (now - G.last) / 1000); G.last = now;
  if (!G.paused) update(dt);
  draw(document.getElementById('cv').getContext('2d')); updateHud();
  requestAnimationFrame(loop);
}
function updateHud() {
  const p = G.p, d = Save.data, $ = id => document.getElementById(id), cd = (n, v) => v > 0 ? `${n}:${v.toFixed(1)}` : `${n}:✔`;
  $('hp').style.width = 100 * p.hp / p.maxHp + '%'; $('en').style.width = 100 * p.en / p.maxEn + '%';
  $('lvl').textContent = `Lv ${d.lvl} · XP ${d.xp}/${d.lvl * 100} · 🪙${d.coins}`;
  $('cds').textContent = [cd('Dash', p.dashCd), cd('Q', p.qCd), cd('E', p.eCd), cd('R', p.rCd)].join('  ');
  $('info').textContent = G.mode === 'survival' ? `Wave ${G.wave} · Enemies ${G.enemies.length} · Best ${d.best}` : G.mode === 'training' ? 'Training: dummies respawn. Try every skill.' : '';
  const b = G.boss; $('boss').classList.toggle('hidden', !b);
  if (b) { $('bhp').style.width = 100 * Math.max(0, b.hp) / b.max + '%'; $('phase').textContent = `Phase ${b.phase} · ${Math.max(0, Math.ceil(100 * b.hp / b.max))}%`; }
}
