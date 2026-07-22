import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;

  const signIn = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            signIn,
            signInWithGoogle: vi.fn(),
            signInWithGithub: vi.fn(),
            user: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    signIn.mockReset();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('disables the submit button while the form is invalid', async () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button.auth__submit'
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    component.form.setValue({ email: 'a@b.com', password: 'secret123' });
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('does not call the auth service when the form is invalid', async () => {
    await component.login();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('navigates home after a successful sign-in', async () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    signIn.mockResolvedValue({ error: null });

    component.form.setValue({ email: 'a@b.com', password: 'secret123' });
    await component.login();

    expect(signIn).toHaveBeenCalledWith('a@b.com', 'secret123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('renders the auth error message in the template when sign-in fails', async () => {
    signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    component.form.setValue({ email: 'a@b.com', password: 'wrong-pass' });
    await component.login();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Invalid login credentials'
    );
  });

  it('renders a clear message when auth is unreachable (network error)', async () => {
    signIn.mockRejectedValue(new TypeError('Failed to fetch'));

    component.form.setValue({ email: 'a@b.com', password: 'secret123' });
    await component.login();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Authentication service is unreachable'
    );
  });
});
