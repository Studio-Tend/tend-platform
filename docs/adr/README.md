# Architecture Decision Records

Each ADR records one decision: the context, what was chosen, what was rejected, and the consequences.
ADRs are not edited once accepted. To change a decision, write a new ADR and mark the old one **Superseded**.

| # | Decision | Status |
|---|---|---|
| [0001](0001-monorepo.md) | pnpm workspaces monorepo with shared core | Accepted |
| [0002](0002-web-first.md) | Web first with Next.js, Expo mobile later | Proposed |
| [0003](0003-nestjs-api-postgres.md) | NestJS API from starter, Postgres on Supabase | Proposed |
| [0004](0004-managed-auth.md) | Managed auth, verified in the API | Accepted |
| [0005](0005-worker-and-queue.md) | Separate worker with a Postgres-backed queue | Proposed |
| [0006](0006-calendar-integration.md) | Calendars: add-to-calendar links first, direct APIs next | Proposed |
| [0007](0007-health-data.md) | Health data later, derived signals only | Proposed |
| [0008](0008-lean-hosting.md) | Lean hosting; retire the Eco Pass AWS stack | Proposed |
| [0009](0009-marketing-site-in-web-app.md) | Marketing site lives in the web app, not a separate repo | Accepted |
| [0011](0011-week-copy-calendar-and-reopen-link.md) | Week copy: calendar file and fragment reopen link | Accepted |

## Template

```md
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Alternatives considered
## Consequences
## Revisit if
```
