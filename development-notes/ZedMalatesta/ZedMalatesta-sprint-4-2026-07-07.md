# Sprint 4: Backend Integration, HttpClient, Interceptors & Real-time Sync — 2026-07-07

**What was done:**

1) Added a NestJS backend (`/server`) with a Socket.IO WebSocket gateway (`RoomGateway`) handling six events: `joinRoom`, `playbackUpdate`, `chatMessage`, `playlistAdd`, `playlistSelect`, `playlistRemove`. Room state (playlist, chat history, playback position) is kept in an in-memory `Map` via `RoomStateService`.
2) Added two REST endpoints (`GET /rooms/:id`, `POST /rooms/:id/messages`) in `RoomsController`. The POST stores the message server-side and immediately broadcasts it to all room clients via the gateway, so chat history is shared across socket connections without the client ever touching the socket for sends.
3) Wired Angular `HttpClient` to the backend via `RoomApiService` — `getRoom()` (GET) fetches initial room state on load, `postMessage()` (POST) sends new chat messages. Both calls go through the error interceptor automatically.
4) Implemented `errorInterceptor` as an `HttpInterceptorFn` and registered it with `provideHttpClient(withInterceptors([...]))`. On any HTTP failure it calls `ErrorNotificationService.show()`, which sets a signal-based message displayed in `app.html` as a dismissible banner with a 5-second auto-dismiss timeout.
5) Added a loading state to the Room component: `isLoading` signal starts `true`, flips to `false` on both success and error from `getRoom()`. A spinner is shown while loading; if the call errors, an error message with a retry button replaces the room content.
6) Added a `NotFound` component (`404` heading, "Page not found" subtitle, "Go back home" link) and wired it to the `**` wildcard route so any unrecognised URL shows a meaningful page instead of a blank screen.
7) Replaced the plain `<iframe>` YouTube embed with `@angular/youtube-player`. Created `PlaybackService` to bridge the player and the socket: local player events call `reportLocal()` which emits `playbackUpdate` to the server; incoming `playbackUpdate` events from the server update a `remoteUpdate` signal which an `effect()` in `VideoPlayer` reads to call `player.seekTo()` / `player.playVideo()` / `player.pauseVideo()`.
8) Added WebSocket JWT authentication: `RoomGateway` now implements `OnGatewayConnection` and calls `supabase.auth.getUser(token)` on every new connection — sockets that connect without a valid Supabase session are immediately disconnected. The Angular `SocketService` passes the active session `access_token` in the socket.io `auth` handshake via the callback form of the `auth` option.

**Problems:**

- The YouTube player fires `stateChange` events when it is driven programmatically (e.g. from `player.playVideo()`), which would cause `reportLocal()` to emit back to the server, which would broadcast to other clients, which would drive their players, creating an infinite echo loop.
- `@ViewChild(YouTubePlayer)` decorator is rejected in Angular 22 — the linter requires using the `viewChild()` signal function instead.
- TypeScript's `isolatedModules: true` (set in NestJS) requires payload types in the gateway to be imported as `import type`, otherwise the build fails with "cannot be used as a value" errors.
- `YT.PlayerState` enum from `@types/youtube` cannot be referenced directly in strict module files even with `"types": ["youtube"]` in tsconfig — the compiler treats it as a UMD global access which is forbidden.

**Solutions:**

- Added an `isApplyingRemote` boolean flag to `PlaybackService`. It is set to `true` before applying a remote update and reset after 300 ms via `setTimeout`. `reportLocal()` returns early while the flag is set, breaking the echo loop without any server changes.
- Replaced `@ViewChild(YouTubePlayer) private player?: YouTubePlayer` with `private readonly player = viewChild(YouTubePlayer)` — the signal-based equivalent, which also works correctly inside `effect()` since `this.player()` returns `undefined` before the view initialises and the guard `if (!state || !player) return` handles that case.
- All payload interfaces used only as types in `room.gateway.ts` were switched to `import type { ... }` to satisfy `isolatedModules`.
- Replaced `YT.PlayerState.PLAYING` / `YT.PlayerState.PAUSED` with raw constants `const YT_PLAYING = 1; const YT_PAUSED = 2` and typed the event parameter as `{ data: number }` instead of the enum type. The numeric values are stable and documented in the YouTube IFrame API spec.

**What I learned:**

- `HttpInterceptorFn` (functional interceptor) vs the old class-based `HttpInterceptor` — the functional form is a plain function that receives the request and a `next` handler, making it trivial to compose with RxJS operators (`catchError`, `tap`, `map`) without needing a class or `inject()` calls in a constructor. It integrates directly with Angular's DI via the `inject()` function called inside the function body, which is allowed because Angular's injection context is active when interceptors run. Registering it with `withInterceptors([...])` in `app.config.ts` is a single line. The old class approach required creating a class, decorating it, and adding it to a `providers` array with `HTTP_INTERCEPTORS` multi-provider — four steps instead of one;
- Signal-based `viewChild()` vs `@ViewChild` decorator — the decorator runs change detection independently of the signal graph, requiring `ngAfterViewInit` to access the first non-null value. `viewChild()` returns a signal that is `undefined` before the view initialises and the actual instance after, so an `effect()` that reads it naturally waits for the view — no lifecycle hook needed. It also fits OnPush correctly since the effect re-runs whenever either the view child signal or any other dependency changes;
- NestJS `handleConnection` for WebSocket auth is the right pattern over guards on individual `@SubscribeMessage` handlers — it runs once per connection, disconnects the socket before any messages can be processed, and keeps auth logic in one place. The tradeoff is that it cannot return a structured error to the client (only disconnect), but for a connection-level auth check that is the correct behaviour;
- The echo loop problem in real-time sync is a common pitfall: any client that both receives state and drives an output (player) needs a way to distinguish "I changed this" from "the server told me to change this". The boolean flag + timeout pattern is the simplest solution when the output system (YouTube IFrame API) does not expose a way to suppress its own events;

**Plans for the next sprint:**

1) Replace the single hardcoded `demo-room` with per-room routing (`:id` route param) so multiple rooms can coexist;
2) Add user roles (host vs viewer) — only the host should be able to control playback and the queue;
3) Deploy the NestJS backend to Render and update the production `socketUrl` / `apiUrl` environment values;

**Time spent:** ~10 hours
