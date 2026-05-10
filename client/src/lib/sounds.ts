/** @format */

/**
 * SoundEngine — Programmatic sound synthesis via Web Audio API
 *
 * All sounds are generated in-browser (no audio file downloads).
 * Uses oscillators, gains, and filters to create distinct chimes,
 * clicks, whooshes, and fanfares for every interaction type.
 */

export type SoundName =
  | 'correct'
  | 'wrong'
  | 'click'
  | 'xp_gain'
  | 'coin_collect'
  | 'level_up'
  | 'achievement'
  | 'lesson_complete'
  | 'streak_fire'
  | 'quiz_start'
  | 'battle_start'
  | 'battle_win'
  | 'battle_lose'
  | 'timer_warning'
  | 'timer_tick'
  | 'navigate'
  | 'notification'
  | 'mascot_pop'
  | 'whoosh'
  | 'celebrate'
  | 'combo';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private _enabled: boolean = true;
  private _volume: number = 0.5;
  private lastPlayTime: Map<string, number> = new Map();
  private debounceMs = 80;

  constructor() {
    // Load persisted settings
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moneymaster-sound');
      if (saved !== null) this._enabled = saved === 'true';
      const vol = localStorage.getItem('moneymaster-sound-volume');
      if (vol !== null) this._volume = parseFloat(vol);
    }
  }

  get enabled() { return this._enabled; }
  get volume() { return this._volume; }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private canPlay(name: string): boolean {
    if (!this._enabled) return false;
    const now = Date.now();
    const last = this.lastPlayTime.get(name) || 0;
    if (now - last < this.debounceMs) return false;
    this.lastPlayTime.set(name, now);
    return true;
  }

  setEnabled(on: boolean) {
    this._enabled = on;
    localStorage.setItem('moneymaster-sound', String(on));
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('moneymaster-sound-volume', String(this._volume));
  }

  // ── Utility helpers ──────────────────────────────────────────────

  private osc(type: OscillatorType, freq: number, start: number, dur: number, vol = 1) {
    const ctx = this.getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + start);
    g.gain.setValueAtTime(vol * this._volume * 0.3, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur);
  }

  private noise(start: number, dur: number, vol = 0.3) {
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * this._volume * 0.15, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + start);
    src.stop(ctx.currentTime + start + dur);
  }

  // ── Sound definitions ────────────────────────────────────────────

  play(name: SoundName) {
    if (!this.canPlay(name)) return;
    try {
      switch (name) {
        case 'correct': return this.playCorrect();
        case 'wrong': return this.playWrong();
        case 'click': return this.playClick();
        case 'xp_gain': return this.playXpGain();
        case 'coin_collect': return this.playCoinCollect();
        case 'level_up': return this.playLevelUp();
        case 'achievement': return this.playAchievement();
        case 'lesson_complete': return this.playLessonComplete();
        case 'streak_fire': return this.playStreakFire();
        case 'quiz_start': return this.playQuizStart();
        case 'battle_start': return this.playBattleStart();
        case 'battle_win': return this.playBattleWin();
        case 'battle_lose': return this.playBattleLose();
        case 'timer_warning': return this.playTimerWarning();
        case 'timer_tick': return this.playTimerTick();
        case 'navigate': return this.playNavigate();
        case 'notification': return this.playNotification();
        case 'mascot_pop': return this.playMascotPop();
        case 'whoosh': return this.playWhoosh();
        case 'celebrate': return this.playCelebrate();
        case 'combo': return this.playCombo();
      }
    } catch { /* Silently handle audio errors */ }
  }

  // Ascending two-tone major chime (C5 → E5)
  private playCorrect() {
    this.osc('sine', 523, 0, 0.15, 0.8);
    this.osc('sine', 659, 0.08, 0.2, 0.9);
    this.osc('sine', 784, 0.14, 0.25, 0.6);
  }

  // Descending minor buzz
  private playWrong() {
    this.osc('square', 330, 0, 0.12, 0.4);
    this.osc('square', 260, 0.1, 0.15, 0.35);
    this.osc('sawtooth', 200, 0.18, 0.2, 0.2);
  }

  // Soft click
  private playClick() {
    this.osc('sine', 800, 0, 0.05, 0.4);
    this.osc('sine', 600, 0.02, 0.04, 0.2);
  }

  // Coin-like ascending arpeggio
  private playXpGain() {
    this.osc('sine', 880, 0, 0.1, 0.6);
    this.osc('sine', 1100, 0.06, 0.1, 0.5);
    this.osc('sine', 1320, 0.12, 0.15, 0.4);
    this.osc('triangle', 1760, 0.16, 0.2, 0.3);
  }

  // Coin drop clink
  private playCoinCollect() {
    this.osc('sine', 1400, 0, 0.06, 0.6);
    this.osc('sine', 1800, 0.04, 0.08, 0.5);
    this.osc('triangle', 2200, 0.08, 0.12, 0.3);
  }

  // Major chord fanfare
  private playLevelUp() {
    // C major chord
    this.osc('sine', 523, 0, 0.3, 0.7);
    this.osc('sine', 659, 0, 0.3, 0.5);
    this.osc('sine', 784, 0, 0.3, 0.4);
    // Resolve up
    this.osc('sine', 784, 0.25, 0.3, 0.7);
    this.osc('sine', 988, 0.25, 0.3, 0.5);
    this.osc('sine', 1175, 0.25, 0.4, 0.4);
    // High sparkle
    this.osc('sine', 1568, 0.5, 0.5, 0.3);
    this.noise(0.5, 0.3, 0.15);
  }

  // Achievement unlock sparkle
  private playAchievement() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((f, i) => {
      this.osc('sine', f, i * 0.08, 0.2, 0.6 - i * 0.1);
      this.osc('triangle', f * 2, i * 0.08, 0.15, 0.2);
    });
    this.noise(0.3, 0.4, 0.2);
  }

  // Lesson complete celebration
  private playLessonComplete() {
    this.osc('sine', 523, 0, 0.15, 0.6);
    this.osc('sine', 659, 0.1, 0.15, 0.6);
    this.osc('sine', 784, 0.2, 0.15, 0.6);
    this.osc('sine', 1047, 0.3, 0.4, 0.8);
    this.osc('triangle', 1047, 0.3, 0.4, 0.3);
    this.noise(0.35, 0.3, 0.15);
  }

  // Whoosh + sparkle for streak milestones
  private playStreakFire() {
    this.noise(0, 0.3, 0.4);
    this.osc('sine', 400, 0, 0.1, 0.3);
    this.osc('sine', 800, 0.05, 0.1, 0.4);
    this.osc('sine', 1200, 0.1, 0.15, 0.5);
    this.osc('sine', 1600, 0.15, 0.2, 0.4);
  }

  // Quiz countdown start
  private playQuizStart() {
    this.osc('sine', 440, 0, 0.15, 0.5);
    this.osc('sine', 554, 0.15, 0.15, 0.5);
    this.osc('sine', 659, 0.3, 0.15, 0.5);
    this.osc('sine', 880, 0.45, 0.3, 0.7);
  }

  // Battle horn
  private playBattleStart() {
    this.osc('sawtooth', 220, 0, 0.2, 0.3);
    this.osc('sawtooth', 330, 0.15, 0.2, 0.35);
    this.osc('sawtooth', 440, 0.3, 0.3, 0.4);
    this.osc('sine', 880, 0.5, 0.4, 0.5);
    this.noise(0.5, 0.3, 0.2);
  }

  // Victory fanfare
  private playBattleWin() {
    this.osc('sine', 523, 0, 0.2, 0.7);
    this.osc('sine', 659, 0.1, 0.2, 0.6);
    this.osc('sine', 784, 0.2, 0.2, 0.7);
    this.osc('sine', 1047, 0.35, 0.5, 0.9);
    this.osc('triangle', 1047, 0.35, 0.5, 0.3);
    this.noise(0.4, 0.4, 0.25);
    this.osc('sine', 1568, 0.6, 0.5, 0.4);
  }

  // Defeat sound
  private playBattleLose() {
    this.osc('sine', 440, 0, 0.25, 0.5);
    this.osc('sine', 370, 0.2, 0.25, 0.4);
    this.osc('sine', 330, 0.4, 0.35, 0.3);
    this.osc('sine', 262, 0.6, 0.5, 0.2);
  }

  // Urgent beep
  private playTimerWarning() {
    this.osc('square', 880, 0, 0.08, 0.5);
    this.osc('square', 880, 0.15, 0.08, 0.5);
  }

  // Single tick
  private playTimerTick() {
    this.osc('sine', 1000, 0, 0.03, 0.3);
  }

  // Soft whoosh for page transitions
  private playNavigate() {
    this.noise(0, 0.15, 0.15);
    this.osc('sine', 400, 0, 0.1, 0.15);
  }

  // Notification ding
  private playNotification() {
    this.osc('sine', 880, 0, 0.1, 0.5);
    this.osc('sine', 1100, 0.08, 0.15, 0.4);
  }

  // Mascot pop-in sound
  private playMascotPop() {
    this.osc('sine', 600, 0, 0.06, 0.4);
    this.osc('sine', 900, 0.04, 0.08, 0.5);
    this.osc('sine', 1200, 0.08, 0.1, 0.3);
  }

  // Swoosh
  private playWhoosh() {
    this.noise(0, 0.25, 0.3);
    const ctx = this.getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(this._volume * 0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.25);
  }

  // Full celebration (for overlays)
  private playCelebrate() {
    this.playLessonComplete();
    setTimeout(() => this.noise(0, 0.2, 0.15), 400);
  }

  // Combo streak sound (ascending)
  private playCombo() {
    this.osc('sine', 660, 0, 0.08, 0.5);
    this.osc('sine', 880, 0.06, 0.08, 0.6);
    this.osc('sine', 1100, 0.12, 0.1, 0.5);
    this.osc('triangle', 1320, 0.16, 0.12, 0.4);
  }
}

export const soundEngine = new SoundEngine();
