import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { LobbyComponent } from './app/lobby.component';

bootstrapApplication(LobbyComponent, appConfig)
  .catch((err) => console.error(err));
