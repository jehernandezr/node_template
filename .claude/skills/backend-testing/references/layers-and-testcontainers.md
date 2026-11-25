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

One support class per technology in `src/__tests__/utils/`:

```ts
export class PostgresTestDatabase {
  private container?: StartedPostgreSqlContainer;
  dataSource!: DataSource;

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer('postgres:17').start();
    this.dataSource = new DataSource({
      type: 'postgres',
      url: this.container.getConnectionUri(),
      entities: shardEntities,
      migrations: shardMigrations,
      migrationsTransactionMode: 'each',
      synchronize: false,
    });
    await this.dataSource.initialize();
    await this.dataSource.runMigrations();
  }

  async stop(): Promise<void> {
    await this.dataSource?.destroy();
    await this.container?.stop();
  }
}
```

- Image version equal to production.
- Never `synchronize`: the schema comes from the migrations.
- LocalStack for SNS and SQS, `valkey/valkey` for Valkey. They are declared from the same topology the app uses.
- Reuse one container per Jest project (`globalSetup`) when startup is heavy, with a schema or tenant per suite.

## Contract

- Producer: the event the mapper builds conforms to the published zod schema.
- Consumer: the consumer processes the contract's valid examples and rejects the invalid ones.
- Compatibility: examples from the previous version still pass the schema (additive changes only).
- Front: a test verifies that the generated Dart matches the schemas (see CLAUDE.md).

## E2E

A few critical flows (sign-up, login, a saga flow) against the packaged app in `backend/dist/<app>` and docker-compose. Each flow creates its own tenant. They do not duplicate what component tests already cover.
