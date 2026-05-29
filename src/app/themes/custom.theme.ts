/**
 * Plantilla de tema personalizado.
 *
 * INSTRUCCIONES
 * ─────────────
 * 1. Coloca tus assets en:
 *      src/assets/themes/custom/sounds/
 *      src/assets/themes/custom/backgrounds/
 *      src/assets/themes/custom/cards/
 *
 * 2. Registra la carpeta en angular.json (si no lo está ya):
 *      "assets": ["src/favicon.ico", "src/assets"]
 *    La carpeta src/assets ya se incluye por defecto en proyectos Angular.
 *
 * 3. Para activar el tema, en app.component.ts:
 *      constructor(private themeService: ThemeService) {
 *        themeService.setTheme(CUSTOM_THEME);
 *      }
 *
 * 4. Deja en undefined cualquier propiedad que quieras mantener
 *    con el comportamiento por defecto (Web Audio API / CSS).
 */

import { AppTheme } from '../../services/theme.config';

export const CUSTOM_THEME: Partial<AppTheme> = {
  name: 'custom',

  // ── Sonidos ─────────────────────────────────────────────────────────────────
  // Formatos recomendados: .mp3 (máxima compatibilidad) o .ogg
  sounds: {
    attack:       'assets/themes/custom/sounds/attack.mp3',
    bossHit:      'assets/themes/custom/sounds/boss-hit.mp3',
    bossDefeated: 'assets/themes/custom/sounds/boss-defeated.mp3',
    yourTurn:     'assets/themes/custom/sounds/your-turn.mp3',
    bgMusic:      'assets/themes/custom/sounds/bg-music.mp3',
  },

  // ── Fondos ──────────────────────────────────────────────────────────────────
  // Acepta cualquier valor CSS: color sólido, gradiente o url() con modificadores
  backgrounds: {
    game:  'url(assets/themes/custom/backgrounds/game.jpg) center/cover no-repeat',
    lobby: 'url(assets/themes/custom/backgrounds/lobby.jpg) center/cover no-repeat',
    home:  'url(assets/themes/custom/backgrounds/home.jpg) center/cover no-repeat',
  },

  // ── Cartas ──────────────────────────────────────────────────────────────────
  cards: {
    // Imagen para el REVERSO de las cartas (mazo / cementerio)
    backImage: 'assets/themes/custom/cards/back.png',

    // Imágenes opcionales para cada cara. Clave: "<valor>_<palo>"
    // Las cartas sin entrada usan el renderizado CSS por defecto.
    //
    // Palos disponibles: ♠  ♥  ♦  ♣  Joker
    // Valores:           A  2  3  4  5  6  7  8  9  10  J  Q  K
    //
    // Ejemplos:
    //   'K_♠': 'assets/themes/custom/cards/king-spades.png',
    //   'Q_♥': 'assets/themes/custom/cards/queen-hearts.png',
    //   'J_♦': 'assets/themes/custom/cards/jack-diamonds.png',
    faceImages: {},
  },
};
