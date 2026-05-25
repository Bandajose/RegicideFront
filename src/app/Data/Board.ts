import { Card } from './Card';
import { Boss } from './Boss';
import { GamePlayer } from './GamePlayer';

export interface Board {
  deck: Card[];
  grave: Card[];
  table: Card[];
  bosses: Card[];
  currentBoss: Boss;
  playerTurn: string;
  playerPhase: 'attack' | 'defend' | 'Joker';
  endGame: boolean;
  winGame: boolean;
  players: GamePlayer[];
}
