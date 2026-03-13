import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  model = { username: '', password: '' };
  isLoading = false;
  loginError = '';
  showPassword = false;

  onSubmit() {
    this.isLoading = true;
    this.loginError = '';

    this.authService.login(this.model).subscribe({
      next: () => {
        this.isLoading = false;
        const user = this.authService.currentUser();
        this.toast.success(`Welcome back, ${user?.username}!`);
        if (user?.role === 'Admin') {
          this.router.navigateByUrl('/features/admin');
        } else {
          this.router.navigateByUrl('/features/chat');
        }
      },
      error: err => {
        this.isLoading = false;
        this.loginError = err.error?.message || 'Invalid username or password.';
      }
    });
  }
}
