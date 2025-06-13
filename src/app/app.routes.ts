import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LobbyComponent } from './pages/lobby/lobby.component';
import { GameComponent } from './pages/game/game.component';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Página de inicio
  { path: 'lobby', component: LobbyComponent }, // Sala de espera
  { path: 'game', component: GameComponent }, // Sección de juego
  { path: '**', redirectTo: '', pathMatch: 'full' }, // Redirección a la página de inicio
];