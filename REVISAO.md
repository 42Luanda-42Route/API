# 🧭 Revisão Sénior — 42RouteAPI (42 Luanda)

> **Data:** 12 de Setembro de 2026
> **Revisor:** Revisão técnica sénior (backend / segurança / arquitectura)
> **Âmbito:** Todo o código-fonte, base de dados, testes, Docker/CI e documentação
> **Método:** Leitura ficheiro-a-ficheiro **+ prova prática**. Onde digo "confirmado", subi a
> aplicação em memória (sem tocar em nenhuma base de dados real) e reproduzi o comportamento.

---

## 1. Antes de tudo: eu entendi a ideia 💡

O **42RouteAPI** é o cérebro de uma app de mobilidade para a comunidade da **42 Luanda**. A ideia,
na linguagem do dia-a-dia, é esta:

- Os **cadetes** (estudantes) precisam de apanhar **candongueiros** (mini-autocarros) para chegar
  ao campus. Cada cadete está ligado a uma **paragem**, e cada paragem pertence a uma **rota**.
- Os **motoristas** circulam numa rota e partilham a sua **localização em tempo real**. Se o
  motorista ficar "offline" mais de 30 segundos, um cadete a bordo pode assumir e emitir a
  posição do candongueiro (o tal *fallback inteligente*). Isto é uma ideia muito boa. 👏
- Os **administradores** gerem tudo (rotas, paragens, motoristas).
- Há um fluxo de **QR Code** recente: o cadete mostra um QR de identidade, o motorista lê e
  "admite" o cadete a bordo; ou o motorista mostra um QR de embarque e o cadete lê para pedir
  boleia. Isso gera uma **lista de embarque** (`BoardingRequest`) que o motorista aprova/rejeita.

Tecnicamente está montado com **Fastify + TypeScript + Prisma + PostgreSQL + Socket.IO**, seguindo
**Clean Architecture** (domínio → aplicação → infra → interfaces). A separação em camadas está
bem feita e é fácil de ler.

**Resumindo o meu veredicto:** a base é sólida e a intenção arquitectural é madura. Mas há um
**buraco de segurança estrutural** que atravessa quase toda a API — **não existe autorização por
papel (role)**. Hoje, qualquer pessoa que faça login com uma conta da 42 (ou seja, qualquer
cadete) tem, na prática, poderes de administrador. Isto tem de ser resolvido **antes** de ir para
produção. Também há **desalinhamento entre o schema Prisma e as migrations** que vai partir um
deploy limpo. O resto são melhorias de qualidade.

| Área | Estado |
|---|---|
| 🏗️ Arquitectura & organização | 🟢 Bom |
| ✅ Testes (existem e passam) | 🟢 Bom / 🟡 com lacunas grandes |
| 🔴 **Autorização (quem-pode-fazer-o-quê)** | 🔴 **Crítico** |
| 🔴 **Fugas de dados pessoais / password** | 🔴 **Crítico** |
| 🟠 Base de dados vs migrations / seed | 🟠 Alto (parte um deploy limpo) |
| 🟡 Tempo real (WebSocket) | 🟡 Falhas de confiança |
| 🟡 DevOps / segredos / config | 🟡 A limpar |

---

## 2. O que já está muito bom (dar a mão à palmatória) 🌟

Não é justo só apontar problemas. Estas escolhas estão certas e vale a pena mantê-las:

1. **Clean Architecture a sério.** Domínio, use cases, repositórios e controllers estão bem
   separados. Trocar Prisma por outra coisa amanhã seria simples.
2. **Validação de ambiente no arranque** (`src/config/env.ts`) — se faltar `JWT_SECRET` ou
   `DATABASE_URL`, a app rebenta logo em vez de arrancar insegura. Excelente.
3. **`PrismaErrorHandler`** traduz erros do Prisma (P2002 → 409, etc.) em vez de deixar escapar
   500 genéricos.
4. **Mensagem de login genérica** (`Invalid credentials`) — não revela se o utilizador existe.
5. **Swagger protegido** com Basic Auth e com os campos sensíveis (`password`, `token`) removidos
   dos schemas.
6. **Existem testes e passam** — 83 testes verdes (`58 unit`, `25 integração/e2e`). Muitos
   projectos neste estágio não têm nenhum.
7. **Throttle + fallback no tempo real** — a ideia de limitar a 1 update/2s e o failover do
   motorista para o cadete está bem pensada.

Confirmei localmente: `npx tsc --noEmit` passa a 0 erros e as três suites de testes ficam verdes.

---

## 3. 🔴 Achados CRÍTICOS de segurança (confirmados na prática)

> ⚠️ Cada um destes eu **reproduzi** com a app a correr em memória. Não são teorias.

### C-1 · Não existe autorização por papel — qualquer cadete é, de facto, admin

Este é **o** problema. Todas as rotas de escrita usam `preHandler: [app.authenticate]`, que só
verifica se o **token é válido** — nunca verifica **que papel** o token tem. Como *qualquer* login
pela 42 Intra devolve um token `role: "CADETE"`, qualquer estudante consegue:

- **Criar administradores** → `POST /api/admins`
- **Apagar/editar motoristas, rotas e paragens**
- **Mudar a password de um motorista** → `PUT /api/drivers/:id`

**Prova que corri (resposta real da app):**

```
1) CADETE  → POST /api/admins ............... 201  {"id":99,"username":"intruso",...}
2) CADETE  → PUT /api/drivers/7 {password} .. 200  (nova password gravada com hash bcrypt ✔)
```

**Porquê:** em `admin.routes.ts:106`, `driver.routes.ts:122`, etc., o guarda é só
`app.authenticate`. Não há nenhum `requireRole("ADMIN")` em lado nenhum do código (procurei — a
palavra `role` só é escrita dentro dos tokens e lida no módulo de QR).

**Como corrigir:** criar um `preHandler` de autorização, por exemplo:

```ts
// plugins/authorize.ts
export const requireRole = (...roles: string[]) =>
  async (req, reply) => {
    if (!roles.includes((req.user as any)?.role)) {
      return reply.code(403).send({ error: "Forbidden" })
    }
  }

// admin.routes.ts
app.post("/admins", { preHandler: [app.authenticate, requireRole("ADMIN")] }, handler)
```

E decidir, rota a rota, quem pode: Admin gere tudo; Driver mexe no próprio registo/localização;
Cadete só lê e usa QR. **É a correcção número 1 do projecto.**

---

### C-2 · A leitura do QR de rota devolve o hash da password do motorista

Ligado ao C-1, mas com uma fuga extra. `POST /api/qr/route/scan`:

1. Não verifica que quem chama é motorista (um cadete consegue chamar).
2. Devolve o objecto `Driver` **inteiro** — **incluindo o campo `password`** (o hash bcrypt).

O resto da API tem o cuidado de fazer `const { password, ...safe } = result` antes de responder
(ver `DriverController`), mas o `QrController.scanRoute` (`QrController.ts:23`) esqueceu-se disso.

**Prova que corri:**

```
3) CADETE → POST /api/qr/route/scan ......... 200
   resposta contém hash de password? .......... TRUE   ⬅️ fuga
   escritas feitas: [ {id:7 → current_route_id:null}, {id:3 → current_route_id:1} ]
```

Repara também na segunda linha: além de vazar a password, o scan **roubou a rota** — tirou o
motorista 7 da rota e pôs a rota no id do próprio cadete. Ou seja, um cadete consegue sabotar a
distribuição de rotas de toda a frota.

**Como corrigir:** proteger o endpoint com `requireRole("DRIVER")` (C-1) **e** remover `password`
da resposta (idealmente nunca trazer o campo da base de dados — usar `select` no Prisma).

---

### C-3 · Open redirect no OAuth — o token viaja no URL para onde o atacante quiser

No arranque do login (`GET /api/auth/42/login?redirect=...`), o parâmetro `redirect` é colocado
tal-e-qual no `state` do OAuth (`GenerateAuthUrl.ts:21`), e no callback a app faz
`reply.redirect(\`${targetUrl}?token=${result.token}...\`)` (`AuthController.ts:42-45`) — **sem
validar** para onde está a redireccionar.

**Prova que corri:**

```
4) GET /api/auth/42/login?redirect=https://site-malicioso.example/roubar
   → 302, state = https://site-malicioso.example/roubar
```

Um atacante manda a vítima clicar nesse link; depois do login, o **JWT da vítima é entregue no URL
de um site controlado pelo atacante**. É um vector clássico de roubo de sessão.

**Como corrigir:** manter uma *allow-list* de domínios de redirect (ex.: `env.CORS_ORIGINS`) e
recusar qualquer `redirect`/`state` que não esteja nela. Entregar o token no *body*/fragmento em
vez de query string ajuda também.

---

### C-4 · Refresh token e access token são indistinguíveis (e ambos duram muito)

`utils/jwt.ts` assina **os dois** com o mesmo segredo e a função `verifyRefreshToken` é *igual* à
`verifyToken`. Consequências:

- Um **access token** pode ser trocado por um **refresh token de 30 dias** no endpoint
  **público** `POST /api/auth/refresh` (sem `preHandler`).
- Esse refresh token de 30 dias é **aceite como access token** em qualquer rota protegida.

**Prova que corri:**

```
5)  access token → POST /api/auth/refresh ......... 200  (refreshToken válido ~30 dias)
5b) refresh token → POST /api/routes .............. 201  (aceite como se fosse login normal)
```

Na prática, **não há expiração curta útil nem forma de revogar** uma sessão: qualquer token vira
um passe de 30 dias. Como não há base de dados de refresh tokens, não é possível "expulsar" um
token roubado.

**Como corrigir:** usar um *claim* distinto (ex.: `type: "refresh"`) e/ou um segredo separado; a
rota de refresh só deve aceitar tokens do tipo refresh e emitir um access curto; guardar um
identificador de refresh em BD para permitir revogação.

---

### C-5 · Dados pessoais dos cadetes expostos sem autenticação

`GET /api/cadetes`, `GET /api/drivers`, `GET /api/cadetes/:id`, `GET /api/cadetes/:id/route-info`
são **públicos** (sem token). Devolvem nome real, email, telefone, distrito e a flag
`priorityList`.

**Prova que corri:**

```
6) GET /api/cadetes  (sem token) → 200
   {"data":[{"fullName":"Nome Real","email":"c1@student.42luanda.com","phone":923000000,...}]}
```

Isto é uma exposição de **dados pessoais** de estudantes a qualquer pessoa na internet. Além do
risco de privacidade, o `route-info` revela onde e a que horas um cadete costuma apanhar
transporte — informação sensível de segurança física.

**Como corrigir:** exigir autenticação nestas leituras e devolver só os campos necessários ao
ecrã que os usa (o mapa não precisa do email nem do telefone de toda a gente).

---

### C-6 · No WebSocket, um cadete finge ser o motorista

O socket valida o JWT no *handshake* (bom!), mas depois **confia cegamente no `id_driver` que vem
dentro da mensagem** (`socket.ts:189`), em vez de o comparar com o utilizador autenticado do
socket. Resultado: qualquer cliente autenticado emite `driver:updateLocation` com o id de outro
motorista e a app aceita.

**Prova que corri:**

```
7) socket: cadete emitiu driver:updateLocation {id_driver: 7}
   → OUTRO cadete na rota recebeu: {"id_driver":7,"lat":-8.9,"long":13.1,"driverName":"Motorista Sete"}
```

Ou seja, dá para **injectar localizações falsas** do candongueiro e enganar toda a gente na rota.
O mesmo se aplica a `cadete:updateLocation`.

**Como corrigir:** ignorar o id vindo do payload; usar sempre `socket.user.id` + `socket.user.role`
como fonte da verdade. Um `DRIVER` só pode emitir a sua própria posição; um `CADETE` só a dele.

---

### C-7 · Superfície menor mas a arrumar

- **CORS do socket fixo em `origin: "*"`** (`socket.ts:34`) — mesmo que o CORS HTTP seja fechado
  por ambiente, o WebSocket aceita qualquer origem. Usar `env.CORS_ORIGINS` aqui também.
- **Rate limit só global (100/min) e sem `trustProxy`.** O login não tem limite mais apertado
  (brute-force) e, atrás do proxy da Render/ECS, **todos os pedidos partilham o IP do proxy** —
  logo um utilizador pode esgotar o balde de toda a gente, ou escapar do limite. Configurar
  `trustProxy` no Fastify e um limite dedicado no `/login`.
- **QR usa AES-ECB sem assinatura** (`qrCipher.ts`). ECB não é o modo recomendado (vaza padrões) e,
  sem MAC/assinatura, quem tiver a chave (partilhada com as apps móveis) pode forjar QRs. Como o
  TTL é curto (45s) o risco imediato é baixo, mas a médio prazo convém migrar para um esquema
  assinado (ex.: JWT curto ou AES-GCM). Nota: o valor default `change_me_16bytes` tem exactamente
  16 bytes — "funciona à primeira", o que aumenta o risco de alguém enviar a chave default para
  produção.

---

## 4. 🟠 Integridade de dados: o schema e as migrations divergiram

Isto não é segurança, mas **parte um deploy limpo** e por isso é prioritário.

### D-1 · `prisma/seed.ts` já não compila

O seed ainda usa os nomes **antigos** de colunas e um inteiro onde agora há enum:

```
prisma/seed.ts:109  passwrd:  ...     ❌ (o campo agora é 'password')
prisma/seed.ts:74   distrit:  ...     ❌ (agora 'district')
prisma/seed.ts:201  senderType: 1     ❌ (agora enum SenderType, não número)
```

Confirmado: `tsc` no seed dá **7 erros**. Como o `package.json` define
`"prisma": { "seed": "ts-node prisma/seed" }`, o passo `npx prisma db seed` que o **README manda
correr** vai **falhar**. Uma pessoa nova a seguir o README não consegue popular a base.

### D-2 · O `schema.prisma` promete coisas que nenhuma migration cria

O `schema.prisma` declara:

- `enum SenderType { CADETE DRIVER ADMIN }` e `Message.senderType` desse tipo — mas a migration
  `20260102180737_refatoring_messages` criou a coluna como **`INTEGER`**, e **não existe nenhum
  `CREATE TYPE "SenderType"`** em migration nenhuma.
- `@@index([current_route_id])` em `Drivers` e `@@index([route_id])` em `MiniBusStop` — **nenhuma
  migration os cria**.
- `onDelete: Cascade`/`SetNull` em `DriverCoordinates`, `MiniBusStop.route_id` e `Message.chat_id` —
  as migrations existentes ainda têm `ON DELETE RESTRICT`.

Ou seja: quem correr `prisma migrate deploy` do zero fica com uma base **diferente** do que o
`schema.prisma` diz. Em particular, o `Message.senderType` fica `INTEGER` na BD mas o Prisma
Client foi gerado à espera de um enum → qualquer query a `Message` vai falhar em runtime.

**Como corrigir:** gerar uma migration que reconcilie tudo (`prisma migrate dev` num ambiente de
dev limpo) para que schema, migrations e client fiquem alinhados; e **corrigir o seed** para os
nomes/tipos novos. Depois, adicionar ao CI um passo que corre `prisma migrate deploy` numa BD
descartável + `prisma db seed`, para nunca mais isto passar despercebido.

> Detalhe simpático de notar: os campos com typo (`passwrd`, `distrit`, `prioritityList`) foram
> mantidos na BD via `@map(...)`, mas com nomes limpos no código. É uma solução pragmática e válida —
> só é preciso garantir que o seed também usa os nomes limpos.

---

## 5. 🟡 Qualidade de arquitectura e código

Nada disto é urgente, mas eleva o projecto:

1. **O WebSocket fala directamente com o Prisma** (`socket.ts`) em vez de reutilizar os use
   cases/repositórios. Isto duplica regras de negócio (o *upsert* de coordenadas existe no socket
   **e** no `DriverController`) e torna o socket praticamente impossível de testar. Vale a pena
   passar o socket a usar os mesmos use cases.
2. **Lógica de broadcast dentro do `DriverController.updateLocationHandler`** — o controller
   conhece o Socket.IO (`req.server.io`), decide salas, etc. Isso devia viver num serviço/use case
   dedicado. (Também faz um N+1: *upsert* + `getDriverById` a cada update de GPS.)
3. **Estado de "motorista activo" em memória** (`routeLocationState`) — funciona num processo só,
   mas quebra assim que houver 2 instâncias (Render/ECS a escalar). Para escalar, mover para Redis
   + `@socket.io/redis-adapter`.
4. **`(app.server as any).io`** — o Socket.IO é pendurado no servidor com *cast* para `any` e lido
   com `any` no controller. Frágil. Melhor decorar o Fastify (`app.decorate("io", io)`) com tipos.
5. **Consistência de update com `!== undefined`** — já está bem feito (permite limpar campos para
   `null`), bom que o plano anterior foi seguido.

---

## 6. 🟡 Testes: existem, passam, mas têm um ponto cego perigoso

Pontos bons: 83 testes verdes, use cases cobertos, e2e via `app.inject()`.

O problema é **o que não é testado**:

- **Zero testes para o módulo de QR / boarding** — que é a funcionalidade **mais recente e mais
  sensível** (é onde estão os buracos C-1, C-2).
- **Zero testes para `socket.ts`** — onde está o C-6.
- **Nenhum teste de autorização** (papel errado → 403). Um único teste "cadete faz POST /admins →
  deve dar 403" teria apanhado o C-1 no primeiro dia.
- Os testes de "integração" e "e2e" **mockam o Prisma** — nunca tocam numa BD real, por isso
  **não apanhariam** o desalinhamento schema↔migration da secção 4.

**Sugestão concreta:** adicionar (a) testes de autorização por papel para cada grupo de rotas, e
(b) uma suite de integração que corre contra um Postgres real (Docker/Testcontainers) com
`migrate deploy` + `seed`.

---

## 7. 🟡 DevOps, segredos e documentação

- **Segredos em ficheiros versionados.** O `.env` real **não** está no git (bom!). Mas o
  `README.md` e o `.env.example` publicam a password do Swagger
  `4FutureWillBeBrilliant2DoBungle` e as passwords de seed (`12345678`). Se alguma destas for
  reutilizada em produção, está queimada. Tratar tudo isto como *placeholder* e rodar segredos
  reais fora do repositório.
- **`docker-compose.yaml`** monta `.:/app` e corre `npx ts-node src/main.ts` — é setup de
  desenvolvimento a fingir de produção (o volume tapa a imagem construída). Ok para dev; só não
  confundir com o deploy real.
- **CI (`.github/workflows/aws.yml`)** está com todos os valores por preencher (`MY_AWS_REGION`,
  `MY_ECR_REPOSITORY`, …) e dispara no push para `main`. Ou se completa, ou se desliga, para não
  dar a falsa sensação de que há deploy automático.
- **Documentação desatualizada.** Vários pontos do `42RouteAPI_documentation.md` já não batem com
  o código: fala do `Chats.ts` (foi apagado), do timeout de "10s" (o código usa 30s), de erros
  `Driver not found`/`Admin not found` (o login agora devolve `Invalid credentials`) e mostra o
  typo `prioritityList`. Não tem **nada** sobre o novo módulo de QR/boarding.
- **Documentos internos com caminhos locais.** `audit_report.md`, `implementation_plan.md` e
  `walkthrough.md` têm dezenas de links `file:///c:/Users/GChipombo/OneDrive.../...`. Isso expõe o
  nome de utilizador e a estrutura de pastas de uma pessoa, e são links que só funcionam nessa
  máquina. Convém tirá-los do repositório ou converter em caminhos relativos.

---

## 8. 🗺️ Plano de acção priorizado (o que eu faria, por ordem)

### 🚨 Fase 0 — Travões de mão antes de qualquer produção
| # | Acção | Achado | Esforço |
|---|---|---|---|
| 1 | Criar `requireRole(...)` e aplicá-lo a **todas** as rotas de escrita/admin | C-1 | Médio |
| 2 | Nunca devolver `password`; corrigir o `QrController.scanRoute` e usar `select` no Prisma | C-2 | Baixo |
| 3 | Validar `redirect`/`state` do OAuth contra allow-list | C-3 | Baixo |
| 4 | Exigir autenticação nas leituras de cadetes/motoristas e reduzir campos | C-5 | Baixo |
| 5 | No socket, usar `socket.user` como verdade (ignorar `id` do payload) | C-6 | Baixo |

### ⚡ Fase 1 — Não partir o deploy / a sessão
| # | Acção | Achado | Esforço |
|---|---|---|---|
| 6 | Reconciliar `schema.prisma` ↔ migrations (enum `SenderType`, índices, `onDelete`) | D-2 | Médio |
| 7 | Corrigir `prisma/seed.ts` (`password`, `district`, enum) | D-1 | Baixo |
| 8 | Separar refresh de access token (claim/segredo próprio + revogação) | C-4 | Médio |
| 9 | `trustProxy` + rate limit dedicado no login; CORS do socket por ambiente | C-7 | Baixo |

### 🔧 Fase 2 — Qualidade e robustez
| # | Acção | Achado | Esforço |
|---|---|---|---|
| 10 | Testes de autorização (papel errado → 403) + testes do módulo QR e do socket | Secção 6 | Médio |
| 11 | Socket a usar use cases/repos; tirar broadcast do controller | Secção 5 | Médio |
| 12 | Estado de rota + adapter em Redis (para escalar) | Secção 5 | Médio |

### 🎨 Fase 3 — Polimento
| # | Acção | Achado | Esforço |
|---|---|---|---|
| 13 | Actualizar documentação (QR, timeout 30s, mensagens de erro) | Secção 7 | Baixo |
| 14 | Tirar segredos/paths locais dos ficheiros versionados | Secção 7 | Baixo |
| 15 | Completar ou desligar o workflow de CI | Secção 7 | Baixo |

---

## 9. Palavra final 🙌

Há aqui um projecto genuinamente bom por baixo. A arquitectura é limpa, a intenção é madura e o
facto de **já existirem testes que passam** diz muito sobre o cuidado da equipa. O tema do
*fallback* motorista→cadete é uma ideia de produto inteligente.

O que impede este código de ir para produção **hoje** é uma coisa concreta e resolúvel:
**falta a camada de "quem pode fazer o quê"**. Tudo o resto dos achados críticos (fuga de
password, open redirect, spoofing no socket) é sintoma do mesmo tema — a API confia demais em quem
está do outro lado. Depois de resolver a Fase 0 e de realinhar o Prisma com as migrations (Fase 1),
isto fica num sítio muito confortável.

Se precisares, o passo seguinte natural é eu implementar a **Fase 0** (o `requireRole` + tapar as
fugas) num branch, com testes de autorização a acompanhar — é a maior redução de risco pelo menor
esforço. É só dizeres. 🚀

---
<sub>Revisão feita por leitura completa do código e por reprodução prática em ambiente isolado em
memória (sem acesso a nenhuma base de dados real). Nenhum ficheiro de código foi alterado nesta
revisão — só foi adicionado este relatório.</sub>
