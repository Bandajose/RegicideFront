// ─── Interfaces de tema ──────────────────────────────────────────────────────

export interface SoundTheme {
  /** Sonido al atacar (fase attack) */
  attack?: string;
  /** Sonido cuando el jefe recibe daño */
  bossHit?: string;
  /** Fanfarria al derrotar un jefe */
  bossDefeated?: string;
  /** Notificación de "es tu turno" */
  yourTurn?: string;
  /** Música de fondo en bucle durante la partida */
  bgMusic?: string;
}

export interface CardTheme {
  /** Imagen para el reverso de TODAS las cartas del mazo/cementerio */
  backImage?: string;
  /**
   * Imágenes opcionales por carta. Clave: "<valor>_<palo>", ej: "K_♠" "7_♥" "A_♣"
   * Si una carta no tiene entrada, se usa el renderizado CSS por defecto.
   */
  faceImages?: Record<string, string>;
}

export interface BackgroundTheme {
  /**
   * Cualquier valor CSS válido: color sólido, gradiente, o url() con modificadores.
   * Ejemplo: 'url(assets/themes/custom/bg-game.jpg) center/cover no-repeat'
   */
  game?: string;
  lobby?: string;
  home?: string;
}

export interface AppTheme {
  name: string;
  sounds?: SoundTheme;
  cards?: CardTheme;
  backgrounds?: BackgroundTheme;
}

// ─── Tema por defecto (CSS / Web Audio API, sin archivos externos) ────────────

export const DEFAULT_THEME: AppTheme = {
  name: 'default',
  sounds:      {},   // undefined = usar Web Audio API
  cards:       {},   // undefined = renderizado CSS
  backgrounds: {},   // undefined = colores CSS del componente
};
