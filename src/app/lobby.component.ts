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
    if (index > -1) {
      this.selectedCards.splice(index, 1);
    } else {
      this.selectedCards.push(card);
    }

    console.log("🃏 Cartas seleccionadas:", this.selectedCards);
  }

  // Método para validar si se puede atacar
  canAttack(): boolean {
    if (this.selectedCards.length === 1) {
      return true; // Si hay una carta seleccionada, se puede atacar
    }

    if (this.selectedCards.length === 2) {
      const card1 = this.selectedCards[0];
      const card2 = this.selectedCards[1];

      // Verificar si alguna carta es 'A' o si las cartas son pares con suma <= 10
      const isPair = card1.value === card2.value;
      const isAce = card1.value === 'A' || card2.value === 'A';
      const isSumValid = (isPair || isAce) || (parseInt(card1.value) + parseInt(card2.value) <= 10);

      // Verificar que no haya más de un Joker
      const hasJoker = this.selectedCards.some(card => card.value === 'Joker');
      return isSumValid && !hasJoker;
    }

    return false; // Si hay más de 2 cartas seleccionadas, no se puede atacar
  }

  // Método para validar si se puede defender
  canDefend(): boolean {
    // let defenseExceeded = false;
    // let sum = 0;

    // for (const card of this.selectedCards) {

    //   // Verificar que no haya Jokers y sumar los valores
    //   if (card.value === 'Joker') continue;

    //   //Si la suma ya supera el daño del jefe agregar en true
    //   if (sum > this.gameBoard.currentBoss.damage) defenseExceeded = true;

    //   //Poner un valor a las cartas
    //   if (card.value === 'A') sum += 1;
    //   else if (card.value === 'J') sum += 10;
    //   else if (card.value === 'Q') sum += 15;
    //   else if (card.value === 'K') sum += 20;
    //   else sum += parseInt(card.value);

    // }

    // Verificar que la suma no supere el daño del jefe
    return /*!defenseExceeded  && */ !this.selectedCards.some(card => card.value === 'Joker');
  }

  attack() {
    if (this.currentTurn === this.playerId && this.selectedCards.length > 0 && this.canAttack()) {
      const action = "attack";
      console.log("⚔️ Atacando con cartas:", this.selectedCards, "Jugador:", this.playerId);
      this.socketService.playTurn(this.currentRoom, this.playerId, action, this.selectedCards);
      this.selectedCards = [];
    }
  }

  defend() {
    if (this.currentTurn === this.playerId && this.canDefend()) {
      const action = "defend";
      console.log("🛡️ Defendiendo con cartas:", this.selectedCards, "Jugador:", this.playerId);
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
    console.log("🛑 La partida ha finalizado.");
  }
}