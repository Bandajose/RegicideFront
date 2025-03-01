import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    // this.socket = io('http://localhost:3000'); // dev
    this.socket = io('https://two1gamebackend.onrender.com'); //prod
  }

  getRooms(): Observable<string[]> {
    return new Observable(observer => {

      this.socket.emit("getRooms");
      console.log("📥 Evento recibido: getRooms"); // 🔍 Debug

      this.socket.on('updateRooms', (rooms: string[]) => {
        console.log("📥 Evento recibido: updateRooms", rooms); // 🔍 Debug
        observer.next(rooms);
      });

    });
  }
  getPlayers(): Observable<string[]> {
    return new Observable(observer => {
      this.socket.on('updatePlayers', (players: string[]) => {
        observer.next(players);
      });
    });
  }

  getPlayerData(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('getPlayerData', (data: any) => {
        console.log("📥 Evento recibido: getPlayerData", data); // 🔍 Debug
        observer.next(data);
      });
    });
  }
  
  createRoom(roomName: string): Observable<any> {
    return new Observable(observer => {
      console.log("📥 Evento recibido: createRoom"); // 🔍 Debug
      this.socket.emit('createRoom', roomName, (response: any) => {
        observer.next(response);
      });
    });
  }

  joinRoom(room: string): Observable<any> {

    console.log("📥 Evento recibido: joinRoom"); // 🔍 Debug

    return new Observable(observer => {
      this.socket.emit('joinRoom', room, (response: any) => {
        observer.next(response);
        console.log("📥 Evento recibido: joinRoom", response); // 🔍 Debug

      });
    });
  }

  startGame(room: string) {
    this.socket.emit('startGame', room);
  }

  playTurn(room: string, playerId: string, action: string, cards: any[]) {
    this.socket.emit('playTurn', room, playerId, action, cards);
  }

  getboardStatus(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('boardStatus', (data: any) => {
        console.log("📥 Evento recibido: boardStatus", data); // 🔍 Debug
        observer.next(data);
      });
    });
  }

}