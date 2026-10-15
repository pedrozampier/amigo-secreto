import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';

/**
 * Layout das rotas de grupo (D-07 / RA5-ID17). Hierarquia real de layout: esta é a
 * rota PAI de /group/create e /group/:id/manage, com <router-outlet> próprio,
 * aninhada DENTRO do layout autenticado — que já aplica o authGuard e o header
 * (D-19 da Fase 2). Nada de guard aqui: ele é herdado.
 */
@Component({
  selector: 'app-group-layout',
  imports: [RouterOutlet, RouterLink, HlmButton],
  templateUrl: './group-layout.page.html',
})
export class GroupLayoutPage {}
