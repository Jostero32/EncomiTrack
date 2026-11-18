import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastsComponent } from '../shared/toasts/toasts';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
}

interface GrupoMenu {
  titulo: string;
  items: ItemMenu[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  readonly marca = { empresa: 'EncomiTrack', sistema: 'Paz y Salvo y Liquidación' };

  readonly menu: GrupoMenu[] = [
    {
      titulo: 'General',
      items: [{ ruta: '/dashboard', etiqueta: 'Dashboard', icono: 'bi-speedometer2' }],
    },
    {
      titulo: 'Gestión',
      items: [
        { ruta: '/trabajadores', etiqueta: 'Trabajadores', icono: 'bi-people' },
        { ruta: '/expedientes', etiqueta: 'Expedientes', icono: 'bi-folder2-open' },
      ],
    },
    {
      titulo: 'Sistema',
      items: [{ ruta: '/configuracion', etiqueta: 'Configuración', icono: 'bi-gear' }],
    },
  ];

  readonly itemsPlanos = this.menu.flatMap((g) => g.items);
}
