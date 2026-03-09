import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5062/api/admin/';

  getAllUsers() {
    return this.http.get<User[]>(this.baseUrl + 'users');
  }
}