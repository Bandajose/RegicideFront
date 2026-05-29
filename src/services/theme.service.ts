import { Injectable } from '@angular/core';
import { AppTheme, DEFAULT_THEME } from './theme.config';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private active: AppTheme = DEFAULT_THEME;

  get theme(): AppTheme { return this.active; }

  /**
   * Aplica un tema. Las propiedades no definidas heredan del DEFAULT_THEME.
   * Llamar desde AppComponent o en el punto de entrada que prefieras.
   */
  setTheme(theme: Partial<AppTheme>): void {
    this.active = {
      name:        theme.name        ?? DEFAULT_THEME.name,
      sounds:      theme.sounds      ?? DEFAULT_THEME.sounds,
      cards:       theme.cards       ?? DEFAULT_THEME.cards,
      backgrounds: theme.backgrounds ?? DEFAULT_THEME.backgrounds,
    };
    this.applyBackgrounds();
  }

  // ─── Backgrounds ──────────────────────────────────────────────────────────

  /**
   * Escribe las CSS custom properties en :root.
   * El SCSS de cada componente usa var(--bg-game, fallback) para consumirlas.
   */
  private applyBackgrounds(): void {
    const bg = this.active.backgrounds ?? {};
    const root = document.documentElement;
    if (bg.game)  root.style.setProperty('--bg-game',  bg.game);
    if (bg.lobby) root.style.setProperty('--bg-lobby', bg.lobby);
    if (bg.home)  root.style.setProperty('--bg-home',  bg.home);
  }

  // ─── Cartas ───────────────────────────────────────────────────────────────

  /** URL de la imagen del reverso, o null para usar CSS. */
  get cardBackImage(): string | null {
    return this.active.cards?.backImage ?? null;
  }

  /**
   * URL de la imagen de cara para una carta específica, o null para usar CSS.
   * @param value Valor de la carta: 'A', '2'…'10', 'J', 'Q', 'K'
   * @param suit  Palo: '♠' '♥' '♦' '♣' o 'Joker'
   */
  cardFaceImage(value: string, suit: string): string | null {
    return this.active.cards?.faceImages?.[`${value}_${suit}`] ?? null;
  }

  // ─── Sonidos ──────────────────────────────────────────────────────────────

  soundUrl(effect: keyof NonNullable<AppTheme['sounds']>): string | null {
    return this.active.sounds?.[effect] ?? null;
  }
}
