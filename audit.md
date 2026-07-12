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
| 🟠 MÉDIO  | 19    | 5           | 5         | 9          |
| 🟢 BAIXO  | 13    | 2           | 5         | 6          |
| **Total** | **35**| **10**      | **10**    | **15**     |

> ✅ **Fase 0 (ALTO) fechada.** ✅ **Fase 1 (gate) fechada:** `tsc` limpo (**M19**), CI criado (**M16**), deps ajustadas (**B5/B6**).
> ✅ **M1 (auth) e M17/M18 (contadores) resolvidos pelo refactor.** Gate atual: `lint` ✅ · `test` ✅ (242) · `tsc --noEmit` ✅ (0 erros).
> ⚠️ **Falta 1 passo manual no GitHub:** habilitar branch protection em `master` + marcar o job `verify` como *required check*. Como o deploy é automático no merge, sem isso o CI roda mas **não bloqueia** um merge vermelho.
> Próximo foco sugerido: **M4/M5** (padronizar erros de API) e **M11** (streaks escalável).

---

## 🗺️ Roadmap recomendado (ordem de ataque)

| Fase | Foco | Itens | Esforço | Resultado |
|------|------|-------|---------|-----------|
| **0** ✅ | Quick wins — zerar ALTO | A1, A2, A3 | Baixo | Sem crashes / sem corrupção de dados |
| **1** ✅ | Reparar gate de qualidade | M19, M16, B5, B6 | Baixo | tsc/lint/test verdes; CI criado (falta só branch protection) |
| **2** | Robustez de API & dados | M4, M5, M6, M11 | Médio | Erros consistentes, streaks escalável |
| **3** | Segurança / hardening | M2, M3 | Médio | Rate limit + headers/CSP |
| **4** | Next.js & performance | M8, M9, M10 | Médio | Boundaries, streaming, LCP |
| **5** | Acessibilidade (AA) | M12, M13, M14, M15, B8, B9, B10 | Médio | WCAG AA no essencial |
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

### 🟡 M4 — Erro mapeado como 404 mascara 500 (e engole o erro)
- **Arquivos:** `src/app/api/killers/[id]/win/route.ts:27-32`, `loss/route.ts:27-32` **(ainda ruins)**; `win/undo` e `loss/undo` **(corrigidos)**.
- **Situação (verificada):** as rotas de **undo** já distinguem erro (`console.error` + `500`) e devolvem `404` só quando o killer não existe. As rotas de **win/loss (create)** ainda fazem `catch { return 404 }` — engolem qualquer falha de DB como "Killer not found", sem log.
- **Correção:** aplicar o mesmo padrão das rotas de undo nas rotas de win/loss: logar server-side e devolver `500` para erro genérico; `404` só para killer inexistente (FK/`P2025`).
- **DoD:** killer inexistente → 404; erro genérico de DB (mock) → 500; ambos com teste.
- **Status:** 🟡 Parcial — falta win/loss (create).

### 🟡 M5 — Rotas sem try/catch
- **Arquivos:** `src/app/api/history/route.ts` **(ok)**; `src/app/api/stats/streaks/route.ts` **(ainda sem try/catch)**.
- **Situação (verificada):** `/api/history` já tem `try/catch` + log + `500`. `/api/stats/streaks` **não** — `findMany` + cômputo rodam sem proteção; erro de DB vira `500` não tratado e sem log. (Rotas de killers já têm try/catch.)
- **Correção:** padronizar try/catch + `console.error` + `500` em `stats/streaks` (mesmo padrão de M4).
- **DoD:** teste com Prisma lançando → `500` controlado.
- **Status:** 🟡 Parcial — falta `stats/streaks`.

### 🟡 M6 — Validação de schema (zod) nas bordas
- **Arquivos:** rotas de API (params/query/body)
- **Situação (verificada):** `zod@4.4.3` entrou como dependência e **já é usado** em `players`, `teams`, `streaks/matches`, `signup` e `auth.ts`. As rotas de **killers** (`win`/`loss`/`undo`) e **history** ainda validam ad-hoc (`isNaN`, `Number.parseInt`).
- **Correção:** helper de parse com zod para `id`/`page`; retornar `400` em input inválido; aplicar nas rotas de killers/history.
- **DoD:** schema por rota; teste de input inválido → 400.
- **Status:** 🟡 Parcial — adotado nas rotas novas; falta killers/history.

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

### ⬜ M2 — Sem rate limiting
- **Arquivos:** rotas de mutação; `src/proxy.ts`
- **Problema:** `proxy.ts` só faz redirect de auth para `/dashboard`; não há rate limit. Spam de writes infla `Match` sem limite.
- **Correção:** rate limit por IP/rota (no `proxy.ts` ou lib dedicada).
- **DoD:** N+1 requisições rápidas → 429; teste.
- **Status:** ⬜ Pendente.

### ⬜ M3 — Sem headers de segurança / CSP
- **Arquivos:** `next.config.ts` (sem `headers()`), `src/proxy.ts` (não injeta headers).
- **Problema:** falta CSP, `frame-ancestors`/X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS.
- **Correção:** `headers()` no `next.config.ts` (ou no `proxy.ts`) com o conjunto padrão de hardening.
- **DoD:** headers presentes na resposta (`curl -I`).
- **Status:** ⬜ Pendente.

### ⬜ M8 — Sem `error.tsx` / `not-found.tsx` / `global-error.tsx`
- **Arquivos:** ausência em `src/app/`
- **Problema:** qualquer throw cai na tela de erro padrão / branca, sem `reset()`. Amplifica A3.
- **Correção:** criar `app/error.tsx` (client boundary com `reset`) e `app/not-found.tsx`.
- **DoD:** simular erro em componente → boundary aparece com botão de retry.
- **Status:** ⬜ Pendente.

### ⬜ M9 — `force-dynamic` sem `loading.tsx` / Suspense (sem streaming)
- **Arquivo:** `src/app/dashboard/page.tsx:7` (era `src/app/page.tsx`)
- **Problema:** `export const dynamic = "force-dynamic"` + `await getKillersForUser(...)` bloqueiam o 1º paint; sem skeleton/loading no App Router.
- **Correção:** adicionar `app/dashboard/loading.tsx` e/ou `<Suspense>`. Avaliar `revalidate` se a frescura permitir.
- **DoD:** skeleton visível durante o carregamento inicial do dashboard.
- **Status:** ⬜ Pendente.

### ⬜ M10 — `next/image` com `unoptimized`
- **Arquivos:** `src/components/atoms/KillerImage.tsx:29`, `src/components/molecules/AutocompleteOption.tsx:30` (ambos com `unoptimized`). `MatchItem.tsx` e `KillerDetailPanel.tsx` **não** usam — inconsistente.
- **Problema:** PNGs full-size da wikia servidos sem resize/webp.
- **Correção:** remover `unoptimized` (hosts já em `remotePatterns`); padronizar todos os `<Image>`.
- **DoD:** imagens via `/_next/image`; LCP melhora perceptível.
- **Status:** ⬜ Pendente.

### ⬜ M11 — `/api/stats/streaks` carrega todos os `Match` em memória por request
- **Arquivo:** `src/app/api/stats/streaks/route.ts:13-17`
- **Problema:** `findMany` sem limite + cômputo na aplicação a cada request, sem cache; refetch a cada mudança de `totalMatches`.
- **Correção:** agregar/limitar em SQL, cachear (`revalidate`/tag) ou computar streak incremental.
- **DoD:** endpoint não escala linearmente com o histórico total; teste do cômputo mantido.
- **Status:** ⬜ Pendente. (Combina com **M5** — mesmo arquivo.)

### ⬜ M12 — Autocomplete sem semântica ARIA de combobox
- **Arquivos:** `src/components/molecules/KillerSearchInput.tsx:30-42`, `src/components/organisms/KillerAutocomplete.tsx:56-72`, `src/components/molecules/AutocompleteOption.tsx`
- **Problema:** input sem `role=combobox`/`aria-expanded`/`aria-controls`/`aria-activedescendant`; dropdown sem `role=listbox`; opções sem `role=option`/`aria-selected`.
- **Correção:** seguir o padrão APG Combobox; ligar `aria-activedescendant` ao `highlightedIndex`.
- **DoD:** navegação por teclado anunciada por leitor de tela; teste dos atributos.
- **Status:** ⬜ Pendente. (Fazer junto de **B9**.)

### 🟡 M13 — Pie chart: paleta de vermelhos e alternativa acessível
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx:20-24,81-103`
- **Situação (verificada):** paleta `BLOOD_PALETTE` de **15 tons de vermelho** quase idênticos persiste; o `<svg>` ainda não tem `role=img`/`<title>`. **Porém** já existe uma **legenda textual** (`<ul>` com nome + cor, linhas 93-103) — uma alternativa não-visual parcial.
- **Correção:** paleta distinguível (ou padrões/hachuras) + `role="img"`/título acessível no gráfico. Ver skill `dataviz` para paleta categórica.
- **DoD:** segmentos distinguíveis; alternativa não-visual completa.
- **Status:** 🟡 Parcial — legenda existe; paleta/`role` faltam. (Combina com **B10**.)

### ⬜ M14 — Sem `prefers-reduced-motion`
- **Arquivo:** `src/app/globals.css` (`pulseRing` infinito na `.player-avatar-ring:162`, `scroll-behavior: smooth:57`, `fadeInUp`, `shimmerBlood`)
- **Problema:** animações rodam sem opção de reduzir; `pulseRing` é `infinite`.
- **Correção:** `@media (prefers-reduced-motion: reduce)` desativando/atenuando animações e o scroll suave.
- **DoD:** com reduced-motion no SO, animações param.
- **Status:** ⬜ Pendente.

### ⬜ M15 — Contraste `text-muted` abaixo de WCAG AA
- **Arquivo:** `src/app/globals.css:36`
- **Problema:** `--color-muted: #636366` sobre `--color-void: #0A0A0A` ≈ **3.3:1** (< 4.5:1), usado em muito texto secundário em `text-xs`.
- **Correção:** clarear o token p/ texto (~`#8e8e93`) ou reservar `#636366` só para não-textuais.
- **DoD:** contraste ≥ 4.5:1 no texto secundário.
- **Status:** ⬜ Pendente.

### 🟡 M16 — Sem CI/CD
- **Arquivo:** `.github/workflows/ci.yml` (criado)
- **Problema:** nada rodava `tsc --noEmit`, `eslint`, `vitest`, `next build` automaticamente. **Prova viva:** a regressão de tipos em **M19** passou despercebida justamente por não haver CI.
- **Feito (2026-07-12):** workflow `ci.yml` em push/PR para `master`: install (`npm ci`) → `prisma generate` → **typecheck** → lint → test → build. Roda em Node 20, com env dummy (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`) — CI não toca DB real. **Validado localmente:** os 4 passos passam (build compila todas as rotas como dinâmicas).
- **Falta (manual, no GitHub — não dá pra fazer via código):** habilitar **branch protection** em `master` e marcar o job `verify` como **required check**. Só então um merge vermelho fica bloqueado (crítico porque o deploy é automático no merge).
- **DoD:** workflow verde em um PR; merge bloqueado se falhar.
- **Status:** 🟡 Parcial — workflow pronto e validado; pendente o toggle de branch protection.

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

### ⬜ B1 — Duplicação de lógica de stats
- **Arquivo:** `src/components/organisms/StatisticsOverview.tsx:40-43` — reimplementa soma/win-rate em vez de reusar `@/lib/utils`.
- **Nuance:** hoje agrega um array **filtrado** (`target`), enquanto `computeStats` é por-killer; ainda assim o cálculo de `winRate` duplica `formatPercent`/lógica de utils.
- **Correção:** extrair um agregador em `lib/utils` e reusar (evita drift de fórmula).
- **Status:** ⬜ Pendente.

### ⬜ B2 — Doc/impl drift: "optimistic updates"
- **Arquivo:** `src/hooks/useKillers.ts:51-121` — `CLAUDE.md` e `README` dizem otimista, mas o código é **pessimista** (aguarda o servidor e só então `setKillers`).
- **Correção:** ajustar a doc **ou** implementar otimista + rollback (decidir).
- **Status:** ⬜ Pendente. (Combina com **B13**.)

### 🟡 B3 — `useKillers`: loading & `error` não exibido
- **Arquivo:** `src/hooks/useKillers.ts:29-32`
- **Situação (verificada):** o "single-slot" foi **parcialmente** resolvido — hoje há 4 slots (`loadingWin/Loss/UndoWin/UndoLoss`), cada um `number | null` (um id por tipo de ação). Ainda não é `Set<number>` (duas ações do mesmo tipo em paralelo se atropelam) e `error` continua só no toast, sem estado inline na UI.
- **Correção:** `Set<number>` por ação (se necessário paralelismo) e exibir `error` inline.
- **Status:** 🟡 Parcial.

### ⬜ B4 — Sinal de refetch frágil em streaks → **RESOLVIDO (essencial)**
- **Arquivo:** `src/components/templates/StatisticsTabTemplate.tsx:20-21`, `src/hooks/useStreaks.ts`
- **Situação (verificada):** o antipadrão `Date.now()` como nonce **sumiu**. Hoje `useStreaks(totalMatches)` refaz o fetch quando a **contagem de partidas** muda. O `eslint-disable exhaustive-deps` restante é do efeito de `statsNav?.nonce` (padrão legítimo de navegação), não das streaks.
- **Resíduo mínimo:** trocar 1 win por 1 loss mantém `total` constante e não dispara refetch (edge case).
- **Status:** ✅ Concluído (o problema descrito foi eliminado).

### 🟡 B7 — Animation-delay escala com índice global
- **Arquivo:** `src/components/molecules/MatchItem.tsx:25`
- **Situação (verificada):** antes ~800ms+; hoje `animationDelay: ${index * 40}ms`. Ainda **escala com o índice global** (sem teto e sem reset por página) → itens tardios do "Load more" ainda atrasam.
- **Correção:** delay relativo à página **ou** teto (ex.: `Math.min(index, 8) * 40`).
- **Status:** 🟡 Parcial — severidade reduzida.

### ⬜ B8 — `KillerCard` clicável (role=button) sem foco visível
- **Arquivo:** `src/components/organisms/KillerCard.tsx:43-58` — tem `role=button`/`tabIndex`/`onKeyDown`, mas **sem** `focus-visible` ring.
- **Correção:** adicionar `focus-visible` ring com token de cor.
- **Status:** ⬜ Pendente. (Fase 5 / a11y.)

### ⬜ B9 — Input de busca sem label acessível
- **Arquivo:** `src/components/molecules/KillerSearchInput.tsx:30` — o `<input>` não tem `aria-label`/`<label>` (só o botão de limpar tem).
- **Correção:** `aria-label` ou `<label>` visualmente oculto.
- **Status:** ⬜ Pendente. (Fazer junto de **M12**.)

### ⬜ B10 — Hex cru em componente/inline
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx:56,100` (`#10B981`, `#9ca3af`) + `BLOOD_PALETTE` (20-24) — viola "no raw color values".
- **Correção:** mover para tokens/CSS vars.
- **Status:** ⬜ Pendente. (Fazer junto de **M13**.)

### 🟡 B11 — Texto de UI em português (viola English-only)
- **Arquivos:** `prisma/seed.ts:7,49,77,126,147,154` (ainda "Trapper (Caçador)", "Huntress (Caçadora)", "Clown (Palhaço)", "Deathslinger (Mercenário)", "Twins (Gêmeos)", "Trickster (Trapaça)").
- **Situação (verificada):** o `TeamTabTemplate` **não** tem mais nomes PT hardcoded ("Spectro"/"Drácula"/"Clima Esquisito" sumiram) — virou data-driven por usuário. **Falta só o seed.**
- **Correção:** normalizar os nomes dos killers para inglês no `seed.ts`. (Locale `pt-BR` em datas continua permitido — ver `MatchItem.tsx:14`.)
- **Status:** 🟡 Parcial — só o seed remanesce.

### ⬜ B12 — `<Image src="">` (reaparece em novo componente)
- **Arquivos (original resolvido):** `TeamTabTemplate`/`PlayerCard` — `PlayerCard` foi removido; roster usa avatar com iniciais → **sem `src=""`**.
- **Reaparecimento (verificado):** `src/components/organisms/KillerDetailPanel.tsx` passa `imageUrl` direto ao `<Image>`; com `imageUrl` vazio o teste emite *"An empty string was passed to the src attribute"*.
- **Correção:** render condicional do fallback quando `imageUrl` vazio, em vez de `src=""`.
- **Status:** 🟡 Parcial — alvo original resolvido; **recorrência** no `KillerDetailPanel` a corrigir.

### ⬜ B13 — README/CLAUDE.md desatualizados (pioraram com o refactor)
- **Arquivos:** `README.md`, `CLAUDE.md`
- **Situação (verificada):** ambos descrevem o app **antigo**:
  - `README.md`: "Next.js 15", "42 killers", `page.tsx` como root, "optimistic feedback"; **sem** menção a auth/login, Teams, Streaks, histórico, dashboard.
  - `CLAUDE.md`: schema do `Killer` **com `wins`/`losses`** (removidos!), "42 killers", `force-dynamic` em `page.tsx`, "optimistic updates" em `useKillers`, só a API de killers.
- **Correção:** atualizar README e `CLAUDE.md` para: Next 16, auth/multiusuário, schema derivado de `Match`, novas rotas (players/teams/streaks/history/signup), páginas (login/signup/dashboard). Registrar a ADR de **M17** no `CLAUDE.md`.
- **Status:** ⬜ Pendente. **(Importante: o `CLAUDE.md` guia agentes — schema errado induz erro.)**

---

## ℹ️ Decisões / INFO / Sem achados

| ID | Item | Ação |
|----|------|------|
| I1 | `reactCompiler: true` no top-level | ✅ **Correto no Next 16** (estável). Nenhuma ação. |
| I2 | Injeção (SQL/NoSQL/cmd) | ✅ Sem achados — Prisma parametrizado em todas as rotas novas (players/teams/streaks); sem SQL cru. Manter. |
| I3 | XSS | ✅ Sem achados — sem `dangerouslySetInnerHTML`. Manter. |
| I4 | Secrets | ✅ `.env` ignorado. ⚠️ **Novo:** o refactor exige `AUTH_SECRET` (NextAuth) e `DATABASE_URL_UNPOOLED` (schema) — garantir que estão no vault/deploy e no `.env.example`. |
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

_Última atualização: 2026-07-12 — revisão completa contra o código atual pós-refactor (auth + multiusuário + Match como fonte única)._
_Progresso: 10/35 concluídos, 10/35 parciais, 15/35 pendentes. Gate: `lint` ✅ · `test` ✅ (242) · `tsc --noEmit` ✅ (0 erros). Fase 1 concluída (falta habilitar branch protection no GitHub — M16)._
