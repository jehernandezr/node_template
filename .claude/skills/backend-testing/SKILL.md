---
name: backend-testing
description: 'Backend tests by layer: location, test doubles as classes, Testcontainers, contract and e2e. Use it when writing or reviewing backend tests.'
paths:
  - 'backend/**/__tests__/**'
  - 'backend/**/e2e/**'
---

# Backend tests

Test by layer, at the lowest cost that gives confidence. The pattern is a honeycomb: a lot in components and integration, little in unit tests of real logic and very little e2e.

## Location

- `src/<folder>/__tests__/<file>.spec.ts` for unit tests and `<file>.int-spec.ts` for integration. See `backend-structure`. <!-- id: backend-testing.1 -->
- Contract of a port: the shared test `run<Port>Contract(factory)` lives in `src/__tests__/utils/`, is exposed through `@platform/<lib>/test-utils` and is called, from their own `.spec.ts` or `.int-spec.ts`, by the in-memory double and the real adapter. zod schema tests are plain `.spec.ts` files. <!-- id: backend-testing.2 -->
- Integration tests end in `.int-spec.ts`. A `*.integration.spec.ts` file would run as a unit test, and `check-structure.mjs` and the lint reject it. <!-- id: backend-testing.3 -->
- End to end of an app: `backend/apps/<app>/e2e/<flow>.e2e-spec.ts`. <!-- id: backend-testing.4 -->
- Shared utilities in `__tests__/utils/` (of the folder or, if several use them, of `src/__tests__/utils/`). They are exposed to other libraries with the `@platform/<lib>/test-utils` alias. Never a separate `testing/` folder. A port's doubles are not exported from the public `index.ts`: they are exposed only through `@platform/<lib>/test-utils`. <!-- id: backend-testing.5 -->

## Tests are code too

The rules of `backend-code` apply to tests and their utilities:

- Fakes, builders and containers are classes with a role name: `InMemoryUserRepository`, `UserBuilder`, `PostgresTestDatabase`. No loose objects copied into every test. <!-- id: backend-testing.6 -->
- What repeats in two tests moves up to `__tests__/utils/`. If two folders use it, it moves up to `src/__tests__/utils/`. <!-- id: backend-testing.7 -->
- One builder per aggregate with valid defaults and `with...` methods for what matters in each test. <!-- id: backend-testing.8 -->
- A fake implements the real port and passes the same contract test as the real adapter. <!-- id: backend-testing.9 -->
- No logic in tests: no `if` or loops that decide what to verify. <!-- id: backend-testing.10 -->
- Names, imports and types with the same care as production code. <!-- id: backend-testing.11 -->

## What to test in each layer

- Domain: what it tests: invariants, transitions, emitted events; with: plain Jest <!-- id: backend-testing.12 -->
- Application: what it tests: a use case: orchestration, errors, events to the outbox; with: Jest; doubles: in-memory fakes of the ports <!-- id: backend-testing.13 -->
- Infrastructure: what it tests: repository, mapper, consumer against a real system; with: Testcontainers; doubles: none for the database <!-- id: backend-testing.14 -->
- Contract: what it tests: the zod schema accepts valid input and rejects invalid input; producer and consumer match; with: Jest <!-- id: backend-testing.15 -->
- Component: what it tests: a full NestJS module over HTTP; with: `@nestjs/testing` and supertest, real database; doubles: only external services <!-- id: backend-testing.16 -->
- Service: what it tests: a whole service over HTTP, its internal API and its consumers; with: the service's test app, which composes `ServiceTestApp` from `@platform/service/test-utils` (databases, identity stub, peer stubs, migrations, tenant placement); doubles: only the other services <!-- id: backend-testing.17 -->
- E2E: what it tests: a few critical flows with the packaged app; with: docker-compose <!-- id: backend-testing.18 -->

Details and recipes in `references/layers-and-testcontainers.md`.

## How to write them

- A test verifies one behavior. The name states unit, scenario and result: `rejects a password shorter than 12 characters`. Two levels of `describe`: the unit and the scenario. <!-- id: backend-testing.19 -->
- Arrange, act, assert separated by a blank line. One `act` and few assertions. <!-- id: backend-testing.20 -->
- No logic in the test: no loops or conditionals. If a check repeats, it is a matcher or a named helper. <!-- id: backend-testing.21 -->
- Errors are verified by `code`: `await expect(promise).rejects.toMatchObject({ code: ... })`. No `try/catch`. <!-- id: backend-testing.22 -->
- Generated values (ids, dates) are verified by shape, not exact value (`expect.any(String)`), or pinned with `FixedClock` and `SequentialIdGenerator`. <!-- id: backend-testing.23 -->
- Test data comes from builders with valid defaults, overriding only what matters in the test: `aUser({ status: UserStatus.Suspended })`. The relevant detail is visible in the test. <!-- id: backend-testing.24 -->
- Realistic data (an email shaped like an email), not "foo". No real people's data. <!-- id: backend-testing.25 -->
- Snapshots only small and inline. Never of a large object. <!-- id: backend-testing.26 -->
- A test does not depend on the order or state of another, and each one creates its data. No global seeds. <!-- id: backend-testing.27 -->

Example in `references/examples.md`, section "How to write them".

- Case tables use `it.each`, not loops or `if`. <!-- id: backend-testing.28 -->
- Each test file maps to one class. If it tests several, split it. <!-- id: backend-testing.29 -->

## Doubles

- They are classes that implement the port: `InMemoryUserRepository`, `FixedClock`, `FakeRateLimiter`, `InMemoryBus`. A fake with behavior is preferred over a mock. <!-- id: backend-testing.30 -->
- If the number of calls is a requirement (load deduplication in `PlacementLoader`), use a fake with behavior and a public counter, not `jest.fn` with `toHaveBeenCalledTimes`. <!-- id: backend-testing.31 -->
- An in-memory fake must pass the same contract test as the real adapter (`runUserRepositoryContract(factory)`), so they do not diverge. <!-- id: backend-testing.32 -->
- External HTTP services: interceptor (`nock`, MSW) with slow responses, 503 and timeouts. <!-- id: backend-testing.33 -->
- Randomness, ids and time are controlled with doubles of `RandomSource`, `IdGenerator` (`SequentialIdGenerator`) and `Clock` (`FixedClock`). No `Math.random` or `Date.now` in the code under test. <!-- id: backend-testing.34 -->

## Doubles that stay in production

They are a runtime mode, not a double, so they stay in the public index: `InMemoryCache` (the only mode without Valkey), `InMemoryRateLimiter` (used by `DegradingRateLimiter`), `NoopMetrics`, `InProcessJobLock`, `NullRoutingCache` and `InProcessDirectoryChannel`. The other doubles go to `test-utils`:

- `InMemoryIdempotencyStore`: exposed through: `@platform/kernel/test-utils`; contract: `runIdempotencyStoreContract` <!-- id: backend-testing.35 -->
- `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`: exposed through: `@platform/messaging/test-utils`; contract: `runOutboxStoreContract`, `runProcessedMessageStoreContract` <!-- id: backend-testing.36 -->
- `InMemoryProcessedOperationStore`: exposed through: `@platform/internal-api/test-utils`; contract: `runIdempotencyStoreContract` <!-- id: backend-testing.37 -->
- `InMemorySagaStore`: exposed through: `@platform/saga/test-utils`; contract: `runSagaStoreContract` <!-- id: backend-testing.38 -->
- `InMemoryDirectoryStore`: exposed through: `@platform/sharding/test-utils`; contract: `runDirectoryStoreContract` <!-- id: backend-testing.39 -->
- `InMemoryRoutingCache`: exposed through: `@platform/sharding/test-utils`; contract: `runRoutingCacheContract` <!-- id: backend-testing.40 -->
- `InMemoryMetrics`: exposed through: `@platform/observability/test-utils` <!-- id: backend-testing.41 -->
- `FakeSqsClient`, `FakeSnsClient`: exposed through: `@platform/adapters-aws/test-utils` <!-- id: backend-testing.42 -->

## Time and async

- Time is controlled with `FixedClock` or fake timers. Never `sleep` or fixed waits: if something is async, wait for the condition (`await waitFor(() => ..., { timeoutMs })`) with a maximum time. <!-- id: backend-testing.43 -->
- Safe parallel tests: database per suite or schema per suite, random ports (`listen(0)`). <!-- id: backend-testing.44 -->
- A flaky test is not retried or skipped: fix it or delete it. <!-- id: backend-testing.45 -->

## Integration

- Against real services with Testcontainers (PostgreSQL, Valkey, LocalStack). `ContainerRuntime` from `@platform/kernel/test-utils` decides whether Docker is available based on the `INTEGRATION_TESTS` variable: `skip` (the default outside CI, the suite is skipped without Docker) or `require` (CI, fails without Docker). `describeIfAvailable(name, body)` wraps each integration suite. There are no per-service flags. `pg-mem` is not used: the TypeORM layer is tested with Testcontainers. <!-- id: backend-testing.46 -->

Example in `references/examples.md`, section "Integration".

`pnpm nx test <project>` runs the unit tests; `pnpm nx test-int <project>` runs the `.int-spec.ts` and `.e2e-spec.ts` suites; `pnpm nx test-int <project> -c ci --coverage` runs both with coverage, as CI does with `INTEGRATION_TESTS=require`.

- The Jest global setup starts one PostgreSQL and one Valkey per run and the suites share them, one at a time ([ADR 0047](../../../docs/adr/0047-shared-test-servers-rule-guards-and-impact-review.md)). A harness never starts its own PostgreSQL or Valkey container: it creates its own databases on the shared server (`ShardedTestDatabase`, `ServicePostgresServer`, `TestDatabaseServer`) and drops them when it stops. A suite that changes server-level state (roles, publications and replication slots, a move between two instances, two regions) runs on a container of its own (`IsolatedPostgresServer`, `RegionServers`, `DedicatedValkeyHost`), carries the `@isolated-server` tag in its header and is listed in `backend/isolated-server-suites.json`. <!-- id: backend-testing.47 -->
- Migrations run once per run into template databases, and each suite clones them (`ShardedTestDatabase.migrate`, `ServiceTestApp`). A migration does not depend on the name of its database. <!-- id: backend-testing.48 -->
- Tests isolate their data with their own tenants or ids, or with transactions that roll back. <!-- id: backend-testing.49 -->
- TypeORM migrations actually run on the test database, and a test verifies that no changes are pending (`migration:generate` with no differences). <!-- id: backend-testing.50 -->
- Each suite creates its data and assumes no prior data. Clean up after the suite, not between tests. <!-- id: backend-testing.51 -->
- Repositories are tested with cases that catch real defects: concurrency (two writes with the same version), uniqueness, cursor pagination, isolation between tenants and number of queries (no N+1). <!-- id: backend-testing.52 -->

## Assertions of a flow

In a component test, think of five outcomes: the response, the new state, the outgoing calls, the published messages and observability (log or metric) when it is a requirement.

## Coverage

- 80 % of lines, statements and functions, and 75 % of branches per project. The threshold lives in `backend/jest.preset.js`. <!-- id: backend-testing.53 -->
- `catch` blocks and error paths count. <!-- id: backend-testing.54 -->
- A mutation test (Stryker) over `domain/` and `application/` is the measure that tests really verify. <!-- id: backend-testing.55 -->

## Required tests by type of change

```
- [ ] New aggregate or value: invariants and rejections
- [ ] New use case: happy path, each domain error, published events
- [ ] New repository or migration: integration with real PostgreSQL
- [ ] New contract: valid, invalid and backward compatibility
- [ ] New consumer: duplicate, out of order, invalid message
- [ ] New endpoint: unauthenticated, no permission, another tenant, invalid input
- [ ] New port: contract test run<Port>Contract against the double and against the real adapter
- [ ] New job: a test that calls run() directly
```

## With pstack

Method in `pstack-in-node-template`. From pstack these apply here: `principle-test-behavior-not-implementation`, `typescript-best-practices`, `tdd`, `principle-prove-it-works`, `interrogate`.
