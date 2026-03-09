import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { AdminDashboard } from './features/admin/admin-dashboard/admin-dashboard';
import { authGuard } from './core/guards/auth.guard';
import { ChatWindowComponent } from './features/chat/chat-window/chat-window';

export const routes: Routes = [
  { path: 'auth/login', component: Login },
  { 
    path: 'features/admin', 
    component: AdminDashboard, 
    canActivate: [authGuard] 
  },

  { path: 'features/chat', component: ChatWindowComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' }
];