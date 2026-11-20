// Small helpers shared by every other file.
const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  rand: (a, b) => a + Math.random() * (b - a),
  ang: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  audio: null,
  // Tiny synthesized sound effect so we need no audio files.
  beep(freq, dur = 0.08, type = 'square') {
    try {
      this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = 0.04;
      o.connect(g); g.connect(this.audio.destination); o.start(); o.stop(this.audio.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }
};
