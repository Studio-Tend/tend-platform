# Tend repository guardrails

For **web UI, CSS, tokens, planning interactions, and design reviews**:
1. Read [docs/design-system.md](docs/design-system.md) and [packages/ui-tokens/src/tokens.ts](packages/ui-tokens/src/tokens.ts) before changing styles.
2. Protect existing Impeccable-inspired UI refinements. Do **not** use an external artifact to replace the product's typography, spacing, radii, button states or subtle surface colors without an explicit design decision.
3. Keep changes scoped to the user problem and review empty, busy, disabled, focus, selected, mobile and keyboard states.
4. Run the token generator/test and app tests. Include before/after screenshots for visual PRs.
5. **Do not edit generated CSS by hand.** Do not silently update the design-baseline test just to make a visual change pass.

Tend is a calm weekly planner: prioritize meaning without anxiety. Rest and free time count. See [docs/design-system.md](docs/design-system.md).
