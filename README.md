# DBD Killer Tracker

A personal Dead by Daylight statistics tracker. Sign in, log your wins and losses per killer, manage rosters of players and teams, chase team win streaks, browse your match history, and visualize your performance with charts. **All data is per-user and lives behind authentication.**

## Stack

- **Next.js 16** — App Router, Server Components, `proxy` (formerly middleware)
- **React 19** — with the React Compiler enabled
- **TypeScript** — strict mode
- **NextAuth v5** — credentials auth (email + password, bcrypt)
- **Prisma ORM** — PostgreSQL, multi-user schema
- **Zod** — input validation at API boundaries
- **TanStack Query v5** — client server-state (caching, invalidation, optimistic updates)
- **Tailwind CSS v4** — utility-first styling
- **Recharts** — interactive pie charts
- **Vitest** + Testing Library — unit/component/hook tests
- **Atomic Design** — component hierarchy

## Setup

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database

### 2. Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Pooled connection
DATABASE_URL="postgresql://user:password@localhost:5432/dbd_statistics"
# Direct (non-pooled) connection — used by Prisma migrate / db push
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/dbd_statistics"
# NextAuth secret — generate with: npx auth secret
AUTH_SECRET="…"
# Password for the default seeded account
SEED_DEFAULT_PASSWORD="…"
# Rate limiting (Upstash Redis REST) — optional; required for real rate
# limiting on serverless. Unset = rate limiting disabled (fail-open).
UPSTASH_REDIS_REST_URL="…"
UPSTASH_REDIS_REST_TOKEN="…"
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up the database

```bash
npm run db:generate
npm run db:push
```

### 5. Seed killers

Populate the database with the Dead by Daylight killer roster:

```bash
npm run db:seed
```

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then sign up / log in.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (`eslint .`) |
| `npm run test` | Run the Vitest suite |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed killers |
| `npm run db:studio` | Open Prisma Studio |

Run `npx tsc --noEmit` for a typecheck (part of the CI gate).

## Features

### Authentication
- Email + password sign-up and login (NextAuth v5, bcrypt hashing)
- `/dashboard` is protected; unauthenticated visitors are redirected to `/login`
- All data is scoped to the signed-in user

### Killers
- Search autocomplete with killer portrait + name
- Grid of all killers (responsive: 2 cols mobile → 5+ cols desktop)
- Per-card: wins, losses, total matches, win rate with progress bar
- One-click win/loss registration, with undo — each action records or removes a `Match`

### Statistics
- Global overview: total wins, losses, matches, win rate
- Pie chart: top killers by matches played (or wins vs losses for a specific killer)
- Longest win/loss streaks (global and per-killer), server-cached
- Filter by killer for detailed individual stats

### Players & Teams
- Manage a roster of players (name + nick)
- Build teams from players and track team win streaks

### History
- Paginated log of every recorded match

## Data model

Win/loss counts are **not** stored as columns. Each recorded game is a `Match` row, and all aggregates (grid, pie chart, streaks, history) are **derived** from `Match` — a single source of truth. Core models: `User`, `Killer`, `Player`, `Team`, `TeamPlayer`, `Match`, `StreakRun`. See `prisma/schema.prisma`.

## Updating Killer Images

The seed uses Dead by Daylight Wiki images (Fandom) plus a few local files under `public/images/killers/`. To fix a broken image, edit `prisma/seed.ts` and re-run `npm run db:seed`, or update directly in Prisma Studio (`npm run db:studio`).

## Project Structure

```
src/
├── app/
│   ├── api/                # REST endpoints (killers, players, teams, streaks, history, stats, signup, auth)
│   ├── login/ signup/      # public auth pages
│   ├── dashboard/          # protected app (page.tsx server + page.client.tsx)
│   └── page.tsx            # landing page
├── auth.ts                 # NextAuth (Node runtime: Prisma + bcrypt)
├── auth.config.ts          # edge-safe NextAuth config
├── proxy.ts                # route protection (Next 16 proxy / middleware)
├── components/
│   ├── atoms/ molecules/ organisms/ templates/
├── hooks/                  # useKillers, useHistory, useStreaks, usePlayers, useTeams, useTeamStreaks, useAutocomplete
├── lib/                    # prisma, utils, killers, api, streak, teams, auth-*
└── types/                  # killer.ts, team.ts, next-auth.d.ts
prisma/
├── schema.prisma           # multi-user DB schema
└── seed.ts                 # killer roster seed
.github/workflows/ci.yml    # typecheck · lint · test · build
```

## CI

Every push/PR to `master` runs `.github/workflows/ci.yml`: install → `prisma generate` → typecheck → lint → test → build. Deploy is automatic on merge, so enable **branch protection** on `master` and mark the `verify` job as a **required status check**.
