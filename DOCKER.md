# Docker — 42Route API

## Pré-requisitos

```bash
cp .env.example .env
```

Preenche no `.env` (obrigatório — a API faz `process.exit` se faltarem):

- `JWT_SECRET`
- `QR_SECRET_KEY` — exactamente **16, 24 ou 32** bytes (ex.: `change_me_16bytes`)
- `FORTYTWO_CLIENT_ID` / `FORTYTWO_CLIENT_SECRET`
- `APP_URL` (ex.: `http://localhost:3000`)

O compose de produção sobrescreve `DATABASE_URL` para o serviço `postgres` interno.

## Produção (imagem multi-stage)

```bash
docker compose up -d --build
```

Sobe Postgres + API. No arranque a API corre `prisma migrate deploy` e escuta em `:3000`.
Health: `GET /api/health`.

## Desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.dev.yaml up
```

## Notas

- Não montes o código-fonte em cima da imagem de produção (o compose antigo fazia isso e partia o `dist`).
- Segredos reais: passa por `.env`; não commits.
- Porta host `5432` — se já tiveres Postgres local, altera o mapeamento.
