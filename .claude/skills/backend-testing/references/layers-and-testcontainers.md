# Recipes by layer

## Contents

- Domain
- Use case with fakes
- NestJS module with TestingModule
- Component with supertest
- Testcontainers
- Contract
- E2E

## Domain

```ts
it('emits user.registered when a user registers', () => {
  const user = User.register(aRegistration());

  expect(user.pullDomainEvents()).toEqual([
    expect.objectContaining({ type: UserEventType.Registered }),
  ]);
});

it('rejects changing the email of a suspended user', () => {
  const user = aUser({ status: UserStatus.Suspended });

  expect(() => user.changeEmail(anEmail(), now, eventId)).toThrow(
    expect.objectContaining({ code: IdentityErrorCode.UserNotActive }),
  );
});
```

## Use case with fakes

Build it with `new` in the test. No NestJS: the use case does not need it.

```ts
const users = new InMemoryUserRepository();
const bus = new InMemoryBus();
const useCase = new RegisterUserUseCase(
  users,
  new InlineTransactionManager(),
  bus,
  new SequentialIdGenerator(),
  new FixedClock(new Date('2026-01-01T00:00:00Z')),
);
```

## NestJS module with TestingModule

To verify the wiring (tokens, exports) and replace an adapter with a fake. `compile()` is async.

```ts
const moduleRef = await Test.createTestingModule({ imports: [UsersModule] })
  .overrideProvider(PasswordHasher)
  .useClass(FastTestHasher)
  .overrideProvider(Clock)
  .useValue(new FixedClock(now))
  .compile();

const useCase = moduleRef.get(SignInUseCase);
```

- Global guards with `APP_GUARD` are registered with `useExisting` so they can be replaced with `overrideProvider`.
- An automatic `useMocker` hides missing dependencies: avoid it in wiring tests.
- One `app.close()` in `afterAll`, to release pools and connections.
- Platform library doubles come from `@platform/<lib>/test-utils`.

## Component with supertest

```ts
const app = moduleRef.createNestApplication();
await app.init();

const response = await request(app.getHttpServer())
  .post('/users')
  .send({ email: 'ana@example.com', password: aValidPassword() })
  .expect(201);

expect(response.body).toEqual({ userId: expect.any(String) });
```

Also verify: 400 with `application/problem+json` and `code` on invalid input, 401 without a token, 403 without permission and 404 for a resource of another tenant.

## Testcontainers

The Jest global setup (`backend/jest.servers.cjs`) starts one PostgreSQL and one Valkey per run, and the suites share
them one at a time ([ADR 0047](../../../../docs/adr/0047-shared-test-servers-rule-guards-and-impact-review.md)). A
harness never starts its own container: it creates its own databases on the shared server and drops them when it
stops. The lint rule `guards/no-own-test-server` rejects `new PostgreSqlContainer` and a `GenericContainer` of a
PostgreSQL or Valkey image outside the hosts that need servers of their own: `IsolatedPostgresServer` (persistence
test utilities), `RegionServers` and `DedicatedValkeyHost`. A suite that uses one changes server-level state (roles,
publications, replication slots, two instances or two regions), carries `@isolated-server` in its header and is
listed in `backend/isolated-server-suites.json`; `.claude/guards/__tests__/isolated-servers.test.mjs` checks both.

```ts
describe('OrderRepository', () => {
  let db: ShardedTestDatabase;
  let valkey: ValkeyTestServer;
  let repository: OrderRepository;

  beforeAll(async () => {
    db = new ShardedTestDatabase({
      shard: OrderDatabaseSets.shard,
      catalog: OrderDatabaseSets.catalog,
    });
    await db.start();
    await db.migrate();
    valkey = new ValkeyTestServer('orders');
    await valkey.start();
    repository = new OrderRepository(
      db.kitFor(new PersistenceFeature({ key: ShardKey.Tenant })),
      new OrderMapper(),
    );
  });

  afterAll(async () => {
    await valkey.stop();
    await db.stop();
  });

  it('stores an order only in the shard of its tenant', async () => {
    const order = anOrder();
    await db.inTenant(ShardedTestDatabase.TENANT_A, () =>
      repository.save(order),
    );

    const other = await db.inTenant(ShardedTestDatabase.TENANT_B, () =>
      repository.findById(order.id),
    );
    expect(other).toBeUndefined();
  });
});
```

- `ShardedTestDatabase.start()` creates two shards and a catalog on the shared server; `migrate()` clones template
  databases that `TestDatabaseServer.cloneFromTemplates` migrated once per run for the same migrations, so a suite
  pays a clone, not a full migration.
- A second instance alive in the same suite takes a `namespace`; a service app uses `ServiceTestApp` and its
  `ServicePostgresServer`, which follow the same rules.
- `ValkeyTestServer` connects to the shared Valkey; the first one of a suite empties it. A test that needs two Valkey
  servers that do not see each other, such as two regions, passes a `DedicatedValkeyHost`.
- `SharedTestServers` in `@platform/kernel/test-utils` reads the shared servers and throws when a suite runs outside
  the preset.
- The shared images match production; never `synchronize`: the schema comes from the migrations.
- LocalStack for SNS and SQS is declared from the same topology the app uses.

## Contract

- Producer: the event the mapper builds conforms to the published zod schema.
- Consumer: the consumer processes the contract's valid examples and rejects the invalid ones.
- Compatibility: examples from the previous version still pass the schema (additive changes only).
- Front: a test verifies that the generated Dart matches the schemas (see CLAUDE.md).

## E2E

A few critical flows (sign-up, login, a saga flow) against the packaged app in `backend/dist/<app>` and docker-compose. Each flow creates its own tenant. They do not duplicate what component tests already cover.
