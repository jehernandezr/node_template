# Plan de solución de la revisión del backend

- Estado: Aprobado por el usuario
- Fecha: 2026-11-14
- Fuente: [revisión del backend](../audits/2026-11-14-revision-backend.md)
- Diseños que se integran sin rediseñar: [persistencia TypeORM y sagas](../design/persistencia-typeorm-y-sagas.md) y, como consumidor, [F4 identity](../design/f4-identity.md)
- Orden de las olas junto al front y a F4, estado de cada paquete y forma de trabajo de las tropas: [plan](README.md)
- Rutas relativas a la raíz del repositorio salvo que diga lo contrario. Esfuerzo: S (menos de medio día), M (uno a tres días), L (más de tres días).

## 0. Resumen

El plan cierra los hallazgos en cinco oleadas de tres paquetes, una tropa por paquete. La ola 0 fija las fundaciones, la 1 a la 3 rehacen las librerías por capas de dependencia y la 4 cierra la base y arranca F4 sobre ella.

| Ola | Resultado                                                                       |
| --- | ------------------------------------------------------------------------------- |
| 0   | Kernel y primitives nuevos, alias y dependencias de todo el plan, reglas nuevas |
| 1   | Módulos de NestJS del núcleo, runner de jobs, `ShardRouter` dividido            |
| 2   | Outbox y consumidores operables, transporte HTTP, capa TypeORM con sharding     |
| 3   | Stores TypeORM, adaptadores con módulo, sagas persistentes                      |
| 4   | Catálogo limpio, humo de plataforma, F4 arranca                                 |

Los paquetes de cada ola están en el [plan](README.md#orden-de-ejecución-por-olas) y su ficha en la sección 3.

Todo lo que hoy llama a las librerías son pruebas: `backend/apps` todavía no existe. Por eso los cambios que rompen API son baratos ahora y caros después de F4. Ese es el motivo del orden.

## 1. Verificación de los hallazgos

Cada hallazgo se contrastó con el código antes de planear. Lo comprobado directamente:

- T1: no hay `@Module`, `@Injectable` ni `@nestjs/*` en `backend/libs`, y `backend/package.json` solo trae `@opentelemetry/instrumentation-nestjs-core`. Se sostiene.
- T2: existen `CacheErrorCode`, `ConfigErrorCode`, `ShardingErrorCode`, `BloomErrorCode`, `ValkeyErrorCode` y `CriteriaErrorCode`, además de `PlatformErrorCode`. Se sostiene.
- KRN-1: `kernel/src/invalid-id.error.ts` importa `@contracts/platform`. Se sostiene.
- CFG-2 y OBS: `observability/src/logger.ts` importa `LogLevel` de `@platform/config`, y `telemetry.ts` importa `BaseConfig`. Se sostiene.
- MSG-1: `relayOnce` solo aparece en un comentario de `outbox-message-bus.ts`; `purgeCompleted` y `SagaRecoveryJob.runOnce` no tienen quien los llame. Se sostiene.
- T4: `Math.random` por defecto en cache, internal-api, observability, primitives, resilience y saga, más `randomUUID` y `randomBytes` en cache y observability. Se sostiene.
- T5: `messaging/src/index.ts`, `saga/src/index.ts` y `sharding/src/index.ts` exportan los `InMemory*`. Se sostiene.
- T9: `jest.preset.js` toma `*.?(int-)spec.ts`, así que `*.integration.spec.ts` corre como unitaria. Se sostiene.
- SHD-5: `MAX_TENANT_ID_LENGTH` vale 64 en el router y 128 en internal-api y en el sobre de messaging. Se sostiene.
- MSG-5: hay tres `@deprecated` vivos (`LegacyBackoffOptions`, `newId`, `now`). Se sostiene.
- MSG-7 y CTR-3: dos patrones de nombre de mensajería y dos de código de error, con expresiones distintas. Se sostiene.
- RES-1: el único consumidor de `ResiliencePolicyName` fuera de resilience es cache (`Cache`). Se sostiene.
- UTL-1: nadie importa `@shared/utils`. Se sostiene.
- INT-1: `InProcessTransport` es la única clase `Transport`. Se sostiene.
- KRN-3: `result.ts` se exporta desde el kernel y ningún otro archivo usa `ok`, `err`, `isOk` ni `isErr`. Se sostiene.
- `check-structure.mjs --all` reporta 97 incumplimientos hoy, como dice el informe.

Hallazgos que no se sostienen o se ajustan:

| Id    | Decisión                  | Motivo                                                                                                                                                                                                                                                                                |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTR-4 | Descartado                | El informe mismo concluye que `new Date(...)` en `define-route.ts` es parseo, no lectura del reloj.                                                                                                                                                                                   |
| CFG-5 | Fuera del plan            | `SecretsProvider` con Secrets Manager no corrige un defecto: es una función nueva sin consumidor hoy. Entra cuando F12 la pida. Solo se atiende la parte de `Secret` con campo privado (CFG-4).                                                                                       |
| VLK-4 | Fuera del plan            | El propio informe lo marca como decisión de producto.                                                                                                                                                                                                                                 |
| MSG-4 | Diferido                  | Borrar el DSL de topología rompe unas 36 pruebas y el valor es de limpieza, no de corrección. Solo se resuelve el choque de patrones de nombre (MSG-7).                                                                                                                               |
| KRN-3 | Ajustado                  | El informe propone un solo `ERROR_CODE_PATTERN` en el kernel. La regla de límites de Nx impide que `type:contracts` dependa del kernel. Se resuelve con dos reglas y una prueba de consistencia (decisión D2).                                                                        |
| OBS-3 | Corregido                 | Mover el arranque de OpenTelemetry a `ObservabilityModule` rompe la instrumentación automática, que debe parchear antes de importar `http`, `pg` e `iovalkey`. Se conserva `@platform/observability/setup` como arranque temprano y el módulo solo gobierna el apagado (decisión D3). |
| AWS-3 | Resuelto la contradicción | El informe dice a la vez que `elasticache-iam-auth` pertenece a Valkey y que debe quedarse en aws. Se queda en `adapters/aws` (único lugar con `@aws-sdk`) y `ValkeyModule` lo recibe por token opcional.                                                                             |
| PRM-1 | Ajustado                  | Los puertos de transacción e idempotencia van a `kernel/src/ports/`, no a una carpeta nueva de primitives, para que el dominio y persistence los importen sin pasar por primitives.                                                                                                   |
| BLO-1 | Ajustado                  | El informe duda entre programar `rebuildCron` o borrarlo. Se programa: existe `ScheduledJob` (D4), así que el campo tiene consumidor.                                                                                                                                                 |
| T2    | Ajustado                  | El informe pide limpiar el catálogo central a la vez que cada librería migra. Eso obliga a varias tropas a editar el mismo archivo. Cada librería declara su catálogo en su ola y una sola tropa limpia el central en la ola 4 (WP-13).                                               |

## 2. Decisiones de diseño

Las firmas son el contrato que la guía de cada tropa fija como esqueleto antes de repartir. Los tipos de dominio que ya existen (`MessageEnvelope`, `Placement`, `CallOutcome`) conservan su forma actual; los nombres de colaboradores nuevos son propuestas que la guía puede afinar si no cambian la API pública.

### D1. Fundaciones (`@platform/kernel` y `@platform/primitives`)

**Regla de puertos.** Todo puerto es una clase abstracta sin decoradores. La clase es su propio token de inyección y el dominio no importa NestJS. Solo se usa `Symbol` cuando conviven varias instancias del mismo tipo (`SNS_CLIENT`, `SQS_CLIENT`, un filtro Bloom por nombre).

Convertir una interfaz en clase abstracta no rompe a quien la implementa ni a los dobles hechos con objetos literales, siempre que la clase solo tenga miembros abstractos. Por eso `Clock`, `IdGenerator`, `TransactionManager` e `IdempotencyStore` se convierten sin cambiar sus miembros.

```ts
// @platform/kernel
export abstract class Clock {
  abstract now(): Date;
}
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export abstract class RandomSource {
  /** Valor en [0, 1). */
  abstract next(): number;
  abstract bytes(length: number): Uint8Array;
}
export class SystemRandomSource extends RandomSource {
  next(): number {
    return Math.random();
  }
  bytes(length: number): Uint8Array {
    return randomBytes(length);
  }
}

export abstract class IdGenerator {
  abstract next(): Id;
}
export class UuidV7IdGenerator extends IdGenerator {
  constructor(private readonly clock: Clock) {
    super();
  }
  next(): Id {
    /* ... usa this.clock.now().getTime() ... */
  }
}
```

`RandomSource` cierra T4. Las siete opciones `random?: () => number` y los `randomUUID` directos desaparecen. Los tokens de `VersionedKeyspace` salen de `IdGenerator`; los ids de span salen de `RandomSource.bytes(8)`.

**Guardas (T7).** Una clase con el error como colaborador, para que cada librería siga lanzando su propio tipo:

```ts
export type GuardFailure = (message: string) => Error;

export class Guard {
  static readonly default = new Guard();
  constructor(
    private readonly fail: GuardFailure = (m) => new InvalidArgumentError(m),
  ) {}
  positiveInteger(name: string, value: number): number;
  nonNegativeInteger(name: string, value: number): number;
  nonNegativeFinite(name: string, value: number): number;
  integerInRange(name: string, value: number, min: number, max: number): number;
  nonEmpty(name: string, value: string): string;
  matches(name: string, value: string, pattern: RegExp): string;
}

// En una librería:
private readonly guard = new Guard(
  (message) => new CacheError(CacheErrorCode.InvalidOptions, message),
);
```

Reemplaza `assertNonNegativeFinite`, `assertBudget`, `assertCapacity`, `assertTtl`, `assertLease`, `assertPositiveInteger`, `assertFinite`, `assertIntegerInRange`, `isPositiveInt` y `assertIdentifier`. Los valores devueltos permiten validar en la asignación.

**Descripción de errores (T7, OBS-5).**

```ts
export interface ErrorDescription {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
}

export class ErrorDescriptor {
  static describe(error: unknown): ErrorDescription;
  static codeOf(error: unknown): string | undefined;
}
```

`codeOf` solo devuelve el código si cumple `ErrorCode.isValid`. Sustituye `describeError` (resilience y messaging), `codeOf` (field-errors y message-dispatcher), `reasonOf` y la extracción de `errorMetricAttributes` y `recordSpanError`. Es estática porque no tiene estado ni dependencias.

**Errores (KRN-2).** `PlatformError` calcula `failureKind` en el constructor y se borra el `abstract readonly failureKind` de cada subclase:

```ts
export interface PlatformErrorOptions {
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  /** Por defecto: Transient si retryable, Permanent si no. */
  readonly failureKind?: FailureKind;
}

export abstract class PlatformError extends Error {
  abstract readonly code: string;
  readonly failureKind: FailureKind;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  protected constructor(message: string, options?: PlatformErrorOptions);
  static is(value: unknown): value is PlatformError;
}

export class ErrorCode {
  static readonly PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;
  static isValid(value: unknown): value is string;
}
```

`DomainError` pasa `failureKind` a `super` y deja de calcularlo. `isErrorCode` e `isPlatformError` se vuelven `ErrorCode.isValid` y `PlatformError.is`. `KernelErrorCode.InvalidId` sustituye al `PlatformErrorCode` en `InvalidIdError`, y el kernel deja de importar `@contracts/platform` (KRN-1).

**Puertos que se mudan al kernel (PRM-1).** `kernel/src/ports/transaction/` recibe `TransactionManager`, `UnitOfWork`, `TransactionHook`, `TransactionOptions` e `IsolationLevel`. `kernel/src/ports/idempotency/` recibe `IdempotencyStore`, `ClaimState`, `ClaimRequest`, `ClaimResult`, `AcquiredClaim`, `InProgressClaim` y `CompletedClaim`. `primitives` los reexporta con `@deprecated` hasta la ola 4 (WP-13) y persistence borra su copia de `IsolationLevel` en WP-09.

Además se agregan al kernel, junto a los puertos:

```ts
export abstract class PurgeableStore {
  /** Borra lo terminado antes de `before`. Devuelve cuántos registros eliminó. */
  abstract purgeCompleted(before: Date): Promise<number>;
}

export enum HealthState {
  Up = 'up',
  Degraded = 'degraded',
  Down = 'down',
}
export interface HealthReport {
  readonly state: HealthState;
  readonly detail?: string;
}
export abstract class HealthCheckable {
  abstract readonly name: string;
  abstract check(signal?: AbortSignal): Promise<HealthReport>;
}

/** Valor de objeto de un tenant. Una sola longitud máxima para toda la plataforma (SHD-5). */
export class TenantId extends ValueObject<{ value: string }> {
  static readonly MAX_LENGTH = 128;
  static from(raw: string): TenantId;
  get value(): string;
}
```

`Result` del kernel se borra (KRN-3): ninguna librería lo usa y `CallOutcome` cubre el caso. `Id` queda; el `IdTransformer` de columnas `uuid` lo trae WP-09. `Money` se mueve de `shared/utils` al kernel como `ValueObject` (`Money.of(amountMinor, currency)`, `add`, `subtract`, `multiply`, `allocate`, `compareTo`, `format`) y `libs/shared/utils` se elimina.

**Primitives como cálculo puro (PRM-2, T3).**

```ts
export class RetryPolicy {
  constructor(
    readonly maxAttempts: number,
    readonly baseMs: number,
    readonly maxMs: number,
    readonly strategy: BackoffStrategy,
  );
  static readonly none: RetryPolicy;
}

export class Backoff {
  constructor(policy: RetryPolicy, random: RandomSource);
  delay(attempt: number): number;
}

export class Deadline {
  constructor(budgetMs: number, clock: Clock);
  remainingMs(): number;
  /** Corre `work` con el plazo; aborta con `signal` o al vencer. */
  race<T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T>;
  /** Espera una promesa ya creada con el plazo. */
  wait<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T>;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export class FailureClassifier {
  constructor(rules?: readonly FailureRule[]);
  classify(error: unknown): FailureKind;
  isTransient(error: unknown): boolean;
}
export class RetryAfterParser {
  constructor(clock: Clock);
  parse(header: string | undefined): number | undefined;
}
export class CanonicalJson {
  static canonicalize(value: unknown): unknown;
  static stringify(value: unknown): string;
  static digest(value: unknown): string;
}
export class Hashes {
  static fnv1a32(text: string): number;
  static fnv1a32Hex(text: string): string;
}
```

Una sola `RetryPolicy` sustituye a las cuatro formas actuales (`RetryPolicy` de internal-api y de messaging, `ResilienceRetryConfig`, `OperationRetryPolicy`). Cada librería la reutiliza en su ola. `Deadline` absorbe `raceDeadline`, `abortableSleep`, `armTimer`, `wait.ts` de cache y `LookupBudget`, y usa el `Clock` en lugar de `Date.now()`. `MAX_TIMER_MS` queda en un solo sitio.

**ContainerRuntime (T6).** En `@platform/kernel/test-utils`:

```ts
export enum IntegrationMode {
  Skip = 'skip',
  Require = 'require',
}

export class ContainerRuntime {
  constructor(env: Readonly<Record<string, string | undefined>>);
  /** Valor de INTEGRATION_TESTS. Por defecto Skip fuera de CI. */
  get mode(): IntegrationMode;
  isAvailable(): Promise<boolean>;
  /** `describe` que se omite sin Docker en modo Skip y falla en modo Require. */
  describeIfAvailable(name: string, body: () => void): void;
}
```

Una sola variable, `INTEGRATION_TESTS=skip|require`, y se borran las cuatro copias y las banderas `POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION` y `VALKEY_INTEGRATION`. CI usa `require`.

### D2. Errores y catálogo por librería

- Cada librería tiene un solo enum de códigos, el suyo, con el formato `PLATFORM.<LIB>.<ERROR>`. Las que hoy usan `PlatformErrorCode` crean el propio en su ola y copian los mismos valores, así que ningún código observable cambia.
- Una clase de error por archivo, con el sufijo `Error` (`InvalidParametersError`, `CorruptedDataError`, `IncompatibleFiltersError`), que pasa su `code` y confía en `PlatformError` para `failureKind`.
- Cada librería declara su catálogo en `src/errors/<lib>-error-catalog.ts` con la fábrica declarativa que ya existe:

```ts
// @platform/cache/src/errors/cache-error-catalog.ts
export const cacheErrorCatalog = defineErrorCatalog(CacheErrorCode, {
  [CacheErrorCode.Unavailable]: internal(503, true, 'El caché no responde.'),
  [CacheErrorCode.ValueTooLarge]: internal(
    413,
    false,
    'El valor supera el máximo.',
  ),
});
```

- El kernel no depende de contracts, así que el catálogo de `KernelErrorCode` vive en `primitives`.
- `@contracts/platform` conserva solo los códigos transversales y públicos. El servicio compone su catálogo: `ErrorCatalogRegistry` (F4) y `defineServiceContract` reciben `platformErrorCatalog` más los de las librerías que usa. El contrato de plataforma deja de conocer `saga`, `bloom` o `valkey` (CTR-1).
- Patrón del código: se mantienen dos expresiones, `ErrorCode.PATTERN` en el kernel y `ERROR_CODE_PATTERN` en contracts, porque `type:contracts` no puede depender del kernel. Se unifican en valor (la del kernel) y una prueba en `primitives` recorre cada catálogo y comprueba que cada código cumple las dos.
- Orden de entrega: WP-01 deja la mecánica; cada librería migra su enum y declara su catálogo en su ola; WP-13 borra los códigos internos de `platform-error-code.enum.ts` y de `platform-error-catalog.ts`, el único cambio a esos archivos después de WP-01.

### D3. Módulos de NestJS por librería

**Sub-entrada.** Cada librería con cableado expone `@platform/<lib>/nest`, que apunta a `src/nest/index.ts`. El núcleo no importa `@nestjs/*`; una regla de ESLint (WP-03) lo comprueba: fuera de `src/nest/` no se importa `@nestjs/*` ni otra sub-entrada `/nest`. `domain/` ya tenía esa regla para el dominio.

**Convención.** Se usa `ConfigurableModuleBuilder` de `@nestjs/common`, que genera `forRoot` y `forRootAsync` sin código propio. `forFeature` se escribe a mano cuando el servicio registra algo suyo.

```ts
// @platform/cache/src/nest/cache.module-definition.ts
export const {
  ConfigurableModuleClass: CacheModuleClass,
  MODULE_OPTIONS_TOKEN: CACHE_OPTIONS,
} = new ConfigurableModuleBuilder<CacheModuleOptions>()
  .setClassMethodName('forRoot')
  .build();

// @platform/cache/src/nest/cache.module.ts
@Module({})
export class CacheModule extends CacheModuleClass {
  static forFeature(feature: CacheFeatureOptions): DynamicModule;
}
```

**Quién elige el adaptador.** Un módulo del núcleo nunca importa un adaptador (la dependencia iría al revés). La opción recibe el tipo del adaptador y el módulo lo liga al puerto:

```ts
export interface CacheModuleOptions {
  /** Por defecto `InMemoryCache`, el modo local sin Valkey. */
  readonly store?: Type<CachePort>;
}
// en CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

Igual para `RateLimitModule` (`limiter`, `degradeLocally`), `ShardingModule` (`routingCache`, `channel`, `directory`), `MessagingModule` (`outboxStore`, `processedStore`, `bus`, `publisher`), `InternalApiModule` (`processedStore`) y `SagaModule` (`store`). El adaptador exporta sus clases desde su módulo y la app las nombra. Sin Valkey, el servicio no pasa `store` y obtiene el modo local.

**Configuración.** `ConfigModule.forRoot({ schema })` recibe solo el esquema propio del servicio. Cada módulo de librería importa `ConfigModule.forFeature(section)` con su sección (`LoggingConfig`, `TelemetryConfig`, `DatabaseConfig`, `ValkeyConfig`, `AwsConfig`), así que el servicio no escribe `.extend(...)` ni conoce variables ajenas (CFG-1). Todo se valida al arrancar y falla listando todos los errores.

```ts
export class ConfigSection<T> {
  constructor(
    readonly name: string,
    readonly schema: z.ZodType<T>,
  ) {}
}
export abstract class AppConfig {
  abstract get<T>(section: ConfigSection<T>): T;
}
```

**Ciclo de vida.** Nest 12 llama primero todos los `onModuleDestroy`, luego `beforeApplicationShutdown` y al final `onApplicationShutdown` (verificado en la ola 1):

1. `onModuleDestroy` de los que generan trabajo (`JobRunner`, `SqsPoller`, suscripciones de Pub/Sub): se detienen primero porque sus módulos se importan después en `AppModule` (Nest destruye en orden inverso al de importación).
2. `onModuleDestroy` de los recursos (`SNSClient`, `SQSClient`, cliente de Valkey con `quit`, `DataSource` de TypeORM), en módulos globales importados antes: `ValkeyModule`, `AwsModule` y `PersistenceModule` van antes que `SchedulingModule` y los consumidores.
3. `onApplicationShutdown`: se vacía la telemetría.

**Salud.** `HealthRegistry` vive en observability (`register(check: HealthCheckable)`, `checkAll()`). Cada adaptador de red se registra en su `onModuleInit`. Los endpoints `/health/live` y `/health/ready` los monta F4 en `@platform/http` sobre `HealthRegistry`.

| Librería          | Módulo                   | Provee (token)                                                                                                                                                                 | Hooks                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| config            | `ConfigModule`           | `AppConfig`                                                                                                                                                                    | ninguno                                               |
| observability     | `ObservabilityModule`    | `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`                                                                       | `OnApplicationShutdown` (flush de telemetría)         |
| resilience        | `ResilienceModule`       | `ResilienceRegistry`; `forFeature({ name, policy })` agrega una política                                                                                                       | ninguno                                               |
| cache             | `CacheModule`            | `CachePort`, `SingleFlight`, `CacheAside` por espacio (`cacheAsideToken(namespace)`)                                                                                           | ninguno                                               |
| rate-limit        | `RateLimitModule`        | `RateLimiter`, `RateLimitGuard`                                                                                                                                                | ninguno                                               |
| bloom             | `BloomModule`            | `bloomFilterToken(name)` por `forFeature`, `BloomRebuildJob`                                                                                                                   | ninguno                                               |
| scheduling        | `SchedulingModule`       | `JobRunner`, `JobLock`                                                                                                                                                         | `OnApplicationBootstrap`, `BeforeApplicationShutdown` |
| sharding          | `ShardingModule`         | `ShardRouter`, `DirectoryChangeSubscription`                                                                                                                                   | `OnModuleInit`, `OnModuleDestroy`                     |
| messaging         | `MessagingModule`        | `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs                                                                                    | `OnApplicationBootstrap` (registro de consumidores)   |
| internal-api      | `InternalApiModule`      | `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs                                                                                                 | `OnApplicationBootstrap` (`assertComplete`)           |
| persistence       | `PersistenceModule`      | `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`                                                                                   | `OnModuleDestroy` (cierra los `DataSource`)           |
| adapters-postgres | `PostgresPlatformModule` | `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`                                                                       | ninguno                                               |
| saga              | `SagaModule`             | `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definiciones])`                                                                                     | ninguno                                               |
| adapters-aws      | `AwsModule`              | `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `SqsPoller`                                                                                         | `OnModuleDestroy`, `BeforeApplicationShutdown`        |
| adapters-valkey   | `ValkeyModule`           | `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator` | `OnModuleDestroy` (`quit`)                            |

La telemetría se arranca temprano, fuera de Nest (corrección de OBS-3):

```ts
// instrumentation.ts, primera importación de main.ts
import { TelemetryBootstrap } from '@platform/observability/setup';
export const telemetry = TelemetryBootstrap.start(process.env);

// ObservabilityModule provee { provide: TELEMETRY, useValue: telemetry } y, al apagar, llama a shutdown().
```

### D4. Quién programa los jobs: `ScheduledJob` y un runner

Hoy hay cuatro piezas con método `runOnce` o `purge` sin programador: relay del outbox, purga de idempotencia y outbox, `SagaRecoveryJob` y reconstrucción de Bloom. F4 propone un `IntervalJob` provisional y un `OutboxRelayWorker`. Se reemplazan por una sola mecánica.

**El contrato vive en el kernel** (`kernel/src/ports/scheduling/`), para que cada librería declare sus jobs sin depender del runner ni de NestJS:

```ts
export enum JobScheduleKind {
  Interval = 'interval',
  Cron = 'cron',
}
export type JobSchedule =
  | {
      readonly kind: JobScheduleKind.Interval;
      readonly everyMs: number;
      readonly jitterRatio?: number;
    }
  | { readonly kind: JobScheduleKind.Cron; readonly expression: string }; // UTC, 5 o 6 campos

export interface JobContext {
  readonly signal: AbortSignal;
  readonly startedAt: Date;
  readonly runId: string;
}

export abstract class ScheduledJob {
  /** Valor de un enum de la librería dueña, por ejemplo `MessagingJob.OutboxRelay`. */
  abstract readonly name: string;
  abstract readonly schedule: JobSchedule;
  /** true: un solo proceso del clúster la corre a la vez, con `JobLock`. */
  readonly exclusive: boolean = false;
  readonly timeoutMs: number = 60_000;
  abstract run(context: JobContext): Promise<void>;
}

export abstract class JobLock {
  abstract tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined>;
  abstract release(lease: JobLease): Promise<void>;
}
export interface JobLease {
  readonly name: string;
  readonly token: string;
}
```

**El runner vive en `@platform/scheduling`** (librería nueva, `type:platform`, depende de kernel, primitives y observability):

```ts
export class JobRunner {
  constructor(
    clock: Clock,
    random: RandomSource,
    lock: JobLock,
    logger: LoggerPort,
    metrics: MetricsPort,
  );
  register(job: ScheduledJob): void;
  start(): void;
  /** Espera los jobs en curso hasta `graceMs` y aborta su `signal`. */
  stop(graceMs: number): Promise<void>;
  /** Corre ya una vez. Lo usan las pruebas, los despertares y la invocación externa. */
  runNow(name: string): Promise<void>;
  /** Pide una corrida pronto, sin duplicar una en curso. */
  trigger(name: string): void;
}

export class CronExpression {
  static parse(expression: string): CronExpression;
  nextAfter(from: Date): Date;
}

export class InProcessJobLock extends JobLock {} // modo local y pruebas
export enum SchedulingMode {
  InProcess = 'in-process',
  External = 'external', // sin temporizadores: EventBridge o un cron llama a runNow
}
```

`SchedulingModule` (en `@platform/scheduling/nest`) descubre los providers que son `instanceof ScheduledJob` con `DiscoveryService`, así que una librería solo declara la clase en sus `providers` y no importa el módulo de scheduling. El cron se escribe en casa (unas 120 líneas, sin dependencia nueva). `ValkeyJobLock` (SET NX PX con token) llega en WP-11.

**Reparto de jobs.**

| Job                              | Dueño        | Calendario               | Exclusivo | Nota                                                                                                         |
| -------------------------------- | ------------ | ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------ |
| `OutboxRelayJob`                 | messaging    | cada 1 s con jitter      | no        | Usa `SKIP LOCKED`. `OutboxMessageBus.onAppended` llama a `runner.trigger`. Recorre shards con `RelayScopes`. |
| `OutboxRetentionJob`             | messaging    | cada hora                | no        | Llama a `OutboxStore.purge`.                                                                                 |
| `ProcessedMessageRetentionJob`   | messaging    | cada hora                | no        | `PurgeableStore.purgeCompleted`.                                                                             |
| `ProcessedOperationRetentionJob` | internal-api | cada hora                | no        | Igual, sobre `ProcessedOperationStore`.                                                                      |
| `SagaRecoveryJob`                | saga         | cada 5 s                 | no        | Retoma por `findRecoverable` con `SKIP LOCKED` y lease.                                                      |
| `SagaRetentionJob`               | saga         | cada hora                | no        | Purga sagas terminadas tras la retención.                                                                    |
| `BloomRebuildJob`                | bloom        | `rebuildCron` del filtro | sí        | Reconstruye con una fuente de datos inyectada.                                                               |

Para recorrer shards sin que messaging conozca TypeORM:

```ts
// @platform/messaging
export abstract class RelayScopes {
  /** Corre `body` una vez por cada partición de la que hay que publicar. */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
export class SingleRelayScope extends RelayScopes {} // por defecto, una sola base
// @platform/adapters-postgres: ShardedRelayScopes usa AcrossShards y ShardScope de persistence.
```

### D5. Consumidores y handlers como clases

`@Subscribe` y `@InternalHandler` son decoradores que describen metadatos (como las fábricas `define*`, son declarativos). Los descubre un explorador y los registra en el dispatcher o el router, cuya API `register` se conserva para los usos sin Nest.

```ts
@Injectable()
export class WelcomeEmailConsumer {
  constructor(private readonly sendWelcome: SendWelcomeEmail) {}

  @Subscribe(UserRegisteredV1)
  async onUserRegistered(
    data: UserRegisteredV1Data,
    envelope: MessageEnvelope<UserRegisteredV1Data>,
  ): Promise<void> {
    await this.sendWelcome.execute({
      userId: data.userId,
      tenantId: envelope.tenantId,
    });
  }
}

@Injectable()
export class CreateTenantHandler {
  @InternalHandler(CreateTenantOperation)
  handle(
    input: CreateTenantInput,
    call: CallContext,
  ): Promise<CreateTenantOutput> {
    /* ... */
  }
}

export class MessagingExplorer implements OnApplicationBootstrap {
  constructor(
    discovery: DiscoveryService,
    scanner: MetadataScanner,
    dispatcher: MessageDispatcher,
  );
  onApplicationBootstrap(): void;
}
```

`TenantVerifier` pasa de tipo función a clase abstracta con una implementación por defecto:

```ts
export abstract class TenantVerifier {
  abstract verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean>;
}
export class AcceptAnyTenantVerifier extends TenantVerifier {}
```

`InternalApiModule` llama a `router.assertComplete(registry)` en `onApplicationBootstrap`, así que un servicio con una operación sin handler no arranca.

### D6. Transporte HTTP de `internal-api`

La pieza vive entera en `@platform/internal-api` (INT-1), y F4 la consume en lugar de reescribirla (F4 3.4.3). Lo propio de la autenticación entre servicios es un puerto.

```ts
// @platform/internal-api (núcleo, sin Nest)
export class HttpTransport extends Transport {
  constructor(
    baseUrls: ServiceBaseUrls,
    signer: InternalCallSigner,
    resilience: ResilienceRegistry,
    fetcher: typeof fetch,
  );
  invoke(operationId: string, input: unknown, meta: CallMeta): Promise<CallOutcome<unknown>>;
}

export abstract class InternalCallSigner {
  abstract sign(request: SignableRequest): Promise<Record<string, string>>;
}
export abstract class InternalCallAuthenticator {
  abstract authenticate(request: SignableRequest): Promise<void>; // lanza si no es válida
}
export class HmacInternalCallSigner extends InternalCallSigner {}
export class HmacInternalCallAuthenticator extends InternalCallAuthenticator {} // ventana de 60 s

// @platform/internal-api/nest
@Controller('internal/operations')
export class InternalApiController {
  constructor(router: InternalRouter, authenticator: InternalCallAuthenticator);
  @Post(':operationId')
  handle(/* cuerpo, cabeceras */): Promise<InternalResponse>;
}
```

- El cliente valida la petición contra el contrato antes de llamar (regla del `CLAUDE.md`), propaga `traceparent`, tenant, actor y llave de idempotencia en cabeceras, y reintenta con la política `ExternalApi` del `ResilienceRegistry`.
- El controller no pasa por el `EndpointGuard` de F4. `InternalApiModule.forRoot({ transport: InternalTransportKind.Http | InProcess })`.
- El firmador SigV4 de AWS se difiere a F12 (es un `InternalCallSigner` más).

### D7. División de las clases grandes

Cada clase resultante queda bajo 200 líneas y con constructor propio. La API pública existente no cambia, para no romper a sus consumidores.

```ts
// sharding (SHD-1)
export class ShardRouter {
  constructor(deps: ShardRouterDeps);
  resolve(context: ShardContext): Promise<Placement>;
  assertWritable(placement: Placement): void;
  invalidate(tenantId: string): Promise<void>;
  applyDirectoryChange(change: DirectoryChange): Promise<void>;
}
export class PlacementCache {} // LRU local más RoutingCache compartida, con lápidas y versión mínima
export class InvalidationLog {} // secuencia y tabla de invalidaciones
export class PlacementLoader {} // carga en vuelo compartida; usa Deadline
export class DirectoryChangeApplier {} // aplica cambios del canal
export class PlacementCodec {} // sustituye encodePlacement y decodePlacement
export class ShardingFeature {} // inmutable: validate() y keyFor(context)

// messaging (MSG-3)
export class EnvelopeValidator {
  validate(raw: unknown): ValidatedEnvelope;
}
export class ClaimGuard {
  constructor(store: ProcessedMessageStore, clock: Clock, guard: Guard);
  claim(envelope: MessageEnvelope, consumer: string, options: DispatchOptions): Promise<ClaimOutcome>;
  complete(claim: AcquiredMessageClaim): Promise<void>;
  release(claim: AcquiredMessageClaim): Promise<void>;
}
export class DeliveryClassifier {
  classify(error: unknown, options: DispatchOptions): DispatchResult;
}
export class MessageDispatcher {
  register<T>(contract: MessageContract<T>, handler: MessageHandler<T>): void;
  dispatch(raw: unknown, options: DispatchOptions): Promise<DispatchResult>;
}

// internal-api (INT-3)
export class OperationDispatcher {} // validación y ruta
export class IdempotencyGate {} // claim, complete y release con ProcessedOperationStore
export class UnitOfWorkRunner {
  /** Hace commit o rollback según `outcome.commit`. No hay excepción centinela. */
  run<T>(work: (uow: UnitOfWork) => Promise<HandlerOutcome<T>>): Promise<HandlerOutcome<T>>;
}
export class InternalRouter {
  register(operation: OperationDescriptor, handler: OperationHandler): void;
  assertComplete(registry: ContractRegistry): void;
  handle(call: IncomingCall): Promise<CallOutcome<unknown>>;
}

// resilience (RES-1, RES-2)
export class PolicyName {
  static readonly Cache = new PolicyName('cache');
  static readonly Database = new PolicyName('database');
  static of(value: string): PolicyName; // políticas propias del servicio
  private constructor(readonly value: string);
}
export class PolicyRegistry {} // resolución y entradas
export class PolicyExecutor {} // intentos, tiempo por intento y reintento
export class ResilienceEventBus {} // listeners
export class ResilienceRegistry {
  execute<T>(name: PolicyName, operation: (signal: AbortSignal) => Promise<T>, options?: ExecuteOptions): Promise<T>;
  subscribe(listener: ResilienceEventListener): () => void;
}

// adapters-aws (AWS-2)
export class SqsDeliveryProcessor {} // lógica común: valida, despacha, decide borrar o reintentar
export class SqsPoller {} // modo servicio: sondeo largo, start() y stop()
export class SqsLambdaHandler {} // modo Lambda: handleEvent(event)
export class SqsDeadLetterRedriver {} // reenvío a la DLQ
export class SqsConsumerConfig {} // lote, espera y visibilidad con valores por defecto
```

Se borran `Ai`, `AiStreaming` y `Email` de las políticas (nadie las usa). `ResilienceModule` trae `Cache` y `Database`; el resto se registra con `forFeature`. No se agrega un decorador `@Resilient`: `registry.execute` es la única vía y la skill lo dice.

### D8. Duplicación

Se elimina en esta fase, cada pieza en la ola de su dueño.

| Duplicado                                                                            | Resolución                                                                                | Ola     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------- |
| Cuatro esperas con plazo (`raceDeadline`, `wait.ts`, `LookupBudget`, `sleep` de SQS) | `Deadline`                                                                                | 0, 1, 3 |
| Cuatro modelos de reintento y dos `DEFAULT_RETRY_POLICY`                             | `RetryPolicy` de primitives; internal-api y messaging la reutilizan; resilience la acepta | 0, 1, 2 |
| Bucle de reintento propio de `InternalClient`                                        | `ResilienceRegistry` con política `ExternalApi`                                           | 2       |
| Dos enums de código por librería                                                     | Un enum por librería (D2)                                                                 | 1 a 3   |
| `abstract readonly failureKind` repetido                                             | `PlatformError` lo calcula                                                                | 0       |
| Doce funciones `assert*` y `isPlainObject`                                           | `Guard` y `CanonicalJson`                                                                 | 0 a 3   |
| `describeError`, `codeOf`, `reasonOf`                                                | `ErrorDescriptor`                                                                         | 0 a 3   |
| `MAX_TENANT_ID_LENGTH` con 64 y 128                                                  | `TenantId.MAX_LENGTH`                                                                     | 0, 1, 2 |
| `MESSAGING_RESOURCE_NAME` y `MESSAGING_NAME_PATTERN`                                 | El de contracts                                                                           | 2       |
| `ERROR_CODE_PATTERN` repetido                                                        | Dos expresiones con prueba de consistencia (D2)                                           | 0       |
| `IsolationLevel` en primitives y en persistence                                      | La del kernel                                                                             | 0, 2    |
| `stable-hash.ts` de cache                                                            | `CanonicalJson.digest`                                                                    | 1       |
| `inTrace` de saga y `traceContext` de internal-api                                   | `TraceContextRestorer` en observability                                                   | 1, 2, 3 |
| Cuatro detecciones de Docker                                                         | `ContainerRuntime`                                                                        | 0, 3    |
| Opciones obsoletas de messaging                                                      | Se borran `LegacyBackoffOptions`, `newId` y `now`                                         | 2       |
| `partitionOf` de bloom y de aws con otro sentido                                     | El de aws pasa a método privado de `AwsMessagingNames`                                    | 1, 3    |
| `toDate` y `toMs` repetidos en los stores de Postgres                                | Un `TimestampTransformer` de TypeORM                                                      | 3       |

### D9. Dobles de prueba fuera del índice público

Los dobles pasan a `src/__tests__/utils/` y salen por `@platform/<lib>/test-utils` (el alias lo crea WP-01). Cada doble pasa la misma prueba de contrato que el adaptador real: `run<Port>Contract(factory)`, también en `test-utils`.

| Doble                                                                 | De            | A                                    | Contrato                                                     |
| --------------------------------------------------------------------- | ------------- | ------------------------------------ | ------------------------------------------------------------ |
| `InMemoryIdempotencyStore`                                            | primitives    | `@platform/kernel/test-utils`        | `runIdempotencyStoreContract`                                |
| `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore` | messaging     | `@platform/messaging/test-utils`     | `runOutboxStoreContract`, `runProcessedMessageStoreContract` |
| `InMemoryProcessedOperationStore`                                     | internal-api  | `@platform/internal-api/test-utils`  | `runIdempotencyStoreContract`                                |
| `InMemorySagaStore`                                                   | saga          | `@platform/saga/test-utils`          | `runSagaStoreContract`                                       |
| `InMemoryDirectoryStore`                                              | sharding      | `@platform/sharding/test-utils`      | `runDirectoryStoreContract`                                  |
| `InMemoryRoutingCache`                                                | sharding      | `@platform/sharding/test-utils`      | `runRoutingCacheContract`                                    |
| `InMemoryMetrics`                                                     | observability | `@platform/observability/test-utils` | ninguno                                                      |
| `FakeSqsClient`, `FakeSnsClient` (nuevos)                             | aws           | `@platform/adapters-aws/test-utils`  | ninguno                                                      |

Se quedan en producción, porque son un modo de ejecución y no un doble: `InMemoryCache` (único modo sin Valkey), `InMemoryRateLimiter` (lo usa `DegradingRateLimiter`), `NoopMetrics`, `InProcessJobLock`, y dos piezas nuevas de sharding, `NullRoutingCache` (siempre falla la lectura) e `InProcessDirectoryChannel` (el canal actual en memoria, renombrado, para una sola instancia).

Faltan las pruebas de contrato de `CachePort`, `RateLimiter` (memoria frente a Valkey, incluido el script Lua frente a `SlidingWindow`), `DirectoryStore`, `RoutingCache` y `SagaStore`. Cada una la escribe el paquete dueño del puerto y la corre contra el fake y contra el adaptador real.

### D10. Pruebas que verifican detalles internos

Reglas para los paquetes que tocan esas pruebas:

- Se verifica el resultado externo, no el número ni el orden de llamadas internas. Se sustituye `jest.fn` con `toHaveBeenCalledTimes` por un fake con comportamiento y un contador público cuando la cantidad es un requisito (la deduplicación de cargas de `PlacementLoader`, por ejemplo).
- Los hallazgos concretos: `shard-router.spec.ts` (56 `jest.fn`), `cache-aside.spec.ts` (54), `internal-api/router.spec.ts` (38) y `client.spec.ts` (17).
- Sin lógica en pruebas: las tablas van con `it.each`; las escaleras `if (name === 'GetQueueUrlCommand')` de aws se reemplazan por `FakeSqsClient` y `FakeSnsClient`.
- Cada archivo de prueba corresponde a una clase (`saga-engine.spec.ts` de 1.670 líneas, `shard-router.spec.ts` de 1.339, `router.spec.ts` de 909 y `define.spec.ts` de 795 se parten con la clase que prueban).
- Las pruebas de integración se llaman `*.int-spec.ts` y usan `ContainerRuntime`. `pg-mem` se borra: la capa TypeORM se prueba con Testcontainers.
- Las pruebas de un utilitario van en el `__tests__` que lo contiene, sin anidar `utils/__tests__` (T9).

### D11. Persistencia con TypeORM y sagas: frontera de paquetes

El diseño aprobado no se toca. Se integra así:

- WP-09 es el P1 del diseño: `@platform/persistence` completo, el `ShardScope` con `requireScope` y el error `CROSS_SHARD_TX` que pide F4 3.6, el `TypeOrmCriteriaTranslator` (consume el AST de `criteria`, que no cambia), un `IdTransformer` y un arnés de pruebas con dos shards en Postgres real en `@platform/persistence/test-utils`. El código viejo sobre `pg` se mueve sin cambios a `persistence/src/legacy/` y se reexporta hasta WP-10, para que `adapters-postgres` siga compilando entre olas.
- WP-10 es el P2: entidades, migraciones y stores TypeORM de outbox, procesados, idempotencia y directorio; borra `legacy/` y `pg-mem`. `CriteriaTranslator` queda en persistence y `criteria` solo pierde `sql.ts` y `postgres.ts` y gana `CursorCodec`.
- WP-12 es el P3: el motor de sagas, `SagaModule`, `TypeOrmSagaStore` y sus entidades. Vive en `adapters/postgres/src/saga/`, carpeta exclusiva de WP-12, y exporta `platformSagaShardEntities` y `platformSagaShardMigrations`, que la app suma a los arreglos de WP-10. Así no comparten un archivo de composición. Cada paquete usa su rango de timestamps de migración.
- Al cerrar, WP-13 actualiza los ADR 0008 y 0009, `ARCHITECTURE.md` y la skill `backend-persistencia-typeorm`, como pide el diseño.

### D12. Resto de decisiones de librería

Resumen de lo que no necesita firma propia, con su dueño:

- Config (WP-04): esquemas por tema, `ConfigLoader` como clase, `LogLevel` se muda a observability, `Secret` con campo privado `#value`, un `match` tipado en `env.ts` sin `as unknown as`.
- Observability (WP-04): `RequestContextStore` inyectable (el `AsyncLocalStorage` queda privado), `Tracing`, `Redactor`, `StructuredLogger` con `LogSink` (`StdoutLogSink`, `OtlpLogSink`), `TelemetryBootstrap`, `TraceContextCodec`, `TraceContextRestorer`, `HealthRegistry`. Se retiran de `metrics.ts` los listeners de resilience y cache.
- Resilience y cache (WP-05): `ResilienceMetricsListener` en resilience y `CacheMetrics` con un `CacheErrorReporter` en cache. `CacheAside` usa el `TransactionManager` inyectado (`afterCommit`), no un callback. Se borran de su opción pública `random`, `singleFlight` y `maxValueBytes`.
- Rate-limit (WP-05): `RateLimitRule` inmutable con `validate()`, `SlidingWindow` como clase compartida con la prueba de equivalencia frente al Lua, `RateLimitGuard`.
- Bloom (WP-05): `BloomMath` y `BloomSizing` (estáticas y puras), errores con sufijo `Error`, `BloomModule.forFeature`.
- Sharding (WP-06): `ShardingModule` conecta canal, router y directorio, y la suscripción vive en `DirectoryChangeSubscription`. Comentarios obsoletos corregidos (SHD-4).
- Adapters AWS y Valkey (WP-11): `AwsModule`, `ValkeyModule`, `ValkeyClientFactory`, `ValkeyCommandExecutor`, `ValkeyKeyspace` con `VALKEY_KEY_PREFIX` igual a `SERVICE_NAME` por defecto, `AwsErrorTranslator` (regla del `FailureClassifier`), `ElastiCacheIamAuthTokenProvider`.
- Contratos (WP-02): `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec`. Siguen siendo funciones, por decisión: `defineEvent`, `defineCommand`, `defineOperation`, `defineRoute`, `defineTopic`, `defineQueue`, `defineServiceContract`, `defineErrorCatalog` y los esquemas zod de `env.ts` y `secret()`.
- Tools (WP-02): `ContractExporter`, `SchemaExportBuilder`, `AsyncApiBuilder`, `TopologyBuilder`, `ExportCommand` con `CheckMode` y `WriteMode`, `ContractsDiscovery` (lee `libs/contracts/*/src/index.ts` y elimina el registro manual), `ArtifactWriter`.
- Idioma y nombres (T8): se unifica en español al tocar cada archivo; `util.ts`, `types.ts`, `limits.ts` y `model.ts` se renombran con sufijo de rol; una clase pública por archivo.

## 3. Oleadas y paquetes de trabajo

### 3.1 Reglas comunes

**Cómo trabaja una tropa.** Como dice el [plan](README.md#cómo-se-ejecuta-una-ola). En el backend, los esqueletos son clases abstractas y firmas con cuerpo `throw new NotImplementedError()`.

**Archivos compartidos.** `backend/tsconfig.base.json`, `backend/package.json` (con `pnpm-lock.yaml`) y el catálogo de errores de `@contracts/platform` los toca una sola tropa por oleada:

| Ola   | Quién toca los tres archivos | Qué hace                                                                                                                                         |
| ----- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | WP-01                        | Declara todos los alias del plan (`@platform/<lib>/nest`, `@platform/<lib>/test-utils`, `@platform/scheduling`) y todas las dependencias nuevas. |
| 1 a 3 | nadie                        | Cada librería crea el archivo al que apunta su alias. Declarar el alias antes que el archivo no rompe nada hasta que alguien lo importa.         |
| 4     | WP-13                        | Borra del catálogo central los códigos internos y quita los reexportes de compatibilidad. F4-WP1 y F4-WP4 no los tocan.                          |

Dependencias nuevas de WP-01, con versión exacta como el resto del `package.json` (la guía fija cada una con `pnpm view`): `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `reflect-metadata`, `rxjs` y `typeorm`. `pg` ya está. `@nestjs/schedule` no se agrega: el cron es propio.

**Criterio de cierre estándar (CCE).** Todo paquete lo cumple, además de sus criterios propios. `<proyectos>` es la lista de proyectos de Nx del paquete.

1. `pnpm nx run-many -t lint test typecheck --projects=<proyectos>` en verde.
2. `pnpm nx run-many -t test --projects=<proyectos> --coverage` cumple 80 de líneas, 80 de sentencias, 80 de funciones y 75 de ramas.
3. `INTEGRATION_TESTS=require pnpm nx run-many -t test --projects=<proyectos>` en verde donde el paquete tiene pruebas `.int-spec.ts`.
4. `node .claude/skills/backend-estructura/scripts/check-structure.mjs --changed .` sin incumplimientos.
5. Los `index.ts` públicos no exportan dobles de prueba ni `InMemory*` que D9 manda a `test-utils`.
6. Comentarios en español, una clase pública por archivo, nombres con sufijo de rol.
7. La guía deja una nota de integración de media página en el PR: interfaces nuevas, rompimientos y qué debe cambiar el consumidor.

Nombres de proyecto de Nx: `platform-<lib>` (`platform-kernel`, `platform-primitives`, `platform-config`, `platform-observability`, `platform-resilience`, `platform-cache`, `platform-rate-limit`, `platform-bloom`, `platform-sharding`, `platform-messaging`, `platform-internal-api`, `platform-persistence`, `platform-criteria`, `platform-saga`), `platform-adapters-aws`, `platform-adapters-postgres`, `platform-adapters-valkey`, `contracts-platform`, `contracts-identity`, `contracts-export`, `shared-utils` y el nuevo `platform-scheduling`.

### 3.2 Ola 0: fundaciones

#### WP-01. Fundaciones del kernel, primitives y archivos compartidos (L)

- **Carpetas exclusivas:** `backend/libs/platform/kernel/**`, `backend/libs/platform/primitives/**`, `backend/libs/platform/scheduling/**` (solo el esqueleto de proyecto: `project.json`, jest, tsconfig, `src/index.ts` vacío), `backend/libs/shared/utils/**` (se elimina), `backend/libs/contracts/platform/src/{enums,errors}/**` (solo lo que D2 exige), `backend/libs/contracts/platform/src/kit/error-catalog.ts`, `backend/libs/contracts/platform/src/kit/define-route.ts`, `backend/tsconfig.base.json`, `backend/package.json`, `pnpm-lock.yaml`, `backend/jest.preset.js`.
- **Cierra:** KRN-1, KRN-2, KRN-3, KRN-4, PRM-1, PRM-2, PRM-3, T4, T6, T7, UTL-1, SHD-5 (el `TenantId`), T3 (la parte de primitives: `Deadline`, `RetryPolicy`, `Backoff`), T2 y CTR-1 (solo la mecánica), CTR-3 (el patrón de código), T9 (la parte del kernel).
- **Consume:** nada nuevo.
- **Produce:** `RandomSource`, `Guard`, `ErrorDescriptor`, `PlatformError` con `failureKind`, `ErrorCode`, `KernelErrorCode`, puertos de transacción, idempotencia y `ScheduledJob` y `JobLock` en `kernel/src/ports/`, `PurgeableStore`, `HealthCheckable`, `TenantId`, `Money`, `ContainerRuntime`, y en primitives `RetryPolicy`, `Backoff`, `Deadline`, `FailureClassifier`, `RetryAfterParser`, `CanonicalJson`, `Hashes`. Reexportes `@deprecated` de los puertos en primitives.
- **Aceptación específica:**
  - `grep -rn "@contracts" backend/libs/platform/kernel/src` no devuelve nada.
  - La prueba de consistencia de patrones de código recorre `platformErrorCatalog` y `kernelErrorCatalog`.
  - `Clock`, `IdGenerator`, `TransactionManager` e `IdempotencyStore` siguen aceptando un objeto literal como doble: la guía lo verifica con `pnpm nx run-many -t typecheck` sobre **todos** los proyectos, sin cambios en ellos.
  - `pnpm nx run-many -t test --projects=platform-kernel,platform-primitives,contracts-platform` con cobertura y `INTEGRATION_TESTS=skip` en verde; `ContainerRuntime` tiene pruebas unitarias con un `env` simulado.
  - `pnpm install --frozen-lockfile` en verde y `pnpm nx show projects` lista `platform-scheduling`.
- **División:** Haiku 1 hace el kernel (`RandomSource`, `Clock`, `IdGenerator`, `Guard`, `ErrorDescriptor`, `PlatformError`, `ErrorCode`, `HealthCheckable`, `TenantId`, `Money`, `ContainerRuntime`) y borra `result.ts` y `shared/utils`. Haiku 2 hace primitives (`RetryPolicy`, `Backoff`, `Deadline`, `FailureClassifier`, `RetryAfterParser`, `CanonicalJson`, `Hashes`), mueve los puertos a `kernel/src/ports/` con los reexportes, y edita los archivos compartidos (alias, dependencias, `jest.preset.js`). La guía escribe `ScheduledJob`, `JobLock`, el esqueleto de scheduling y la mecánica de catálogos.

#### WP-02. Kit de contratos y herramientas de exportación (M)

- **Carpetas exclusivas:** `backend/libs/contracts/platform/src/{kit,schemas,constants,types}/**` salvo `kit/error-catalog.ts` y `kit/define-route.ts`, `backend/libs/contracts/platform/src/{contract.ts,index.ts}`, `backend/libs/contracts/identity/**`, `backend/tools/contracts-export/**`.
- **Cierra:** CTR-2, CTR-5, TLS-1, TLS-2 (CTR-4 se descarta; el generador de apps y módulos de F11 queda fuera).
- **Consume:** nada de WP-01. No toca el archivo de catálogo ni el patrón de código.
- **Produce:** `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec`, `ContractExporter` y sus colaboradores, `ContractsDiscovery`.
- **Aceptación específica:**
  - `pnpm nx run contracts-export:check` (o el target equivalente que fije la guía) no produce diferencias: la forma de los contratos no cambia, así que no hay que regenerar el Dart de `front/packages/contracts`.
  - `backend/tools/contracts-export/src/registry.ts` desaparece y agregar una carpeta en `libs/contracts/` basta para que se exporte.
  - `contracts/identity/src/__tests__/contract.spec.ts` y `platform-error-catalog.spec.ts` usan `it.each` en lugar de bucles con `if`.
  - `check-structure.mjs` ya no lista los archivos `kit/define-*`: están en la lista de excepciones que fija WP-03.
  - CCE con `contracts-platform,contracts-identity,contracts-export`.
- **División:** Haiku 1: `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec` y sus pruebas. Haiku 2: las clases de `contracts-export`, `ContractsDiscovery` y la prueba de `contracts/identity`.

#### WP-03. Skills, ADR y reglas de lint (S)

- **Carpetas exclusivas:** `.claude/skills/backend-*/**`, `docs/adr/**`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `backend/eslint.config.mjs`.
- **Cierra:** MSG-6 (la skill se ajusta al código), T8 (regla de idioma), la regla de lint de D3 y las excepciones de `check-structure.mjs`.
- **Produce:**
  - ADR 0024 de persistencia sobre TypeORM, que supera al 0009 (se marca el 0009 como superado y se actualiza el 0008). Ya se registró en `b182447`, después de que partiera la tropa; ver las decisiones abiertas del [plan](README.md#registro-de-decisiones).
  - ADR 0025 de capa NestJS por sub-entrada `@platform/<lib>/nest` y puertos como clases abstractas.
  - ADR 0026 de `ScheduledJob`, `JobLock` y `@platform/scheduling`.
  - La skill `backend-mensajeria-idempotencia` pasa de `OutboxWriter.add` y `processed.tryRegister` a `append` y `claim`, `complete` y `release`; la de composición documenta módulos, `Type<Port>` y apagado; la de pruebas documenta `test-utils` y `ContainerRuntime`.
  - Regla de ESLint: fuera de `src/nest/` no se importa `@nestjs/*` ni sub-entradas `/nest`.
  - `check-structure.mjs` con lista de excepciones declarada (fábricas `define*` de contracts, esquemas de `env.ts`, `main()` de `tools`) y que rechaza `*.integration.spec.ts`.
  - `CLAUDE.md` sin el texto que contradice las decisiones (el `ADR 0009` y "funciones sueltas").
- **Aceptación específica:**
  - El script falla ante un archivo de prueba `*.integration.spec.ts` y ante un `@nestjs/*` en el núcleo (pruebas del script incluidas).
  - Los ejemplos de código de las skills compilan contra las firmas de la sección 2 (la guía los extrae a un archivo temporal y corre `tsc`).
  - `pnpm nx format-check` en verde.
- **División:** Haiku 1: ADR 0024 a 0026 con la plantilla `0000-plantilla.md` y `CLAUDE.md`. Haiku 2: las skills y la regla de ESLint con su prueba. La guía escribe el cambio de `check-structure.mjs`.

**Cierre de la ola 0:** el general corre `pnpm nx run-many -t lint test typecheck` sobre todo el backend y `check-structure.mjs --all .`. Debe bajar el conteo de 97 solo en lo que WP-01 y WP-02 resuelven.

### 3.3 Ola 1: núcleo de la plataforma

Las tres tropas parten de la ola 0 integrada y no comparten carpetas. Los jobs de cada librería se prueban llamando a `run()` directamente, porque el runner llega en esta misma ola.

#### WP-04. Config y observabilidad (L)

- **Carpetas exclusivas:** `backend/libs/platform/config/**`, `backend/libs/platform/observability/**`.
- **Cierra:** CFG-1, CFG-2, CFG-3, CFG-4 (CFG-5 queda fuera), OBS-1, OBS-2, OBS-3, OBS-4, OBS-5, T1 (config y observability), T2 y T4 (en sus libs), T5 (`InMemoryMetrics`), T7 y T8.
- **Consume:** `RandomSource`, `Clock`, `Guard`, `ErrorDescriptor`, `HealthCheckable`, `ConfigSection`.
- **Produce:** `ConfigModule`, `AppConfig`, `ConfigSection`, secciones `LoggingConfig` y `TelemetryConfig`, `ObservabilityModule`, `RequestContextStore`, `RequestContextMiddleware` y `RequestContextInterceptor`, `Tracing`, `Redactor`, `StructuredLogger`, `LogSink`, `TelemetryBootstrap` (con `@platform/observability/setup`), `TraceContextCodec`, `TraceContextRestorer`, `HealthRegistry`, `@platform/observability/test-utils`, `ObservabilityErrorCode` y `ConfigErrorCode` ya únicos.
- **Aceptación específica:**
  - `grep -rn "@platform/config" backend/libs/platform/observability/src` no devuelve nada.
  - `grep -rnE "process\.env" backend/libs/platform --include=*.ts` solo encuentra `config` y `setup.ts`.
  - Prueba de módulo con `@nestjs/testing`: un servicio sin base de datos que importa `ObservabilityModule.forRoot()` no recibe variables `DB_*`.
  - `RequestContextStore` mantiene el contexto a través de `await` y de un `setTimeout` en una prueba con `Test.createTestingModule`.
  - El logger redacta un campo sensible igual que antes (las pruebas de redacción existentes pasan sin cambios).
  - `metrics.ts` ya no importa nada de resilience ni de cache.
  - CCE con `platform-config,platform-observability`.
- **División:** Haiku 1: config completa, `TelemetryBootstrap`, `metrics.ts` y `HealthRegistry`. Haiku 2: `request-context`, `logger` con sinks, `redaction`, `spans`, `trace` y `propagation`, y el módulo.

#### WP-05. Resilience, cache, rate-limit y bloom (L)

- **Carpetas exclusivas:** `backend/libs/platform/resilience/**`, `backend/libs/platform/cache/**`, `backend/libs/platform/rate-limit/**`, `backend/libs/platform/bloom/**`.
- **Cierra:** RES-1, RES-2, RES-3, RES-4, CAC-1, CAC-2, CAC-3, CAC-4, CAC-5, RTL-1, RTL-2, BLO-1, BLO-2, BLO-3, BLO-4, T1, T2, T3 (`wait.ts`), T4, T7, T8 y la prueba de contrato de `CachePort` y de `RateLimiter`.
- **Consume:** `RandomSource`, `Deadline`, `RetryPolicy`, `Guard`, `TransactionManager` del kernel, `ScheduledJob`, `MetricsPort` (sin cambios de forma).
- **Produce:** `ResilienceModule`, `PolicyName`, `PolicyRegistry`, `PolicyExecutor`, `ResilienceEventBus`, `ResilienceMetricsListener`, `CacheModule`, `CacheAside` con `forFeature`, `SingleFlight`, `TtlJitter`, `CacheErrorReporter`, `RateLimitModule`, `RateLimitGuard`, `@RateLimit(rule)`, `SlidingWindow`, `BloomModule`, `BloomMath`, `BloomSizing`, `BloomRebuildJob`, `runCachePortContract` y `runRateLimiterContract` en `test-utils`.
- **Aceptación específica:**
  - `wait.ts` y `stable-hash.ts` de cache no existen; `CacheAside` no recibe `random`, `singleFlight` ni `maxValueBytes`.
  - Una prueba de invalidación dentro de una transacción comprueba que el bump ocurre después del commit y no ocurre tras un rollback, con un `TransactionManager` fake.
  - La prueba de equivalencia compara `SlidingWindow` con `InMemoryRateLimiter` sobre la misma secuencia (la comparación con el script Lua se agrega en WP-11).
  - `BloomRebuildJob.run()` reconstruye un filtro desde una fuente de datos fake y es `exclusive`.
  - Un servicio de prueba con `ResilienceModule.forFeature({ name: PolicyName.of('payments'), policy })` ejecuta bajo esa política sin editar la librería.
  - CCE con `platform-resilience,platform-cache,platform-rate-limit,platform-bloom`.
- **División:** Haiku 1: resilience y rate-limit. Haiku 2: cache y bloom. La guía coordina el contrato de `ResilienceRegistry.execute`, que cache consume.

#### WP-06. Scheduling y sharding (L)

- **Carpetas exclusivas:** `backend/libs/platform/scheduling/**` (la implementación), `backend/libs/platform/sharding/**`.
- **Cierra:** SHD-1, SHD-2, SHD-3, SHD-4, SHD-5, SHD-6 (el módulo y la suscripción; la parte TypeORM es de WP-09 y WP-10), T1, T2, T3 (`LookupBudget`), T5 (sharding), T7, T8 y el enabler de MSG-1 y BLO-1.
- **Consume:** `ScheduledJob`, `JobLock`, `Clock`, `RandomSource`, `Deadline`, `TenantId`, `Guard`.
- **Produce:** `JobRunner`, `CronExpression`, `InProcessJobLock`, `SchedulingModule`, `SchedulingMode`, `ShardingModule`, `ShardRouter` dividido (D7), `DirectoryChangeSubscription`, `NullRoutingCache`, `InProcessDirectoryChannel`, `@platform/sharding/test-utils` con `runDirectoryStoreContract` y `runRoutingCacheContract`.
- **Aceptación específica:**
  - Cada clase de la división de `ShardRouter` tiene menos de 200 líneas; `shard-router.ts` queda bajo 150.
  - La API pública de `ShardRouter` no cambia: las pruebas de comportamiento existentes pasan con los fakes nuevos y sin `toHaveBeenCalledTimes` internos (D10).
  - Una prueba de `PlacementLoader` demuestra que cien `resolve` concurrentes del mismo tenant leen la fuente una sola vez.
  - `JobRunner`: un job con `exclusive` no corre en dos runners que comparten un `InProcessJobLock`; `stop(graceMs)` espera la corrida en curso y aborta su `signal` al vencer; `trigger` no duplica una corrida; el cron `0 3 * * *` calcula `nextAfter` en UTC con cuatro casos en `it.each`, incluido el cambio de año.
  - `SchedulingModule` descubre dos `ScheduledJob` declarados como providers de otro módulo, sin importar a ese módulo (prueba con `@nestjs/testing`).
  - `ShardingModule` suscribe el canal en `onModuleInit` y lo cierra en `onModuleDestroy`.
  - CCE con `platform-scheduling,platform-sharding`.
- **División:** Haiku 1: `@platform/scheduling` completo. Haiku 2: la división de `ShardRouter`, sus clases y `ShardingModule`. La guía escribe `JobRunner` y la API de `ShardRouter`.

**Cierre de la ola 1:** typecheck de todo el backend, `ObservabilityModule`, `ResilienceModule`, `SchedulingModule` y `ShardingModule` importados juntos en una prueba de arranque en `platform-scheduling` que no se rompe por tokens duplicados.

### 3.4 Ola 2: mensajería, API interna y persistencia

#### WP-07. Messaging (L)

- **Carpetas exclusivas:** `backend/libs/platform/messaging/**`.
- **Cierra:** MSG-1, MSG-2, MSG-3, MSG-5, MSG-7, MSG-8, T1, T2, T3, T5, T7, T8 (MSG-4 diferido, MSG-6 ya hecho en WP-03).
- **Consume:** `ScheduledJob`, `JobRunner` (por descubrimiento), `RetryPolicy`, `Guard`, `ErrorDescriptor`, `TenantId`, `ResilienceModule` (política `Queue` registrada por el módulo con `forFeature`), `ObservabilityModule`.
- **Produce:** `MessagingModule`, `@Subscribe`, `MessagingExplorer`, `TenantVerifier`, `EnvelopeFactory`, `EnvelopeParser`, `EnvelopeValidator`, `ClaimGuard`, `DeliveryClassifier`, `MessageDispatcher` dividido, `OutboxRelayJob`, `OutboxRetentionJob`, `ProcessedMessageRetentionJob`, `RelayScopes`, `SingleRelayScope`, `MessagingJob` (enum), `@platform/messaging/test-utils` con `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`, `runOutboxStoreContract` y `runProcessedMessageStoreContract`.
- **Aceptación específica:**
  - Una prueba con `@nestjs/testing`: un `@Injectable` con `@Subscribe(UserRegisteredV1)` recibe un mensaje enviado al `MessageDispatcher`, sin llamar a `register` a mano.
  - Un mensaje inválido va a la DLQ y no se reintenta; un `TenantVerifier` que lanza se trata como falla transitoria (las pruebas del dispatcher actual pasan reubicadas por clase).
  - `OutboxRelayJob.run()` publica un lote contra `InMemoryOutboxStore` y un publicador fake; `OutboxMessageBus` despierta al runner con `trigger` y una prueba demuestra que un `append` seguido de commit publica sin esperar el intervalo.
  - `LegacyBackoffOptions`, `newId`, `now`, `defaultIds`, `defaultClock` y `describe-error.ts` no existen.
  - `message-dispatcher.ts` queda bajo 200 líneas y no hay más de 4 `jest.fn` con conteo de llamadas en las pruebas de messaging.
  - CCE con `platform-messaging`.
- **División:** Haiku 1: `EnvelopeFactory`, `EnvelopeParser`, `EnvelopeValidator`, `ClaimGuard`, `DeliveryClassifier` y la reubicación de pruebas del dispatcher. Haiku 2: módulo, explorador, `@Subscribe`, jobs, `RelayScopes` y `test-utils`.

#### WP-08. Internal-api (L)

- **Carpetas exclusivas:** `backend/libs/platform/internal-api/**`.
- **Cierra:** INT-1, INT-2, INT-3, INT-4, INT-5, INT-6, INT-7, T1, T2, T3, T5, T7, T8.
- **Consume:** `ResilienceRegistry` y `PolicyName`, `RetryPolicy`, `Guard`, `TenantId`, `ScheduledJob`, `TraceContextRestorer`, `TransactionManager`, `IdempotencyStore`.
- **Produce:** `HttpTransport`, `InternalCallSigner`, `InternalCallAuthenticator`, `HmacInternalCallSigner`, `HmacInternalCallAuthenticator`, `InternalApiController`, `InternalApiModule`, `@InternalHandler`, `OperationDispatcher`, `IdempotencyGate`, `UnitOfWorkRunner`, `OperationMetadata` como clase, `IdempotencyKeyPolicy`, `PayloadLimit`, `CallAttempt`, `ProcessedOperationRetentionJob`, `@platform/internal-api/test-utils`. La forma de `InternalClient.call` y `callById` y la de `OperationInvoker` no cambian, porque WP-12 las consume.
- **Aceptación específica:**
  - Prueba de extremo a extremo con dos `InternalApiModule` en un solo proceso de Nest y `HttpTransport` sobre un servidor HTTP real: la llamada llega, se valida contra el contrato en el cliente antes de salir, propaga `traceparent` y se rechaza con firma inválida o fuera de la ventana de 60 s.
  - `InternalClient` no tiene bucle de reintento propio ni las opciones `sleep`, `random`, `clock`; un `transient-failure` se reintenta por el `ResilienceRegistry` con la política `ExternalApi`.
  - No existe el símbolo `ROLLBACK`: un handler que devuelve `commit: false` deshace la transacción en una prueba con un `TransactionManager` fake.
  - `router.ts` queda bajo 150 líneas; un módulo con una operación sin handler no arranca.
  - CCE con `platform-internal-api`.
- **División:** Haiku 1: `HttpTransport`, firmas HMAC, `InternalApiController` y su prueba de extremo a extremo. Haiku 2: la división de `InternalRouter`, `OperationMetadata`, `InternalClient` sobre resilience y el módulo.

#### WP-09. Persistence sobre TypeORM (L)

- **Carpetas exclusivas:** `backend/libs/platform/persistence/**`.
- **Cierra:** la parte de persistence del diseño aprobado (sección 3 y 6 de P1), 2.17 del informe, CRI-1 (el traductor), SHD-6 (la parte de directorio), KRN-3 (`IdTransformer`), T1, T6 y el ajuste de F4 3.6 (`ShardScope`, `requireScope`, `CROSS_SHARD_TX`).
- **Consume:** `ShardRouter` y su módulo (WP-06), `RequestContextStore` (WP-04), `TransactionManager` e `IsolationLevel` del kernel, `AppConfig`, `ContainerRuntime`, el AST de `criteria`.
- **Produce:** `PersistenceModule` (`forRoot`, `forFeature`), `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `TransactionShardGuard`, `EntityManagerProvider`, `ShardedRepository`, `CatalogRepository`, `ShardScope`, `AcrossShards`, `ShardedMigrationRunner`, `AuditedEntity`, `VersionedEntity`, `PersistenceContextProvider`, `TypeOrmCriteriaTranslator`, `IdTransformer`, `TimestampTransformer`, `DatabaseConfig`, y `@platform/persistence/test-utils` con un arnés `ShardedTestDatabase` (dos shards en Postgres real). El código viejo queda en `src/legacy/`.
- **Aceptación específica:**
  - `INTEGRATION_TESTS=require pnpm nx test platform-persistence` con dos shards reales: una entidad de un tenant se guarda y se lee en su shard; una transacción que toca otro shard falla con `CROSS_SHARD_TX`; `ShardScope.run` anidado a otro shard dentro de una transacción también; sin scope y con `requireScope`, `PLATFORM.SHARDING.KEY_MISSING`.
  - La versión optimista lanza conflicto en una segunda escritura con la versión vieja; el borrado lógico oculta la fila; un `afterCommit` corre solo tras commit.
  - `ShardedMigrationRunner` migra el catálogo y los dos shards con `pg_advisory_lock` y es idempotente al repetirlo.
  - Un `TypeOrmCriteriaTranslator` pagina con cursor y respeta la lista blanca de campos; un campo fuera de ella falla (la prueba usa una condición de inyección).
  - `synchronize` es `false` en toda la configuración y una prueba lo comprueba.
  - El target de Nx `migration-generate` genera una migración de una entidad de prueba.
  - Nada fuera de `legacy/` importa `pg` directamente; una regla de ESLint prohíbe imports nuevos hacia `legacy/`.
  - `@Audited` y el trigger de auditoría se conservan con su prueba.
  - CCE con `platform-persistence`. Atención: la configuración de SWC de Jest debe emitir metadatos de decoradores para las entidades.
- **División:** Haiku 1: `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `EntityManagerProvider`, `ShardScope`, `AcrossShards`. Haiku 2: `ShardedRepository`, `CatalogRepository`, entidades base, `TypeOrmCriteriaTranslator`, `ShardedMigrationRunner`, targets de migración y el arnés de pruebas. La guía escribe `PersistenceModule` y el movimiento a `legacy/`.

**Cierre de la ola 2:** el general comprueba que `adapters-postgres` sigue compilando por `legacy/` y que `pnpm nx run-many -t typecheck` pasa en todo.

### 3.5 Ola 3: stores, adaptadores y sagas

#### WP-10. Tablas de la plataforma sobre TypeORM y criteria (L)

- **Carpetas exclusivas:** `backend/libs/platform/adapters/postgres/**` salvo `src/saga/`, `backend/libs/platform/criteria/**`, `backend/libs/platform/persistence/src/legacy/**` (solo para borrarla).
- **Cierra:** 2.16 completa (stores, migraciones, `pg-mem`, herencia entre stores, fechas repetidas), CRI-1 (la baja de SQL), CRI-2, CRI-3, CRI-4, SHD-6 (`TypeOrmDirectoryStore`), T1, T2, T6, T8.
- **Consume:** el núcleo de WP-09, `runOutboxStoreContract`, `runProcessedMessageStoreContract`, `runIdempotencyStoreContract`, `runDirectoryStoreContract`, `ScheduledJob`, `RelayScopes`.
- **Produce:** `PostgresPlatformModule`, entidades (`OutboxEntity`, `IdempotencyKeyEntity`, `ProcessedMessageEntity`, `ShardDirectoryEntity`, `ShardInstanceEntity`, `ShardLockEntity`), migraciones generadas con la CLI, `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`, `ClaimTable<R>` por composición, `ShardedRelayScopes`, `platformShardEntities`, `platformShardMigrations`, `platformCatalogEntities`, `platformCatalogMigrations`, `CursorCodec` y `PageBuilder` en criteria.
- **Aceptación específica:**
  - Los cuatro stores pasan sus pruebas de contrato en Postgres real, las mismas que el fake de memoria.
  - `FOR UPDATE SKIP LOCKED` demostrado: dos relays concurrentes sobre el mismo outbox no publican el mismo mensaje dos veces.
  - Los índices parciales (`outbox_open_idx` y los demás) existen en la migración generada y los `CHECK` salen de los enums.
  - `grep -rn "pg-mem" backend` no devuelve nada; `persistence/src/legacy/` no existe; `criteria/src/sql.ts` y `postgres.ts` no existen.
  - `CursorCodec` se construye una vez con el secreto y rechaza un cursor manipulado.
  - CCE con `platform-adapters-postgres,platform-criteria,platform-persistence`.
- **División:** Haiku 1: entidades, migraciones y stores de outbox y procesados. Haiku 2: stores de idempotencia y directorio, `ShardedRelayScopes` y criteria.

#### WP-11. Adaptadores AWS y Valkey (L)

- **Carpetas exclusivas:** `backend/libs/platform/adapters/aws/**`, `backend/libs/platform/adapters/valkey/**`.
- **Cierra:** AWS-1, AWS-2, AWS-3, AWS-4, VLK-1, VLK-2, VLK-3, T1, T3 (el `sleep` de SQS), T5, T6, T8, T9 (la parte de integración), la sección 4 del informe para aws y la prueba de contrato de Valkey (memoria frente a Valkey para cache y rate-limit).
- **Consume:** `MessageBus`, `EnvelopePublisher`, `MessageDispatcher` y los puertos de messaging (WP-07), `CachePort`, `RateLimiter`, `RoutingCache`, `ShardDirectoryChange*`, `BloomFilter`, `JobLock`, `HealthCheckable`, `ResilienceRegistry`, `FailureClassifier`, `ContainerRuntime`.
- **Produce:** `AwsModule`, `SNS_CLIENT`, `SQS_CLIENT`, `AwsMessagingNames`, `AwsErrorTranslator`, `ElastiCacheIamAuthTokenProvider`, `SqsDeliveryProcessor`, `SqsPoller`, `SqsLambdaHandler`, `SqsDeadLetterRedriver`, `SqsConsumerConfig`, `FakeSqsClient`, `FakeSnsClient`, `ValkeyModule`, `ValkeyClientFactory`, `ValkeyCommandExecutor`, `ValkeyKeyspace`, `ValkeyErrorTranslator`, `ValkeyJobLock`, `ValkeyHealthIndicator`, `ValkeyBloomFilterFactory`. Los `*.integration.spec.ts` pasan a `*.int-spec.ts`.
- **Aceptación específica:**
  - `AwsModule` cierra ambos clientes en `onModuleDestroy` y `SqsPoller` se detiene en su `onModuleDestroy`, antes que los clientes (prueba con `app.close()` y un cliente fake que cuenta cierres).
  - Sin `if (name === 'GetQueueUrlCommand')` en pruebas.
  - `ValkeyModule` hace `quit` al cerrar y registra su `ValkeyHealthIndicator`; `ValkeyJobLock` impide que dos instancias tomen el mismo job (integración con Valkey real).
  - La prueba de contrato corre `runCachePortContract` y `runRateLimiterContract` contra `InMemory*` y contra Valkey; el script Lua y `SlidingWindow` dan el mismo resultado para la misma secuencia.
  - `@aws-sdk/*` solo aparece en `adapters/aws`; `valkey` no depende de `aws`.
  - Sin `VALKEY_KEY_PREFIX` explícito, el prefijo es `SERVICE_NAME`.
  - CCE con `platform-adapters-aws,platform-adapters-valkey`.
- **División:** Haiku 1: aws completo con los fakes. Haiku 2: valkey completo con las pruebas de contrato.

#### WP-12. Sagas (L)

- **Carpetas exclusivas:** `backend/libs/platform/saga/**`, `backend/libs/platform/adapters/postgres/src/saga/**`.
- **Cierra:** el diseño aprobado de sagas (sección 5 y 5.1), todas las notas de 2.12 del informe, T1, T2, T5, T8.
- **Consume:** `InternalClient` y `OperationInvoker` (WP-08, forma conservada), `TypeOrmTransactionManager` y `ShardedTestDatabase` (WP-09), `ScheduledJob`, `RetryPolicy`, `TraceContextRestorer`, `CanonicalJson`, `AcrossShards`.
- **Produce:** `SagaInstance` como agregado, `SagaStore` como clase abstracta, `StepExecutor`, `CompensationRunner`, `LeaseKeeper`, `SagaRecoveryJob`, `SagaRetentionJob`, `SagaEventPublisher`, `SagaEngine` con `start` y `resume`, `Sagas`, `SagaModule` (`forRoot({ store })`, `forFeature`), `TypeOrmSagaStore`, `SagaInstanceEntity`, `SagaStepLogEntity`, `platformSagaShardEntities`, `platformSagaShardMigrations`, `@platform/saga/test-utils` con `InMemorySagaStore` y `runSagaStoreContract`.
- **Aceptación específica:**
  - `runSagaStoreContract` pasa con `InMemorySagaStore` y con `TypeOrmSagaStore` en Postgres real: fencing por `version` y `lease_token`, `LeaseLost`, `ConcurrentModification`, `findRecoverable` con `SKIP LOCKED` y escritura de instancia y paso en la misma transacción.
  - Una saga de tres pasos que falla en el tercero compensa los dos primeros con la entrada y la salida guardadas, y el resultado es idéntico tras reiniciar el proceso a mitad (la prueba mata el motor entre `Dispatched` y la respuesta y `SagaRecoveryJob.run()` la retoma con la misma llave de idempotencia).
  - `saga-engine.ts` no existe como archivo de más de 200 líneas; `util.ts`, `engine-setup.ts`, `step-call.ts`, `transitions.ts` y `model.ts` ya no exportan funciones sueltas; el archivo de pruebas del motor está dividido por colaborador.
  - Las opciones `random`, `owner`, `leaseMs` y `maxStepDurationMs` viven en la configuración del módulo con valores por defecto.
  - Un caso de uso inyecta `Sagas` y llama `await this.sagas.start(CreateTenantSaga, state, { idempotencyKey })` en una prueba de módulo.
  - CCE con `platform-saga,platform-adapters-postgres`.
- **División:** Haiku 1: `SagaInstance`, `StepExecutor`, `CompensationRunner` y sus pruebas. Haiku 2: `TypeOrmSagaStore`, entidades, migraciones, `LeaseKeeper`, jobs y `SagaModule`. La guía escribe `SagaEngine` y el contrato de `SagaStore`.

**Cierre de la ola 3:** typecheck global y el general ejecuta las pruebas de integración de los cinco proyectos con Docker (`INTEGRATION_TESTS=require`).

### 3.6 Ola 4: cierre de la base y arranque de F4

#### WP-13. Cierre de la base (M)

- **Carpetas exclusivas:** `backend/libs/contracts/platform/src/{enums,errors}/**`, `backend/libs/platform/primitives/src` (quitar los reexportes), `backend/tools/platform-smoke/**` (proyecto nuevo de tipo `type:tool`), `docs/ARCHITECTURE.md`, `docs/design/f4-identity.md`, `docs/adr/**`, y los tres archivos compartidos.
- **Cierra:** T2 y CTR-1 (limpieza del catálogo central), T9, el cierre de 97 a la lista de excepciones, 2.17 (ADR) y los ajustes a F4 de la sección 4.3.
- **Consume:** todo lo anterior.
- **Produce:** `SmokeAppModule`, que es el ejemplo de la sección 6 compilado y corriendo, con su prueba de integración; el catálogo central solo con códigos transversales; documentación actualizada.
- **Aceptación específica:**
  - `platform-error-code.enum.ts` y `platform-error-catalog.ts` solo tienen códigos públicos y transversales; ningún código observable se perdió (la prueba compara el conjunto de códigos de cada librería antes y después).
  - La prueba de humo, con Postgres de dos shards y Valkey reales (y fakes de SNS y SQS): un caso de uso guarda una entidad y un evento en la misma transacción, el `OutboxRelayJob` lo publica tras el commit, un `@Subscribe` lo consume una sola vez aunque llegue duplicado, una saga de dos pasos termina, un `CacheAside` se invalida tras el commit, y al cerrar la app todos los recursos se liberan sin handles abiertos (`--detectOpenHandles`).
  - `node .claude/skills/backend-estructura/scripts/check-structure.mjs --all .` solo reporta las excepciones declaradas (unas 12, del DSL de contratos y los `main()` de `tools`).
  - `pnpm nx run-many -t lint test typecheck build` sobre todo el backend, con cobertura 80/80/80/75 por proyecto.
  - `contracts-export:check` y `contracts_gen --check` en verde.
- **División:** Haiku 1: limpieza de catálogo, reexportes y la prueba de consistencia de códigos. Haiku 2: `platform-smoke`. La guía revisa documentación y ADR.

## 4. Orden y arranque de F4

### 4.1 Por qué este orden

La tabla de olas y tropas está en el [plan](README.md#orden-de-ejecución-por-olas).

- La ola 0 va primero porque todo lo demás importa `RandomSource`, `Guard`, `Deadline` y los alias. WP-02 y WP-03 no dependen de WP-01 y no comparten archivos con él.
- La ola 1 agrupa lo que solo depende de fundaciones. Observability va con config por el cambio de `LogLevel`; scheduling va con sharding porque ninguno bloquea al otro y messaging necesita el runner en la ola 2.
- La ola 2 pone a persistence lo antes posible porque es la ruta crítica: persistence, luego los stores TypeORM, luego sagas y F4. Messaging e internal-api caben porque dependen de la ola 1 y no entre sí.
- La ola 3 depende de messaging (aws liga sus puertos), de persistence (los stores) y de internal-api (sagas). Los tres paquetes no comparten carpetas: WP-12 es dueño de `adapters/postgres/src/saga/`.
- Las sagas van después de persistence y no al revés porque `TypeOrmSagaStore` necesita el `EntityManager` de la transacción activa.

### 4.2 Cuándo arranca F4

La ola 1 de F4 arranca sobre la nueva base en dos tiempos.

- **Ola 4 del plan:** F4-WP1 (`@platform/auth` y su adaptador Valkey) y F4-WP4 (`@platform/service`). Necesitan `BloomModule`, `ValkeyModule`, `ObservabilityModule`, `PersistenceModule`, `ShardScope`, `MessagingModule`, `InternalApiModule` y `AppConfig`, todos integrados al terminar la ola 3. Corren junto a WP-13 porque no tocan sus carpetas: WP-13 es el único que edita los archivos compartidos y el catálogo.
- **Ola 5 del plan:** F4-WP5 (contrato de identity y front, que sí edita `contracts/platform/src/{enums,errors}`) y F4-WP2 (`@platform/http`). F4-WP5 espera a que WP-13 integre el catálogo limpio, y F4-WP2 espera a F4-WP1 y al `InternalApiController` de WP-08.
- **Ola 6 del plan:** F4-WP6, que necesita WP-2 y WP-4 integrados. Las olas 2 y 3 de F4 siguen el diseño de F4 con tres tropas por ola.

### 4.3 Ajustes que este plan obliga a hacer en el diseño de F4

Se aplican en WP-13.

| Sección de F4                                      | Ajuste                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3 y WP3 (`@platform/rate-limit`)                 | Ya existe y se refactoriza en WP-05 y WP-11. El WP3 de F4 desaparece. Lo que queda de él es solo el mapeo de `RateLimitTier` a reglas, que vive en `@platform/http`.                                                                                                                                                                                                                                                                  |
| 3.4.2 fila 1 (`RequestContextMiddleware`)          | Es de `@platform/observability/nest` (WP-04). WP2 de F4 lo importa.                                                                                                                                                                                                                                                                                                                                                                   |
| 3.4.3 (API interna por HTTP)                       | `InternalApiController`, `HttpTransport` y las clases HMAC son de `@platform/internal-api` (WP-08). WP2 de F4 solo monta el controller sin pasar por `EndpointGuard`.                                                                                                                                                                                                                                                                 |
| 3.4.2 fila 8 (`ProblemDetailsFilter`)              | Usa `ProblemDetailsFactory` (WP-02) y compone el catálogo del servicio con los de las librerías (D2).                                                                                                                                                                                                                                                                                                                                 |
| 3.5 (`@platform/service`)                          | Se adelgaza. `PlatformRuntimeModule` pasa a ser la composición de los módulos de librería (sección 6). `IntervalJob` y `OutboxRelayWorker` desaparecen en favor de `ScheduledJob` y `OutboxRelayJob`. `HealthEndpoints` usa `HealthRegistry`. `runMigrations` delega en `ShardedMigrationRunner`. `ServiceDefinition.migrations` deja de recibir `SqlMigration` y recibe los `DataSource` de referencia. `bootstrapHttp` sigue igual. |
| 3.5 (`databaseConfigSchema`, `valkeyConfigSchema`) | Son las secciones `DatabaseConfig` y `ValkeyConfig` de WP-09 y WP-11.                                                                                                                                                                                                                                                                                                                                                                 |
| 3.6 (`ShardScope`)                                 | Se entrega en WP-09 con la opción `requireScope` y el error `CROSS_SHARD_TX`. Sale del alcance de WP4 de F4.                                                                                                                                                                                                                                                                                                                          |
| 4 y 6.3 (migraciones por módulo)                   | Las migraciones de identity son de TypeORM (diseño aprobado). El reparto de rangos de timestamps por módulo se mantiene.                                                                                                                                                                                                                                                                                                              |
| Operaciones `TenantOnboarding`                     | Usan `SagaModule.forFeature`.                                                                                                                                                                                                                                                                                                                                                                                                         |

## 5. Riesgos, rompimientos y lo que se deja fuera

### 5.1 Riesgos

| Riesgo                                                                                                             | Efecto                                                   | Mitigación                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SWC con decoradores: las entidades de TypeORM y las inyecciones de Nest necesitan metadatos de decoradores en Jest | Pruebas de módulo y de entidades fallan de forma confusa | Cada guía verifica el `.spec.swcrc` de sus proyectos (metadatos de decoradores activos) y deja una prueba mínima de `@Injectable` y, en persistence, de entidad. Referencias circulares entre entidades se resuelven con `Relation<>`. |
| Haiku sigue literal y un esqueleto ambiguo se implementa mal                                                       | Retrabajo                                                | La guía entrega firmas y la prueba de contrato antes de repartir, y revisa cada entrega con el CCE.                                                                                                                                    |
| Cambiar una interfaz en una ola rompe pruebas de librerías que otra tropa ya tocó                                  | Merge costoso                                            | Las interfaces se convierten sin añadir miembros (D1) y los reexportes `@deprecated` viven hasta WP-13.                                                                                                                                |
| La telemetría no instrumenta si se carga después de `http`, `pg` o `iovalkey`                                      | Trazas vacías                                            | `@platform/observability/setup` se mantiene como primera importación (D3) y WP-13 lo verifica en la prueba de humo.                                                                                                                    |
| El cron propio tiene errores de calendario                                                                         | Un job corre a deshora                                   | Cuatro casos de borde en `it.each` (cambio de año, 29 de febrero, domingo, segundos) y solo UTC.                                                                                                                                       |
| Postgres de contenedor vuelve lentas las pruebas                                                                   | CI más largo                                             | `ContainerRuntime` en modo `skip` por defecto en local; CI usa `require`; las pruebas de integración se limitan a los contratos de los stores y a la prueba de humo.                                                                   |
| Orden de apagado de Nest (los hooks de módulos hermanos no tienen orden garantizado)                               | Un cliente se cierra antes que su consumidor             | Detener productores en `beforeApplicationShutdown` y cerrar recursos en `onModuleDestroy` (D3); la prueba de humo lo comprueba.                                                                                                        |
| El cableado de módulos solo se prueba de verdad en la ola 4                                                        | Errores tardíos de composición                           | Cada ola 1 a 3 cierra con una prueba de arranque de los módulos ya integrados, y WP-13 reserva tiempo para correcciones.                                                                                                               |
| Doble regla de patrón de código                                                                                    | Un código válido en un sitio y no en otro                | Prueba de consistencia en `primitives` que recorre todos los catálogos.                                                                                                                                                                |
| Tres tropas editan el mismo `index.ts` de una librería                                                             | Conflictos                                               | Cada librería tiene un solo dueño por ola; `index.ts` lo edita su dueño.                                                                                                                                                               |

### 5.2 Cambios que rompen API

Ninguno afecta a un servicio, porque no hay `backend/apps`. Afectan a F4, que se construye después.

- Puertos de transacción e idempotencia: de `@platform/primitives` a `@platform/kernel`. Reexporte hasta WP-13.
- `Clock`, `IdGenerator`, `TransactionManager`, `IdempotencyStore`, `CachePort`, `LoggerPort`, `MetricsPort`, `OutboxStore` y los demás puertos pasan de interfaz a clase abstracta. Quien los implementa con `implements` no cambia; quien usaba la interfaz como tipo no cambia.
- `LogLevel` sale de `@platform/config` y vive solo en `@platform/observability`.
- `ResiliencePolicyName` (enum) se reemplaza por `PolicyName`; se borran `Ai`, `AiStreaming` y `Email`.
- `RequestContext` estático pasa a `RequestContextStore` inyectable. Los usos de `RequestContext.current()` en persistence, saga e internal-api se actualizan en sus olas.
- `setupTelemetry` y `telemetryOptionsFromConfig` se reemplazan por `TelemetryBootstrap`.
- `CacheAside`: desaparecen las opciones `random`, `singleFlight`, `maxValueBytes` y `InvalidateOptions.afterCommit`.
- `OutboxRelayOptions.backoff` (el tipo antiguo), `newId` y `now` de `createEnvelope`.
- Messaging: `createEnvelope`, `parseEnvelope` y `toWireEnvelope` pasan a `EnvelopeFactory` y `EnvelopeParser`; `TenantVerifier` de función a clase.
- `InternalClient`: se pierden las opciones `sleep`, `random` y `clock`.
- `createPersistence`, `Database`, `SqlSession`, `BaseRepository` sobre `pg` y `SqlMigration`: reemplazados por TypeORM (diseño aprobado). Los stores de `adapters-postgres` cambian de nombre (`Postgres*Store` a `TypeOrm*Store`).
- `InMemory*` sale de los índices públicos (D9).
- Los códigos de error observables no cambian de valor.
- `@shared/utils` desaparece y `Money` pasa al kernel.
- Variables de entorno: `POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION` y `VALKEY_INTEGRATION` se reemplazan por `INTEGRATION_TESTS`.

### 5.3 Lo que se deja fuera

| Qué                                               | Motivo                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SecretsProvider` con AWS Secrets Manager (CFG-5) | Es una función nueva sin consumidor hoy. Entra con F12, cuando Terraform y las librerías alineen variables.                    |
| `ValkeyIdempotencyStore` (VLK-4)                  | Decisión de producto, sin consumidor.                                                                                          |
| Borrar el DSL de topología de messaging (MSG-4)   | Rompe unas 36 pruebas y el valor es de limpieza. Se retoma cuando exista un segundo consumidor o un servicio real que lo pida. |
| Decorador `@Resilient`                            | `registry.execute` basta y un decorador esconde la política. La skill lo documenta como única vía.                             |
| Firmador SigV4 para la API interna                | Es de F12. El puerto `InternalCallSigner` ya lo permite.                                                                       |
| Generador de apps y módulos (F11)                 | Tiene alcance propio. Este plan deja el `AppModule` de ejemplo como referencia.                                                |
| Mover `LruMap` a primitives                       | Solo lo usa sharding. Queda interno a `PlacementCache`.                                                                        |
| `AWS Step Functions` como orquestador             | Ya descartado en el diseño aprobado.                                                                                           |
| Tocar el front                                    | Ningún cambio de este plan altera la forma de un contrato, así que no hay que regenerar el Dart. F4-WP5 sí lo hará después.    |

## 6. Guía para cablear un servicio nuevo

### 6.1 Arranque

`main.ts` carga primero la telemetría y recién después NestJS:

```ts
// backend/apps/identity/src/main.ts
import './instrumentation.js'; // TelemetryBootstrap.start(process.env)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks(); // dispara BeforeApplicationShutdown, OnModuleDestroy y OnApplicationShutdown
await app.listen(3000);
```

### 6.2 `AppModule` de ejemplo

El servicio nombra los adaptadores que quiere; las librerías del núcleo nunca los importan. Quitar una línea quita una capacidad.

```ts
@Module({
  imports: [
    // Configuración propia del servicio. Las librerías traen sus secciones.
    ConfigModule.forRoot({ schema: identityConfigSchema }),

    ObservabilityModule.forRoot(),
    ResilienceModule.forRoot(),
    SchedulingModule.forRoot({ mode: SchedulingMode.InProcess }),

    // Adaptadores de infraestructura.
    ValkeyModule.forRoot(),
    AwsModule.forRoot(),
    PersistenceModule.forRoot(),
    PostgresPlatformModule.forRoot(),

    // Núcleo, con el adaptador elegido por `Type<Port>`.
    ShardingModule.forRoot({
      routingCache: ValkeyRoutingCache,
      channel: ValkeyShardDirectoryChannel,
      directory: TypeOrmDirectoryStore,
    }),
    CacheModule.forRoot({ store: ValkeyCache }),
    RateLimitModule.forRoot({
      limiter: ValkeyRateLimiter,
      degradeLocally: true,
    }),
    MessagingModule.forRoot({
      topology: identityTopology,
      outboxStore: TypeOrmOutboxStore,
      processedStore: TypeOrmProcessedMessageStore,
      bus: SnsSqsMessageBus,
      relay: true, // registra OutboxRelayJob y las retenciones
    }),
    InternalApiModule.forRoot({
      transport: InternalTransportKind.Http,
      processedStore: TypeOrmIdempotencyStore,
    }),
    SagaModule.forRoot({ store: TypeOrmSagaStore }),

    // Módulos de negocio.
    UsersModule,
  ],
})
export class AppModule {}
```

Sin Valkey (modo local con una sola instancia), el servicio omite `ValkeyModule` y deja `CacheModule.forRoot()` y `RateLimitModule.forRoot()` sin opciones: usan `InMemoryCache` e `InMemoryRateLimiter`, y `ShardingModule` usa `NullRoutingCache` e `InProcessDirectoryChannel`. Los jobs exclusivos usan `InProcessJobLock`.

### 6.3 Módulo de negocio

Cada módulo registra lo suyo con `forFeature` y deja que el explorador encuentre los consumidores y handlers:

```ts
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [UserEntity],
      sharding: { key: ShardKey.User },
    }),
    CacheModule.forFeature({ namespace: CacheNamespace.Users, ttlMs: 60_000 }),
    SagaModule.forFeature([CreateTenantSaga]),
    ResilienceModule.forFeature({
      name: PolicyName.of('mailer'),
      policy: mailerPolicy,
    }),
  ],
  providers: [
    UserMapper,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    RegisterUser, // caso de uso
    WelcomeEmailConsumer, // clase con @Subscribe
    CreateTenantHandler, // clase con @InternalHandler
    BloomRebuildUsersJob, // un ScheduledJob propio: el runner lo descubre
  ],
})
export class UsersModule {}
```

### 6.4 Checklist de un servicio nuevo

1. `instrumentation.ts` primero y `app.enableShutdownHooks()`.
2. Un enum por cada evento, error, permiso, cola y job del servicio, y un catálogo de errores propio que el `ErrorCatalogRegistry` compone con `platformErrorCatalog` y los de las librerías usadas.
3. Entidades y migraciones generadas con `pnpm nx run <servicio>:migration-generate`; `synchronize` apagado.
4. Consumidores con `@Subscribe` y handlers con `@InternalHandler` en `presentation/`; el caso de uso se inyecta, no se escribe lógica en la clase.
5. Un `forFeature` por módulo de negocio y ninguna instancia con `new` de una clase de plataforma.
6. Una prueba de módulo con `@nestjs/testing` y los dobles de `@platform/<lib>/test-utils`; las pruebas de integración se llaman `.int-spec.ts`.
7. `pnpm nx run-many -t lint test typecheck --projects=<servicio>` y `node .claude/skills/backend-estructura/scripts/check-structure.mjs --changed .` en verde, con cobertura 80/80/80/75.
