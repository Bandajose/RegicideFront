import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Pagination } from '../app/Data/Pagination';
import { CreateRoomRequest } from '../app/Data/CreateRoomRequest';


@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://54.224.109.230:8080/'); // dev
    // this.socket = io('https://two1gamebackend.onrender.com'); //prod
  }

  getRooms(pagination: Pagination) {
    this.socket.emit("getRooms", pagination);
    console.log("📥 Evento Enviado: getRooms"); // 🔍 Debug
  }


  updateRooms(): Observable<any[]> {
    return new Observable(observer => {
      this.socket.on('updateRooms', (rooms: any[]) => {
        // console.log("📥 Evento recibido: updateRooms", rooms); // 🔍 Debug
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
  
  // createRoom(roomName: CreateRoomRequest) {
  //   // console.log("📥 Evento recibido: createRoom",roomName); // 🔍 Debug
  //   this.socket.emit('createRoom', roomName,(data:any) => {
  //       console.error("Respuesta:", data);  // 🔍 Debug
  //   });
  // }

  createRoom(roomName: CreateRoomRequest): Observable<any> {
    return new Observable(observer => {
      this.socket.emit('createRoom', roomName, (response: any) => {
        console.log("📥 Callback: createRoom",response); // 🔍 Debug
        observer.next(response);
      });
    });
  }

  roomResponse(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('roomResponse', (response: any) => {
        console.log("📥 Evento recibido: roomResponse", response); // 🔍 Debug
        observer.next(response);
      });
    });
  }

  joinRoom(roomName: string) {
    console.log("📥 Evento recibido: joinRoom",roomName); // 🔍 Debug
    this.socket.emit('joinRoom', roomName);
  }

  startGame(room: string) {
    this.socket.emit('startGame', room);
  }

  playTurn(room: string, playerId: string, action: string, cards: any[]) {
    this.socket.emit('playTurn', {roomName:room, playerId:playerId, action:action, cards:cards});
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