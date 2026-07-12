# #1 — Streak, Autenticação Multiusuário e Refactor de Conceito (Sobreviventes)

> **Visão geral.** Hoje o app é single-user, sem login, e trata win/loss como contadores globais por
> killer, com uma métrica de "streak" apenas *computada* do histórico. Esta entrega (a) adiciona
> **autenticação multiusuário** (Auth.js v5) com catálogo de killers global e dados de jogo por usuário;
> (b) **refatora o conceito**: toda partida passa a ser da **ótica dos sobreviventes** (nunca "como
> killer"), com `Match` virando a **fonte única** de verdade e stats por killer **computadas por
> usuário**; (c) introduz **Players**, **Teams** e o módulo **Streak** — uma sequência de partidas de um
> time que **zera ao perder**; (d) cria uma **splash pré-login** temática. Afeta praticamente todas as
> camadas: schema, auth, APIs, hooks, componentes e testes.

**Objetivos**
- Login/cadastro funcionando; dados de jogo isolados por usuário; killers globais.
- Dados atuais migrados para a conta padrão `francielidesouza78@gmail.com` sem inversão de números.
- `Match` como fonte única de win/loss; stats por killer computadas por usuário.
- Cadastro de Players (name, nick) e montagem de Times (1–4 players, reutilizáveis).
- Aba Streak: lançar partida (time + killer enfrentado + resultado), streak zera na derrota, com
  detalhamento por time (resumo + timeline).
- Splash pré-login sombria (tema DBD/terror).
- Cobertura de testes em toda peça nova/alterada (regra do `CLAUDE.md`).

---

## Escopo

**Entra:**
- Auth.js v5 (NextAuth) com provider **Credentials** (email + senha, hash bcrypt, sessão JWT).
- Modelos novos: `User`, `Player`, `Team`, `TeamPlayer`, `StreakRun`; alterações em `Match` e `Killer`.
- Migração de dados atuais → conta padrão.
- Rotas de API: auth, signup, players (CRUD), teams (CRUD + membros), streak (listar + lançar partida),
  killers (GET per-user), win/loss quick-log reescritas.
- Telas: splash `/`, `/login`, `/signup`, dashboard protegido; aba **Team** repaginada (players + teams);
  nova aba **Streak**; ajuste da aba **Statistics** e **Killers**.
- Testes co-localizados para tudo que for criado/alterado.

**NÃO entra (ver Itens futuros):**
- Undo de partida de streak (reabrir run encerrada).
- Recuperação de senha / verificação de email / OAuth social.
- Papéis/permissões entre usuários (admin), compartilhamento de times entre usuários.
- Preservar timestamps individuais das partidas legadas (só os agregados são migrados).
- Registrar partida "como killer" (explicitamente inexistente por decisão de produto).

---

## Estado atual (ancorado no código)

- **Sem autenticação.** `src/app/page.tsx:8` busca todos os killers direto do Prisma; não há sessão,
  middleware nem lib de auth em `package.json`.
- **Schema** (`prisma/schema.prisma`): só `Killer` (com contadores `wins`/`losses` — linhas 19-20 — e
  relação `matches`) e `Match` (`killerId`, `result` enum win/loss, `createdAt`). Sem `User/Player/Team`.
- **Win/loss é dupla-escrita transacional**: `src/app/api/killers/[id]/win/route.ts:16-24` incrementa
  `Killer.wins` **e** cria um `Match`. `loss` e os `undo` espelham (decrementa contador + apaga último match).
- **"Streak" hoje = métrica computada**: `src/lib/utils.ts:19-38` (`computeStreaks`) calcula a maior
  sequência win/loss; exposto em `src/app/api/stats/streaks/route.ts` (global + perKiller) e exibido como
  "Best Win Streak / Worst Loss Streak" em `src/components/organisms/StatisticsOverview.tsx:58-59`.
  Consumido pelo hook `src/hooks/useStreaks.ts`.
- **"Team" hoje = lista hardcoded decorativa**: `src/components/templates/TeamTabTemplate.tsx:4-81`
  (`TEAM_PLAYERS` com name, nick, killer main, survivor main), renderizada por
  `src/components/organisms/PlayerCard.tsx`. Não está no banco.
- **Abas**: killers / statistics / team / history — `src/components/templates/AppShell.tsx:7-12`,
  `src/components/molecules/TabNav.tsx:7`.
- **Stack**: Next 16 (App Router, React Compiler ligado), React 19, Prisma 5 + Postgres, Tailwind v4,
  Vitest. Regras do `CLAUDE.md`: teste co-localizado obrigatório; UI em inglês; sem `useCallback/useMemo/memo`;
  ref callbacks no lugar de `useEffect`; usar tokens de cor; Prisma singleton em `src/lib/prisma.ts`.

---

## Decisões (fechadas)

| Decisão | Escolha | Por quê |
|---------|---------|---------|
| Escopo de usuários | Multiusuário, **killers globais** | Isolar dados de jogo por usuário; catálogo de killers é referência compartilhada |
| Mecanismo de auth | **Auth.js v5** (Credentials, sessão JWT, bcrypt) | Padrão de mercado, robusto; sem adapter de DB (JWT) |
| Streak × stats do killer | **Ledger unificado**, aba Killers mantida | Uma fonte de verdade (`Match`); Killers segue existindo |
| Perspectiva | **Sobreviventes**; "time vence = killer perde" | Não existe partida jogada como killer; toda stat é da ótica da equipe |
| Fonte de verdade win/loss | `Match` (ganha `userId`, `teamId`) | Contadores por killer viram **computados por usuário** |
| Contadores `Killer.wins/losses` | **Removidos** do schema | Computados por usuário a partir de `Match`; evitam drift |
| Streak | **Entidade persistida** (`StreakRun`) | Histórico de sequências encerradas + detalhamento |
| Aba Killers (+/-) | **Log rápido** sem time (`teamId` nulo) | Lançamento avulso na ótica do sobrevivente |
| Player | Só `name` + `nick` | Requisito do produto; descarta killer/survivor main do card atual |
| Team | 1–4 players, **com nome**, editável, player reutilizável | Flexível; nome identifica no detalhamento |
| Detalhamento por time | **Resumo + timeline** | Streak atual/recorde/win rate + partidas cronológicas |
| Migração legada | Regenera `Match` da conta padrão dos contadores, **sem inversão** | Preserva os números; ótica de sobrevivente já era a intenção |
| Métrica antiga de streak | Mantida, porém **por usuário** e **renomeada** (Longest Win/Loss Run) | Desambiguar da nova Streak de time |

> **Nota:** o backup revelou um schema **`neon_auth`** já provisionado (tabelas `user`, `session`,
> `account`, `verification`… **vazias**) — é o **Neon Auth** nativo. Foi avaliado e **descartado**:
> decisão **confirmada em Auth.js v5** (2026-07-12). As tabelas `neon_auth` vazias podem ser removidas
> depois se não forem usadas.

---

## Regras de negócio

1. **Partida (`Match`)** sempre pertence a um usuário, referencia um killer enfrentado, e tem `result`
   na ótica da equipe: `win` = a equipe venceu (escapou); `loss` = a equipe perdeu.
2. Uma partida pode ter `teamId` (lançada na aba Streak) ou `teamId` nulo (log rápido na aba Killers).
3. **Stats por killer** (win/loss/winRate) de um usuário = agregação das partidas **daquele usuário**
   para aquele killer. Killers são globais (nome/imagem compartilhados).
4. **StreakRun** existe por `(usuário, time)`. **No máximo uma run `active` por time por usuário.**
5. Lançar partida de streak com `result=win`: se não houver run ativa do time, cria uma; incrementa
   `winCount`; vincula a partida à run.
6. Lançar partida de streak com `result=loss`: **encerra** a run ativa do time (`status=ended`,
   `endedAt=now`); a partida perdedora fica vinculada à run que encerrou (aparece na timeline). Se não
   havia run ativa, a derrota é registrada sem run (streak permanece 0).
7. **Streak atual** de um time = `winCount` da run ativa (0 se nenhuma). **Melhor streak** = maior
   `winCount` entre todas as runs do time. Total de partidas e win rate = das `Match` do time.
8. **Players e Times pertencem a um usuário**; só o dono os vê/edita. Time tem 1–4 players.
9. **Nick de player** é único por usuário. **Nome de time** único por usuário (premissa).
10. Rotas de dados exigem sessão; killers-GET retorna stats do usuário logado.

---

## Arquitetura da solução

```
Público:      /  (splash)   /login   /signup
Protegido:    /dashboard  → AppShell (tabs: Killers · Streak · Statistics · Team · History)
              /api/*  (exceto /api/auth e /api/signup) exigem sessão (middleware)

Auth.js v5 (Credentials, JWT) ── middleware.ts ──> protege /dashboard + /api
Prisma singleton (src/lib/prisma.ts)
User 1─* Player      User 1─* Team ─*─* Player (TeamPlayer)
User 1─* Match *─1 Killer(global)   Match *─0..1 Team   Match *─0..1 StreakRun
User 1─* StreakRun *─1 Team
```

Camadas seguem Atomic Design existente; API handlers finos; lógica de streak em util/serviço + rota.

## Fluxo completo

**Login/splash:** usuário anônimo em `/` vê a splash → clica "Enter" → `/login` → submete credenciais →
Auth.js valida (bcrypt) → sessão JWT → redireciona `/dashboard`. Sessão inválida em rota protegida →
redirect `/login`. `/signup` cria usuário (email único, senha hasheada) e faz login.

**Lançar streak (caminho feliz):** aba Streak → seleciona Time → seleciona Killer enfrentado
(`KillerAutocomplete` reaproveitado) → escolhe Win/Loss → POST `/api/streaks/matches` → transação
cria `Match` + atualiza/`StreakRun` → UI atualiza streak atual do time (otimista) + timeline.

**Caminho de erro:** time sem players / killer inexistente / não autenticado / falha de transação →
resposta 4xx com mensagem; UI faz rollback do otimismo e mostra toast (`sonner`, já usado).

---

## Etapas detalhadas de implementação

### Banco de dados (Prisma)

Novo/alterado em `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String                 // hash bcrypt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  players   Player[]
  teams     Team[]
  matches   Match[]
  streaks   StreakRun[]
}

model Killer {                      // remove wins/losses
  id        Int      @id @default(autoincrement())
  name      String   @unique
  imageUrl  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  matches   Match[]
}

model Player {
  id        Int      @id @default(autoincrement())
  userId    String
  name      String
  nick      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  teams     TeamPlayer[]
  @@unique([userId, nick])
  @@index([userId])
}

model Team {
  id        Int      @id @default(autoincrement())
  userId    String
  name      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  members   TeamPlayer[]
  matches   Match[]
  streaks   StreakRun[]
  @@unique([userId, name])
  @@index([userId])
}

model TeamPlayer {
  teamId   Int
  playerId Int
  team     Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  @@id([teamId, playerId])
  @@index([playerId])
}

model Match {
  id          Int      @id @default(autoincrement())
  userId      String
  killerId    Int
  teamId      Int?
  streakRunId Int?
  result      Result
  createdAt   DateTime @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  killer      Killer    @relation(fields: [killerId], references: [id], onDelete: Cascade)
  team        Team?     @relation(fields: [teamId], references: [id], onDelete: SetNull)
  streakRun   StreakRun? @relation(fields: [streakRunId], references: [id], onDelete: SetNull)
  @@index([userId])
  @@index([killerId])
  @@index([teamId])
  @@index([createdAt])
}

model StreakRun {
  id        Int          @id @default(autoincrement())
  userId    String
  teamId    Int
  winCount  Int          @default(0)
  status    StreakStatus @default(active)
  startedAt DateTime     @default(now())
  endedAt   DateTime?
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  team      Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  matches   Match[]
  @@index([userId])
  @@index([teamId])
}

enum Result       { win loss }
enum StreakStatus { active ended }
```

- **Constraint "uma run ativa por time"**: Prisma não modela unique parcial; adicionar migration SQL
  raw: `CREATE UNIQUE INDEX one_active_streak_per_team ON "StreakRun"("teamId") WHERE status='active';`
  (defesa em profundidade; a transação de lançamento também garante).
- Rodar `npm run db:generate` após alterar o schema.

### Migração de dados (`prisma/seed.ts` + script de migração)

> **Realidade do banco (confirmada por consulta em 2026-07-12; backup `neondb-20260712-160741.sql`):**
> **43 killers**. Divergência importante entre as duas fontes de win/loss:
> - **Contadores `Killer.wins/losses`** (= o que a UI mostra hoje): **322 W + 301 L = 623**.
> - **Ledger `Match`**: **244 W + 218 L = 462**.
> - **Gap = 78 W + 83 L = 161** partidas que só existem como contador (setadas no seed, sem `Match`),
>   distribuídas em 38 killers. **Sem deltas negativos** (contador ≥ match em todo killer) e **sem
>   matches órfãos** → migração determinística e sem perda. A **fonte de verdade adotada é o contador
>   (623)**, para preservar o que o usuário vê.

1. Criar/`upsert` do **User padrão** `francielidesouza78@gmail.com` com `password = bcrypt(env.SEED_DEFAULT_PASSWORD ?? "2003")`.
2. **Atribuir as 462 `Match` existentes** ao `userId = defaultUser.id` (`teamId = null`, `streakRunId = null`,
   `result` mantido — sem inversão).
3. **Reconciliar para o contador (idempotente):** para cada `(killer, result)`, garantir que a conta
   padrão tenha **exatamente `Killer.wins`/`Killer.losses`** partidas — gerar `alvo − existentes` `Match`
   sintéticas (`teamId = null`, `createdAt = now()` ou `killer.createdAt`). Como o alvo é o contador,
   rodar de novo não duplica. Pós-condição verificável: `SELECT` por killer bate com o contador; total = 623.
4. Remover colunas `wins/losses` de `Killer` (migration destrutiva — fazer **depois** dos passos 2–3).
5. `seed.ts` de killers passa a **não** setar `wins/losses` (só `name`/`imageUrl`).
6. Ordem: migrate schema aditivo (`Match.userId` nullable) → script de migração de dados →
   migration que torna `Match.userId` NOT NULL e dropa `Killer.wins/losses`.
7. **Validação pós-migração (obrigatória):** rodar query de conferência — soma de `Match` da conta padrão
   por resultado deve ser **322 W / 301 L**; nenhum `Match` sem `userId`.
8. **Rollback:** dump completo salvo em `backups/neondb-20260712-160741.sql`.

### Backend (API routes)

- **`src/auth.ts`** — config Auth.js v5: `Credentials({ authorize })` busca user por email, `bcrypt.compare`;
  `session: { strategy: "jwt" }`; callbacks para pôr `user.id` no token/sessão. Exporta `handlers`, `auth`, `signIn`, `signOut`.
- **`src/app/api/auth/[...nextauth]/route.ts`** — `export const { GET, POST } = handlers`.
- **`middleware.ts`** — usa `auth` para proteger `/dashboard` e `/api/*` (exceto `/api/auth`, `/api/signup`).
- **`POST /api/signup`** — DTO `{ email, password, name? }` (validar com `zod`); cria user (email único, hash); 201 ou 409.
- **`GET /api/killers`** — sessão obrigatória; retorna killers globais + `wins/losses/total/winRate` computados
  agregando `Match` do usuário (`groupBy killerId, result` ou agregação em memória).
- **`PATCH /api/killers/[id]/win` e `/loss`** — reescrever: apenas `prisma.match.create({ userId, killerId, result, teamId: null })`; retornar as stats recomputadas do killer.
- **`PATCH /api/killers/[id]/win/undo` e `/loss/undo`** — apagar a `Match` mais recente do usuário para
  aquele killer+result **com `teamId` nulo** (`findFirst orderBy createdAt desc` → `delete`).
- **Players**: `GET /api/players`, `POST /api/players` (`{ name, nick }`), `PATCH /api/players/[id]`,
  `DELETE /api/players/[id]` — todos escopados por `session.user.id`.
- **Teams**: `GET /api/teams` (com membros e resumo), `POST /api/teams` (`{ name, playerIds: number[] }`
  1–4), `PATCH /api/teams/[id]` (nome + membros), `DELETE /api/teams/[id]`.
- **Streak**: `GET /api/streaks` (por time: run ativa, melhor streak, total, winRate, timeline);
  `POST /api/streaks/matches` (`{ teamId, killerId, result }`) — transação com a lógica das regras 5–7.
- **`src/app/api/stats/streaks/route.ts`** — adicionar filtro `where: { userId: session.user.id }`;
  manter cálculo `computeStreaks` (renomeado no UI para "Longest Run").

Serviço de streak em `src/lib/streak.ts` (função pura testável): dado o estado da run ativa + resultado,
retorna as operações. Handler só orquestra a transação.

### Frontend

- **Splash** `src/app/page.tsx` (server) — checa `auth()`; se logado → `redirect('/dashboard')`; senão
  renderiza `SplashTemplate` (novo template, dark/terror, CTA → `/login`).
- **`/login` e `/signup`** — server pages + `LoginForm`/`SignupForm` (client, `signIn('credentials')` /
  fetch `/api/signup`), estilo splash.
- **`/dashboard/page.tsx`** — server: `auth()` + fetch inicial (killers per-user, teams, streaks); passa a
  `KillersPageClient` (mover a árvore atual de `page.client.tsx` para cá).
- **SessionProvider** — envolver o app client em `layout.tsx` (ou provider no dashboard).
- **AppShell/TabNav** — adicionar aba **Streak**; ordem sugerida: Killers · Streak · Statistics · Team · History.
- **Aba Team repaginada** (`TeamTabTemplate`) — substituir hardcode por dados do usuário: seção
  **Players** (lista + form de cadastro name/nick) e seção **Teams** (lista + builder que escolhe 1–4
  players). `PlayerCard` simplificado (só name/nick) ou novo `PlayerListItem`.
- **Aba Streak** (novo template) — formulário de lançamento (select Time, `KillerAutocomplete` para killer,
  toggle Win/Loss) + lista de times com **resumo** (streak atual/recorde/total/win rate) e **timeline**
  expansível (killer enfrentado, resultado, data).
- **Killers tab** — labels/tooltip deixando claro que o +/- é "quick log" da ótica da equipe.
- **Statistics** — renomear "Best Win Streak/Worst Loss Streak" → "Longest Win Run/Longest Loss Run".

### Hooks

- `useAuth`/uso de `useSession` (next-auth/react) para estado de sessão no client.
- `usePlayers`, `useTeams`, `useStreaks` (reescrever o atual para o novo conceito) — seguindo o padrão de
  `useKillers` (optimistic update + re-fetch, toasts em erro).
- `useKillers` — ajustar tipos/endpoint (stats per-user; win/loss agora criam Match).

### Infraestrutura

- **Envs/secrets**: `AUTH_SECRET` (obrigatório Auth.js), `NEXTAUTH_URL`/`AUTH_URL`, `SEED_DEFAULT_PASSWORD`.
  (Baseline: secrets em vault — não commitar.)
- Dependências novas: `next-auth@beta` (v5), `bcryptjs` (+ `@types/bcryptjs`), `zod`.

---

## Modelo de dados (resumo)

| Tabela | Coluna-chave | Notas |
|--------|--------------|-------|
| User | email unique, password(hash) | dono de players/teams/matches/streaks |
| Killer | name unique | **global**; sem wins/losses (computado) |
| Player | (userId, nick) unique | name, nick |
| Team | (userId, name) unique | 1–4 membros via TeamPlayer |
| TeamPlayer | PK (teamId, playerId) | m2m, cascade |
| Match | userId, killerId, teamId?, streakRunId?, result | fonte única de win/loss (ótica sobrevivente) |
| StreakRun | userId, teamId, winCount, status | 1 ativa por time (índice parcial) |

## Endpoints envolvidos

| Método | Path | Auth | Entrada | Resposta | Erros |
|--------|------|------|---------|----------|-------|
| GET/POST | `/api/auth/[...nextauth]` | — | Auth.js | sessão | 401 |
| POST | `/api/signup` | pública | `{email,password,name?}` | `{id,email}` | 400/409 |
| GET | `/api/killers` | sim | — | killers + stats do user | 401 |
| PATCH | `/api/killers/[id]/win\|loss` | sim | — | killer stats | 401/404 |
| PATCH | `/api/killers/[id]/win\|loss/undo` | sim | — | killer stats | 401/404 |
| GET/POST | `/api/players` | sim | `{name,nick}` | player(s) | 400/409 |
| PATCH/DELETE | `/api/players/[id]` | sim | `{name?,nick?}` | player / 204 | 403/404 |
| GET/POST | `/api/teams` | sim | `{name,playerIds[]}` | team(s) | 400/409 |
| PATCH/DELETE | `/api/teams/[id]` | sim | `{name?,playerIds?}` | team / 204 | 400/403/404 |
| GET | `/api/streaks` | sim | — | resumo+timeline por time | 401 |
| POST | `/api/streaks/matches` | sim | `{teamId,killerId,result}` | run+resumo atualizado | 400/403/404 |
| GET | `/api/stats/streaks` | sim | — | longest runs (por user) | 401 |

---

## Casos de erro & validações

| Situação | Detecção | Resposta |
|----------|----------|----------|
| Não autenticado em rota protegida | middleware / `auth()` | 401 (API) / redirect `/login` |
| Signup com email existente | unique violation | 409 |
| Team com 0 ou >4 players | validação zod | 400 |
| playerId de outro usuário no time | checar ownership | 403 |
| killerId inexistente ao lançar | FK/lookup | 404 |
| Lançar streak em time sem players | validação | 400 |
| Undo sem match correspondente | `findFirst` nulo | 404 |
| Falha na transação de streak | try/catch | 500 + rollback otimista no client |

## Impactos

- **Quebra testes existentes**: `useKillers.test`, `killers/[id]/win|loss(/undo)/route.test`,
  `stats/streaks/route.test`, `useStreaks.test`, e qualquer teste que assuma `Killer.wins/losses` no DB.
  Atualizar todos.
- `page.tsx`/`page.client.tsx` mudam de lugar (dashboard) — ajustar imports/roteamento.
- `computeStats` continua, mas `wins/losses` passam a vir computados (não do DB).
- `TeamTabTemplate` e `PlayerCard` reescritos (hardcode → dados reais).
- Métrica antiga de streak renomeada no UI (evitar confusão com nova Streak).

---

## Riscos

- **Migração destrutiva (drop wins/losses) (severidade: alta):** perda irreversível se mal executada.
  _Mitigação:_ backup do banco antes; migration em 2 fases (aditiva → destrutiva); script idempotente com guard.
- **Dupla-contagem na migração (média):** se regenerar `Match` dos contadores **e** manter `Match`
  legadas. _Mitigação:_ escolher uma única fonte (regenerar dos contadores e descartar/ignorar legadas),
  documentado no script.
- **Segurança de auth/credenciais (média — superfície sensível):** senha em texto, sessão, CSRF.
  _Mitigação:_ bcrypt, cookie httpOnly assinado (Auth.js cuida), `AUTH_SECRET` em env; nunca logar senha.
  _Revisão humana recomendada antes de expor publicamente._
- **Concorrência em StreakRun (baixa):** duas partidas simultâneas do mesmo time. _Mitigação:_ transação +
  índice único parcial de run ativa.
- **React Compiler / Next 16 + Auth.js v5 (baixa/média):** v5 é beta. _Mitigação:_ fixar versão; smoke test de login.

## Estratégia de rollback

- Migration reversível para as partes aditivas; a fase destrutiva (drop colunas) só após validar dados.
- Backup do dump antes de migrar (restaura o estado single-user).
- Auth atrás de env: sem `AUTH_SECRET` o app não sobe → deploy controlado; feature em branch até validar.
- Reverter é `git revert` do range + restore do dump.

---

## Plano de testes

- **Unit:** `src/lib/streak.ts` (transições: 1ª vitória cria run; vitórias incrementam; derrota encerra;
  derrota sem run ativa; recorde). `computeStats` per-user. Hash/verify de senha (mock bcrypt).
- **Integração (rotas, Prisma mockado no boundary):** signup (201/409); killers GET per-user; win/loss
  cria/undo apaga Match; players CRUD + ownership; teams validação 1–4 + ownership; streak POST cobre as
  regras 5–7; rotas protegidas retornam 401 sem sessão.
- **Componentes:** LoginForm/SignupForm (submit, erro); Team tab (cadastra player, monta time);
  Streak tab (lança partida, streak zera na derrota, timeline). Splash renderiza CTA.
- **E2E/regressão:** fluxo login → dashboard; garantir que Killers tab (quick log) e Statistics seguem
  funcionando com stats per-user; suíte antiga atualizada verde.

## Critérios de aceite

- [ ] Anônimo vê splash; não acessa dashboard/APIs de dados (401/redirect).
- [ ] Login/signup funcionam; conta padrão loga com a senha do seed e vê os números migrados (sem inversão).
- [ ] Cadastro de Player (name, nick) e montagem de Time (1–4) persistem por usuário.
- [ ] Lançar partida na aba Streak (time + killer + resultado) cria Match e atualiza a streak do time.
- [ ] Derrota **zera** a streak (run encerrada); vitória seguinte inicia nova run.
- [ ] Detalhamento por time mostra resumo + timeline.
- [ ] Stats por killer são por usuário; quick log +/- na aba Killers funciona (ótica sobrevivente).
- [ ] `npm run test`, `npm run lint`, `npm run build` verdes; toda peça nova com teste co-localizado.

---

## Estimativa de complexidade

| Fase | Otimista | Provável | Pessimista |
|------|:--------:|:--------:|:----------:|
| 1. Auth + schema multiusuário + middleware | 1d | 2d | 3d |
| 2. Migração de dados + refactor Match/stats per-user + Killers quick-log | 1d | 1.5d | 2.5d |
| 3. Players + Teams (CRUD + UI) | 1d | 1.5d | 2.5d |
| 4. Módulo Streak (StreakRun + lançamento + detalhamento) | 1.5d | 2.5d | 4d |
| 5. Splash + login/signup UI + polish | 0.5d | 1d | 2d |
| Testes transversais (incl. atualizar suíte antiga) | 0.5d | 1d | 2d |
| **Total** | **~5.5d** | **~9.5d** | **~16d** |

> Complexidade geral: **alta** (auth + multi-tenancy + refactor de conceito + módulo novo). Solo dev.
> Não inclui aprovações externas.

## Dependências

- Ordem entre fases: 1 → 2 → (3 ∥ 4) → 5. Fase 4 depende de Times (parte da 3).
- Envs/secrets: `AUTH_SECRET`, `NEXTAUTH_URL/AUTH_URL`, `SEED_DEFAULT_PASSWORD`.
- Dependências npm: `next-auth@beta`, `bcryptjs`, `@types/bcryptjs`, `zod`.
- **Backup do banco** antes da migração destrutiva.

---

## Checklist final (Definition of Done)

- [ ] Auth multiusuário + splash + dashboard protegido entregues e testados.
- [ ] Migração executada; conta padrão com números preservados; colunas legadas removidas.
- [ ] Match como fonte única; stats por killer per-user; Killers quick-log ok.
- [ ] Players/Teams CRUD por usuário; Streak com zeragem na derrota + detalhamento.
- [ ] Testes unit/integração/componente verdes; suíte antiga atualizada.
- [ ] `lint`/`build`/typecheck verdes; UI 100% em inglês.
- [ ] Segurança de auth conforme baseline (bcrypt, cookie httpOnly, secret em env); sem regressão nas abas existentes.

## Itens futuros (fora do escopo)

- 🔭 Undo de partida de streak (reabrir run).
- 🔭 Recuperação de senha / verificação de email / OAuth.
- 🔭 Compartilhar times/streaks entre usuários; papéis (admin).
- 🔭 Preservar timestamps das partidas legadas na migração.
- 🔭 Métricas avançadas (streak por killer, heatmaps).
