# Vejas-frontend

An application that allows users to connect on a platform to synchronize their shared viewing of online content.

**Live:** [https://zedmalatesta.github.io/Vejas-frontend/](https://zedmalatesta.github.io/Vejas-frontend/)

**Demo video:** [Watch demo](https://zedmalatesta.github.io/Vejas-frontend/assets/demo.mp4)

## Collaborators

- [@ZedMalatesta](https://github.com/ZedMalatesta)
- [@olucens](https://github.com/olucens)
- [@amelur](https://github.com/amelur)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.9.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Backend

The API/WebSocket backend (NestJS + Prisma/Postgres + Redis) lives in this repo under [`vejas-backend/`](vejas-backend) as a plain folder — not a submodule, no separate git history. The old `server/` folder (Supabase-based, in-memory rooms) was removed in favor of it.

`src/environments/environment.ts` points `apiUrl`/`socketUrl` at `http://localhost:3000` for local dev, matching the backend's default port.

## Running everything locally, one command

```bash
npm run start:local
```

This installs and dockerizes `vejas-backend/` (Postgres + Redis + the API, via its own `docker-compose.yml`), then runs `ng serve` for the frontend. Frontend at `http://localhost:4200`, backend at `http://localhost:3000`.

## Docker (frontend only)

This app also ships its own `Dockerfile` that builds the Angular app and serves it via nginx (with SPA fallback to `index.html`), independent of `start:local`:

```bash
docker build -t vejas-frontend .
docker run -p 4200:80 vejas-frontend
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
