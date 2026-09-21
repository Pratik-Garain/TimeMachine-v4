/**
 * Optional Web Audio bed. Never autoplays — starts on first user gesture.
 * If AudioContext is missing, every method is a no-op.
 */
export class AudioEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.hum = null;
    this.master = null;
    this.started = false;
    this._travel = 0;
  }

  async unlock() {
    if (this.started || !this.enabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
      this._startHum();
      this.started = true;
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.18 : 0;
  }

  _startHum() {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc2.type = "sine";
    osc.frequency.value = 62;
    osc2.frequency.value = 93;
    g.gain.value = 0.35;
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.master);
    osc.start();
    osc2.start();
    this.hum = { osc, osc2, g };
  }

  click() {
    this._blip(880, 0.04, 0.05);
  }

  lockTone() {
    this._sweep(180, 420, 0.45, 0.08);
  }

  engineRise() {
    this._sweep(70, 240, 1.6, 0.12);
  }

  rumble() {
    this._sweep(40, 90, 2.2, 0.16);
  }

  whoosh() {
    this._sweep(220, 1400, 1.1, 0.1);
  }

  setTravelLevel(t) {
    if (!this.hum) return;
    this.hum.osc.frequency.value = 62 + t * 40;
    this.hum.g.gain.value = 0.35 + t * 0.4;
  }

  _blip(freq, dur, vol) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  _sweep(from, to, dur, vol) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(from, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.05);
  }
}
