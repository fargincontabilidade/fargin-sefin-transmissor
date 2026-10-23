// Sons e músicas sintetizados com Web Audio (100% originais, sem arquivos).
class Sfx {
  constructor() {
    this.ctx = null;
    this.sfxVol = 0.6;
    this.musicVol = 0.35;
    this.track = null;
    this.musicTimer = null;
    const unlock = () => { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.master);
      if (this.pendingTrack) { const t = this.pendingTrack; this.pendingTrack = null; this.music(t); }
    } catch { this.ctx = null; }
    return this.ctx;
  }

  setVolumes(sfxVol, musicVol) {
    this.sfxVol = sfxVol; this.musicVol = musicVol;
    if (this.sfxGain) this.sfxGain.gain.value = sfxVol;
    if (this.musicGain) this.musicGain.gain.value = musicVol;
  }

  tone(freq, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0, out } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.2, delay = 0, freq = 1200, q = 0.8 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  play(name) {
    if (!this.ensure() || this.sfxVol <= 0) return;
    switch (name) {
      case 'blip': this.tone(880, 0.03, { vol: 0.03 }); break;
      case 'cursor': this.tone(660, 0.05, { vol: 0.06 }); break;
      case 'select': this.tone(784, 0.06, { vol: 0.08 }); this.tone(1046, 0.08, { vol: 0.08, delay: 0.06 }); break;
      case 'open': this.tone(523, 0.06, { vol: 0.06, type: 'triangle' }); this.tone(784, 0.08, { vol: 0.06, type: 'triangle', delay: 0.05 }); break;
      case 'close': this.tone(784, 0.06, { vol: 0.05, type: 'triangle' }); this.tone(523, 0.08, { vol: 0.05, type: 'triangle', delay: 0.05 }); break;
      case 'bump': this.tone(120, 0.08, { vol: 0.08, type: 'triangle' }); break;
      case 'door': this.noise(0.18, { vol: 0.15, freq: 500 }); break;
      case 'alert': this.tone(988, 0.08, { vol: 0.1 }); this.tone(1318, 0.14, { vol: 0.1, delay: 0.08 }); break;
      case 'encounter': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.09, { vol: 0.09, delay: i * 0.06 })); break;
      case 'hit': this.noise(0.15, { vol: 0.35, freq: 900 }); this.tone(180, 0.12, { vol: 0.12, type: 'sawtooth', slide: -100 }); break;
      case 'superhit': this.noise(0.25, { vol: 0.45, freq: 1400 }); this.tone(240, 0.2, { vol: 0.15, type: 'sawtooth', slide: -180 }); break;
      case 'weakhit': this.noise(0.1, { vol: 0.2, freq: 600 }); break;
      case 'miss': this.tone(400, 0.15, { vol: 0.06, type: 'triangle', slide: -250 }); break;
      case 'faint': this.tone(440, 0.5, { vol: 0.1, type: 'triangle', slide: -380 }); break;
      case 'fire': this.noise(0.4, { vol: 0.25, freq: 700, q: 0.5 }); break;
      case 'water': this.noise(0.35, { vol: 0.2, freq: 2200, q: 1.5 }); this.tone(600, 0.2, { vol: 0.04, type: 'sine', slide: 300 }); break;
      case 'leaf': this.noise(0.3, { vol: 0.15, freq: 3200, q: 2 }); break;
      case 'zap': this.tone(1200, 0.25, { vol: 0.08, type: 'sawtooth', slide: -900 }); this.noise(0.2, { vol: 0.2, freq: 4000 }); break;
      case 'rock': this.noise(0.3, { vol: 0.35, freq: 300 }); break;
      case 'heal': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.12, { vol: 0.07, type: 'sine', delay: i * 0.07 })); break;
      case 'stat': this.tone(600, 0.2, { vol: 0.07, type: 'triangle', slide: 500 }); break;
      case 'statdown': this.tone(900, 0.2, { vol: 0.07, type: 'triangle', slide: -500 }); break;
      case 'throw': this.tone(500, 0.2, { vol: 0.07, type: 'sine', slide: 600 }); break;
      case 'shake': this.tone(330, 0.07, { vol: 0.1, type: 'square' }); this.tone(260, 0.07, { vol: 0.1, delay: 0.08 }); break;
      case 'caught': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, { vol: 0.09, delay: i * 0.1 })); break;
      case 'break': this.noise(0.3, { vol: 0.3, freq: 2500 }); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { vol: 0.08, type: 'square', delay: i * 0.09 })); this.tone(1318, 0.35, { vol: 0.08, delay: 0.36 }); break;
      case 'evolve': for (let i = 0; i < 12; i++) this.tone(400 + i * 70, 0.1, { vol: 0.05, type: 'sine', delay: i * 0.12 }); break;
      case 'item': [659, 880].forEach((f, i) => this.tone(f, 0.1, { vol: 0.08, type: 'triangle', delay: i * 0.08 })); break;
      case 'coin': this.tone(988, 0.06, { vol: 0.07 }); this.tone(1318, 0.12, { vol: 0.07, delay: 0.06 }); break;
      case 'victory': [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { vol: 0.08, delay: i * 0.12 })); break;
      case 'defeat': [523, 466, 415, 349].forEach((f, i) => this.tone(f, 0.3, { vol: 0.08, type: 'triangle', delay: i * 0.25 })); break;
      default: break;
    }
  }

  // ---------------- Música ----------------
  music(trackName) {
    if (this.track === trackName) return;
    this.stopMusic();
    this.track = trackName;
    if (!this.ctx) { this.pendingTrack = trackName; return; }
    const tracks = {
      village: { bpm: 96, wave: 'triangle', bass: [48, 48, 53, 55], mel: [72, null, 76, 79, 77, 76, 74, null, 72, 74, 76, null, 74, 72, 69, null, 72, null, 76, 79, 81, 79, 77, 76, 74, 76, 77, 79, 76, null, null, null] },
      forest: { bpm: 84, wave: 'sine', bass: [45, 45, 41, 43], mel: [69, null, 72, null, 76, 74, 72, null, 71, null, 74, null, 72, 71, 69, null, 69, 72, 76, 79, 77, 76, 74, null, 72, 74, 71, null, 69, null, null, null] },
      battle: { bpm: 150, wave: 'square', bass: [45, 45, 48, 43], mel: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 71, 72, 74, 76, 69, 72, 76, 81, 79, 77, 76, 74, 72, 74, 76, 77, 76, 74, 72, 71] },
      interior: { bpm: 90, wave: 'sine', bass: [48, 52, 53, 55], mel: [76, null, 79, null, 84, null, 79, null, 77, null, 81, null, 79, null, 76, null] },
      title: { bpm: 104, wave: 'triangle', bass: [48, 45, 41, 43], mel: [72, 76, 79, 84, 83, 79, 76, 79, 81, 77, 74, 77, 79, 76, 72, null, 72, 76, 79, 84, 86, 84, 83, 79, 81, 84, 83, 79, 84, null, null, null] },
    };
    const tr = tracks[trackName];
    if (!tr) return;
    const step = 60 / tr.bpm / 2;
    let i = 0;
    let next = this.ctx.currentTime + 0.1;
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const schedule = () => {
      if (!this.ctx || this.track !== trackName) return;
      while (next < this.ctx.currentTime + 0.4) {
        const delay = next - this.ctx.currentTime;
        const n = tr.mel[i % tr.mel.length];
        if (n) this.tone(midi(n), step * 1.6, { type: tr.wave, vol: 0.05, delay, out: this.musicGain });
        if (i % 4 === 0) {
          const b = tr.bass[Math.floor(i / 8) % tr.bass.length];
          this.tone(midi(b), step * 3.5, { type: 'triangle', vol: 0.07, delay, out: this.musicGain });
        }
        next += step;
        i++;
      }
    };
    this.musicTimer = setInterval(schedule, 100);
    schedule();
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.track = null;
  }
}

export const sfx = new Sfx();
