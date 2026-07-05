import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CreateRoom } from './create-room';

describe('CreateRoom', () => {
  let fixture: ComponentFixture<CreateRoom>;
  let component: CreateRoom;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRoom],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRoom);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not send a request when the form is invalid', () => {
    component.create();

    httpMock.expectNone(`${environment.apiUrl}/rooms`);
    expect(component.form.controls.name.touched).toBe(true);
  });

  it('shows a validation error for a too-short name', async () => {
    component.form.controls.name.setValue('ab');
    component.form.controls.name.markAsTouched();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Minimum 3 characters');
  });

  it('rejects a non-http cover URL', () => {
    component.form.controls.coverUrl.setValue('not-a-url');
    expect(component.form.controls.coverUrl.invalid).toBe(true);
  });

  it('posts the room and navigates to it on success', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.setValue({ name: 'Movie night', description: '', coverUrl: '' });
    component.create();

    const req = httpMock.expectOne(`${environment.apiUrl}/rooms`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Movie night' });
    req.flush({ id: 'room-9', name: 'Movie night' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/room', 'room-9']);
  });

  it('shows a server error message and re-enables the form on failure', async () => {
    component.form.setValue({ name: 'Movie night', description: '', coverUrl: '' });
    component.create();

    httpMock
      .expectOne(`${environment.apiUrl}/rooms`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(component.submitting()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Could not create the room');
  });
});
