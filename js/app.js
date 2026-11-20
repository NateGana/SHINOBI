// Menus, shop, input wiring.
const $ = id => document.getElementById(id);
function refreshMenu() {
  const d = Save.data;
  $('stats').textContent = `Level ${d.lvl} · XP ${d.xp}/${d.lvl * 100} · Coins ${d.coins} · Nate defeated: ${d.boss ? 'YES' : 'no'} · Best wave ${d.best}`;
  $('bossBtn').disabled = d.lvl < 3 && !d.boss; $('bossBtn').title = 'Reach level 3 to challenge Nate';
  $('shop').innerHTML = '';
  [['hp', 'Health'], ['atk', 'Attack'], ['def', 'Defense']].forEach(([k, n]) => {
    const cost = 40 * (d.up[k] + 1), b = document.createElement('button'); b.textContent = `${n} +${d.up[k]} (🪙${cost})`; b.disabled = d.coins < cost;
    b.onclick = () => { d.coins -= cost; d.up[k]++; Save.save(); refreshMenu(); }; $('shop').appendChild(b);
  });
}
function showMenu() { G.run = false; $('game').classList.add('hidden'); $('menu').classList.remove('hidden'); ['over', 'pause'].forEach(i => $(i).classList.add('hidden')); refreshMenu(); }
function play(mode) { $('menu').classList.add('hidden'); $('game').classList.remove('hidden'); ['over', 'pause'].forEach(i => $(i).classList.add('hidden')); startGame(mode); }
function setPause(v) { if (!G.run || G.over) return; G.paused = v; $('pause').classList.toggle('hidden', !v); }

Save.load(); refreshMenu();
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => play(b.dataset.mode));
$('retry').onclick = () => play(G.mode); $('toMenu').onclick = $('toMenu2').onclick = showMenu;
$('resume').onclick = () => setPause(false); $('pauseBtn').onclick = () => setPause(true);
$('resetBtn').onclick = () => { if (confirm('Erase ALL progress?')) Save.reset(); };

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if ([' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  if (k === 'escape') return setPause(!G.paused);
  if (G.keys[k]) return; G.keys[k] = true;
  if (!G.run) return;
  if (k === 'shift') act('dash'); if (k === 'q') act('q'); if (k === 'e') act('e'); if (k === 'r') act('r');
});
window.addEventListener('keyup', e => G.keys[e.key.toLowerCase()] = false);
const cv = $('cv');
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); G.mouse.x = (e.clientX - r.left) * W / r.width; G.mouse.y = (e.clientY - r.top) * H / r.height; });
cv.addEventListener('mousedown', () => { G.down = true; act('shoot'); });
window.addEventListener('mouseup', () => G.down = false);
// Touch: virtual joystick + action buttons.
document.querySelectorAll('#tbtns button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); G.touch = true; act(b.dataset.act); }));
const joy = $('joy'), knob = $('knob');
function joyMove(e) { G.touch = true; const r = joy.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2), m = Math.max(1, Math.hypot(x, y)); G.joy = { x: x / m, y: y / m }; knob.style.left = 35 + G.joy.x * 35 + 'px'; knob.style.top = 35 + G.joy.y * 35 + 'px'; }
joy.addEventListener('pointerdown', e => { joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', e => { if (joy.hasPointerCapture(e.pointerId)) joyMove(e); });
['pointerup', 'pointercancel'].forEach(ev => joy.addEventListener(ev, () => { G.joy = { x: 0, y: 0 }; knob.style.left = knob.style.top = '35px'; }));
