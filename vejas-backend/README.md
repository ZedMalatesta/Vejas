# vejas-backend-v2

A production-ready NestJS application

## Quick Start

```bash
cp .env.example .env
npm install
npm run prisma:migrate
npm run start:dev
```

Health check: `GET /health`

## Add Auth

```bash
zimt auth
```

## Generate Endpoints

```bash
# From a name
zimt generate products

# From SQL
zimt generate create "CREATE TABLE orders (id SERIAL PRIMARY KEY, total DECIMAL NOT NULL)"
```

## Docker

```bash
npm run docker:build
```

This spins up Postgres + Redis + the app on their own via `docker-compose.yml` in this repo.

### Running together with the frontend

The sibling [`Vejas-frontend`](../Vejas-frontend) repo has its own `Dockerfile`. To run frontend + backend + Postgres + Redis together, use the root-level `docker-compose.yml` one directory up (in the parent `vejas/` folder):

```bash
cd ..
docker compose up --build
```

`CORS_ORIGIN` must include the frontend's origin (`http://localhost:4200` by default) for browser requests to succeed.
