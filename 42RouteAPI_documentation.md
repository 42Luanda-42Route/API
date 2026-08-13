# 📖 42RouteAPI-42Luanda — Documentação Completa

> **Versão:** 1.0.0  
> **Stack:** Node.js · Fastify · Prisma · PostgreSQL · Socket.IO · TypeScript  
> **Última atualização:** 13 de Agosto de 2026

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Projeto](#2-arquitetura-do-projeto)
3. [Modelos de Dados (Prisma Schema)](#3-modelos-de-dados)
4. [Autenticação & Autorização](#4-autenticação--autorização)
5. [Referência da API REST](#5-referência-da-api-rest)
   - [Auth](#51-auth)
   - [Admins](#52-admins)
   - [Cadetes](#53-cadetes)
   - [Drivers (Motoristas)](#54-drivers-motoristas)
   - [MiniBusStops (Paragens)](#55-minibusstops-paragens)
   - [Routes (Rotas)](#56-routes-rotas)
6. [WebSocket (Socket.IO)](#6-websocket-socketio)
7. [Tratamento de Erros](#7-tratamento-de-erros)
8. [Deploy & Infraestrutura](#8-deploy--infraestrutura)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)

---

## 1. Visão Geral

O **42RouteAPI-42Luanda** é uma API REST + WebSocket para gestão de rotas de mini-autocarros (candongueiros) em Luanda. O sistema permite:

- **Autenticação OAuth2** com a plataforma 42 Intra (para cadetes)
- **Autenticação JWT** para motoristas e administradores
- **CRUD completo** de Admins, Cadetes, Motoristas, Paragens e Rotas
- **Rastreamento em tempo real** da localização de motoristas e cadetes via Socket.IO
- **Sistema de salas por rota** — cadetes e motoristas são agrupados pela rota para receber updates localizados
- **Fallback inteligente** — quando o motorista está inativo (timeout de 10s), cadetes podem enviar localização

---

## 2. Arquitetura do Projeto

O projeto segue uma **Clean Architecture** com separação em camadas:

```mermaid
graph TD
    A["interfaces/http"] -->|"Controllers & Routes"| B["application"]
    B -->|"Use Cases & DTOs"| C["domain"]
    C -->|"Entities & Repository Interfaces"| D["infrastructure"]
    D -->|"Prisma Repositories"| E["PostgreSQL"]
    F["WebSockets"] -->|"Socket.IO Handlers"| D
    G["plugins"] -->|"Auth & Prisma"| A
```

### Estrutura de Diretórios

```
src/
├── WebSockets/           # Handlers Socket.IO (localização em tempo real)
│   ├── socket.ts         # Inicialização e eventos do Socket.IO
│   └── Chats.ts          # Chat (em desenvolvimento)
├── application/          # Camada de Aplicação
│   ├── admins/           # Use Cases + DTOs de Admin
│   ├── auth/             # Use Cases de Autenticação OAuth2/42
│   ├── cadetes/          # Use Cases + DTOs de Cadete
│   ├── drivers/          # Use Cases + DTOs de Motorista
│   ├── errors/           # ApplicationError
│   ├── miniBusStops/     # Use Cases + DTOs de Paragem
│   └── routes/           # Use Cases + DTOs de Rota
├── config/               # Configurações (OAuth42, env)
├── domain/               # Camada de Domínio
│   ├── admins/           # Entidade Admin + Repository Interface
│   ├── cadetes/          # Entidade Cadete + Repository Interface
│   ├── drivers/          # Entidade Driver + Repository Interface
│   ├── miniBusStops/     # Entidade MiniBusStop + Repository Interface
│   └── routes/           # Entidade Route + Repository Interface
├── infrastructure/       # Camada de Infraestrutura
│   ├── database/         # Prisma Client singleton
│   └── repositories/     # Implementações Prisma dos Repositories
├── interfaces/http/      # Camada de Interface HTTP
│   ├── controllers/      # Controllers Fastify
│   └── routes/           # Definição de rotas Fastify
├── plugins/              # Plugins Fastify (JWT Auth, Prisma)
├── app.ts                # Configuração da aplicação Fastify
└── main.ts               # Entry point do servidor
```

---

## 3. Modelos de Dados

### Diagrama ER

```mermaid
erDiagram
    Admins {
        int id PK
        string full_name
        string username UK
        string email UK
        string password
        datetime createdAt
    }
    
    Cadetes {
        int id PK
        string full_name
        string username UK
        string email UK
        string city
        string distrit
        boolean prioritityList
        int phone
        int stop_id FK
        datetime createdAt
    }
    
    Drivers {
        int id PK
        string full_name
        string username UK
        string email UK
        string passwrd
        string photo
        int phone
        int current_route_id FK
        datetime createdAt
    }
    
    Route {
        int id PK
        string route_name
        string description
        datetime createdAt
    }
    
    MiniBusStop {
        int id PK
        string stop_name UK
        string distrit
        float latitude
        float longitude
        string description
        int route_id FK
        datetime createdAt
    }
    
    DriverCoordinates {
        int id PK
        float lat
        float long
        int id_driver UK_FK
        datetime createdAt
    }
    
    Chat {
        int id PK
        string full_name
        enum type
        int route_id
        datetime createdAt
    }
    
    Message {
        int id PK
        int chat_id FK
        int sender_id
        int senderType
        string content
        datetime createdAt
    }

    Cadetes ||--o| MiniBusStop : "stop_id"
    Drivers ||--o| Route : "current_route_id"
    Drivers ||--o| DriverCoordinates : "id_driver"
    MiniBusStop }o--|| Route : "route_id"
    Route ||--o{ Drivers : "drivers"
    Route ||--o{ MiniBusStop : "stops"
    Chat ||--o{ Message : "messages"
```

### Descrição dos Modelos

| Modelo | Descrição |
|--------|-----------|
| **Admins** | Administradores do sistema. Autenticam-se via username/password com JWT |
| **Cadetes** | Estudantes da 42 Luanda. Autenticam-se via OAuth2 da plataforma 42 Intra |
| **Drivers** | Motoristas de candongueiros. Autenticam-se via username/password com JWT |
| **Route** | Rotas de transporte. Contém múltiplas paragens e motoristas atribuídos |
| **MiniBusStop** | Paragens de candongueiros. Pertence a uma rota e tem coordenadas GPS |
| **DriverCoordinates** | Localização GPS em tempo real de um motorista (relação 1:1) |
| **Chat** | Salas de chat (GENERAL ou por ROUTE) |
| **Message** | Mensagens dentro de um Chat |

---

## 4. Autenticação & Autorização

### 4.1 OAuth2 — 42 Intra (Cadetes)

O fluxo OAuth2 utiliza a API da 42 Intra para autenticação de cadetes:

```mermaid
sequenceDiagram
    participant C as Cliente (Frontend)
    participant API as 42RouteAPI
    participant Intra as 42 Intra API

    C->>API: GET /api/auth/42/login?redirect=URL
    API->>Intra: Redirect para authorize
    Intra->>C: Login no 42 Intra
    C->>Intra: Credenciais
    Intra->>API: GET /api/auth/42/callback?code=XXX&state=URL
    API->>Intra: POST /oauth/token (troca code por access_token)
    Intra-->>API: access_token
    API->>Intra: GET /v2/me (perfil do utilizador)
    Intra-->>API: Dados do perfil
    API->>API: Gerar JWT (15min) com dados do perfil
    API->>C: Redirect para URL?token=JWT
```

**Dados incluídos no JWT do cadete:**
- `id`, `full_name`, `username`, `email`
- `avatar` (link da foto)
- `course`, `level`, `grade` (dados do cursus 42)
- `isDBUser` (se o cadete já existe no BD)
- `role: "CADETE"`

### 4.2 JWT — Motoristas e Admins

- Login via **username + password** (bcrypt)
- Token JWT com expiração configurável via `JWT_EXPIRES` (padrão: 1h)
- Rotas protegidas utilizam o middleware `app.authenticate` como `preHandler`

### 4.3 Rotas Protegidas vs. Públicas

| Tipo | Descrição |
|------|-----------|
| **Pública** | Não requer token. Listagens e consultas (GET) |
| **Protegida** | Requer `Authorization: Bearer <token>`. Criação, atualização e exclusão |

---

## 5. Referência da API REST

> **Base URL:** `http://localhost:3000/api`  
> **Swagger UI:** `http://localhost:3000/api/docs`

---

### 5.1 Auth

#### `GET /api/auth/42/login`

Redireciona o utilizador para a página de login da 42 Intra.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `redirect` | string | Query | ✅ | URL de callback do frontend para receber o token |

**Resposta:** Redirect 302 → 42 Intra authorize URL

---

#### `GET /api/auth/42/callback`

Callback OAuth2 processado automaticamente após login no 42 Intra.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `code` | string | Query | ✅ | Código de autorização da 42 |
| `state` | string | Query | ✅ | URL de redirect original |

**Resposta:** Redirect 302 → `{state}?token={JWT}`

---

#### `POST /api/auth/42/driver/login`

Login de motorista por credenciais.

**Request Body:**
```json
{
  "username": "motorista1",
  "password": "senha123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "driver": {
    "id": 1,
    "fullName": "João Silva",
    "username": "motorista1",
    "email": "joao@email.com"
  }
}
```

**Erros:**
| Código | Mensagem |
|--------|----------|
| 401 | Invalid credentials |
| 404 | Driver not found |

---

#### `POST /api/auth/42/admin/login`

Login de administrador por credenciais.

**Request Body:**
```json
{
  "username": "admin1",
  "password": "admin123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": 1,
    "fullName": "Admin Principal",
    "username": "admin1",
    "email": "admin@42luanda.ao"
  }
}
```

**Erros:**
| Código | Mensagem |
|--------|----------|
| 401 | Invalid credentials |
| 404 | Admin not found |

---

### 5.2 Admins

#### `GET /api/admins` 🔓

Lista todos os administradores.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "fullName": "Admin Principal",
    "username": "admin1",
    "email": "admin@42luanda.ao",
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
]
```

---

#### `GET /api/admins/:id` 🔓

Busca um administrador por ID.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do admin |

**Response `200 OK`:**
```json
{
  "id": 1,
  "fullName": "Admin Principal",
  "username": "admin1",
  "email": "admin@42luanda.ao",
  "createdAt": "2026-08-01T12:00:00.000Z"
}
```

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Admin not found |
| 422 | Admin id must be valid |

---

#### `POST /api/admin` 🔒

Cria um novo administrador.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "Novo Admin",
  "username": "novoadmin",
  "email": "novo@42luanda.ao",
  "password": "senha_segura_123"
}
```

**Response `201 Created`:**
```json
{
  "id": 2,
  "fullName": "Novo Admin",
  "username": "novoadmin",
  "email": "novo@42luanda.ao",
  "createdAt": "2026-08-13T00:00:00.000Z"
}
```

> [!NOTE]
> O campo `password` é removido da resposta por segurança. A senha é hasheada com bcrypt antes de ser salva.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 400 | Username or email already exists |
| 401 | Unauthorized |

---

#### `PUT /api/admins/:id` 🔒

Atualiza um administrador existente.

**Headers:** `Authorization: Bearer <token>`

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do admin |

**Request Body** (todos opcionais):
```json
{
  "full_name": "Nome Atualizado",
  "username": "novousername",
  "email": "novo@email.ao",
  "password": "nova_senha"
}
```

**Response `200 OK`:** Retorna o admin atualizado (sem password).

**Erros:**
| Código | Mensagem |
|--------|----------|
| 401 | Unauthorized |
| 404 | Admin not found |
| 422 | Admin id must be valid |

---

#### `DELETE /api/admins/:id` 🔒

Remove um administrador.

**Headers:** `Authorization: Bearer <token>`

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do admin |

**Response `204 No Content`**

**Erros:**
| Código | Mensagem |
|--------|----------|
| 401 | Unauthorized |
| 404 | Admin not found |
| 422 | Admin id must be valid |

---

### 5.3 Cadetes

#### `GET /api/cadetes` 🔓

Lista todos os cadetes.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "fullName": "Maria Santos",
    "username": "msantos",
    "email": "maria@student.42luanda.ao",
    "city": "Luanda",
    "distrit": "Viana",
    "prioritityList": false,
    "phone": 923456789,
    "stopId": 3,
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
]
```

---

#### `GET /api/cadetes/:id` 🔓

Busca um cadete por ID.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do cadete |

**Response `200 OK`:** Retorna o cadete.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Cadete not found |
| 422 | Cadete id must be valid |

---

#### `GET /api/cadete/route/informations/:id` 🔓

Retorna informações da rota associada a um cadete (via paragem).

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do cadete |

**Response `200 OK`:**
```json
{
  "cadeteId": 1,
  "cadeteName": "Maria Santos",
  "stop": {
    "id": 3,
    "stopName": "Paragem Viana",
    "latitude": -8.9,
    "longitude": 13.3
  },
  "route": {
    "id": 1,
    "routeName": "Viana - Maianga",
    "stops": [...],
    "drivers": [...]
  }
}
```

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Cadete não encontrado ou sem rota associada |
| 422 | Cadete id must be valid |

---

#### `POST /api/cadete` 🔒

Cria um novo cadete.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "Pedro Neto",
  "username": "pneto",
  "email": "pedro@student.42luanda.ao",
  "city": "Luanda",
  "distrit": "Cazenga",
  "prioritityList": false,
  "phone": 912345678,
  "stop_id": 2
}
```

**Response `201 Created`:** Retorna o cadete criado.

---

#### `PUT /api/cadetes/:id` 🔒

Atualiza um cadete existente.

**Headers:** `Authorization: Bearer <token>`

**Request Body** (todos opcionais):
```json
{
  "full_name": "Pedro Neto Atualizado",
  "city": "Luanda",
  "distrit": "Maianga",
  "stop_id": 5
}
```

**Response `200 OK`:** Retorna o cadete atualizado.

---

#### `DELETE /api/cadetes/:id` 🔒

Remove um cadete.

**Headers:** `Authorization: Bearer <token>`

**Response `204 No Content`**

---

### 5.4 Drivers (Motoristas)

#### `GET /api/drivers` 🔓

Lista todos os motoristas.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "fullName": "Carlos Motorista",
    "username": "carlos_m",
    "email": "carlos@email.ao",
    "photo": "https://...",
    "phone": 934567890,
    "currentRouteId": 1,
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
]
```

> [!NOTE]
> O campo `passwrd` é removido da resposta por segurança.

---

#### `GET /api/driver/:id` 🔓

Busca um motorista por ID.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do motorista |

**Response `200 OK`:** Retorna o motorista (sem password).

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Driver not found |
| 422 | Driver id must be valid |

---

#### `POST /api/driver` 🔒

Cria um novo motorista.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "Novo Motorista",
  "username": "novo_motorista",
  "email": "novo@email.ao",
  "passwrd": "senha123",
  "photo": "https://foto.url/photo.jpg",
  "phone": 945678901
}
```

**Response `201 Created`:** Retorna o motorista criado (sem password).

---

#### `PUT /api/driver/:id` 🔒

Atualiza um motorista existente.

**Headers:** `Authorization: Bearer <token>`

**Request Body** (todos opcionais):
```json
{
  "full_name": "Nome Atualizado",
  "email": "novo_email@email.ao",
  "phone": 956789012,
  "current_route_id": 2
}
```

**Response `200 OK`:** Retorna o motorista atualizado (sem password).

---

#### `DELETE /api/driver/:id` 🔒

Remove um motorista.

**Headers:** `Authorization: Bearer <token>`

**Response `204 No Content`**

---

#### `PUT /api/driver/location/socket/:id` 🔒

Atualiza a localização GPS de um motorista e emite via WebSocket.

**Headers:** `Authorization: Bearer <token>`

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do motorista |

**Request Body:**
```json
{
  "lat": -8.8383,
  "long": 13.2344
}
```

**Response `200 OK`:**
```json
{
  "id": 1,
  "lat": -8.8383,
  "long": 13.2344,
  "driverId": 1,
  "createdAt": "2026-08-13T00:05:00.000Z"
}
```

> [!IMPORTANT]
> Este endpoint também emite um evento WebSocket `driver:location` para o room da rota do motorista. Se o motorista não tem rota atribuída, o broadcast é feito para todos os clientes conectados (fallback).

---

#### `POST /api/driver/assign/route/:id` 🔒

Atribui uma rota a um motorista. Se outro motorista já estiver na rota, ele é removido primeiro.

**Headers:** `Authorization: Bearer <token>`

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do motorista |

**Request Body:**
```json
{
  "current_route_id": 1
}
```

**Response `200 OK`:** Retorna o motorista com a rota atribuída (sem password).

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | route_id: X does not exist |
| 422 | Driver id must be valid |
| 422 | route_id must be valid |

---

#### `DELETE /api/driver/leave/route/:id` 🔒

Remove a atribuição de rota de um motorista.

**Headers:** `Authorization: Bearer <token>`

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID do motorista |

**Response `200 OK`:** Retorna o motorista com `currentRouteId: null` (sem password).

> [!NOTE]
> Este endpoint também emite um evento WebSocket `driver:left` para o room da rota anterior, notificando que o motorista saiu.

---

### 5.5 MiniBusStops (Paragens)

#### `GET /api/minibusstops` 🔓

Lista todas as paragens.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "stopName": "Paragem Viana Centro",
    "distrit": "Viana",
    "latitude": -8.9035,
    "longitude": 13.3741,
    "description": "Paragem principal do centro de Viana",
    "routeId": 1,
    "createdAt": "2026-08-01T12:00:00.000Z"
  }
]
```

---

#### `GET /api/minibusstop/:id` 🔓

Busca uma paragem por ID.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID da paragem |

**Response `200 OK`:** Retorna a paragem.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Bus stop not found |
| 422 | Bus stop id must be valid |

---

#### `POST /api/minibusstop` 🔓

Cria uma nova paragem.

**Request Body:**
```json
{
  "stop_name": "Nova Paragem",
  "distrit": "Maianga",
  "latitude": -8.8145,
  "longitude": 13.2302,
  "description": "Paragem perto do Largo da Maianga",
  "route_id": 1
}
```

**Response `201 Created`:** Retorna a paragem criada.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Route not found (route_id inválido) |

---

#### `PUT /api/minibusstop/:id` 🔓

Atualiza uma paragem existente.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID da paragem |

**Request Body** (todos opcionais):
```json
{
  "stop_name": "Nome Atualizado",
  "latitude": -8.82,
  "longitude": 13.24,
  "route_id": 2
}
```

**Response `200 OK`:** Retorna a paragem atualizada.

---

#### `DELETE /api/minibusstop/:id` 🔓

Remove uma paragem.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID da paragem |

**Response `200 OK`:**
```json
{
  "message": "Bus stop deleted successfully"
}
```

---

### 5.6 Routes (Rotas)

#### `GET /api/routes` 🔓

Lista todas as rotas com as suas paragens e motoristas.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "routeName": "Viana - Maianga",
    "description": "Rota principal Viana ao centro",
    "createdAt": "2026-08-01T12:00:00.000Z",
    "stops": [
      {
        "id": 1,
        "stopName": "Paragem Viana Centro",
        "distrit": "Viana",
        "latitude": -8.9035,
        "longitude": 13.3741,
        "description": "...",
        "routeId": 1
      }
    ],
    "drivers": [
      {
        "id": 1,
        "fullName": "Carlos Motorista",
        "username": "carlos_m",
        "email": "carlos@email.ao",
        "phone": 934567890,
        "photo": "https://...",
        "currentRouteId": 1
      }
    ]
  }
]
```

---

#### `GET /api/route/:id` 🔓

Busca uma rota por ID com as suas paragens e motoristas.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID da rota |

**Response `200 OK`:** Retorna a rota com `stops` e `drivers`.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Route not found |
| 422 | routeId must be valid |

---

#### `POST /api/routes` 🔓

Cria uma nova rota.

**Request Body:**
```json
{
  "route_name": "Cacuaco - Maianga",
  "description": "Rota de Cacuaco até ao centro da cidade"
}
```

**Response `201 Created`:**
```json
{
  "id": 2,
  "routeName": "Cacuaco - Maianga",
  "description": "Rota de Cacuaco até ao centro da cidade",
  "createdAt": "2026-08-13T00:00:00.000Z"
}
```

---

#### `POST /api/routes/:id/stops` 🔓

Adiciona paragens existentes a uma rota.

| Parâmetro | Tipo | Local | Obrigatório | Descrição |
|-----------|------|-------|-------------|-----------|
| `id` | number | Path | ✅ | ID da rota |

**Request Body:**
```json
{
  "stop_id": [1, 3, 5]
}
```

**Response `200 OK`:** Retorna a rota atualizada com todas as paragens e motoristas.

**Erros:**
| Código | Mensagem |
|--------|----------|
| 404 | Route not found |
| 422 | routeId must be a valid number |
| 422 | At least one stopId is required |

---

## 6. WebSocket (Socket.IO)

### Configuração de Conexão

| Parâmetro | Valor |
|-----------|-------|
| **URL** | `ws://localhost:3000` |
| **Transports** | `websocket`, `polling` |
| **CORS Origin** | `*` |
| **Ping Interval** | 10 segundos |
| **Ping Timeout** | 5 segundos |
| **Max Disconnection Duration** | 2 minutos (reconnection state recovery) |

### Sistema de Rooms

Os clientes são agrupados em **rooms por rota** (`route_{routeId}`). Isto permite que as atualizações de localização sejam enviadas apenas aos clientes relevantes.

```mermaid
graph LR
    subgraph "route_1"
        D1["Driver 1"]
        C1["Cadete A"]
        C2["Cadete B"]
    end
    subgraph "route_2"
        D2["Driver 2"]
        C3["Cadete C"]
    end
    D1 -->|"driver:location"| C1
    D1 -->|"driver:location"| C2
    D2 -->|"driver:location"| C3
```

### Eventos Client → Server

---

#### `driver:joinRoute`

Motorista entra no room da sua rota atual.

**Payload:**
```json
{ "driverId": 1 }
```

**Comportamento:**
- Busca o motorista no BD
- Se tem `current_route_id`, junta-se ao room `route_{id}`
- Se não tem rota atribuída, o evento é ignorado

---

#### `driver:leaveRoute`

Motorista sai do room da sua rota.

**Payload:**
```json
{ "driverId": 1 }
```

**Comportamento:**
- Remove o socket do room `route_{id}`
- Limpa o estado de localização da rota (permite fallback para cadete)

---

#### `cadete:joinRoute`

Cadete entra no room da rota associada à sua paragem.

**Payload:**
```json
{ "cadeteId": 1 }
```

**Comportamento:**
- Busca o cadete com a sua paragem e rota associada
- Se tem rota, junta-se ao room `route_{id}`
- Se não tem paragem/rota, o evento é ignorado

---

#### `driver:updateLocation`

Motorista atualiza a sua localização GPS em tempo real.

**Payload:**
```json
{
  "id_driver": 1,
  "lat": -8.8383,
  "long": 13.2344
}
```

**Comportamento:**
1. Valida campos obrigatórios
2. Verifica se o motorista existe e tem rota atribuída
3. Atualiza o estado global da rota (`source: "driver"`)
4. Salva coordenadas no BD (upsert)
5. Emite `driver:location` para o room `route_{routeId}`

**Erros (emite `socket:error`):**
| Condição | Mensagem |
|----------|----------|
| Campos em falta | Missing required fields: id_driver, lat, long |
| Motorista não existe | Driver with id X not found |
| Sem rota atribuída | Driver is not assigned to any route |
| Erro ao salvar | Failed to save coordinates |

---

#### `cadete:updateLocation`

Cadete atualiza localização como fallback quando o motorista está inativo.

**Payload:**
```json
{
  "cadeteId": 1,
  "lat": -8.84,
  "long": 13.23,
  "sourceName": "Maria Santos"
}
```

**Comportamento:**
1. Valida campos obrigatórios
2. Verifica se o cadete existe e tem rota associada (via paragem)
3. Verifica se o motorista está **inativo** (timeout de 10s)
4. Se motorista ativo → emite `socket:ignored`
5. Se motorista inativo → atualiza estado da rota e emite `transport:location`

> [!IMPORTANT]
> A localização do cadete é **ignorada** se o motorista da mesma rota enviou uma atualização nos últimos 10 segundos. Isto garante que a localização do motorista tem sempre prioridade.

**Erros (emite `socket:error`):**
| Condição | Mensagem |
|----------|----------|
| Campos em falta | Missing required fields: cadeteId, lat, long |
| Cadete não existe | Cadete with id X not found |
| Sem rota atribuída | Cadete is not assigned to any route |

---

### Eventos Server → Client

#### `driver:location`

Emitido quando um motorista atualiza a sua localização.

**Payload:**
```json
{
  "id_driver": 1,
  "lat": -8.8383,
  "long": 13.2344,
  "routeId": 1,
  "driverName": "Carlos Motorista"
}
```

**Destino:** Room `route_{routeId}` (ou broadcast global se sem rota)

---

#### `driver:left`

Emitido quando um motorista sai de uma rota (via API REST `DELETE /api/driver/leave/route/:id`).

**Payload:**
```json
{
  "driverId": 1,
  "routeId": 1,
  "driverName": "Carlos Motorista"
}
```

**Destino:** Room `route_{routeId}`

---

#### `transport:location`

Emitido quando um cadete fornece localização de fallback (motorista inativo).

**Payload:**
```json
{
  "cadeteId": 1,
  "lat": -8.84,
  "long": 13.23,
  "source": "cadete",
  "routeId": 1,
  "cadeteName": "Maria Santos"
}
```

**Destino:** Room `route_{routeId}`

---

#### `socket:error`

Emitido quando ocorre um erro num handler de WebSocket.

**Payload:**
```json
{
  "event": "driver:updateLocation",
  "message": "Missing required fields: id_driver, lat, long"
}
```

---

#### `socket:ignored`

Emitido quando a localização do cadete é ignorada porque o motorista está ativo.

**Payload:**
```json
{
  "event": "cadete:updateLocation",
  "message": "Driver is active on this route."
}
```

---

## 7. Tratamento de Erros

Todos os controllers utilizam a classe `ApplicationError` para erros de negócio:

```typescript
class ApplicationError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode = 400)
}
```

### Formato de Resposta de Erro

```json
{
  "error": "Mensagem descritiva do erro"
}
```

### Códigos HTTP Utilizados

| Código | Significado | Quando |
|--------|-------------|--------|
| `200` | OK | Operação bem-sucedida |
| `201` | Created | Recurso criado com sucesso |
| `204` | No Content | Recurso removido com sucesso |
| `400` | Bad Request | Dados de entrada inválidos |
| `401` | Unauthorized | Token JWT inválido ou ausente |
| `404` | Not Found | Recurso não encontrado |
| `422` | Unprocessable Entity | Validação falhou (ID inválido, campos obrigatórios) |
| `500` | Internal Server Error | Erro não tratado |
| `502` | Bad Gateway | Erro ao comunicar com API externa (42 Intra) |

---

## 8. Deploy & Infraestrutura

### Docker Compose

O projeto utiliza Docker Compose com dois serviços:

| Serviço | Imagem | Porta | Descrição |
|---------|--------|-------|-----------|
| `postgres` | `postgres:16` | 5432 | Base de dados PostgreSQL |
| `app` | Build local | 3000 | API Fastify + Socket.IO |

**Credenciais padrão do PostgreSQL:**
- User: `42route`
- Password: `42route123`
- Database: `42route_db`

### Comandos

```bash
# Iniciar todos os serviços
docker-compose up -d

# Desenvolvimento local (sem Docker)
npm run dev

# Gerar Prisma Client
npm run generate:schema

# Build do projeto
npm run build

# Seed do banco de dados
npx prisma db seed
```

---

## 9. Variáveis de Ambiente

| Variável | Obrigatória | Descrição | Exemplo |
|----------|-------------|-----------|---------|
| `DATABASE_URL` | ✅ | Connection string do PostgreSQL | `postgresql://42route:42route123@localhost:5432/42route_db` |
| `JWT_SECRET` | ✅ | Chave secreta para assinar tokens JWT | `my_super_secret_key` |
| `JWT_EXPIRES` | ❌ | Tempo de expiração do JWT (padrão: `1h`) | `15m`, `1h`, `7d` |
| `FORTYTWO_CLIENT_ID` | ✅ | Client ID da aplicação OAuth2 na 42 | `u-s4t2ud-xxxxx` |
| `FORTYTWO_CLIENT_SECRET` | ✅ | Client Secret da aplicação OAuth2 na 42 | `s-s4t2ud-xxxxx` |
| `APP_URL` | ✅ | URL base da API (para callback OAuth2) | `http://localhost:3000` |

---

## Resumo dos Endpoints

### Legenda
- 🔓 Público (sem autenticação)
- 🔒 Protegido (requer JWT `Authorization: Bearer <token>`)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `GET` | `/api/auth/42/login` | 🔓 | Redirect para login 42 |
| `GET` | `/api/auth/42/callback` | 🔓 | Callback OAuth2 42 |
| `POST` | `/api/auth/42/driver/login` | 🔓 | Login motorista |
| `POST` | `/api/auth/42/admin/login` | 🔓 | Login admin |
| `GET` | `/api/admins` | 🔓 | Listar admins |
| `GET` | `/api/admins/:id` | 🔓 | Buscar admin por ID |
| `POST` | `/api/admin` | 🔒 | Criar admin |
| `PUT` | `/api/admins/:id` | 🔒 | Atualizar admin |
| `DELETE` | `/api/admins/:id` | 🔒 | Remover admin |
| `GET` | `/api/cadetes` | 🔓 | Listar cadetes |
| `GET` | `/api/cadetes/:id` | 🔓 | Buscar cadete por ID |
| `GET` | `/api/cadete/route/informations/:id` | 🔓 | Info da rota do cadete |
| `POST` | `/api/cadete` | 🔒 | Criar cadete |
| `PUT` | `/api/cadetes/:id` | 🔒 | Atualizar cadete |
| `DELETE` | `/api/cadetes/:id` | 🔒 | Remover cadete |
| `GET` | `/api/drivers` | 🔓 | Listar motoristas |
| `GET` | `/api/driver/:id` | 🔓 | Buscar motorista por ID |
| `POST` | `/api/driver` | 🔒 | Criar motorista |
| `PUT` | `/api/driver/:id` | 🔒 | Atualizar motorista |
| `DELETE` | `/api/driver/:id` | 🔒 | Remover motorista |
| `PUT` | `/api/driver/location/socket/:id` | 🔒 | Atualizar localização + WebSocket |
| `POST` | `/api/driver/assign/route/:id` | 🔒 | Atribuir rota ao motorista |
| `DELETE` | `/api/driver/leave/route/:id` | 🔒 | Motorista sai da rota |
| `GET` | `/api/minibusstops` | 🔓 | Listar paragens |
| `GET` | `/api/minibusstop/:id` | 🔓 | Buscar paragem por ID |
| `POST` | `/api/minibusstop` | 🔓 | Criar paragem |
| `PUT` | `/api/minibusstop/:id` | 🔓 | Atualizar paragem |
| `DELETE` | `/api/minibusstop/:id` | 🔓 | Remover paragem |
| `GET` | `/api/routes` | 🔓 | Listar rotas |
| `GET` | `/api/route/:id` | 🔓 | Buscar rota por ID |
| `POST` | `/api/routes` | 🔓 | Criar rota |
| `POST` | `/api/routes/:id/stops` | 🔓 | Adicionar paragens à rota |

---

> Documentação gerada a partir da análise completa do código-fonte do projecto **42RouteAPI-42Luanda**.
