import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  model = { username: '', email: '', password: '', confirmPassword: '' };
  isLoading = false;
  errors: string[] = [];
  showPassword = false;
  showConfirm = false;

  register() {
    this.errors = [];

    if (this.model.password !== this.model.confirmPassword) {
      this.errors = ['Passwords do not match.'];
      return;
    }

    this.isLoading = true;
    this.authService.register(this.model).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Account created! Welcome aboard.');
        this.router.navigateByUrl('/features/chat');
      },
      error: err => {
        this.isLoading = false;
        if (Array.isArray(err.error)) {
          this.errors = err.error.map((e: any) => e.description ?? String(e));
        } else {
          this.errors = [err.error?.message || 'Registration failed. Please try again.'];
        }
      }
    });
  }
}
