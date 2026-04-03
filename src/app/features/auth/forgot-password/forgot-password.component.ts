import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  isSuccess = false;
  errorMessage = '';

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.isSuccess = false;

    const email = this.form.value.email;

    // Simulate API call to mock server
    this.http.post('/api/v1/auth/forgot-password', { email }).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isLoading = false;
        // In a real app, you might not want to reveal if an email exists, 
        // but for this demo/simulator we'll show a generic error or success.
        console.error(err);
        this.errorMessage = 'Failed to process request. Please try again.';
      }
    });
  }
}
