// Progress is saved only between fights, never mid-battle, so nobody gets stuck in a broken fight.
const Save = {
  KEY: 'shinobi_player',
  data: { lvl: 1, xp: 0, coins: 0, boss: 0, up: { hp: 0, atk: 0, def: 0 }, best: 0 },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      if (d && Number.isFinite(d.lvl) && Number.isFinite(d.xp)) this.data = Object.assign(this.data, d);
    } catch (e) { /* corrupt save: keep defaults */ }
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  reset() { localStorage.removeItem(this.KEY); location.reload(); }
};
