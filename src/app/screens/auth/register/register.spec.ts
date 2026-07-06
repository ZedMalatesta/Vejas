import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Register } from './register';
import { AuthService } from '../../../core/services/auth.service';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let router: Router;

  const signUp = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signUp, user: () => null } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    signUp.mockReset();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call the auth service when the form is invalid', async () => {
    await component.register();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('navigates home after a successful registration', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    signUp.mockResolvedValue({ error: null });

    component.form.setValue({ username: 'alex', email: 'a@b.com', password: 'secret123' });
    await component.register();

    expect(signUp).toHaveBeenCalledWith('a@b.com', 'secret123');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('renders the auth error message in the template when registration fails', async () => {
    signUp.mockResolvedValue({ error: { message: 'User already registered' } });

    component.form.setValue({ username: 'alex', email: 'a@b.com', password: 'secret123' });
    await component.register();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'User already registered'
    );
  });

  it('renders a clear message when auth is unreachable (network error)', async () => {
    signUp.mockRejectedValue(new TypeError('Failed to fetch'));

    component.form.setValue({ username: 'alex', email: 'a@b.com', password: 'secret123' });
    await component.register();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Authentication service is unreachable'
    );
  });
});
