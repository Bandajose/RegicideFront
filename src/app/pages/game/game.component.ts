import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-game',
  imports: [RouterModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit {


  constructor(private router: Router) {

  }
  ngOnInit() {

    //Preguntar al server si hay una partida en curso
    //Si la hay, unirse a ella
    //Si no la hay, regresar a la pantalla de inicio
    this.router.navigate(['/home']);

  }

}
