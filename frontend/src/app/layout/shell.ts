import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastsComponent } from '../shared/toasts/toasts';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {}
