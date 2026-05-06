# DBD Statistics — CLAUDE.md

## Project overview

Dead by Daylight killer statistics tracker. Users register wins and losses per killer and visualize global stats through a pie chart. Built as a personal project with a dark horror theme.

**Stack:** Next.js 15 (App Router) · TypeScript 5 (strict) · PostgreSQL + Prisma 5 · Tailwind CSS v4 · Radix UI · Recharts

---

## Architecture

### Server / Client split

- `src/app/page.tsx` — Server Component. Fetches initial data from Prisma directly, passes it as props.
- `src/app/page.client.tsx` — Client Component. Owns all interactive state and re-fetches via the REST API.
- API routes live under `src/app/api/killers/` and are the only way the client mutates data.

### Component architecture (Atomic Design)

```
atoms/       — primitive, stateless UI (Button, Badge, ProgressBar, Spinner…)
molecules/   — composed atoms with local logic (WinRateBadge, StatItem, TabNav…)
organisms/   — feature-level sections (KillerCard, KillerGrid, KillerAutocomplete…)
templates/   — layout wrappers (AppShell, KillersTabTemplate, StatisticsTabTemplate)
```

Always place new components at the lowest level of abstraction that fits. Do not create a new organism when an atom or molecule is enough.

### Hooks

- `useKillers` — killer list state, win/loss mutations with optimistic updates, re-fetches after each action.
- `useAutocomplete` — search autocomplete with keyboard nav (↑↓ Enter Escape) and click-outside dismissal.

### Utilities (`src/lib/`)

- `prisma.ts` — Prisma client singleton (do not instantiate elsewhere).
- `utils.ts` — `cn()` (clsx + tailwind-merge), `computeStats()`, `formatPercent()`.

---

## Database

Single model:

```prisma
model Killer {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  imageUrl  String
  wins      Int      @default(0)
  losses    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Seeded with 42 killers.** Run `npm run db:seed` to repopulate. Images come from `static.wikia.nocookie.net` and `dbdinfo.com` — both are allowlisted in `next.config.ts`.

### Useful DB scripts

```bash
npm run db:push      # push schema changes (no migration files)
npm run db:seed      # seed / re-seed killers
npm run db:studio    # open Prisma Studio
npm run db:generate  # regenerate Prisma client after schema changes
```

---

## API routes

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/killers` | Return all killers |
| PATCH | `/api/killers/[id]/win` | Increment wins by 1 |
| PATCH | `/api/killers/[id]/loss` | Increment losses by 1 |

All routes use the Prisma singleton from `src/lib/prisma.ts`. Keep API handlers thin — no business logic beyond the DB call.

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

## TypeScript types (`src/types/killer.ts`)

- `Killer` — mirrors the Prisma model.
- `KillerStats` — computed metrics (winRate, totalGames, etc.).
- `KillerUpdateAction` — `'win' | 'loss'`.

---

## Development

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # prisma generate + next build
npm run lint     # ESLint check
```

Environment variable required:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbd_statistics"
```

---

## Testing

**Every new implementation must ship with tests.** Do not deliver a feature, hook, utility, component, or API route without a corresponding test file.

### Stack

- **Vitest** — test runner (`npm run test`)
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
| `hooks/` | State transitions, optimistic updates, error paths |
| `lib/utils` | Pure function input/output, edge cases |
| `api/` routes | HTTP method responses, success and error status codes |

### Rules

- Test the **public contract** (rendered output, return values, HTTP responses), not implementation details.
- Mock external dependencies at the boundary: Prisma in API tests, `fetch` in hook tests.
- Cover the happy path and at least one error/edge case per unit.
- Do not test Prisma schema or CSS — those are not logic.

---

## Language

All user-facing text must be in **English** — labels, headings, descriptions, empty states, button text, and any other copy visible to the user. Do not use Portuguese or any other language in the UI. Date/time formatting may use `pt-BR` locale.

---

## Key conventions

- **Tests are mandatory** — every new feature, hook, utility, component, or API route must ship with a co-located `.test.ts` / `.test.tsx` file. See the Testing section for details.
- **No comments** unless the WHY is non-obvious. Well-named identifiers are enough.
- **Guard clauses over else** — return or throw early to handle error/edge cases first; never nest the happy path inside an `else` block. This keeps code flat and close to the left margin.
- **Server Components** for initial data fetching; keep the client boundary (`'use client'`) as low as possible.
- **Optimistic updates** in `useKillers` — update local state immediately, then sync on success/failure.
- **Path alias** `@/*` maps to `src/*` — always use it for imports.
- **Do not** instantiate a new PrismaClient — use the singleton in `src/lib/prisma.ts`.
- **Do not** add Tailwind config files — all customization goes in `globals.css`.
- **Do not** use raw color values in components — use the CSS variable tokens.
- Keep API route handlers thin; business logic belongs in hooks or utility functions.
