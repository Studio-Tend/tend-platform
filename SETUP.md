# Send-week email: setup

Files are at their repo paths. Copy them into Tend-main, keeping the folders.

## 1. Install (run from apps/web)
    cd apps/web
    pnpm add resend @react-email/components

zod is already a dependency of @tend/core.

## 2. Two files you edit rather than copy
- packages/core/src/weekly-plan/index.ts: add `export * from './send-week';`
  (the included index.ts shows the full file).
- components/tend-flow/YourWeekStep.tsx: render the form where "send me my week" goes:

      import { SendWeekForm } from './SendWeekForm';
      ...
      <SendWeekForm focuses={focuses} roomItems={roomItems} />

  Use whatever names YourWeekStep already has for the focuses and make-room items.

## 3. Check two assumptions
    grep -n "export const" packages/ui-tokens/src/index.ts packages/ui-tokens/src/tokens.ts
- lib/email/palette.ts imports `colors` from @tend/ui-tokens with the style-guide
  names (doorBlue, deepShade, cream, ink, inkSoft, line, lineStrong, doorBlueWash).
  If the export is named differently, change that one import.
- SendWeekForm uses Tailwind token classes (bg-ink, text-ink-soft, border-line-strong,
  outline-deep-shade, type-body…). Rename them if your theme names differ.

## 4. Env vars
Copy apps/web/.env.example to apps/web/.env.local and fill it in. Add the same
three to Vercel (Production, and Preview if you want previews to send), then redeploy.

## 5. Verify
    pnpm --filter web exec tsc --noEmit
    pnpm dev   # then finish /plan/week and send to yourself

## 6. Rate limit before posting about it
Vercel → Project → Firewall → add a rule: path equals /api/send-week, rate limit,
e.g. 5 requests / 10 min per IP, action Deny. No code needed.
