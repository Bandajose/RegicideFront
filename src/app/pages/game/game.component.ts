import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../../services/socket.service';
import { Board } from '../../Data/Board';
import { Card } from '../../Data/Card';

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, OnDestroy {
  board: Board | null = null;
  hand: Card[] = [];
  selectedCards: Card[] = [];
  bossAttacking = false;

  private lastPhase = '';
  private destroy$ = new Subject<void>();

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit(): void {
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

    this.socketService.requestBoardStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Getters de conveniencia ───────────────────────────────────────────

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
    return Array(Math.min(this.board?.deck.length ?? 0, 3)).fill(0);
  }

  get graveStack(): number[] {
    return Array(Math.min(this.board?.grave.length ?? 0, 3)).fill(0);
  }

  // ─── Helpers de presentación ──────────────────────────────────────────

  shortId(id: string): string {
    return id ? id.slice(0, 6) + '…' : '';
  }

  isRed(suit: string): boolean {
    return suit === '♥' || suit === '♦';
  }

  isSelected(card: Card): boolean {
    return this.selectedCards.some(c => c.value === card.value && c.suit === card.suit);
  }

  // ─── Acciones del jugador ─────────────────────────────────────────────

  toggleCard(card: Card): void {
    if (!this.isMyTurn) return;
    const idx = this.selectedCards.findIndex(c => c.value === card.value && c.suit === card.suit);
    if (idx >= 0) this.selectedCards.splice(idx, 1);
    else this.selectedCards.push(card);
  }

  playTurn(): void {
    if (!this.isMyTurn || !this.selectedCards.length || !this.board) return;
    this.socketService.playTurn(this.board.playerPhase, this.selectedCards);
    this.selectedCards = [];
  }

  leaveGame(): void {
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }

  // ─── Animación del jefe ───────────────────────────────────────────────

  private triggerBossAttack(): void {
    this.bossAttacking = true;
    setTimeout(() => (this.bossAttacking = false), 650);
  }
}
