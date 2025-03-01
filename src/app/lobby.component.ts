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
  playerPhase: string = '';
  endGame: boolean = false;
  winGame: boolean = false;
  gameResultMessage: string = '';

  constructor(private socketService: SocketService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.socketService.getRooms().subscribe(rooms => {
      this.rooms = rooms;
    });

    this.socketService.getPlayers().subscribe(players => this.players = players);

    this.socketService.getPlayerData().subscribe(data => {
      this.hand = data.hand;
      console.log("🃏 Cartas recibidas en el frontend:", this.hand);
    });

    this.socketService.getboardStatus().subscribe(data => {
      this.gameBoard = data;
      this.gameStarted = true;
      this.currentTurn = data.playerTurn;
      this.playerPhase = data.playerPhase;
      this.endGame = data.endGame;
      this.winGame = data.winGame;
      console.log("getboardStatus:", this.gameBoard);

      this.checkGameStatus();
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
        console.log("🆔 ID del jugador asignado:", this.playerId);
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


    if (this.playerPhase === "attack") {

      if (index > -1) {
        this.selectedCards.splice(index, 1);
      } else {
        if (this.selectedCards.length < 2) {
          this.selectedCards.push(card);
        }
      }

      if (this.selectedCards.length === 2) {
        const [card1, card2] = this.selectedCards;
        const isValidSelection = this.validateCardSelection(card1, card2);

        if (!isValidSelection) {
          this.selectedCards.pop();
        }
      }
    }
    else {
      if (index > -1) {
        this.selectedCards.splice(index, 1);
      } else {
        this.selectedCards.push(card);
      }
    }

    console.log("🃏 Cartas seleccionadas:", this.selectedCards);
  }

  validateCardSelection(card1: any, card2: any): boolean {
    const values = [card1.value, card2.value];
    const points = values.map(v => (v === 'A' ? 1 : parseInt(v, 10)));
    const sum = points.reduce((a, b) => a + b, 0);

    if (values.includes('A')) {
      return true;
    }

    if (card1.value !== card2.value) {
      return false;
    }

    return sum <= 10;
  }

  attack() {
    if (this.currentTurn === this.playerId && this.selectedCards.length > 0) {
      if (this.selectedCards.length > 2) {
        console.log("⚠️ Solo puedes seleccionar hasta 2 cartas.");
        return;
      }

      if (this.selectedCards.length === 2) {
        const [card1, card2] = this.selectedCards;
        if (!this.validateCardSelection(card1, card2)) {
          console.log("⚠️ Selección inválida. Verifica las reglas de ataque.");
          return;
        }
      }

      const action = "attack";
      console.log("⚔️ Atacando con cartas:", this.selectedCards, "Jugador:", this.playerId);
      this.socketService.playTurn(this.currentRoom, this.playerId, action, this.selectedCards);
      this.selectedCards = [];
    }
  }

  defend() {
    if (this.currentTurn === this.playerId && this.selectedCards.length > 0) {
      const action = "defend";
      console.log("⚔️ Defendiendo con cartas:", this.selectedCards, "Jugador:", this.playerId);
      this.socketService.playTurn(this.currentRoom, this.playerId, action, this.selectedCards);
      this.selectedCards = [];
    }
  }

  checkGameStatus() {
    if (this.endGame) {
      this.gameResultMessage = this.winGame ? "🎉 ¡Has ganado la partida!" : "😞 Has perdido la partida.";
      console.log(this.gameResultMessage);
      this.terminateGame();
    }
  }

  terminateGame() {
    this.gameStarted = false;
    this.inRoom = false;
    this.currentRoom = '';
    this.players = [];
    this.hand = [];
    this.selectedCards = [];
    this.gameBoard = {};
    // this.endGame = true;
    // this.winGame = false;
    console.log("🛑 La partida ha finalizado.");
  }
}