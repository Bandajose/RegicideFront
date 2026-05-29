import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('gravePileEl')       gravePileEl?: ElementRef<HTMLElement>;
  @ViewChild('deckPileEl')        deckPileEl?: ElementRef<HTMLElement>;
  @ViewChild('tablePanelEl')      tablePanelEl?: ElementRef<HTMLElement>;
  @ViewChild('chatMsgsDesktop')   chatMsgsDesktop?: ElementRef<HTMLElement>;
  @ViewChild('chatMsgsMobile')    chatMsgsMobile?: ElementRef<HTMLElement>;

  board: Board | null = null;
  hand: Card[] = [];
  selectedCards: Card[] = [];
  bossAttacking = false;
  bossHit = false;
  flyingCards: Array<{
    id: number; card?: Card;
    x: number; y: number; dx: string; dy: string; delay: number;
  }> = [];
  frozenTable: Card[] = [];

  historyLog: Array<{
    cards: Card[];
    playerName: string;
    bossDisplay: string;
    phase: string;
    bossHealth: number;
    bossDamage: number;
    playerColor: string;
    isDefeatedBoss?: boolean;
  }> = [];

  bossAnnouncement: { defeated: string; next: string } | null = null;

  chatMessages: Array<{
    playerName: string;
    message: string;
    isMe: boolean;
    color: string;
  }> = [];
  disconnectedPlayer: string | null = null;
  disconnectCountdown = 0;
  playerLeftName: string | null = null;
  newCardIndices: number[] = [];

  showTurnToast = false;
  mobileTab: 'game' | 'players' | 'history' | 'chat' = 'game';

  activeChatCategory = 0;

  // ─── Chat config: add / remove categories or messages here ───────────────
  readonly chatCategories: { label: string; icon: string; color: string; messages: string[] }[] = [
    {
      label: 'Estrategia', icon: '🧠', color: '#4fc3f7',
      messages: [
        'Puedo ayudar', 'No puedo hacer mucho', 'Necesito apoyo', 'Voy fuerte',
        'Voy débil', 'Confíen en mí', 'No gasten mucho', 'Cuidado este turno',
      ],
    },
    {
      label: 'Ataque', icon: '⚔️', color: '#ef5350',
      messages: [
        'Puedo hacer daño', 'Tengo combo', 'Tengo ataque pequeño',
        'Tengo ataque alto', 'Puedo terminarlo', 'No puedo atacar',
      ],
    },
    {
      label: 'Defensa', icon: '🛡️', color: '#66bb6a',
      messages: [
        'Puedo curar', 'Necesitamos curación', 'Guarden recursos', 'Recuperen cartas',
      ],
    },
    {
      label: 'Prioridad', icon: '📌', color: '#ffa726',
      messages: [
        'Ataquen ahora', 'Esperen', 'Usen habilidades', 'No usen habilidades', 'Mejor otro objetivo',
      ],
    },
    {
      label: 'Joker', icon: '🃏', color: '#ab47bc',
      messages: [
        '¿Alguien puede hacer mucho daño?', '¿Alguien puede curar?',
        '¿Estamos en peligro?', '¿Podemos sobrevivir este turno?',
        '¿Vale la pena atacar fuerte?',
        'No puedo tomar el turno', 'Yo tomaré el turno',
      ],
    },
    {
      label: 'Respuesta', icon: '💬', color: '#26c6da',
      messages: ['Sí', 'No', 'Tal vez'],
    },
  ];

  private lastPhase = '';
  private lastTurnId = '';
  private justPassedToDefend = false;
  private playerDataReceived = false;
  private prevHand: Card[] = [];
  private prevTable: Card[] = [];
  private prevGraveLength = 0;
  private prevDeckLength = 0;
  private readonly COLOR_PALETTE = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ce93d8', '#4db6ac'];
  private playerColorMap = new Map<string, string>();
  private prevBossHealth = 0;
  private prevBossDamage = 0;
  private prevBossKey = '';
  private prevBossDisplay = '';
  private flyingCardId = 0;
  private flyingCleanupTimeouts: ReturnType<typeof setTimeout>[] = [];
  private disconnectInterval: ReturnType<typeof setInterval> | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private dealClearTimeout: ReturnType<typeof setTimeout> | null = null;
  private bossHitTimeout: ReturnType<typeof setTimeout> | null = null;
  private bossAnnouncementTimeout: ReturnType<typeof setTimeout> | null = null;
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
      const currentBossKey = `${board.currentBoss.value}_${board.currentBoss.suit}`;

      // Asignar color por jugador la primera vez que se ve
      board.players.forEach((p, i) => {
        if (!this.playerColorMap.has(p.id)) {
          this.playerColorMap.set(p.id, this.COLOR_PALETTE[i % this.COLOR_PALETTE.length]);
        }
      });

      // Boss lunges when it attacks (attack → defend transition)
      if (prevPhase === 'attack' && board.playerPhase === 'defend') {
        this.triggerBossAttack();
      }
      // Boss shakes when hit (same boss, health dropped)
      if (this.prevBossKey === currentBossKey && this.prevBossHealth > 0 && board.currentBoss.health < this.prevBossHealth) {
        this.triggerBossHit();
      }
      // History: only log when a meaningful phase transition completes
      const phaseJustChanged =
        (prevPhase === 'attack' && board.playerPhase === 'defend') ||
        (prevPhase === 'defend' && board.playerPhase === 'attack') ||
        (prevPhase === 'attack' && board.playerPhase === 'Joker');
      if (phaseJustChanged && board.table.length > this.prevTable.length && this.lastTurnId) {
        const added = board.table.slice(this.prevTable.length);
        this.addToHistory(added, this.lastTurnId, board, `${board.currentBoss.value}${board.currentBoss.suit}`, prevPhase, board.currentBoss.health, board.currentBoss.damage);
      }

      // Boss derrotado: detectar por cambio de boss key (no requiere prevTable > 0)
      const bossJustDefeated = this.prevBossKey !== '' && this.prevBossKey !== currentBossKey;
      if (bossJustDefeated && board.table.length === 0) {
        const newGraveCards = board.grave.slice(this.prevGraveLength);
        const bossCardInGrave = newGraveCards.length > 0 && ['J', 'Q', 'K'].includes(newGraveCards[0].value);
        const killingCards = board.grave.slice(this.prevGraveLength + (bossCardInGrave ? 1 : 0) + this.prevTable.length);
        this.addToHistory(killingCards, this.lastTurnId, board, this.prevBossDisplay, 'attack', 0, this.prevBossDamage);
        this.addBossDefeatedEntry(this.prevBossDisplay);
        if (!board.endGame) {
          this.triggerBossAnnouncement(this.prevBossDisplay, `${board.currentBoss.value}${board.currentBoss.suit}`);
        }
        this.frozenTable = this.prevTable;
        const t = setTimeout(() => {
          this.triggerTableDiscard(this.frozenTable);
          this.frozenTable = [];
        }, 1500);
        this.flyingCleanupTimeouts.push(t);
      }
      // Graveyard reshuffles into deck
      if (this.prevGraveLength > 0 && board.grave.length === 0 && board.deck.length > this.prevDeckLength) {
        this.triggerGraveToDeck();
      }

      if (board.endGame && this.bossAnnouncement) {
        this.bossAnnouncement = null;
        if (this.bossAnnouncementTimeout) {
          clearTimeout(this.bossAnnouncementTimeout);
          this.bossAnnouncementTimeout = null;
        }
      }

      if (prevPhase === 'defend' && board.playerPhase === 'attack') {
        this.justPassedToDefend = false;
      }

      this.lastPhase = board.playerPhase;
      this.prevBossHealth = board.currentBoss.health;
      this.prevBossDamage = board.currentBoss.damage;
      this.prevBossKey = currentBossKey;
      this.prevBossDisplay = `${board.currentBoss.value}${board.currentBoss.suit}`;
      this.prevTable = [...board.table];
      this.prevGraveLength = board.grave.length;
      this.prevDeckLength = board.deck.length;

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

    this.socketService.chatMessage$.pipe(takeUntil(this.destroy$)).subscribe(({ playerName, message }) => {
      const isMe = playerName === this.socketService.playerName;
      let color = '';
      if (isMe) {
        color = this.playerColorOf(this.socketService.playerId);
      } else if (this.board) {
        const player = this.board.players.find(p => p.name === playerName);
        if (player) color = this.playerColorOf(player.id);
      }
      this.chatMessages.push({ playerName: isMe ? 'Tú' : playerName, message, isMe, color });
      if (this.chatMessages.length > 60) this.chatMessages.shift();
      this.scrollChatToBottom();
    });

    this.socketService.requestBoardStatus();
  }

  ngOnDestroy(): void {
    this.clearDisconnectState();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.dealClearTimeout) clearTimeout(this.dealClearTimeout);
    if (this.bossHitTimeout) clearTimeout(this.bossHitTimeout);
    if (this.bossAnnouncementTimeout) clearTimeout(this.bossAnnouncementTimeout);
    this.flyingCleanupTimeouts.forEach(t => clearTimeout(t));
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

  // ─── Color por jugador ────────────────────────────────────────────────

  playerColorOf(playerId: string): string {
    return this.playerColorMap.get(playerId) ?? '#ffffff';
  }

  // ─── Anuncio de jefe derrotado ────────────────────────────────────────

  private triggerBossAnnouncement(defeated: string, next: string): void {
    if (this.bossAnnouncementTimeout) clearTimeout(this.bossAnnouncementTimeout);
    this.bossAnnouncement = { defeated, next };
    this.bossAnnouncementTimeout = setTimeout(() => {
      this.bossAnnouncement = null;
      this.bossAnnouncementTimeout = null;
    }, 3500);
  }

  private addBossDefeatedEntry(defeatedBoss: string): void {
    this.historyLog.unshift({
      cards: [{ value: '★', suit: defeatedBoss }] as any,
      playerName: '',
      bossDisplay: defeatedBoss,
      phase: 'defeat',
      bossHealth: 0,
      bossDamage: 0,
      playerColor: '#ffd54f',
      isDefeatedBoss: true,
    });
    if (this.historyLog.length > 50) this.historyLog.pop();
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

  get canReturnToAttack(): boolean {
    return this.isMyTurn &&
      this.board?.playerPhase === 'defend' &&
      this.justPassedToDefend;
  }

  get canDefend(): boolean {
    if (!this.isMyTurn || !this.board || this.board.playerPhase !== 'defend') return false;

    const bossDamage = this.board.currentBoss.damage;
    if (bossDamage === 0) return true;
    if (!this.selectedCards.length) return false;

    // Joker en selección cancela todo el daño
    if (this.selectedCards.some(c => c.suit === 'Joker')) return true;

    const selectedSum = this.selectedCards.reduce((acc, c) => acc + this.cardPoints(c.value), 0);
    if (selectedSum >= bossDamage) return true;

    // Si con toda la mano no se puede cubrir, permitir defensa parcial (pierde vida)
    const handCanCover = this.hand.some(c => c.suit === 'Joker') ||
      this.hand.reduce((acc, c) => acc + this.cardPoints(c.value), 0) >= bossDamage;

    return !handCanCover;
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
    if (value === 'J') return 10;
    if (value === 'Q') return 15;
    if (value === 'K') return 20;
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
    this.justPassedToDefend = true;
    this.socketService.playTurn('attack', []);
    this.selectedCards = [];
  }

  returnToAttack(): void {
    this.justPassedToDefend = false;
    this.socketService.returnToAttack();
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

  // ─── Animaciones de tablero ───────────────────────────────────────────

  private triggerBossHit(): void {
    if (this.bossHitTimeout) clearTimeout(this.bossHitTimeout);
    this.bossHit = false;
    setTimeout(() => { this.bossHit = true; }, 0);
    this.bossHitTimeout = setTimeout(() => {
      this.bossHit = false;
      this.bossHitTimeout = null;
    }, 600);
  }

  private triggerTableDiscard(cards: Card[]): void {
    const tableEl = this.tablePanelEl?.nativeElement;
    const graveEl = this.gravePileEl?.nativeElement;
    if (!tableEl || !graveEl) return;

    const tr = tableEl.getBoundingClientRect();
    const gr = graveEl.getBoundingClientRect();
    const sx = tr.left + tr.width / 2;
    const sy = tr.top + tr.height / 2;
    const dx = (gr.left + gr.width / 2 - sx) + 'px';
    const dy = (gr.top + gr.height / 2 - sy) + 'px';

    const batch = cards.map((card, i) => ({
      id: ++this.flyingCardId,
      card,
      x: sx - 28 + (Math.random() - 0.5) * 28,
      y: sy - 40 + (Math.random() - 0.5) * 18,
      dx, dy,
      delay: i * 75,
    }));
    this.flyingCards = [...this.flyingCards, ...batch];

    const ids = new Set(batch.map(c => c.id));
    const t = setTimeout(() => {
      this.flyingCards = this.flyingCards.filter(c => !ids.has(c.id));
    }, (cards.length - 1) * 75 + 520);
    this.flyingCleanupTimeouts.push(t);
  }

  private triggerGraveToDeck(): void {
    const graveEl = this.gravePileEl?.nativeElement;
    const deckEl  = this.deckPileEl?.nativeElement;
    if (!graveEl || !deckEl) return;

    const gr = graveEl.getBoundingClientRect();
    const dr = deckEl.getBoundingClientRect();
    const sx = gr.left + gr.width / 2;
    const sy = gr.top + gr.height / 2;
    const dx = (dr.left + dr.width / 2 - sx) + 'px';
    const dy = (dr.top + dr.height / 2 - sy) + 'px';

    const count = Math.min(this.prevGraveLength, 8);
    const batch = Array.from({ length: count }, (_, i) => ({
      id: ++this.flyingCardId,
      card: undefined as Card | undefined,
      x: sx - 28 + (Math.random() - 0.5) * 22,
      y: sy - 40 + (Math.random() - 0.5) * 16,
      dx, dy,
      delay: i * 65,
    }));
    this.flyingCards = [...this.flyingCards, ...batch];

    const ids = new Set(batch.map(c => c.id));
    const t = setTimeout(() => {
      this.flyingCards = this.flyingCards.filter(c => !ids.has(c.id));
    }, (count - 1) * 65 + 520);
    this.flyingCleanupTimeouts.push(t);
  }

  trackFlyingCard(_: number, fc: { id: number }): number { return fc.id; }

  sendChat(message: string): void {
    this.socketService.sendChatMessage(message);
  }

  catStyle(color: string, active: boolean): Record<string, string> {
    return active
      ? { color, borderColor: color, backgroundColor: color + '28' }
      : { color: color + '88', borderColor: color + '44', backgroundColor: color + '0e' };
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const scrollEl = (el?: ElementRef<HTMLElement>) =>
        el?.nativeElement.scrollTo({ top: el.nativeElement.scrollHeight, behavior: 'smooth' });
      scrollEl(this.chatMsgsDesktop);
      scrollEl(this.chatMsgsMobile);
    }, 0);
  }

  private addToHistory(
    cards: Card[],
    playerId: string,
    board: Board,
    bossDisplay: string,
    phase: string,
    bossHealth: number,
    bossDamage: number,
  ): void {
    if (!cards.length || !bossDisplay) return;
    const player = board.players.find(p => p.id === playerId);
    const playerName = playerId === this.socketService.playerId
      ? 'Tú'
      : (player?.name ?? '?');
    const playerColor = this.playerColorOf(playerId);
    this.historyLog.unshift({ cards, playerName, bossDisplay, phase, bossHealth, bossDamage, playerColor });
    if (this.historyLog.length > 50) this.historyLog.pop();
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
