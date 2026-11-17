import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell';
import { ConfiguracionComponent } from './pages/configuracion/configuracion';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ExpedienteDetalleComponent } from './pages/expediente-detalle/expediente-detalle';
import { ExpedientesComponent } from './pages/expedientes/expedientes';
import { TrabajadoresComponent } from './pages/trabajadores/trabajadores';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'trabajadores', component: TrabajadoresComponent },
      { path: 'expedientes', component: ExpedientesComponent },
      { path: 'expedientes/:id', component: ExpedienteDetalleComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
