import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SocketService } from '../../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CreateRoomRequest } from '../../Data/CreateRoomRequest';

@Component({
  selector: 'app-home',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  rooms: any[] = [];
  errorMessage: string = '';
  loading: boolean = false;
  roomName: string = '';

  constructor(private socketService: SocketService) { }

  ngOnInit() {
    //Obtener las salas

    this.socketService.getRooms({ page: '1', size: '5' });

    //Escuchar por cambios en las salas
    this.socketService.updateRooms().subscribe(rooms => {
      console.log("📥 Salas recibidas:", rooms);
    });
  }

  joinRoom() {
    if (!this.roomName.trim()) {
      this.errorMessage = 'Por favor, ingresa un ID válido.';
      return;
    }
    this.errorMessage = '';
    this.loading = true;

    setTimeout(() => {
      alert(`Uniéndote a la sala con ID: ${this.roomName}`);
      this.loading = false;
    }, 1500);
  }

  joinRoomByName(roomName: string) {
    alert(`Uniéndote a la sala: ${roomName}`);
  }

  createRoom() {
    if (!this.roomName.trim()) return;
    console.log('Creando sala con nombre:', this.roomName);

    const roomRequest: CreateRoomRequest = {
      roomName: this.roomName,
      page: '1',
      size: '5'
    };


    this.socketService.createRoom(roomRequest).subscribe(response => {
      // this.message = response.message;
      // if (response.success) {
      //   this.roomName = '';
      // }
    });
  
    // this.socketService.createRoom(roomRequest);
  }

  get filteredRooms() {
    return this.rooms.filter(room => room.name.toLowerCase().includes(this.roomName.toLowerCase()));
  }
}
