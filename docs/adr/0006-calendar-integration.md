# 0006. Calendars: add-to-calendar links first, direct APIs next

- Status: Proposed
- Date: 2026-09-16

## Context
Users should be able to add Tend tasks to their main calendars (Google, Outlook, iCloud, etc.). Tend is web first (see 0002), so there is no on-device calendar access at launch.

## Decision
1. **Phase 1**: "Add to calendar" links for Google Calendar and Outlook, plus downloadable `.ics` files (which cover Apple Calendar and others). No OAuth, no backend, works on any device. One-way and not updatable.
2. **Phase 2**: in the worker, integrate Google Calendar API and Microsoft Graph for automatic event creation, updates, and optional two-way sync via change notifications.
3. **Phase 3 (with the mobile app)**: optionally write to on-device calendars with `expo-calendar`.
4. Store external event IDs per provider on each task (`ExternalLink`) from Phase 2, so events can be updated or removed.

## Alternatives considered
- **Direct APIs from day one**: more control, but OAuth, token storage, webhook renewal, and Google's OAuth verification before launch.
- **Unified calendar API (Nylas, Cronofy, etc.)**: one integration for all providers, but per-account pricing that grows with users.
- **iCloud via CalDAV**: no REST API; clunky app-specific passwords. `.ics` files cover Apple Calendar in Phase 1.
- **On-device first**: not available on web.

## Consequences
- Phase 1 ships almost free and works everywhere, but events don't update if a task changes.
- Phase 2 requires encrypted token storage. Google treats calendar scopes as sensitive, so start its OAuth verification well before Phase 2 goes public.

## Revisit if
Provider maintenance eats significant time (consider a unified API), or users need two-way sync sooner.
