import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Pagination } from '../app/Data/Pagination';
import { CreateRoomRequest } from '../app/Data/CreateRoomRequest';
import { RoomResponse } from '../app/Data/RoomResponse';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  currentRoom: string = '';
  playerId: string = '';

  readonly updateRooms$: Observable<RoomResponse>;
  readonly players$: Observable<string[]>;
  readonly boardStatus$: Observable<any>;
  readonly playerData$: Observable<any>;

  constructor() {
    this.socket = io('http://localhost:3000/');
    this.updateRooms$ = this.listen<RoomResponse>('updateRooms');
    this.players$ = this.listen<string[]>('updatePlayers');
    this.boardStatus$ = this.listen<any>('boardStatus');
    this.playerData$ = this.listen<any>('getPlayerData');
  }

  private listen<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    });
  }

  getRooms(pagination: Pagination) {
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

  startGame(room: string) {
    this.socket.emit('startGame', room);
  }

  requestBoardStatus(room: string) {
    this.socket.emit('getBoardStatus', room);
  }

  playTurn(room: string, playerId: string, action: string, cards: any[]) {
    this.socket.emit('playTurn', { roomName: room, playerId, action, cards });
  }
}
