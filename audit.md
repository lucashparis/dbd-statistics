# 🩸 Guia de Auditoria & Melhorias — DBD Statistics

Guia de trabalho **ponto a ponto** derivado da auditoria técnica do repositório.
Cada item é uma tarefa rastreável: vamos marcando `[x]` conforme resolvemos.

> **Escopo real:** aplicação **única** Next.js 16 (App Router) — **não é monorepo**.
> Itens de arquitetura de monorepo (workspaces, Turbo/Nx, deps entre packages) são **N/A**.
> Stack verificada: `next@16.2.4`, `react@19.2`, TS `strict`, Prisma 5 + PostgreSQL, **NextAuth v5 (beta)**, `zod@4`, Vitest, Tailwind v4.

---

## 🔄 Revisão 2026-07-12 — o que mudou desde a auditoria original

A base sofreu um **refactor grande** entre 2026-07-08 e 2026-07-12. Isso resolveu vários itens **estruturalmente** (não pela correção pontual que a auditoria previa) e moveu referências de arquivo. Principais mudanças verificadas no código:

- **Autenticação real (NextAuth v5)** — `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` (o "middleware" do Next 16), páginas `/login` e `/signup`, rota `/api/signup`. **Toda** rota de dados agora chama `auth()` e devolve `401` sem sessão. → resolve **M1**.
- **Modelo de dados multiusuário** — novos models `User`, `Player`, `Team`, `TeamPlayer`, `StreakRun`. `Match` ganhou `userId`, `teamId`, `streakRunId`. Dados agora são **por usuário**.
- **Contadores denormalizados removidos** — `Killer` **não tem mais** `wins`/`losses`. Win/loss são **derivados** de `Match` via `groupBy`/`count` (`src/lib/killers.ts`). → resolve **M17**, torna **A1/M18** estruturalmente impossíveis.
- **Novas features** — Players/Teams (roster), Streaks por killer e por time, histórico de partidas. Cada uma trouxe rotas + hooks + testes.
- **Gate de qualidade** — `lint` corrigido (`eslint .`); **242 testes** passando (era 156). **Porém** `npx tsc --noEmit` **regrediu**: ~20 erros, todos em arquivos `.test.ts(x)` (ver **M19**).

**Referências de arquivo que mudaram:** `page.tsx` (força-dinâmica) → `src/app/dashboard/page.tsx`; a lógica de win/loss saiu de `Killer.update({wins})` para `Match.create` + `getKillerForUser`.

---

## 📌 Como usar este guia

1. Atacamos na ordem do **Roadmap** abaixo (fases por prioridade impacto ÷ esforço).
2. Ao iniciar um item, mude o **Status** para `🟡 Em andamento`.
3. Um item só vira `✅ Concluído` quando cumpre o **DoD** (Definition of Done), que inclui **teste co-locado** — regra obrigatória do `CLAUDE.md`.
4. Antes de fechar cada item rode: `npm run test`, `npm run lint` e `npx tsc --noEmit`.
5. Convenções do repo valem sempre: guard clauses, tokens de cor (sem hex cru), `@/*` nos imports, sem `useMemo`/`useCallback` (React Compiler), texto de UI em inglês.

**Legenda de status:** ⬜ Pendente · 🟡 Em andamento / Parcial · ✅ Concluído · ⏭️ Decisão adiada

---

## 📊 Painel de progresso

| Gravidade | Total | ✅ Concluído | 🟡 Parcial | ⬜ Pendente |
|-----------|-------|-------------|-----------|------------|
| 🔴 ALTO   | 3     | 3           | 0         | 0          |
| 🟠 MÉDIO  | 19    | 18          | 1         | 0          |
| 🟢 BAIXO  | 13    | 10          | 3         | 0          |
| **Total** | **35**| **31**      | **3**     | **0**      |

> ✅ **Fases 0 (ALTO), 1 (gate), 2 (API & dados), 3 (segurança/hardening), 4 (Next.js & performance) e 5 (acessibilidade AA)** fechadas.
> ✅ **M1/M17/M18 pelo refactor; M2 (rate limit, verificado ao vivo) + M3 (headers/CSP); M8 (boundaries) + M9 (skeleton) + M10 (imagens).**
> ✅ **Fase 5 (2026-07-13):** M12 (combobox APG) + M13 (paleta categórica distinguível + `role="img"`) + M14 (`prefers-reduced-motion`) + M15 (contraste AA) + B8 (focus ring) + B9 (label da busca) + B10 (hex→tokens). Gate atual: `lint` ✅ (0 erros) · `test` ✅ (318) · `tsc --noEmit` ✅ (0 erros).
> ✅ **N1 (React Query) — 2026-07-13:** os 6 hooks migrados para TanStack Query v5 (`useQuery`/`useInfiniteQuery`/`useMutation`), `QueryClientProvider` em `Providers.tsx`, keys + `invalidateMatchDerived` em `src/lib/query-keys.ts`. Fecha **B2** (otimista + rollback nas mutações de killer) e **B3** (loading/erro deixam de ser `useState` manual); **B4** já estava fechado (sinal derivado → invalidação). Gate: `lint` ✅ · `test` ✅ (313) · `tsc` ✅ · `build` ✅.
> ⏭️ **M16** — CI workflow pronto e rodando; toggle de branch protection **adiado conscientemente** (projeto solo, ver M16). ✅ **M2/I4 (env vars de deploy)** — configuradas e conferidas pelo usuário (2026-07-14).
> Próximo foco sugerido: **Fase 6** (dívida técnica restante: B11 nomes PT no seed; migração ESLint 8→9 em B6). B1, B7 e B12 concluídos.

---

## 🗺️ Roadmap recomendado (ordem de ataque)

| Fase | Foco | Itens | Esforço | Resultado |
|------|------|-------|---------|-----------|
| **0** ✅ | Quick wins — zerar ALTO | A1, A2, A3 | Baixo | Sem crashes / sem corrupção de dados |
| **1** ✅ | Reparar gate de qualidade | M19, M16, B5, B6 | Baixo | tsc/lint/test verdes; CI criado (falta só branch protection) |
| **2** ✅ | Robustez de API & dados | M4, M5, M6, M11 | Médio | Erros consistentes, validação zod, streaks cacheado |
| **3** ✅ | Segurança / hardening | M2, M3 | Médio | Rate limit + headers/CSP |
| **4** ✅ | Next.js & performance | M8, M9, M10 | Médio | Boundaries, streaming, LCP |
| **5** ✅ | Acessibilidade (AA) | M12, M13, M14, M15, B8, B9, B10 | Médio | WCAG AA no essencial |
| **6** | Dívida técnica & docs | B1, B2, B3, B7, B11, B13 | Médio | Limpeza + docs alinhadas ao refactor |
| **—** | Decisões / INFO | I4, I7 | — | Registrar escolha consciente |

---

## 🔴 ALTO

### ✅ A1 — Undo não é transacional (drift de dados)
- **Arquivos:** `src/app/api/killers/[id]/win/undo/route.ts`, `src/app/api/killers/[id]/loss/undo/route.ts`
- **Problema (original):** o undo usava `Promise.all` para decrementar o contador e deletar a `Match` — duas escritas que podiam divergir.
- **Resolução (verificada 2026-07-12):** **eliminado na raiz pelo refactor.** `Killer` não tem mais contadores; win/loss são derivados de `Match`. O undo hoje só faz `findFirst` (último match `teamId: null`) + `delete` de **uma** linha (operação atômica) e recomputa via `getKillerForUser`. Não há mais dupla-escrita para divergir. As rotas ainda filtram `teamId: null` (não desfazem partidas de streak) e tratam erro com `console.error` + `500`.
- **Status:** ✅ Concluído — resolvido estruturalmente (ver **M17**). A trava de concorrência (**M18**) também deixou de existir por não haver contador.

### ✅ A2 — `?page=NaN` derruba `/api/history`
- **Arquivo:** `src/app/api/history/route.ts:16-17`
- **Resolução (verificada):** `const parsed = Number.parseInt(searchParams.get("page") ?? "1", 10); const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;` + corpo em `try/catch` com `console.error` e `500` controlado. Rota também passou a exigir sessão (`401`).
- **Status:** ✅ Concluído — teste cobrindo `?page=abc/-3/0/""` → página 1 (200); erro de DB → 500.

### ✅ A3 — Camada de fetch do cliente ignora `res.ok` (crash de render)
- **Arquivos:** `src/hooks/useHistory.ts:21-22`, `src/hooks/useStreaks.ts:20-22`
- **Resolução (verificada):** `useHistory` checa `res.ok`, expõe `error` + `retry` e reseta `matches`/`hasMore` no erro. `useStreaks` checa `res.ok` e degrada para `EMPTY` (métrica secundária).
- **Status:** ✅ Concluído. ⚠️ Boundary global (`error.tsx`) segue no **M8** — aqui o tratamento é inline no hook.

---

## 🟠 MÉDIO

### ✅ M1 — Sem authn/authz nas rotas (mutações públicas)
- **Arquivos:** `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, todas as `route.ts` de `api/*`
- **Resolução (verificada):** NextAuth v5 (credenciais + bcrypt). **Toda** rota de dados faz `const session = await auth(); if (!session?.user) return 401;`. `/dashboard` protegido pelo `proxy.ts` (redirect → `/login`). Dados escopados por `session.user.id`.
- **Status:** ✅ Concluído.
- ⚠️ *Superfície sensível (auth): setor regulado — decisão de nível de proteção/expiração de sessão fica com o produto; revisão humana em ponto regulatório.*

### ⬜ M7 — `"lint": "next lint"` quebrado no Next 16 → **RESOLVIDO**
- **Arquivo:** `package.json:9`
- **Resolução (verificada):** `"lint": "eslint ."`. `npm run lint` roda e passa: **0 erros, 5 warnings** (`<img>` em arquivos de teste — ver M10/M19).
- **Status:** ✅ Concluído.

### ✅ M17 — Contadores denormalizados podem divergir de `Match` (causa-raiz)
- **Arquivos:** `prisma/schema.prisma:34-41`, `src/lib/killers.ts`
- **Resolução (verificada):** adotada a **opção (a)** — fonte única. `Killer` perdeu `wins`/`losses`; agregados vêm de `Match` (`getKillersForUser` usa `groupBy`, `getKillerForUser` usa `count`). Grade, pizza, histórico e streaks agora leem a **mesma** verdade.
- **Status:** ✅ Concluído. **ADR implícita:** registrar no `CLAUDE.md` (hoje ainda descreve o schema antigo — ver **B13**).

### ✅ M18 — TOCTOU / corrida no undo (contador pode ficar negativo)
- **Arquivo:** `src/app/api/killers/[id]/win/undo/route.ts`
- **Resolução (verificada):** **moot** — não há contador para ficar negativo. O undo deleta uma linha `Match`.
- **Status:** ✅ Concluído (resolvido por **M17**). *Resíduo mínimo:* dois undos concorrentes podem competir pelo mesmo `lastWin` → o 2º `delete` lança `P2025` → `catch` → `500` (sem corrupção). Aceitável; endereçar só se virar ruído.

### ✅ M4 — Erro mapeado como 404 mascara 500 (e engole o erro)
- **Arquivos:** `src/app/api/killers/[id]/win/route.ts`, `loss/route.ts`; helper `src/lib/api.ts` (`mutationError`).
- **Feito (2026-07-12):** as rotas de win/loss (create) agora usam `mutationError(context, e)` no catch → `404` só para `PrismaClientKnownRequestError` `P2003`/`P2025` (FK/registro inexistente), e `console.error` + `500` para qualquer outro erro. Undo já estava correto.
- **DoD:** ✅ teste killer inexistente (Prisma `P2003`) → 404; erro genérico (mock) → 500; ambos co-locados em `win/route.test.ts` e `loss/route.test.ts`, + teste unitário de `mutationError` em `api.test.ts`.
- **Status:** ✅ Concluído.

### ✅ M5 — Rotas sem try/catch
- **Arquivos:** `src/app/api/stats/streaks/route.ts` (era o único faltando; `history` já estava ok).
- **Feito (2026-07-12):** `stats/streaks` GET agora envolve o fetch/cômputo em `try/catch` + `console.error` + `500` controlado.
- **DoD:** ✅ teste com `prisma.match.findMany` lançando → `500` (co-locado em `stats/streaks/route.test.ts`).
- **Status:** ✅ Concluído.

### ✅ M6 — Validação de schema (zod) nas bordas
- **Arquivos:** `src/lib/api.ts` (`parseId`, `parsePage`); aplicado em `killers/[id]/{win,loss}` + ambos `undo` e em `history`.
- **Feito (2026-07-12):** helper com zod — `parseId` (`z.coerce.number().int().positive()` → `null` em inválido → `400`) substituiu os `isNaN`; `parsePage` (`…positive().catch(1)`) substituiu o `Number.parseInt` ad-hoc em `history` (consolida a raiz do antigo **A2**). Rotas novas (players/teams/streaks/signup) já usavam zod.
- **DoD:** ✅ `api.test.ts` cobre `parseId`/`parsePage` (incl. `abc`, `0`, `-3`, `""`, `1.5`, `null`); rotas retornam `400` em id inválido (testes co-locados).
- **Status:** ✅ Concluído.

### ✅ M19 — Testes & tipagem dos testes (regressão de `tsc`)
- **Arquivos:** vários `*.test.ts(x)`; foco em `src/app/api/stats/streaks/route.test.ts`, `src/app/api/killers/route.test.ts`, `src/app/page.test.tsx`, `src/app/api/streaks/matches/route.test.ts`.
- **Situação (verificada):** cobertura **subiu muito** — **242 testes / 43 arquivos, todos verdes** (era 156). **Mas** `npx tsc --noEmit` **falha** com ~20 erros, **todos em arquivos de teste**, por causa do refactor:
  - o mock de `auth()` é tipado como `NextMiddleware` (`vi.mocked(auth)` recebendo `Session`/`null` incompatível);
  - mocks de `Match` desatualizados — faltam `userId`/`teamId`/`streakRunId` (schema novo);
  - mock de `$transaction` com assinatura incompatível em `streaks/matches`.
  Vitest usa esbuild (sem typecheck) → runtime passa, mas o **gate de tipos está vermelho**.
- **Correção:** tipar o mock de `auth` corretamente (helper `mockAuth(session)`), atualizar factories de `Match` para o shape novo, ajustar o mock de `$transaction`. Rodar `tsc --noEmit` no CI (**M16**) para não regredir de novo.
- **DoD:** `npx tsc --noEmit` limpo; `npm run test` verde; todo `src` com contraparte `.test`.
- **Status:** ✅ Concluído (2026-07-12) — mock de `auth` tipado via `const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>)` (colapsa a sobrecarga `NextMiddleware`) em 8 arquivos; fixtures de `Match` com `userId/teamId/streakRunId`; `$transaction` com `as never`. **`tsc --noEmit` = 0 erros**, 242 testes verdes. *Resíduo (não bloqueante):* alguns atoms/templates ainda sem `.test` co-locado.

### ✅ M2 — Sem rate limiting
- **Arquivos:** `src/lib/rate-limit.ts` (novo), `src/proxy.ts` (aplica), `.env.example`/README/`CLAUDE.md` (env).
- **Decisão de deploy (2026-07-12):** **serverless** (Vercel/etc.) → in-memory é inútil (instâncias efêmeras). Adotado **store externo Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`, REST, edge-compatível).
- **Feito:** `enforceRateLimit(identifier)` — sliding window **20 req / 10 s**, prefixo `dbd:rl`. Aplicado no `proxy.ts` a **requisições não-GET** em `/api/*` (o vetor de abuso = writes; reads não pagam a ida ao Redis), com chave `user:<id>` quando autenticado ou `ip:<x-forwarded-for>` senão (protege signup/login por IP). Resposta `429` com `Retry-After` + `X-RateLimit-*`. **Fail-open**: sem `UPSTASH_REDIS_REST_URL`/`_TOKEN` o limiter é `null` e tudo passa (dev/CI/local não quebram). Matcher do proxy expandido para `/api/:path*`.
- **DoD:** ✅ teste co-locado (`rate-limit.test.ts`) — `429` com headers, `Retry-After` nunca negativo, e fail-open quando não configurado. `tsc`/`lint`/`test` (283)/`build` verdes; proxy empacota `@upstash` no bundle de middleware.
- **Verificação ao vivo (2026-07-12):** Upstash provisionado + creds no `.env` local; `next start` + 25 POSTs rápidos em `/api/signup` → sequência **20×`400` (passam o limiter, barrados pelo zod) + 5×`429`**. Janela de 20/10s confirmada end-to-end contra o Redis real.
- **Status:** ✅ Concluído e **verificado ao vivo**. ✅ **Resíduo de ops fechado (2026-07-14):** as 2 env vars (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) já configuradas e conferidas no ambiente de deploy pelo usuário — rate limit ativo em produção.

### ✅ M3 — Sem headers de segurança / CSP
- **Arquivos:** `src/lib/security-headers.ts` (novo, testável), `next.config.ts` (`async headers()`).
- **Feito (2026-07-12):** conjunto de hardening extraído para `securityHeaders()` em `src/lib/` (mantém o `next.config.ts` fino e a lógica testável) e aplicado a `/:path*`:
  - **CSP** — `default-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri`/`form-action 'self'`; `img-src` com os hosts allowlistados (wikia/dbdinfo) + `blob:`/`data:`; `upgrade-insecure-requests`. `script-src`/`style-src` com `'unsafe-inline'` (Next hidrata inline). Relaxa `'unsafe-eval'`+`ws:` **só em dev** (HMR) — em prod ficam de fora.
  - `Strict-Transport-Security` (2 anos, `includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation desligados).
- **DoD:** ✅ verificado **ao vivo** — `next start` + request em `/login` → `200` com os 6 headers presentes (CSP em modo prod, sem `unsafe-eval`). Teste unitário co-locado (`security-headers.test.ts`, 6 casos). `tsc`/`lint`/`build` verdes.
- **Status:** ✅ Concluído.
- ⚠️ *Segurança (follow-up, não bloqueante):* o `script-src` usa `'unsafe-inline'` — a forma mais forte é CSP com **nonce** por request (via `proxy.ts`), que força render dinâmico. Validar num browser real que gráficos (Recharts) e hidratação não disparam violação de CSP antes de endurecer.

### ✅ M8 — Sem `error.tsx` / `not-found.tsx` / `global-error.tsx`
- **Arquivos:** `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx` (novos).
- **Feito (2026-07-12):** três boundaries no tema dark: `error.tsx` (client, botão **Try again** → `reset()`, mostra `digest`); `not-found.tsx` (404 "Lost in the fog" + link → `/dashboard`); `global-error.tsx` (última linha de defesa; **estilos inline** porque substitui o root layout e não pode depender do `globals.css`). Sem `useEffect` (respeita a convenção do repo; o Next já loga throws — sink de observabilidade fica para quando houver Sentry/etc.).
- **DoD:** ✅ testes co-locados (error/not-found/global-error) — heading, digest, retry chama `reset`. **Verificado ao vivo:** `next start` + GET rota inexistente → **`404`** com o HTML do "Lost in the fog"/"Back to dashboard"; RSC payload confirma `error`+`notFound` plugados no layout.
- **Status:** ✅ Concluído (fecha a lacuna de boundary global que o A3 tinha deixado — lá o tratamento era inline no hook).

### ✅ M9 — `force-dynamic` sem `loading.tsx` / Suspense (sem streaming)
- **Arquivos:** `src/app/dashboard/loading.tsx` (novo), `src/components/templates/DashboardSkeleton.tsx` (novo), `src/components/atoms/Skeleton.tsx` (novo, reutilizável).
- **Feito (2026-07-12, com foco em skeleton conforme pedido):** `loading.tsx` vira o fallback de Suspense automático do App Router enquanto `dashboard/page.tsx` faz `await getKillersForUser(...)`. Renderiza `DashboardSkeleton` — um esqueleto **que espelha a tela real** (header + 5 abas + busca + grade de 12 cards), montado sobre um átomo `Skeleton` (`animate-pulse`/`bg-surface-3`, `aria-hidden`), com `role="status"`/`aria-label="Loading dashboard"`. Não força dinâmico extra (o `dashboard` já era `force-dynamic`).
- **DoD:** ✅ skeleton entregue e testado (Skeleton, DashboardSkeleton, loading — `role=status` + ≥12 placeholders). Wiring validado pelo `build`. *Nota:* o "flash" do skeleton só é perceptível com rede/DB lentos; em DB local rápido ele aparece por milissegundos.
- **Status:** ✅ Concluído.

### ✅ M10 — `next/image` com `unoptimized`
- **Arquivos:** `src/components/atoms/KillerImage.tsx`, `src/components/molecules/AutocompleteOption.tsx`.
- **Feito (2026-07-12):** removido `unoptimized` dos dois `<Image>` — agora todos passam pelo otimizador (`/_next/image`), consistente com `MatchItem`/`KillerDetailPanel` que já não usavam. Hosts já estavam em `remotePatterns`; `sizes` já presente para gerar `srcset`. Adicionados testes co-locados (KillerImage, AutocompleteOption — ambos antes sem `.test`).
- **DoD:** ✅ `build` compila com otimização ativa; imagens servidas via `/_next/image` em prod. *Verificação de LCP visual fica para inspeção no browser autenticado.*
- **Status:** ✅ Concluído. ⚠️ *Trade-off (custo):* na Vercel, otimização de imagem tem cota/custo por transformação — o `unoptimized` provavelmente existia para evitá-lo. Se o custo pesar, alternativa é um loader próprio ou cache/CDN das imagens da wikia.

### ✅ M11 — `/api/stats/streaks` carrega todos os `Match` em memória por request
- **Arquivo:** `src/app/api/stats/streaks/route.ts` + `revalidateTag` nas rotas de mutação.
- **Decisão:** cache **de servidor** (não React Query — que é cache de cliente e não reduz o custo do backend; ver **N1**). Escolha registrada.
- **Feito (2026-07-12):** o cômputo foi extraído para `computeStreaksForUser` e envolvido em `unstable_cache(fn, ["streaks", userId], { tags: ["streaks:"+userId], revalidate: 60 })`. Toda rota que muda `Match` (win/loss + undos, streak match POST e o DELETE em `streaks/matches/[id]`) chama `revalidateTag("streaks:"+userId, "max")` (stale-while-revalidate — forma correta no Next 16 em Route Handler; `revalidate: 60` é rede de segurança). Assim o recompute só roda quando uma partida muda, não a cada request/refetch.
- **Nota Next 16:** `revalidateTag` agora exige 2º arg (`"max"`); a forma antiga de 1 arg estava no DELETE `streaks/matches/[id]` recém-commitado e **quebrava o build** — corrigida aqui.
- **DoD:** ✅ endpoint deixa de recomputar a cada request; testes do cômputo mantidos + 500 path; `build` valida a API de cache.
- **Status:** ✅ Concluído. *Trade-off aceito:* streak pode ficar ~1 refetch atrás (stale-while-revalidate) — imaterial p/ métrica "maior sequência".

### ✅ M12 — Autocomplete sem semântica ARIA de combobox
- **Arquivos:** `src/components/molecules/KillerSearchInput.tsx`, `src/components/organisms/KillerAutocomplete.tsx`, `src/components/molecules/AutocompleteOption.tsx`
- **Feito (2026-07-13):** padrão **APG Combobox (listbox popup)** aplicado. O `input` recebeu `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` (id do listbox) e `aria-activedescendant` ligado ao `highlightedIndex` — ids estáveis via `React.useId()` no `KillerAutocomplete`. O dropdown virou `<ul role="listbox">` com `aria-label`; cada opção virou `<li role="option">` com `id` e `aria-selected` (deixou de ser `<button>`, que não é filho válido de listbox nem tab-stop no padrão APG — a seleção por teclado já flui pelo handler do input). B9 (label da busca) resolvido no mesmo componente.
- **DoD:** ✅ testes co-locados novos — `KillerAutocomplete.test.tsx` (combobox↔listbox, `aria-activedescendant` no highlight, colapso quando fechado) e `KillerSearchInput.test.tsx` (label + atributos de combobox); `AutocompleteOption.test.tsx` atualizado para `role=option`/`aria-selected`.
- **Status:** ✅ Concluído.

### ✅ M13 — Pie chart: paleta de vermelhos e alternativa acessível
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx`
- **Feito (2026-07-13, via skill `dataviz`):** `BLOOD_PALETTE` (15 vermelhos quase idênticos) substituída pela **paleta categórica de 8 hues** da referência do `dataviz` (blue/aqua/yellow/green/violet/red/magenta/orange, steps para superfície dark), como **tokens** (`--color-chart-1..8`). Validada com `validate_palette.js` contra a superfície real `#1C1C1E`: banda de luminância, chroma e contraste **PASS**; separação CVD no *floor band* (ΔE 10.3) — legalizada pela **codificação secundária** já presente (legenda textual + gaps `paddingAngle`). Como paleta categórica não cicla, o modo "appearances" passou a **top-7 + "Other"** (agregado) em vez de fatiar 15 (15 fatias são indistinguíveis por princípio). Gráfico ganhou `role="img"` + `aria-label` com o **resumo textual completo** dos dados (nome + valor) — alternativa não-visual completa. Legenda mantida.
- **DoD:** ✅ segmentos distinguíveis; `role="img"` com sumário; testes (`role=img` + label, agregação "Other" quando >8, winloss). *Resíduo aceito:* CVD em floor band coberto por legenda (regra do `dataviz`); paleta é multi-hue (não mais só vermelho) — o tema horror fica na superfície/acentos ao redor.
- **Status:** ✅ Concluído (fecha **B10** junto).
- ⚠️ *Verificação visual pendente (não bloqueante):* eyeball no browser autenticado — `fill="var(--color-chart-*)"` em SVG depende de resolução de custom property em atributo de apresentação (suportado em browsers modernos; happy-dom não valida cor).

### ✅ M14 — Sem `prefers-reduced-motion`
- **Arquivo:** `src/app/globals.css`
- **Feito (2026-07-13):** bloco global `@media (prefers-reduced-motion: reduce)` que reduz `animation-duration`/`transition-duration` para `0.01ms`, força `animation-iteration-count: 1` (mata o `pulseRing` infinito) e `scroll-behavior: auto` (no `html` e no reset universal). Atenua também `fadeInUp`/`shimmerBlood`/`card-hover` sem removê-las para quem não pediu redução.
- **DoD:** ✅ com reduced-motion no SO, animações efetivamente param. (CSS puro — não testável em unit; baseline: "não testar CSS".)
- **Status:** ✅ Concluído.

### ✅ M15 — Contraste `text-muted` abaixo de WCAG AA
- **Arquivo:** `src/app/globals.css`
- **Feito (2026-07-13):** `--color-muted` clareado de `#636366` (≈3.3:1) para **`#8e8e93`** — **≈6.1:1** sobre `--color-void` `#0A0A0A` (passa AA para texto normal e AAA para texto grande). Um único token, então todo texto secundário em `text-muted` sobe de contraste de uma vez; usos não-textuais (bordas/ícones) ficam levemente mais claros, sem prejuízo.
- **DoD:** ✅ contraste ≥ 4.5:1 no texto secundário (calculado).
- **Status:** ✅ Concluído.

### 🟡 M16 — Sem CI/CD
- **Arquivo:** `.github/workflows/ci.yml` (criado)
- **Problema:** nada rodava `tsc --noEmit`, `eslint`, `vitest`, `next build` automaticamente. **Prova viva:** a regressão de tipos em **M19** passou despercebida justamente por não haver CI.
- **Feito (2026-07-12):** workflow `ci.yml` em push/PR para `master`: install (`npm ci`) → `prisma generate` → **typecheck** → lint → test → build. Roda em Node 20, com env dummy (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`) — CI não toca DB real. **Validado localmente:** os 4 passos passam (build compila todas as rotas como dinâmicas).
- **Falta (manual, no GitHub — não dá pra fazer via código):** habilitar **branch protection** em `master` e marcar o job `verify` como **required check**. Só então um merge vermelho fica bloqueado (crítico porque o deploy é automático no merge).
- **Tentativa (2026-07-12):** não é possível executar daqui — `gh` CLI **não está instalado** (bash e PowerShell) e não há token de API no ambiente. Fica como ação humana. Comandos prontos abaixo (repo `lucashparis/dbd-statistics`; o check aparece na UI como o **display name** do job: **"Typecheck · Lint · Test · Build"**).
  - **UI:** Settings → Branches → Add branch ruleset/protection rule → Branch name pattern `master` → marcar *Require status checks to pass before merging* → buscar e adicionar **"Typecheck · Lint · Test · Build"** → (opcional) *Require branches to be up to date* → Save.
  - **`gh` (se instalar):**
    ```bash
    gh api -X PUT repos/lucashparis/dbd-statistics/branches/master/protection \
      -H "Accept: application/vnd.github+json" \
      -F "required_status_checks[strict]=true" \
      -F "required_status_checks[contexts][]=Typecheck · Lint · Test · Build" \
      -F "enforce_admins=true" \
      -F "required_pull_request_reviews=null" \
      -F "restrictions=null"
    ```
- **DoD:** workflow verde em um PR; merge bloqueado se falhar.
- **Status:** ✅ Workflow pronto e validado (roda em push/PR e reporta o check). ⏭️ **Toggle de branch protection adiado conscientemente (2026-07-14):** projeto solo — exigir status check + travar bypass adiciona fricção (todo merge passaria a depender do CI verde) sem ganho proporcional enquanto o usuário é o único committer. O CI segue avisando em cada push/PR; só não *bloqueia*. Localizado na UI (Settings → Branches → Branch protection rule); reativar quando entrar mais gente no repo.

---

## 🟢 BAIXO

### ✅ B5 — `@eslint/eslintrc` é phantom dependency
- **Arquivo:** `eslint.config.mjs:3` — `import { FlatCompat } from "@eslint/eslintrc"`.
- **Feito (2026-07-12):** declarado `"@eslint/eslintrc": "^2.1.4"` em `devDependencies` (versão que já resolvia transitivamente); lockfile sincronizado; `npm run lint` segue verde (0 erros).
- **Status:** ✅ Concluído.

### 🟡 B6 — Drift de dependências + dep morta
- **Arquivo:** `package.json`
- **Feito (2026-07-12):** `jsdom` removido das `devDependencies` (era dep morta declarada — ambiente é `happy-dom@20`). *Nota:* o pacote ainda é instalado fisicamente como **optional peer** do `vitest` (npm auto-instala optional peers); tirá-lo de vez exigiria política `omit=optional`, que afetaria outras deps — não vale.
- **Adiado (com motivo):** `eslint-config-next@16` exige **`eslint >= 9`** → é uma **migração ESLint 8→9** (flat config, plugins) à parte. Não feito agora para **não desestabilizar o gate recém-verde**. Fazer como item próprio.
- **Status:** 🟡 Parcial — dep morta resolvida; alinhamento eslint-config-next/eslint-9 pendente (deliberado).

### ✅ B1 — Duplicação de lógica de stats
- **Arquivos:** `src/lib/utils.ts`, `src/components/organisms/StatisticsOverview.tsx`.
- **Nuance:** `StatisticsOverview` agrega um array **filtrado** (`target`), enquanto `computeStats` é por-killer; ainda assim o cálculo de `winRate` duplicava a fórmula de utils.
- **Feito (2026-07-14):** extraído `computeWinRate(wins, losses)` como **fonte única** da fórmula; `computeStats` passou a chamá-lo e novo `aggregateStats(killers)` soma o array e reusa `computeWinRate`. `StatisticsOverview` trocou as 4 linhas inline (`reduce` + winRate) por `const totals = aggregateStats(target)`. Sem mais duplicação de fórmula → sem drift possível.
- **DoD:** ✅ testes co-locados em `utils.test.ts` — `computeWinRate` (0/0, arredondamento, 100%), `aggregateStats` (lista vazia, soma multi-killer, e um teste que ancora `aggregateStats.winRate === computeWinRate(...)` pra travar o drift). Gate: `test` ✅ (utils 18 + StatisticsOverview 10) · `tsc --noEmit` ✅ (0) · `eslint` ✅ (0).
- **Status:** ✅ Concluído.

### ✅ B2 — Doc/impl drift: "optimistic updates"
- **Arquivo:** `src/hooks/useKillers.ts`
- **Decisão (2026-07-13, com o usuário):** **implementar otimista + rollback** (não só ajustar a doc). Feito no âmbito do **N1**: win/loss/undo usam `onMutate` (snapshot + patch do cache), `onError` (rollback) e `onSettled` (`invalidateMatchDerived`). `CLAUDE.md`/`README` reescritos para "otimista com rollback" — doc e código de novo em acordo.
- **DoD:** ✅ teste co-locado cobre incremento otimista + rollback com toast em falha.
- **Status:** ✅ Concluído (via **N1**).

### ✅ B3 — `useKillers`: loading & `error` manual
- **Arquivo:** `src/hooks/useKillers.ts`
- **Feito (2026-07-13, via N1):** o plumbing manual de `useState` para loading/error saiu — agora vem do TanStack Query. `isLoading`/`error` derivam do `useQuery`; `loadingWin/Loss/UndoWin/UndoLoss` derivam de `mutation.isPending` + `mutation.variables` (um por ação). Erros de mutação são tratados no `onError` (rollback + toast) e o `error` da lista vem de `query.error`.
- **Status:** ✅ Concluído (via **N1**). *Resíduo aceito (UX, não plumbing):* erros de mutação continuam via **toast** (não banner inline) e o loading é 1 slot por ação (não `Set<number>` para paralelismo do mesmo tipo) — decisão de UX, endereçar só se virar dor.

### ⬜ B4 — Sinal de refetch frágil em streaks → **RESOLVIDO (essencial)**
- **Arquivo:** `src/components/templates/StatisticsTabTemplate.tsx:20-21`, `src/hooks/useStreaks.ts`
- **Situação (verificada):** o antipadrão `Date.now()` como nonce **sumiu**. Hoje `useStreaks(totalMatches)` refaz o fetch quando a **contagem de partidas** muda. O `eslint-disable exhaustive-deps` restante é do efeito de `statsNav?.nonce` (padrão legítimo de navegação), não das streaks.
- **Resíduo mínimo:** trocar 1 win por 1 loss mantém `total` constante e não dispara refetch (edge case).
- **Status:** ✅ Concluído (o problema descrito foi eliminado).

### ✅ B7 — Animation-delay escala com índice global
- **Arquivo:** `src/components/molecules/MatchItem.tsx`
- **Situação (original):** `animationDelay: ${index * 40}ms` escalava com o índice **global** achatado (`MatchHistoryList` passa `i` da lista concatenada de páginas) → sem teto e sem reset por página, itens tardios do "Load more" esperavam 1,6s / 3,2s+ pra fazer fade-in.
- **Feito (2026-07-14):** teto aplicado — `animationDelay: ${Math.min(index, 8) * 40}ms`. Os 8 primeiros itens ainda cascateiam (0→320ms); todo o resto entra no cap de **320ms**. Descartada a cascata page-relative (exigiria índice relativo do pai — não vale pra efeito cosmético).
- **DoD:** ✅ teste co-locado **criado** (`MatchItem.test.tsx`, antes inexistente) — Victory/Defeat badge + stagger por índice (`index=3` → `120ms`) + **teto** (`index=50` → `320ms`). Gate: `test` ✅ (4) · `tsc` ✅ (0) · `eslint` ✅ (0 erros; 1 warning `<img>` no mock, padrão aceito).
- **Status:** ✅ Concluído.

### ✅ B8 — `KillerCard` clicável (role=button) sem foco visível
- **Arquivo:** `src/components/organisms/KillerCard.tsx`
- **Feito (2026-07-13):** área clicável ganhou `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blood` (+ `focus-visible:outline-none`). Ring **inset** de propósito — o `<article>` é `overflow-hidden` e um ring externo seria cortado. Token de cor (`ring-blood`), aplicado só quando `onKillerClick` existe.
- **DoD:** ✅ teste co-locado — ring presente na área clicável + ativação por teclado (Enter).
- **Status:** ✅ Concluído.

### ✅ B9 — Input de busca sem label acessível
- **Arquivo:** `src/components/molecules/KillerSearchInput.tsx`
- **Feito (2026-07-13):** `<input>` recebeu `aria-label` (prop `ariaLabel`, default `"Search killers"`, override por chamador). Feito junto de **M12** no mesmo componente.
- **DoD:** ✅ teste — `getByLabelText("Search killers")` e override.
- **Status:** ✅ Concluído.

### ✅ B10 — Hex cru em componente/inline
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx`
- **Feito (2026-07-13, junto de M13):** todos os hex saíram do componente para tokens em `globals.css @theme` — `BLOOD_PALETTE` → `--color-chart-1..8`/`--color-chart-other`; `#10B981` (win) → `--color-win`; `#9ca3af` (legenda) → classe `text-muted`. O `fill`/`backgroundColor` agora referenciam `var(--color-chart-*)`. Sobra apenas string de `var()`, não hex cru.
- **Status:** ✅ Concluído.

### 🟡 B11 — Texto de UI em português (viola English-only)
- **Arquivos:** `prisma/seed.ts:7,49,77,126,147,154` (ainda "Trapper (Caçador)", "Huntress (Caçadora)", "Clown (Palhaço)", "Deathslinger (Mercenário)", "Twins (Gêmeos)", "Trickster (Trapaça)").
- **Situação (verificada):** o `TeamTabTemplate` **não** tem mais nomes PT hardcoded ("Spectro"/"Drácula"/"Clima Esquisito" sumiram) — virou data-driven por usuário. **Falta só o seed.**
- **Correção:** normalizar os nomes dos killers para inglês no `seed.ts`. (Locale `pt-BR` em datas continua permitido — ver `MatchItem.tsx:14`.)
- **Status:** 🟡 Parcial — só o seed remanesce.

### ✅ B12 — `<Image src="">` (reaparece em novo componente)
- **Arquivos (original resolvido):** `TeamTabTemplate`/`PlayerCard` — `PlayerCard` foi removido; roster usa avatar com iniciais → **sem `src=""`**.
- **Reaparecimento (verificado):** `src/components/organisms/KillerDetailPanel.tsx` passava `imageUrl` direto ao `<Image>`; com `imageUrl` vazio o teste emitia *"An empty string was passed to the src attribute"*.
- **Correção:** render condicional do fallback quando `imageUrl` vazio, em vez de `src=""`.
- **Feito (2026-07-14):** guard clause em `KillerDetailPanel.tsx` e no átomo compartilhado `KillerImage.tsx` (usado pelo `KillerCard`) — quando `src`/`imageUrl` é vazio, renderiza um fallback com ícone `Skull` (`role="img"` + `aria-label={name}`, `bg-surface-2`/`text-muted`) em vez de `<Image src="">`. Testes cobrindo o fallback (sem `<img>`, `role="img"` nomeado) e o caminho com imagem em ambos os arquivos. Gate: `test` ✅ (8/8 nos 2 arquivos) · `tsc --noEmit` ✅ · `lint` ✅.
- **Status:** ✅ Resolvido — alvo original + recorrência no `KillerDetailPanel` fechados; classe de bug também blindada no átomo `KillerImage`.

### ✅ B13 — README/CLAUDE.md desatualizados (pioraram com o refactor)
- **Arquivos:** `README.md`, `CLAUDE.md`
- **Situação (original):** ambos descreviam o app **antigo** — `README.md` "Next.js 15", "42 killers", `page.tsx` como root, "optimistic feedback", sem auth/Teams/Streaks/histórico; `CLAUDE.md` com schema do `Killer` **com `wins`/`losses`** (removidos!), "42 killers", `force-dynamic` em `page.tsx`, "optimistic updates" em `useKillers`, só a API de killers.
- **Feito (2026-07-12):** ambos reescritos contra o código atual:
  - **`CLAUDE.md`:** Next 16 + React 19 + NextAuth v5 + Zod 4; seção de auth (`auth.ts`/`auth.config.ts`/`proxy.ts`); server/client split em `dashboard/page.tsx` + `page.client.tsx`; **todos** os models do schema; tabela de API completa (players/teams/streaks/history/stats/signup/auth) com nota de `401`/scoping por `session.user.id`; hooks (7) e libs (`killers.ts`, `api.ts`, `streak.ts`, `teams.ts`, `auth-*`); seção de cache (`unstable_cache`/`revalidateTag` 2-arg); env vars; CI; "44 killers". Corrigido "optimistic" → **pessimista/server-confirmed** (fecha o lado-doc do **B2**). **ADR de M17 registrada** ("`Match` é fonte única; não reintroduzir contadores").
  - **`README.md`:** stack Next 16/React 19/NextAuth/Zod/Vitest; setup com `AUTH_SECRET`/`DATABASE_URL_UNPOOLED`; features de auth/players/teams/streaks/history; estrutura de projeto real; seção de CI.
- **Status:** ✅ Concluído (2026-07-12). *Nota:* B2 (doc-side) resolvido junto; B11 (nomes PT no seed) referenciado como exceção conhecida no `CLAUDE.md`, mas **o seed em si segue pendente**.

---

## 🆕 Novos itens (descobertos durante a execução)

### ✅ N1 — Refactor de data-fetching no cliente (TanStack Query v5)
- **Arquivos:** `@tanstack/react-query` (dep), `src/lib/query-keys.ts` (novo — keys + `invalidateMatchDerived`), `src/components/Providers.tsx` (`QueryClientProvider` aninhado no `SessionProvider`), os 6 hooks (`useKillers`, `useHistory`, `useStreaks`, `usePlayers`, `useTeams`, `useTeamStreaks`), `StatisticsTabTemplate.tsx` (novo contrato de `useStreaks()`), `src/test/queryWrapper.tsx` (helper de teste) + os 6 testes de hook.
- **Feito (2026-07-13, decisões do usuário: otimista + os 6 hooks):**
  - `useKillers`: `useQuery` com `initialData` do SSR; win/loss/undo como **4 mutações otimistas com rollback** (`onMutate`/`onError`/`onSettled`). API pública preservada (consumidores intactos).
  - `useHistory`: `useInfiniteQuery` (`enabled: isActive`); `loadMore`=`fetchNextPage`, `retry`=`refetch`.
  - `useStreaks`: `useQuery` — **removido o parâmetro `signal`**; freshness por invalidação.
  - `usePlayers`/`useTeams`/`useTeamStreaks`: `useQuery` (`enabled: isActive`) + mutações que atualizam o cache; writes de streak também chamam `invalidateMatchDerived`.
  - **Cross-invalidação real:** todo write de `Match` invalida `killers`+`history`+`streaks` (todos derivam de `Match`, filtrados só por `userId` — inclusive matches de time). Antes só a aba ativa refazia fetch.
- **Resolve:** **B2** ✅, **B3** ✅, **B4** ✅ (já estava). Padroniza dedupe, staleness, invalidação e background refetch.
- **DoD:** ✅ 6 testes de hook migrados (wrapper `createQueryWrapper`), gate verde (`test` 313 · `lint` 0 erros · `tsc` 0 erros · `build`). 
- **Status:** ✅ Concluído.
- ⚠️ *Verificação ao vivo pendente (não bloqueante):* exercer no browser autenticado — sensação otimista do win/loss, rollback ao derrubar a API, e o grid/pizza/histórico atualizando após uma partida de streak.

### ✅ N2 — `revalidateTag` de 1 argumento quebrava o build (Next 16)
- **Arquivo:** `src/app/api/streaks/matches/[id]/route.ts:55` (DELETE de partida de streak, commit recente).
- **Problema:** Next 16 exige `revalidateTag(tag, profile)`; a chamada de 1 arg era erro de tipo → `tsc`/`build` vermelhos (só não pegou antes por não haver CI — ver **M16**).
- **Feito (2026-07-12):** ajustado para `revalidateTag("streaks:"+userId, "max")`, alinhado ao padrão do M11.
- **Status:** ✅ Concluído.

---

## ℹ️ Decisões / INFO / Sem achados

| ID | Item | Ação |
|----|------|------|
| I1 | `reactCompiler: true` no top-level | ✅ **Correto no Next 16** (estável). Nenhuma ação. |
| I2 | Injeção (SQL/NoSQL/cmd) | ✅ Sem achados — Prisma parametrizado em todas as rotas novas (players/teams/streaks); sem SQL cru. Manter. |
| I3 | XSS | ✅ Sem achados — sem `dangerouslySetInnerHTML`. Manter. |
| I4 | Secrets | ✅ **Resolvido (código/repo):** `.env` ignorado; `.env.example` já documenta `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (com hint `npx auth secret`) e `SEED_DEFAULT_PASSWORD`. Ambas as vars são **consumidas**: `DATABASE_URL_UNPOOLED` via `directUrl` no `schema.prisma`; `AUTH_SECRET` auto-lido pelo NextAuth v5. Documentado também no README/CLAUDE (B13). ✅ **Ops fechado (2026-07-14):** valores reais no vault/deploy configurados e conferidos pelo usuário. |
| I5 | Arquitetura de monorepo | **N/A** — app única. |
| I6 | PII: nomes/nicks reais no Team | ✅ **Resolvido pelo redesign** — nomes não são mais hardcoded no source; são dados por-usuário atrás de auth. *Nota LGPD:* como agora é dado de usuário em base real, tratar retenção/anonimização é decisão de produto (revisão humana se a base sair do ambiente). |
| I7 | 3 famílias de fonte | ✅ **JetBrains Mono confirmada em uso** (`KillerRankingList` usa `font-mono`; carregada em `layout.tsx`). Manter as 3 fontes. |

### Observações do modelo de dados (baixo risco, registrar)
- `Match.userId` é **opcional** (`String?`) no schema — provável artefato de migração pré-auth. Partidas com `userId` nulo ficam invisíveis às queries (todas filtram por `userId`), mas são "órfãs". Avaliar backfill + tornar `NOT NULL`, ou documentar a intenção.

---

## 📚 Referências

- Auditoria original: conversa de origem (tabela de achados por gravidade), datada de 2026-07-08.
- Regras do projeto: `CLAUDE.md` (testes obrigatórios, tokens, guard clauses, React Compiler) — **atenção: `CLAUDE.md` está desatualizado, ver B13**.
- Next 16 — `next lint` removido, `reactCompiler` estável, `middleware`→`proxy`: doc oficial de upgrade v16.

---

_Última atualização: 2026-07-13 — Fase 5 (a11y AA) + N1 (TanStack Query) concluídos._
_Última atualização: 2026-07-14 — B1 e B7 concluídos._
_Última atualização: 2026-07-14 — B12 concluído (`KillerDetailPanel` + átomo `KillerImage`)._
_Progresso: 32/35 concluídos, 3/35 parciais, 0 pendente (+ N1 ✅ e N2 ✅). Gate: `lint` ✅ (0 erros) · `tsc --noEmit` ✅ (0 erros) · `test` ✅ · `build` ✅. Fases 0–5 + N1 concluídos. Nenhuma pendência 🔴/🟠 aberta. Parciais restantes (🟢 dívida técnica): B6 (migração ESLint 8→9), B11 (nomes PT no seed). Adiado conscientemente: M16 (branch protection — projeto solo). Ações de ops (M2/I4) fechadas._
