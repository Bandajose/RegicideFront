import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-lobby',
  imports: [CommonModule, RouterModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements OnInit, OnDestroy {
  roomName: string = '';
  players: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(private socketService: SocketService, private router: Router) {}

  ngOnInit() {
    this.roomName = this.socketService.currentRoom;

    if (!this.roomName) {
      this.router.navigate(['/']);
      return;
    }

    this.socketService.players$.pipe(takeUntil(this.destroy$)).subscribe(players => {
      this.players = players;
    });

    this.socketService.boardStatus$.pipe(takeUntil(this.destroy$)).subscribe(board => {
      if (board?.playerTurn) {
        this.router.navigate(['/game']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get playerId(): string {
    return this.socketService.playerId;
  }

  get canStart(): boolean {
    return this.players.length >= 2;
  }

  get isHost(): boolean {
    return this.players.length > 0 && this.players[0] === this.playerId;
  }

  startGame() {
    this.socketService.startGame(this.roomName);
  }

  leaveRoom() {
    this.socketService.currentRoom = '';
    this.socketService.playerId = '';
    this.router.navigate(['/']);
  }
}
