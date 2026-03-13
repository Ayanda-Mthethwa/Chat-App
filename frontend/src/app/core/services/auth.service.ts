import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { map } from 'rxjs';
import { User } from '../models/user.model';
import { PresenceService } from './presence.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private presenceService = inject(PresenceService);

  baseUrl = 'http://localhost:5062/api/'; 
  currentUser = signal<User | null>(null); // Global state

  login(model: any) {
    return this.http.post<User>(this.baseUrl + 'account/login', model).pipe(
      map(user => {
        if (user && user.token) {
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUser.set(user);
          this.presenceService.createHubConnection(user.token);
        }
      })
    );
  }

  register(model: any) {
  return this.http.post<User>(this.baseUrl + 'account/register', model).pipe(
    map(user => {
      if (user && user.token) {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUser.set(user);
        this.presenceService.createHubConnection(user.token);
      }
      return user;
    })
  );
}

  logout() {
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.presenceService.stopHubConnection();
  }
}