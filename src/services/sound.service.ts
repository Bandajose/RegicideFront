import { Injectable } from '@angular/core';
import { ThemeService } from './theme.service';
import { AppTheme } from './theme.config';

@Injectable({ providedIn: 'root' })
export class SoundService {
  muted: boolean;

  private ctx: AudioContext | null = null;
  private bgMusicAudio: HTMLAudioElement | null = null;

  constructor(private themeService: ThemeService) {
    this.muted = localStorage.getItem('soundMuted') === 'true';
  }

  toggleMute(): void {
    this.muted = !this.muted;
    localStorage.setItem('soundMuted', String(this.muted));
    if (this.muted) this.stopBgMusic();
  }

  // ─── Música de fondo ──────────────────────────────────────────────────────

  startBgMusic(): void {
    const url = this.themeService.soundUrl('bgMusic');
    if (!url || this.muted || this.bgMusicAudio) return;
    this.bgMusicAudio = new Audio(url);
    this.bgMusicAudio.loop = true;
    this.bgMusicAudio.volume = 0.4;
    this.bgMusicAudio.play().catch(() => {});
  }

  stopBgMusic(): void {
    if (!this.bgMusicAudio) return;
    this.bgMusicAudio.pause();
    this.bgMusicAudio = null;
  }

  // ─── Internos ─────────────────────────────────────────────────────────────

  private ac(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private osc(
    ctx: AudioContext,
    type: OscillatorType,
    freq: number,
    freqEnd: number,
    vol: number,
    duration: number,
    start = 0,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + start;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  /** Reproduce un archivo de audio del tema. Devuelve true si lo reprodujo. */
  private playFile(effect: keyof NonNullable<AppTheme['sounds']>): boolean {
    const url = this.themeService.soundUrl(effect);
    if (!url) return false;
    const audio = new Audio(url);
    audio.volume = 0.75;
    audio.play().catch(() => {});
    return true;
  }

  // ─── Sonidos ──────────────────────────────────────────────────────────────

  /** Carta(s) lanzadas al atacar */
  attack(): void {
    if (this.muted) return;
    if (this.playFile('attack')) return;
    const ctx = this.ac();
    this.osc(ctx, 'sawtooth', 380, 160, 0.35, 0.13);
    this.osc(ctx, 'sine',     260, 120, 0.18, 0.18);
  }

  /** Boss recibe daño (salud baja) */
  bossHit(): void {
    if (this.muted) return;
    if (this.playFile('bossHit')) return;
    const ctx = this.ac();
    this.osc(ctx, 'sine',   110, 40,  0.55, 0.32);
    this.osc(ctx, 'square',  80, 30,  0.18, 0.22);
    this.osc(ctx, 'sine',   220, 80,  0.12, 0.18, 0.04);
  }

  /** Boss derrotado */
  bossDefeated(): void {
    if (this.muted) return;
    if (this.playFile('bossDefeated')) return;
    const ctx = this.ac();
    const notes = [261.63, 329.63, 392, 523.25];
    notes.forEach((freq, i) => {
      this.osc(ctx, 'sine',     freq,     freq,     0.32, 0.38, i * 0.14);
      this.osc(ctx, 'triangle', freq * 2, freq * 2, 0.10, 0.30, i * 0.14 + 0.03);
    });
    this.osc(ctx, 'sine', 1046.5, 1046.5, 0.18, 0.55, notes.length * 0.14);
  }

  /** Es tu turno */
  yourTurn(): void {
    if (this.muted) return;
    if (this.playFile('yourTurn')) return;
    const ctx = this.ac();
    this.osc(ctx, 'sine', 660,  660,  0.30, 0.50);
    this.osc(ctx, 'sine', 880,  880,  0.18, 0.40, 0.10);
    this.osc(ctx, 'sine', 1320, 1320, 0.10, 0.30, 0.20);
  }
}
