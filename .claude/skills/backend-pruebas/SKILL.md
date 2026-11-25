---
name: backend-pruebas
description: 'Backend tests by layer: location, test doubles as classes, Testcontainers, contract and e2e. Use it when writing or reviewing backend tests.'
paths:
  - 'backend/**/__tests__/**'
  - 'backend/**/e2e/**'
---

# Backend tests

Test by layer, at the lowest cost that gives confidence. The pattern is a honeycomb: a lot in components and integration, little in unit tests of real logic and very little e2e.

## Location

- `src/<folder>/__tests__/<file>.spec.ts` for unit tests and `<file>.int-spec.ts` for integration. See `backend-estructura`.
- Contract of a port: the shared test `run<Port>Contract(factory)` lives in `src/__tests__/utils/`, is exposed through `@platform/<lib>/test-utils` and is called, from their own `.spec.ts` or `.int-spec.ts`, by the in-memory double and the real adapter. zod schema tests are plain `.spec.ts` files.
- Integration tests end in `.int-spec.ts`. A `*.integration.spec.ts` file would run as a unit test, and `check-structure.mjs` and the lint reject it.
- End to end of an app: `backend/apps/<app>/e2e/<flow>.e2e-spec.ts`.
- Shared utilities in `__tests__/utils/` (of the folder or, if several use them, of `src/__tests__/utils/`). They are exposed to other libraries with the `@platform/<lib>/test-utils` alias. Never a separate `testing/` folder. A port's doubles are not exported from the public `index.ts`: they are exposed only through `@platform/<lib>/test-utils`.

## Tests are code too

The rules of `backend-codigo-enterprise` apply to tests and their utilities:

- Fakes, builders and containers are classes with a role name: `InMemoryUserRepository`, `UserBuilder`, `PostgresTestDatabase`. No loose objects copied into every test.
- What repeats in two tests moves up to `__tests__/utils/`. If two folders use it, it moves up to `src/__tests__/utils/`.
- One builder per aggregate with valid defaults and `with...` methods for what matters in each test.
- A fake implements the real port and passes the same contract test as the real adapter.
- No logic in tests: no `if` or loops that decide what to verify.
- Names, imports and types with the same care as production code.

## What to test in each layer

- Domain: what it tests: invariants, transitions, emitted events; with: plain Jest
- Application: what it tests: a use case: orchestration, errors, events to the outbox; with: Jest; doubles: in-memory fakes of the ports
- Infrastructure: what it tests: repository, mapper, consumer against a real system; with: Testcontainers; doubles: none for the database
- Contract: what it tests: the zod schema accepts valid input and rejects invalid input; producer and consumer match; with: Jest
- Component: what it tests: a full NestJS module over HTTP; with: `@nestjs/testing` and supertest, real database; doubles: only external services
- E2E: what it tests: a few critical flows with the packaged app; with: docker-compose

Details and recipes in `references/capas-y-testcontainers.md`.

## How to write them

- A test verifies one behavior. The name states unit, scenario and result: `rejects a password shorter than 12 characters`. Two levels of `describe`: the unit and the scenario.
- Arrange, act, assert separated by a blank line. One `act` and few assertions.
- No logic in the test: no loops or conditionals. If a check repeats, it is a matcher or a named helper.
- Errors are verified by `code`: `await expect(promise).rejects.toMatchObject({ code: ... })`. No `try/catch`.
- Generated values (ids, dates) are verified by shape, not exact value (`expect.any(String)`), or pinned with `FixedClock` and `SequentialIdGenerator`.
- Test data comes from builders with valid defaults, overriding only what matters in the test: `aUser({ status: UserStatus.Suspended })`. The relevant detail is visible in the test.
- Realistic data (an email shaped like an email), not "foo". No real people's data.
- Snapshots only small and inline. Never of a large object.
- A test does not depend on the order or state of another, and each one creates its data. No global seeds.

Example in `references/ejemplos.md`, section "How to write them".

- Case tables use `it.each`, not loops or `if`.
- Each test file maps to one class. If it tests several, split it.

## Doubles

- They are classes that implement the port: `InMemoryUserRepository`, `FixedClock`, `FakeRateLimiter`, `InMemoryBus`. A fake with behavior is preferred over a mock.
- If the number of calls is a requirement (load deduplication in `PlacementLoader`), use a fake with behavior and a public counter, not `jest.fn` with `toHaveBeenCalledTimes`.
- An in-memory fake must pass the same contract test as the real adapter (`runUserRepositoryContract(factory)`), so they do not diverge.
- External HTTP services: interceptor (`nock`, MSW) with slow responses, 503 and timeouts.
- Randomness, ids and time are controlled with doubles of `RandomSource`, `IdGenerator` (`SequentialIdGenerator`) and `Clock` (`FixedClock`). No `Math.random` or `Date.now` in the code under test.

## Doubles that stay in production

They are a runtime mode, not a double, so they stay in the public index: `InMemoryCache` (the only mode without Valkey), `InMemoryRateLimiter` (used by `DegradingRateLimiter`), `NoopMetrics`, `InProcessJobLock`, `NullRoutingCache` and `InProcessDirectoryChannel`. The other doubles go to `test-utils`:

- `InMemoryIdempotencyStore`: exposed through: `@platform/kernel/test-utils`; contract: `runIdempotencyStoreContract`
- `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`: exposed through: `@platform/messaging/test-utils`; contract: `runOutboxStoreContract`, `runProcessedMessageStoreContract`
- `InMemoryProcessedOperationStore`: exposed through: `@platform/internal-api/test-utils`; contract: `runIdempotencyStoreContract`
- `InMemorySagaStore`: exposed through: `@platform/saga/test-utils`; contract: `runSagaStoreContract`
- `InMemoryDirectoryStore`: exposed through: `@platform/sharding/test-utils`; contract: `runDirectoryStoreContract`
- `InMemoryRoutingCache`: exposed through: `@platform/sharding/test-utils`; contract: `runRoutingCacheContract`
- `InMemoryMetrics`: exposed through: `@platform/observability/test-utils`
- `FakeSqsClient`, `FakeSnsClient`: exposed through: `@platform/adapters-aws/test-utils`

## Time and async

- Time is controlled with `FixedClock` or fake timers. Never `sleep` or fixed waits: if something is async, wait for the condition (`await waitFor(() => ..., { timeoutMs })`) with a maximum time.
- Safe parallel tests: database per suite or schema per suite, random ports (`listen(0)`).
- A flaky test is not retried or skipped: fix it or delete it.

## Integration

- Against real services with Testcontainers (PostgreSQL, Valkey, LocalStack). `ContainerRuntime` from `@platform/kernel/test-utils` decides whether Docker is available based on the `INTEGRATION_TESTS` variable: `skip` (the default outside CI, the suite is skipped without Docker) or `require` (CI, fails without Docker). `describeIfAvailable(name, body)` wraps each integration suite. There are no per-service flags. `pg-mem` is not used: the TypeORM layer is tested with Testcontainers.

Example in `references/ejemplos.md`, section "Integration".

In CI: `INTEGRATION_TESTS=require pnpm nx test <project>`.

- Containers start once per suite (`beforeAll`) and tests isolate their data with their own tenants or ids, or with transactions that roll back.
- TypeORM migrations actually run on the test database, and a test verifies that no changes are pending (`migration:generate` with no differences).
- Each suite creates its data and assumes no prior data. Clean up after the suite, not between tests.
- Repositories are tested with cases that catch real defects: concurrency (two writes with the same version), uniqueness, cursor pagination, isolation between tenants and number of queries (no N+1).

## Assertions of a flow

In a component test, think of five outcomes: the response, the new state, the outgoing calls, the published messages and observability (log or metric) when it is a requirement.

## Coverage

- 80 % of lines, statements and functions, and 75 % of branches per project. The threshold lives in `backend/jest.preset.js`.
- `catch` blocks and error paths count.
- A mutation test (Stryker) over `domain/` and `application/` is the measure that tests really verify.

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

Method in `pstack-en-node-template`. From pstack these apply here: `principle-test-behavior-not-implementation`, `typescript-best-practices`, `tdd`, `principle-prove-it-works`, `interrogate`.
