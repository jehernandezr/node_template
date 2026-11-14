# Recetas por capa

## Contenido

- Dominio
- Caso de uso con fakes
- Módulo NestJS con TestingModule
- Componente con supertest
- Testcontainers
- Contrato
- E2E

## Dominio

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

## Caso de uso con fakes

Se construye con `new` en la prueba. Sin NestJS: el caso de uso no lo necesita.

```ts
const users = new InMemoryUserRepository();
const outbox = new RecordingOutbox();
const useCase = new RegisterUserUseCase(
  users,
  new InlineTransactionManager(),
  outbox,
  new SequentialIdGenerator(),
  new FixedClock(new Date('2026-01-01T00:00:00Z')),
);
```

## Módulo NestJS con TestingModule

Para verificar el cableado (tokens, exports) y reemplazar un adaptador por un fake. `compile()` es asíncrono.

```ts
const moduleRef = await Test.createTestingModule({ imports: [UsersModule] })
  .overrideProvider(PASSWORD_HASHER)
  .useClass(FastTestHasher)
  .overrideProvider(CLOCK)
  .useValue(new FixedClock(now))
  .compile();

const useCase = moduleRef.get(SignInUseCase);
```

- Guards globales con `APP_GUARD` se registran con `useExisting` para poder reemplazarlos con `overrideProvider`.
- Un `useMocker` automático oculta dependencias faltantes: se evita en pruebas de cableado.
- Un `app.close()` en `afterAll`, para liberar pools y conexiones.

## Componente con supertest

```ts
const app = moduleRef.createNestApplication();
await app.init();

const response = await request(app.getHttpServer())
  .post('/users')
  .send({ email: 'ana@example.com', password: aValidPassword() })
  .expect(201);

expect(response.body).toEqual({ userId: expect.any(String) });
```

Se verifican también: 400 con `application/problem+json` y `code` ante entrada inválida, 401 sin token, 403 sin permiso y 404 ante recurso de otro tenant.

## Testcontainers

Una clase de soporte por tecnología en `src/__tests__/utils/`:

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

- Versión de la imagen igual a la de producción.
- `synchronize` nunca: el esquema sale de las migraciones.
- LocalStack para SNS y SQS, `valkey/valkey` para Valkey. Se declaran por la misma topología que usa la app.
- Se reutiliza un contenedor por proyecto de Jest (`globalSetup`) cuando el arranque pesa, con esquema o tenant por suite.

## Contrato

- Productor: el evento que construye el mapper cumple el esquema zod publicado.
- Consumidor: el consumidor procesa los ejemplos válidos del contrato y rechaza los inválidos.
- Compatibilidad: ejemplos de la versión anterior siguen pasando el esquema (cambios solo aditivos).
- Front: una prueba verifica que el Dart generado coincide con los esquemas (ver CLAUDE.md).

## E2E

Pocos flujos críticos (alta, login, un flujo de saga) contra la app empaquetada de `backend/dist/<app>` y docker-compose. Cada flujo crea su tenant. No duplican lo que ya cubren las pruebas de componente.
