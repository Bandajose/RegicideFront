import { Injectable } from '@angular/core';

export interface GameRecord {
  date: number;
  result: 'win' | 'loss' | 'left';
  roomName: string;
  turns: number;
  cards: number;
  bosses: number;
  damage: number;
}

const HISTORY_KEY = 'regicideHistory';
const MAX_RECORDS = 10;

@Injectable({ providedIn: 'root' })
export class GameHistoryService {
  getAll(): GameRecord[] {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  save(record: Omit<GameRecord, 'date'>): void {
    const records = this.getAll();
    records.unshift({ ...record, date: Date.now() });
    if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  }

  clear(): void {
    localStorage.removeItem(HISTORY_KEY);
  }
}
