# 0011. Week copy: calendar file and fragment reopen link

- Status: Accepted
- Date: 2026-09-19

## Context
People finish the weekly planner and email themselves a copy. That email was a static list. They also need the week on their real calendar, and a way back into the exact plan they made, without Tend storing weeks on a server.

ADR 0006 still holds for later OAuth calendar APIs. This record is the Phase-1 product decision for the email itself: timed blocks, free events, and a link that is only a snapshot.

## Decision
- Attach a `tend-week.ics` file (`METHOD:PUBLISH`) to the week email. One event per scheduled entry per daypart.
- Map dayparts to wall-clock blocks via `DAYPART_HOURS` in `@tend/core`: Morning 09:00–12:00, Afternoon 13:00–17:00, Evening 18:00–21:00.
- An entry with a day but no daypart becomes an all-day event. Entries with no day stay out of the file.
- Events are `TRANSPARENT` (free). Tend never blocks someone's calendar.
- Write UTC (`Z`) instants by converting the person's local wall time with `fromZonedTime`. Do not emit `VTIMEZONE` blocks; DST is handled by the conversion, not by shipping zone rules.
- The week is the Monday on or after "today" in the person's IANA time zone, not the server's: Sunday or Monday → that coming Monday / today; Tuesday–Saturday → next Monday.
- The email footer links to `${SITE_URL}/plan/week#w=<payload>`. The payload is `{ v: 1, f: focuses, r: roomItems }` — keys kept to one letter because the whole plan rides in the URL — deflated and base64url-encoded. Text after `#` is never sent to the server, so it never appears in Vercel logs. The route builds this URL itself; the client cannot supply it.

The link is a snapshot, not a sync. Re-importing the same week updates events only in calendars that honor UIDs. Losing the email loses the link. Anyone who has the email can open that week.

## Alternatives considered
- **Store the week and send a short id.** Would let us edit later, but needs persistence, auth, and expiry — more than this flow is ready for.
- **Query-string payload.** The plan would show up in server logs and Referer headers.
- **Floating local times or a `VTIMEZONE` block.** Looks simpler, but DST transitions and client support are worse than converting to UTC ourselves.
- **Busy/opaque events.** Would fight with the person's real calendar. Tend is a suggestion, not a booking.

## Consequences
- The send-week request now carries the full plan and time zone so the server can lay out the week, build the file, and encode the link.
- Opening `/plan/week#w=…` lands on "Your week" with that plan and then clears the hash, so later edits are not mistaken for editing the link.
- A large plan can make a long URL. The seed walkthrough stays under 1,200 characters; decode failures start an empty planner instead of throwing.

## Revisit if
People need the week to update after they change it, or the fragment grows too large for common clients. That is the point to store weeks or move to ADR 0006 Phase 2.
