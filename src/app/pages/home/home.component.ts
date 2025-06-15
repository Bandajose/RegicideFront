import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SocketService } from '../../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CreateRoomRequest } from '../../Data/CreateRoomRequest';
import { RoomResponse } from '../../Data/RoomResponse';

@Component({
  selector: 'app-home',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  dataRooms: RoomResponse = {
    rooms: [],
    totalRooms: '0',
    totalPages: '0',
    currentPage: '1'
  };
  
  errorMessage: string = '';
  loading: boolean = false;
  roomName: string = '';


  constructor(private socketService: SocketService) { }

  ngOnInit() {
    //Obtener las salas

    this.socketService.getRooms({ page: '1', size: '5' });

    //Escuchar por cambios en las salas
    this.socketService.updateRooms().subscribe(roomsResponse => {
      console.log("📥 Salas recibidas:", roomsResponse);
      this.dataRooms = roomsResponse;
      console.log("📥 Salas recibidas: this.rooms ", this.dataRooms);

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
      if (response.success) {
        //entrar a la sala creada
      }
      else
      {
        this.errorMessage = response.message || 'Error al crear la sala';
        console.error('Error al crear la sala:', this.errorMessage);
      }
    });

  }

  // get filteredRooms() {
  //   return this.rooms.filter(room => room.roomName.toLowerCase().includes(this.roomName.toLowerCase()));
  // }
}
