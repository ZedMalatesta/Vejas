import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { CanComponentDeactivate, unsavedChangesGuard } from './unsaved-changes-guard';

describe('unsavedChangesGuard', () => {
  const executeGuard = (component: CanComponentDeactivate): boolean =>
    TestBed.runInInjectionContext(
      () =>
        unsavedChangesGuard(
          component,
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
          {} as RouterStateSnapshot
        ) as boolean
    );

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('allows leaving when the component has no unsaved changes', () => {
    expect(executeGuard({ canDeactivate: () => true })).toBe(true);
  });

  it('blocks leaving when the component reports unsaved changes', () => {
    expect(executeGuard({ canDeactivate: () => false })).toBe(false);
  });
});
