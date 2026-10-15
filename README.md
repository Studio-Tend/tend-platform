# Tend

Goals, with intention. Focus on what matters. Enjoy the rest.

A pnpm workspaces monorepo. Architecture lives in [`docs/architecture.md`](docs/architecture.md); the reasoning behind each decision is in [`docs/adr/`](docs/adr/README.md).

```
apps/
  web/        Next.js — heytend.co: marketing page (/) and the weekly planner (/plan/week)
  api/        NestJS API + Prisma
  mobile/     Expo app (later)
packages/
  core/       Zod schemas, types, domain logic
  ui-tokens/  Brand tokens — one TypeScript source, generated CSS
```

## Getting started

```sh
pnpm install
pnpm --filter @tend/core build      # web and api import its types
pnpm --filter @tend/web dev         # http://localhost:3000
```

Checks, from the repo root:

```sh
pnpm lint
pnpm typecheck
pnpm test
```

## Web app

| Route | What it is |
|---|---|
| `/` | Marketing landing page. Markup in `apps/web/app/page.tsx`, styles in `apps/web/components/site/site.css`. |
| `/plan/week` | The weekly planner (Focuses → Actions → Prioritize → Make room → Your week). |

### Sending the weekly plan

Step 5 can email the week via `POST /api/send-week` (Resend). The message includes a `tend-week.ics` attachment and a `#w=` fragment link that reopens that week in `/plan/week` without storing anything on the server — see [ADR 0011](docs/adr/0011-week-copy-calendar-and-reopen-link.md).

Planner usage is tracked in PostHog (counts only, production only). The event list and the insights to watch are in [`docs/analytics.md`](docs/analytics.md).

The route will mail any address it is given from our verified domain, so it is rate limited with Upstash Redis: five sends per hour per IP, and three per day per recipient address (hashed, never stored in the clear). Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — in production the route returns 503 rather than running unlimited. Locally, leaving them blank skips limiting. Staging and production can share one database: set `REDIS_KEY_PREFIX=staging` on staging and leave it unset in production, so staging keys are `staging:send-week:…` and production keys stay unprefixed.

Waitlist signups POST to [Formspree](https://formspree.io) and land in the connected inbox; the endpoint is `FORMSPREE_ENDPOINT` in `apps/web/components/site/WaitlistForm.tsx`.

Fraunces and Inter are self-hosted by `next/font` (`apps/web/app/fonts.ts`), downloaded at build time rather than fetched from Google Fonts by the browser.

Colors, type, spacing, radius and motion come from `@tend/ui-tokens` — never a literal hex. The tokens are generated from `packages/ui-tokens/src/tokens.ts`:

```sh
pnpm --filter @tend/ui-tokens css     # regenerate CSS
pnpm --filter @tend/ui-tokens test    # contrast check + generated CSS is current
```

A new color needs an approved contrast pair before it is used. See the brand style guide.

## Deploying

`apps/web` deploys to Vercel; pushes to `main` auto-deploy. Project settings:

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Include files outside root directory | on (needed for `packages/*`) |
| Build Command | leave as the default `pnpm run build` — the script builds `@tend/core` first |
| Install Command | default (`pnpm install` at the repo root) |
| Domain | `heytend.co`, `www.heytend.co` |

The `tend-site` repo that previously served heytend.co is archived — see [ADR 0009](docs/adr/0009-marketing-site-in-web-app.md).

The API deploys separately and is not wired to the web app yet.

## Social

- TikTok: [@buildingtend](https://www.tiktok.com/@buildingtend)
- Instagram: [@buildingtend](https://www.instagram.com/buildingtend)
