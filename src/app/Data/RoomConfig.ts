export interface RoomConfig {
  maxPlayers: number;  // 2 – 5
  handSize: number;    // 5 – 8
  lives: number;       // 1 – 3
  randomBosses: boolean;
  turnTime: number;    // 0 | 30 | 60 | 90 segundos; 0 = sin límite
}

export const DEFAULT_CONFIG: RoomConfig = {
  maxPlayers: 4,
  handSize: 5,
  lives: 1,
  randomBosses: true,
  turnTime: 0,
};
