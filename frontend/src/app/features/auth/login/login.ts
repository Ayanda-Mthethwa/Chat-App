import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  model: any = {
    username: '',
    password: ''
  };

  onSubmit() {
    this.authService.login(this.model).subscribe({
      next: () => {
        // Once logged in, redirect based on their role
        const user = this.authService.currentUser();
        if (user?.role === 'Admin') {
          this.router.navigateByUrl('/features/admin');
        } else {
          this.router.navigateByUrl('/features/chat');
        }
      },
      error: err => console.error('Login failed', err)
    });
  }
}