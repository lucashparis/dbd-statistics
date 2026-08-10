# DBD Statistics — CLAUDE.md

## Project overview

Dead by Daylight killer statistics tracker. Authenticated users register wins and losses per killer, manage rosters of players and teams, track win streaks, browse their match history, and visualize their stats through a pie chart. Built as a personal project with a dark horror theme. It also has a lightweight **community** layer: users can publish a profile (nick, main killer, channel link) to be discovered on a public home carousel and visited from a logged-in Community tab.

**All match/roster data is per-user** and lives behind authentication. The **only** publicly exposed data is the opt-in community projection: a user becomes discoverable **only** by creating a `Profile` row, and only whitelisted fields (nick, name, channel link, main killer, aggregate stats) are ever served publicly — **never** `email`/`password`. See `src/lib/community.ts` for the single public read path.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · PostgreSQL + Prisma 5 · NextAuth v5 (credentials) · Zod 4 · TanStack Query v5 · Tailwind CSS v4 · Radix UI · Recharts · Vitest

---

## Architecture

### Authentication (NextAuth v5)

- `src/auth.config.ts` — edge-safe config (pages, `session` callback that copies `token.sub` → `session.user.id`). **No Prisma/bcrypt here** — must stay edge-compatible.
- `src/auth.ts` — full config for the Node runtime. Credentials provider + `bcryptjs`. Exports `auth`, `signIn`, `signOut`.
- `src/proxy.ts` — Next 16 "proxy" (formerly `middleware`). Redirects unauthenticated requests for `/dashboard` → `/login`, and rate-limits write requests (non-GET) to `/api` via `enforceRateLimit` (keyed by user id, or client IP when unauthenticated). Matcher covers `/dashboard/*` and `/api/*`.
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
organisms/   — feature-level sections (KillerCard, KillerGrid, EntityAutocomplete…)
templates/   — layout wrappers (AppShell, KillersTabTemplate, StatisticsTabTemplate)
```

Always place new components at the lowest level of abstraction that fits. Do not create a new organism when an atom or molecule is enough.

### Hooks (`src/hooks/`)

All server-state hooks are built on **TanStack Query v5** (`@tanstack/react-query`). The `QueryClientProvider` is mounted in `src/components/Providers.tsx` (nested inside `SessionProvider`); query keys and the shared `invalidateMatchDerived` helper live in `src/lib/query-keys.ts`. Each hook wraps `useQuery`/`useInfiniteQuery`/`useMutation` internally but **preserves its previous public return shape**, so consuming components are unchanged.

- `useKillers` — killer list (`useQuery`, seeded with `initialData` from the server render); win/loss/undo are **optimistic mutations with rollback** (`onMutate` snapshots + patches the cache, `onError` restores it, `onSettled` calls `invalidateMatchDerived`). Exposes `loadingWin`/`loadingLoss`/… derived from each mutation's `isPending` + `variables`.
- `useHistory` — paginated match history via `useInfiniteQuery` (`enabled: isActive`); `matches` is the flattened pages, `loadMore` = `fetchNextPage`, `retry` = `refetch`, `error` from `isError`.
- `useStreaks` — global + per-killer streaks via `useQuery`; degrades to an empty state on error. **No longer takes a signal** — freshness comes from `invalidateMatchDerived` on any `Match` write.
- `usePlayers` / `useTeams` / `useTeamStreaks` — roster and team-streak state (`useQuery` gated by `enabled: isActive` + mutations that update the cache; team-streak writes also call `invalidateMatchDerived`).
- `useProfile` — the current user's community profile (`useQuery` on `['profile']`) + `save`/`remove` mutations (PUT/DELETE `/api/profile`); on success updates the `['profile']` cache and invalidates `['community']`.
- `useCommunity` — paginated public profile list via `useInfiniteQuery` (`enabled: isActive`), same shape as `useHistory` (`profiles`, `hasMore`, `loadMore`, `retry`).
- `useCrews` — collaborative crews (`useQuery` on `['crews']`) + mutations `createCrew`/`deleteCrew`/`logMatch`/`deleteMatch`/`setPolicy`/`removeMember`; the log/delete mutations upsert the `['crews']` cache and call `invalidateMatchDerived` (a crew match feeds every member's stats).
- `useInvites` — the current user's pending invites, **always mounted** in `AppHeader` via `InviteBell` (`refetchOnWindowFocus` — no realtime; a reload/focus surfaces new invites). `accept`/`decline` update `['invites']` and invalidate `['crews']`.
- `useInviteeSearch` — debounced-by-input search over invitable public profiles (`['invitees', q]`, enabled at ≥2 chars).
- `useAutocomplete<T extends AutocompleteItem>` — generic search autocomplete with keyboard nav (↑↓ Enter Escape) and click-outside dismissal. Pure client state — not a server-state hook. Works with any `{ id, name, imageUrl }` item; rendered by the generic `EntityAutocomplete` organism (used for both killers and survivors).

**Cache invalidation:** any `Match`-writing mutation (killer win/loss/undo, crew/team-streak log/delete) calls `invalidateMatchDerived(queryClient)` → invalidates `killers` + `history` + `streaks` + `community` + `rank` + `crews` by **first-segment prefix**, which busts every perspective *and* season variant at once. Roster mutations update their own list cache via `setQueryData`.

**Testing hooks:** wrap `renderHook` with `createQueryWrapper()` from `src/test/queryWrapper.tsx` (fresh client per test, retries off, `staleTime: Infinity` so `initialData` queries don't auto-refetch).

### Utilities (`src/lib/`)

- `prisma.ts` — Prisma client singleton (do not instantiate elsewhere).
- `utils.ts` — `cn()` (clsx + tailwind-merge), `computeStats()`, `formatPercent()`.
- `killers.ts` — `getKillersForUser()` / `getKillerForUser()`. **Derive** wins/losses from `Match` (`groupBy`/`count`) and serialize to the `Killer` shape. This is the single source of truth for win/loss counts.
- `api.ts` — route helpers: `parseId` / `parsePage` (Zod coercion at the boundary) and `mutationError` (maps Prisma `P2003`/`P2025` → `404`, everything else → `console.error` + `500`).
- `rate-limit.ts` — `enforceRateLimit(identifier)` (Upstash sliding window, 20/10s). **Fails open** when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are unset (dev/CI/local pass through). Used by `proxy.ts`.
- `security-headers.ts` — `securityHeaders()` / `contentSecurityPolicy(isDev)`. Consumed by `next.config.ts` `headers()`.
- `streak.ts` / `teams.ts` — streak computation and legacy team helpers. `decideStreakAction`/`recomputeStreakRuns` are pure and reused by the crew routes.
- `crews.ts` — collaborative crew domain: `getCrewsForUser`/`getCrewDetail`/`getInvitesForUser` (whitelisted projections, never `email`), `resolveInvitees` (public-profile check), and the pure `isCrewReady`/`canWrite` write gate.
- `seasons.ts` — the season domain (pure, no I/O): boundaries, current id, listing, `seasonWhere` Prisma fragment, `seasonKey` cache fragment, and `resolvePreferredSeason`/`toPreference` for the stored intent. See the Seasons ADR.
- `flags.ts` — `crewsEnabled` (reads `NEXT_PUBLIC_CREWS_ENABLED`; default on), `killerModeEnabled`, `seasonsEnabled` (`NEXT_PUBLIC_SEASONS_ENABLED`; default on — off makes every read resolve to all time and hides the selector).
- `auth-credentials.ts` / `auth-helpers.ts` — credential validation and auth utilities.

---

## Database

Multi-user schema. Full model in `prisma/schema.prisma`:

- `User` — account (email unique, bcrypt `password`). Owns players, teams, matches, streaks. `preferredMode` holds the play perspective; `preferredSeason` holds the **season intent** (`"current" | "all" | "<n>"`, default `"current"`) — storing the intent instead of an id means a preference saved in one season opens the *new* current season after a rollover instead of pinning a finished one.
- `Killer` — the roster. **No `wins`/`losses` columns** — counts are derived from `Match`.
- `Survivor` — the survivor roster (reference table, `name` unique + `imageUrl`). Mirrors `Killer` but is **not** tied to `Match`. Seeded from the DBD wiki; referenced by `Profile.mainSurvId` (surfaced in the profile form as "Main survivor").
- `Player` — a named player/nick owned by a user (`@@unique([userId, nick])`). **Legacy** (single-user teams) — see the crew note below.
- `Team` — a user's team (`@@unique([userId, name])`); has members via `TeamPlayer`. **Legacy.**
- `TeamPlayer` — join table (composite id `[teamId, playerId]`). **Legacy.**
- `Match` — one recorded game: `killerId`, `result` (`win | loss`), optional `userId`, `teamId`, `streakRunId`, `crewMatchId`. **The source of truth for all per-user win/loss/streak stats.**
- `StreakRun` — a legacy single-user team's win streak (`winCount`, `status` = `active | ended`).
- `Crew` — a **collaborative** team of real users sharing one streak (`ownerId`, `writePolicy` = `hostOnly | allMembers`, `@@unique([ownerId, name])`). Replaces the legacy `Player`/`Team` flow on the front.
- `CrewMember` — membership + invite (`status` = `pending | accepted | declined`, `isOwner`, `@@unique([crewId, userId])`). The owner is auto-`accepted`; up to 3 others are invited by community nick. A crew is **ready** only when every member is `accepted`.
- `CrewMatch` — the shared match event (`crewId`, `killerId`, `result`, `loggedByUserId`, `crewStreakRunId`). **The source of truth for the shared crew streak** (counted once per event).
- `CrewStreakRun` — a crew's win streak (`winCount`, `status`), same semantics as `StreakRun` but keyed by `crewId`.
- `Ban` — one moderation event. A user is **on the ban list** while a row with `liftedAt = null` exists; lifting stamps `liftedAt`/`liftedById` instead of deleting, so the history survives. `User.isAdmin` gates the admin surfaces and is set from the DB only (`npm run admin:set -- --email=…`) — no route can promote an account.
- `Profile` — a user's **public** community profile (1:1 with `User`, `userId @unique`). Fields: `nick`, `channelUrl?`, `mainKillerId?` (FK → `Killer`, `onDelete: SetNull`). **The presence of the row is the consent signal** — a user with no `Profile` is invisible to the community. `name` is not duplicated here; it lives on `User.name` and is edited in the same profile form. `mainSurvId?` (FK → `Survivor`, `onDelete: SetNull`) is edited in the same profile form ("Main survivor") and persisted by `PUT /api/profile`. `mainSurv` **is** part of the public community projection (`src/lib/community.ts`) — only the survivor **name** is surfaced (as a "Surv · {name}" line on the public profile and the community/carousel card); the avatar stays the main killer's image.

> **ADR (resolves audit M17): `Match` is the single source of truth.** `Killer` deliberately has **no** denormalized `wins`/`losses`. Any aggregate (grid, pie chart, history, streaks) must derive from `Match` via `getKillersForUser`/`getKillerForUser` in `src/lib/killers.ts`. Do **not** re-introduce counter columns — that reopens the drift bug this design eliminated.

> **ADR (collaborative crews — fan-out).** A crew match is logged **once** as a `CrewMatch` (the source of truth for the shared streak) and **fanned out** to one personal `Match` per accepted member (`crewMatchId` set) so it also feeds each member's killer grid/rank/community stats. Compute the shared streak from `CrewMatch`/`CrewStreakRun` **only** — never from the `Match` projections (they count N× per event). Deleting a `CrewMatch` cascade-deletes its projections (`Match.crewMatch onDelete: Cascade`) and recomputes the crew runs. A crew write (log/delete) must `revalidateTag("streaks:" + memberId, "max")` for **every** accepted member (not just the logger) plus `revalidateTag("community", "max")`. **Who may log/delete** is the single `Crew.writePolicy` gate via `canWrite()` in `src/lib/crews.ts` (owner always; other members only when `allMembers`), and only once the crew is ready. Legacy `Player`/`Team`/`TeamPlayer`/`StreakRun` rows are retained in the DB but no longer surfaced on the front (toggle via `NEXT_PUBLIC_CREWS_ENABLED`).

> **ADR (Seasons — derived from `createdAt`).** A **season** is a 3-month window over `Match.createdAt` / `CrewMatch.createdAt`, anchored at **2026-07-15 00:00 America/São_Paulo** (`2026-07-15T03:00:00Z`). Every boundary lands on the 15th at midnight Brasília time; the offset is a fixed `−03:00` (Brazil dropped DST in 2019 and the anchor is 2026), so the arithmetic is exact **without a date library**. Season 1 is `[anchor, anchor+3mo)`, Season N is `[anchor+3(N−1)mo, anchor+3N mo)`, and **Season 0** is everything before the anchor (open-ended past). Intervals are semi-open `[start, end)` so a match is never counted twice. **There is no `Season` table and no `seasonId` column** — that would reopen the drift bug the `Match`-as-source-of-truth ADR eliminated. All of it lives in `src/lib/seasons.ts` (pure, no I/O): `currentSeasonId`, `seasonBoundaries`, `listSeasons`, `seasonKey`, `seasonWhere` (the Prisma `where` fragment every scoped read composes), `resolvePreferredSeason`/`toPreference`. `"all"` (All time) yields an **empty** `where` fragment, so the all-time path is byte-for-byte the pre-seasons behaviour. Selection is a client `SeasonContext` (`src/contexts/SeasonContext.tsx`) seeded from `User.preferredSeason` and persisted via `PATCH /api/me/preferences`; the `SeasonSelect` dropdown sits in `AppHeader` (via `headerExtra`) next to `ModeToggle`, gated by the `seasonsEnabled` flag. **Client query keys include the season** (`queryKeys.killers(perspective, season)` etc.) so windows never collide; `invalidateMatchDerived` invalidates by first-segment prefix so it busts every perspective **and** season. **Writes are blocked outside the current season** (`readOnlySeason` in `src/lib/api.ts` → `409`, plus disabled UI): a match is always stamped `now()`, so crediting a past window would desync the optimistic patch. `All time` **is** writable (a `+1` there is correct).

> **ADR (Seasons × crews — displayed streak is derived).** Inside a season window a crew's `currentStreak`/`bestStreak` are **recomputed** from the `CrewMatch` rows in that window (`runsForWindow` → `recomputeStreakRuns` in `src/lib/streak.ts`); for `All time` the **persisted** `CrewStreakRun` counters are used unchanged. Consequence: a run that opened before a rollover shows a **partial** count in the seasonal view and its full count in All time — the displayed number may legitimately differ from `CrewStreakRun.winCount`, which remains the source of truth for the **write path**. A calendar rollover **never** closes an active run. ⚠️ `crewInclude.matches` is ordered `createdAt: "desc"` while `recomputeStreakRuns` walks **chronologically** — `runsForWindow` reverses the list, and `src/lib/crews.test.ts` has a dedicated anti-inversion test because getting this wrong produces plausible but wrong streaks. Legacy `getTeamStreaks`/`getTeamStreak` follow the same rule.

> **Note:** `Match.userId` is currently optional (`String?`), a migration artifact. All queries filter by `userId`, so a null-`userId` match is invisible (orphaned). Prefer setting `userId` on every write.

> **ADR (Killer mode — `Match.perspective`).** A `Match` carries a `perspective` (`survivor | killer`, `@default(survivor)`) recording whether the game was played **as survivor** (against a killer — the original app) or **as killer** (playing that killer). This keeps `Match` the single source of truth: every match-derived read (killers grid, history, streaks, community, rank) filters by `perspective`, and the survivor and killer datasets never contaminate each other. **Every derivation helper defaults `perspective` to `"survivor"`** (`getKillersForUser`, `getKillerForUser`, `statsByUser`, `computePublicProfiles`, `computePublicProfile`, `computeRankBase`, `getRankedProfiles`), matching the column default so pre-existing rows and any un-updated caller stay survivor-scoped. **Streaks and crews/teams are survivor-only** — killer matches always have `teamId=null`/`crewMatchId=null`/`streakRunId=null`, and `computeStreaksForUser` filters `perspective: "survivor"`. Killer write routes call `revalidateTag("community")` **but not** `streaks:<id>` (no killer streak). The current UI mode is a client `ModeContext` (`src/contexts/ModeContext.tsx`) seeded from `User.preferredMode` and persisted via `PATCH /api/me/preferences`; the toggle lives in `AppHeader` (via the `headerExtra` slot) and is gated by the `killerModeEnabled` flag. **Client query keys include the perspective** (`queryKeys.killers(p)` etc.) so the two modes' caches don't collide; `invalidateMatchDerived` invalidates by first-segment prefix so it busts both. Killer mode hides the Streak/Team tabs (`AppShell` derives its tab list from `mode`; `page.client` derives an `effectiveTab` rather than resetting state in an effect). Public surfaces (home carousel + `/community/[userId]`) show both perspectives with a client toggle — killer details carry `streaks: null`.

> **ADR (Ban list — a write gate, not a data filter).** A banned user's existing matches stay in `Match`: removing them would rewrite history and reopen the drift the `Match`-as-source-of-truth ADR closed. What a ban changes is **who may write**. `blockIfBanned(userId)` in `src/lib/ban.ts` is the single gate, called after auth/validation in every match-writing or crew-hosting route: the four `killers/[id]/{win,loss}[/undo]` writes, `POST /api/crews` (a banned user cannot be a **host**), `PATCH`/`DELETE /api/crews/[id]`, `POST`/`DELETE` on the crew match routes, `DELETE /api/crews/[id]/members/[userId]`, and the legacy `streaks/matches` writes. It answers `403 { code: "BANNED", error, description }`. **Accepting an invite and being a crew member stay allowed** — that is the one path by which a banned player's stats still move, because a `CrewMatch` logged by a teammate fans out to every accepted member. `canWrite()` takes a `viewerBanned` flag so the crew UI reflects the gate (a banned owner cannot log for their own crew, but the other members still can when the policy is `allMembers`). Client side, `throwIfBanned(res)` (`src/lib/ban-message.ts`, no server imports) turns the coded 403 into a `BannedError`, and `notifyBanned`/`notifyMutationError` (`src/lib/ban-toast.ts`) raise the warning toast. `useKillers`/`useCrews` take a `banned` flag and short-circuit **before** `onMutate` so no optimistic `+1` flashes. The flag is read per request in `dashboard/page.tsx` (`force-dynamic`), so a ban takes hold without a new sign-in. **Copy is Portuguese by product decision** — `BAN_TITLE = "Usuário em Ban List"`, `BAN_DESCRIPTION = "Comportamento suspeito/indequado"` — the only exception to the English-UI rule, pinned by a test.

**Seeded with 43 killers and 46 survivors.** Run `npm run db:seed` to repopulate. The seed upserts by `name` and only sets `name`/`imageUrl`. **The killer array is mirrored from the production DB** (personalized names + local `/public/images/killers/*.webp`), so re-seeding is idempotent against the real data — do **not** "normalize" the killer names to English or point them back at wiki URLs (that reopens the incident where a seed run renamed killers and created duplicate rows). Survivor images come from `static.wikia.nocookie.net`. Remote hosts are allowlisted in `next.config.ts`.

### Useful DB scripts

```bash
npm run db:push      # push schema changes (no migration files)
npm run db:seed      # seed / re-seed killers
npm run db:studio    # open Prisma Studio
npm run db:generate  # regenerate Prisma client after schema changes

npm run admin:set -- --email=you@example.com          # grant admin (add --revoke to remove)
npm run matches:purge -- --nick=<nick> --result=win --limit=20   # dry run; add --apply to delete
```

---

## API routes

Every route below (except NextAuth's own handler and `signup`) requires a session and returns `401` without one. Data is scoped to `session.user.id`.

> **Perspective-aware routes.** The match-derived reads/writes accept a `?perspective=survivor|killer` query param (parsed via `parsePerspective` in `src/lib/api.ts`, defaulting to `survivor` and coercing invalid values rather than 400ing): `GET /api/killers`, the four `killers/[id]/{win,loss}[/undo]` writes, `GET /api/history`, `GET /api/community/profiles`, `GET /api/rank`. See the Killer-mode ADR in the Database section.

> **Season-aware routes.** The same reads plus `GET /api/stats/streaks`, `GET /api/streaks`, `GET /api/crews`, `GET /api/crews/[id]` accept `?season=<n>|all` (parsed via `parseSeason` in `src/lib/api.ts` — **coerces** a missing/bogus value to the current season and clamps a future one, never 400s). The **write** routes (`killers/[id]/{win,loss}[/undo]`, `POST /api/crews/[id]/matches`, `DELETE /api/crews/[id]/matches/[cmId]`) read it only to gate with `readOnlySeason` → `409 { error: "Past seasons are read-only" }` and to project their response through the selected window. See the Seasons ADRs in the Database section.

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/killers` | List killers with the user's derived win/loss counts (accepts `?perspective=survivor\|killer`, default survivor) |
| GET | `/api/survivors` | List survivors (`id`/`name`/`imageUrl`, ordered by name) — options for the profile form |
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
| GET / PUT / DELETE | `/api/profile` | Read / upsert / remove the current user's community profile (`PUT` validates `channelUrl` as https, checks the main killer **and main survivor** exist, updates `User.name` + upserts `Profile` in a `$transaction`, then `revalidateTag("community"/"profile:<id>", "max")`) |
| GET | `/api/community/profiles` | Paginated list of public profile summaries (Community tab) |
| GET / POST | `/api/crews` | List crews the user is an accepted member of / create a crew (owner accepted, up to 3 invited) |
| GET / PATCH / DELETE | `/api/crews/[id]` | Crew detail / update `writePolicy` (owner) / delete crew (owner) |
| POST | `/api/crews/[id]/matches` | Log a shared match — fan-out to one `Match` per accepted member (gated by `canWrite`) |
| DELETE | `/api/crews/[id]/matches/[cmId]` | Remove a crew match — cascade projections + recompute runs (gated by `canWrite`) |
| DELETE | `/api/crews/[id]/members/[userId]` | Owner removes a member (unblocks a crew stuck on a pending/declined invite) |
| GET | `/api/crews/invitees` | Search invitable public profiles by nick/name (`?q=`, ≥2 chars) |
| GET | `/api/invites` | Current user's pending crew invites (the avatar bell) |
| POST | `/api/invites/[id]/respond` | Accept or decline an invite (`{ action }`) |
| PATCH | `/api/me/preferences` | Persist the current user's play mode and/or season intent (`{ mode?: "survivor" \| "killer", season?: "current" \| "all" \| "<n>" }`; at least one field required) |
| GET / POST | `/api/admin/bans` | List the ban list (active + history) / add a user (admin only; non-admins get `404`) |
| DELETE | `/api/admin/bans/[id]` | Lift a ban — keeps the row as history (admin only) |
| GET | `/api/admin/users` | Search public profiles to ban (`?q=`, ≥2 chars; never selects `email`) |
| POST | `/api/signup` | Create an account (public) |
| GET / POST | `/api/auth/[...nextauth]` | NextAuth handlers |

**Public read path (no auth):** `src/lib/community.ts` — `getPublicProfiles({ limit })` (home carousel + community list) and `getPublicProfile(userId)` (public profile page). Both use `unstable_cache` (tags `community` / `profile:<id>`, `revalidate: 60`) and a **whitelisted Prisma `select`** (never `email`/`password`). The public home (`/`) and the gated `/community/[userId]` page call these lib functions directly server-side. Streak computation (`computeStreaksForUser` / `getStreaksForUser`) lives in `src/lib/streak.ts` and is shared by `/api/stats/streaks` and the public profile.

Keep API handlers thin — auth check → validate input (Zod via `parseId`/`parsePage`) → DB call (Prisma singleton) → `mutationError` in the catch. Business/derivation logic belongs in `src/lib/`.

**Caching:** `/api/stats/streaks` computes via `computeStreaksForUser` wrapped in `unstable_cache(fn, ["streaks", userId], { tags: ["streaks:" + userId], revalidate: 60 })`. Every route that mutates `Match` (win/loss + undos, streak match POST, streak match DELETE) must call `revalidateTag("streaks:" + userId, "max")` **and** `revalidateTag("community", "max")` (the public community/rank projections in `src/lib/community.ts` are `unstable_cache`d under the `community` tag and derive aggregate stats from `Match`). **Next 16 requires the 2nd arg** to `revalidateTag` — the 1-arg form breaks the build.

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
UPSTASH_REDIS_REST_URL="…"    # optional — rate limiting store (serverless). Unset = fail-open
UPSTASH_REDIS_REST_TOKEN="…"  # optional — pairs with the URL above
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
| `hooks/` | State transitions, optimistic update + rollback, error paths (wrap in `createQueryWrapper()`) |
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

> Exception (ban list): the moderation warning is Portuguese by explicit product decision — `BAN_TITLE`/`BAN_DESCRIPTION` in `src/lib/ban-message.ts`. Everything else in the ban/admin surface is English.

> Exception (supersedes audit B11): killer names are **user-owned roster data**, not translatable UI copy. The seed mirrors the production roster verbatim, which intentionally carries Portuguese and personalized names (e.g. "Caça Coroas", "BrenoGorgon", "Trapalisson (Trapaça)"). Do **not** normalize these to English — that would overwrite the user's real data. This rule applies to static UI copy, not to roster rows.

---

## Technical audit & prevention

This repo ships the **`technical-audit-next`** skill (`.claude/skills/technical-audit-next/SKILL.md`). It has two modes:

- **Prevention (always on):** every new implementation — API route, Server Action, hook, component, schema/config change — must satisfy the skill's *Baseline de Prevenção* **before** it's delivered. Those rules are the distilled failure classes already catalogued in [audit.md](audit.md); breaking one reopens a known bug. Write the code correct from the start — don't ship then patch. Only surface a rule inline (1 line) when a conscious trade-off prevents satisfying it.
- **Audit (on demand):** when asked to "audit / revisar o repo / find problems", run the skill's adversarial protocol and deliver the findings table (`ID | Gravidade | Categoria | Arquivo:linha | Problema | Impacto | Correção`) + executive summary + top-5 + quick wins.

Non-negotiable prevention checklist (see the skill for the full list):

- **API/Actions:** `await auth()` → `401` first; validate at the boundary with Zod (`parseId`/`parsePage`, body schema) → `400`; thin handler → `mutationError` in `catch` (never swallow, never empty `catch`, never return `200` on error).
- **Data:** `Match` stays the single source of truth (no `wins`/`losses` columns); set `userId` on every `Match`; related writes go in `$transaction`; every `Match` mutation calls `revalidateTag("streaks:" + userId, "max")` (**2 args** — 1 arg breaks the Next 16 build); never load a whole table per request.
- **Next.js:** keep `'use client'` low; no secret/server-only import in client bundles; no sensitive `NEXT_PUBLIC_*`; new dynamic routes get `loading.tsx` (skeleton) + `error.tsx`/`not-found.tsx`; no fetch waterfalls; no browser API on the server.
- **Client fetch:** server state goes through TanStack Query (`useQuery`/`useMutation`); `queryFn` checks `res.ok` and throws on failure so `isError`/`error` surface it. Killer win/loss/undo are optimistic with rollback; every `Match` write calls `invalidateMatchDerived`.
- **Security:** headers/CSP + rate limiting are baseline (`security-headers.ts`, `proxy.ts`) — just ensure new surfaces are covered; no `dangerouslySetInnerHTML` unsanitized; no raw SQL; secrets in `.env`/vault only.
- **Perf/a11y/style:** `next/image` optimized with `sizes` and never `src=""`; combobox follows APG ARIA; inputs labelled; `focus-visible` rings; charts `role="img"` + textual alt; `prefers-reduced-motion` guard; text contrast ≥ 4.5:1; color tokens (no raw hex); UI text in English.
- **Gate:** co-located tests are mandatory; `npm run test` · `npm run lint` · `npx tsc --noEmit` all green before delivery.

---

## Key conventions

- **Apply the `technical-audit-next` prevention baseline to every new implementation** — see the "Technical audit & prevention" section. New code must not reintroduce the catalogued failure classes (auth, Zod at the boundary, error handling, boundaries/cache, security, a11y, tests).
- **Tests are mandatory** — every new feature, hook, utility, component, or API route must ship with a co-located `.test.ts` / `.test.tsx` file. See the Testing section for details.
- **Document every user-facing feature in the changelog** — whenever you ship a new user-facing feature, add a `ChangelogEntry` to the `ENTRIES` array in `src/lib/changelog.ts` (unique `id`, `feature`, `date` in `YYYY-MM-DD`, English `description`, `requestedBy`). This is part of the feature's delivery, not a follow-up. Internal refactors, infra, and bug fixes that don't change what the user sees do not need an entry.
- **No comments** unless the WHY is non-obvious. Well-named identifiers are enough.
- **Guard clauses over else** — return or throw early to handle error/edge cases first; never nest the happy path inside an `else` block. This keeps code flat and close to the left margin.
- **Auth first in every data route** — `const session = await auth(); if (!session?.user) return 401;` then scope all queries by `session.user.id`.
- **`Match` is the source of truth** — never re-add `wins`/`losses` columns to `Killer`; derive via `src/lib/killers.ts`.
- **Server Components** for initial data fetching; keep the client boundary (`'use client'`) as low as possible.
- **Server state is TanStack Query** — no bespoke `useState`+`fetch`+`useEffect` data hooks. New server-state hooks use `useQuery`/`useInfiniteQuery`/`useMutation`, with keys + `invalidateMatchDerived` from `src/lib/query-keys.ts`. Killer win/loss/undo are **optimistic with rollback** (`onMutate`/`onError`/`onSettled`); keep docs and code in agreement.
- **Path alias** `@/*` maps to `src/*` — always use it for imports.
- **Do not** instantiate a new PrismaClient — use the singleton in `src/lib/prisma.ts`.
- **Do not** add Tailwind config files — all customization goes in `globals.css`.
- **Do not** use raw color values in components — use the CSS variable tokens.
- Keep API route handlers thin; validation via `src/lib/api.ts` helpers, derivation logic in `src/lib/`.
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`) — do not use `useCallback`, `useMemo`, or `memo` manually; the compiler handles all memoization automatically. Write plain functions and values.
- **React 19 ref callbacks** — prefer ref callbacks with cleanup return over `useEffect` + `useRef` for DOM side-effects (e.g., ResizeObserver, event listeners). Write as a plain function — no `useCallback` wrapper needed. Do not use `useEffect` for DOM measurements or subscriptions that can attach directly to an element.
