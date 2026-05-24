import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, OnDestroy {
  board: any = null;
  hand: any[] = [];
  selectedCards: any[] = [];
  bossAttacking: boolean = false;

  private lastPhase: string = '';
  private destroy$ = new Subject<void>();

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit() {
    if (!this.socketService.currentRoom) {
      this.router.navigate(['/']);
      return;
    }

    this.socketService.boardStatus$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      if (this.lastPhase === 'defend' && board.playerPhase === 'attack') {
        this.triggerBossAttack();
      }
      this.lastPhase = board.playerPhase;
      this.board = board;
    });

    this.socketService.playerData$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.hand = data.hand;
    });

    this.socketService.requestBoardStatus(this.socketService.currentRoom);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get playerId(): string {
    return this.socketService.playerId;
  }

  get roomName(): string {
    return this.socketService.currentRoom;
  }

  get isMyTurn(): boolean {
    return this.board?.playerTurn === this.playerId;
  }

  get deckStack(): number[] {
    const count = Math.min(this.board?.deck?.length ?? 0, 3);
    return Array(count).fill(0);
  }

  get graveStack(): number[] {
    const count = Math.min(this.board?.grave?.length ?? 0, 3);
    return Array(count).fill(0);
  }

  shortId(id: string): string {
    return id ? id.slice(0, 6) + '…' : '';
  }

  isRed(suit: string): boolean {
    return suit === '♥' || suit === '♦';
  }

  isSelected(card: any): boolean {
    return this.selectedCards.some(c => c.value === card.value && c.suit === card.suit);
  }

  toggleCard(card: any) {
    if (!this.isMyTurn) return;
    const idx = this.selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
    if (idx >= 0) this.selectedCards.splice(idx, 1);
    else this.selectedCards.push(card);
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

  private triggerBossAttack() {
    this.bossAttacking = true;
    setTimeout(() => (this.bossAttacking = false), 650);
  }

  leaveGame() {
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }
}
