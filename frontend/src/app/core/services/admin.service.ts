import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + '/api/admin/';

  getAllUsers() {
    return this.http.get<User[]>(this.baseUrl + 'users');
  }

  getUserList() {
    return this.http.get<User[]>(this.baseUrl + 'list');
  }
}