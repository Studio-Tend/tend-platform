# Tend API

NestJS API for Tend, adapted from the NestJS starter. Postgres via Prisma, shared Zod schemas from `@tend/core`.

## Run locally

```bash
# from repo root
docker compose -f apps/api/docker-compose.yml up postgres -d
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @tend/api prisma:generate
pnpm --filter @tend/api prisma:migrate
pnpm --filter @tend/api start:dev
```

- Health: `GET /health/live` and `GET /health/ready`
- OpenAPI (non-production): `/docs`

Managed auth is not wired yet. Request bodies should be validated with `ZodValidationPipe` and schemas from `@tend/core`.
