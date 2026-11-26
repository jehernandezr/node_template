# 0044. Valkey failure policy

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0021](0021-valkey-adapter.md), [ADR 0022](0022-token-verification-shared-revocation-state.md), [ADR 0032](0032-tenant-moves-and-regions.md)

## Context

ARCHITECTURE promises graceful degradation when Valkey fails, the general review asks for Valkey to be mandatory outside development, and without `VALKEY_HOST` the runtime silently starts with `NullRoutingCache` and an in-process directory channel. Nothing says whether each security check fails open or closed, and production safeguards depend on `NODE_ENV`, which Lambda does not set.

## Decision

- **Configuration.** `DEPLOY_ENVIRONMENT` (`local`, `dev`, `staging`, `prod`) is the only source of environment safeguards. `NODE_ENV` is always `production` in images and decides nothing else. Outside `local`, `VALKEY_HOST` is required and the in-memory and null adapters are rejected at start-up.
- **Readiness** does not include Valkey, so a Valkey outage does not take every target out of the load balancer. `HealthRoute.Ready` reports it as `degraded`.
- **At runtime, per check:**

| Use                                                 | When Valkey fails                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Token revocation (`auth:*`), permission version     | Closed: 503 `PLATFORM.DEPENDENCY.UNAVAILABLE` (added to `platformErrorCatalog`), retryable |
| Replay nonce, MFA attempt counters, account lockout | Closed: 503, retryable                                                                     |
| Tenant write gate with `TENANT_WRITE_GATE=valkey`   | Closed: the write waits and then answers `TENANT_MIGRATING`                                |
| Real-time authentication                            | Closed: 503, never 401, so the client keeps its session                                    |
| Cache, routing cache, Bloom filters                 | Open: read from the database                                                               |
| Rate limiting                                       | Open: per-process limits, behind a circuit breaker                                         |
| Feature flags                                       | Open: last known value                                                                     |
| Real-time stream and presence                       | Open: no live frames; the inbox still has every notification                               |

- Every Valkey call has a deadline and a circuit breaker, so an outage adds no more than the deadline to a request.

## Consequences

### Positive

- A Valkey outage cannot let a revoked token or a replayed request through.
- Reads and public traffic keep working while Valkey recovers.

### Costs

- Authenticated writes that check revocation fail while Valkey is down.
- Each check above needs a test with Valkey stopped.

## Alternatives considered

- Fail open everywhere: a Valkey outage would revive revoked sessions.
- Valkey in readiness: one Valkey failure would empty every target group.
