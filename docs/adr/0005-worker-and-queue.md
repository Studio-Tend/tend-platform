# 0005. Separate worker with a Postgres-backed queue

- Status: Proposed
- Date: 2026-09-16

## Context
Calendar sync, health sync, reminders, and emails call slow external services and need retries. Running them inside API requests would slow responses and break under load.

## Decision
Run background work in a separate `apps/worker` process. Start with a Postgres-backed queue (pg-boss) to avoid extra infrastructure. Move to BullMQ + Redis if job volume requires it.

## Alternatives considered
- **In-process jobs (`@nestjs/schedule` inside the API)**: simple, but jobs run once per API instance and compete with requests.
- **SQS + Lambda**: scales well, more AWS setup.
- **Redis/BullMQ from day one**: an extra always-on service before it's needed.

## Consequences
- API and worker scale independently.
- One more deployable to run.
- Queue abstraction should be thin so swapping pg-boss for BullMQ is contained.

## Revisit if
Queue latency or Postgres load from jobs becomes a problem.
