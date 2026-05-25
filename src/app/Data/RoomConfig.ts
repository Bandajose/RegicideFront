export interface RoomConfig {
  maxPlayers: number;  // 2 – 5
  handSize: number;    // 5 – 8
  lives: number;       // 1 – 3
  randomBosses: boolean;
}

export const DEFAULT_CONFIG: RoomConfig = {
  maxPlayers: 4,
  handSize: 5,
  lives: 1,
  randomBosses: true,
};
