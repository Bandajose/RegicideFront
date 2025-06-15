import { Room } from "./Room";


export interface RoomResponse {
    rooms: Room[]; 
    totalRooms: string;
    totalPages: string;
    currentPage: string;
  }