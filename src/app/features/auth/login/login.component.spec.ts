import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/api-v1';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
        // Don't mock Router in providers if using RouterTestingModule, but we need to spy on navigate
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    // Inject Router from TestBed to spy on it (RouterTestingModule provides a real Router)
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate'); 
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate empty form', () => {
    component.loginForm.controls['email'].setValue('');
    component.loginForm.controls['password'].setValue('');
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should validate email format', () => {
    component.loginForm.controls['email'].setValue('invalid-email');
    expect(component.loginForm.controls['email'].valid).toBeFalse();
    
    component.loginForm.controls['email'].setValue('valid@test.com');
    expect(component.loginForm.controls['email'].valid).toBeTrue();
  });

  it('should call authService on valid submit', () => {
    // Mock success response
    const mockResponse: any = { accessToken: 'token123' };
    authServiceSpy.login.and.returnValue(of(mockResponse));
    const router = TestBed.inject(Router); // Re-get router for expectation

    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('Password123!');
    
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show error message on login failure', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));

    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('wrong-password');
    
    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid email or password');
    expect(component.isLoading).toBeFalse();
  });
});
