
import { Pagination } from './Pagination';

export interface CreateRoomRequest extends Pagination {
    roomName: string; 
    page: string;
    size: string;
}