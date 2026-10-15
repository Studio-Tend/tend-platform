# 0002. Web first with Next.js, Expo mobile app later

- Status: Proposed
- Date: 2026-09-16

## Context
Tend is pre-launch and still proving its value. People are reluctant to install an app that doesn't do much yet, and early users will mostly arrive from a link (e.g. the @buildingtend bio). Goal setting, the Wheel of Life, and weighing priorities work well on a larger screen. The team knows React and Next.js well and is new to mobile. Daily check-ins still tend to happen on phones.

## Decision
- Build the web app first with Next.js, **responsive and mobile-friendly from day one**, and installable to the home screen as a progressive web app (PWA).
- Build a native app with Expo (React Native) + Expo Router later, once retention shows users want daily push reminders and wearable data.
- Keep all domain logic in `packages/core` and API access in `packages/api` so the mobile app is mostly new UI when it comes.

## Alternatives considered
- **Mobile first (Expo)**: native reminders, on-device calendars and health data from day one, but requires an install before users see any value, plus a learning curve and app store reviews.
- **Both at once**: doubles UI work before the core loop is validated.
- **Shared UI via react-native-web**: rejected in 0001 to protect the brand.

## Consequences
- No install barrier; fastest path using existing skills; changes ship instantly.
- Reminders are weaker: web push on iOS only works for home-screen-installed web apps. Early reminders rely on email and calendar events.
- No on-device calendar or health access. Calendars start with "add to calendar" links (see 0006); health data waits for mobile or cloud APIs (see 0007).

## Revisit if
Users ask for reliable push reminders, most usage is on phones, or wearable data becomes a priority.
