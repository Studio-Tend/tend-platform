# 0004. Managed auth, verified in the API

- Status: Accepted (provider still open)
- Date: 2026-09-16

## Context
Tend needs email login plus social sign-in. On iOS, Apple requires Sign in with Apple when other social logins are offered. The starter includes tested email/password + JWT auth, but owning auth also means password reset, email verification, and OAuth providers.

## Decision
Use a managed auth provider (Supabase Auth or Clerk). The mobile and web apps sign in with the provider; the NestJS API verifies the provider's JWT and maps it to a Tend user.

## Alternatives considered
- **Starter's built-in auth**: already written, but ongoing ownership of resets, verification, and social providers.
- **Eco Pass magic-link auth**: good passwordless pattern, same ownership cost.
- **Better Auth**: self-hosted library; still more to run.

## Consequences
- Saves roughly a week of auth work and ongoing maintenance.
- Adds a dependency on the provider's pricing and availability.
- The starter's auth, refresh-token, and role modules can be removed or disabled.

## Revisit if
Provider cost at scale becomes significant, or a needed login method isn't supported.
