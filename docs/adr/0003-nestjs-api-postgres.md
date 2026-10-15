# 0003. NestJS API from starter, Postgres on Supabase

- Status: Proposed
- Date: 2026-09-16

## Context
Tend is greenfield and should scale and move fast. An existing NestJS starter (NestJS 11, Prisma 7, Postgres, Zod env validation, idempotency, problem-details errors, health checks, logging, Swagger, Docker, CI) is already built and tested. Eco Pass used the same pattern with Postgres on Supabase.

## Decision
- Add the starter as `apps/api`.
- Use Postgres on Supabase (through its connection pooler) with Prisma.
- Keep: env validation, problem details, health, logging, pagination, rate limiting, Swagger, Docker, CI, idempotency keys (needed for offline sync retries).
- Simplify: full RBAC. Tend needs per-user data ownership, not role matrices.
- Validate requests with Zod schemas from `packages/core` rather than class-validator DTOs, so clients and API share one schema.
- Reuse patterns (not modules) from Eco Pass where useful: scheduled jobs, outbox, email service, thin-controller rules.

## Alternatives considered
- **Supabase only (auto-generated API + row-level security + Edge Functions)**: least code, but complex logic moves into Edge Functions (Deno) and there's less control as the product grows.
- **Starting from the Eco Pass API**: mostly marketplace-specific (listings, suppliers, orders, credits, Stripe).
- **Lambda-first API**: cheapest idle cost, but NestJS + Prisma cold starts are slow.

## Consequences
- Familiar stack, fast to extend, stateless so it scales horizontally.
- Needs hosting for a long-running process (see 0008).
- Must use pooled connections so multiple API instances don't exhaust Postgres connections.

## Revisit if
Hosting cost or ops effort outweighs the benefit versus Supabase-only.
