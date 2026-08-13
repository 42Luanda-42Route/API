# Plano de Implementação — Correcções da Auditoria + Testes

## Contexto

Implementar todas as correcções identificadas na auditoria (53 problemas) e adicionar testes unitários, de integração e E2E ao projecto 42RouteAPI-42Luanda.

Branch: `correcoeds`

---

## Open Questions

> [!IMPORTANT]
> **Migração do schema Prisma:** A correcção dos typos (`passwrd` → `password`, `distrit` → `district`, `prioritityList` → `priorityList`) requer uma migração de BD. Isto vai **renomear colunas** na base de dados. Se houver dados em produção, precisamos de uma migração cuidadosa. Prossigo com a migração assumindo que é ambiente de desenvolvimento?

> [!IMPORTANT]
> **Padronização de URLs REST:** Vou mudar URLs como `/admin` → `/admins`, `/driver/:id` → `/drivers/:id`, etc. Isto é uma **breaking change** para qualquer frontend que já consome estas rotas. Confirmas que o frontend pode ser actualizado?

---

## Proposed Changes

### Fase 1 — Fundações (Env Vars + Schema Prisma)

#### [MODIFY] [schema.prisma](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/prisma/schema.prisma)
- Renomear `passwrd` → `password` (Drivers)
- Renomear `distrit` → `district` (Cadetes, MiniBusStop)
- Renomear `prioritityList` → `priorityList` (Cadetes)
- Adicionar `onDelete: Cascade` / `SetNull` nas relações FK
- Adicionar `@@index([current_route_id])` em Drivers
- Adicionar `@@index([route_id])` em MiniBusStop
- Criar enum `SenderType { CADETE DRIVER ADMIN }` para Message

#### [MODIFY] [env.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/config/env.ts)
- Implementar validação obrigatória de: `DATABASE_URL`, `JWT_SECRET`, `FORTYTWO_CLIENT_ID`, `FORTYTWO_CLIENT_SECRET`, `APP_URL`
- Crash imediato se faltar alguma variável
- Exportar variáveis tipadas

#### [MODIFY] [main.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/main.ts)
- Importar e executar validação de env antes de tudo

---

### Fase 2 — Segurança

#### [MODIFY] [app.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/app.ts)
- CORS configurável via `CORS_ORIGINS` env var
- Registar `@fastify/rate-limit`
- Registar `@fastify/helmet` (a instalar)
- Remover `import "dotenv/config"` (mover para main.ts)

#### [MODIFY] [miniBusStops.routes.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/routes/miniBusStops.routes.ts)
- Adicionar `preHandler: [app.authenticate]` a POST, PUT, DELETE

#### [MODIFY] [route.routes.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/routes/route.routes.ts)
- Adicionar `preHandler: [app.authenticate]` a POST (create e addStops)

#### [MODIFY] [socket.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/socket.ts)
- Adicionar middleware de autenticação JWT no Socket.IO connection
- Envolver todos os handlers em try/catch
- Remover handler `disconnect` duplicado
- Limpar linhas em branco excessivas
- Substituir console.log por logger do Fastify
- Adicionar throttle básico na localização (1 update/2s)

#### [MODIFY] [LoginAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/LoginAdmin.ts)
- Mensagem genérica: "Invalid credentials" (401) para ambos os casos
- Usar `generateToken()` centralizado

#### [MODIFY] [LoginDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/LoginDriver.ts)
- Mensagem genérica: "Invalid credentials" (401) para ambos os casos
- Usar `generateToken()` centralizado

#### [MODIFY] [Handle42Callback.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/auth/useCases/Handle42Callback.ts)
- Usar `generateToken()` centralizado

---

### Fase 3 — Arquitectura & Consistência

#### Renomear campos em TODOS os ficheiros afectados pelos typos do schema:
- **Domain entities:** [Admin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/admins/Admin.ts), [Driver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/drivers/Driver.ts), [Cadete.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/cadetes/Cadete.ts), [MiniBusStop.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/miniBusStops/MiniBusStop.ts)
- **Repository interfaces:** [DriverRepository.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/drivers/DriverRepository.ts), [CadeteRepository.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/domain/cadetes/CadeteRepository.ts)
- **Repository implementations:** Todos os 5 Prisma repositories
- **DTOs:** Todos os dto.ts
- **Use Cases:** Todos os use cases que referenciam esses campos
- **Controllers:** Todos os controllers
- **Routes:** Padronizar URLs (sempre plural)

#### [MODIFY] [jwt.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/utils/jwt.ts)
- Tornar o `generateToken` a única fonte de verdade para criação de JWTs

#### [MODIFY] [DriverController.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/controllers/DriverController.ts)
- Extrair lógica de broadcast do `updateLocationHandler` para o use case
- Remover console.logs

#### [MODIFY] [MiniBusStopController.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/interfaces/http/controllers/MiniBusStopController.ts)
- Padronizar delete response para 204

#### [DELETE] [Chats.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/WebSockets/Chats.ts)
- Remover código morto

#### [DELETE] [FindCadeteByUsernameOrEmail.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/FindCadeteByUsernameOrEmail.ts)
- Use case não utilizado

#### [DELETE] [docs.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/utils/docs.ts)
- Utilitário não utilizado

---

### Fase 4 — Validação de Dados & Erros

#### [MODIFY] [CreateAdmin.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/admins/useCases/CreateAdmin.ts)
- Verificar duplicação de username/email antes de criar

#### [MODIFY] [CreateDriver.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/CreateDriver.ts)
- Verificar duplicação de username/email antes de criar

#### [MODIFY] [CreateCadete.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/cadetes/useCases/CreateCadete.ts)
- Verificar duplicação de username/email antes de criar

#### [MODIFY] [UpdateDriverLocation.ts](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/src/application/drivers/useCases/UpdateDriverLocation.ts)
- Validar range de lat (-90 a 90) e long (-180 a 180)

#### [MODIFY] Todos os Update use cases
- Usar `!== undefined` em vez de `??` para permitir set-to-null

#### [NEW] `src/infrastructure/errors/PrismaErrorHandler.ts`
- Handler centralizado para mapear erros Prisma → ApplicationError (P2002→409, P2003→409)

#### Adicionar Fastify schema validation nos route files para os endpoints mais críticos (login, create)

---

### Fase 5 — Performance & DevOps

#### [MODIFY] Todos os List use cases
- Adicionar suporte a paginação (`page`, `limit`)
- Retornar `{ data, total, page, limit }`

#### [MODIFY] Todos os repository interfaces e implementations
- Adicionar parâmetros de paginação ao `list()`

#### [NEW] Endpoint `GET /api/health`
- Retorna status e verifica conectividade com BD

#### [NEW] `.dockerignore`
#### [MODIFY] [Dockerfile](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/Dockerfile) — Multi-stage build
#### [MODIFY] [.gitignore](file:///c:/Users/GChipombo/OneDrive%20-%20Bulir%20Technology%20LDA/Documentos/42RouteAPI-42Luanda/.gitignore) — Adicionar dist/, schemas/, *.log

---

### Fase 6 — Testes

#### [NEW] `jest.config.ts` — Configuração Jest
#### [NEW] `src/__tests__/unit/` — Testes unitários para todos os Use Cases (~26 ficheiros)
- Admin: CreateAdmin, DeleteAdmin, GetAdminById, ListAdmins, UpdateAdmin, LoginAdmin
- Cadete: CreateCadete, DeleteCadete, GetCadeteById, ListCadetes, UpdateCadete, GetCadeteRouteInfo
- Driver: CreateDriver, DeleteDriver, GetDriverById, ListDrivers, UpdateDriver, LoginDriver, UpdateDriverLocation, AssignRoute, LeaveRoute
- Auth: GenerateAuthUrl, Handle42Callback
- Route: CreateRoute, ListRoutes, GetRouteById, AddStopsToRoute
- MiniBusStop: CreateStop, DeleteStop, GetStopById, ListStops, UpdateStop

#### [NEW] `src/__tests__/integration/` — Testes de integração para Repositories
- AdminPrismaRepository, DriverPrismaRepository, CadetePrismaRepository, RoutePrismaRepository, MiniBusStopPrismaRepository

#### [NEW] `src/__tests__/e2e/` — Testes E2E dos endpoints
- Auth routes, Admin routes, Cadete routes, Driver routes, MiniBusStop routes, Route routes

---

## Novas Dependências

```
npm install @fastify/rate-limit @fastify/helmet dotenv
npm install -D jest ts-jest @types/jest
```

---

## Verification Plan

### Automated Tests
```bash
# Testes unitários
npm test -- --testPathPattern=unit

# Testes de integração (requer BD)
npm test -- --testPathPattern=integration

# Testes E2E
npm test -- --testPathPattern=e2e

# Todos os testes
npm test
```

### Manual Verification
- Executar `npm run dev` e verificar que o servidor arranca sem erros
- Verificar que o Swagger UI em `/api/docs` mostra schemas
- Testar login com credenciais erradas → mensagem genérica
- Verificar que rotas protegidas retornam 401 sem token
- Testar conexão WebSocket sem token → deve ser rejeitada
