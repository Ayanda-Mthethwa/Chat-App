import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { AdminDashboard } from './features/admin/admin-dashboard';
import { authGuard } from './core/guards/auth.guard';
import { ChatWindowComponent } from './features/chat/chat-window/chat-window';
import { Register } from './features/auth/register/register';
import { Settings } from './features/settings/settings';

export const routes: Routes = [
  { path: 'auth/login', component: Login },
  { path: 'auth/register', component: Register },
  { path: 'features/admin', component: AdminDashboard, canActivate: [authGuard] },
  { path: 'features/chat/:username', component: ChatWindowComponent, canActivate: [authGuard] },
  { path: 'features/chat', component: ChatWindowComponent, canActivate: [authGuard] },
  { path: 'features/settings', component: Settings, canActivate: [authGuard] },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' }
];
