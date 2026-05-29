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

  // ─── Estado persistente (sobrevive recargas) ─────────────────────────────

  get currentRoom(): string { return localStorage.getItem('currentRoom') ?? ''; }
  set currentRoom(value: string) {
    value ? localStorage.setItem('currentRoom', value) : localStorage.removeItem('currentRoom');
  }

  get playerId(): string { return localStorage.getItem('playerId') ?? ''; }
  set playerId(value: string) {
    value ? localStorage.setItem('playerId', value) : localStorage.removeItem('playerId');
  }

  get playerName(): string { return localStorage.getItem('playerName') ?? ''; }
  set playerName(name: string) { localStorage.setItem('playerName', name.trim()); }

  private get sessionId(): string {
    let id = localStorage.getItem('sessionId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('sessionId', id);
    }
    return id;
  }

  // ─── Observables ──────────────────────────────────────────────────────────

  readonly updateRooms$: Observable<RoomResponse>;
  readonly lobbyUpdate$: Observable<LobbyUpdate>;
  readonly boardStatus$: Observable<Board>;
  readonly playerData$: Observable<{ hand: any[] }>;
  readonly kicked$: Observable<void>;
  readonly rejoinFailed$: Observable<void>;
  readonly playerDisconnected$: Observable<{ playerName: string; secondsLeft: number }>;
  readonly playerReconnected$: Observable<{ playerName: string }>;
  readonly playerLeft$: Observable<{ playerName: string }>;
  readonly chatMessage$: Observable<{ playerName: string; message: string }>;

  constructor() {
    // this.socket = io('http://localhost:3000/'); //dev
    this.socket = io('https://two1gamebackend.onrender.com/'); //Prod
    this.updateRooms$   = this.listen<RoomResponse>('updateRooms');
    this.lobbyUpdate$   = this.listen<LobbyUpdate>('updateLobby');
    this.boardStatus$   = this.listen<Board>('boardStatus');
    this.playerData$    = this.listen<{ hand: any[] }>('getPlayerData');
    this.kicked$               = this.listen<void>('kicked');
    this.rejoinFailed$         = this.listen<void>('rejoinFailed');
    this.playerDisconnected$   = this.listen<{ playerName: string; secondsLeft: number }>('playerDisconnected');
    this.playerReconnected$    = this.listen<{ playerName: string }>('playerReconnected');
    this.playerLeft$           = this.listen<{ playerName: string }>('playerLeft');
    this.chatMessage$          = this.listen<{ playerName: string; message: string }>('chatMessage');

    // Al (re)conectar: si hay sala guardada intentar reconectar
    this.socket.on('connect', () => {
      if (this.currentRoom) {
        this.socket.emit('rejoinRoom', {
          roomName:  this.currentRoom,
          sessionId: this.sessionId,
        });
      }
    });

    // Al reconectar con éxito, actualizar el playerId con el nuevo socket.id
    this.socket.on('rejoinSuccess', (data: { playerId: string }) => {
      this.playerId = data.playerId;
    });

    // Al fallar la reconexión, limpiar estado
    this.socket.on('rejoinFailed', () => {
      this.currentRoom = '';
      this.playerId = '';
    });
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
      this.socket.emit('joinRoom', {
        roomName,
        playerName: this.playerName,
        sessionId:  this.sessionId,
      }, (response: any) => {
        if (response?.success) {
          this.currentRoom = roomName;
          this.playerId    = response.playerId;
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

  leaveRoom(): void {
    this.socket.emit('leaveRoom', this.currentRoom);
  }

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

  returnToAttack(): void {
    this.socket.emit('returnToAttack', this.currentRoom);
  }

  claimJokerTurn(): void {
    this.socket.emit('claimJokerTurn', {
      roomName: this.currentRoom,
      playerId: this.playerId,
    });
  }

  leaveGame(): void {
    this.socket.emit('leaveGame', {
      roomName: this.currentRoom,
      playerId: this.playerId,
    });
  }

  sendChatMessage(message: string): void {
    this.socket.emit('chatMessage', {
      roomName:   this.currentRoom,
      playerName: this.playerName,
      message,
    });
  }
}
