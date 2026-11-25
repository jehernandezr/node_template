# 0035. End-to-end platform flow

- Status: Accepted
- Date: 2026-11-24
- Related: [ADR 0008](0008-orchestrated-sagas-persistent-log.md), [ADR 0010](0010-logical-sharding-region-residency.md), [ADR 0031](0031-reports-billing-identity-sagas.md), [ADR 0032](0032-tenant-moves-and-regions.md)

## Context

Each service tests its routes, its consumers and its sagas with the other services mocked. F5 to F11 end when the end-to-end flow passes twice in a row: a tenant's onboarding, its work in each service, the invoice and the move, with the five real services talking to each other. It had to be decided how to bring them up together without LocalStack or containers per service, and what the test asserts at each step.

## Decision

- **One process, real databases.** `backend/e2e/platform-flow` (target `platform-flow:e2e`, in CI with `nx affected -t e2e`) starts identity, tasks, notifications, reports and billing in one process, on a PostgreSQL with one catalog and two shards per service and a Valkey from Testcontainers. It is the only project that imports apps, and only through `@apps/<service>/test-utils`.
- **In-memory messaging, internal API over HTTP.** An in-memory bus connects them: each outbox's relay publishes to it (`BusEnvelopePublisher`) and each queue is delivered to the dispatcher of the service that declares it. The internal API goes over signed HTTP among the five, without intermediaries.
- **No mocked platform steps.** Each service starts with its own configuration (databases, `TENANT_MOVE_TARGETS` with both shard groups, URLs of the others) and nothing writes to their databases outside their operations: tenants reach each service's directory through identity's seeding and through the onboarding saga ([ADR 0032](0032-tenant-moves-and-regions.md)).
- **Jobs by hand.** Jobs do not run on their own (`SchedulingMode.External`): the test publishes the outboxes and delivers the messages until nothing is left in flight, and closes the billing periods with its job.
- **What it asserts.** It walks through a tenant's onboarding with `TenantOnboarding` (and checks that the five directories place it in the same group), inviting a member, tasks created and completed, the notice in the author's inbox, the tasks-by-status report on the projection, the period's invoice and moving the tenant to the other group with `MoveTenant`. For the move it first records each service's source shard, and afterwards asserts that each one's directory points to the target group's shard, that the rows of each table read directly in that shard are the ones from before and that each service's source was left with the move barrier marked as pivoted.
- **In CI it fails without Docker.** The step runs with `INTEGRATION_TESTS=require`, so a machine without Docker does not accept it as passing with zero tests.

## Consequences

### Positive

- A missing platform step between services (a directory without the tenant, a queue without a consumer, a `switch` that did not run) breaks the test.
- It runs on a Raspberry Pi and within CI time.

### Costs

- It does not exercise SNS or SQS: that stays in the integration tests of `@platform/adapters-aws`.
- The five services share one process and one Valkey; a problem that only shows up with separate processes is not seen here.

## Alternatives considered

- Bringing up the five compiled services with LocalStack: it does not fit on a Raspberry Pi or within CI time and tests the same business flow.
- Checking the move by reading each service through its own directory: it would pass even if a service had not done the `switch`.
