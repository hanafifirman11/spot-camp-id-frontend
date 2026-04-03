import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../../core/api-v1';
import { NavbarComponent } from '../../../layout/navbar.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    role: ['CAMPER', Validators.required],
    businessName: ['']
  });

  isLoading = false;
  errorMessage = '';

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    // Validate business name for merchants
    if (this.registerForm.value.role === 'MERCHANT' && !this.registerForm.value.businessName) {
      this.errorMessage = 'Business Name is required for merchants.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const request: RegisterRequest = {
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      email: this.registerForm.value.email,
      phone: this.registerForm.value.phone,
      password: this.registerForm.value.password,
      role: this.registerForm.value.role as RegisterRequest.RoleEnum,
      businessName: this.registerForm.value.businessName || undefined
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        console.log('Register success:', response);
        // Auto-login or redirect to login
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Register failed:', err);
        this.isLoading = false;
        if (err.status === 409) {
          this.errorMessage = 'Email already registered.';
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      }
    });
  }
}
