# Docker — 42Route API

## Produção (imagem multi-stage)

```bash
cp .env.example .env   # ajusta JWT_SECRET, QR_SECRET_KEY, Intra, etc.
docker compose up -d --build
```

Sobe Postgres + API. No arranque a API corre `prisma migrate deploy` e escuta em `:3000`.
Health: `GET /health`.

## Desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.dev.yaml up
```

## Notas

- `DATABASE_URL` no compose de produção aponta para o serviço `postgres`.
- Não montes o código-fonte em cima da imagem de produção (o compose antigo fazia isso e partia o `dist`).
- Segredos reais: passa por `.env` ou variáveis do host; não commits.
