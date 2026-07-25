# #2 — Sistema de Temporadas (Seasons) sobre `Match.createdAt`

> **Visão geral.** Hoje todo número da aplicação é *all-time*: grid de killers, pizza, histórico,
> streaks, crews, community e rank derivam de `Match`/`CrewMatch` filtrados só por `userId` +
> `perspective`. Esta entrega introduz uma **terceira dimensão de filtro — a temporada** — derivada
> puramente de `createdAt` (sem backfill, sem coluna em `Match`): trimestres de 3 meses ancorados em
> **15/07/2026 00:00 (horário de Brasília)**, tudo antes disso agrupado como **Season 0**, e uma opção
> **All time** que reproduz exatamente o comportamento atual. O usuário troca de temporada num seletor
> no header (ao lado do toggle Surv/Killer), a escolha é lembrada no perfil, e toda leitura derivada de
> partidas respeita a janela selecionada.

**Objetivos**
- Toda leitura derivada de partidas aceita e aplica uma janela `[start, end)` de temporada — grid,
  estatísticas, streaks, histórico, **crews**, community e rank.
- Temporada corrente é o **default** de abertura; `All time` disponível e equivalente ao comportamento
  de hoje; a escolha do usuário é persistida por intenção (nunca "apodrece" na virada).
- Zero migração de dados de partidas: nenhuma linha de `Match`/`CrewMatch` é alterada.
- Rollback por flag (`NEXT_PUBLIC_SEASONS_ENABLED=false`) sem desfazer schema.

---

## Escopo

**Entra:**
- `src/lib/seasons.ts` — domínio puro (limites, id corrente, listagem, fragmento `where` do Prisma,
  resolução da preferência salva).
- `parseSeason` em `src/lib/api.ts` (coerção na borda, no padrão de `parsePerspective`).
- Season-scoping das funções de derivação em `src/lib/killers.ts`, `src/lib/streak.ts`,
  `src/lib/community.ts` e `src/lib/crews.ts` — incluindo as **chaves de `unstable_cache`**.
- `?season=` em 7 rotas GET + 6 rotas de escrita (projeção de resposta, alvo do undo e gate read-only).
- **`User.preferredSeason`** + extensão de `PATCH /api/me/preferences`.
- `queryKeys` + 6 hooks TanStack (`useKillers`, `useHistory`, `useStreaks`, `useCommunity`, `useRank`,
  `useCrews`).
- `SeasonContext` + `SeasonSelect` no header; **gating read-only** do grid e do log de crew em
  temporadas passadas.
- Superfícies públicas: carrossel da home (**All time**) e `/community/[userId]` (via `searchParams`).
- Dois thresholds de rank: `RANK_MIN_MATCHES = 20` (all-time) e `SEASON_RANK_MIN_MATCHES = 10`.
- Índice composto `Match([userId, perspective, createdAt])`; flag; changelog; testes co-locados;
  atualização do `CLAUDE.md`.

**NÃO entra (ver Itens futuros):**
- Encerrar o `CrewStreakRun`/`StreakRun` ativo na virada de temporada. O run persistido **continua
  vivo**; apenas a *exibição* é recortada (D6).
- Tabela `Season` no banco, nomes editoriais ("Season of Blood"), recompensas, badges,
  snapshot/congelamento de rank ao fim da temporada.
- Mudança de qualquer regra de escrita: uma partida continua sendo gravada com `createdAt = now()`.
- Temporada na URL do dashboard logado (`/dashboard?season=1`) — a persistência é por perfil.

---

## Estado atual (ancorado no código)

| Fato verificado | Onde |
|---|---|
| `Match` é a única fonte de verdade; `Killer` não tem `wins`/`losses` | `prisma/schema.prisma:133-156`, ADR no `CLAUDE.md` |
| `Match` tem `createdAt @default(now())` e índice simples `@@index([createdAt])` | `prisma/schema.prisma:142`, `:153` |
| Índices atuais úteis: `[userId, perspective]`, `[killerId, perspective]` — **nenhum** com `createdAt` composto | `prisma/schema.prisma:154-155` |
| `User` já tem `preferredMode Perspective @default(survivor)` — precedente exato para `preferredSeason` | `prisma/schema.prisma:42` |
| Grid deriva de `groupBy` por `killerId,result` filtrado só por `userId` + `perspective` | `src/lib/killers.ts:30-34` |
| Projeção unitária (resposta das rotas de escrita) usa 2 `count` sem data | `src/lib/killers.ts:54-57` |
| Streaks lêem **todos** os matches survivor do usuário em ordem crescente | `src/lib/streak.ts:137-141` |
| Streaks são cacheadas em `unstable_cache(["streaks", userId], tag streaks:<id>)` | `src/lib/streak.ts:165-171` |
| `recomputeStreakRuns` já existe, é **pura** e reconstrói runs a partir de uma lista de partidas em ordem **crescente** | `src/lib/streak.ts:36-60` |
| `serializeCrew` lê `currentStreak`/`bestStreak` das linhas persistidas `CrewStreakRun`, não das partidas | `src/lib/crews.ts:102-103` |
| `crewInclude.matches` vem em ordem **decrescente** (`createdAt: "desc"`) | `src/lib/crews.ts:26` |
| Stats agregadas da community vêm de um `groupBy` por `userId,result` | `src/lib/community.ts:59-63` |
| 3 caches públicos com chave `[..., perspective]` e tag `community` | `src/lib/community.ts:115-119`, `:160-164`, `:243-247` |
| `resolveRankViewer` conta matches all-time para o estado `belowThreshold` | `src/lib/community.ts:222-225` |
| `RANK_MIN_MATCHES = 20` | `src/types/profile.ts:5` |
| Histórico pagina com `findMany` + `count`, filtro `{ userId, perspective }` | `src/app/api/history/route.ts:21-32` |
| `/api/stats/streaks` **não lê nenhum query param hoje** — `GET()` sem `req` | `src/app/api/stats/streaks/route.ts:5-12` |
| Padrão de coerção na borda (não 400): `parsePerspective` usa `z.enum(...).catch("survivor")` | `src/lib/api.ts:18-22` |
| `PATCH /api/me/preferences` valida `{ mode }` com Zod e grava em `User.preferredMode` | `src/app/api/me/preferences/route.ts:8-28` |
| Chaves de cache do cliente já são por perspectiva; `invalidateMatchDerived` invalida por **prefixo do 1º segmento** | `src/lib/query-keys.ts:7-32` |
| Win/loss/undo são otimistas: `onMutate` patcha `queryKeys.killers(perspective)` | `src/hooks/useKillers.ts:61-73` |
| Undo busca o último match `teamId: null` do usuário, sem recorte de data | `src/app/api/killers/[id]/win/undo/route.ts:29-32` |
| Log de crew grava 1 `CrewMatch` + fan-out de N `Match` em `$transaction` e não mexe em datas | `src/app/api/crews/[id]/matches/route.ts:51-89` |
| Precedente de "nova dimensão transversal": o Killer mode (`ModeContext` + `headerExtra` + `?perspective=`) | `src/contexts/ModeContext.tsx`, `src/components/molecules/ModeToggle.tsx`, `src/app/dashboard/page.client.tsx:30-71` |
| Home pública pré-busca as duas perspectivas server-side | `src/app/page.tsx:15-20` |
| Perfil público pré-busca as duas perspectivas e alterna no cliente | `src/app/community/[userId]/page.tsx:17-20`, `src/components/organisms/PublicProfileView.tsx:24-25` |
| Nenhuma lib de data instalada (`date-fns`/`luxon` ausentes) | `package.json:16-39` |

---

## Decisões (fechadas)

Todas confirmadas com o solicitante em 24/07/2026. **Nenhuma pergunta bloqueante em aberto.**

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| D1 | Modelo | Temporada **derivada** de `createdAt`, sem coluna em `Match`/`CrewMatch` | Preserva o ADR "`Match` é a única fonte de verdade"; um `seasonId` denormalizado reabriria a classe de bug de drift já eliminada |
| D2 | Âncora | **15/07/2026 00:00 −03:00** (= `2026-07-15T03:00:00Z`) | Definido pelo solicitante |
| D3 | Fuso | **Brasília, offset fixo −03:00**, sem lib de data | A virada acontece à meia-noite do relógio do jogador. O Brasil aboliu o horário de verão em 2019 e a âncora é 2026 ⇒ offset constante, aritmética exata, zero dependência nova |
| D4 | Fronteira | Meses **de calendário** (dia 15 sempre), `[start, end)` — início inclusivo, fim exclusivo | Intervalo semiaberto elimina partida contada em duas temporadas |
| D5 | Default de abertura | **Temporada corrente** | Escolha do solicitante. Impacto conhecido e aceito: no deploy, todo usuário abre na Season 1 (9 dias) com o histórico inteiro na Season 0 |
| D6 | Crews | **Entram no recorte, com tudo da temporada** — `currentStreak`, `bestStreak`, wins/losses/win rate e lista de partidas todos recalculados dentro da janela. O `CrewStreakRun` persistido **não** é encerrado pela virada | Escolha do solicitante. Reusa `recomputeStreakRuns` (`src/lib/streak.ts:36`), que já é puro e faz exatamente isso |
| D7 | Streaks pessoais | Recortados por temporada | Escolha do solicitante. Sequência que atravessa a virada aparece dividida; em `All time` continua íntegra |
| D8 | Rank | `SEASON_RANK_MIN_MATCHES = 10` dentro de uma temporada; `RANK_MIN_MATCHES = 20` em `All time` | Escolha do solicitante. O rank sazonal popula em poucos dias sem afrouxar o all-time |
| D9 | Persistência | `User.preferredSeason` guardando a **intenção**: `"current"` \| `"all"` \| `"<n>"` | Escolha do solicitante (opção A). Quem estava na corrente cai na nova corrente após a virada; quem fixou a Season 0 reabre nela. Um id cru apodreceria |
| D10 | Carrossel da home | **All time** | Escolha do solicitante. É vitrine para visitante deslogado — com 9 dias de Season 1 os cards apareceriam zerados |
| D11 | Perfil público | Temporada via `searchParams` (`<Link>`, server render), default = corrente; perspectiva segue client-side | Pré-buscar N temporadas × 2 perspectivas server-side seria fan-out de queries; a página já é `force-dynamic` |
| D12 | Rótulo da temporada 0 | `Season 0` | Escolha do solicitante. Rótulos: `Season 1`, `Season 0`, `All time` (inglês, regra do projeto) |
| D13 | Valor inválido/ausente na borda | **Coerção** para a temporada corrente (nunca 400) | Espelha `parsePerspective` (`src/lib/api.ts:18-22`) e mantém clientes antigos funcionando |
| D14 | Escrita em temporada passada | **Bloqueada** (grid e log de crew read-only); permitida em `current` e em `All time` | O patch otimista de `src/hooks/useKillers.ts:64-66` incrementaria o contador de uma temporada onde a partida não cai — bug garantido. Em `All time` o +1 é correto |
| D15 | Flag | `seasonsEnabled` em `src/lib/flags.ts`; off ⇒ tudo se comporta como `All time` e o seletor desaparece | Mesmo padrão de rollback de `crewsEnabled`/`killerModeEnabled` |

**O que mudou vs. a versão anterior deste plano**
- Âncora corrigida de 15/07/2025 → **15/07/2026**. Consequência: só existem **Season 0 e Season 1** hoje,
  e todo o histórico atual é Season 0.
- Crews **entraram** no escopo (antes estavam fora) — +1 lib, 2 rotas, 1 hook, 1 componente.
- Persistência **entrou** no escopo (antes era estado só de cliente) — nova coluna + rota estendida.
- Rank passou a ter **dois** thresholds (antes: um só).
- Carrossel da home fixado em **All time** (antes: temporada corrente).

---

## Regras de negócio

1. **Âncora:** Season 1 começa em `2026-07-15T00:00:00−03:00` (= `2026-07-15T03:00:00Z`).
2. **Duração:** 3 meses de calendário. Toda fronteira é dia **15**, 00:00 −03:00.
3. **Intervalo:** `start` inclusivo, `end` exclusivo. Uma partida em `2026-10-15T00:00:00−03:00` pertence
   à **Season 2**, não à 1.
4. **Season 0:** toda partida com `createdAt < âncora`. Não tem `start` (passado aberto).
5. **Numeração:** Season N cobre `[âncora + 3(N−1) meses, âncora + 3N meses)`. Novas temporadas nascem
   sozinhas, por cálculo — nenhuma ação operacional trimestral.
6. **Tabela de referência** (data de hoje: 24/07/2026):

| Season | Início (−03:00) | Fim (exclusivo) | Situação |
|---|---|---|---|
| 0 | — | 15/07/2026 00:00 | Todo o histórico existente |
| **1** | **15/07/2026 00:00** | 15/10/2026 00:00 | **Corrente** (9 dias) |
| 2 | 15/10/2026 00:00 | 15/01/2027 00:00 | Futura |
| 3 | 15/01/2027 00:00 | 15/04/2027 00:00 | Futura |

7. **Seleção default:** temporada corrente, resolvida a partir de `User.preferredSeason`
   (`"current"` por padrão).
8. **`All time`:** nenhum filtro de data — idêntico ao comportamento atual, incluindo Season 0.
9. **Escrita:** uma partida é sempre gravada com `createdAt = now()`, portanto sempre na temporada
   corrente. Registrar/desfazer/logar-crew só é permitido com `current` ou `all` selecionado (D14).
10. **Undo:** o alvo é a última partida **dentro da janela selecionada** — nunca alcança outra temporada.
11. **Streaks pessoais:** recortados pela janela (D7).
12. **Crews (D6):** dentro de uma janela, `currentStreak` e `bestStreak` são **recalculados** dos
    `CrewMatch` da janela via `recomputeStreakRuns`. Para uma temporada passada, `currentStreak` é o
    streak **como estava no fim daquela temporada**. Um run que começou antes da virada aparece com
    contagem **parcial** na visão sazonal e com o valor cheio em `All time`. O run no banco **nunca** é
    encerrado por virada de calendário.
13. **Rank:** posição, elegibilidade e o estado `belowThreshold` do viewer são computados **dentro da
    janela**, com threshold `10` (temporada) ou `20` (`All time`).

---

## Arquitetura da solução

Terceira dimensão ortogonal, no formato já provado pelo Killer mode:

```
              ┌───────────────────────────────────────────────┐
              │  src/lib/seasons.ts   (puro, sem I/O)         │
              │  currentSeasonId · seasonBoundaries           │
              │  listSeasons · seasonWhere → Prisma fragment  │
              │  resolvePreferredSeason (intenção → seleção)  │
              └───────────────┬───────────────────────────────┘
                              │  { createdAt: { gte, lt } }
   borda HTTP ────────────────┼──────────────────────────────────────────
   parseSeason(?season=)      │
   (coerce → current)         ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ killers.ts · streak.ts · community.ts · crews.ts                  │
   │   ...where: { userId, perspective, ...seasonWhere(season) }        │
   │   crews: recomputeStreakRuns(CrewMatch da janela, ASC)             │
   │   unstable_cache keys += seasonKey(season)   (tags inalteradas)    │
   └──────────────────────────────────────────────────────────────────┘
   cliente ───────────────────────────────────────────────────────────
   SeasonContext  (seed = resolvePreferredSeason(User.preferredSeason))
     → PATCH /api/me/preferences { season } com rollback otimista + toast
     → queryKeys.killers(perspective, season)  … +history/streaks/community/rank/crews
     → invalidateMatchDerived: prefixo do 1º segmento ⇒ já busta todas as temporadas
     → season !== current && season !== all  ⇒  grid + log de crew read-only (D14)
```

### Contrato de `src/lib/seasons.ts`

```ts
export const SEASON_ZONE_OFFSET_HOURS = -3;                       // Brasília, fixo
export const SEASON_ANCHOR_MS = Date.UTC(2026, 6, 15, 3, 0, 0);   // 2026-07-15T00:00-03:00
export const SEASON_LENGTH_MONTHS = 3;
export const SEASON_ANCHOR_YEAR = 2026;
export const SEASON_ANCHOR_MONTH = 6;                             // julho (0-indexed)

export type SeasonSelection = number | "all";
export type SeasonPreference = "current" | "all" | `${number}`;    // o que vai no banco
export interface Season { id: number; label: string; start: Date | null; end: Date }

export function currentSeasonId(now?: Date): number;              // 24/07/2026 → 1
export function seasonIdForDate(d: Date): number;                 // clampa em 0
export function seasonBoundaries(id: number): { start: Date | null; end: Date };
export function listSeasons(now?: Date): Season[];                // corrente → 0, desc
export function isCurrentSeason(sel: SeasonSelection, now?: Date): boolean;
export function seasonLabel(sel: SeasonSelection): string;         // "Season 1" | "All time"
export function seasonKey(sel: SeasonSelection): string;           // "all" | "s1" — chave de cache
export function seasonWhere(sel: SeasonSelection):
  { createdAt?: { gte?: Date; lt?: Date } };                       // {} quando "all"

// D9 — a intenção salva vira uma seleção concreta no load; nunca apodrece.
export function resolvePreferredSeason(pref: string | null, now?: Date): SeasonSelection;
export function toPreference(sel: SeasonSelection, now?: Date): SeasonPreference;
```

Núcleo do cálculo (offset fixo ⇒ aritmética exata, sem lib):

```ts
function spParts(d: Date) {                                        // wall clock de Brasília
  const t = new Date(d.getTime() + SEASON_ZONE_OFFSET_HOURS * 3_600_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), day: t.getUTCDate() };
}

export function seasonIdForDate(d: Date): number {
  const { y, m, day } = spParts(d);
  const months =
    (y - SEASON_ANCHOR_YEAR) * 12 + (m - SEASON_ANCHOR_MONTH) - (day < 15 ? 1 : 0);
  return Math.max(0, Math.floor(months / SEASON_LENGTH_MONTHS) + 1);
}

export function seasonBoundaries(id: number) {
  const at = (n: number) =>
    new Date(Date.UTC(SEASON_ANCHOR_YEAR, SEASON_ANCHOR_MONTH + 3 * (n - 1), 15, 3, 0, 0));
  return id <= 0 ? { start: null, end: at(1) } : { start: at(id), end: at(id + 1) };
}

export function seasonWhere(sel: SeasonSelection) {
  if (sel === "all") return {};
  const { start, end } = seasonBoundaries(sel);
  return { createdAt: start ? { gte: start, lt: end } : { lt: end } };
}

// "current" acompanha a virada; "all" é literal; um número é respeitado se ainda existe.
export function resolvePreferredSeason(pref: string | null, now = new Date()): SeasonSelection {
  if (pref === "all") return "all";
  if (pref === null || pref === "current") return currentSeasonId(now);
  const n = Number(pref);
  if (!Number.isInteger(n) || n < 0) return currentSeasonId(now);
  return Math.min(n, currentSeasonId(now));
}
```

`Date.UTC` absorve o overflow de mês (`6 + 3 = 9` → out/2026; `6 + 6 = 12` → jan/2027), e `−03:00`
constante torna "meia-noite local" = "03:00Z" para toda fronteira ≥ 2026.

---

## Fluxo completo

**Hoje.** Dashboard (Server Component) → `getKillersForUser(userId, mode)` → `KillersPageClient` →
`useKillers` cacheia em `["killers", mode]` → cada aba refaz fetch por `?perspective=`. Nenhum recorte
temporal em ponto algum; crews mostram totais all-time.

**Novo (caminho feliz).**
1. `dashboard/page.tsx` lê `preferredMode` **e** `preferredSeason` do `User`, resolve
   `initialSeason = resolvePreferredSeason(preferredSeason)` e semeia
   `getKillersForUser(userId, mode, initialSeason)`.
2. `SeasonProvider initialSeason={...}` envolve o `DashboardContent` (por fora do `ModeProvider`).
3. `SeasonSelect` no `headerExtra` lista `listSeasons()` (corrente → 0) + `All time`.
4. Troca de temporada → contexto atualiza → `PATCH /api/me/preferences { season: toPreference(sel) }`
   (otimista, com rollback + `toast.error` em falha, exatamente como `ModeContext:23-39`) → cada hook tem
   `queryKey` novo → TanStack busca `?season=N` (a temporada anterior fica em cache, retorno instantâneo).
5. Rota faz `parseSeason` → `seasonWhere(season)` entra no `where` do Prisma → `unstable_cache` com
   `seasonKey` na chave.
6. Registro de win na temporada corrente: patch otimista em `queryKeys.killers(mode, season)` →
   `PATCH /api/killers/:id/win?perspective=…&season=…` → cria `Match` →
   `revalidateTag("streaks:<id>","max")` (só survivor) + `revalidateTag("community","max")` → resposta é
   a projeção **daquela janela** → `onSettled` chama `invalidateMatchDerived` (prefixo ⇒ busta todas as
   temporadas).
7. Log de crew na temporada corrente: transação inalterada (`CrewMatch` + fan-out de `Match` +
   `CrewStreakRun`) → resposta `getCrewDetail(userId, crewId, season)` já recortada.

**Caminhos de erro / borda.**
- `?season=abc`, `?season=-1`, `?season=99` (futuro) → coerção para a corrente (D13). Nunca 400.
- Temporada passada selecionada → `ActionButtons` e `CrewLaunchForm` desabilitados com
  `title="Past seasons are read-only"`; as rotas **também** rejeitam (`409`) — defesa em profundidade
  contra cliente adulterado.
- Undo sem partida na janela → mantém o comportamento atual: devolve a projeção sem alterar nada
  (`src/app/api/killers/[id]/win/undo/route.ts:33-43`).
- Temporada sem partida → empty state com o rótulo da temporada ("No matches in Season 1 yet").
- Crew sem partida na janela → card com `0` em tudo e `currentStreak = 0`, sem quebrar o `isReady`/
  `canWrite` (que não dependem de partida).
- `PATCH /api/me/preferences` falha → `SeasonContext` reverte a seleção e mostra toast; nenhuma query é
  refeita com estado inconsistente.
- Flag off → `parseSeason` devolve sempre `"all"`, seletor não renderiza, comportamento idêntico ao de
  hoje.

---

## Etapas detalhadas de implementação

### Banco de dados
1. **`prisma/schema.prisma` — `Match`:** adicionar `@@index([userId, perspective, createdAt])`. Todas as
   leituras recortadas passam a filtrar por essa tripla (`src/lib/killers.ts:32`,
   `src/app/api/history/route.ts:23`, `src/lib/community.ts:60-62`, `src/lib/streak.ts:138`).
2. **`prisma/schema.prisma` — `User`:** adicionar `preferredSeason String @default("current")` (logo
   abaixo de `preferredMode`, `:42`). String e não Int porque precisa acomodar `"current"` e `"all"`
   (D9). Default garante comportamento correto para todos os usuários existentes sem backfill.
3. Aplicar com `npm run db:push` + `npm run db:generate`. **Sem migração de dados de partidas, sem
   backfill.** Ambas as mudanças são aditivas e reversíveis.

### Backend — `src/lib/`
4. **`src/lib/seasons.ts`** (novo) — contrato acima. Puro, sem import de Prisma/Next.
5. **`src/lib/api.ts`** — `parseSeason(value: string | null): SeasonSelection`:
   ```ts
   const seasonSchema = z.union([z.literal("all"), z.coerce.number().int().min(0)]);

   export function parseSeason(value: string | null): SeasonSelection {
     if (!seasonsEnabled) return "all";
     const r = seasonSchema.safeParse(value);
     if (!r.success) return currentSeasonId();
     return r.data === "all" ? "all" : Math.min(r.data, currentSeasonId());
   }
   ```
6. **`src/lib/killers.ts`** — `getKillersForUser(userId, perspective = "survivor", season: SeasonSelection = "all")`
   e `getKillerForUser(userId, killerId, perspective, season = "all")`; espalhar `...seasonWhere(season)`
   nos `where` das linhas `32` e `55-56`. **Default `"all"`** preserva o comportamento de qualquer caller
   não atualizado (mesma disciplina do `perspective = "survivor"`).
7. **`src/lib/streak.ts`** — `computeStreaksForUser(userId, season = "all")` e
   `getStreaksForUser(userId, season = "all")`; filtro na linha `138`; chave de cache
   `["streaks", userId, seasonKey(season)]` (tag `streaks:<userId>` **inalterada** — tag invalida todas
   as variantes). `getTeamStreaks(userId, season = "all")` recebe o mesmo tratamento (path de fallback
   quando `crewsEnabled=false`), reusando `recomputeStreakRuns` como nas crews.
8. **`src/lib/crews.ts`** (D6) — `getCrewsForUser(viewerId, season = "all")` e
   `getCrewDetail(viewerId, crewId, season = "all")`:
   - filtrar `crewInclude.matches` por `...seasonWhere(season)`;
   - em `serializeCrew`, **substituir** a leitura de `crew.streaks` (`:102-103`) por
     `const runs = recomputeStreakRuns([...crew.matches].reverse())` — **atenção: `matches` vem `desc`
     (`:26`) e `recomputeStreakRuns` exige ordem crescente**; `currentStreak = runs.at(-1)?.status === "active" ? runs.at(-1).winCount : 0`,
     `bestStreak = Math.max(...runs.map(r => r.winCount), 0)`;
   - `wins`/`losses`/`totalMatches`/`winRate` já derivam de `crew.matches`, então passam a ser sazonais
     automaticamente;
   - `isReady`/`canWrite`/`members` **não** mudam (não dependem de partida);
   - **o write path (`decideStreakAction` + `CrewStreakRun`) fica intacto** — a virada não encerra run.
9. **`src/lib/community.ts`** — propagar `season` por `statsByUser` (`:54`),
   `computePublicProfiles`/`getPublicProfiles` (`:87`/`:109`), `computePublicProfile`/`getPublicProfile`
   (`:126`/`:155`), `computeRankBase` (`:195`), `resolveRankViewer` (`:214` — **o `match.count` da linha
   224 também recebe o filtro**, senão `belowThreshold` mostra total all-time contra um rank sazonal) e
   `getRankedProfiles` (`:233`). O threshold passa a ser
   `season === "all" ? RANK_MIN_MATCHES : SEASON_RANK_MIN_MATCHES` (D8), usado tanto no `.filter` de
   `computeRankBase` (`:206`) quanto no `remaining` de `resolveRankViewer` (`:227`). Acrescentar
   `seasonKey(season)` às **3** chaves de `unstable_cache` (`:117`, `:162`, `:245`); tags inalteradas.
10. **`src/lib/flags.ts`** — `export const seasonsEnabled = process.env.NEXT_PUBLIC_SEASONS_ENABLED !== "false";`
11. **`src/types/profile.ts`** — adicionar `export const SEASON_RANK_MIN_MATCHES = 10;` ao lado de
    `RANK_MIN_MATCHES` (`:5`).

### Backend — rotas
12. **`GET /api/killers`** — `parseSeason(sp.get("season"))` → `getKillersForUser(userId, perspective, season)`.
13. **`GET /api/history`** — filtro no `findMany` **e** no `count`
    (`src/app/api/history/route.ts:23,31`); caso contrário `hasMore` mente.
14. **`GET /api/stats/streaks`** — passa a receber `req: Request` (hoje é `GET()` sem argumento,
    `src/app/api/stats/streaks/route.ts:5`) → `getStreaksForUser(userId, season)`.
15. **`GET /api/community/profiles`** e **`GET /api/rank`** — `parseSeason` + repasse; `/api/rank`
    devolve também o threshold ativo no payload (ou o cliente o deriva de `season`) para a copy do
    empty state.
16. **`GET /api/crews`** e **`GET /api/crews/[id]`** — `parseSeason` + repasse a
    `getCrewsForUser`/`getCrewDetail`.
17. **4 rotas de escrita de killer** (`win`, `loss`, `win/undo`, `loss/undo`) — ler `season`; **rejeitar**
    `409 { error: "Past seasons are read-only" }` quando `season !== "all" && season !== currentSeasonId()`;
    usar `season` na projeção de resposta (`getKillerForUser`) e no `findFirst` do undo
    (`src/app/api/killers/[id]/win/undo/route.ts:29-32`). `revalidateTag` inalterado.
18. **2 rotas de escrita de crew** (`POST /api/crews/[id]/matches`,
    `DELETE /api/crews/[id]/matches/[cmId]`) — mesmo gate `409` (D14) e `season` na projeção de resposta
    (`getCrewDetail`). A transação e o fan-out **não** mudam.
19. **`PATCH /api/me/preferences`** — estender o schema Zod para
    `z.object({ mode: z.enum([...]).optional(), season: z.union([z.literal("current"), z.literal("all"), z.string().regex(/^\d+$/)]).optional() })`
    com pelo menos um campo presente; gravar `preferredSeason`. Manter retrocompat: body só com `mode`
    continua válido.
20. **Nada a mudar** em `/api/streaks/*`, `/api/players`, `/api/teams`, `/api/profile`,
    `/api/survivors`, `/api/invites/*`, `/api/crews/invitees`, `/api/crews/[id]/members/[userId]`.

### Frontend
21. **`src/lib/query-keys.ts`** — as chaves derivadas de partida ganham o segmento de temporada:
    `killers: (p, s) => ["killers", p, seasonKey(s)]`, idem `history`/`streaks`/`community`/`rank`, e
    `crews: (s) => ["crews", seasonKey(s)]`. `invalidateMatchDerived` ganha `crews` na lista e continua
    invalidando por 1º segmento (`:26-32`).
22. **`src/contexts/SeasonContext.tsx`** (novo) — `{ season, setSeason, seasons, isReadOnly }`; espelha
    `ModeContext` **inclusive o fetch de persistência com rollback + toast** (`ModeContext:23-39`);
    `isReadOnly = season !== "all" && season !== currentSeasonId()`.
23. **`src/components/molecules/SeasonSelect.tsx`** (novo) — dropdown (não button group: a lista cresce
    um item por trimestre), `aria-label="Season"`, opções `listSeasons()` + `All time`, ring
    `focus-visible`, tokens de cor.
24. **`src/app/dashboard/page.client.tsx`** — `SeasonProvider` por fora do `ModeProvider`;
    `headerExtra={<><SeasonSelect/><ModeToggle/></>}`; repassar `season` a `useKillers` e às abas; passar
    `readOnly` a `KillersTabTemplate` e `CrewStreakTabTemplate`.
25. **`src/app/dashboard/page.tsx`** — ler `preferredSeason` no `select` existente (`:18`), resolver com
    `resolvePreferredSeason` e passar `initialSeason`.
26. **Hooks** — `useKillers(initial, perspective, season)`, `useHistory(isActive, perspective, season)`,
    `useStreaks(perspective, season)`, `useCommunity(isActive, perspective, season)`,
    `useRank(isActive, metric, search, perspective, season)`, `useCrews(season)`: incluir na chave e na
    querystring. Em `useKillers`, o seed de `initialData` passa a ser condicionado a
    `perspective === seedPerspective && seasonKey(season) === seedSeasonKey`
    (`src/hooks/useKillers.ts:83-89`).
27. **Read-only** — `readOnly?: boolean` descendo `KillersTabTemplate` → `KillerGrid` → `KillerCard` →
    `ActionButtons` (`src/components/molecules/ActionButtons.tsx:31-78`) e
    `CrewStreakTabTemplate` → `CrewLaunchForm`/`CrewCard`; quando `true`, botões `disabled` com
    `title="Past seasons are read-only"`.
28. **Copy sensível a temporada** — `HistoryTabTemplate` ("All your recorded matches…" →
    `Season 1 · from most recent to oldest`), empty state do rank com o threshold ativo
    (`src/components/templates/RankTabTemplate.tsx:63-67,99-101`), empty state da community, e rótulo da
    janela no `CrewCard`.
29. **Superfícies públicas** — `src/app/page.tsx`: `getPublicProfiles({ limit: 12, perspective, season: "all" })`
    (D10). `src/app/community/[userId]/page.tsx`: ler `searchParams.season` → `parseSeason` → repassar aos
    dois `getPublicProfile`; `PublicProfileView` ganha uma faixa de `<Link href="?season=…">`
    (server-driven, D11), perspectiva segue client-side.
30. **`src/lib/changelog.ts`** — nova entrada no topo:
    ```ts
    {
      id: "seasons",
      feature: "Seasons",
      date: "2026-07-24",
      description:
        "Your stats are now split into 3-month seasons, starting July 15, 2026. Switch seasons from the header to see the killer grid, statistics, streaks, crews, history, community and rank for that period — or pick All time for your full record. Everything you played before July 15, 2026 lives in Season 0, and your choice is remembered across devices.",
      requestedBy: "Léo",
    }
    ```

### Infraestrutura
- `.env.example` + Vercel: `NEXT_PUBLIC_SEASONS_ENABLED` (opcional; default on). Nenhuma fila, storage,
  secret ou job novo. **Nenhuma tarefa operacional trimestral** — a virada é aritmética.

---

## Modelo de dados

| Tabela | Coluna | Tipo | Notas |
|---|---|---|---|
| `Match` | `createdAt` | `DateTime` | **Já existe** (`prisma/schema.prisma:142`). É a chave de temporada — nada é adicionado |
| `CrewMatch` | `createdAt` | `DateTime` | **Já existe** (`:216`), com `@@index([createdAt])` (`:224`) |
| `Match` | — | índice | **Novo:** `@@index([userId, perspective, createdAt])` — aditivo, reversível |
| `User` | `preferredSeason` | `String @default("current")` | **Nova.** Guarda a intenção: `"current"` \| `"all"` \| `"<n>"` (D9). Default cobre todos os usuários existentes sem backfill |

Nenhuma coluna em `Match`/`CrewMatch`, nenhuma tabela nova, nenhum backfill. Multi-tenancy segue por
`userId`; não há soft delete no projeto.

---

## Endpoints envolvidos

| Método | Path | Auth | Entrada | Resposta | Erros |
|---|---|---|---|---|---|
| GET | `/api/killers?perspective=&season=` | sessão | query | `Killer[]` da janela | 401, 500 |
| GET | `/api/history?page=&perspective=&season=` | sessão | query | `HistoryPage` da janela | 401, 500 |
| GET | `/api/stats/streaks?season=` | sessão | query (**novo**) | `StreaksData` da janela | 401, 500 |
| GET | `/api/community/profiles?page=&perspective=&season=` | sessão | query | `CommunityPage` | 401, 500 |
| GET | `/api/rank?metric=&search=&page=&perspective=&season=` | sessão | query | `RankPage` (rank, `me` e threshold da janela) | 401, 500 |
| GET | `/api/crews?season=` | sessão | query | `Crew[]` com streaks/stats da janela | 401, 500 |
| GET | `/api/crews/[id]?season=` | sessão | query | `Crew` da janela | 401, 400, 404, 500 |
| PATCH | `/api/killers/[id]/{win,loss}?perspective=&season=` | sessão | — | `Killer` da janela | 401, 400 id, **409 season passada**, 404, 500 |
| PATCH | `/api/killers/[id]/{win,loss}/undo?perspective=&season=` | sessão | — | idem | idem |
| POST | `/api/crews/[id]/matches?season=` | sessão + `canWrite` | `{ killerId, result }` | `Crew` da janela, 201 | 401, 400, 403, **409**, 404, 500 |
| DELETE | `/api/crews/[id]/matches/[cmId]?season=` | sessão + `canWrite` | — | `Crew` da janela | 401, 400, 403, **409**, 404, 500 |
| PATCH | `/api/me/preferences` | sessão | `{ mode?, season? }` | `{ mode?, season? }` | 401, 400, 500 |

`season` aceita `0..currentSeasonId()` ou `all`; ausente/inválido → temporada corrente (D13). Contrato
retrocompatível: cliente antigo sem o param recebe a temporada corrente — **mudança de comportamento
intencional**, listada em Impactos. `PATCH /api/me/preferences` aceita body só com `mode` (como hoje).

---

## Casos de erro & validações

| Situação | Validação / Detecção | Resposta esperada |
|---|---|---|
| `?season=abc` / vazio / ausente | `parseSeason` (`safeParse`) | Coerção → temporada corrente, 200 |
| `?season=-3` | `z.coerce.number().min(0)` falha | Coerção → corrente, 200 |
| `?season=99` (futuro) | `Math.min(r.data, currentSeasonId())` | Clampa na corrente, 200 |
| `?season=all` | `z.literal("all")` | Sem filtro de data, 200 |
| Escrita (killer ou crew) com temporada passada | `season !== "all" && season !== currentSeasonId()` | `409 { error: "Past seasons are read-only" }`; UI já desabilita antes |
| Undo sem partida na janela | `findFirst` retorna `null` | 200 com a projeção inalterada (comportamento atual) |
| Temporada sem partida | Agregados vazios | Empty state com rótulo ("No matches in Season 1 yet"); nunca 404 |
| Crew sem partida na janela | `recomputeStreakRuns([])` → `[]` | `currentStreak = 0`, `bestStreak = 0`, lista vazia; `canWrite` preservado |
| `preferredSeason` com valor corrompido no banco | `resolvePreferredSeason` (guard clause) | Cai na temporada corrente, sem erro |
| `PATCH /api/me/preferences` com body vazio | Zod: exigir ≥1 campo | `400 { error: "Invalid input" }` |
| `PATCH /api/me/preferences` falha na rede | `.catch` no `SeasonContext` | Reverte a seleção + `toast.error("Could not switch season")` |
| `getPublicProfile` de temporada onde o usuário não jogou | `stats` zerado | Perfil renderiza com 0/0; sem `notFound()` (`src/app/community/[userId]/page.tsx:21`) |
| Flag off + `?season=3` | `parseSeason` retorna `"all"` de saída | 200 all-time, seletor invisível |
| Fronteira exata (`15/10/2026T00:00−03:00`) | `gte`/`lt` semiaberto | Pertence à temporada seguinte, contado uma única vez |

---

## Impactos

- **Mudança de default muito visível (agravada pela âncora de 2026):** no deploy, todo usuário abre na
  **Season 1 (9 dias)** com o histórico inteiro na Season 0. Aceito em D5; mitigado por rótulo explícito
  no seletor, `All time` a um clique e entrada de changelog. **Comunicar antes do deploy.**
- **Card da crew muda de número no dia do deploy:** `currentStreak`/`bestStreak` passam a ser
  recalculados da janela. Um streak de 15 wins iniciado em junho aparecerá parcial na Season 1 (só as
  vitórias a partir de 15/07) e cheio em `All time`. É o comportamento pedido (D6), mas parece
  regressão se não for comunicado.
- **Divergência intencional entre exibição e banco:** `CrewStreakRun.winCount` (persistido) e o
  `currentStreak` exibido numa janela podem diferir. O run persistido segue sendo a verdade para o
  *write path*; a exibição sazonal é derivada. Registrar como ADR no `CLAUDE.md` para não parecer bug.
- **Rank popula em ~poucos dias** com threshold 10 na Season 1, mas fica vazio nas primeiras horas.
- **Streaks pessoais quebradas na virada** (D7): uma sequência que cruza 15/07/2026 aparece como duas nas
  visões sazonais; íntegra em `All time`.
- **`/api/stats/streaks` muda de assinatura** (`GET()` → `GET(req)`) — quebra o teste atual da rota.
- **`getCrewsForUser`/`getCrewDetail` mudam de assinatura** — 5 call sites nas rotas de crew precisam
  passar `season`; testes de crew existentes precisam atualização.
- **Multiplicação de entradas de `unstable_cache`**: temporadas × perspectivas × métricas. Aceitável
  (chaves pequenas, `revalidate: 60`), mas o cache aquece mais devagar para temporadas pouco visitadas.
- **Carrossel da home fica em `All time`** (D10) enquanto o dashboard logado abre na corrente —
  divergência deliberada entre vitrine e ferramenta.
- **Cross-repo:** o app irmão *DBD Stream Queue* não lê este banco — sem impacto. Não há outro consumidor
  destas rotas no repo.
- **`useKillers` seed:** sem a condição de temporada no `initialData`, a cache da temporada errada seria
  semeada com os dados da corrente — bug silencioso; coberto no item 26.

---

## Riscos

- **Ordem invertida no recompute da crew (severidade: alta).** `crewInclude.matches` vem `desc`
  (`src/lib/crews.ts:26`) e `recomputeStreakRuns` assume ordem crescente
  (`src/lib/streak.ts:36-60`). Passar a lista sem `reverse()` produz streaks silenciosamente errados —
  números plausíveis, logicamente invertidos. *Mitigação:* teste dedicado com uma sequência
  win-win-loss-win cujo resultado difere nas duas ordens.
- **Fronteira de fuso errada (severidade: alta).** Aplicar a âncora em UTC joga 3h de partidas na
  temporada errada. *Mitigação:* constante única `SEASON_ANCHOR_MS`; teste nos instantes `−1ms`, `0` e
  `+1ms` de cada fronteira; D3 já fixado.
- **Patch otimista em temporada errada (severidade: alta).** *Mitigação:* D14 (UI desabilitada + 409 na
  rota, killer **e** crew) + teste de hook.
- **`count` do histórico sem filtro (severidade: média).** `hasMore` sobre o total all-time faria a
  paginação pedir páginas vazias. *Mitigação:* item 13 aplica o filtro nos dois lados; teste cobre
  `hasMore` na última página.
- **Chave de `unstable_cache` sem `seasonKey` (severidade: média).** Uma chave esquecida serve dados de
  outra temporada com aparência de dado real. *Mitigação:* checklist explícito das 4 chaves
  (`src/lib/streak.ts:167`, `src/lib/community.ts:117`, `:162`, `:245`) + teste que assere a chave.
- **Threshold trocado no rank (severidade: média).** Usar 20 na visão sazonal (ou 10 no all-time)
  esvazia ou infla o leaderboard. *Mitigação:* uma única função `rankThreshold(season)` usada nos dois
  pontos (`computeRankBase` e `resolveRankViewer`) + teste dos dois caminhos.
- **`preferredSeason` apodrecendo (severidade: baixa).** Resolvido por desenho em
  `resolvePreferredSeason` (D9). *Mitigação:* teste que simula a virada (mesmo `pref`, dois `now`
  diferentes).
- **Degradação de query com range de data (severidade: baixa/média).** *Mitigação:* índice composto;
  `computePublicProfiles` continua carregando todos os `Profile` (dívida preexistente, não agravada —
  registrar em `audit.md`).
- **Regulatório:** não se aplica — dado de jogo de usuário autenticado, sem PII sensível; a whitelist da
  projeção pública (`src/lib/community.ts:19-27`) permanece intocada.

## Estratégia de rollback

1. **Nível 1 (imediato, sem deploy de código):** `NEXT_PUBLIC_SEASONS_ENABLED=false` → `parseSeason`
   devolve sempre `"all"`, `SeasonSelect` não renderiza, gating read-only nunca ativa, crews voltam a
   exibir all-time. Comportamento **byte-a-byte** igual ao de hoje. `preferredSeason` fica no banco,
   inerte.
2. **Nível 2:** revert do commit. Nenhum dado de partida a restaurar.
3. **Schema:** remover o `@@index` e a coluna `preferredSeason` + `db:push`. Ambos aditivos; a coluna tem
   default, então nenhum código antigo quebra se ela ficar.
4. **Ordem de deploy:** (a) `db:push` do índice + coluna → (b) deploy do código com a flag **on**. Sem
   janela de incompatibilidade: as rotas coagem `season` ausente, então cliente antigo + servidor novo
   funciona; e servidor antigo + cliente novo ignora o param extra.

---

## Plano de testes

**Unit — `src/lib/seasons.test.ts`** (o coração da feature)
- `currentSeasonId(new Date("2026-07-24T12:00:00Z"))` → `1`.
- `seasonIdForDate` nos instantes exatos: `2026-07-15T02:59:59.999Z` → `0`;
  `2026-07-15T03:00:00.000Z` → `1`; `2026-10-15T03:00:00Z` → `2`; `2027-01-15T03:00:00Z` → `3`.
- Partida do dia 14/07/2026 às 23h de Brasília (`2026-07-15T02:00:00Z`) → `0` (o caso que distingue
  Brasília de UTC).
- Datas muito antigas (`2020-01-01`) → `0` (clamp).
- `seasonBoundaries(0)` → `{ start: null, end: âncora }`; contiguidade `end(N) === start(N+1)` para
  N=1..8 (atravessando a virada de ano em jan/2027).
- `seasonWhere("all")` → `{}`; `seasonWhere(0)` → só `lt`; `seasonWhere(1)` → `gte` **e** `lt`.
- `listSeasons` desc, começando na corrente, terminando em 0, sem furos.
- `seasonKey` estável e distinta por seleção.
- `resolvePreferredSeason`: `"current"` com `now` na Season 1 → `1`; **o mesmo `"current"`** com `now` em
  nov/2026 → `2` (prova que não apodrece); `"all"` → `"all"`; `"0"` → `0`; `"9"` (futuro) → corrente;
  `null`/`"lixo"` → corrente.
- `toPreference`: seleção igual à corrente → `"current"`; `"all"` → `"all"`; passada → `"0"`.

**Unit — `src/lib/api.test.ts`:** `parseSeason` para `null`, `""`, `"abc"`, `"-1"`, `"0"`, `"1"`,
`"999"`, `"all"`, e com a flag off.

**Unit — `src/lib/crews.test.ts`:** `serializeCrew` com partidas dentro/fora da janela;
**teste anti-inversão** (sequência cujo `currentStreak` difere se a ordem não for revertida);
`currentStreak` de temporada passada = streak no fim daquela temporada; run parcial (começou antes da
virada) conta só as vitórias da janela; `isReady`/`canWrite` inalterados por temporada sem partida.

**Integração — rotas** (Prisma e `auth()` mockados no padrão do repo): para cada uma das 7 GETs — 401
sem sessão; `where` recebe `createdAt: { gte, lt }` com `?season=1`; **sem** `createdAt` com
`?season=all`; corrente quando o param falta. `/api/history`: `count` também filtrado e `hasMore` correto
na última página. `/api/rank`: threshold 10 com `?season=1` e 20 com `?season=all`;
`me.belowThreshold.remaining` coerente com o threshold ativo. Escritas (killer **e** crew): `409` com
temporada passada; `findFirst` do undo com o range; `revalidateTag` chamado com 2 argumentos; transação
do crew match inalterada. `PATCH /api/me/preferences`: body só `mode` (retrocompat), só `season`, ambos,
vazio → 400, valor inválido → 400.

**Hooks** (`createQueryWrapper()`): chave inclui a temporada; trocar de temporada dispara novo fetch e
**não** contamina a cache anterior; `initialData` só semeia a temporada semeada; patch otimista +
rollback corretos em `current` e em `all`; `useCrews` idem.

**Componentes:** `SeasonSelect` (renderiza corrente…0 + All time, `onChange` propaga, `aria-label`,
`focus-visible`); `SeasonContext` (rollback + toast quando o PATCH falha); `ActionButtons` e
`CrewLaunchForm` `disabled` quando `readOnly`; `HistoryTabTemplate`/`RankTabTemplate` com copy sazonal e
threshold correto.

**Regressão (E2E manual + suíte existente):** com a flag **off**, toda a suíte atual passa sem alteração
de comportamento; log e delete de crew match seguem funcionando com o fan-out; perfil público com
`?season=` e sem; carrossel da home populado em `All time`; troca de modo Surv/Killer preserva a
temporada.

---

## Critérios de aceite

- [ ] Com o seletor em `Season 1`, grid/pizza/streaks/histórico/crews/community/rank mostram **apenas**
      partidas de `15/07/2026 00:00−03:00` (incl.) a `15/10/2026 00:00−03:00` (excl.).
- [ ] `Season 0` mostra exclusivamente partidas anteriores a `15/07/2026 00:00−03:00`.
- [ ] Uma partida registrada no dia 14/07/2026 às 23h (Brasília) aparece na **Season 0**.
- [ ] `All time` reproduz exatamente os números de antes da feature (verificado lado a lado com produção).
- [ ] A soma dos totais de Season 0 + Season 1 é igual ao total de `All time`, para o mesmo usuário e
      perspectiva.
- [ ] Uma partida registrada agora aparece na temporada corrente e **não** em nenhuma outra.
- [ ] Card da crew em `Season 1` mostra streak/wins/losses só da janela; em `All time`, os valores cheios;
      o `CrewStreakRun` ativo no banco **não** foi encerrado pela virada.
- [ ] Com temporada passada selecionada, os botões de win/loss/undo e o form de log de crew estão
      desabilitados, e um `PATCH`/`POST` forçado responde `409`.
- [ ] Rank com `?season=1` usa o mínimo de **10** partidas; com `?season=all`, **20**.
- [ ] Trocar de temporada persiste: recarregar a página reabre na mesma temporada; e uma conta com
      `preferredSeason="current"` abre na temporada corrente mesmo depois de uma virada (simulável em teste).
- [ ] Temporada × perspectiva são independentes: trocar de modo preserva a temporada e vice-versa, sem
      cache cruzada.
- [ ] Carrossel da home (deslogado) mostra números **all-time**; perfil público em
      `/community/[userId]?season=1` mostra os da Season 1 e, sem o param, os da corrente.
- [ ] `NEXT_PUBLIC_SEASONS_ENABLED=false` → seletor ausente e comportamento idêntico ao atual.
- [ ] `npm run test`, `npm run lint`, `npx tsc --noEmit` e `npm run build` verdes.

---

## Estimativa de complexidade

| Tarefa | Otimista | Provável | Pessimista |
|---|:--:|:--:|:--:|
| `lib/seasons.ts` + suíte de fronteiras e preferência | 2h | 3h | 5h |
| `parseSeason` + `api.ts` + testes | 0,5h | 1h | 1,5h |
| `killers.ts` · `streak.ts` · `community.ts` (+ 2 thresholds, 4 chaves de cache) | 2h | 4h | 6h |
| **`crews.ts` season-scoping + recompute (D6) + 2 rotas GET + testes** | 3h | 5h | 8h |
| Legacy `getTeamStreaks` + `/api/streaks` (path de fallback) | 0,5h | 1h | 1,5h |
| 5 rotas GET de match + 6 de escrita (gate 409) + testes | 3h | 5h | 8h |
| **`User.preferredSeason` + `PATCH /api/me/preferences` + `resolvePreferredSeason` + testes** | 1,5h | 2h | 3h |
| Índice Prisma + `db:push`/`db:generate` | 0,5h | 0,5h | 1h |
| `query-keys` + 6 hooks + testes | 2h | 4h | 5,5h |
| `SeasonContext` (com persistência) + `SeasonSelect` + header/shell + testes | 2h | 3h | 5h |
| Gating read-only (killer grid + crew log) + testes | 1,5h | 3h | 4,5h |
| Superfícies públicas (home all-time, perfil, `PublicProfileView`) | 1,5h | 2,5h | 4h |
| Flag + changelog + copy/empty states + `CLAUDE.md` (2 ADRs) | 1h | 1,5h | 2h |
| Regressão, lint/tsc/build, ajustes | 1h | 2h | 4h |
| **Total** | **~22h** | **~37,5h** | **~59h** |

> Complexidade geral: **média-alta** (subiu com a entrada de crews e persistência). Alocação: 1 dev →
> **~3 dias (otimista) / 5 dias (provável) / 7,5 dias (pessimista)**. A complexidade não está no domínio
> (aritmética simples e bem testável), está na **superfície**: 4 libs, 4 chaves de cache, 13 rotas,
> 6 hooks e 8 componentes precisam receber o mesmo parâmetro sem esquecer nenhum ponto — mais o recompute
> de streak da crew, que é o único trecho com lógica nova de verdade.

## Dependências

- **Ordem obrigatória:** `seasons.ts` + testes → `parseSeason` → libs de derivação (`killers`, `streak`,
  `community`, `crews`) → rotas → `preferredSeason` + preferences → `query-keys` → hooks → componentes →
  superfícies públicas → changelog/docs.
- **Infra:** `db:push` (índice + coluna) **antes** do deploy do código; `NEXT_PUBLIC_SEASONS_ENABLED` no
  ambiente (opcional).
- **Comunicação:** avisar os usuários antes do deploy — o dashboard abre na Season 1 e os cards de crew
  mudam de número no mesmo dia (ver Impactos).
- **Externas:** nenhuma. Nenhuma lib nova, nenhum serviço de terceiro, nenhuma aprovação fora do time.

---

## Checklist final (Definition of Done)

- [ ] Seletor de temporada no header, persistido por intenção; toda leitura derivada de partida respeita
      a janela.
- [ ] `All time` e `Season 0` corretos; Season 0 + Season 1 = `All time`.
- [ ] Crews recortadas com `recomputeStreakRuns` **em ordem crescente**; run persistido intacto.
- [ ] Escrita bloqueada em temporada passada (UI + `409`), para killer **e** crew.
- [ ] Dois thresholds de rank aplicados nos dois pontos (`computeRankBase` e `resolveRankViewer`).
- [ ] As 4 chaves de `unstable_cache` incluem `seasonKey`; tags e `revalidateTag(..., "max")` (2 args)
      inalterados.
- [ ] Índice `[userId, perspective, createdAt]` e coluna `User.preferredSeason` aplicados.
- [ ] Testes co-locados para `seasons.ts`, `parseSeason`, `crews.ts` (incl. anti-inversão), 13 rotas,
      6 hooks, `SeasonSelect`, `SeasonContext`, gating read-only — todos verdes.
- [ ] Copy 100% em inglês; tokens de cor (sem hex cru); `aria-label` + `focus-visible` no seletor; empty
      states sazonais.
- [ ] Sem `useCallback`/`useMemo`/`memo` manuais (React Compiler ligado); `'use client'` só onde já
      estava.
- [ ] Entrada `seasons` no `src/lib/changelog.ts`.
- [ ] `CLAUDE.md` atualizado com **dois ADRs**: (a) "temporada é derivada de `createdAt`, nunca uma
      coluna"; (b) "o streak exibido de uma crew numa janela é derivado dos `CrewMatch` da janela — pode
      divergir de `CrewStreakRun.winCount`, que segue sendo a verdade do write path". Mais: tabela de
      rotas com `?season=`, nota de `queryKeys`, `seasonsEnabled` na lista de flags,
      `User.preferredSeason` na seção de banco.
- [ ] `lint` · `tsc --noEmit` · `test` · `build` verdes; flag off = comportamento atual.

## Itens futuros (fora do escopo)

- 🔭 **Encerrar o streak da crew na virada** — se o produto decidir que temporada nova zera o streak
  compartilhado, aí `CrewStreakRun` precisa de `seasonId` e de um job/gate na virada.
- 🔭 **Snapshot de rank ao fim da temporada** — congelar top N por temporada (aí sim justificaria uma
  tabela `SeasonRank`).
- 🔭 **Comparativo entre temporadas** — "Season 2 vs Season 1" (delta de win rate por killer).
- 🔭 **Nomes editoriais e badges** de temporada ("Season of Blood"), exigindo uma tabela `Season` real.
- 🔭 **Temporada na URL do dashboard** (`/dashboard?season=1`) para links compartilháveis.
- 🔭 **Selo de temporada no carrossel público**, se a divergência vitrine (all-time) × dashboard
  (corrente) confundir visitantes.
