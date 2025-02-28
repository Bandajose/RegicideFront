import { Component, OnInit } from '@angular/core';
import { SocketService } from './socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-lobby',
  standalone: true,
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css'],
  imports: [CommonModule, FormsModule]
})


export class LobbyComponent implements OnInit {
  rooms: string[] = [];
  roomName: string = '';
  message: string = '';
  players: string[] = [];
  inRoom: boolean = false;
  currentRoom: string = '';
  gameStarted: boolean = false;
  currentTurn: string = '';
  playerId: string = '';
  hand: any[] = [];
  effectMessage: string = '';
  gameBoard: any = {};
  selectedCards: any[] = [];

  constructor(private socketService: SocketService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.socketService.getRooms().subscribe(rooms => {
      this.rooms = rooms// this.cdr.detectChanges(); // 🔄 Forzar actualización
    });

    this.socketService.getPlayers().subscribe(players => this.players = players);

    this.socketService.getPlayerData().subscribe(data => {
      this.hand = data.hand; // ✅ Se asigna correctamente la mano recibida
      console.log("🃏 Cartas recibidas en el frontend:", this.hand); // 🔍 Debug
    });

    this.socketService.getboardStatus().subscribe(data => {
      this.gameBoard = data
      this.gameStarted = true;
      this.currentTurn = data.playerTurn;
      // this.effectMessage = data.effectMessage;
      console.log("getboardStatus:", this.gameBoard); // 🔍 Debug
    });

    this.socketService.getRooms();

  }


  createRoom() {
    if (!this.roomName.trim()) return;
    this.socketService.createRoom(this.roomName).subscribe(response => {
      this.message = response.message;
      if (response.success) {
        this.roomName = '';
      }
    });
  }

  joinRoom(room: string) {

    this.socketService.joinRoom(room).subscribe(response => {
      if (response.success) {
        this.inRoom = true;
        this.currentRoom = room;
        this.playerId = response.playerId;
        console.log("🆔 ID del jugador asignado:", this.playerId); // 🔍 Debug
      } else {
        this.message = response.message;
      }
    });
  }

  startGame() {
    if (this.players.length >= 2) {
      this.socketService.startGame(this.currentRoom);
    }
  }

  toggleCardSelection(card: any) {
    const index = this.selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
    if (index > -1) {
      this.selectedCards.splice(index, 1); // Deseleccionar si ya estaba seleccionada
    } else {
      this.selectedCards.push(card); // Seleccionar si no estaba en la lista
    }
    console.log("🃏 Cartas seleccionadas:", this.selectedCards); // 🔍 Debug
  }

  attack() {
    if (this.currentTurn === this.playerId && this.selectedCards.length > 0) {

      const action = "1";
      console.log("⚔️ Atacando con cartas:", this.selectedCards, "Jugador:", this.playerId); // 🔍 Debug


      this.socketService.playTurn(this.currentRoom, this.playerId, action, this.selectedCards);

      // this.socketService.attack(this.currentRoom, this.playerId, this.selectedCards);

      // Limpiar selección tras jugar
      this.selectedCards = [];
    }
  }

  defend() {
    if (this.currentTurn === this.playerId && this.selectedCards.length > 0) {
      const action = "1";

      console.log("⚔️ Defendiendo con cartas:", this.selectedCards, "Jugador:", this.playerId); // 🔍 Debug
      // this.socketService.defend(this.currentRoom, this.playerId);

      this.selectedCards = [];
    }
  }
}