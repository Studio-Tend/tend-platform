# Tend — product UI design system

**Status:** Accepted implementation baseline for the web-first weekly planner, October 2026.
This records the refinements now on `main`, including the October Impeccable-inspired changes.
It is *not* a directive to replace existing styles with a mockup.

## Authority and change process

1. `packages/ui-tokens/src/tokens.ts` is the source of truth for token values. `css/theme.css` and `css/variables.css` are generated from it; never edit generated files.
2. This document records the accepted product UI decisions and component states; `apps/web/components/tend-flow/tend-flow.css` is their current implementation.
3. `.cursor/rules/brand.mdc`, `AGENTS.md`, and `CLAUDE.md` point agents here. They must not redefine token values independently.
4. External Claude artifacts, prototypes and brand/social templates are *references*, not automatic instructions to modify the existing application. If they disagree with code or this document, **pause, compare screenshots, and seek a design decision**. Never globally synchronize styles without one.
5. The current Tend brand guide covers palette and voice; the web product may have different component-specific treatments. Record intentional differences rather than overwriting the UI.

Before a visual change: name the user problem and what the user is feeling; inspect the existing component and last UI-focused commits; preserve working states; make the smallest targeted diff; check 375px and 768px mobile/narrow layouts and a desktop week board; compare screenshots **before and after**. For any token-baseline change, update the baseline test and this document together, explicitly in the PR.

## Established foundations (do not bulk-replace)

| Property | Accepted web planner value | Notes |
|---|---|---|
| Canvas | Cream `#FAFAF8` | Quiet backgrounds; rest and empty space are intentional |
| Body | Ink `#17161F`; secondary Ink soft `#4C5677` | Never faded primary ink for ordinary body text |
| Primary accent | Deep shade `#5C6C97` | Filled action + white text; hover goes to Ink in the *current planner* |
| Border | `line` translucent, `lineStrong` `#868B9E` | Decorative separators vs. interactive boundaries |
| Selected signal | Door blue `#A3B1D3`, Ink text | Selected chips also use a visible check/weight or border |
| Subtle tint | `doorBlueWash` rgba(163,177,211,0.14) | Existing make-room rows and week life items; don't replace wholesale with a solid blue |
| Type | Fraunces headings, Inter structure | Display **44/50**; title **32/38**; heading **24/31**, regular |
| Supporting type | Statement **20/28**, body-large **18/28**, body **16/24**, body-small **14/20**, label/caption **12/16** | Labels reserved for short meaningful categories, not extra eyebrow decoration |
| Radius | small 4px, medium 8px, large **16px**, pill | Don't shrink all cards to 12px |
| Interaction | 44px minimum targets; 2px deep-shade focus outline + 2px offset | For both pointer and keyboard; don't hide controls behind hover on touch |
| Motion | 150ms small / 250ms larger interaction, reduced motion | No decorative urgency or celebratory animations |

`packages/ui-tokens/scripts/check-design-baseline.ts` protects a subset of these values; the existing contrast and generated-CSS checks run with it in CI.

## Component decisions in the *current* experience

- **Buttons:** `.tend-button-primary` is filled deep shade, white type, 48px high. Its existing hover is Ink. Disabled primary actions use a **cream background, Ink-soft label and visible strong border**, *not* 50%-opacity blue. `.tend-button-ghost` is quieter Ink-soft text; it is not the same role as an outlined `.tend-button-secondary` used for a legible alternative in confirmation dialogs. The user must understand the next action in each context. An inline **Add** and footer **Continue** may both be filled if their distinct contexts are clear; reducing them to one fill requires a tested screen-level decision.
- **Weekly board:** preserve the strengthened 16px action titles, 14px metadata, readable 20px day numbers, width sufficient for word wrapping, and quieter 'Start this week over' separated from the header. Desktop allows horizontal scrolling when a full week cannot fit; mobile uses a sticky seven-day strip and a single-day view. Empty slots are allowed to remain empty, not marked overdue.
- **Making room:** is a legitimate part of the plan. Keep the current subtle translucent tint and ✦ Ink-soft marker. Never treat rest as an incomplete task.
- **Editing:** hover-only affordances must have keyboard and touch equivalents. Keep visible 44px targets, Undo feedback, focus restoration, and reduced-motion behavior.
- **Selection:** use a visible check, border or weight as well as color. Avoid red for missed or unscheduled actions.
- **Dialog:** a decision to start over is consequential. Keep 'Keep my plan' visibly identifiable; do not silently demote it to near-invisible ghost text.

## Focus markers

`focus1`–`focus6` are graphical markers only, contrast-checked against cream, white, and `doorBlueSoft`. The week glance on steps 3 and 4 shows one selected day at a time, and each goal title on step 3 uses the same small dot. Each focus stores a stable `colorIndex`, so reordering does not change its color. The focus name sits beside the dot, and the dot is `aria-hidden`. Do not recolor goal cards, action text, buttons, or life items. Life items keep the ✦ Ink-soft marker. Avoid a separate legend when the name is already next to the dot.

`doorBlueSoft` is defined as an optional solid surface **but is not the current treatment** for the planner's make-room cards. Evaluate it in one component at a time if there is a concrete UX need.

## Accessibility, wellness and scope

Ask: **What is the user feeling at this moment?** Planning should reduce pressure. Rest counts. The user controls changes to their calendar. Progress informs, never judges. Avoid streaks, warning-red overdue states, and visual urgency.
Use semantic controls, stable accessible labels, screen-reader status announcements and selected states not indicated by color alone. Test keyboard navigation, zoom, reduced motion, touch, empty and error states.

**MVP boundary:** do not build a full design-system showcase, new card/hover variants, a focus-legend component or global visual rewrite merely to make a prototype match. Add a reusable primitive only where it is needed across actual product surfaces.
