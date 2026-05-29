import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../../services/socket.service';
import { LobbyPlayer } from '../../Data/LobbyPlayer';
import { RoomConfig, DEFAULT_CONFIG } from '../../Data/RoomConfig';

@Component({
  selector: 'app-lobby',
  imports: [CommonModule, RouterModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements OnInit, OnDestroy {
  roomName = '';
  players: LobbyPlayer[] = [];
  config: RoomConfig = { ...DEFAULT_CONFIG };
  private destroy$ = new Subject<void>();
  private gameStarting = false;

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit() {
    this.roomName = this.socketService.currentRoom;

    if (!this.roomName) {
      this.router.navigate(['/']);
      return;
    }

    this.socketService.rejoinFailed$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.router.navigate(['/']);
    });

    this.socketService.lobbyUpdate$.pipe(takeUntil(this.destroy$)).subscribe(update => {
      this.players = update.players;
      this.config = { ...update.config };
    });

    this.socketService.kicked$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.socketService.currentRoom = '';
      this.socketService.playerId = '';
      this.router.navigate(['/']);
    });

    this.socketService.boardStatus$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      if (board?.playerTurn) {
        this.gameStarting = true;
        this.router.navigate(['/game']);
      }
    });
  }

  ngOnDestroy() {
    if (!this.gameStarting && this.socketService.currentRoom) {
      this.socketService.leaveRoom();
      this.socketService.currentRoom = '';
      this.socketService.playerId = '';
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get playerId(): string {
    return this.socketService.playerId;
  }

  get isHost(): boolean {
    return this.players.length > 0 && this.players[0].id === this.playerId;
  }

  get canStart(): boolean {
    return this.players.length >= 2 && this.players.slice(1).every(p => p.ready);
  }

  get isReady(): boolean {
    return this.players.find(p => p.id === this.playerId)?.ready ?? false;
  }

  adjustConfig(field: 'maxPlayers' | 'handSize' | 'lives', delta: number) {
    if (!this.isHost) return;
    const limits: Record<string, [number, number]> = {
      maxPlayers: [2, 5],
      handSize:   [5, 8],
      lives:      [1, 3],
    };
    const [min, max] = limits[field];
    (this.config as any)[field] = Math.min(max, Math.max(min, (this.config[field] as number) + delta));
    this.socketService.setConfig({ ...this.config });
  }

  toggleRandomBosses() {
    if (!this.isHost) return;
    this.config.randomBosses = !this.config.randomBosses;
    this.socketService.setConfig({ ...this.config });
  }

  adjustTurnTime(delta: number) {
    if (!this.isHost) return;
    const options = [0, 30, 60, 90];
    const idx = options.indexOf(this.config.turnTime ?? 0);
    const newIdx = Math.max(0, Math.min(options.length - 1, idx + delta));
    this.config.turnTime = options[newIdx];
    this.socketService.setConfig({ ...this.config });
  }

  turnTimeLabel(seconds: number): string {
    return seconds === 0 ? 'Sin límite' : `${seconds}s`;
  }

  toggleReady() {
    this.socketService.toggleReady();
  }

  kickPlayer(targetId: string) {
    this.socketService.kickPlayer(targetId);
  }

  startGame() {
    this.socketService.startGame();
  }

  leaveRoom() {
    this.socketService.leaveRoom();
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }
}
