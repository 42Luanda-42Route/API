# 🚍 42RouteAPI - 42 Luanda

API RESTful e motor WebSocket de alta performance desenvolvidos em **Node.js**, **Fastify**, **TypeScript**, **Prisma ORM** e **Socket.IO** para gestão e rastreamento em tempo real de rotas de mini-autocarros (candongueiros), paragens, motoristas e cadetes da comunidade **42 Luanda**.

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Projeto](#-arquitetura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar o Projeto](#-como-rodar-o-projeto)
  - [Opção 1: Rodando Localmente (Modo Desenvolvimento)](#opção-1-rodando-localmente-modo-desenvolvimento)
  - [Opção 2: Rodando com Docker Compose](#opção-2-rodando-com-docker-compose)
  - [Opção 3: Build e Execução em Produção](#opção-3-build-e-execução-em-produção)
- [Variáveis de Ambiente (`.env`)](#-variáveis-de-ambiente-env)
- [Credenciais Padrão (Ambiente de Testes / Seed)](#-credenciais-padrão-ambiente-de-testes--seed)
- [Documentação Interativa (Swagger)](#-documentação-interativa-swagger)
- [Rotas Principais da API](#-rotas-principais-da-api)
- [Eventos em Tempo Real (Socket.IO)](#-eventos-em-tempo-real-socketio)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Licença](#-licença)

---

## 🌟 Visão Geral

O **42RouteAPI** foi projetado para facilitar o transporte e a mobilidade dos cadetes da 42 Luanda através da monitorização dos candongueiros e rotas que cobrem os principais eixos urbanos e periurbanos de Luanda (Mutamba, Cazenga, Viana, Maianga, Benfica, Kilamba, etc.).

A aplicação adota os princípios de **Clean Architecture**, garantindo que as regras de negócio permaneçam desacopladas de frameworks e detalhes de persistência.

---

## ✨ Funcionalidades Principais

- 🔐 **Autenticação Híbrida**:
  - **OAuth2 com a 42 Intra API**: Login direto para cadetes com sincronização de perfil (nível, curso, foto).
  - **JWT + Bcrypt**: Autenticação segura por credenciais para Administradores e Motoristas.
- 📍 **Rastreamento em Tempo Real (Socket.IO)**:
  - Salas dinâmicas baseadas na rota (`route_<id>`).
  - Atualização contínua de geolocalização com mecanismo de *throttle* (máx. 1 update a cada 2 segundos).
  - **Fallback Inteligente**: Se o motorista estiver inativo por mais de 30 segundos, a API permite que cadetes a bordo emitam a posição estimada do transporte.
- 🚏 **Gestão de Rotas e Paragens**:
  - CRUD completo para rotas, paragens com coordenadas geográficas (latitude/longitude) e cadetes associados.
- 🛡️ **Segurança e Confiabilidade**:
  - Mutations administrativas protegidas por RBAC (`ADMIN`) e ações de localização limitadas ao próprio motorista ou a um administrador.
  - Headers HTTP protegidos com **Helmet**.
  - Proteção contra abusos via **Rate Limiting**.
  - Validação estrita de entradas com schemas JSON.
  - Documentação Swagger protegida com **HTTP Basic Auth**.
- 🩺 **Health Check**:
  - Endpoint `/api/health` com verificação de conectividade ativa com a base de dados PostgreSQL.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
| --- | --- |
| **Runtime & Linguagem** | [Node.js](https://nodejs.org/) (v20+) & [TypeScript](https://www.typescriptlang.org/) |
| **Framework Web** | [Fastify](https://fastify.dev/) v5 |
| **Banco de Dados & ORM** | [PostgreSQL](https://www.postgresql.org/) 16 & [Prisma ORM](https://www.prisma.io/) |
| **Comunicação em Tempo Real** | [Socket.IO](https://socket.io/) |
| **Autenticação** | [Simple OAuth2](https://github.com/lelylan/simple-oauth2), [@fastify/jwt](https://github.com/fastify/fastify-jwt), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Documentação** | [@fastify/swagger](https://github.com/fastify/fastify-swagger) & [@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui) |
| **Testes** | [Jest](https://jestjs.io/), [ts-jest](https://kulshekhar.github.io/ts-jest/), [@faker-js/faker](https://fakerjs.dev/) |
| **Containerização** | [Docker](https://www.docker.com/) & Docker Compose |

---

## 📐 Arquitetura do Projeto

O código está estruturado em camadas independentes no diretório `src/`:

```
src/
├── application/             # Casos de Uso (Use Cases) e DTOs da aplicação
│   ├── admins/
│   ├── auth/
│   ├── cadetes/
│   ├── drivers/
│   ├── miniBusStops/
│   └── routes/
├── domain/                  # Entidades de Domínio e Contratos/Interfaces dos Repositórios
├── infrastructure/          # Detalhes de infraestrutura (Prisma Client, Repositórios concretos)
│   ├── database/
│   └── repositories/
├── interfaces/http/         # Adaptadores HTTP (Rotas e Controllers Fastify)
│   ├── controllers/
│   └── routes/
├── plugins/                 # Plugins de infraestrutura Fastify (JWT, Prisma, Auth)
├── WebSockets/              # Gerenciador e eventos em tempo real Socket.IO
├── config/                  # Configurações de ambiente e integrações externas (OAuth 42)
├── app.ts                   # Fábrica de inicialização da instância Fastify
└── main.ts                  # Ponto de entrada (Entry point) do servidor
```

---

## 📋 Pré-requisitos

Certifique-se de ter instalado em seu ambiente:

- [Node.js](https://nodejs.org/) `>= 20.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0` (ou `yarn` / `pnpm`)
- [Docker](https://www.docker.com/) & **Docker Compose** (recomendado para rodar o banco de dados PostgreSQL)
- *(Opcional)* Credenciais de Aplicação na **42 Intra** (caso deseje testar o fluxo de OAuth2 de cadetes).

---

## 🚀 Como Rodar o Projeto

### Opção 1: Rodando Localmente (Modo Desenvolvimento)

#### 1. Clonar o repositório

```bash
git clone https://github.com/Gilson-chipombo/42RouteAPI-42Luanda.git
cd 42RouteAPI-42Luanda
```

#### 2. Instalar as dependências

```bash
npm install
```

#### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo `.env.example` para `.env`:

```bash
# No Linux/macOS
cp .env.example .env

# No Windows (PowerShell)
Copy-Item .env.example .env
```

Abra o arquivo `.env` e ajuste os valores necessários (detalhes na seção [Variáveis de Ambiente](#-variáveis-de-ambiente-env)).

#### 4. Subir o banco de dados PostgreSQL

Se tiver o Docker instalado, você pode iniciar apenas o serviço do PostgreSQL com:

```bash
docker compose up -d postgres
```

> **Nota:** O Postgres do compose usa `42route` / `42route123` / `42route_db`. A porta no host vem de `POSTGRES_PORT` (default `5432`). Se essa porta já estiver ocupada, define `POSTGRES_PORT=5434` e o mesmo host no `DATABASE_URL`. Fora do Docker, a string de conexão tem de coincidir com o servidor real.

#### 5. Executar as migrações do Prisma

Gere o client do Prisma e execute as migrações para criar as tabelas no banco:

```bash
npx prisma migrate dev
```

#### 6. (Opcional) Popular o banco com dados de teste (Seed)

Para popular a base com administradores de teste, rotas de Luanda, paragens e motoristas fictícios:

```bash
npx prisma db seed
```

#### 7. Iniciar a API em modo de desenvolvimento

```bash
npm run dev
```

O servidor iniciará com hot-reload ativo em:
👉 **`http://localhost:3000`**

---

### Opção 2: Rodando com Docker Compose

Você pode subir tanto a API quanto a base de dados PostgreSQL simultaneamente usando Docker Compose:

```bash
# 1. Certifique-se de ter o arquivo .env criado:
cp .env.example .env

# 2. Construir as imagens e iniciar os containers:
docker compose up --build -d

# 3. Para acompanhar os logs da aplicação:
docker compose logs -f app
```

A API estará acessível em `http://localhost:3000`.

---

### Opção 3: Build e Execução em Produção

```bash
# 1. Gerar build TypeScript e schemas Prisma:
npm run build

# 2. Iniciar o servidor compilado:
npm start
```

---

## ⚙️ Variáveis de Ambiente (`.env`)

Abaixo estão descritas as variáveis necessárias para a execução da API:

| Variável | Descrição | Exemplo Padrão |
| --- | --- | --- |
| `DATABASE_URL` | String de conexão PostgreSQL para o Prisma (host = `POSTGRES_PORT`) | `postgresql://42route:42route123@localhost:5434/42route_db?sslmode=disable` |
| `POSTGRES_PORT` | Porta no host para o Postgres do Docker Compose (dentro da rede Docker continua `5432`) | `5434` |
| `PORT` | Porta onde o servidor HTTP/WebSocket escuta | `3000` |
| `NODE_ENV` | Ambiente de execução (`development`, `production`, `test`) | `development` |
| `APP_URL` | URL base pública da aplicação | `http://localhost:3000` |
| `CORS_ORIGINS` | Origens permitidas no CORS HTTP e Socket.IO (`*` ou separadas por vírgula; configure explicitamente em produção) | `http://localhost:3001` |
| `JWT_SECRET` | Chave secreta usada para assinar e verificar tokens JWT | `sua_chave_secreta_aqui` |
| `JWT_EXPIRES` | Tempo de expiração do token JWT | `1h` |
| `FORTYTWO_CLIENT_ID` | UID / Client ID da aplicação na 42 Intra API | *(Obtido no portal da 42)* |
| `FORTYTWO_CLIENT_SECRET` | Secret da aplicação na 42 Intra API | *(Obtido no portal da 42)* |
| `SWAGGER_USER` | Usuário do HTTP Basic Auth para acessar a documentação | `Admin42` |
| `SWAGGER_PASSWORD` | Senha do HTTP Basic Auth para acessar a documentação | `4FutureWillBeBrilliant2DoBungle` |

---

## 🔑 Credenciais Padrão (Ambiente de Testes / Seed)

Ao executar o comando `npx prisma db seed`, os seguintes usuários serão criados:

### 🛡️ Administradores
- **Usuário 1:** `admin` | **Senha:** `12345678` | **Email:** `admin@42route.com`
- **Usuário 2:** `ops_admin` | **Senha:** `12345678` | **Email:** `ops@42route.com`

### 📚 Acesso ao Swagger UI (Documentação)
- **Usuário:** `Admin42` (ou valor definido em `SWAGGER_USER`)
- **Senha:** `4FutureWillBeBrilliant2DoBungle` (ou valor definido em `SWAGGER_PASSWORD`)

---

## 📖 Documentação Interativa (Swagger)

A API possui documentação interativa gerada automaticamente com **OpenAPI 3.0** via Swagger UI.

1. Acesse no navegador:
   🔗 **`http://localhost:3000/api/docs`**
2. Quando solicitado pelo navegador, informe as credenciais do **HTTP Basic Auth** configuradas (`SWAGGER_USER` e `SWAGGER_PASSWORD`).
3. Para testar endpoints protegidos, clique no botão **Authorize** (cadeado verde) e informe o token JWT no formato:
   ```
   Bearer <seu_token_jwt>
   ```

---

## 📡 Rotas Principais da API

Todas as rotas REST possuem o prefixo base `/api`.

### 1. Autenticação (`/api/auth`)
- `GET /api/auth/42/login?redirect=<url>` — Inicia fluxo OAuth2 da 42 Intra
- `GET /api/auth/42/callback?code=<code>&state=<url>` — Callback do OAuth2 da 42 Intra
- `POST /api/auth/42/admin/login` — Autenticação de Administrador (retorna JWT)
- `POST /api/auth/42/driver/login` — Autenticação de Motorista (retorna JWT)

### 2. Rotas de Transporte (`/api/routes`)
- `GET /api/routes` — Listar todas as rotas
- `GET /api/routes/:id` — Detalhes de uma rota com suas paragens
- `POST /api/routes` — Criar uma nova rota *(requer ADMIN)*
- `PUT /api/routes/:id` — Atualizar nome/descrição da rota *(requer ADMIN)*
- `DELETE /api/routes/:id` — Deletar rota *(requer ADMIN)*
- `POST /api/routes/:id/stops` — Associar paragens existentes *(requer ADMIN)*

### 3. Paragens de Candongueiro (`/api/minibusstops`)
- `GET /api/minibusstops` — Listar todas as paragens
- `GET /api/minibusstops/:id` — Buscar paragem por ID
- `POST /api/minibusstops` — Criar paragem com coordenadas *(requer ADMIN)*
- `PUT /api/minibusstops/:id` — Atualizar dados da paragem *(requer ADMIN)*
- `DELETE /api/minibusstops/:id` — Remover paragem *(requer ADMIN)*

### 4. Motoristas (`/api/drivers`)
- `GET /api/drivers` — Listar motoristas
- `GET /api/drivers/:id` — Detalhes do motorista
- `POST /api/drivers` — Cadastrar novo motorista *(requer ADMIN)*
- `PUT /api/drivers/:id` — Atualizar dados do motorista *(requer ADMIN)*
- `POST /api/drivers/:id/assign-route` — Atribuir rota a um motorista *(requer ADMIN)*
- `PUT /api/drivers/:id/location` — Atualizar localização *(próprio DRIVER ou ADMIN)*
- `DELETE /api/drivers/:id/leave-route` — Sair da rota atual *(próprio DRIVER ou ADMIN)*
- `DELETE /api/drivers/:id` — Excluir motorista *(requer ADMIN)*

### 5. Cadetes (`/api/cadetes`)
- `GET /api/cadetes` — Listar cadetes
- `GET /api/cadetes/:id` — Buscar cadete por ID
- `POST /api/cadetes` — Cadastrar cadete *(requer ADMIN)*
- `PUT /api/cadetes/:id` — Atualizar dados do cadete *(requer ADMIN)*
- `DELETE /api/cadetes/:id` — Deletar cadete *(requer ADMIN)*

### 6. Administradores (`/api/admins`)
- `GET /api/admins` — Listar administradores *(requer autenticação)*
- `POST /api/admins` — Criar administrador *(requer ADMIN)*
- `PUT /api/admins/:id` — Atualizar administrador *(requer ADMIN)*
- `DELETE /api/admins/:id` — Remover administrador *(requer ADMIN)*

### 7. Viagens e embarques (`/api/trips`)
- `POST /api/trips` — Motorista cria e inicia uma viagem na sua rota atual
- `GET /api/trips/active` — Obtém a viagem ativa do motorista ou da rota do cadete
- `GET /api/trips` — Lista viagens com filtros e paginação *(requer ADMIN ou DRIVER)*
- `GET /api/trips/:id` — Detalhe, ocupação e pedidos da viagem
- `PATCH /api/trips/:id` — Atualiza os dados textuais da viatura *(requer ADMIN)*
- `POST /api/trips/:id/complete` — Conclui uma viagem *(motorista proprietário ou ADMIN)*
- `POST /api/trips/:id/cancel` — Cancela uma viagem *(requer ADMIN)*
- `POST /api/trips/:tripId/boarding-requests` — Cadete solicita embarque sem QR
- `GET /api/trips/:tripId/boarding-requests` — Lista pedidos da viagem
- `GET /api/boarding-requests/mine` — Cadete consulta os seus pedidos
- `PATCH /api/boarding-requests/:id` — Motorista ou ADMIN aprova/rejeita um pedido

Só pode existir uma viagem ativa por rota e por motorista. A aprovação respeita a
capacidade da viatura e todos os pedidos são persistidos antes da notificação em
tempo real.

### 8. Saúde do Sistema (`/api/health`)
- `GET /api/health` — Verifica status da API e conectividade com o PostgreSQL

---

## ⚡ Eventos em Tempo Real (Socket.IO)

O servidor WebSocket escuta na mesma porta HTTP (`3000`). Conexões exigem autenticação via token JWT no cabeçalho ou no handshake:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "SEU_JWT_TOKEN"
  }
});
```

### Eventos do Cliente para o Servidor (Emitidos pelo App / Frontend):
- `driver:joinRoute` — `{ driverId: number }`: Motorista entra na sala de sua rota atribuída; `DRIVER` só pode usar o próprio ID, enquanto `ADMIN` pode operar qualquer motorista.
- `driver:leaveRoute` — `{ driverId: number }`: Motorista sai da sala e emite `driver:inactive`, com a mesma regra de identidade.
- `driver:updateLocation` — `{ id_driver: number, lat: number, long: number }`: Atualiza coordenadas; `DRIVER` só pode atualizar a si mesmo, enquanto `ADMIN` pode atualizar qualquer motorista.
- `cadete:joinRoute` — `{ cadeteId?: number, routeId?: number }`: Cadete junta-se apenas à sua própria rota, validada pelo JWT.
- `cadete:updateLocation` — `{ cadeteId: number, lat: number, long: number }`: Atualiza as próprias coordenadas caso o motorista esteja inativo.
- `route:subscribe` — `{ routeId: number }`: `ADMIN` entra explicitamente na sala de uma rota; confirma com `route:subscribed`.
- `route:unsubscribe` — `{ routeId: number }`: `ADMIN` sai explicitamente da sala; confirma com `route:unsubscribed`.

### Eventos do Servidor para o Cliente (Ouvidos pelo App / Frontend):
- `driver:location` — Dados de localização em tempo real do motorista.
- `transport:location` — Dados de localização emitidos por um cadete (modo fallback).
- `driver:inactive` — Notifica que não há motorista ativo no momento na rota.
- `trip:created` / `trip:updated` — Criação ou alteração do estado da viagem.
- `boarding:request:created` — Novo pedido enviado ao motorista proprietário e aos administradores.
- `boarding:request:updated` — Decisão enviada ao cadete, motorista e administradores.
- `socket:error` — Notificações de erro ou validação.

---

## 📜 Scripts Disponíveis

No arquivo `package.json`, estão configurados os seguintes comandos:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor em modo de desenvolvimento com `ts-node-dev` e hot reload |
| `npm run build` | Gera os tipos do Prisma e compila o TypeScript para a pasta `dist/` |
| `npm start` | Inicia o servidor a partir do código compilado (`dist/main.js`) |
| `npm run start:prod` | Executa o build completo e inicia o servidor compilado |
| `npm test` | Executa todos os testes unitários, de integração e e2e com Jest |
| `npm run test:unit` | Executa exclusivamente a suíte de testes unitários |
| `npm run test:integration`| Executa a suíte de testes de integração |
| `npm run test:cov` | Executa os testes e gera relatório de cobertura de código |
| `npx prisma studio` | Abre a interface visual de gerenciamento de dados do Prisma no navegador |
| `npx prisma migrate dev`| Cria e aplica novas migrações no banco de dados |
| `npx prisma db seed` | Popula o banco com os dados pré-configurados em `prisma/seed.ts` |

---

## 📄 Licença

Este projeto é desenvolvido para a comunidade da **42 Luanda**. Distribuído sob a licença **ISC**.
