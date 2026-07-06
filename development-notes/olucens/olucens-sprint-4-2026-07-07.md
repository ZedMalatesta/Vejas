# Sprint 4: HTTP, RxJS & Testing — 2026-07-07

- **What was done:**
1) Replaced the dead Supabase project with our own backend integration: `AuthService` now talks to a NestJS API (signup/login/refresh with JWT + refresh tokens in localStorage) while keeping the exact same public interface (`signIn/signUp → {error}`, `user` signal), so no consuming component had to change;
2) Added a functional HTTP interceptor (`authInterceptor` via `withInterceptors()`) that clones the request and attaches the `Authorization: Bearer` header — only for requests targeting our `environment.apiUrl`, third-party requests stay untouched;
3) Built the room screen on real HTTP + WebSocket data: `RoomSessionService` (component-level provider) loads a room snapshot with `HttpClient.get<T>()`, then joins the room over Socket.IO; chat messages, playlist, playback state and the live viewers counter are all signals fed by socket events;
4) RxJS in production use: room list live search with `debounceTime(300)` + `distinctUntilChanged` + `switchMap` (stale responses cancelled), merged with a retry stream and a 15s silent refresh `interval`; socket events are exposed as typed Observables through an internal `Subject` + `socket.onAny()`, consumed with `takeUntilDestroyed`;
5) Error handling states: 404 page for a missing room ("This room does not exist"), loading spinners, and a distinct network-failure message; auth shows "Authentication service is unreachable" on network errors instead of a raw stack;
6) Tests: the frontend suite now has 99 test cases in 24 spec files (Vitest) — services mocked through `providers: [{ provide, useValue }]`, HTTP through `provideHttpClientTesting()`; I also fixed the suite that was broken on `main` (guard typed as `CanActivateFn` instead of `CanDeactivateFn`, missing `provideRouter`/`THEME_CONFIG`/HttpClient providers in 10 specs);
7) Deployed the stack: backend on Render (Docker image runs `prisma migrate deploy` on boot), Postgres on Render, Redis on Upstash, frontend prod environment pointing at the Render URL; CORS accepts a comma-separated origin list so GitHub Pages and localhost work simultaneously;
8) UX/polish driven by live testing in two browsers: viewport-aware player size, unified theme tokens for chat/playlist, live-updating viewers counter, playback permission option ("allow viewers to control playback") enforced on the server and reflected in the UI;

## **Problems:**
1) Supabase (set up in an earlier sprint) turned out to be dead — the project URL stopped resolving entirely. Instead of patching it we switched to our own auth mid-sprint, which meant re-doing the auth layer and every spec that touched it;
2) The app is zoneless, so a socket callback mutating a plain field silently did nothing — chat looked "not working" while the data was actually arriving. Every piece of async state had to become a signal;
3) Subscriptions made via `socket.on()` before the socket connected were bound to `null` and quietly dead. Routing all events through one `Subject` fed by `socket.onAny()` made `on('event')` safe to call at any time;
4) The YouTube IFrame player fought back: a programmatic `pauseVideo()` on a freshly cued player throws it into an "unstarted" black screen; browser autoplay policy blocks sync-driven playback with sound; and two clients applying each other's updates created a play/pause ping-pong. Fixed with state guards (only touch the player when reality differs from the target), muted autostart + an explicit "Tap for sound" gesture button, and a 1200ms echo-suppression window after each remote apply;
5) In production, login worked but every room request returned 500. Since auth touches only Postgres and rooms also touch Redis, elimination pointed at the Redis connection — the env var on Render had the variable name and quotes pasted inside the value, so ioredis was parsing garbage;
6) `vi.mock` for relative imports is not supported by the Angular Vitest builder, so mocking had to go through DI (tokens + `TestBed` providers) rather than module interception — which honestly produced better seams anyway;

- **Solutions:** Angular docs on `HttpInterceptorFn`, `takeUntilDestroyed` and `provideHttpClientTesting`; RxJS docs for the search pipeline (`switchMap` vs `mergeMap` — cancellation is exactly what search needs); Socket.IO docs on rooms and auth handshakes; a lot of two-browser manual testing for the sync logic. Key insight: writing the tests first (we agreed on TDD this sprint) turned every "it doesn't work" bug into a failing spec before it became a debugging session;

- **What I learned:**
1) Functional interceptors: cloning requests, `withInterceptors()` registration and how the chain order works;
2) Real-world RxJS composition — debounced search with `switchMap`, merging user actions with timers, and why `takeUntilDestroyed` beats manual `Subscription` bookkeeping;
3) Testing HTTP code with `provideHttpClientTesting()` / `HttpTestingController.expectOne().flush()` and mocking services via `providers` + `useValue` (the Vitest equivalent of `jasmine.createSpyObj`);
4) How zoneless change detection changes the rules: signals are not an optimization, they are the only way the view finds out anything happened;
5) Designing a small realtime protocol: server never echoes an event to its sender, snapshots on join, and why event ordering (snapshot before broadcast) matters;

- **Plans:**
1) Avatar file upload (currently URL-only) and a real password-reset flow;
2) Stabilize the occasionally flaky `socket.service.spec` (whole-file failure under the Vitest builder, passes on rerun);
3) E2E smoke test covering signup → create room → second client joins → synced playback;

- **Time spent:** ~30 hours
