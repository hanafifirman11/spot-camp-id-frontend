import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthResponse, AuthService, LoginRequest, UserInfoDto } from '../../../core/api-v1';
import { NavbarComponent } from '../../../layout/navbar.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  isLoading = false;
  errorMessage = '';

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const request: LoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(request).subscribe({
      next: (response: AuthResponse) => {
        // In a real app, you'd store the token in LocalStorage/SessionStorage
        // or a dedicated AuthService state manager
        console.log('Login success:', response);
        this.persistSession(response, request.email);
        this.navigateAfterLogin(response);
      },
      error: (err: any) => {
        console.error('Login failed:', err);
        this.isLoading = false;
        const serverMessage = err?.error?.message;
        if (serverMessage) {
          this.errorMessage = serverMessage;
          return;
        }

        if (err.status === 401 || err.status === 400) {
          this.errorMessage = 'Invalid email or password';
          return;
        }

        this.errorMessage = 'An unexpected error occurred. Please try again.';
      }
    });
  }

  private persistSession(response: AuthResponse, fallbackEmail: string) {
    if (typeof window === 'undefined') return;

    const token = response.accessToken || '';
    const userInfo: UserInfoDto = response.user || { email: fallbackEmail };
    const userInfoJson = JSON.stringify(userInfo);

    localStorage.setItem('accessToken', token);
    localStorage.setItem('userInfo', userInfoJson);
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('userInfo', userInfoJson);
    window.dispatchEvent(new Event('session-updated'));
  }

  private navigateAfterLogin(response: AuthResponse) {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && returnUrl.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    const role = (response.user?.role || '').replace(/^ROLE_/, '');
    if (role === 'SUPERADMIN' || role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    const isMerchant = role === 'MERCHANT' || role === 'MERCHANT_ADMIN' || role === 'MERCHANT_MEMBER';
    this.router.navigate([isMerchant ? '/merchant/dashboard' : '/']);
  }
}
