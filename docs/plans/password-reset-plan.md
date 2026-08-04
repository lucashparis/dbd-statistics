# #3 — Redefinição de senha por email (Forgot / Reset password)

> **Visão geral.** Hoje um usuário que esquece a senha fica travado: não existe nenhum fluxo de
> recuperação, nem infraestrutura de envio de email no projeto. Esta entrega adiciona um fluxo padrão
> de "esqueci minha senha" — o usuário informa o email em `/forgot-password`, recebe um link de uso
> único válido por 1 hora via SMTP (Nodemailer), e define uma nova senha em `/reset-password`. Ao
> concluir, **todas as sessões ativas em outros dispositivos são invalidadas** (decisão do usuário) —
> a troca de senha força um novo login em qualquer sessão JWT aberta antes da troca.

**Objetivos**
- Um usuário deslogado consegue recuperar acesso à própria conta usando apenas o email cadastrado.
- Nenhuma enumeração de contas: a resposta de `forgot-password` é idêntica exista ou não o email.
- O link de redefinição é de uso único, expira em 1h, e trocar a senha invalida sessões já emitidas.
- Zero dependência de SaaS novo — usa SMTP (Nodemailer), consistente com "sem infra nova sem
  justificativa".

---

## Escopo

**Entra:**
- Página `/forgot-password` (solicitar o link) e `/reset-password?token=...` (definir nova senha).
- `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`.
- Novo modelo `PasswordResetToken` (Prisma) + migração via `db:push`.
- Envio de email transacional via SMTP/Nodemailer (`src/lib/mailer.ts`).
- Invalidação de sessões JWT existentes ao redefinir a senha (`User.passwordChangedAt` + callback `jwt`
  em `src/auth.ts`).
- Link "Forgot password?" na `LoginForm`.
- Testes co-localizados para toda a lógica nova; entrada no changelog.

**NÃO entra:**
- Verificação de email no cadastro (email confirmation) — fora de escopo, não pedido.
- 2FA / MFA.
- Notificação "sua senha foi alterada" por email de aviso separado (só o link em si é enviado).
- Um rate limiter dedicado e mais estrito para `forgot-password` (ver Risco de email bombing) — o
  limiter global do `proxy.ts` já cobre a rota; um limiter mais agressivo específico fica como item
  futuro.
- Troca de provedor de email (Resend/SES) — decidido SMTP/Nodemailer nesta entrega.

---

## Estado atual

> Ancorado no código real.

- **Não existe nenhum fluxo de recuperação de senha.** Não há rota `forgot-password`/`reset-password`,
  nem página, nem tabela de token. Confirmado por busca no repo.
- **Não existe infraestrutura de envio de email.** Nenhuma dependência de email (`nodemailer`,
  `resend`, `@aws-sdk/*`) em [package.json](../../package.json); nenhuma env var de SMTP/API key em
  [.env.example](../../.env.example).
- **Não existe env var de URL base da aplicação** (`APP_URL`/`NEXTAUTH_URL`) — necessário para montar
  o link absoluto do email.
- **Auth (NextAuth v5, JWT strategy):**
  - [src/auth.config.ts](../../src/auth.config.ts) — edge-safe, sem Prisma/bcrypt. `callbacks.session`
    hoje só copia `token.sub` → `session.user.id` (linhas 10-15).
  - [src/auth.ts](../../src/auth.ts) — runtime Node, `Credentials` provider, `verifyCredentials`
    (bcrypt.compare). Não define `callbacks.jwt` — herda só o `session` de `auth.config.ts` (spread
    `...authConfig` sem sobrescrever `callbacks`, linha 13).
  - [src/lib/auth-credentials.ts](../../src/lib/auth-credentials.ts) — `hashPassword` (bcrypt,
    `SALT_ROUNDS = 10`) e `verifyCredentials`. Reaproveitados sem alteração.
  - Sessão é **stateless (JWT)** — não há tabela de sessão. Hoje, uma vez emitido, um token só perde
    validade por expiração natural; não há mecanismo de revogação.
- **`User` (prisma/schema.prisma:37-58)** não tem coluna `passwordChangedAt`. Precisa ser adicionada.
- **Padrão de rota pública de auth:** [src/app/api/signup/route.ts](../../src/app/api/signup/route.ts)
  — handler fino, sem `auth()` (rota pública), Zod na borda, Prisma direto no handler, sem camada
  `lib/` intermediária para a orquestração (só helpers puros em `auth-credentials.ts`). As duas novas
  rotas seguem o mesmo padrão.
- **Padrão de página pública de auth:** [src/app/login/page.tsx](../../src/app/login/page.tsx) e
  [src/app/signup/page.tsx](../../src/app/signup/page.tsx) — Server Component que faz
  `const session = await auth(); if (session?.user) redirect("/dashboard");`, renderiza um card com
  `LoginForm`/`SignupForm` (Client Component). Sem `loading.tsx`/`error.tsx` (rota estática, não
  segmento dinâmico) — as duas novas páginas seguem o mesmo padrão, sem essas boundaries.
- **Rate limiting já cobre as novas rotas sem mudança:** [src/proxy.ts](../../src/proxy.ts) tem
  `matcher: [..., "/api/:path*"]` (linha 34) e rate-limita **todo** método não-GET em `/api/*` por
  `user:<id>` ou `ip:<ip>` (linhas 16-24) via [src/lib/rate-limit.ts](../../src/lib/rate-limit.ts)
  (20 req/10s, fail-open sem Upstash configurado). As duas novas rotas (`POST`, sem sessão → chave por
  IP) já caem nesse guarda-chuva automaticamente.
- **Changelog:** [src/lib/changelog.ts](../../src/lib/changelog.ts) — array `ENTRIES`, `requestedBy`
  sempre `"Community"` neste projeto (nunca nome de pessoa — já corrigido duas vezes antes).
- **Convenção de teste:** mock de `prisma` e de `auth()` por `vi.mock`, ver
  [src/app/api/signup/route.test.ts](../../src/app/api/signup/route.test.ts) e
  [src/lib/auth-credentials.test.ts](../../src/lib/auth-credentials.test.ts).

---

## Decisões (fechadas)

| Decisão | Escolha | Por quê |
|---------|---------|---------|
| Provedor de envio de email | **SMTP via Nodemailer** | Escolha do usuário — sem SaaS novo, reaproveita um servidor SMTP existente. |
| Invalidar sessões ativas ao redefinir senha | **Sim, todas** | Escolha do usuário — mais seguro: uma senha esquecida/comprometida não deve deixar sessões antigas válidas. |
| Enumeração de conta em `forgot-password` | Resposta **idêntica** (200 + mensagem genérica) exista ou não o email | Prática padrão de segurança para esse tipo de endpoint; evita descobrir emails cadastrados. |
| Onde fica o token | Nova tabela `PasswordResetToken`, guarda **hash** (sha256) do token, nunca o valor bruto | Mesma lógica de "nunca guardar segredo em claro" já aplicada à senha (bcrypt); permite invalidar/auditar sem expor o token se o banco vazar. |
| Expiração do token | **1 hora** | **Premissa (a confirmar):** não especificado pelo usuário; 1h é o padrão de mercado para reset de senha. |
| Múltiplos tokens ativos | Ao gerar um novo, invalida (marca usado) qualquer token não-usado anterior do mesmo usuário | Evita links antigos ainda válidos "vivos" em paralelo; só o link mais recente funciona. |
| Política de senha no reset | Mesmo mínimo do signup (`min(4)`) | Consistência com `POST /api/signup` — não introduzir uma regra nova sem pedido explícito. |
| Auto-login após reset | **Não** — redireciona para `/login` | Coerente com a decisão de invalidar sessões: o próprio fluxo de reset roda sob o token do NextAuth atual (se houver) e forçar um login novo garante um JWT com `iat` posterior a `passwordChangedAt`. |
| Rate limit dedicado para `forgot-password` | Não nesta entrega — usa o limiter global do `proxy.ts` | Está fora do que foi pedido; documentado como risco (email bombing) e item futuro. |
| Nova env var de URL base | `APP_URL` (server-only, não `NEXT_PUBLIC_*`) | Necessária para montar o link absoluto do email; não precisa ir ao bundle do cliente. |

---

## Regras de negócio

1. Um pedido de reset (`POST /api/auth/forgot-password`) sempre responde `200` com a mesma mensagem
   genérica, **independente** de o email existir ou não. Só dispara o envio de email quando o usuário
   existe.
2. Ao gerar um novo token para um usuário, todo token anterior **não usado e não expirado** desse
   mesmo usuário é marcado como usado (invalidado) — só o link mais recente é válido.
3. Um token é válido para consumo se: existe, `usedAt IS NULL`, e `expiresAt > now()`. Qualquer outra
   condição retorna o mesmo erro genérico "Invalid or expired token" (não diferenciar "não existe" de
   "expirou" de "já usado" — evita vazar informação sobre timing/estado).
4. Um token só pode ser consumido **uma vez**: ao redefinir a senha com sucesso, o token usado é
   marcado `usedAt = now()` na mesma transação que troca a senha.
5. Redefinir a senha com sucesso sempre atualiza `User.passwordChangedAt = now()`.
6. Qualquer sessão JWT emitida **antes** de `passwordChangedAt` deixa de ser aceita nas próximas
   requisições autenticadas (Node runtime) — o usuário precisa logar de novo em cada dispositivo.
7. As rotas `forgot-password` e `reset-password` são públicas (sem `auth()`), mas escritas (`POST`) —
   continuam sujeitas ao rate limit global por IP do `proxy.ts`.

---

## Arquitetura da solução

Fluxo stateless típico de "forgot password", reaproveitando 100% da infra de auth existente
(NextAuth v5 JWT, Prisma, Zod na borda, Nodemailer novo só para o envio). A única peça
arquiteturalmente nova e sensível é a **invalidação de sessão JWT**, que precisa de um ponto de
verificação no runtime Node (onde há Prisma) sem contaminar o `auth.config.ts` edge-safe:

```
auth.config.ts (edge-safe, sem Prisma)
  callbacks.session({ session, token })
    → se token.invalid === true: retorna session SEM session.user
      (session.user vira undefined → todo `if (!session?.user)` já existente
       nas rotas passa a 401 automaticamente, sem tocar em nenhuma rota)
    → senão: comportamento atual (session.user.id = token.sub)

auth.ts (Node runtime, tem Prisma)
  callbacks.jwt({ token })   <-- NOVO, só existe aqui
    → busca user.passwordChangedAt (select mínimo, por PK)
    → se existir e (passwordChangedAt em segundos) > token.iat: token.invalid = true
    → devolve token (inalterado se válido)
```

`auth.ts` passa a montar `callbacks` explicitamente (hoje herda implicitamente de `authConfig` via
spread) para acrescentar o `jwt` sem perder o `session` de `auth.config.ts`:

```ts
// src/auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token }) {
      if (!token.sub) return token;
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true },
      });
      const changedAt = user?.passwordChangedAt;
      if (changedAt && typeof token.iat === "number" && changedAt.getTime() / 1000 > token.iat) {
        return { ...token, invalid: true };
      }
      return token;
    },
  },
  providers: [/* ... inalterado ... */],
});
```

A checagem `token.invalid` em `session()` fica em `auth.config.ts` (edge-safe, só lê um campo do
token, não consulta banco). O ponto de aplicação real é o `auth()` chamado no runtime Node (toda rota
de API e toda Server Component protegida já fazem isso hoje) — o `proxy.ts` (edge) continua só
redirecionando para `/login` quando não há sessão; a checagem de "senha trocada" acontece quando a
página/rota protegida chama `auth()` de `@/auth`, que é onde o `jwt()` acima roda.

## Fluxo completo

**Forgot password**
1. Usuário deslogado acessa `/forgot-password`, informa o email, submete.
2. `POST /api/auth/forgot-password { email }`.
3. Zod valida `email` → 400 se inválido.
4. Busca `User` pelo email.
   - **Não existe:** não faz nada além de responder.
   - **Existe:** dentro de uma transação — marca `usedAt = now()` em todo `PasswordResetToken` do
     usuário com `usedAt IS NULL`; cria um novo `PasswordResetToken` (`tokenHash`, `expiresAt = now() +
     1h`); fora da transação, envia o email via `sendPasswordResetEmail` com o link
     `${APP_URL}/reset-password?token=<raw>`.
5. Responde `200 { message: "If that email exists, a reset link was sent." }` em ambos os casos.
6. Front mostra um toast de sucesso genérico e mantém o usuário na própria página (ou redireciona para
   `/login` — ver Decisões).

**Reset password**
1. Usuário abre o link do email → `/reset-password?token=<raw>`.
2. Página renderiza o formulário (senha + confirmação), passando o `token` da query string ao
   `ResetPasswordForm` sem validá-lo no servidor nesse GET (validação só acontece no submit — evita
   marcar/gastar o token com um simples carregamento de página, e evita expor via server log se algo
   ficar cacheado).
3. Usuário preenche nova senha + confirmação, submete.
4. Front valida client-side que as duas senhas coincidem (senão, erro inline, sem round-trip).
5. `POST /api/auth/reset-password { token, password }`.
6. Zod valida `token` (string não vazia) e `password` (`min(4)`) → 400 se inválido.
7. Hash do `token` recebido (sha256) → busca `PasswordResetToken` por `tokenHash`.
   - **Não encontrado, ou `usedAt` preenchido, ou `expiresAt <= now()`:** responde `400 { error:
     "Invalid or expired token" }`.
8. Dentro de uma transação: `hashPassword(password)` → `prisma.user.update` (`password`,
   `passwordChangedAt: now()`); `prisma.passwordResetToken.update` (`usedAt: now()`) no token
   consumido.
9. Responde `200 { ok: true }`.
10. Front mostra toast de sucesso e redireciona para `/login` (sem auto-login — ver Decisões).
11. Qualquer sessão JWT já aberta em outro dispositivo passa a ser rejeitada na próxima requisição
    autenticada (ver Arquitetura).

**Erro / edge cases já cobertos acima:** email não encontrado (silencioso), token inválido/expirado/
usado (mensagem genérica única), payload inválido (400), múltiplos pedidos de reset em sequência
(só o último token vale).

---

## Etapas detalhadas de implementação

### Backend

- **`prisma/schema.prisma`** — adicionar `User.passwordChangedAt DateTime?` (nullable — usuários
  existentes nunca trocaram a senha por esse fluxo, `null` significa "nenhuma checagem de staleness
  necessária"); adicionar modelo `PasswordResetToken`:
  ```prisma
  model PasswordResetToken {
    id        String    @id @default(cuid())
    userId    String
    tokenHash String    @unique
    expiresAt DateTime
    usedAt    DateTime?
    createdAt DateTime  @default(now())
    user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
  }
  ```
  e a relação `resetTokens PasswordResetToken[]` em `User`. Rodar `npm run db:push` +
  `npm run db:generate`.

- **`src/lib/password-reset.ts`** (novo, puro) —
  - `TOKEN_TTL_MS = 60 * 60 * 1000` (1h).
  - `generateResetToken(): { raw: string; hash: string; expiresAt: Date }` — `raw` via
    `crypto.randomBytes(32).toString("hex")`, `hash` via `crypto.createHash("sha256").update(raw)
    .digest("hex")`, `expiresAt = new Date(Date.now() + TOKEN_TTL_MS)`.
  - `hashToken(raw: string): string` — mesmo sha256, reaproveitado na rota de reset para o lookup.

- **`src/lib/session-invalidation.ts`** (novo, puro, testável isoladamente do NextAuth) —
  - `isTokenStale(tokenIat: number | undefined, passwordChangedAt: Date | null): boolean` — a regra do
    passo 6 das Regras de negócio, extraída para fora do callback `jwt` (que não é testável em
    isolamento) para poder ter teste unitário direto.

- **`src/lib/mailer.ts`** (novo) —
  - Transport Nodemailer singleton (padrão análogo ao `prisma.ts`), lido de `SMTP_HOST`, `SMTP_PORT`,
    `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
  - `sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>` — envia um email em inglês
    (texto simples + o link), assunto `"Reset your DBD Statistics password"`. **Lança erro** se as env
    vars de SMTP não estiverem configuradas (não falha silenciosamente como o rate limiter — aqui a
    ausência de config é um erro de operação, não um "modo degradado" aceitável, já que sem email o
    usuário fica sem forma de recuperar a conta).

- **`src/app/api/auth/forgot-password/route.ts`** (novo) — `POST`, sem `auth()` (rota pública).
  Zod `{ email: z.email() }` → 400. Handler fino: busca usuário → se existe, transação
  (invalida tokens antigos + cria novo) → `sendPasswordResetEmail` fora da transação → sempre `200`.
  `mutationError`-style catch para erro inesperado (500), mas o "usuário não encontrado" **não** é
  erro — é o caminho silencioso do passo 4.

- **`src/app/api/auth/reset-password/route.ts`** (novo) — `POST`, sem `auth()`.
  Zod `{ token: z.string().min(1), password: z.string().min(4) }` → 400. Handler fino: hash do token →
  lookup → valida `usedAt`/`expiresAt` → 400 genérico se inválido → transação (`hashPassword` +
  `user.update` com `passwordChangedAt` + `passwordResetToken.update` `usedAt`) → `200`. Catch → 500
  via `mutationError`.

- **`src/auth.config.ts`** — editar `callbacks.session` para checar `token.invalid` (ver Arquitetura).
  Import de tipos apenas — segue edge-safe, nenhuma importação de Prisma/bcrypt adicionada.

- **`src/auth.ts`** — adicionar `callbacks.jwt` (ver Arquitetura), consultando
  `prisma.user.findUnique` (`select: { passwordChangedAt: true }`) por `token.sub`.

### Frontend

- **`src/app/forgot-password/page.tsx`** (novo, Server Component) — mesmo guard de
  `login/page.tsx`/`signup/page.tsx` (`redirect("/dashboard")` se já autenticado), mesmo layout de card,
  título "Reclaim Your Trial" (ou similar, tom do tema), renderiza `ForgotPasswordForm`, link "Back to
  sign in" para `/login`.

- **`src/app/forgot-password/ForgotPasswordForm.tsx`** (novo, Client Component) — campo `email`,
  submit → `fetch("/api/auth/forgot-password", { method: "POST", body: { email } })` → em qualquer
  resposta `200` (o único caminho de sucesso esperado), mostra toast genérico ("If that email is
  registered, a reset link was sent.") e limpa/desabilita o form; em erro de rede/500, toast de erro
  genérico (não instrução de retry específica).

- **`src/app/reset-password/page.tsx`** (novo, Server Component) — mesmo guard de sessão; lê
  `token` de `searchParams` (Next 16 `searchParams` é `Promise<{ token?: string }>` — seguir o padrão
  já usado em outras páginas do App Router do projeto para `searchParams` assíncrono); passa `token`
  (ou `null` se ausente) para `ResetPasswordForm`.

- **`src/app/reset-password/ResetPasswordForm.tsx`** (novo, Client Component) — recebe `token` via
  prop; se `token` for `null`/vazio, renderiza direto o estado de erro ("Invalid or missing reset
  link" + link para `/forgot-password`), sem mostrar o form. Caso contrário: campos `password` +
  `confirmPassword`; valida client-side que coincidem antes do submit (erro inline, sem round-trip);
  submit → `POST /api/auth/reset-password { token, password }`; em `200`, toast de sucesso +
  `router.push("/login")`; em `400`, mostra o estado de erro (token inválido/expirado) com link para
  `/forgot-password`.

- **`src/app/login/LoginForm.tsx`** — adicionar um link "Forgot password?" abaixo/ao lado do campo de
  senha, apontando para `/forgot-password` (mesmo estilo de link já usado em `login/page.tsx` para
  "Sign up").

### Banco de dados

- Migration via `db:push` (projeto não usa arquivos de migration, ver "Useful DB scripts" no
  CLAUDE.md): coluna `User.passwordChangedAt` (nullable, sem default — não popular retroativamente,
  `null` é um estado válido e esperado para todo usuário existente) + tabela `PasswordResetToken`
  (índice em `userId`, `tokenHash` `@unique` para o lookup O(1) e para garantir que uma colisão de
  geração nunca sobrescreva um token ativo). Sem multi-tenancy adicional (já é escopado por `userId`);
  sem soft delete (token expira/é marcado usado, não precisa de exclusão lógica separada).

### Infraestrutura

- Novas env vars (adicionar a `.env.example` e à documentação de deploy):
  ```env
  # SMTP (envio de email transacional — password reset)
  SMTP_HOST=""
  SMTP_PORT="587"
  SMTP_USER=""
  SMTP_PASSWORD=""
  SMTP_FROM="DBD Statistics <no-reply@example.com>"

  # URL base pública da aplicação — usada para montar o link do email
  APP_URL="http://localhost:3000"
  ```
- Nova dependência: `nodemailer` (+ `@types/nodemailer` em devDependencies).
- CI (`.github/workflows/ci.yml`) usa env dummy e nunca toca banco/SMTP real — os testes mockam
  `nodemailer` e `prisma`, então o pipeline não precisa de credenciais SMTP reais. Nenhuma mudança no
  workflow é necessária a não ser garantir que `APP_URL`/`SMTP_*` dummy existam se algum teste ler
  `process.env` diretamente sem mock (evitar isso — sempre mockar o módulo `mailer`, nunca as env vars
  cruas, nos testes de rota).

---

## Modelo de dados

| Tabela | Coluna | Tipo | Notas |
|--------|--------|------|-------|
| `User` | `passwordChangedAt` | `DateTime?` | Nullable, sem default. `null` = nunca trocou por este fluxo. |
| `PasswordResetToken` | `id` | `String` (cuid) | PK |
| `PasswordResetToken` | `userId` | `String` | FK → `User.id`, `onDelete: Cascade`, indexado |
| `PasswordResetToken` | `tokenHash` | `String` | sha256 do token bruto, `@unique` |
| `PasswordResetToken` | `expiresAt` | `DateTime` | `now() + 1h` na criação |
| `PasswordResetToken` | `usedAt` | `DateTime?` | `null` = ainda válido/não consumido |
| `PasswordResetToken` | `createdAt` | `DateTime` | `@default(now())` |

## Endpoints envolvidos

| Método | Path | Auth | Entrada (DTO) | Resposta | Erros |
|--------|------|------|---------------|----------|-------|
| POST | `/api/auth/forgot-password` | Nenhuma (pública) | `{ email: string }` | `200 { message: string }` (sempre, mesmo se o email não existir) | `400` payload inválido; `500` erro inesperado |
| POST | `/api/auth/reset-password` | Nenhuma (pública) | `{ token: string, password: string }` | `200 { ok: true }` | `400` payload inválido **ou** token inválido/expirado/usado (mesma mensagem genérica); `500` erro inesperado |

---

## Casos de erro & validações

| Situação | Validação / Detecção | Resposta esperada |
|----------|----------------------|--------------------|
| Email malformado em `forgot-password` | Zod `z.email()` | `400` |
| Email não cadastrado em `forgot-password` | `prisma.user.findUnique` retorna `null` | `200` genérico (sem enviar email) — idêntico ao caso de sucesso |
| Token ausente/vazio em `reset-password` | Zod `min(1)` | `400` |
| Senha nova muito curta | Zod `min(4)` | `400` |
| Token não encontrado no banco | lookup por `tokenHash` retorna `null` | `400 { error: "Invalid or expired token" }` |
| Token já usado | `usedAt !== null` | `400 { error: "Invalid or expired token" }` (mesma mensagem — não diferenciar) |
| Token expirado | `expiresAt <= now()` | `400 { error: "Invalid or expired token" }` |
| SMTP não configurado (env ausente) em produção | `mailer.ts` lança ao montar o transport | `500` (erro de operação — logar, não expor detalhe ao cliente) |
| Falha ao enviar o email (SMTP indisponível) | erro capturado no `catch` do handler | `500` — o token **já foi criado** na transação anterior; o usuário pode tentar de novo (o pedido seguinte invalida o token órfão do pedido que falhou) |
| Reset com sessão JWT antiga após troca | `jwt()` callback detecta `passwordChangedAt` > `token.iat` | requisição autenticada seguinte trata como deslogado (`401`/redirect para `/login`, conforme a rota) |

## Impactos

- **`src/auth.ts` / `src/auth.config.ts`** — todo fluxo de login/sessão passa a fazer uma consulta
  Prisma adicional (`select` mínimo por PK) a cada vez que `jwt()` roda no runtime Node. Efeito
  colateral: **qualquer** usuário que nunca usou o reset de senha continua com `passwordChangedAt =
  null`, então a comparação é `false` e o comportamento de sessão hoje **não muda** para ninguém que
  não passou pelo fluxo novo.
- **`User` (schema)** — nova coluna nullable, não quebra nenhum seed/fixture existente (seed não seta
  esse campo; testes que constroem `userRow(...)` para mocks de Prisma podem opcionalmente incluir
  `passwordChangedAt: null` para bater com o tipo gerado — ajustar fixtures em
  `auth-credentials.test.ts`/`signup/route.test.ts` se o tipo do Prisma Client passar a exigir o campo).
- **`LoginForm`** — só adiciona um link, sem mudança de comportamento existente.
- **Nenhum impacto** em Match/Killer/streaks/crews/community/rank/seasons — feature isolada em
  auth + um novo domínio de token.

---

## Riscos

- **Email bombing em `/api/auth/forgot-password` (severidade: média):** o rate limit é o global do
  `proxy.ts` (20 req/10s por IP) — um IP pode disparar 20 emails de reset para a mesma vítima em 10s e
  repetir a cada janela. _Mitigação:_ aceitável para o estágio atual do produto (baseline já
  documentado como suficiente); um limiter dedicado e mais estrito para esta rota específica fica
  registrado como item futuro (ver seção correspondente).
- **SMTP mal configurado em produção (severidade: alta, mas de detecção imediata):** se
  `SMTP_HOST`/`SMTP_USER`/etc. não estiverem setados no ambiente de deploy, todo pedido de reset falha
  com `500` visível no primeiro teste manual. _Mitigação:_ `mailer.ts` lança erro explícito e cedo
  (fail-fast, não fail-silent) — o problema aparece no log/no smoke test antes de afetar usuários reais.
- **Token vazado em log de acesso/proxy (severidade: baixa):** o token bruto trafega na query string
  do link (`?token=...`), então pode aparecer em logs de acesso de proxies/CDNs. _Mitigação:_ já
  mitigado pelo desenho — o token é de uso único e expira em 1h; um vazamento de log não é suficiente
  sozinho sem também ter acesso ao email da vítima antes que ela use o link.
- **Consulta Prisma extra por request autenticado (severidade: baixa, performance):** todo `jwt()`
  agora bate no banco. _Mitigação:_ `select` mínimo (uma coluna, por PK indexada) — custo desprezível
  na escala atual do produto; não otimizar prematuramente (ex.: cache/TTL na checagem) sem medir.
- **Superfície sensível (auth/sessão):** este ponto de compliance já está sinalizado nesta linha e não
  se repete no restante do plano — dado real de usuário (email, senha) só é tocado via os caminhos já
  existentes (bcrypt, Prisma singleton); nada novo em termos de PII é introduzido além do que o cadastro
  já trata.

## Estratégia de rollback

- **Código:** revert do PR — as duas rotas novas, as duas páginas novas e o link na `LoginForm` são
  aditivos; removê-los não afeta nenhum fluxo existente.
- **Schema:** `PasswordResetToken` é uma tabela nova (dropável sem side-effect) e
  `User.passwordChangedAt` é nullable sem default (remover a coluna não afeta linhas existentes). Como
  o projeto usa `db:push` (sem arquivos de migration versionados), o rollback de schema é "reverter o
  `schema.prisma` e rodar `db:push` de novo" — não há uma migration reversível formal para desfazer,
  então a ordem de deploy importa: **fazer o rollback do código antes ou junto do rollback do schema**
  (nunca deixar o código novo em produção apontando para um schema já revertido).
- **Sem feature flag dedicada** — dado o tamanho da feature (duas rotas isoladas, sem tocar em fluxo
  existente), uma flag `NEXT_PUBLIC_PASSWORD_RESET_ENABLED` é desproporcional; o rollback é via revert
  de deploy, seguindo o padrão do restante do auth (login/signup também não têm flag).

---

## Plano de testes

- **Unit:**
  - `src/lib/password-reset.test.ts` — `generateResetToken` produz `raw` único por chamada, `hash`
    determinístico para o mesmo `raw`, `expiresAt` ~1h no futuro; `hashToken(raw)` bate com o `hash` de
    `generateResetToken`.
  - `src/lib/session-invalidation.test.ts` — `isTokenStale`: `false` quando `passwordChangedAt` é
    `null`; `false` quando `passwordChangedAt` é anterior a `token.iat`; `true` quando é posterior;
    `false` quando `token.iat` é `undefined`.
  - `src/lib/mailer.test.ts` — `sendPasswordResetEmail` chama `transport.sendMail` com `to`/assunto/
    corpo contendo a `resetUrl`; lança quando env de SMTP está ausente (mock de `process.env`).
- **Integração (rotas):**
  - `src/app/api/auth/forgot-password/route.test.ts` — 400 email inválido; 200 + `sendMail` **não**
    chamado quando usuário não existe; 200 + token criado + `sendMail` chamado quando existe; tokens
    antigos do mesmo usuário marcados `usedAt` ao criar um novo.
  - `src/app/api/auth/reset-password/route.test.ts` — 400 payload inválido; 400 token inexistente; 400
    token expirado; 400 token já usado; 200 caminho feliz — senha atualizada (hash, não texto puro),
    `passwordChangedAt` setado, token marcado usado.
- **Componentes:**
  - `ForgotPasswordForm.test.tsx` — submit chama `fetch` com o email; mostra toast genérico em sucesso
    e em erro de rede.
  - `ResetPasswordForm.test.tsx` — sem `token` prop, mostra estado de erro sem form; com `token`,
    valida senhas diferentes (erro inline sem fetch); submit com senhas iguais chama `fetch`; sucesso
    redireciona para `/login`; erro 400 mostra o estado de link inválido.
- **E2E / regressão:** não há suíte E2E no projeto hoje (fora de escopo introduzir uma); regressão
  manual mínima: login/signup continuam funcionando normalmente após a mudança em
  `auth.ts`/`auth.config.ts` (um usuário que nunca resetou a senha loga normalmente, sessão não cai).

## Critérios de aceite

- [ ] Um usuário deslogado consegue, a partir de `/forgot-password`, receber um email com um link que
      leva a `/reset-password?token=...`.
- [ ] O link permite definir uma nova senha e, a partir dela, logar em `/login` com a nova senha.
- [ ] A resposta de `POST /api/auth/forgot-password` é idêntica (status + corpo) para um email
      cadastrado e para um não cadastrado.
- [ ] Um token já usado, ou expirado, ou inexistente, sempre retorna o mesmo erro genérico em
      `POST /api/auth/reset-password`.
- [ ] Depois de um reset bem-sucedido, uma sessão JWT aberta em outro dispositivo/navegador **antes**
      da troca deixa de ser aceita na próxima requisição autenticada.
- [ ] `npm run test`, `npm run lint` e `npx tsc --noEmit` passam.
- [ ] Entrada adicionada em `src/lib/changelog.ts` (`requestedBy: "Community"`).

---

## Estimativa de complexidade

| Tarefa | Otimista | Provável | Pessimista |
|--------|:--------:|:--------:|:----------:|
| Schema (`PasswordResetToken` + `passwordChangedAt`) + `db:push` | 0.25 dia | 0.25 dia | 0.5 dia |
| `src/lib/password-reset.ts` + `session-invalidation.ts` + testes | 0.25 dia | 0.5 dia | 0.75 dia |
| `src/lib/mailer.ts` (Nodemailer) + testes | 0.5 dia | 0.75 dia | 1.5 dia (deliverability/SMTP real dando problema) |
| Rotas `forgot-password` / `reset-password` + testes | 0.5 dia | 0.75 dia | 1 dia |
| `auth.ts` / `auth.config.ts` (invalidação de sessão) + testes | 0.5 dia | 1 dia | 1.5 dia (é a peça mais sutil do plano) |
| Frontend (2 páginas + 2 forms + link na `LoginForm`) + testes | 0.75 dia | 1 dia | 1.5 dia |
| Env vars, changelog, docs, revisão | 0.25 dia | 0.5 dia | 0.5 dia |
| **Total** | **~3 dias** | **~4.75 dias** | **~7.25 dias** |

> Complexidade geral: **média** — nenhuma peça isolada é complexa, mas a invalidação de sessão JWT
> (edge-safe vs Node) exige atenção para não quebrar login/signup existentes. Calendário: 1 dev → ~1
> semana incluindo testes e revisão. Não inclui obtenção de credenciais SMTP reais de produção (ver
> Dependências).

## Dependências

- **Credenciais SMTP reais** para o ambiente de produção (host, porta, usuário, senha, domínio "from"
  com SPF/DKIM configurado o suficiente para não cair em spam) — depende de decisão/acesso do usuário,
  fora do controle deste plano de código.
- **`APP_URL` de produção** definido no ambiente de deploy (ex.: Vercel) — sem isso o link do email
  fica com uma URL errada.
- Nenhuma dependência de outra equipe, aprovação externa ou ordem com outras features em andamento no
  repo (seasons/killer-mode/crews não são tocados).

---

## Checklist final (Definition of Done)

- [ ] Fluxo completo (forgot → email → reset → login com a nova senha) funcionando ponta a ponta.
- [ ] Sessão JWT antiga invalidada após reset, verificado manualmente (dois navegadores/perfis).
- [ ] Testes verdes: unit (`password-reset`, `session-invalidation`, `mailer`), integração (as duas
      rotas), componentes (os dois forms).
- [ ] `npm run test` · `npm run lint` · `npx tsc --noEmit` verdes.
- [ ] `.env.example` atualizado com `SMTP_*` e `APP_URL`.
- [ ] Entrada no changelog (`src/lib/changelog.ts`, `requestedBy: "Community"`).
- [ ] Sem regressão em login/signup (sessão de um usuário que nunca resetou a senha continua estável).
- [ ] Nenhuma diferença de resposta observável entre email existente/inexistente em
      `forgot-password` (checado explicitamente em teste, não só "parece igual").

## Itens futuros (fora do escopo)

- 🔭 Rate limiter dedicado e mais estrito só para `forgot-password` (ex.: por IP+email, janela maior)
  para reduzir o risco de email bombing além do que o limiter global cobre.
- 🔭 Email de aviso "sua senha foi alterada" enviado ao email antigo/atual após um reset bem-sucedido
  (sinal extra para o usuário perceber uma troca não autorizada).
- 🔭 Verificação de email no cadastro (email confirmation), que reaproveitaria boa parte da
  infraestrutura de token/email construída aqui.
- 🔭 Migrar de SMTP para um provedor transacional dedicado (Resend/SES) se a deliverability via SMTP se
  mostrar um problema em produção.
