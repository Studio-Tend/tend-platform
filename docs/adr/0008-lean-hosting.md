# 0008. Lean hosting; retire the Eco Pass AWS stack

- Status: Proposed
- Date: 2026-09-16

## Context
The existing AWS account (July 2026: ~$300) runs an Eco Pass-style stack: 14 VPC interface endpoints (~$104), Fargate (~$70), WAF (~$52), NAT Gateway (~$34), ALB (~$17), ECR storage, Secrets Manager. Most of this is fixed always-on cost with very little traffic. Hosting cost matters, but developer time matters more.

## Decision
- Confirm the current AWS stack belongs to Eco Pass and shut it down or hand it off.
- Host Tend's API and worker as small containers that scale independently (small Fargate tasks or Fly/Railway).
- If on AWS: no interface VPC endpoints, no NAT Gateway (public subnets with public IPs), no WAF pre-launch, ECR lifecycle policy, one combined secret or SSM Parameter Store.
- Web app on Vercel.
- Set a billing alert on day one.
- Don't deploy anything until the local check-in loop is validated.

## Alternatives considered
- **Reuse the current stack as-is**: ~$300/month for near-zero traffic.
- **Lambda-only**: near-zero idle cost, but NestJS cold starts (see 0003).

## Consequences
- Estimated tens of dollars per month at launch instead of hundreds.
- Some protections (WAF, private networking) added later when traffic justifies them.

## Revisit if
Traffic, security requirements, or compliance needs grow.
