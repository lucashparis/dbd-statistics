# DBD Killer Tracker

A personal Dead by Daylight killer statistics tracker. Track your wins and losses per killer, visualize your performance with charts, and search through the full roster.

## Stack

- **Next.js 15** — App Router, Server Components
- **TypeScript** — strict mode
- **Prisma ORM** — PostgreSQL
- **Tailwind CSS v4** — utility-first styling
- **Recharts** — interactive pie charts
- **Atomic Design** — component hierarchy

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbd_statistics"
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up the database

Push the schema to your database and generate the Prisma client:

```bash
npm run db:generate
npm run db:push
```

### 5. Seed killers

Populate the database with all 42 Dead by Daylight killers:

```bash
npm run db:seed
```

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed all killers |
| `npm run db:studio` | Open Prisma Studio |

## Features

### Killers Tab
- Search autocomplete with killer portrait + name
- Grid of all killers (responsive: 2 cols mobile → 5+ cols desktop)
- Per-card: wins, losses, total matches, win rate with progress bar
- One-click win/loss registration with optimistic feedback

### Statistics Tab
- Global overview: total wins, losses, matches, win rate
- Pie chart: top killers by matches played (or wins vs losses for a specific killer)
- Filter by killer for detailed individual stats

## Updating Killer Images

The seed uses Dead by Daylight Wiki images from Fandom. If any image is broken, you can update it in `prisma/seed.ts` and re-run `npm run db:seed`, or update directly in Prisma Studio:

```bash
npm run db:studio
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/killers/        # REST endpoints
│   └── page.tsx            # Root page (Server Component)
├── components/
│   ├── atoms/              # Primitive UI elements
│   ├── molecules/          # Composed atoms
│   ├── organisms/          # Complex sections
│   └── templates/          # Layout wrappers
├── hooks/                  # useKillers, useAutocomplete
├── lib/                    # prisma.ts, utils.ts
└── types/                  # killer.ts type definitions
prisma/
├── schema.prisma           # DB schema
└── seed.ts                 # Killer data seed
```
