import { Routes } from '@angular/router';
import { Login } from './screens/auth/login/login';
import { Register } from './screens/auth/register/register';
import { HomePage } from './screens/home-page/home-page';
import { ForgotPassword } from './screens/auth/forgot-password/forgot-password';
import { ChangePassword } from './screens/auth/change-password/change-password';
import { authGuard, roomGuard } from './core/guards/auth-guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes-guard';

export const routes: Routes = [
  { path: '', component: HomePage },
  {
    path: 'room/:id',
    loadComponent: () => import('./screens/room/room').then((m) => m.Room),
    canActivate: [roomGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./screens/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  {
    path: 'rooms/new',
    loadComponent: () => import('./screens/create-room/create-room').then((m) => m.CreateRoom),
    canActivate: [authGuard],
  },
  { path: 'auth/login', component: Login },
  { path: 'auth/register', component: Register },
  {
    path: 'auth/forgot-password',
    component: ForgotPassword,
  },
  {
    path: 'auth/change-password',
    component: ChangePassword,
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: '**',
    loadComponent: () => import('./screens/not-found/not-found').then((m) => m.NotFound),
  },
];
