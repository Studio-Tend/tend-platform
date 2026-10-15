# 0007. Health data later, derived signals only

- Status: Proposed
- Date: 2026-09-16

## Context
Users may want Tend to take into account data from wearables like Oura. Tend is web first (see 0002), and Apple HealthKit and Android Health Connect are only reachable from a native app. Health data is sensitive and subject to platform rules and consumer-privacy regulation.

## Decision
- Health data is a **later feature**, not part of the initial web launch.
- **Route A (with the mobile app)**: read from HealthKit and Health Connect, which aggregate data from many wearables.
- **Route B (web-compatible)**: direct vendor cloud APIs (e.g. Oura) or an aggregator, run in the worker using the shared integrations model.
- Choose the route based on what users ask for and whether the mobile app exists by then.
- Store **derived signals** (e.g. sleep score, readiness level), not raw streams.
- Keep health data in isolated tables with encrypted fields, per-source consent, and one-step disconnect that deletes it.
- **Product rule**: health signals may inform pacing and suggestions but must never lower a goal's importance.

## Alternatives considered
- **Build it at launch**: adds compliance and integration work before the core loop is validated.
- **Aggregator only (Terra, Junction, etc.)**: broadest coverage and works on web, but per-user cost.

## Consequences
- Route A requires Expo development builds and native health modules.
- Route B means one integration and approval process per vendor (or aggregator fees).
- Either way: meet Apple and Google health data policies where applicable (no ad use, clear privacy policy, Health Connect declaration), and check the FTC Health Breach Notification Rule and other current requirements before building.

## Revisit if
Users strongly request wearable data before a mobile app exists.
