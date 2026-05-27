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
  disconnectedPlayer: string | null = null;
  disconnectCountdown = 0;
  playerLeftName: string | null = null;
  newCardIndices: number[] = [];

  showTurnToast = false;

  private lastPhase = '';
  private lastTurnId = '';
  private playerDataReceived = false;
  private prevHand: Card[] = [];
  private disconnectInterval: ReturnType<typeof setInterval> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private dealClearTimeout: ReturnType<typeof setTimeout> | null = null;
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
      const prevPhase = this.lastPhase;

      if (prevPhase === 'defend' && board.playerPhase === 'attack') {
        this.triggerBossAttack();
      }
      this.lastPhase = board.playerPhase;

      const newTurnId = board.playerTurn;
      const isJokerPhase = board.playerPhase === 'Joker';
      const jokerJustResolved = prevPhase === 'Joker' && !isJokerPhase;
      const turnChangedToMe = newTurnId === this.socketService.playerId && newTurnId !== this.lastTurnId;

      if (!isJokerPhase && newTurnId === this.socketService.playerId && (turnChangedToMe || jokerJustResolved)) {
        this.triggerTurnToast();
      }
      this.lastTurnId = newTurnId;

      this.board = board;
      this.checkAutoActions();
    });

    this.socketService.playerData$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.playerDataReceived = true;
      const prevKeys = new Set(this.prevHand.map(c => `${c.value}_${c.suit}`));
      const newIndices: number[] = [];
      data.hand.forEach((card, i) => {
        if (!prevKeys.has(`${card.value}_${card.suit}`)) newIndices.push(i);
      });
      this.prevHand = [...data.hand];
      this.hand = data.hand;
      if (newIndices.length > 0) this.triggerCardDeal(newIndices);
      this.checkAutoActions();
    });

    this.socketService.playerDisconnected$.pipe(takeUntil(this.destroy$)).subscribe(({ playerName, secondsLeft }) => {
      this.disconnectedPlayer = playerName;
      this.disconnectCountdown = secondsLeft;
      this.startDisconnectCountdown();
    });

    this.socketService.playerReconnected$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.clearDisconnectState();
    });

    this.socketService.playerLeft$.pipe(takeUntil(this.destroy$)).subscribe(({ playerName }) => {
      this.playerLeftName = playerName;
    });

    this.socketService.requestBoardStatus();
  }

  ngOnDestroy(): void {
    this.clearDisconnectState();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.dealClearTimeout) clearTimeout(this.dealClearTimeout);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startDisconnectCountdown(): void {
    if (this.disconnectInterval) clearInterval(this.disconnectInterval);
    this.disconnectInterval = setInterval(() => {
      this.disconnectCountdown--;
      if (this.disconnectCountdown <= 0) {
        if (this.disconnectInterval) clearInterval(this.disconnectInterval);
        this.disconnectInterval = null;
      }
    }, 1000);
  }

  private clearDisconnectState(): void {
    if (this.disconnectInterval) {
      clearInterval(this.disconnectInterval);
      this.disconnectInterval = null;
    }
    this.disconnectedPlayer = null;
    this.disconnectCountdown = 0;
  }

  private triggerTurnToast(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.showTurnToast = false;
    setTimeout(() => { this.showTurnToast = true; }, 0);
    this.toastTimeout = setTimeout(() => {
      this.showTurnToast = false;
      this.toastTimeout = null;
    }, 2600);
  }

  // ─── Getters de conveniencia ───────────────────────────────────────────

  get playerId(): string {
    return this.socketService.playerId;
  }

  get playerName(): string {
    return this.socketService.playerName;
  }

  get roomName(): string {
    return this.socketService.currentRoom;
  }

  get isMyTurn(): boolean {
    return this.board?.playerTurn === this.playerId;
  }

  get canClaimJokerTurn(): boolean {
    return this.board?.playerPhase === 'Joker' && this.hand.length > 0;
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
    if (!this.isMyTurn || this.board?.playerPhase === 'Joker') return;
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
    this.socketService.claimJokerTurn();
  }

  leaveGame(): void {
    if (this.board && !this.board.endGame) {
      this.socketService.leaveGame();
    }
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }

  // ─── Auto-acciones ────────────────────────────────────────────────────

  private checkAutoActions(): void {
    if (!this.board) return;
    if (this.board.playerTurn !== this.socketService.playerId) return;

    if (this.board.playerPhase === 'defend') {
      const noDamage = this.board.currentBoss.damage === 0;
      const cantDefend = this.playerDataReceived && this.hand.length === 0 && this.board.currentBoss.damage > 0;

      // Daño 0: nada que defender → pasar
      // Sin cartas con daño pendiente: no puede defender → backend decide game over
      if (noDamage || cantDefend) {
        this.socketService.playTurn('defend', []);
      }
      return;
    }

    // Ataque sin cartas en mano: solo si ya se recibió playerData para evitar
    // auto-pasar antes de que lleguen las cartas al inicio de partida
    if (this.board.playerPhase === 'attack' && this.playerDataReceived && this.hand.length === 0) {
      this.socketService.playTurn('attack', []);
    }
  }

  // ─── Animación de reparto ─────────────────────────────────────────────

  private triggerCardDeal(indices: number[]): void {
    if (this.dealClearTimeout) clearTimeout(this.dealClearTimeout);
    this.newCardIndices = indices;
    const totalMs = (indices.length - 1) * 150 + 450 + 300;
    this.dealClearTimeout = setTimeout(() => {
      this.newCardIndices = [];
      this.dealClearTimeout = null;
    }, totalMs);
  }

  // ─── Animación del jefe ───────────────────────────────────────────────

  private triggerBossAttack(): void {
    this.bossAttacking = true;
    setTimeout(() => (this.bossAttacking = false), 650);
  }
}
