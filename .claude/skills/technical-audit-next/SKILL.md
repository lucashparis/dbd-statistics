---
name: technical-audit-next
description: >-
  Auditoria técnica adversarial de aplicações/monorepos Next.js (App Router + RSC)
  e checklist de PREVENÇÃO aplicado a toda nova implementação. Aciona esta skill
  (1) sob demanda para auditar o repositório e produzir a tabela de achados por
  gravidade, e (2) SEMPRE ao escrever/revisar código novo (rota de API, Server
  Action, hook, componente, mudança de schema, config) para já nascer sem as
  classes de falha catalogadas aqui — auth, validação zod nas bordas, error
  handling, boundaries/streaming, cache/revalidação, segurança, a11y e testes.
---

# Technical Audit — Next.js (App Router + RSC)

Esta skill tem **dois modos**. O primeiro é o que roda no dia a dia.

- **Modo Prevenção (padrão, silencioso):** ao escrever ou revisar QUALQUER código
  novo neste repo, aplique o *Baseline de Prevenção* abaixo antes de entregar. Não
  anuncie a skill nem produza relatório — apenas escreva o código já correto. Só
  cite um item se o código não puder satisfazê-lo (trade-off consciente) — 1 linha.
- **Modo Auditoria (sob demanda):** quando o usuário pedir "auditar", "audit",
  "revisar o repo", "encontrar problemas", rode o *Protocolo de Auditoria* e
  entregue a tabela no formato obrigatório.

> **Escopo deste repo:** aplicação **única** Next.js 16 — **não é monorepo**. Os
> itens da categoria *Arquitetura do monorepo* são **N/A** aqui (mantidos para
> reuso da skill em outros projetos). O rastreador vivo de achados é [audit.md](../../../audit.md);
> não duplique-o — atualize-o quando fechar/abrir um item.

---

## Baseline de Prevenção — aplicar a TODA nova implementação

Cada regra deriva de uma classe de falha já encontrada e catalogada. Quebrar uma
delas reabre um bug conhecido. Mapeadas ao código real do repo.

### Rotas de API / Server Actions
- **Auth primeiro, sempre.** `const session = await auth(); if (!session?.user) return new NextResponse(null,{status:401});` **antes** de qualquer I/O. Toda query filtra por `session.user.id`. Server Actions (`"use server"`) validam authz do mesmo jeito — nunca confie em quem chama.
- **Valide a entrada na borda com Zod.** IDs via `parseId`, paginação via `parsePage` (`src/lib/api.ts`); body via schema Zod. Entrada inválida → `400`, nunca deixe chegar no Prisma. Nada de `Number.parseInt` ad-hoc nem `isNaN`.
- **Handler fino.** auth → validar → chamada Prisma (singleton `src/lib/prisma.ts`) → `mutationError(context, e)` no `catch`. Lógica de derivação vai para `src/lib/`, não no handler.
- **Erro nunca engolido.** Todo handler tem `try/catch`. `mutationError` mapeia `P2003`/`P2025` → `404` e o resto → `console.error` + `500`. Proibido `catch {}` vazio e `catch` que devolve `200`.
- **Rate limiting é baseline** (`enforceRateLimit` no `proxy.ts` para writes em `/api/*`) — não reimplemente por rota; só garanta que a rota nova é coberta pelo matcher.

### Dados / Prisma / cache
- **`Match` é a fonte única.** Nunca reintroduza colunas `wins`/`losses` em `Killer`. Agregue via `getKillersForUser`/`getKillerForUser` (`src/lib/killers.ts`). Sem contador denormalizado ⇒ sem drift, sem dupla-escrita não-transacional.
- **Escreva `userId` em todo `Match`.** `Match.userId` é `String?` por herança de migração; queries filtram por `userId`, então um match sem `userId` fica órfão/invisível.
- **Múltiplas escritas relacionadas → `prisma.$transaction`.** Nunca `Promise.all` de escritas que podem divergir.
- **Toda mutação de `Match` revalida o cache de streaks.** `revalidateTag("streaks:" + userId, "max")` — **2 argumentos** (Next 16 quebra o build com 1 arg). Cache é `unstable_cache(fn, ["streaks", userId], { tags:["streaks:"+userId], revalidate: 60 })`.
- **Nada de carregar tabela inteira em memória por request.** Pagine ou cacheie no servidor (custo de backend não se resolve com cache de cliente).

### Fronteira Server/Client & Next.js
- **`'use client'` o mais baixo possível.** Fetch inicial em Server Component; cliente só para interatividade. Nunca importe módulo com segredo/Node-only para dentro de um Client Component (vaza pro bundle).
- **Sem `NEXT_PUBLIC_*` para dado sensível.** Só o que pode ser público no cliente.
- **Rotas dinâmicas novas ganham boundaries.** `error.tsx` + `not-found.tsx` quando fizer sentido; `loading.tsx` com skeleton (átomo `Skeleton` + template espelhando a tela) para rotas `force-dynamic`. `global-error.tsx` usa estilos inline (substitui o root layout).
- **Sem waterfalls.** Paralelize fetches independentes; use Suspense/streaming onde couber.
- **Sem API de browser no servidor** e sem `Date.now()`/`Math.random()` como chave de render/refetch (causa hydration mismatch e refetch frágil).

### Camada de fetch do cliente (hooks)
- **Sempre cheque `res.ok`** antes de `res.json()`. Exponha `error` + `retry`; resete o estado no erro. Ignorar `res.ok` derruba o render.
- **Hooks são pessimistas** — aguarde o servidor e só então atualize o estado (mantenha doc e código em acordo). Se for otimista, implemente rollback.

### Segurança (prioridade máxima)
- Headers/CSP são baseline (`src/lib/security-headers.ts` via `next.config.ts`). CSP com `frame-ancestors 'none'`, `object-src 'none'`; endurecer para nonce é follow-up.
- Sem `dangerouslySetInnerHTML` sem sanitização; sem SQL cru (Prisma parametrizado); cuidado com SSRF/path-traversal em qualquer entrada que vira URL/caminho.
- Secrets em vault/`.env` (ignorado); nunca hardcode. `.env.example` documenta toda var nova.

### TypeScript & qualidade
- `strict` ligado — sem `any`/`as any`/`@ts-ignore` para calar o compilador; tipe de verdade. Em teste, tipe o mock de `auth` via `vi.mocked(auth as unknown as () => Promise<Session | null>)`.
- Guard clauses sobre `else`; sem função gigante; sem dead code; sem duplicação de fórmula (reuse `computeStats`/`formatPercent`).
- Nada de promessa não-aguardada.

### Performance
- `next/image` **sem** `unoptimized`; sempre com `sizes`. **Nunca** `src=""` — renderize fallback condicional quando a URL estiver vazia.
- Sem barrel/import pesado sem code-splitting. **Não** use `useMemo`/`useCallback`/`memo` manuais (React Compiler ligado).
- `animationDelay` com teto/reset por página, não escalando com índice global.

### Acessibilidade & UX
- Combobox/autocomplete seguem APG: `role=combobox`/`aria-expanded`/`aria-controls`/`aria-activedescendant`; dropdown `role=listbox`; opções `role=option`/`aria-selected`.
- Todo input tem label acessível (`<label>` ou `aria-label`). Elemento clicável (`role=button`) tem `focus-visible` ring com token.
- Gráfico tem `role="img"` + `<title>`/alternativa textual; paleta categórica distinguível (ver skill `dataviz`), não 15 tons quase iguais.
- `@media (prefers-reduced-motion: reduce)` atenua animações; nenhuma animação `infinite` sem essa guarda.
- Contraste de texto ≥ 4.5:1 (AA). `--color-muted` puro não passa sobre `--color-void` — use token mais claro para texto.

### Estilo & i18n
- **Sem hex cru** em componente — use os tokens CSS (`globals.css`). `cn()` para classes condicionais. Sem arquivo de config Tailwind.
- **Texto de UI em inglês** (datas podem usar locale `pt-BR`). Import sempre via alias `@/*`.

### Testes & gate (obrigatório)
- **Todo `src` novo nasce com `.test` co-locado.** API: cobre `401`/`400`/`404`/`200`/`500`. Hook: transições de estado + caminho de erro. Mocke no boundary (Prisma em API, `fetch` em hook, `auth()` em rota protegida).
- Antes de entregar: `npm run test` · `npm run lint` · `npx tsc --noEmit` · (build se tocar config/rota). O gate é o que pega regressões de tipo em arquivos de teste.

---

## Protocolo de Auditoria (modo sob demanda)

### Papel
Auditor sênior de engenharia (staff-level) em Next.js (App Router + RSC), monorepos
e segurança web. Tarefa: encontrar **todas** as falhas — não elogiar. Seja
**adversarial**: assuma que o código tem problemas e prove onde. **Não invente**;
se algo não for verificável no código, marque **"NÃO VERIFICÁVEL"** em vez de supor.

### Como executar (ferramentas reais)
1. Mapeie o repo: estrutura de `src/app/**`, `src/lib/**`, `prisma/schema.prisma`, configs (`next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `.github/workflows`, `.env.example`).
2. Rode/leia o gate: `npx tsc --noEmit`, `npm run lint`, `npm run test`, e `npm audit --omit=dev` para CVEs (rode a análise; não chute).
3. Cace por padrão com Grep, e prove com `arquivo:linha`:
   - rotas sem `await auth()`; `catch {}` vazio; `as any`/`@ts-ignore`; `dangerouslySetInnerHTML`; `NEXT_PUBLIC_`; `Number.parseInt`/`isNaN` em borda; `revalidateTag(` de 1 arg; `unoptimized`; `src=""`; hex cru; `useMemo`/`useCallback`/`memo`; `Promise.all` de escritas; texto PT em UI.
4. Confronte cada regra do *Baseline de Prevenção* acima com o código.

### Checklist de investigação (percorra item a item)
1. **Arquitetura do monorepo** (N/A neste repo — declare): deps circulares, vazamento de boundary, dependency drift, `exports`/`types` ausentes, phantom deps, cache de build (Turbo/Nx) mal configurado.
2. **Next.js:** fronteira Server/Client errada; `"use server"` sem validação/authz; server-code vazando pro cliente; cache/revalidação errada; waterfalls / falta de streaming; hydration errors; SEO/metadata; `loading/error/not-found`.
3. **Segurança [máxima]:** secrets hardcoded / `NEXT_PUBLIC_*` sensível; rotas/Actions sem authn/authz/rate-limit; injeção/XSS/SSRF/path-traversal; CORS/CSP/headers; validação inexistente; CVEs.
4. **TypeScript & qualidade:** `strict` off; `any`/`as`/`@ts-ignore`; dead code; duplicação; funções gigantes; acoplamento; `catch` vazio; promessa não-aguardada.
5. **Performance:** bundle/imports pesados; barrel custoso; `next/image`/fontes; memoização crítica; Core Web Vitals (LCP/CLS/INP); re-renders evitáveis.
6. **Testes:** cobertura real (unit/integração/e2e); caminho crítico sem teste; flaky; Server Actions e utils compartilhados sem teste.
7. **Acessibilidade & UX:** semântica, aria, foco, contraste, teclado.
8. **DevEx / CI-CD / Docs:** CI sem lint/typecheck/test/build; sem branch protection; README/CONTRIBUTING/LICENSE/.env.example; versionamento e commits.

### Taxonomia de gravidade (use exatamente estes níveis)
- **CRÍTICO** — exploração / perda de dado / RCE ou quebra em produção. Corrigir já.
- **ALTO** — falha de segurança contida, bug funcional sério, risco real.
- **MÉDIO** — má prática com impacto tangível em manutenção/performance.
- **BAIXO** — inconsistência menor, dívida técnica localizada.
- **INFO** — sugestão/estilo, sem impacto funcional.

Cada gravidade justificada em **uma frase** (por que esse nível e não outro).

### Formato de saída (obrigatório)
Uma linha por achado:

| ID | Gravidade | Categoria | Arquivo:linha | Problema | Impacto | Correção sugerida |

Ao final, entregue:
1. **Sumário executivo** — contagem por gravidade + nota de saúde do repo (0–100).
2. **Top 5 correções priorizadas** — maior impacto / menor esforço primeiro.
3. **Quick wins** — itens que zeram pendências **CRÍTICO/ALTO**.

### Regras
- Não classifique como CRÍTICO o que é preferência de estilo.
- Aponte a **linha exata**; se não achar, diga **"localização aproximada"**.
- Prefira a **correção mínima que resolve a causa raiz**, não paliativo.
- Se uma categoria estiver limpa, diga explicitamente **"sem achados"**.
- Setor regulado (LGPD/ANS/CFM): sinalize decisão regulatória para revisão humana; não trave o relatório.
