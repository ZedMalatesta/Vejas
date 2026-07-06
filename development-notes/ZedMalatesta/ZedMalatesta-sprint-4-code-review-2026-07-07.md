# Sprint 4: Code Review — Studying Teammate's Supabase Auth Code — 2026-07-07

> Option B: diary about studying another team member's code.

## What I studied

Spent some time reading through the Supabase auth code written by teammates — `supabase.ts`, `auth.service.ts`, and the auth screens. I had to understand it because I was building the WebSocket layer on top and needed the session token.

## How it works

The client is just a module-level constant:

```ts
export const supabase = createClient(supabaseUrl, supabaseKey);
```

Simple. `AuthService` wraps it and has `onAuthStateChange()` in the constructor which keeps the `user` signal up to date automatically — covers login, logout, token refresh, OAuth redirects. First time I saw this I thought it was overcomplicated but actually it's quite smart, you get reactivity for free without polling.

## Troubles I met with Supabase specifically

### Getting the session token

`AuthService` exposes the `User` object but not the full `Session` which has `access_token`. I needed the raw token to send to the NestJS backend for WebSocket auth. Had to call `supabase.auth.getSession()` directly in `SocketService` to get it, bypassing `AuthService` entirely. Not ideal but worked.

### The whole project went offline

At some point I noticed every Supabase call was failing with `Failed to fetch`. Turned out the Supabase project (`ozgvczufhxhctexfexpr.supabase.co`) doesn't exist anymore — DNS returns NXDOMAIN. Completely blocked from testing the full auth flow. The worst part is it was completely silent in the app — Supabase uses native fetch not Angular HttpClient so our error interceptor didn't catch it at all, just logged to console. Took a while to figure out what was going wrong.

### Register form showing nothing on error

`Register` component had `OnPush` change detection but stored the error message as a plain class property. When Supabase returned an error (like email rate limit), the property was set but the component never re-rendered. Even worse — the property wasn't even in the template. So errors just disappeared silently. Fixed it by converting to `signal()` and adding the error display to the html. Also added a success message because Supabase requires email confirmation and the old code just redirected to home without saying anything which was confusing.

## What I learned

- `onAuthStateChange` is the right way to track sessions in Supabase — it handles all the edge cases I would've missed if I wrote it myself (token refresh timing, OAuth hash parsing)
- `canActivate` guard calls `getUser()` on every navigation not just on startup — important for expired tokens
- Supabase errors being invisible to Angular's HttpClient is a real gotcha, you need separate error handling for it

**Time spent:** ~3 hours (reading + debugging)
