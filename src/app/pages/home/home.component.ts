import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SocketService } from '../../../services/socket.service';
import { GameHistoryService, GameRecord } from '../../../services/game-history.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CreateRoomRequest } from '../../Data/CreateRoomRequest';
import { RoomResponse } from '../../Data/RoomResponse';
import { Room } from '../../Data/Room';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  dataRooms: RoomResponse = { rooms: [], totalRooms: '0', totalPages: '1', currentPage: '1' };
  errorMessage = '';
  loading = false;
  roomName = '';
  searchQuery = '';
  tempName = '';
  gameHistory: GameRecord[] = [];

  private currentPage = '1';
  private pageSize = '5';
  private destroy$ = new Subject<void>();

  constructor(
    private socketService: SocketService,
    private router: Router,
    private historyService: GameHistoryService,
  ) {}

  ngOnInit() {
    this.gameHistory = this.historyService.getAll();
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) this.roomName = room;
    if (this.hasName) {
      this.loadRooms();
      if (room) this.joinRoom();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Nombre ───────────────────────────────────────────────────────────────

  get playerName(): string {
    return this.socketService.playerName;
  }
  private set playerName(value: string) {
    this.socketService.playerName = value;
  }

  get hasName(): boolean {
    return this.playerName.length > 0;
  }

  confirmName() {
    const trimmed = this.tempName.trim();
    if (!trimmed) return;
    this.playerName = trimmed;
    this.loadRooms();
    if (this.roomName.trim()) this.joinRoom();
  }

  changeName() {
    this.socketService.playerName = '';
    this.tempName = '';
    this.destroy$.next();
  }

  // ─── Salas ────────────────────────────────────────────────────────────────

  private loadRooms() {
    this.socketService.getRooms({ page: this.currentPage, size: this.pageSize });
    this.socketService.updateRooms$.pipe(takeUntil(this.destroy$)).subscribe(rooms => {
      this.dataRooms = rooms;
    });
  }

  get filteredRooms(): Room[] {
    if (!this.searchQuery.trim()) return this.dataRooms.rooms;
    return this.dataRooms.rooms.filter(r =>
      r.roomName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  searchRooms() {
    this.socketService.getRooms({ page: '1', size: this.pageSize });
    this.currentPage = '1';
  }

  joinRoom() {
    if (!this.roomName.trim()) {
      this.errorMessage = 'Por favor, ingresa el nombre de la sala.';
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    this.socketService.joinRoom(this.roomName.trim()).subscribe(response => {
      this.loading = false;
      if (response.success) {
        this.router.navigate(['/lobby']);
      } else {
        this.errorMessage = response.message || 'Error al unirse a la sala.';
      }
    });
  }

  joinRoomByName(name: string) {
    this.loading = true;
    this.errorMessage = '';
    this.socketService.joinRoom(name).subscribe(response => {
      this.loading = false;
      if (response.success) {
        this.router.navigate(['/lobby']);
      } else {
        this.errorMessage = response.message || 'Error al unirse a la sala.';
      }
    });
  }

  createRoom() {
    if (!this.roomName.trim()) {
      this.errorMessage = 'Por favor, ingresa un nombre para la sala.';
      return;
    }
    this.errorMessage = '';
    this.loading = true;

    const request: CreateRoomRequest = { roomName: this.roomName.trim(), page: '1', size: this.pageSize };

    this.socketService.createRoom(request).subscribe(response => {
      if (response.success) {
        this.socketService.joinRoom(this.roomName.trim()).subscribe(joinResponse => {
          this.loading = false;
          if (joinResponse.success) {
            this.router.navigate(['/lobby']);
          } else {
            this.errorMessage = joinResponse.message || 'Error al unirse a la sala creada.';
          }
        });
      } else {
        this.loading = false;
        this.errorMessage = response.message || 'Error al crear la sala.';
      }
    });
  }

  clearHistory(): void {
    this.historyService.clear();
    this.gameHistory = [];
  }

  prevPage() {
    const page = parseInt(this.currentPage);
    if (page <= 1) return;
    this.currentPage = String(page - 1);
    this.socketService.getRooms({ page: this.currentPage, size: this.pageSize });
  }

  nextPage() {
    const page = parseInt(this.currentPage);
    if (page >= parseInt(this.dataRooms.totalPages)) return;
    this.currentPage = String(page + 1);
    this.socketService.getRooms({ page: this.currentPage, size: this.pageSize });
  }
}
