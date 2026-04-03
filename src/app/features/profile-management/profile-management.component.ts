import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../layout/navbar.component';
import { UserProfile, UserProfileService } from '../../core/services/user-profile.service';
import { UserPreferenceService } from '../../core/services/user-preference.service';

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './profile-management.component.html',
  styleUrl: './profile-management.component.scss'
})
export class ProfileManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(UserProfileService);
  private preferenceService = inject(UserPreferenceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showNavbar = true;
  title = 'Profile management';
  subtitle = 'Manage your account details, password, and preferences here.';

  profile: UserProfile | null = null;
  isLoading = false;
  isSavingProfile = false;
  isSavingPassword = false;
  loadError = '';
  profileError = '';
  profileMessage = '';
  passwordError = '';
  passwordMessage = '';

  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
    avatar: [''],
    darkMode: [false]
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit() {
    const data = this.route.snapshot.data || {};
    this.showNavbar = !data['embedded'];
    this.title = data['title'] || this.title;
    this.subtitle = data['subtitle'] || this.subtitle;

    if (!this.hasToken()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    this.loadProfile();
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    this.profileError = '';
    this.profileMessage = '';

    const payload = this.profileForm.getRawValue();

    this.profileService.updateProfile(payload).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileMessage = 'Profile updated successfully.';
        this.isSavingProfile = false;
        this.updateStoredUserInfo(profile);
        this.preferenceService.applyDarkMode(!!profile.darkMode);
      },
      error: (err) => {
        this.profileError = this.extractErrorMessage(err, 'Failed to update profile.');
        this.isSavingProfile = false;
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword = true;
    this.passwordError = '';
    this.passwordMessage = '';

    const raw = this.passwordForm.getRawValue();
    this.profileService.changePassword({
      currentPassword: raw.currentPassword || '',
      newPassword: raw.newPassword || ''
    }).subscribe({
      next: () => {
        this.passwordMessage = 'Password updated successfully.';
        this.isSavingPassword = false;
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordError = this.extractErrorMessage(err, 'Failed to update password.');
        this.isSavingPassword = false;
      }
    });
  }

  isFieldInvalid(field: string) {
    const control = this.profileForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isPasswordFieldInvalid(field: string) {
    const control = this.passwordForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get passwordMismatch(): boolean {
    return !!this.passwordForm.errors?.['passwordMismatch'];
  }

  get avatarPreview(): string {
    const value = this.profileForm.get('avatar')?.value;
    return typeof value === 'string' ? value.trim() : '';
  }

  private loadProfile() {
    this.isLoading = true;
    this.loadError = '';

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileForm.patchValue({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phone: profile.phone || '',
          avatar: profile.avatar || '',
          darkMode: !!profile.darkMode
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = this.extractErrorMessage(err, 'Failed to load profile.');
        this.isLoading = false;
      }
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!newPassword || !confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private hasToken(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken'));
  }

  private updateStoredUserInfo(profile: UserProfile) {
    if (typeof window === 'undefined') return;

    const storageTargets = [localStorage, sessionStorage];
    storageTargets.forEach((storage) => {
      const raw = storage.getItem('userInfo');
      const current = raw ? this.safeParse(raw) : {};
      const updated = {
        ...current,
        firstName: profile.firstName ?? current?.firstName,
        lastName: profile.lastName ?? current?.lastName,
        email: profile.email ?? current?.email,
        role: profile.role ?? current?.role,
        businessName: profile.businessName ?? current?.businessName,
        businessCode: profile.businessCode ?? current?.businessCode,
        darkMode: profile.darkMode ?? current?.darkMode
      };
      storage.setItem('userInfo', JSON.stringify(updated));
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('session-updated'));
    }
  }

  private safeParse(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (!error) return fallback;
    const message = error?.error?.message || error?.message;
    if (message) return message;
    return fallback;
  }
}
