# 🔍 Auditoria Completa — 42RouteAPI-42Luanda

> **Data:** 13 de Agosto de 2026  
> **Escopo:** Análise de todos os ficheiros do projecto (código, configuração, infraestrutura)  
> **Metodologia:** Revisão manual ficheiro-a-ficheiro com foco em segurança, arquitetura, consistência, performance e boas práticas

---

## Resumo Executivo

| Categoria | Crítico | Alto | Médio | Baixo |
|-----------|:-------:|:----:|:-----:|:-----:|
| 🔴 Segurança | 4 | 4 | 2 | — |
| 🟠 Arquitectura | — | 2 | 3 | 1 |
| 🟡 Consistência de Código | — | 2 | 4 | 2 |
| 🔵 WebSocket | 1 | 2 | 2 | 1 |
| 🟣 Base de Dados | — | 2 | 2 | 1 |
| ⚪ Tratamento de Erros | — | 2 | 2 | — |
| 🟤 Performance | — | 2 | 2 | — |
| ⬛ Testes | 1 | — | — | — |
| 🟢 DevOps | — | 1 | 3 | 1 |
| 🔶 Validação de Dados | — | 2 | 2 | — |
| **Total** | **6** | **19** | **22** | **6** |

---

## 1. 🔴 Segurança

### SEC-01 · JWT_SECRET sem validação no startup `CRÍTICO`

**Ficheiros:** [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts#L76-L79), [LoginAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/LoginAdmin.ts#L28), [LoginDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/LoginDriver.ts#L30)

O `JWT_SECRET` é usado com `as string` em múltiplos locais sem qualquer validação de que a variável de ambiente existe. Se `JWT_SECRET` for `undefined`, o servidor arranca mas gera tokens com `undefined` como chave — qualquer pessoa pode forjar tokens.

**Sugestão:** Validar todas as variáveis de ambiente obrigatórias no startup (antes de `app.listen`). Usar o ficheiro vazio [env.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/config/env.ts) para implementar essa validação com crash imediato se faltar alguma.

---

### SEC-02 · Rotas sensíveis sem autenticação `CRÍTICO`

**Ficheiros:** [miniBusStops.routes.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/routes/miniBusStops.routes.ts#L22-L27), [route.routes.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/routes/route.routes.ts#L18-L22)

**Todas** as rotas de MiniBusStops (POST, PUT, DELETE) e Routes (POST) são **públicas** — qualquer pessoa sem token pode criar, modificar e apagar paragens e rotas. Isto é inconsistente com Admins, Cadetes e Drivers que protegem as operações de escrita.

```
// miniBusStops.routes.ts — TODOS públicos
app.post("/minibusstop", ...)     // ❌ Sem preHandler: [app.authenticate]
app.put("/minibusstop/:id", ...)  // ❌ Sem preHandler: [app.authenticate]
app.delete("/minibusstop/:id", ...)// ❌ Sem preHandler: [app.authenticate]

// route.routes.ts — TODOS públicos
app.post("/routes", ...)          // ❌ Sem preHandler: [app.authenticate]
app.post("/routes/:id/stops", ...)// ❌ Sem preHandler: [app.authenticate]
```

**Sugestão:** Adicionar `{ preHandler: [app.authenticate] }` a todas as operações de escrita em MiniBusStops e Routes.

---

### SEC-03 · Passwords expostas na listagem de admins `CRÍTICO`

**Ficheiro:** [AdminPrismaRepository.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/infrastructure/repositories/AdminPrismaRepository.ts#L8-L11)

Embora `ListAdminsUseCase` faça `map(({ password, ...rest }) => rest)`, o `AdminPrismaRepository.list()` retorna **todas as passwords hasheadas** do BD para a camada de aplicação. Se algum novo endpoint chamar o repositório directamente ou se a sanitização no use case for esquecida, as hashes ficam expostas.

**Sugestão:** Usar `select` no Prisma para nunca trazer o campo `password` nas queries de listagem e getById. Retornar password apenas em `findByUsernameOrEmail` (login).

---

### SEC-04 · CORS wildcard em produção `CRÍTICO`

**Ficheiro:** [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts#L23)

```typescript
await app.register(cors, { origin: "*" })
```

O CORS aceita qualquer origin. Em produção, isto permite que qualquer website faça requests à API.

**Sugestão:** Configurar origins permitidas via variável de ambiente (ex: `CORS_ORIGINS=https://app.42luanda.ao,http://localhost:3000`).

---

### SEC-05 · WebSocket sem autenticação `ALTO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L57)

Qualquer cliente pode conectar-se ao WebSocket e emitir eventos sem autenticação. Um atacante pode:
- Enviar localizações falsas (`driver:updateLocation` com qualquer `id_driver`)
- Juntar-se a qualquer room de rota
- Causar writes no BD (upsert de coordenadas)

**Sugestão:** Implementar middleware de autenticação no Socket.IO que valide o JWT no `handshake.auth.token` antes de permitir a conexão.

---

### SEC-06 · Ausência de rate limiting `ALTO`

**Ficheiro:** [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts)

Não existe rate limiting em nenhum endpoint. O endpoint de login é especialmente vulnerável a ataques de brute force.

**Sugestão:** Usar `@fastify/rate-limit` com limites mais restritivos nos endpoints de login.

---

### SEC-07 · Informação de login revela existência de utilizadores `ALTO`

**Ficheiros:** [LoginAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/LoginAdmin.ts#L12-L14), [LoginDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/LoginDriver.ts#L12-L14)

As mensagens de erro distinguem entre "username or email not found" (404) e "Credenciais erradas" (401). Um atacante pode enumerar usernames válidos.

**Sugestão:** Usar uma mensagem genérica como "Invalid credentials" com status 401 para ambos os casos.

---

### SEC-08 · JWT gerado manualmente em vez de usar Fastify JWT `ALTO`

**Ficheiros:** [LoginAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/LoginAdmin.ts#L21-L30), [LoginDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/LoginDriver.ts#L21-L32), [Handle42Callback.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/auth/useCases/Handle42Callback.ts#L57-L72)

O projecto regista `@fastify/jwt` como plugin mas depois usa `jsonwebtoken` directamente nos use cases. Isto cria duas fontes de verdade para configuração JWT (o plugin usa `JWT_EXPIRES || "1h"`, os use cases usam `"15m"` hardcoded).

**Sugestão:** Centralizar a geração de tokens. Usar o utilitário [jwt.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/utils/jwt.ts) que já existe mas **não é utilizado** em nenhum lado, ou injectar o `app.jwt.sign()` do Fastify nos use cases.

---

### SEC-09 · Credenciais hardcoded no seed `MÉDIO`

**Ficheiro:** [seed.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/seed.ts#L7)

```typescript
const DEFAULT_PASSWORD = "12345678"
```

A password padrão está hardcoded e é fraca. Se o seed for executado em produção, os utilizadores terão credenciais triviais.

**Sugestão:** Usar uma password gerada aleatoriamente ou ler de variável de ambiente. Adicionar verificação que impeça o seed de executar com `NODE_ENV=production`.

---

### SEC-10 · Falta de helmet/security headers `MÉDIO`

**Ficheiro:** [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts)

Não existe middleware de security headers (CSP, X-Frame-Options, etc.).

**Sugestão:** Usar `@fastify/helmet` para adicionar headers de segurança automaticamente.

---

## 2. 🟠 Arquitectura

### ARCH-01 · Duas instâncias do PrismaClient `ALTO`

**Ficheiros:** [prismaClient.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/infrastructure/database/prismaClient.ts), [prisma.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/plugins/prisma.ts)

O plugin Prisma cria um PrismaClient e decora o Fastify com ele (`app.prisma`). Mas o [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L3) importa uma instância **separada** directamente de `prismaClient.ts`:

```typescript
// socket.ts
import prisma from "../infrastructure/database/prismaClient";  // ← instância A

// prisma.ts plugin
fastify.decorate('prisma', prisma)  // ← instância A (mesma ref, mas depende do import path)
```

Embora neste caso ambos importem do mesmo singleton, a existência de dois padrões de acesso ao Prisma (plugin vs import directo) é confusa e propensa a bugs em refactorings futuros.

**Sugestão:** Escolher um único padrão — ou usar sempre o singleton, ou sempre o plugin. Idealmente, o socket deveria receber o PrismaClient como parâmetro.

---

### ARCH-02 · WebSocket com acesso directo ao Prisma (violação de Clean Architecture) `ALTO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L104-L306)

O ficheiro `socket.ts` faz queries directas ao Prisma Client em vez de usar os repositórios e use cases definidos no projecto. Isto:
- Duplica lógica de negócio (ex: upsert de coordenadas existe no handler HTTP E no socket)
- Viola a Clean Architecture que o projecto segue nas camadas HTTP
- Torna os testes impossíveis (sem dependency injection)

**Sugestão:** Refactorizar o socket para usar os mesmos Use Cases e Repositories que os controllers HTTP.

---

### ARCH-03 · Código morto: Chats.ts `MÉDIO`

**Ficheiro:** [Chats.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/Chats.ts)

Todo o ficheiro está comentado e contém um erro de compilação (`cha` incompleto na linha 31). Nunca é importado.

**Sugestão:** Remover o ficheiro ou completar a implementação.

---

### ARCH-04 · Use Case não utilizado `MÉDIO`

**Ficheiro:** [FindCadeteByUsernameOrEmail.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/FindCadeteByUsernameOrEmail.ts)

O use case `FindCadeteByUsernameOrEmailUseCase` existe mas não é referenciado em nenhuma rota ou controller.

**Sugestão:** Remover se não é necessário, ou integrar onde faz falta.

---

### ARCH-05 · Utils docs.ts não utilizado `MÉDIO`

**Ficheiro:** [docs.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/utils/docs.ts)

O utilitário `autoDocs()` para gerar schemas de Swagger nunca é usado em nenhuma rota. Nenhuma rota define `schema` no Fastify, então o Swagger UI não mostra informação útil sobre request/response bodies.

**Sugestão:** Usar `autoDocs()` ou definir schemas inline nas rotas para que o Swagger gerado seja útil.

---

### ARCH-06 · Ficheiro config/env.ts vazio `BAIXO`

**Ficheiro:** [env.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/config/env.ts)

O ficheiro existe mas está completamente vazio (0 bytes de conteúdo).

**Sugestão:** Implementar validação de variáveis de ambiente aqui (ver SEC-01) ou remover o ficheiro.

---

## 3. 🟡 Consistência de Código

### CODE-01 · Naming inconsistente da password `ALTO`

**Ficheiros afectados:** Schema Prisma, DTOs, Entidades de domínio, Repositories

O campo de password tem nomes diferentes dependendo da entidade:
- **Admins:** `password` (Prisma) → `password` (domain)
- **Drivers:** `passwrd` (Prisma) → `passwrd` (domain)

O nome `passwrd` é claramente um typo que se propagou por todo o código do Driver.

**Sugestão:** Renomear para `password` em ambas as entidades. Criar uma migração Prisma (`ALTER COLUMN`).

---

### CODE-02 · Idioma misto nas mensagens de erro `ALTO`

**Ficheiros:** Vários use cases

As mensagens de erro alternam entre inglês e português sem padrão:
- `"Admin not found"` (EN) vs `"Cadete não encontrado"` (PT)
- `"Invalid credentials"` (EN) vs `"Credenciais erradas"` (PT)
- `"Bus stop deleted successfully"` (EN) vs `"Cadete não encontrado ou sem rota associada"` (PT)

**Sugestão:** Padronizar todas as mensagens num único idioma (recomendo inglês para APIs).

---

### CODE-03 · Padrão de URLs REST inconsistente `MÉDIO`

**Ficheiros:** Todos os route files

| Recurso | Listar | Obter | Criar | Atualizar | Apagar |
|---------|--------|-------|-------|-----------|--------|
| Admins | `/admins` | `/admins/:id` | `/admin` ❌ | `/admins/:id` | `/admins/:id` |
| Cadetes | `/cadetes` | `/cadetes/:id` | `/cadete` ❌ | `/cadetes/:id` | `/cadetes/:id` |
| Drivers | `/drivers` | `/driver/:id` ❌ | `/driver` | `/driver/:id` | `/driver/:id` |
| MiniBusStops | `/minibusstops` | `/minibusstop/:id` | `/minibusstop` | `/minibusstop/:id` | `/minibusstop/:id` |
| Routes | `/routes` | `/route/:id` ❌ | `/routes` | — | — |

Problemas:
- POST de Admin e Cadete usa singular (`/admin`, `/cadete`) mas tudo o resto usa plural
- GET by ID de Driver e Route usa singular (`/driver/:id`, `/route/:id`) mas listagem usa plural
- Não há padrão consistente

**Sugestão:** Usar sempre o plural: `/api/admins`, `/api/admins/:id`, etc.

---

### CODE-04 · Erros de ortografia nos nomes de campo `MÉDIO`

**Ficheiro:** [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma)

- `passwrd` — deveria ser `password` (linha 44)
- `distrit` — deveria ser `district` (linhas 30, 60)
- `prioritityList` — deveria ser `priorityList` (linha 31)

Estes erros propagaram-se para DTOs, entidades de domínio e repositórios.

**Sugestão:** Corrigir via migração Prisma e atualizar todo o código que referencia esses campos.

---

### CODE-05 · Operador `??` em updates não permite limpar campos para null `MÉDIO`

**Ficheiros:** [UpdateAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/UpdateAdmin.ts#L28-L33), [UpdateDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/UpdateDriver.ts#L28-L36), [UpdateCadete.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/UpdateCadete.ts#L19-L28)

```typescript
fullName: input.full_name ?? existing.fullName
```

O operador `??` trata `null` e `undefined` igualmente. Se um cliente enviar `{"full_name": null}` intencionalmente para limpar o campo, o valor existente é mantido. Não é possível "limpar" um campo nullable.

**Sugestão:** Distinguir entre "campo não enviado" (undefined) e "campo intencionalmente null" (null). Usar `input.full_name !== undefined ? input.full_name : existing.fullName`.

---

### CODE-06 · Respostas inconsistentes no DELETE `MÉDIO`

**Ficheiros:** Controllers

- Admin/Cadete/Driver: Retorna `204 No Content`
- MiniBusStop: Retorna `200 OK` com `{ message: "Bus stop deleted successfully" }`

**Sugestão:** Padronizar todas as respostas de DELETE para `204 No Content`.

---

### CODE-07 · Import de `dotenv/config` no app.ts `BAIXO`

**Ficheiro:** [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts#L16)

O `import "dotenv/config"` é feito no `app.ts` mas `dotenv` não está nas dependências do `package.json`. Isto pode funcionar acidentalmente por ser uma sub-dependência, mas vai falhar se a árvore de dependências mudar.

**Sugestão:** Adicionar `dotenv` como dependência explícita ou mover o import para `main.ts`.

---

### CODE-08 · console.log excessivo no socket.ts `BAIXO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts)

O ficheiro tem 50+ `console.log` com emojis e formatação verbose. Em produção, isto:
- Polui os logs com informação de debug
- Pode impactar performance em alta frequência de mensagens
- Dificulta o parsing de logs por ferramentas de monitorização

**Sugestão:** Usar o logger do Fastify (`app.log.info/debug/error`) com níveis configuráveis. Mover logs de debug para nível `debug`.

---

## 4. 🔵 WebSocket

### WS-01 · Lógica de negócio no DriverController.updateLocationHandler `CRÍTICO`

**Ficheiro:** [DriverController.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/controllers/DriverController.ts#L71-L126)

O método `updateLocationHandler` tem 55 linhas com:
- Acesso ao `req.server.io` (acoplamento com Socket.IO)
- Lógica de broadcast condicional (rota vs global)
- Chamada a dois use cases separados (`updateLocation` + `getDriverById`)
- `console.log` extensivo

Um controller não deveria ter lógica de broadcasting. Isto deveria estar num serviço ou use case dedicado.

**Sugestão:** Criar um `UpdateDriverLocationWithBroadcastUseCase` que encapsula a lógica de update + notificação, ou usar um event emitter para desacoplar.

---

### WS-02 · Estado em memória sem sincronização multi-processo `ALTO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L7)

```typescript
const routeLocationState: Record<number, RouteLocationState> = {};
```

O estado de "motorista ativo" é guardado numa variável em memória. Se a aplicação escalar para múltiplos processos/containers:
- O estado não é partilhado entre instâncias
- O fallback de cadete pode falhar ou funcionar inconsistentemente
- Os rooms do Socket.IO ficam particionados

**Sugestão:** Usar Redis como store partilhado para o estado de localização e como adapter do Socket.IO (`@socket.io/redis-adapter`).

---

### WS-03 · Socket.IO atachado ao `app.server` em vez do `app` `ALTO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L45)

```typescript
(app.server as any).io = io;
```

O Socket.IO é guardado no `app.server` com cast para `any`. Depois, no [DriverController.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/controllers/DriverController.ts#L89):

```typescript
const io = (req.server as any).io
```

Isto é type-unsafe e frágil. Se `initSocket` não for chamado, `io` é `undefined` sem warning.

**Sugestão:** Decorar o Fastify com `io` via plugin e declarar o tipo no módulo `fastify`.

---

### WS-04 · Sem debounce/throttle de localização `MÉDIO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L250)

Se um motorista enviar localização 10x por segundo, o servidor faz 10 upserts no BD e 10 broadcasts por segundo. Não há throttle nem debounce.

**Sugestão:** Implementar throttle (ex: máximo 1 update a cada 2 segundos) ou debounce no servidor para reduzir carga no BD.

---

### WS-05 · Handler de disconnect duplicado `MÉDIO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L74-L80) e [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L452-L454)

O evento `disconnect` tem dois handlers registados para o mesmo socket — um com formatação detalhada (linha 74) e outro simples (linha 452). Ambos serão executados.

**Sugestão:** Manter apenas um handler de `disconnect`.

---

### WS-06 · Muitas linhas em branco no socket.ts `BAIXO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L150-L172)

Há ~80 linhas em branco espalhadas pelo ficheiro (blocos de 20+ linhas vazias). Isto dificulta a leitura e navegação.

**Sugestão:** Limpar linhas em branco excessivas.

---

## 5. 🟣 Base de Dados

### DB-01 · Falta de índices para queries frequentes `ALTO`

**Ficheiro:** [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma)

Campos que são usados em `findFirst` com `OR` não têm índices:
- `Admins`: queries por `username` OR `email` (ambos `@unique`, OK)
- `Drivers`: queries por `username` OR `email` (ambos `@unique`, OK)
- `Drivers.current_route_id`: usado em `findFirst` para `findDriverIdByRoute` — **sem índice**
- `MiniBusStop.route_id`: usado em vários joins — tem FK mas sem `@@index`

**Sugestão:** Adicionar `@@index([current_route_id])` em Drivers e `@@index([route_id])` em MiniBusStop.

---

### DB-02 · Cascade deletes não configuradas `ALTO`

**Ficheiro:** [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma)

Se apagar um `Route`:
- Os `MiniBusStop` com `route_id` apontando para essa rota ficam órfãos (falha com FK constraint)
- Os `Drivers` com `current_route_id` apontando para essa rota falham igualmente

Se apagar um `Driver`:
- Os `DriverCoordinates` com `id_driver` ficam órfãos

Se apagar um `MiniBusStop`:
- Os `Cadetes` com `stop_id` apontando ficam órfãos

Nenhuma relação define `onDelete` behaviour.

**Sugestão:** Definir `onDelete: Cascade` ou `onDelete: SetNull` conforme a lógica de negócio para cada relação.

---

### DB-03 · Modelo de Chat incompleto `MÉDIO`

**Ficheiro:** [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma#L84-L116)

O modelo `Message` usa `senderType` como `Int` (magic number) em vez de um enum. O valor 0 e 1 não são documentados. Não há relação explícita com Cadetes ou Drivers.

**Sugestão:** Criar um enum `SenderType { CADETE DRIVER ADMIN }` e usar no schema.

---

### DB-04 · Campos opcionais demais `MÉDIO`

**Ficheiro:** [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma)

Quase todos os campos são `String?` (nullable). Um Admin pode ser criado sem `full_name`, sem `username`, e sem `email` — apenas com password. Um Cadete pode existir sem nenhum dado identificável.

**Sugestão:** Tornar `username` ou `email` obrigatórios (sem `?`) onde faz sentido para o negócio.

---

### DB-05 · Ausência de soft-delete `BAIXO`

Todas as operações de delete fazem `DELETE` real no BD. Não há campo `deletedAt` para auditoria.

**Sugestão:** Considerar adicionar `deletedAt DateTime?` e filtrar com `where: { deletedAt: null }` nas queries.

---

## 6. ⚪ Tratamento de Erros

### ERR-01 · Erros do Prisma não são tratados nos repositories `ALTO`

**Ficheiros:** Todos os repositories

Se uma operação de delete falhar por FK constraint (ex: apagar uma Route com MiniBusStops associadas), o Prisma lança `PrismaClientKnownRequestError` com código `P2003`. Este erro chega ao controller como um genérico 500 Internal Server Error sem mensagem útil.

**Sugestão:** Adicionar tratamento de erros do Prisma nos repositories ou no `ApplicationError.handle()` para mapear `P2003` → 409 Conflict, `P2002` → 409 Conflict (unique violation), etc.

---

### ERR-02 · Socket.IO handlers sem try/catch global `ALTO`

**Ficheiro:** [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts#L100-L328)

Os handlers `driver:joinRoute`, `driver:leaveRoute`, `cadete:joinRoute` não têm try/catch. Se o Prisma lançar uma excepção (ex: BD desconectado), o erro não é capturado e pode crashar o processo.

Apenas `driver:updateLocation` tem try/catch parcial (apenas no upsert de coordenadas).

**Sugestão:** Envolver cada handler socket num try/catch que emite `socket:error` ao cliente.

---

### ERR-03 · CreateAdmin não verifica username/email duplicado `MÉDIO`

**Ficheiro:** [CreateAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/CreateAdmin.ts#L10-L22)

O use case não verifica se o username ou email já existem antes de chamar `repo.create()`. Se houver duplicação, o Prisma lança `P2002` que resulta num 500 genérico.

O mesmo problema existe em [CreateDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/CreateDriver.ts) e [CreateCadete.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/CreateCadete.ts).

**Sugestão:** Verificar existência antes de criar, ou capturar `P2002` e lançar `ApplicationError("Username or email already exists", 409)`.

---

### ERR-04 · Stack trace perdida nos controllers `MÉDIO`

**Ficheiros:** Todos os controllers

```typescript
private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    reply.log.error(error)  // ← loga, mas perde contexto
    return reply.status(500).send({ error: "Internal server error" })
}
```

Para erros não-ApplicationError, a resposta é genérica. Em desenvolvimento, seria útil incluir detalhes do erro na resposta (controlado por `NODE_ENV`).

**Sugestão:** Em development, incluir `error.message` e `error.stack` na resposta 500.

---

## 7. 🟤 Performance

### PERF-01 · Listagens sem paginação `ALTO`

**Ficheiros:** Todos os use cases de List

`ListAdmins`, `ListCadetes`, `ListDrivers`, `ListStops`, `ListRoutes` — todos fazem `findMany()` sem `take`/`skip`. Com crescimento dos dados, estas queries retornam conjuntos cada vez maiores.

**Sugestão:** Implementar paginação com query params `?page=1&limit=20` e retornar metadata: `{ data: [...], total, page, limit }`.

---

### PERF-02 · N+1 query no updateLocationHandler `ALTO`

**Ficheiro:** [DriverController.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/controllers/DriverController.ts#L71-L126)

O handler faz:
1. `updateLocation.execute()` — 1 query (upsert)
2. `getDriverById.execute()` — 2 queries (findUnique + check exists)

São 3 queries no mínimo para cada update de localização, que pode acontecer várias vezes por segundo.

**Sugestão:** Combinar numa única query que faz o upsert e retorna o driver com a rota.

---

### PERF-03 · Instância de Repository recriada a cada request `MÉDIO`

**Ficheiros:** Todos os route files

```typescript
export default async function adminRoutes(app: FastifyInstance) {
  const repo = new AdminPrismaRepository(app.prisma)  // ← nova instância a cada register
  const controller = new AdminController(...)
```

Embora o Fastify chame isto apenas uma vez no startup (não a cada request), o padrão sugere que são transientes. Confirmar que o `register` é chamado apenas uma vez.

> [!NOTE]
> Isto não é um problema actual porque o Fastify só executa `register` uma vez. Mas o padrão é enganador.

---

### PERF-04 · RoutePrismaRepository.list() traz todas as relações `MÉDIO`

**Ficheiro:** [RoutePrismaRepository.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/infrastructure/repositories/RoutePrismaRepository.ts#L28-L48)

O `list()` inclui `stops` e `drivers` para todas as rotas. Com muitas rotas, paragens e motoristas, esta query pode ficar pesada.

**Sugestão:** Criar endpoints separados ou usar query params para controlar quais relações incluir (`?include=stops,drivers`).

---

## 8. ⬛ Testes

### TEST-01 · Ausência total de testes `CRÍTICO`

Não existe nenhum framework de teste configurado (jest, vitest, mocha, etc.), nenhum ficheiro de teste, e nenhum script de teste no `package.json`.

O único "teste" é o [socket-smoke-test.js](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/scripts/socket-smoke-test.js) que é um script manual que requer o servidor a correr.

**Sugestão:**
1. Configurar Jest ou Vitest
2. Testes unitários para todos os Use Cases (mockando repositories)
3. Testes de integração para os Repositories (usando BD de teste)
4. Testes E2E para os endpoints (usando `app.inject()` do Fastify)
5. Adicionar scripts `test` e `test:ci` ao `package.json`

---

## 9. 🟢 DevOps

### DEVOPS-01 · Dockerfile sem multi-stage build `ALTO`

**Ficheiro:** [Dockerfile](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/Dockerfile)

O Dockerfile copia todo o source code e `node_modules` para a imagem, incluindo `devDependencies`. A imagem resultante é desnecessariamente grande.

**Sugestão:** Usar multi-stage build: stage 1 compila o TS, stage 2 copia apenas `dist/` e instala apenas production dependencies.

---

### DEVOPS-02 · Falta de .dockerignore `MÉDIO`

Não existe `.dockerignore`. O `COPY . .` copia `node_modules`, `.git`, `socket-test.log`, etc.

**Sugestão:** Criar `.dockerignore` com `node_modules`, `.git`, `*.log`, `.env`, `dist/`.

---

### DEVOPS-03 · Sem healthcheck endpoint `MÉDIO`

Não existe endpoint de healthcheck para monitorização.

**Sugestão:** Adicionar `GET /api/health` que retorna `{ status: "ok", timestamp: ... }` e opcionalmente verifica conectividade com o BD.

---

### DEVOPS-04 · Sem linter/formatter `MÉDIO`

Não há ESLint, Prettier, ou qualquer ferramenta de qualidade de código configurada.

**Sugestão:** Configurar ESLint + Prettier com scripts no `package.json`.

---

### DEVOPS-05 · dist/ e schemas/ não estão no .gitignore `BAIXO`

**Ficheiro:** [.gitignore](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/.gitignore)

O `.gitignore` é muito minimalista. Falta:
- `dist/` (output do build)
- `schemas/` (gerado pelo prisma-json-schema-generator)
- `*.log`
- `.expo/` (existe na raiz)

---

## 10. 🔶 Validação de Dados

### VAL-01 · Ausência de schema validation no Fastify `ALTO`

**Ficheiros:** Todos os route files

Nenhuma rota define `schema` para validação de body/params/querystring. O Fastify suporta validação automática via JSON Schema que:
- Valida o request antes de chegar ao controller
- Retorna erros 400 automáticos com detalhes
- Melhora a documentação Swagger

**Sugestão:** Definir schemas para cada rota. Exemplo:
```typescript
app.post("/admin", {
  schema: {
    body: { type: 'object', required: ['password'], properties: { ... } }
  },
  preHandler: [app.authenticate]
}, handler)
```

---

### VAL-02 · Sem validação de formato de email `ALTO`

**Ficheiros:** [CreateAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/CreateAdmin.ts), [CreateDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/CreateDriver.ts), [CreateCadete.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/CreateCadete.ts)

Os use cases de criação não validam:
- Formato de email
- Comprimento de username
- Caracteres especiais

**Sugestão:** Adicionar validação de formato nos DTOs ou via Fastify schema validation.

---

### VAL-03 · Coordenadas sem validação de range `MÉDIO`

**Ficheiros:** [UpdateDriverLocation.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/UpdateDriverLocation.ts), [CreateStop.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/miniBusStops/useCases/CreateStop.ts)

Latitude e longitude são aceites sem validação de range:
- Latitude válida: -90 a 90
- Longitude válida: -180 a 180

Podem ser inseridas coordenadas impossíveis.

**Sugestão:** Validar ranges. Para Luanda, considerar limitar a um bounding box razoável.

---

### VAL-04 · Phone sem validação de formato `MÉDIO`

O campo `phone` é `Int?` no schema Prisma. Isso não permite números com prefixo `+244` e limita o armazenamento a valores numéricos.

**Sugestão:** Usar `String` para telefone e validar o formato (ex: regex para números angolanos).

---

## Priorização Recomendada

### 🚨 Fase 1 — Correcções Imediatas (Segurança)
| ID | Problema | Esforço |
|----|----------|---------|
| SEC-01 | Validar variáveis de ambiente no startup | Baixo |
| SEC-02 | Proteger rotas MiniBusStops e Routes | Baixo |
| SEC-04 | Configurar CORS por ambiente | Baixo |
| SEC-05 | Autenticação nos WebSockets | Médio |
| SEC-06 | Rate limiting nos endpoints de login | Baixo |
| SEC-07 | Mensagens de erro genéricas no login | Baixo |

### ⚡ Fase 2 — Qualidade Crítica
| ID | Problema | Esforço |
|----|----------|---------|
| TEST-01 | Setup de testes + primeiros unit tests | Alto |
| ERR-01 | Tratamento de erros Prisma | Médio |
| ERR-02 | Try/catch nos handlers WebSocket | Baixo |
| PERF-01 | Paginação nas listagens | Médio |
| VAL-01 | Schema validation no Fastify | Médio |

### 🔧 Fase 3 — Refactoring Estrutural
| ID | Problema | Esforço |
|----|----------|---------|
| ARCH-02 | WebSocket usar Use Cases em vez de Prisma directo | Alto |
| WS-01 | Extrair lógica de broadcast do controller | Médio |
| CODE-01 | Renomear `passwrd` → `password` | Médio |
| CODE-03 | Padronizar URLs REST | Médio |
| DB-02 | Configurar cascade deletes | Médio |

### 🎨 Fase 4 — Polimento
| ID | Problema | Esforço |
|----|----------|---------|
| CODE-02 | Padronizar idioma das mensagens | Baixo |
| CODE-04 | Corrigir typos (distrit, prioritityList) | Médio |
| DEVOPS-02 | Criar .dockerignore | Baixo |
| DEVOPS-03 | Endpoint de healthcheck | Baixo |
| DEVOPS-04 | Configurar ESLint + Prettier | Baixo |

---

> **Nota:** Esta auditoria é baseada na análise estática do código. Nenhum código foi alterado.
