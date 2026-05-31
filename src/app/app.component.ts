import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  constructor(themeService: ThemeService) {
    themeService.setTheme({
      name: 'custom',
      cards: {
        backImage: 'assets/themes/custom/cards/back.png',
        faceImages: {
          // ── Espadas ♠ ───────────────────────────────────────────────────────
          'A_♠':  'assets/themes/custom/cards/ace-spades.png',
          // '2_♠':  'assets/themes/custom/cards/2-spades.png',
          // '3_♠':  'assets/themes/custom/cards/3-spades.png',
          // '4_♠':  'assets/themes/custom/cards/4-spades.png',
          // '5_♠':  'assets/themes/custom/cards/5-spades.png',
          // '6_♠':  'assets/themes/custom/cards/6-spades.png',
          // '7_♠':  'assets/themes/custom/cards/7-spades.png',
          // '8_♠':  'assets/themes/custom/cards/8-spades.png',
          // '9_♠':  'assets/themes/custom/cards/9-spades.png',
          // '10_♠': 'assets/themes/custom/cards/10-spades.png',
          'J_♠':  'assets/themes/custom/cards/jack-spades.png',
          'Q_♠':  'assets/themes/custom/cards/queen-spades.png',
          'K_♠':  'assets/themes/custom/cards/king-spades.png',

          // ── Corazones ♥ ─────────────────────────────────────────────────────
          'A_♥':  'assets/themes/custom/cards/ace-hearts.png',
          // '2_♥':  'assets/themes/custom/cards/2-hearts.png',
          // '3_♥':  'assets/themes/custom/cards/3-hearts.png',
          // '4_♥':  'assets/themes/custom/cards/4-hearts.png',
          // '5_♥':  'assets/themes/custom/cards/5-hearts.png',
          // '6_♥':  'assets/themes/custom/cards/6-hearts.png',
          // '7_♥':  'assets/themes/custom/cards/7-hearts.png',
          // '8_♥':  'assets/themes/custom/cards/8-hearts.png',
          // '9_♥':  'assets/themes/custom/cards/9-hearts.png',
          // '10_♥': 'assets/themes/custom/cards/10-hearts.png',
          'J_♥':  'assets/themes/custom/cards/jack-hearts.png',
          'Q_♥':  'assets/themes/custom/cards/queen-hearts.png',
          'K_♥':  'assets/themes/custom/cards/king-hearts.png',

          // ── Diamantes ♦ ─────────────────────────────────────────────────────
          'A_♦':  'assets/themes/custom/cards/ace-diamonds.png',
          // '2_♦':  'assets/themes/custom/cards/2-diamonds.png',
          // '3_♦':  'assets/themes/custom/cards/3-diamonds.png',
          // '4_♦':  'assets/themes/custom/cards/4-diamonds.png',
          // '5_♦':  'assets/themes/custom/cards/5-diamonds.png',
          // '6_♦':  'assets/themes/custom/cards/6-diamonds.png',
          // '7_♦':  'assets/themes/custom/cards/7-diamonds.png',
          // '8_♦':  'assets/themes/custom/cards/8-diamonds.png',
          // '9_♦':  'assets/themes/custom/cards/9-diamonds.png',
          // '10_♦': 'assets/themes/custom/cards/10-diamonds.png',
          'J_♦':  'assets/themes/custom/cards/jack-diamonds.png',
          'Q_♦':  'assets/themes/custom/cards/queen-diamonds.png',
          'K_♦':  'assets/themes/custom/cards/king-diamonds.png',

          // ── Tréboles ♣ ──────────────────────────────────────────────────────
          'A_♣':  'assets/themes/custom/cards/ace-clubs.png',
          // '2_♣':  'assets/themes/custom/cards/2-clubs.png',
          // '3_♣':  'assets/themes/custom/cards/3-clubs.png',
          // '4_♣':  'assets/themes/custom/cards/4-clubs.png',
          // '5_♣':  'assets/themes/custom/cards/5-clubs.png',
          // '6_♣':  'assets/themes/custom/cards/6-clubs.png',
          // '7_♣':  'assets/themes/custom/cards/7-clubs.png',
          // '8_♣':  'assets/themes/custom/cards/8-clubs.png',
          // '9_♣':  'assets/themes/custom/cards/9-clubs.png',
          // '10_♣': 'assets/themes/custom/cards/10-clubs.png',
          'J_♣':  'assets/themes/custom/cards/jack-clubs.png',
          'Q_♣':  'assets/themes/custom/cards/queen-clubs.png',
          'K_♣':  'assets/themes/custom/cards/king-clubs.png',

          // ── Jokers ──────────────────────────────────────────────────────────
          '0_Joker': 'assets/themes/custom/cards/joker.png',
          '1_Joker': 'assets/themes/custom/cards/joker.png',
        },
      },
    });
  }
}
