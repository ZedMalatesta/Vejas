# Room test findings

Written while adding unit + integration coverage for the Room screen (`src/app/screens/room/`).
Everything below was reproduced by a test — nothing here is speculation. Nothing was fixed;
each item is left for you to handle.

The suite itself is green: **249 passing**, and the only 5 failures are the pre-existing ones
described in finding 5.

Findings 1, 2 and 4 are *pinned* by tests that assert the current (wrong) behaviour, with the
finding number in the test name. When you fix the product code, those tests go red — that is the
signal to delete them and replace them with the positive assertion.

---

## 1. Sending a chat message does nothing in a real browser — HIGH

**Where:** [src/app/shared/chat/chat.html:16](src/app/shared/chat/chat.html#L16)

```html
<form class="chat__form" (ngSubmit)="onSubmit()">
```

The form has no `[formGroup]`, and `FormsModule` is not imported — only `ReactiveFormsModule`,
whose only `<form>`-matching directive is `ɵNgNoValidate` (it just adds `novalidate`). So no
directive on that element exposes an `ngSubmit` output, and Angular falls back to registering a
**plain DOM listener for an event literally named `ngSubmit`** — an event nothing ever dispatches.

Pressing Enter or clicking **Send** fires the native `submit` event, which:

- never reaches `onSubmit()`, so the message is never sent, and
- is never `preventDefault()`-ed, so the browser performs a native form submission — a full page
  reload of the room.

Measured directly (dispatching each event against the mounted component):

| event dispatched on the form | messages sent |
| --- | --- |
| native `submit` | 0 |
| synthetic `ngSubmit` | 1 |

Contrast with [src/app/shared/link-input/link-input.html:1](src/app/shared/link-input/link-input.html#L1),
which does carry `[formGroup]` and therefore gets the real `FormGroupDirective.ngSubmit`.

**Fix:** bind the control through a `FormGroup` and put `[formGroup]` on the `<form>` (matching
`LinkInput`), or import `FormsModule` so `NgForm` matches the bare `<form>`.

**Pinned by:** `room.spec.ts` → "ignores a native form submit — known defect".
The passing path is exercised by "sends a typed message through the socket", which dispatches
`ngSubmit` — i.e. the suite currently proves the component works only via an event no browser sends.

---

## 2. The viewer count never updates — MEDIUM

**Where:** [src/app/screens/room/room.ts](src/app/screens/room/room.ts),
[vejas-backend/src/rooms/rooms.gateway.ts:201](vejas-backend/src/rooms/rooms.gateway.ts#L201)

The gateway broadcasts on every join and leave:

```ts
this.server.to(roomId).emit('viewersCount', { count });
```

No client code subscribes to `viewersCount` — grep across `src/app` finds listeners only for
`roomState`, `chatMessage`, `playlistUpdate`, `playbackUpdate` and `disconnect`. The header value
comes from the initial `GET /rooms/:id` and is then frozen for the lifetime of the page, so the
count is wrong for everyone as soon as the second person joins.

Note the gateway comment about ordering the snapshot before the fresh count broadcast — that
careful sequencing is currently pointless, because the client discards the broadcast.

**Fix:** subscribe to `viewersCount` in `Room` (or a small service) and patch `room.viewersCount`.

**Pinned by:** `room.spec.ts` → "ignores the viewersCount broadcast — known gap".

---

## 3. The echo-suppression window closes early under rapid updates — MEDIUM

**Where:** [src/app/screens/room/playback.service.ts:36-42](src/app/screens/room/playback.service.ts#L36-L42)

```ts
private applyRemote(state: PlaybackState): void {
  this.isApplyingRemote = true;
  this.remoteUpdate.set(state);
  setTimeout(() => { this.isApplyingRemote = false; }, 300);
}
```

Each remote update schedules an **independent** 300 ms timeout and none of them are cancelled. With
updates arriving faster than 300 ms — which is exactly what the 5 s heartbeat plus any seek/pause
traffic produces on a busy room — the *oldest* pending timeout clears the flag while a newer update
is still being applied.

Reproduced: update at t=0, another at t=200, then at t=300 the flag is already `false` even though
the second update is only 100 ms old. A local player event at that moment is echoed back to the
server, which is the loop this flag exists to prevent.

**Fix:** keep the handle and `clearTimeout` it before scheduling the next one.

**Verified by:** `playback.service.spec.ts` → "overlapping remote updates" (3 tests).
These assert the current behaviour deliberately; tighten them when you fix it.

---

## 4. The join-time snapshot is echoed straight back to the server — MEDIUM

**Where:** [src/app/screens/room/playback.service.ts:28-30](src/app/screens/room/playback.service.ts#L28-L30)

`applySnapshot()` publishes a remote state **without** setting `isApplyingRemote`, unlike
`applyRemote()`. The join sequence is:

1. `Room.ngOnInit` → `playback.applySnapshot(isPlaying, currentTime)` from the HTTP snapshot;
2. the sync effect seeks/plays the player to match;
3. the player emits `stateChange` → `Room.onPlayerState` → `playback.reportLocal(...)`;
4. `isApplyingRemote` is `false`, so the client emits `playbackUpdate` — reporting the room's own
   state back at it.

Harmless-looking, but every joiner writes to the shared playback state at join time, and a joiner
whose seek has not completed writes a *stale* position that everyone else then follows.

**Fix:** route `applySnapshot` through the same suppression path as `applyRemote`.

**Pinned by:** `room.spec.ts` → "echoes the joining seek back to the server — known gap".
`playback.service.spec.ts` → "does not open the echo-suppression window" documents the asymmetry.

---

## 5. Five pre-existing test failures: Node 25 shadows jsdom's `localStorage` — MEDIUM (test-only)

**Failing before any of this work:** `home-page`, `header`, `change-password`, `forgot-password`,
`bookmarks` — all with `TypeError: localStorage.getItem is not a function`, thrown from
`AuthService.restoreSession()` and `BookmarkService.loadBookmarks()`.

Node 25 (`node -v` → v25.6.1 here) exposes its own experimental `localStorage` global. It requires
`--localstorage-file`, and the runner logs `Warning: --localstorage-file was provided without a
valid path` for every worker. That non-functional global shadows the working one jsdom installs, so
`localStorage` exists but its methods do not. This is an environment problem, not a product bug —
the same code is fine in a browser.

**Options:**

- run tests on Node 22/24 LTS (the runner already warns that odd-numbered releases are not LTS);
- pass `--localstorage-file` a real path in the test script; or
- install a stub in test setup — `installLocalStorageStub()` in
  [src/app/testing/room-test-utils.ts](src/app/testing/room-test-utils.ts) already does exactly
  this, and is what keeps the new Room specs green. Lifting it into a global setup file would fix
  all five at once.

I left those five specs untouched — out of scope for this task, and the fix is a shared decision
about the test environment rather than a per-spec edit.

---

## 6. `ScrollIntoViewDirective` calls `scrollIntoView` unguarded — LOW

**Where:** [src/app/shared/playlist/scroll-into-view.directive.ts:12](src/app/shared/playlist/scroll-into-view.directive.ts#L12)

```ts
this.el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
```

Every Room test that renders a non-empty playlist crashed with
`this.el.nativeElement.scrollIntoView is not a function` until the spec stubbed it. jsdom has no
layout engine and does not implement the method.

Not a browser bug, but it makes the directive untestable without a stub and would throw under SSR
for the same reason. A `?.` or a `typeof` guard costs nothing.

**Worked around in:** `room.spec.ts` `beforeEach` (`Element.prototype.scrollIntoView ??= …`).

---

## 7. `SocketService.emit` lets a caller overwrite the room id — LOW

**Where:** [src/app/core/services/socket.service.ts:27](src/app/core/services/socket.service.ts#L27)

```ts
this.socket.emit(event, { roomId: this.roomId, ...payload });
```

The spread comes last, so a payload containing `roomId` silently wins over the route's. No current
caller does this, so it is defensive only — but the server trusts the client's `roomId`, so the
safer order is `{ ...payload, roomId: this.roomId }`.

**Verified by:** `socket.service.spec.ts` → "lets a caller-supplied roomId win over the route one".

---

## 8. `SocketService.off(event)` removes *every* listener for that event — LOW

**Where:** [src/app/core/services/socket.service.ts:35](src/app/core/services/socket.service.ts#L35)

`socket.off(event)` with no handler argument removes all listeners. Three services
(`PlaylistService`, `ChatService`, `PlaybackService`) each register their own `roomState` handler on
the same socket, so a single `off('roomState')` anywhere would silently deafen the other two.

Nothing calls `off()` today. Worth taking the handler as a second argument before something does.

---

## What was added

175 new tests across 6 files. The room's own services stay real in the integration specs — only the
socket transport and the YouTube IFrame API are faked, so the tests exercise the real signal graph.

| File | Kind | Tests |
| --- | --- | --- |
| `src/app/screens/room/room.spec.ts` | integration | 65 |
| `src/app/screens/room/playlist.service.spec.ts` | unit | 26 |
| `src/app/screens/room/services/bookmark.service.spec.ts` | unit | 25 |
| `src/app/screens/room/playback.service.spec.ts` | unit | 23 |
| `src/app/core/services/socket.service.spec.ts` | unit | 19 |
| `src/app/screens/room/chat.service.spec.ts` | unit | 17 |

Supporting changes:

- `src/app/testing/room-test-utils.ts` — `FakeSocketService` (records emits, replays server pushes),
  `installLocalStorageStub()`, and room/playlist/chat fixture builders.
- `tsconfig.app.json` / `tsconfig.spec.json` — `src/app/testing/**` is excluded from the app build
  and included in the spec project, so helpers never ship in the bundle.

### Two constraints worth knowing before you extend these specs

- **`vi.mock` does not work on relative imports** under `@angular/build:unit-test` — it fails with
  *"the `vi.mock` and related methods are not supported for relative imports with the Angular
  unit-test system"*. Bare package specifiers are fine (`socket.service.spec.ts` mocks
  `socket.io-client` that way). For the YouTube API the specs seed `window.YT` instead, which is the
  seam `loadYouTubeApi()` already checks — no mocking framework involved.
- **The real `VideoPlayer` stays in the tree** in `room.spec.ts`. `Room` queries it with
  `viewChild(VideoPlayer)`, so replacing it with a stub component would make that query return
  `undefined` and silently disable every playback assertion.
