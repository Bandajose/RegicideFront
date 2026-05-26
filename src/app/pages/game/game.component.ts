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
  private playerDataReceived = false;
  private destroy$ = new Subject<void>();

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit(): void {
    if (!this.socketService.currentRoom) {
      this.router.navigate(['/']);
      return;
    }

    this.socketService.rejoinFailed$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.router.navigate(['/']);
    });

    this.socketService.boardStatus$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      if (this.lastPhase === 'defend' && board.playerPhase === 'attack') {
        this.triggerBossAttack();
      }
      this.lastPhase = board.playerPhase;
      this.board = board;
      this.checkAutoActions();
    });

    this.socketService.playerData$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.playerDataReceived = true;
      this.hand = data.hand;
      this.checkAutoActions();
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

  get canClaimJokerTurn(): boolean {
    return this.board?.playerPhase === 'Joker' && !this.isMyTurn;
  }

  get deckStack(): number[] {
    return Array(Math.min(this.board?.deck.length ?? 0, 3)).fill(0);
  }

  get graveStack(): number[] {
    return Array(Math.min(this.board?.grave.length ?? 0, 3)).fill(0);
  }

  // ─── Helpers de presentación ──────────────────────────────────────────

  nameOf(id: string): string {
    return this.board?.players.find(p => p.id === id)?.name ?? id.slice(0, 6) + '…';
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
    if (idx >= 0) {
      this.selectedCards.splice(idx, 1);
      return;
    }
    if (this.board?.playerPhase === 'attack' && !this.isValidAttackSelection([...this.selectedCards, card])) return;
    if (this.board?.playerPhase === 'defend' && !this.isValidDefenseAdd(card)) return;
    this.selectedCards.push(card);
  }

  canAddToSelection(card: Card): boolean {
    if (this.isSelected(card)) return true;
    if (this.board?.playerPhase === 'attack') return this.isValidAttackSelection([...this.selectedCards, card]);
    if (this.board?.playerPhase === 'defend') return this.isValidDefenseAdd(card);
    return true;
  }

  // ─── Validación de ataque ─────────────────────────────────────────────

  private cardPoints(value: string): number {
    if (value === 'A') return 1;
    return parseInt(value, 10) || 0;
  }

  private isValidAttackSelection(cards: Card[]): boolean {
    if (cards.length <= 1) return true;

    const aceCount = cards.filter(c => c.value === 'A').length;
    const allSameValue = cards.every(c => c.value === cards[0].value);
    const sum = cards.reduce((acc, c) => acc + this.cardPoints(c.value), 0);

    // Regla 1: As + otra carta cualquiera (máximo 2 en total)
    if (cards.length === 2 && aceCount >= 1) return true;

    // Regla 2: Mismo valor, suma ≤ 10, máximo 2 Ases
    if (allSameValue && sum <= 10 && aceCount <= 2) return true;

    return false;
  }

  // ─── Validación de defensa ────────────────────────────────────────────

  private isValidDefenseAdd(card: Card): boolean {
    const isJoker = card.suit === 'Joker';
    const hasJoker = this.selectedCards.some(c => c.suit === 'Joker');

    // Regla 2: Joker es exclusivo
    if (hasJoker) return false;
    if (isJoker && this.selectedCards.length > 0) return false;

    // Regla 1: no se puede agregar si la selección actual ya cubre el daño
    if (!isJoker) {
      const bossDamage = this.board?.currentBoss.damage ?? 0;
      const currentSum = this.selectedCards.reduce((acc, c) => acc + this.cardPoints(c.value), 0);
      if (currentSum >= bossDamage) return false;
    }

    return true;
  }

  playTurn(): void {
    if (!this.isMyTurn || !this.selectedCards.length || !this.board) return;
    this.socketService.playTurn(this.board.playerPhase, this.selectedCards);
    this.selectedCards = [];
  }

  passAttack(): void {
    if (!this.isMyTurn || this.board?.playerPhase !== 'attack') return;
    this.socketService.playTurn('attack', []);
    this.selectedCards = [];
  }

  claimJokerTurn(): void {
    if (!this.canClaimJokerTurn) return;
    this.socketService.claimJokerTurn();
  }

  leaveGame(): void {
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }

  // ─── Auto-acciones ────────────────────────────────────────────────────

  private checkAutoActions(): void {
    if (!this.board) return;
    if (this.board.playerTurn !== this.socketService.playerId) return;

    // Defensa con daño 0: nada que defender, pasar automáticamente
    if (this.board.playerPhase === 'defend' && this.board.currentBoss.damage === 0) {
      this.socketService.playTurn('defend', []);
      return;
    }

    // Ataque sin cartas en mano: solo si ya se recibió playerData para evitar
    // auto-pasar antes de que lleguen las cartas al inicio de partida
    if (this.board.playerPhase === 'attack' && this.playerDataReceived && this.hand.length === 0) {
      this.socketService.playTurn('attack', []);
    }
  }

  // ─── Animación del jefe ───────────────────────────────────────────────

  private triggerBossAttack(): void {
    this.bossAttacking = true;
    setTimeout(() => (this.bossAttacking = false), 650);
  }
}
