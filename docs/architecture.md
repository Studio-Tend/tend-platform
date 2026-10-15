# Tend – Architecture Overview

> Living document. Describes how Tend works *today* and the intended shape as it grows.
> The reasoning behind each choice lives in [`adr/`](adr/README.md).

Last updated: 2026-09-17

## Goals for the architecture

- **Fast to build**: favor tools the team already knows; don't hand-roll what exists.
- **Scales horizontally**: stateless API, background work in separate workers.
- **Cheap while small**: no always-on infrastructure that isn't earning its keep.
- **Shared logic, separate UI**: one domain layer, platform-specific interfaces that protect the brand.

## Stack

| Layer | Choice | ADR |
|---|---|---|
| Repo | pnpm workspaces monorepo | [0001](adr/0001-monorepo.md) |
| Web (first) | Next.js, responsive, installable as a PWA; hosted on Vercel | [0002](adr/0002-web-first.md) |
| Mobile (later) | Expo (React Native) + Expo Router | [0002](adr/0002-web-first.md) |
| API | NestJS, based on `nestjs-api-starter` | [0003](adr/0003-nestjs-api-postgres.md) |
| Database | Postgres (Supabase), via connection pooler | [0003](adr/0003-nestjs-api-postgres.md) |
| Auth | Managed provider (Supabase Auth or Clerk), JWT verified in Nest | [0004](adr/0004-managed-auth.md) |
| Background jobs | Separate worker + Postgres-backed queue (pg-boss); BullMQ + Redis if volume grows | [0005](adr/0005-worker-and-queue.md) |
| Calendars | Add-to-calendar links + `.ics` first, then Google Calendar + Microsoft Graph in the worker | [0006](adr/0006-calendar-integration.md) |
| Health data | Later: HealthKit / Health Connect (with mobile) or vendor cloud APIs; derived signals only | [0007](adr/0007-health-data.md) |
| Hosting | Small containers, API and worker scaled independently | [0008](adr/0008-lean-hosting.md) |
| Validation / types | Zod schemas in `packages/core`, shared by apps and API | [0003](adr/0003-nestjs-api-postgres.md) |

## Repository layout

```
apps/
  web/           Next.js app (primary client)
  mobile/        Expo app (later)
  api/           NestJS API
  worker/        Background jobs (calendar sync, health sync, reminders)
packages/
  core/          Zod schemas, types, domain logic (e.g. importance weighting)
  api/           Typed client used by mobile and web
docs/
  architecture.md
  adr/
```

UI is **not** shared between web and mobile. Only `packages/core` and `packages/api` are shared.

## Web app

One Next.js app serves the whole of heytend.co from a single Vercel project ([0009](adr/0009-marketing-site-in-web-app.md)):

| Route | What it is |
|---|---|
| `/` | Marketing landing page. Waitlist signups go to Formspree. |
| `/plan/week` | Weekly planner. State lives in React; nothing is persisted. "Send my week" posts to `/api/send-week`, which emails the week with a `.ics` attachment and a reopen link (ADR 0011). |

Both take their colors, type, spacing and motion from `@tend/ui-tokens`, so the marketing page and the product can't drift apart. There is no separate marketing repo.

When the product grows an authenticated surface, that is the seam to split on: `apps/web` keeps marketing and free tools on heytend.co, and the signed-in app becomes `app.heytend.co` from this same monorepo.

## Data flow

```
 Web / Mobile ──> packages/api client ──> NestJS API ──> Postgres
                                              │
                                              └─ enqueue job ──> Worker ──> Google / Microsoft / Oura …
```

- Clients never talk to the database directly; the API is the source of truth.
- Anything slow or external (calendar writes, health sync, emails, reminders) runs in the worker, never inside a request.
- Client writes may be retried (flaky mobile networks, PWA offline use); mutating endpoints accept **idempotency keys** to prevent duplicates.

## Domain principles

- Tend helps users prioritize what's important. **Feeling is a support signal, not a priority signal.** Check-in feelings and health data may influence pacing and suggestions but must never lower a goal's importance.
- Importance comes from two layers: explicit per-goal importance and life-area weighting from the Wheel of Life onboarding step. This logic lives in `packages/core`.

## Integrations model

Calendars and health sources share one model:

- `Integration`: user, provider, type (`calendar` | `health`), encrypted tokens, scopes, status, last synced.
- `ExternalLink`: maps a Tend entity (e.g. task) to an external ID per provider, so events can be updated or removed later.
- Every integration can be disconnected in one step, which revokes tokens and deletes synced data.

## API conventions (from the starter)

- Thin controllers; business logic in services; validation at the boundary.
- Errors as RFC 7807 problem details.
- Health checks at `/health`; OpenAPI docs at `/docs`.
- Env validated at startup with Zod.
- Authorization is enforced server-side: users only access their own data.

## Security & privacy

- Secrets from a secret store or env, never committed. `.env*` files stay out of git.
- Health data: stored as derived signals, isolated tables, encrypted fields, per-source consent.
- OAuth tokens encrypted at rest.

## Open questions

- Supabase Auth vs Clerk.
- Final hosting provider (Fargate vs Fly/Railway).
- When to start the Expo app (signals: demand for push reminders, mostly-phone usage, wearable data).
- Whether a unified calendar or health API (Nylas, Cronofy, Terra, etc.) is worth the per-user cost later.
- Limit of three goals.
