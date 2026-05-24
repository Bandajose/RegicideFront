import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-game',
  imports: [CommonModule, RouterModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, OnDestroy {
  board: any = null;
  hand: any[] = [];
  selectedCards: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit() {
    if (!this.socketService.currentRoom) {
      this.router.navigate(['/']);
      return;
    }

    this.socketService.boardStatus$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      this.board = board;
    });

    this.socketService.playerData$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.hand = data.hand;
    });

    // Pedir el estado actual al servidor (el evento inicial pudo llegar antes de que este componente existiera)
    this.socketService.requestBoardStatus(this.socketService.currentRoom);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get playerId(): string {
    return this.socketService.playerId;
  }

  get isMyTurn(): boolean {
    return this.board?.playerTurn === this.playerId;
  }

  isSelected(card: any): boolean {
    return this.selectedCards.some(c => c.value === card.value && c.suit === card.suit);
  }

  isRed(suit: string): boolean {
    return suit === '♥' || suit === '♦';
  }

  toggleCard(card: any) {
    if (!this.isMyTurn) return;
    const idx = this.selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
    if (idx >= 0) {
      this.selectedCards.splice(idx, 1);
    } else {
      this.selectedCards.push(card);
    }
  }

  playTurn() {
    if (!this.isMyTurn || !this.selectedCards.length) return;
    this.socketService.playTurn(
      this.socketService.currentRoom,
      this.playerId,
      this.board.playerPhase,
      this.selectedCards
    );
    this.selectedCards = [];
  }

  leaveGame() {
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }
}
