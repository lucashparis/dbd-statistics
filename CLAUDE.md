# DBD Statistics — CLAUDE.md

## Project overview

Dead by Daylight killer statistics tracker. Authenticated users register wins and losses per killer, manage rosters of players and teams, track win streaks, browse their match history, and visualize their stats through a pie chart. Built as a personal project with a dark horror theme.

**All data is per-user** and lives behind authentication. There is no shared/global data.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · PostgreSQL + Prisma 5 · NextAuth v5 (credentials) · Zod 4 · Tailwind CSS v4 · Radix UI · Recharts · Vitest

---

## Architecture

### Authentication (NextAuth v5)

- `src/auth.config.ts` — edge-safe config (pages, `session` callback that copies `token.sub` → `session.user.id`). **No Prisma/bcrypt here** — must stay edge-compatible.
- `src/auth.ts` — full config for the Node runtime. Credentials provider + `bcryptjs`. Exports `auth`, `signIn`, `signOut`.
- `src/proxy.ts` — Next 16 "proxy" (formerly `middleware`). Redirects unauthenticated requests for `/dashboard` → `/login`. Matcher is scoped to `/dashboard/*`.
- **Every data API route** calls `const session = await auth()` and returns `401` when there is no session. Data is scoped by `session.user.id`.
- Pages: `/login`, `/signup` (public), `/dashboard` (protected). Root `/` is a landing page that redirects to `/dashboard` when already authenticated.
- Account creation: `POST /api/signup` (validates with Zod, hashes with bcrypt).

### Server / Client split

- `src/app/dashboard/page.tsx` — Server Component (`export const dynamic = "force-dynamic"`). Calls `auth()`, redirects if unauthenticated, fetches initial killers via `getKillersForUser(session.user.id)`, maps through `computeStats`, and passes them to the client.
- `src/app/dashboard/page.client.tsx` — Client Component. Owns interactive state and re-fetches via the REST API.
- API routes under `src/app/api/**` are the only way the client mutates data.

### Component architecture (Atomic Design)

```
atoms/       — primitive, stateless UI (Button, Badge, ProgressBar, Spinner…)
molecules/   — composed atoms with local logic (WinRateBadge, StatItem, TabNav…)
organisms/   — feature-level sections (KillerCard, KillerGrid, KillerAutocomplete…)
templates/   — layout wrappers (AppShell, KillersTabTemplate, StatisticsTabTemplate)
```

Always place new components at the lowest level of abstraction that fits. Do not create a new organism when an atom or molecule is enough.

### Hooks (`src/hooks/`)

- `useKillers` — killer list state; win/loss/undo mutations. **Server-confirmed (pessimistic) updates**: it awaits the API response and only then updates local state (not optimistic — see below).
- `useHistory` — paginated match history. Checks `res.ok`, exposes `error` + `retry`, resets `matches`/`hasMore` on error.
- `useStreaks` — global + per-killer streaks; re-fetches when the match count changes. Degrades to an empty state on error.
- `usePlayers` / `useTeams` / `useTeamStreaks` — roster and team-streak state.
- `useAutocomplete` — search autocomplete with keyboard nav (↑↓ Enter Escape) and click-outside dismissal.

### Utilities (`src/lib/`)

- `prisma.ts` — Prisma client singleton (do not instantiate elsewhere).
- `utils.ts` — `cn()` (clsx + tailwind-merge), `computeStats()`, `formatPercent()`.
- `killers.ts` — `getKillersForUser()` / `getKillerForUser()`. **Derive** wins/losses from `Match` (`groupBy`/`count`) and serialize to the `Killer` shape. This is the single source of truth for win/loss counts.
- `api.ts` — route helpers: `parseId` / `parsePage` (Zod coercion at the boundary) and `mutationError` (maps Prisma `P2003`/`P2025` → `404`, everything else → `console.error` + `500`).
- `streak.ts` / `teams.ts` — streak computation and team helpers.
- `auth-credentials.ts` / `auth-helpers.ts` — credential validation and auth utilities.

---

## Database

Multi-user schema. Full model in `prisma/schema.prisma`:

- `User` — account (email unique, bcrypt `password`). Owns players, teams, matches, streaks.
- `Killer` — the roster. **No `wins`/`losses` columns** — counts are derived from `Match`.
- `Player` — a named player/nick owned by a user (`@@unique([userId, nick])`).
- `Team` — a user's team (`@@unique([userId, name])`); has members via `TeamPlayer`.
- `TeamPlayer` — join table (composite id `[teamId, playerId]`).
- `Match` — one recorded game: `killerId`, `result` (`win | loss`), optional `userId`, `teamId`, `streakRunId`. **The source of truth for all win/loss/streak stats.**
- `StreakRun` — a team's win streak (`winCount`, `status` = `active | ended`).

> **ADR (resolves audit M17): `Match` is the single source of truth.** `Killer` deliberately has **no** denormalized `wins`/`losses`. Any aggregate (grid, pie chart, history, streaks) must derive from `Match` via `getKillersForUser`/`getKillerForUser` in `src/lib/killers.ts`. Do **not** re-introduce counter columns — that reopens the drift bug this design eliminated.

> **Note:** `Match.userId` is currently optional (`String?`), a migration artifact. All queries filter by `userId`, so a null-`userId` match is invisible (orphaned). Prefer setting `userId` on every write.

**Seeded with 44 killers.** Run `npm run db:seed` to repopulate. The seed upserts by `name` and only sets `name`/`imageUrl` (any `wins`/`losses` fields in the seed array are legacy and ignored). Most images come from `static.wikia.nocookie.net`; a few are local under `/public/images/killers/`. Remote hosts are allowlisted in `next.config.ts`.

### Useful DB scripts

```bash
npm run db:push      # push schema changes (no migration files)
npm run db:seed      # seed / re-seed killers
npm run db:studio    # open Prisma Studio
npm run db:generate  # regenerate Prisma client after schema changes
```

---

## API routes

Every route below (except NextAuth's own handler and `signup`) requires a session and returns `401` without one. Data is scoped to `session.user.id`.

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/killers` | List killers with the user's derived win/loss counts |
| PATCH | `/api/killers/[id]/win` | Record a win (create a `Match`) |
| PATCH | `/api/killers/[id]/loss` | Record a loss (create a `Match`) |
| PATCH | `/api/killers/[id]/win/undo` | Delete the user's last non-streak win `Match` |
| PATCH | `/api/killers/[id]/loss/undo` | Delete the user's last non-streak loss `Match` |
| GET | `/api/history` | Paginated match history (`?page=`, validated via `parsePage`) |
| GET | `/api/stats/streaks` | Global + per-killer streaks (server-cached via `unstable_cache`) |
| GET / POST | `/api/players` | List / create players |
| PATCH / DELETE | `/api/players/[id]` | Update / delete a player |
| GET / POST | `/api/teams` | List / create teams |
| PATCH / DELETE | `/api/teams/[id]` | Update / delete a team |
| GET | `/api/streaks` | List team streaks |
| POST | `/api/streaks/matches` | Add a match to a streak run |
| DELETE | `/api/streaks/matches/[id]` | Remove a streak match |
| POST | `/api/signup` | Create an account (public) |
| GET / POST | `/api/auth/[...nextauth]` | NextAuth handlers |

Keep API handlers thin — auth check → validate input (Zod via `parseId`/`parsePage`) → DB call (Prisma singleton) → `mutationError` in the catch. Business/derivation logic belongs in `src/lib/`.

**Caching:** `/api/stats/streaks` computes via `computeStreaksForUser` wrapped in `unstable_cache(fn, ["streaks", userId], { tags: ["streaks:" + userId], revalidate: 60 })`. Every route that mutates `Match` (win/loss + undos, streak match POST, streak match DELETE) must call `revalidateTag("streaks:" + userId, "max")`. **Next 16 requires the 2nd arg** to `revalidateTag` — the 1-arg form breaks the build.

---

## Styling

Tailwind CSS v4 — configuration lives entirely in `src/app/globals.css` (no `tailwind.config.*`).

**Custom CSS variables (theme tokens):**

| Token | Value | Use |
|-------|-------|-----|
| `--color-blood` | `#DC143C` | Primary accent (wins, highlights) |
| `--color-blood-dark` | `#a50e2c` | Hover state for blood accent |
| `--color-void` | `#0A0A0A` | Page background |
| `--color-surface` | `#1C1C1E` | Card background |
| `--color-surface-2` | `#242426` | Elevated surface |
| `--color-surface-3` | `#2c2c2e` | Further elevation |
| `--color-muted` | `#636366` | Disabled / secondary text |
| `--color-subtle` | `#3a3a3c` | Borders and dividers |

**Custom utility classes:** `card-dark`, `card-hover`, `scrollbar-dark` — defined in `globals.css`.

**Fonts:**
- Display headings → `Cinzel` (serif)
- Body → `Geist` (sans)
- Mono → `JetBrains Mono`

When adding styles: use the design tokens above, not raw hex values. Use `cn()` from `src/lib/utils.ts` when merging conditional classes.

---

## TypeScript types (`src/types/`)

- `killer.ts` — `Killer` (serialized shape; still carries `wins`/`losses` as **derived** numbers, not DB columns), `KillerStats` (`total`, `winRate`), `KillerUpdateAction` (`'win' | 'loss'`), `MatchResult`, `Match`, `HistoryPage`, `Streaks`, `StreaksData`.
- `team.ts` — `Player`, `TeamMember`, `Team`, `StreakMatch`, `TeamStreak`.
- `next-auth.d.ts` — module augmentation adding `id` to `session.user`.

---

## Development

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # prisma generate + next build
npm run lint     # eslint . (Next 16 removed `next lint`)
npm run test     # vitest run
npx tsc --noEmit # typecheck — part of the CI gate
```

### Environment variables

Copy `.env.example` → `.env`. Required:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbd_statistics"   # pooled connection
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/dbd_statistics"  # direct — Prisma migrate/db push (schema directUrl)
AUTH_SECRET="…"            # NextAuth secret — generate with: npx auth secret
SEED_DEFAULT_PASSWORD="…"  # password for the default seeded account
```

### CI

`.github/workflows/ci.yml` runs on push/PR to `master`: `npm ci` → `prisma generate` → `tsc --noEmit` → `lint` → `test` → `build` (Node 20, dummy env — never touches a real DB). The job id is `verify`. Deploy is automatic on merge, so `verify` must be a **required status check** with branch protection on `master`.

---

## Testing

**Every new implementation must ship with tests.** Do not deliver a feature, hook, utility, component, or API route without a corresponding test file.

### Stack

- **Vitest** — test runner (`npm run test`), `happy-dom` environment
- **@testing-library/react** — component and hook testing
- **@testing-library/user-event** — simulating user interactions
- **@testing-library/jest-dom** — DOM assertion matchers

### File placement

Co-locate test files next to the source file they cover:

```
src/lib/utils.ts              → src/lib/utils.test.ts
src/hooks/useKillers.ts       → src/hooks/useKillers.test.ts
src/components/atoms/Button.tsx → src/components/atoms/Button.test.tsx
src/app/api/killers/route.ts  → src/app/api/killers/route.test.ts
```

### What to test per layer

| Layer | Focus |
|-------|-------|
| `atoms/` | Renders correctly, applies props/variants, accessible markup |
| `molecules/` | Composed behavior, conditional rendering, props flow |
| `organisms/` | User interactions, state changes, calls to hooks/callbacks |
| `hooks/` | State transitions, server-confirmed updates, error paths |
| `lib/` | Pure function input/output, edge cases |
| `api/` routes | Auth (401), validation (400/404), success and error (500) status codes |

### Rules

- Test the **public contract** (rendered output, return values, HTTP responses), not implementation details.
- Mock external dependencies at the boundary: Prisma in API tests, `fetch` in hook tests, and `auth()` for protected routes.
- When mocking `auth()`, type it via `vi.mocked(auth as unknown as () => Promise<Session | null>)` to collapse the `NextMiddleware` overload (keeps `tsc --noEmit` green).
- `Match` fixtures must include `userId`/`teamId`/`streakRunId` to match the current schema.
- Cover the happy path and at least one error/edge case per unit.
- Do not test Prisma schema or CSS — those are not logic.

---

## Language

All user-facing text must be in **English** — labels, headings, descriptions, empty states, button text, and any other copy visible to the user. Do not use Portuguese or any other language in the UI. Date/time formatting may use `pt-BR` locale.

> Known exception pending cleanup (audit B11): a few killer names in `prisma/seed.ts` still carry Portuguese parentheticals (e.g. "Trapper (Caçador)"). Normalize to English when touched.

---

## Key conventions

- **Tests are mandatory** — every new feature, hook, utility, component, or API route must ship with a co-located `.test.ts` / `.test.tsx` file. See the Testing section for details.
- **No comments** unless the WHY is non-obvious. Well-named identifiers are enough.
- **Guard clauses over else** — return or throw early to handle error/edge cases first; never nest the happy path inside an `else` block. This keeps code flat and close to the left margin.
- **Auth first in every data route** — `const session = await auth(); if (!session?.user) return 401;` then scope all queries by `session.user.id`.
- **`Match` is the source of truth** — never re-add `wins`/`losses` columns to `Killer`; derive via `src/lib/killers.ts`.
- **Server Components** for initial data fetching; keep the client boundary (`'use client'`) as low as possible.
- **Data-fetching hooks are pessimistic** — `useKillers` awaits the server, then updates state (not optimistic). Keep docs and code in agreement.
- **Path alias** `@/*` maps to `src/*` — always use it for imports.
- **Do not** instantiate a new PrismaClient — use the singleton in `src/lib/prisma.ts`.
- **Do not** add Tailwind config files — all customization goes in `globals.css`.
- **Do not** use raw color values in components — use the CSS variable tokens.
- Keep API route handlers thin; validation via `src/lib/api.ts` helpers, derivation logic in `src/lib/`.
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`) — do not use `useCallback`, `useMemo`, or `memo` manually; the compiler handles all memoization automatically. Write plain functions and values.
- **React 19 ref callbacks** — prefer ref callbacks with cleanup return over `useEffect` + `useRef` for DOM side-effects (e.g., ResizeObserver, event listeners). Write as a plain function — no `useCallback` wrapper needed. Do not use `useEffect` for DOM measurements or subscriptions that can attach directly to an element.
