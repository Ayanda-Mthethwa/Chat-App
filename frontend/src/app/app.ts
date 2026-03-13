import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { PresenceService } from './core/services/presence.service';
import { ToastComponent } from './shared/toast/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private presenceService = inject(PresenceService);

  ngOnInit(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      this.authService.currentUser.set(user);
      this.presenceService.createHubConnection(user.token);
    }
  }
}
