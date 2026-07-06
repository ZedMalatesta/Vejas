import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthButton } from './auth-button';

describe('AuthButton', () => {
  let component: AuthButton;
  let fixture: ComponentFixture<AuthButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthButton],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthButton);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'Sign in');
    fixture.componentRef.setInput('icon', 'login');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
