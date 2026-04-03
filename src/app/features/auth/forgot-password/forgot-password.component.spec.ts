import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate empty form', () => {
    component.form.controls['email'].setValue('');
    expect(component.form.invalid).toBeTruthy();
  });

  it('should validate correct email', () => {
    component.form.controls['email'].setValue('test@example.com');
    expect(component.form.valid).toBeTruthy();
  });

  it('should send password reset request', () => {
    component.form.controls['email'].setValue('test@example.com');
    component.onSubmit();

    const req = httpMock.expectOne('/api/v1/auth/forgot-password');
    expect(req.request.body).toEqual({ email: 'test@example.com' });

    req.flush({}); // Simulate success response

    expect(component.isSuccess).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error on failed request', () => {
    component.form.controls['email'].setValue('fail@example.com');
    component.onSubmit();

    const req = httpMock.expectOne('/api/v1/auth/forgot-password');
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.isSuccess).toBeFalse();
    expect(component.isLoading).toBeFalse();
    expect(component.errorMessage).toBeTruthy();
  });
});
