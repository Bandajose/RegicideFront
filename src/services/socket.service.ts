import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Pagination } from '../app/Data/Pagination';
import { CreateRoomRequest } from '../app/Data/CreateRoomRequest';
import { RoomResponse } from '../app/Data/RoomResponse';
import { RoomConfig } from '../app/Data/RoomConfig';
import { LobbyPlayer } from '../app/Data/LobbyPlayer';
import { Board } from '../app/Data/Board';

export interface LobbyUpdate {
  players: LobbyPlayer[];
  config: RoomConfig;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  currentRoom = '';
  playerId = '';

  readonly updateRooms$: Observable<RoomResponse>;
  readonly lobbyUpdate$: Observable<LobbyUpdate>;
  readonly boardStatus$: Observable<Board>;
  readonly playerData$: Observable<{ hand: any[] }>;
  readonly kicked$: Observable<void>;

  constructor() {
    this.socket = io('http://localhost:3000/');
    this.updateRooms$  = this.listen<RoomResponse>('updateRooms');
    this.lobbyUpdate$  = this.listen<LobbyUpdate>('updateLobby');
    this.boardStatus$  = this.listen<Board>('boardStatus');
    this.playerData$   = this.listen<{ hand: any[] }>('getPlayerData');
    this.kicked$       = this.listen<void>('kicked');
  }

  private listen<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    });
  }

  // ─── Salas ──────────────────────────────────────────────────────────────

  getRooms(pagination: Pagination): void {
    this.socket.emit('getRooms', pagination);
  }

  createRoom(data: CreateRoomRequest): Observable<any> {
    return new Observable(observer => {
      this.socket.emit('createRoom', data, (response: any) => {
        observer.next(response);
        observer.complete();
      });
    });
  }

  joinRoom(roomName: string): Observable<any> {
    return new Observable(observer => {
      this.socket.emit('joinRoom', roomName, (response: any) => {
        if (response?.success) {
          this.currentRoom = roomName;
          this.playerId = response.playerId;
        }
        observer.next(response);
        observer.complete();
      });
    });
  }

  // ─── Lobby ──────────────────────────────────────────────────────────────

  setConfig(config: RoomConfig): void {
    this.socket.emit('setConfig', { roomName: this.currentRoom, config });
  }

  toggleReady(): void {
    this.socket.emit('setReady', this.currentRoom);
  }

  kickPlayer(targetId: string): void {
    this.socket.emit('kickPlayer', { roomName: this.currentRoom, targetId });
  }

  // ─── Partida ────────────────────────────────────────────────────────────

  startGame(): void {
    this.socket.emit('startGame', this.currentRoom);
  }

  requestBoardStatus(): void {
    this.socket.emit('getBoardStatus', this.currentRoom);
  }

  playTurn(action: string, cards: any[]): void {
    this.socket.emit('playTurn', {
      roomName: this.currentRoom,
      playerId: this.playerId,
      action,
      cards,
    });
  }
}
