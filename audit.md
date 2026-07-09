# 🩸 Guia de Auditoria & Melhorias — DBD Statistics

Guia de trabalho **ponto a ponto** derivado da auditoria técnica do repositório.
Cada item é uma tarefa rastreável: vamos marcando `[x]` conforme resolvemos.

> **Escopo real:** aplicação **única** Next.js 15/16 (App Router) — **não é monorepo**.
> Itens de arquitetura de monorepo (workspaces, Turbo/Nx, deps entre packages) são **N/A**.
> Stack verificada: `next@16.2.4`, `react@19`, TS `strict`, Prisma 5 + PostgreSQL, Vitest, Tailwind v4.

---

## 📌 Como usar este guia

1. Atacamos na ordem do **Roadmap** abaixo (fases por prioridade impacto ÷ esforço).
2. Ao iniciar um item, mude o **Status** para `🟡 Em andamento`.
3. Um item só vira `✅ Concluído` quando cumpre o **DoD** (Definition of Done), que inclui **teste co-locado** — regra obrigatória do `CLAUDE.md`.
4. Antes de fechar cada item rode: `npm run test` e `npx tsc --noEmit` (e `eslint .` após corrigir M7).
5. Convenções do repo valem sempre: guard clauses, tokens de cor (sem hex cru), `@/*` nos imports, sem `useMemo`/`useCallback` (React Compiler), texto de UI em inglês.

**Legenda de status:** ⬜ Pendente · 🟡 Em andamento · ✅ Concluído · ⏭️ Decisão adiada

---

## 📊 Painel de progresso

| Gravidade | Total | Concluídos |
|-----------|-------|------------|
| 🔴 ALTO   | 3     | ✅ 3       |
| 🟠 MÉDIO  | 19    | 0          |
| 🟢 BAIXO  | 13    | 0          |
| **Total** | **35**| **3**      |

> ✅ **Fase 0 concluída** — os 3 ALTO foram corrigidos (156 testes verdes + tsc limpo). Próximo: **Fase 1** (gate de qualidade — M7, M16).

---

## 🗺️ Roadmap recomendado (ordem de ataque)

| Fase | Foco | Itens | Esforço | Resultado |
|------|------|-------|---------|-----------|
| **0** | Quick wins — zerar ALTO | A1, A2, A3 | Baixo | Sem crashes / sem corrupção de dados |
| **1** | Gate de qualidade | M7, M16, B5, B6 | Baixo | Lint + CI voltam a segurar regressões |
| **2** | Robustez de API & dados | M4, M5, M6, M17, M18 | Médio | API previsível, contadores confiáveis |
| **3** | Segurança / hardening | M1, M2, M3 | Médio | Mutações protegidas, headers/CSP |
| **4** | Next.js & performance | M8, M9, M10, M11 | Médio | Boundaries, streaming, LCP, escala |
| **5** | Acessibilidade (AA) | M12, M13, M14, M15, B8, B9 | Médio | WCAG AA no essencial |
| **6** | Qualidade, testes & docs | M19, B1–B4, B7, B10–B13 | Médio | Dívida técnica + DoD do repo |
| **—** | Decisões / INFO | I1, I6, I7 | — | Registrar escolha consciente |

---

## 🔴 ALTO

### ⬜ A1 — Undo não é transacional (drift de dados)
- **Arquivos:** `src/app/api/killers/[id]/win/undo/route.ts:24-32`, `src/app/api/killers/[id]/loss/undo/route.ts:24-32`
- **Problema:** o undo usa `Promise.all([...])` para (1) decrementar o contador e (2) deletar a `Match` — duas escritas independentes. Falha parcial deixa `Killer.wins/losses` divergente das linhas `Match`. As rotas de win/loss já usam `$transaction` corretamente; o undo não.
- **Correção:** usar transação interativa (resolve A1 e parte de M18):
  ```ts
  const killer = await prisma.$transaction(async (tx) => {
    const current = await tx.killer.findUnique({ where: { id: killerId } });
    if (!current) return null;
    if (current.wins === 0) return current;

    const last = await tx.match.findFirst({
      where: { killerId, result: "win" },
      orderBy: { createdAt: "desc" },
    });
    if (last) await tx.match.delete({ where: { id: last.id } });

    return tx.killer.update({
      where: { id: killerId },
      data: { wins: { decrement: 1 } },
    });
  });
  if (!killer) return NextResponse.json({ error: "Killer not found" }, { status: 404 });
  return NextResponse.json(killer);
  ```
  (Espelhar para `loss/undo` trocando `wins`→`losses` e `result: "loss"`.)
- **DoD:** ambas as rotas atômicas; teste que simula falha na deleção da `Match` e verifica que o contador **não** foi decrementado; `wins`/`losses` nunca ficam negativos.
- **Status:** ✅ Concluído (2026-07-08) — transação interativa (`$transaction(async tx => …)`) nas 2 rotas; ordem `findFirst → delete → update`; +2 testes por rota (delete-antes-do-update; falha na deleção → sem decremento → 500). ⚠️ A trava de concorrência pura (contador negativo sob corrida) segue no **M18**.

### ⬜ A2 — `?page=NaN` derruba `/api/history`
- **Arquivo:** `src/app/api/history/route.ts:8-9`
- **Problema:** `Math.max(1, parseInt("abc",10))` → `Math.max(1, NaN)` = **NaN** → `skip: NaN` → Prisma lança. Rota **sem try/catch** → 500 por input trivial de GET público.
- **Correção:**
  ```ts
  const raw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(raw) && raw > 0 ? raw : 1;
  ```
  Envolver o corpo em `try/catch` retornando 500 com log (ver M5).
- **DoD:** teste cobrindo `?page=abc`, `?page=-3`, `?page=` e ausência do param → todos retornam página 1 válida (200), nunca 500.
- **Status:** ✅ Concluído (2026-07-08) — `Number.isFinite(parsed) && parsed > 0 ? parsed : 1` + try/catch com log (500 controlado). Teste `it.each(["abc","-3","0","","NaN"])` → skip 0/200; + teste de falha de DB → 500.

### ⬜ A3 — Camada de fetch do cliente ignora `res.ok` (crash de render)
- **Arquivos:** `src/hooks/useHistory.ts:19-21`, `src/hooks/useStreaks.ts:19-22`
- **Problema:** `res.json()` sem checar `res.ok`. Em 5xx, `data.matches` vira `undefined` → `setMatches(undefined)` → `.map` crasha. Sem `error.tsx` (M8) para conter → tela branca.
- **Correção:** checar `res.ok` e lançar/tratar; garantir shape padrão:
  ```ts
  const res = await fetch(`/api/history?page=${pageNum}`);
  if (!res.ok) throw new Error("Failed to load history");
  const data: HistoryPage = await res.json();
  ```
  Adicionar estado de erro nos hooks (como em `useKillers`). Depende de **M8** para o boundary global.
- **DoD:** teste com `fetch` mockado retornando 500 → hook expõe erro e **não** quebra o render; UI mostra estado de erro.
- **Status:** ✅ Concluído (2026-07-08) — `useHistory` checa `res.ok`, expõe `error` + `retry`; `useStreaks` degrada para vazio (métrica secundária). `MatchHistoryList` ganhou estado de erro + "Try again" (com teste próprio, antes inexistente); `HistoryTabTemplate` ligado. ⚠️ Boundary global (`error.tsx`) segue no **M8** — aqui tratei inline.

---

## 🟠 MÉDIO

### ⬜ M7 — `"lint": "next lint"` quebrado no Next 16
- **Arquivo:** `package.json:9`
- **Problema:** `next lint` foi **removido no Next 16** (confirmado na doc oficial) e `next build` não linta mais. `npm run lint` falha.
- **Correção:** `"lint": "eslint ."` (o repo já tem `eslint.config.mjs`). Alternativa: codemod `npx @next/codemod@canary next-lint-to-eslint-cli .`.
- **DoD:** `npm run lint` roda e passa; sem erros de config.
- **Status:** ⬜ Pendente

### ⬜ M16 — Sem CI/CD
- **Arquivo:** ausência de `.github/workflows/`
- **Problema:** nada roda `tsc --noEmit`, `eslint`, `vitest`, `next build` automaticamente; sem branch protection. Com M7 quebrado e Next 16 não lintando no build, **nada** segura regressões.
- **Correção:** workflow `ci.yml` (push/PR) rodando install → typecheck → lint → test → build. Habilitar branch protection em `master`.
- **DoD:** workflow verde em um PR de teste; merge bloqueado se falhar.
- **Status:** ⬜ Pendente

### ⬜ M4 — Erro mapeado como 404 mascara 500 (e engole o erro)
- **Arquivos:** `src/app/api/killers/[id]/win/route.ts:26-31`, `loss/route.ts`, ambos `undo`
- **Problema:** `catch { return 404 }` transforma qualquer falha (ex.: queda de DB) em "Killer not found" e não loga nada.
- **Correção:** distinguir Prisma `P2025` (→ 404) do restante (→ 500) e logar server-side:
  ```ts
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Killer not found" }, { status: 404 });
    }
    console.error("win route failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  ```
- **DoD:** teste: killer inexistente → 404; erro genérico de DB (mock) → 500. 
- **Status:** ⬜ Pendente

### ⬜ M5 — `/api/history` e `/api/stats/streaks` sem try/catch
- **Arquivos:** `src/app/api/history/route.ts`, `src/app/api/stats/streaks/route.ts`
- **Problema:** inconsistente com as rotas de killers; erro de DB vira 500 não tratado, sem log.
- **Correção:** padronizar try/catch + log + resposta 500 (mesmo padrão de M4).
- **DoD:** teste de caminho de erro (mock Prisma lançando) → 500 controlado.
- **Status:** ⬜ Pendente

### ⬜ M6 — Sem validação de schema (zod) nas bordas
- **Arquivos:** rotas de API (params/query)
- **Problema:** `id`/`page`/query validados de forma ad-hoc (raiz de A2).
- **Correção:** introduzir `zod` para params e query; helper de parse que retorna 400 em input inválido. Consolida A2.
- **DoD:** schema por rota; teste de input inválido → 400.
- **Status:** ⬜ Pendente

### ⬜ M17 — Contadores denormalizados podem divergir de `Match` (causa-raiz)
- **Arquivos:** `prisma/schema.prisma:15-35` + rotas de mutação
- **Problema:** `Killer.wins/losses` duplicam a verdade que já está em `Match`. Grade/pizza leem os contadores; histórico/streaks leem `Match`. Drift (ver A1) → números inconsistentes na UI.
- **Correção (escolher 1):**
  - **(a)** Fonte única: derivar agregados de `Match` via `groupBy` e remover os contadores; ou
  - **(b)** Manter contadores mas **toda** mutação em transação + script de reconciliação (`wins == count(Match win)`).
- **DoD:** decisão registrada (ADR curta no topo do arquivo); teste garantindo consistência contador↔Match após win/loss/undo.
- **Status:** ⬜ Pendente

### ⬜ M18 — TOCTOU / corrida no undo (contador pode ficar negativo)
- **Arquivo:** `src/app/api/killers/[id]/win/undo/route.ts:16-32`
- **Problema:** `findUnique` (checa `>0`) e o decremento não são atômicos; 2 undos concorrentes podem passar a guarda e zerar/negativar.
- **Correção:** dentro da transação de A1, usar decremento condicional:
  ```ts
  const updated = await tx.killer.updateMany({
    where: { id: killerId, wins: { gt: 0 } },
    data: { wins: { decrement: 1 } },
  });
  // updated.count === 0 → nada a desfazer
  ```
- **DoD:** teste de 2 undos "simultâneos" (Promise.all no teste) → contador não fica negativo.
- **Status:** ⬜ Pendente (fazer junto com A1)

### ⬜ M1 — Sem authn/authz nas rotas (mutações públicas)
- **Arquivos:** todas as `route.ts` de `api/killers/*`
- **Problema:** qualquer um faz `PATCH .../win|loss|undo` e altera stats globais. (Sem dado sensível/PII → risco contido, mas escrita anônima.)
- **Correção:** proteger mutações — no mínimo um segredo compartilhado / token de sessão simples; middleware de auth em `middleware.ts`.
- **DoD:** requisição sem credencial → 401; teste cobrindo.
- **Status:** ⬜ Pendente
- ⚠️ *Superfície sensível (auth): decisão de produto sobre nível de proteção.*

### ⬜ M2 — Sem rate limiting
- **Arquivos:** rotas de mutação
- **Problema:** spam de writes infla contadores e cresce `Match` sem limite (DoS-lite / custo).
- **Correção:** rate limit por IP/rota (middleware ou lib). 
- **DoD:** N+1 requisições rápidas → 429; teste.
- **Status:** ⬜ Pendente

### ⬜ M3 — Sem headers de segurança / CSP
- **Arquivos:** `next.config.ts`, ausência de `middleware.ts`
- **Problema:** falta CSP, `frame-ancestors`/X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS.
- **Correção:** função `headers()` no `next.config.ts` com o conjunto padrão de hardening.
- **DoD:** headers presentes na resposta (verificar via `curl -I`).
- **Status:** ⬜ Pendente

### ⬜ M8 — Sem `error.tsx` / `not-found.tsx` / `global-error.tsx`
- **Arquivos:** ausência em `src/app/`
- **Problema:** qualquer throw cai na tela de erro padrão / branca, sem `reset()`. Amplifica A3.
- **Correção:** criar `app/error.tsx` (client boundary com `reset`) e `app/not-found.tsx`.
- **DoD:** simular erro em componente → boundary aparece com botão de retry.
- **Status:** ⬜ Pendente

### ⬜ M9 — `force-dynamic` sem `loading.tsx` / Suspense (sem streaming)
- **Arquivo:** `src/app/page.tsx:5`
- **Problema:** a página inteira bloqueia na query Prisma inicial; sem skeleton no 1º paint.
- **Correção:** adicionar `app/loading.tsx` e/ou streaming com `<Suspense>`. Avaliar `revalidate` no lugar de `force-dynamic` se a frescura permitir.
- **DoD:** skeleton visível durante o carregamento inicial.
- **Status:** ⬜ Pendente

### ⬜ M10 — `next/image` com `unoptimized` em imagens remotas grandes
- **Arquivos:** `src/components/atoms/KillerImage.tsx:29`, `src/components/molecules/AutocompleteOption.tsx:29`
- **Problema:** PNGs full-size da wikia servidas sem resize/webp. `MatchItem.tsx` não usa `unoptimized` (inconsistente).
- **Correção:** remover `unoptimized` (hosts já estão em `remotePatterns`); padronizar em todos os `<Image>`.
- **DoD:** imagens servidas via `/_next/image` otimizadas; LCP melhora perceptível.
- **Status:** ⬜ Pendente

### ⬜ M11 — `/api/stats/streaks` carrega todos os `Match` em memória por request
- **Arquivo:** `src/app/api/stats/streaks/route.ts:7-10`
- **Problema:** `findMany` sem limite + cômputo na aplicação a cada request, sem cache; refetch a cada mutação.
- **Correção:** agregar/limitar em SQL, cachear, ou computar streak incremental. Curto prazo: cache com `revalidate`/tag.
- **DoD:** endpoint não escala linearmente com o histórico total; teste do cômputo mantido.
- **Status:** ⬜ Pendente

### ⬜ M12 — Autocomplete sem semântica ARIA de combobox
- **Arquivos:** `src/components/molecules/KillerSearchInput.tsx:30-42`, `src/components/organisms/KillerAutocomplete.tsx:56-72`
- **Problema:** input sem `role=combobox`/`aria-expanded`/`aria-controls`/`aria-activedescendant`; dropdown sem `role=listbox`; opções sem `role=option`/`aria-selected`.
- **Correção:** seguir o padrão APG Combobox; ligar `aria-activedescendant` ao `highlightedIndex`.
- **DoD:** navegação por teclado anunciada por leitor de tela; teste de a11y dos atributos.
- **Status:** ⬜ Pendente

### ⬜ M13 — Pie chart: cor-única com ~15 vermelhos e sem alternativa acessível
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx:20-24,81-103`
- **Problema:** paleta de 15 tons de vermelho quase idênticos; SVG sem `role=img`/`<title>`.
- **Correção:** paleta distinguível (ou padrões/hachuras) + resumo textual/tabela acessível; adicionar título acessível. Ver skill `dataviz` para paleta categórica.
- **DoD:** segmentos distinguíveis; alternativa não-visual disponível.
- **Status:** ⬜ Pendente

### ⬜ M14 — Sem `prefers-reduced-motion`
- **Arquivo:** `src/app/globals.css:14-26,155-169`
- **Problema:** `pulseRing` roda **infinito**, além de fadeInUp/shimmer/`scroll-behavior:smooth`/transforms; sem opção de reduzir.
- **Correção:** `@media (prefers-reduced-motion: reduce)` desativando/atenuando animações e o scroll suave.
- **DoD:** com reduced-motion ligado no SO, animações param.
- **Status:** ⬜ Pendente

### ⬜ M15 — Contraste `text-muted` abaixo de WCAG AA
- **Arquivo:** `src/app/globals.css:36`
- **Problema:** `--color-muted: #636366` sobre `--color-void: #0A0A0A` ≈ **3.3:1** (< 4.5:1), usado em muito texto secundário/labels em `text-xs`.
- **Correção:** clarear o token para uso em texto (~`#8e8e93`) ou reservar `#636366` só para elementos não-textuais.
- **DoD:** contraste ≥ 4.5:1 no texto secundário (validar em ferramenta de contraste).
- **Status:** ⬜ Pendente

### ⬜ M19 — Testes obrigatórios ausentes (viola o DoD do próprio repo)
- **Arquivos:** ex.: `TeamTabTemplate`, `PlayerCard`, `MatchHistoryList`, `MatchItem`, `KillerAutocomplete`, vários atoms; e edge-cases de A1/A2/M18 sem teste.
- **Problema:** `CLAUDE.md` exige teste co-locado para todo componente/hook/util/rota; vários faltam e os bugs mais sérios estão descobertos.
- **Correção:** cobrir os componentes sem teste + casos de erro/edge das rotas (idealmente feito junto de cada correção acima).
- **DoD:** todo arquivo de `src` com contraparte `.test`; `npm run test` cobre os caminhos de erro.
- **Status:** ⬜ Pendente (transversal — fechar por último)

---

## 🟢 BAIXO

### ⬜ B5 — `@eslint/eslintrc` é phantom dependency
- **Arquivo:** `eslint.config.mjs:3` — importado mas não declarado em `package.json` (resolve só via eslint-config-next).
- **Correção:** adicionar em `devDependencies` (ou migrar para flat nativo `@next/eslint-plugin-next`). **Fazer junto de M7.**
- **Status:** ⬜ Pendente

### ⬜ B6 — Drift de dependências + dep morta
- **Arquivo:** `package.json`
- **Problema:** `eslint-config-next@15` com `next@16` e `eslint@8` (recomendado 9); `jsdom@29` instalado e **não usado** (ambiente é happy-dom).
- **Correção:** alinhar `eslint-config-next` à 16.x; remover `jsdom`. **Fazer junto de M7.**
- **Status:** ⬜ Pendente

### ⬜ B1 — Duplicação de lógica de stats
- **Arquivo:** `src/components/organisms/StatisticsOverview.tsx:40-43` — reimplementa win-rate/agregação em vez de reusar `@/lib/utils`.
- **Correção:** reusar `computeStats`/`formatPercent`.
- **Status:** ⬜ Pendente

### ⬜ B2 — Doc/impl drift: "optimistic updates"
- **Arquivo:** `src/hooks/useKillers.ts:51-67` — o `CLAUDE.md` diz otimista, mas o código é pessimista (aguarda o servidor).
- **Correção:** ajustar a doc **ou** implementar otimista + rollback (decidir).
- **Status:** ⬜ Pendente

### ⬜ B3 — `useKillers`: loading single-slot / `error` não exibido
- **Arquivo:** `src/hooks/useKillers.ts:28-32`
- **Correção:** usar `Set<number>` por ação; exibir `error` na UI (além do toast).
- **Status:** ⬜ Pendente

### ⬜ B4 — Sinal de refetch frágil em streaks
- **Arquivo:** `src/components/templates/StatisticsTabTemplate.tsx:20-29` — `useStreaks(totalMatches)` + `eslint-disable exhaustive-deps` com nonce `Date.now()`.
- **Correção:** elevar o estado de seleção; refetch por evento/versão explícita.
- **Status:** ⬜ Pendente

### ⬜ B7 — Animation-delay escala com índice global
- **Arquivo:** `src/components/molecules/MatchItem.tsx:24-25` — itens de "Load more" surgem com 800ms+ de atraso.
- **Correção:** delay relativo à página ou teto no delay.
- **Status:** ⬜ Pendente

### ⬜ B8 — `KillerCard` clicável (role=button) sem foco visível
- **Arquivo:** `src/components/organisms/KillerCard.tsx:43-58`
- **Correção:** adicionar `focus-visible` ring. **Fazer junto da Fase 5 (a11y).**
- **Status:** ⬜ Pendente

### ⬜ B9 — Input de busca sem label acessível
- **Arquivo:** `src/components/molecules/KillerSearchInput.tsx:30`
- **Correção:** `aria-label` ou `<label>` visualmente oculto. **Fazer junto de M12.**
- **Status:** ⬜ Pendente

### ⬜ B10 — Hex cru em componente/inline
- **Arquivo:** `src/components/organisms/KillersPieChart.tsx:56,100` (`#9ca3af`, `#10B981`, paleta) — viola "no raw color values".
- **Correção:** mover para tokens/CSS vars. **Fazer junto de M13.**
- **Status:** ⬜ Pendente

### ⬜ B11 — Texto de UI em português (viola regra English-only)
- **Arquivos:** `prisma/seed.ts:7-311` ("Trapper (Caçador)"…), `src/components/templates/TeamTabTemplate.tsx:34-52` ("Spectro", "Drácula", "Clima Esquisito").
- **Correção:** normalizar nomes/labels para inglês. (Locale `pt-BR` em datas é permitido.)
- **Status:** ⬜ Pendente

### ⬜ B12 — `<Image src="">` no Team (mitigado por onError)
- **Arquivos:** `src/components/templates/TeamTabTemplate.tsx:65,78` → `src/components/organisms/PlayerCard.tsx:113-120`
- **Correção:** render condicional do fallback quando `imageUrl` vazio, em vez de passar `""`.
- **Status:** ⬜ Pendente

### ⬜ B13 — README/CLAUDE.md desatualizados
- **Arquivo:** `README.md:7,50` — diz "Next.js 15" e "42 killers"; real é Next 16, 43 seeds, + Match/history/streaks/undo/Team.
- **Correção:** atualizar README (e ajustar `CLAUDE.md` onde a arquitetura mudou).
- **Status:** ⬜ Pendente

---

## ℹ️ Decisões / INFO / Sem achados

| ID | Item | Ação |
|----|------|------|
| I1 | `reactCompiler: true` no top-level | ✅ **Correto no Next 16** (estável). Nenhuma ação. |
| I2 | Injeção (SQL/NoSQL/cmd) | ✅ Sem achados — Prisma parametrizado, sem SQL cru. Manter. |
| I3 | XSS | ✅ Sem achados — sem `dangerouslySetInnerHTML`. Manter. |
| I4 | Secrets | ✅ Sem achados — `.env` ignorado, sem `NEXT_PUBLIC_*` sensível. Manter. |
| I5 | Arquitetura de monorepo | **N/A** — app única. |
| I6 | PII: nomes/nicks reais em `TeamTabTemplate` | ⏭️ Decisão: manter? anonimizar? (relevante se repo/app for público). |
| I7 | 3 famílias de fonte | ⏭️ Confirmar uso de JetBrains Mono; remover se não usada. |

---

## 📚 Referências

- Auditoria completa: ver conversa de origem (tabela de achados por gravidade).
- Regras do projeto: `CLAUDE.md` (testes obrigatórios, tokens, guard clauses, React Compiler).
- Next 16 — remoção do `next lint` e `reactCompiler` estável: doc oficial de upgrade v16.

---

_Última atualização: 2026-07-08 — 3/35 concluídos (Fase 0 ✅: A1, A2, A3)._
