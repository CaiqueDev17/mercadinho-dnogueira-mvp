import { Routes } from '@angular/router';
import { autenticadoGuard } from './telas/guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'menu' },
  { path: 'entrar', loadComponent: () => import('./telas/entrada').then((m) => m.EntradaComponent) },
  { path: 'menu', canActivate: [autenticadoGuard], loadComponent: () => import('./telas/menu').then((m) => m.MenuComponent) },
  { path: 'fiado', canActivate: [autenticadoGuard], loadComponent: () => import('./telas/fiado').then((m) => m.FiadoComponent) },
  { path: 'avisos', canActivate: [autenticadoGuard], loadComponent: () => import('./telas/avisos').then((m) => m.AvisosComponent) },
  { path: 'estoque', canActivate: [autenticadoGuard], loadComponent: () => import('./telas/estoque').then((m) => m.EstoqueComponent) },
  { path: '**', redirectTo: 'menu' },
];
