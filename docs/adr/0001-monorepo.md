# 0001. pnpm workspaces monorepo with shared core

- Status: Accepted
- Date: 2026-09-16

## Context
Tend will have a web app (first), a mobile app (later), an API, and a worker. Types and domain logic (goals, check-ins, importance weighting) must stay consistent across all of them.

## Decision
Use a pnpm workspaces monorepo (`apps/`, `packages/`). Share only `packages/core` (Zod schemas, types, domain logic) and `packages/api` (typed client). Keep UI separate per platform.

## Alternatives considered
- **Separate repos**: schema drift between client and server; more release overhead.
- **Shared UI via react-native-web**: risks compromising Tend's design-forward brand on web.

## Consequences
- One source of truth for types from day one.
- Some UI is written twice (mobile and web). Accepted in exchange for brand quality.
- The NestJS starter uses npm; it needs moving to pnpm when added as `apps/api`.

## Revisit if
Duplicate UI work becomes a major drag on shipping.
