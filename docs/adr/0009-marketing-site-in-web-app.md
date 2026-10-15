# 0009. Marketing site lives in the web app, not a separate repo

- Status: Accepted
- Date: 2026-09-17

## Context
heytend.co was a standalone static page (`tend-site`): one `index.html` with hand-copied brand hex values, its own Vercel project, and no build step. Meanwhile `apps/web` held the weekly planner at `/plan` and no landing page at all — `/` redirected to `/plan`.

Splitting a marketing site from a product app is normally an *organizational* pattern: it lets marketing ship copy through a CMS without touching the engineers' deploy pipeline, and stops a broken app build from taking the homepage down. Tend has one person, so neither reason applies yet. What remained was a real cost: the static page duplicated the palette by hand, which is exactly how the v1 contrast bugs (cream on door blue at 2.05:1) got in.

The planner is also not "the app" yet — no auth, no persistence, and the flow ends in email capture that links back to the waitlist. It is a marketing surface, and it wants a root-domain URL to put in the @buildingtend bio.

## Decision
- Serve the marketing page and the planner from one Next.js app (`apps/web`) on one Vercel project: `/` is the landing page, `/plan` is the planner.
- Port the static markup into `app/page.tsx` with styles in `components/site/site.css`, scoped under `.tend-site` and reading from `@tend/ui-tokens` instead of literal hex values.
- Archive the `tend-site` repo and move the `heytend.co` domain to this project. URLs do not change, so there is nothing to redirect.

## Alternatives considered
- **Vercel rewrites / multi-zones**: keep `tend-site` as the root project and proxy `/plan` to a second deployment. Correct when two teams own two repos and merging is not possible; here it buys asset-prefix config, two projects and two sets of preview URLs to solve a problem we don't have.
- **`plan.heytend.co` subdomain**: cheapest to stand up, but gives up the root-domain URL and still leaves brand CSS maintained in two places.
- **Port the planner into the static repo**: wrong direction — the planner is React and depends on workspace packages.

## Consequences
- The landing page is on the token pipeline, so a palette change in `tokens.ts` reaches it and the contrast check in CI covers it.
- Marketing copy changes now go through a Next build (about a minute). A failed build is not promoted, so the live page stays up.
- Fonts are self-hosted by `next/font` rather than fetched from fonts.googleapis.com at runtime, which removes a render-blocking third-party request — at the cost of the build needing to reach Google Fonts once, at build time.
- One more thing can break the homepage: an error in the planner's build. Acceptable at pre-launch traffic.

## Revisit if
The product grows an authenticated surface. That is the natural seam: `apps/web` keeps marketing plus free tools on heytend.co, and the signed-in app moves to `app.heytend.co` as a second Vercel project from this same monorepo.
