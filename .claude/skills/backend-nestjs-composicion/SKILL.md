---
name: backend-nestjs-composicion
description: Cómo se compone una app NestJS en node_template. Módulos como raíz de composición, tokens de inyección para puertos, casos de uso, comandos, controllers delgados, validación con zod, fachadas, ciclo de vida y apagado ordenado. Úsala al crear módulos, providers, casos de uso, controllers o consumidores, o al cablear un puerto con su adaptador.
paths:
  - 'backend/apps/**'
  - 'backend/libs/platform/http/**'
  - 'backend/libs/platform/service/**'
---

# Composición con NestJS

NestJS es un detalle de `presentation/` y de la raíz de composición. El dominio y los casos de uso no saben que existe.

## Módulo = raíz de composición

- Un módulo por módulo de negocio, en `presentation/<nombre>.module.ts`. Es el único lugar que une puerto con adaptador.
- `providers` lista casos de uso, adaptadores y servicios. `exports` lista solo la fachada y los tokens que otros módulos pueden usar.
- Los módulos importan módulos, nunca providers sueltos de otro módulo. Nada de `forwardRef`: una dependencia circular es un error de diseño, se resuelve con un evento o moviendo la responsabilidad.
- `@Global()` solo para plataforma (config, logger, reloj). Nunca para negocio.
- Providers con alcance por defecto (singleton). `Scope.REQUEST` está prohibido en negocio: baja el rendimiento y los hooks de ciclo de vida no se ejecutan. El contexto de la petición (tenant, traza) va en `AsyncLocalStorage` de plataforma.

## Tokens para puertos

Todo puerto es una clase abstracta sin decoradores: es el contrato y el token de inyección a la vez, y se inyecta por tipo, sin `@Inject`. El dominio no importa NestJS.

```ts
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}
```

```ts
@Module({
  providers: [
    SignInUseCase,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidV7IdGenerator },
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
```

Un `Symbol` solo cuando conviven varias instancias del mismo tipo: `SNS_CLIENT`, `SQS_CLIENT` o un filtro Bloom por nombre con `bloomFilterToken(name)`. Ahí el constructor lleva `@Inject`:

```ts
export enum UserBloomFilter {
  Emails = 'users.emails',
}

export class UsersEmailChecker {
  constructor(
    @Inject(bloomFilterToken(UserBloomFilter.Emails))
    private readonly emails: AsyncBloomFilter,
  ) {}
}
```

- Tokens de cadena sueltos están prohibidos. Los `Symbol` se exportan desde un solo archivo, junto al puerto.
- `useFactory` con `inject` cuando el adaptador necesita configuración o un cliente asíncrono. El factory solo arma, no tiene lógica.
- `Clock`, `IdGenerator`, `RandomSource` y `TransactionManager` del kernel y `LoggerPort` de observability son clases abstractas: se inyectan por tipo, sin `@Inject`.
- `useExisting` para un alias (una clase concreta que cumple dos puertos).
- `@Inject()` y `@Injectable()` solo en `infrastructure/`, `application/` (casos de uso) y `presentation/`. El dominio nunca los lleva.
- Un caso de uso lleva `@Injectable()`; es la única anotación del framework que se tolera en `application/`.

## Módulos de las librerías de plataforma

- Cada librería con cableado expone `@platform/<lib>/nest`. Su módulo se importa con `forRoot` o `forRootAsync` (generados con `ConfigurableModuleBuilder`) y con `forFeature` cuando el servicio registra algo suyo.
- `ConfigModule.forRoot({ schema })` recibe solo el esquema del servicio. Cada módulo de librería importa `ConfigModule.forFeature(section)` con su `ConfigSection`, así que el servicio no conoce variables ajenas.
- El adaptador lo elige el servicio pasando su tipo en la opción (`CacheModule.forRoot({ store: ValkeyCache })`). Un módulo del núcleo nunca importa un adaptador. Sin la opción se obtiene el modo local (`InMemoryCache`).

```ts
export interface CacheModuleOptions {
  /** Por defecto `InMemoryCache`, el modo local sin Valkey. */
  readonly store?: Type<CachePort>;
}
// en CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

| Módulo                   | Provee                                                                                                                                                                         | Hooks                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `ConfigModule`           | `AppConfig`                                                                                                                                                                    | ninguno                                               |
| `ObservabilityModule`    | `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`                                                                       | `OnApplicationShutdown` (flush de telemetría)         |
| `ResilienceModule`       | `ResilienceRegistry`; `forFeature({ name, policy })` agrega una política                                                                                                       | ninguno                                               |
| `CacheModule`            | `CachePort`, `SingleFlight`, `CacheAside` por espacio (`cacheAsideToken(namespace)`)                                                                                           | ninguno                                               |
| `RateLimitModule`        | `RateLimiter`, `RateLimitGuard`                                                                                                                                                | ninguno                                               |
| `BloomModule`            | `bloomFilterToken(name)` por `forFeature`, `BloomRebuildJob`                                                                                                                   | ninguno                                               |
| `SchedulingModule`       | `JobRunner`, `JobLock`                                                                                                                                                         | `OnApplicationBootstrap`, `BeforeApplicationShutdown` |
| `ShardingModule`         | `ShardRouter`, `DirectoryChangeSubscription`                                                                                                                                   | `OnModuleInit`, `OnModuleDestroy`                     |
| `MessagingModule`        | `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs                                                                                    | `OnApplicationBootstrap` (registro de consumidores)   |
| `InternalApiModule`      | `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs                                                                                                 | `OnApplicationBootstrap` (`assertComplete`)           |
| `PersistenceModule`      | `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`                                                                                   | `OnModuleDestroy` (cierra los `DataSource`)           |
| `PostgresPlatformModule` | `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`                                                                       | ninguno                                               |
| `SagaModule`             | `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definiciones])`                                                                                     | ninguno                                               |
| `AwsModule`              | `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `AwsMessagingNames`, `AwsErrorTranslator`                                                           | `OnModuleDestroy`                                     |
| `SqsConsumerModule`      | `SqsPoller`, `SqsDeliveryProcessor`, `SqsDeadLetterRedriver`; no es global                                                                                                     | `OnApplicationBootstrap`, `OnModuleDestroy`           |
| `ValkeyModule`           | `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator` | `OnModuleDestroy` (`quit`)                            |

```ts
@Module({
  imports: [
    // Configuración propia del servicio. Las librerías traen sus secciones.
    ConfigModule.forRoot({ env: process.env }),

    ObservabilityModule.forRoot({ telemetry }),
    ResilienceModule.forRoot(),
    SchedulingModule.forRoot({
      mode: SchedulingMode.InProcess,
      logger: LoggerPort,
      metrics: MetricsPort,
    }),

    // Adaptadores de infraestructura.
    ValkeyModule.forRoot({ connectionName: SERVICE_NAME }),
    AwsModule.forRoot({
      messaging: { topology: identityTopology, source: SERVICE_NAME },
    }),
    PersistenceModule.forRoot({
      shard: { entities: shardEntities, migrations: shardMigrations },
      catalog: {
        entities: platformCatalogEntities,
        migrations: platformCatalogMigrations,
      },
      shardLister: DirectoryShardLister,
    }),
    PostgresPlatformModule.forRoot(),

    // Núcleo, con el adaptador elegido por `Type<Port>`.
    ShardingModule.forRoot({
      routingCache: ValkeyRoutingCache,
      channel: ValkeyShardDirectoryChannel,
      directory: TypeOrmDirectoryStore,
    }),
    CacheModule.forRoot({ store: ValkeyCache, metrics: MetricsPort }),
    RateLimitModule.forRoot({
      limiter: ValkeyRateLimiter,
      degradeLocally: true,
    }),
    MessagingModule.forRoot({
      source: SERVICE_NAME,
      consumer: QueueName.Orders,
      topology: identityTopology,
      outboxStore: TypeOrmOutboxStore,
      processedStore: TypeOrmProcessedMessageStore,
      publisher: SnsSqsEnvelopePublisher,
      bus: SnsSqsMessageBus,
      relay: true, // registra OutboxRelayJob y las retenciones
      relayScopes: ShardedRelayScopes,
    }),
    // No es global: se destruye antes que AwsModule y detiene el sondeo antes de cerrar los clientes.
    SqsConsumerModule.forRoot({
      topology: identityTopology,
      queue: QueueName.Orders,
    }),
    InternalApiModule.forRoot({
      operations: identityOperations,
      transport: InternalTransportKind.Http,
      processedStore: TypeOrmIdempotencyStore,
    }),
    SagaPostgresModule,
    SagaModule.forRoot({
      store: TypeOrmSagaStore,
      scopes: ShardedSagaScopes,
    }),

    // Módulos de negocio.
    UsersModule,
  ],
})
export class AppModule {}
```

Sin Valkey (modo local con una sola instancia), el servicio omite `ValkeyModule` y deja `CacheModule.forRoot()` y `RateLimitModule.forRoot()` sin opciones: usan `InMemoryCache` e `InMemoryRateLimiter`, y `ShardingModule` usa `NullRoutingCache` e `InProcessDirectoryChannel`. Los jobs exclusivos usan `InProcessJobLock`.

## Casos de uso y comandos

- Una clase por caso de uso, método `execute(command)`, nombre de verbo (`SignInUseCase`). Implementa `UseCase<TInput, TOutput>` del kernel.
- Orquesta: valida permisos, carga agregados, invoca al dominio, guarda, publica eventos con `MessageBus`, devuelve un DTO mínimo (un id o un resultado, no el agregado).
- No contiene reglas de negocio. Si una condición decide el negocio, va en el agregado o en un servicio de dominio.
- Un caso de uso no llama a otro caso de uso. Si dos comparten un paso, es un servicio de aplicación o un evento.
- El comando es una clase de datos inmutable en `application/`, distinta del DTO HTTP. El controller traduce uno al otro.
- Las consultas (lecturas) tienen su propia clase `*Query` y manejador, y no abren transacción de escritura.
- La transacción la abre el caso de uso con `TransactionManager.runInTransaction`. Nunca el controller.

```ts
@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserCommand,
  RegisterUserResult
> {
  constructor(
    private readonly users: UserRepository,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email);
    return this.transactions.runInTransaction(async () => {
      if (await this.users.findByEmail(email)) {
        throw new EmailAlreadyRegisteredError();
      }
      const user = User.register({
        id: this.ids.next(),
        email,
        now: this.clock.now(),
        eventId: this.ids.next(),
      });
      await this.users.save(user);
      await this.bus.publish(UserRegisteredV1, { userId: user.id.value });
      return { userId: user.id.value };
    });
  }
}
```

## Controllers y consumidores

- Delgados: validan la entrada con el esquema zod del contrato, arman el comando, llaman al caso de uso, arman la respuesta. Sin reglas, sin acceso a repositorios, sin `try/catch` de negocio.
- La validación usa un `ZodValidationPipe` de plataforma con el esquema de `@contracts/<servicio>`. No se duplica el esquema con `class-validator`.
- La respuesta se arma explícita con los campos permitidos (lista blanca). Nunca se devuelve una entidad ORM ni un agregado.
- Un controller por tipo de disparador: HTTP, mensaje (`@Subscribe`), job.
- Los errores no se atrapan aquí. Los traduce el filtro global (ver `backend-errores`).
- Autorización por guard y decorador con enum de permisos (ver `backend-seguridad`).
- Los consumidores son clases con métodos `@Subscribe` y los handlers de la API interna clases con `@InternalHandler`; los descubren `MessagingExplorer` y `InternalApiModule`, no se registran a mano.
- Las tareas periódicas son providers que extienden `ScheduledJob`; `SchedulingModule` los descubre sin que el módulo de negocio lo importe.

## Fachadas

Un módulo se comunica con otro por su fachada (`UsersFacade`) o por eventos. La fachada expone métodos pequeños con DTO propios, no agregados ni entidades. Si el otro módulo está en otro servicio, es un cliente de la API interna con contrato.

## Ciclo de vida y apagado

- `main.ts` importa primero `./instrumentation.js`, que llama a `TelemetryBootstrap.start(process.env)` de `@platform/observability/setup`, y después crea la app con NestJS y llama `app.enableShutdownHooks()`.
- Nest 12 apaga en este orden: todos los `onModuleDestroy`, luego `beforeApplicationShutdown` y al final `onApplicationShutdown`. Por eso lo que genera trabajo (`JobRunner`, `SqsPoller`, suscripciones) se detiene en `onModuleDestroy`, y los módulos que cierran recursos (clientes SNS y SQS, Valkey con `quit`, `DataSource`) son globales y se importan antes en `AppModule`, para que su `onModuleDestroy` corra después: Nest destruye los módulos en orden inverso al de importación. `SqsPoller` vive en `SqsConsumerModule`, que no es global, para cerrarse antes que `AwsModule`, que solo implementa `OnModuleDestroy`. `onApplicationShutdown` vacía la telemetría.
- `onApplicationBootstrap` corre cuando todos los módulos ya iniciaron: ahí van las validaciones cruzadas (`InternalApiModule` llama `assertComplete`, `MessagingExplorer` registra los consumidores).
- La salud la reúne `HealthRegistry` de observability: cada adaptador de red implementa `HealthCheckable` del kernel y se registra en su `onModuleInit`.
- Los hooks de inicio son asíncronos y fallan fuerte: si la config o la base no están, el proceso no arranca.
- `app.close()` no termina el proceso: sin temporizadores colgados.
- Un módulo no hace trabajo al importarse el archivo. Todo ocurre en hooks.

## Verificación de arranque

```
- [ ] Cada puerto inyectado tiene su provider en el módulo o en su módulo de librería
- [ ] Los adaptadores se pasan como tipo en las opciones de cada módulo de librería
- [ ] Ningún provider de negocio es global ni de alcance de petición
- [ ] exports solo con fachada y tokens públicos
- [ ] enableShutdownHooks activo
- [ ] La app arranca con NEST_DEBUG=true sin dependencias sin resolver
```
