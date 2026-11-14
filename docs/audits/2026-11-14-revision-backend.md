# Revisión de las librerías del backend de node_template

Revisión de solo lectura de `backend/libs` y `backend/tools` contra las skills `backend-*`, contra las tres exigencias del usuario (código enterprise, TypeORM, fácil de usar) y contra lo ya decidido (persistencia con TypeORM y sagas rediseñadas).

Todas las rutas son relativas a `/Users/jonatan/Documents/projects/node_template/backend`. Esfuerzo: S (menos de medio día), M (uno a tres días), L (más de tres días).

## 0. Lectura rápida

El código es disciplinado en lo pequeño: el reloj y los ids se inyectan, no hay `any`, no hay `eslint-disable`, `process.env` solo se lee en `config`, y la mayoría de las piezas con estado ya son clases. Los problemas son de forma y de ensamblaje, no de cuidado.

Hay cinco problemas de fondo.

1. **No existe capa NestJS en ninguna librería.** No hay un solo `@Module`, `@Injectable`, token ni hook de ciclo de vida en `libs/`, y `@nestjs/*` ni siquiera está en `package.json`. Un servicio nuevo tiene que armar a mano `new JsonLogger(...)`, `new ResilienceRegistry(...)`, `new OutboxRelay(...)` y cerrar él mismo los clientes. Es la brecha más grande frente a "fácil de usar".
2. **Las dependencias entre librerías van en sentido equivocado en tres puntos.** `kernel` importa `@contracts/platform`; `observability` importa `config` solo por un enum; `contracts/platform` contiene el catálogo de errores internos de todas las librerías.
3. **Duplicación sistemática.** Hay dos enums de códigos de error por librería (el propio y `PlatformErrorCode`), cuatro implementaciones de espera con plazo, cuatro modelos de política de reintentos y cuatro copias de la detección de Docker.
4. **Puertos completos pero sin quien los ponga a andar.** El relay del outbox, el job de recuperación de sagas, la reconstrucción de filtros bloom y la limpieza de idempotencia existen como métodos `runOnce` o `purge`, pero nadie los programa. El transporte de `internal-api` solo tiene la versión en proceso.
5. **Dobles de prueba dentro del código de producción.** Ocho clases `InMemory*` salen por el `index.ts` público. Solo `rate-limit` sigue la regla de la skill (`@platform/rate-limit/test-utils`).

Archivos por encima de 400 líneas (sin contar pruebas): `saga/engine/saga-engine.ts` 1093, `sharding/shard-router.ts` 733, `persistence/repository/base-repository.ts` 678, `messaging/dispatch/message-dispatcher.ts` 601, `internal-api/router.ts` 537, `resilience/registry.ts` 532, `contracts/platform/errors/platform-error-catalog.ts` 521, `adapters/aws/sqs-delivery-runner.ts` 503, `persistence/database.ts` 417, `messaging/topology/topology.ts` 401. Las pruebas tienen cuatro archivos de más de 790 líneas.

---

## 1. Hallazgos transversales

Se numeran con T. Cada sección por librería remite a ellos en vez de repetirlos.

### T1. Falta la capa de composición de NestJS (impacto alto, esfuerzo L)

Ningún archivo de `libs/` usa NestJS. La skill `backend-nestjs-composicion` exige un módulo por pieza, tokens por puerto, `useFactory` con configuración y cierre ordenado. Hoy:

- Cada librería expone clases con un objeto `options` enorme y deja el armado al servicio.
- Los puertos son a veces interfaces (`CachePort`, `LoggerPort`, `MetricsPort`, `IdempotencyStore`, `OutboxStore`) y a veces clases abstractas (`RateLimiter`). Sin interfaz más `Symbol` no se pueden inyectar. No hay un archivo de tokens en ninguna librería.
- Ningún adaptador cierra sus recursos: `aws-clients.ts:29` pide llamar `destroyAwsMessagingClients` a mano, Valkey no tiene `quit`, `SqsDeliveryRunner.start/stop` y `SagaRecoveryJob.runOnce` no cuelgan de `onModuleInit/Destroy`.
- No hay `HealthIndicator` ni método `check()` en cache, Valkey, Postgres ni SQS, y la skill de observabilidad exige `/health/ready`.

Propuesta, común a todas las librerías:

- Cada librería con wiring gana una carpeta `src/nest/` con `<Lib>Module`, expuesta como sub-entrada `@platform/<lib>/nest`. El núcleo de la librería sigue sin importar NestJS; solo el sub-entrada lo hace. Así `domain/` y `kernel` se mantienen limpios y los adaptadores pueden depender del núcleo de otra librería sin arrastrar NestJS.
- Convención de módulo: `forRoot(options?)` para lo global de plataforma con valores por defecto sacados de `AppConfig`, `forRootAsync({ inject, useFactory })` para quien arma la opción con su configuración, y `forFeature(...)` cuando el servicio registra algo propio (un consumidor, una definición de saga, una política de resiliencia).
- Un archivo `tokens.ts` por librería con los `Symbol` exportados junto al puerto. Regla: abstracta para puertos con una implementación activa por servicio (`RateLimiter`, `CachePort`), `Symbol` solo cuando conviven varias.
- Cada recurso abierto implementa `OnModuleDestroy`; cada adaptador de red expone `HealthCheckable.check(): Promise<HealthStatus>` y un `HealthModule` de plataforma los agrega.

Uso objetivo, que debe bastar para un servicio nuevo:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ schema: serviceConfigSchema }),
    ObservabilityModule.forRoot(),
    ResilienceModule.forRoot(),
    MessagingModule.forRoot({ topology: identityTopology }),
    ValkeyModule.forRoot(),
    CacheModule.forFeature({ namespace: 'identity' }),
  ],
})
export class AppModule {}
```

### T2. Dos fuentes de verdad para los códigos de error (impacto alto, esfuerzo M)

Seis librerías declaran su propio enum de códigos con los mismos valores que `PlatformErrorCode`: `CacheErrorCode` (`cache/src/errors.ts:5`), `BloomErrorCode` (`bloom/src/bloom-error.ts:4`), `ConfigErrorCode` (`config/src/errors.ts:5`), `ShardingErrorCode` (`sharding/src/errors.ts:5`), `ValkeyErrorCode` (`adapters/valkey/src/valkey-error.ts:5`), `CriteriaErrorCode` (`criteria/src/enums.ts:37`). Las demás (primitives, messaging, saga, internal-api, persistence, resilience) usan `PlatformErrorCode` directamente. Un código nuevo exige tocar dos sitios y nada impide que diverjan.

Además `contracts/platform/src/errors/platform-error-catalog.ts` (521 líneas) lista las entradas de todas las librerías, más de 70 internas frente a 29 públicas. El contrato de plataforma queda conociendo `saga`, `bloom` o `valkey`, que es una dependencia al revés.

Propuesta:

- Un único enum por librería, el local, con el formato `PLATFORM.<LIB>.<ERROR>`. `PlatformErrorCode` conserva solo los códigos transversales y públicos (validación, auth, rate limit, not found, conflicto, internal).
- Cada librería declara su propio `ErrorCatalog` (clase de `@contracts/platform/kit`) con `httpStatus`, `retryable` y `audience`, y `defineServiceContract` los compone. El catálogo público que va al front sigue saliendo de contracts y no incluye lo interno.
- Se borra la clase base repetida: `CacheError`, `BloomError`, `SagaError`, `MessagingError`, `PersistenceError`, `ShardingError`, `ConfigValidationError` y `InternalApiError` comparten el patrón `code + failureKind`. Una sola `PlatformError` con `failureKind` obligatorio en el kernel (ver KRN-2) elimina `abstract readonly failureKind` repetido en cada subclase.

### T3. Cuatro implementaciones de "espera con plazo" y cuatro modelos de reintento (impacto medio, esfuerzo M)

- Esperar una promesa con señal y plazo: `primitives/src/timers.ts:123` (`raceDeadline`), `cache/src/wait.ts:11-78` (`waitFor`, `cancellation`, `abortReason` copiado), `sharding/src/lookup-budget.ts:9` (`LookupBudget`, con `MAX_TIMER_MS` copiado) y `adapters/aws/src/sqs-delivery-runner.ts:130` (`sleep` propio). `abortReason` aparece en `timers.ts:19` y `wait.ts:15`.
- Reintentos con backoff: `internal-api/src/client.ts:114` (bucle propio con `sleep` y `random` inyectables), `resilience/registry.ts:293`, `messaging/topology/retry-policy.ts:37` (`RetryPolicy` con `jitter`), `saga/engine/engine-setup.ts:22` (`defaultBackoff`). Hay cuatro formas de declarar la política: `RetryPolicy` de internal-api (`contract.ts:19`), `RetryPolicy` de messaging, `ResilienceRetryConfig` y `OperationRetryPolicy` de contracts. Dos exportan además `DEFAULT_RETRY_POLICY` con valores distintos (`internal-api/contract.ts:60` y `messaging/topology/queue-def.ts:37`).
- La skill de observabilidad dice "se usa `@platform/resilience`, no bucles propios". El único consumidor real de `resilience` es `cache`; las políticas `Database`, `ExternalApi`, `Ai`, `AiStreaming`, `Email` y `Queue` no las usa nadie.

Propuesta: una clase `Deadline` con `race(work)` y `wait(promise)` en `primitives` sustituye a `wait.ts` y `LookupBudget`. `InternalClient` y `SqsDeliveryRunner` delegan los reintentos en `ResilienceRegistry` con políticas nombradas. Una sola `RetryPolicy` (`maxAttempts`, `baseMs`, `maxMs`, `strategy`) vive en `primitives` y las otras tres la reutilizan.

### T4. Fuente de aleatoriedad sin puerto (impacto bajo, esfuerzo S)

Cinco clases reciben `random?: () => number` con `Math.random` por defecto: `primitives/backoff.ts:85`, `cache/cache-aside.ts:134`, `cache/jittered-ttl.ts:17`, `resilience/registry.ts:176`, `internal-api/client.ts:127`, `observability/sampling.ts:8`. Y tres usan `randomUUID` o `randomBytes` directo (`cache/versioned-keyspace.ts:67,73,78`, `observability/trace.ts:85`). Propuesta: `RandomSource` en el kernel (`next(): number`, `SystemRandomSource`) y `IdGenerator` para los tokens. Se eliminan siete opciones de constructor que nadie usa en producción.

### T5. Dobles de prueba en el índice público (impacto medio, esfuerzo M)

Salen por `index.ts`: `InMemoryBus` (228 líneas), `InMemoryOutboxStore` (193), `InMemorySagaStore` (205), `InMemoryIdempotencyStore` (123), `InMemoryProcessedMessageStore`, `InMemoryProcessedOperationStore`, `InMemoryDirectoryStore`, `InMemoryRoutingCache`, `InMemoryShardDirectoryChannel`, `InMemoryMetrics`, `NoopMetrics`. La skill de pruebas pide fakes como clases con la misma prueba de contrato, en `__tests__/utils/` y expuestos por `@platform/<lib>/test-utils`. Solo `kernel` y `rate-limit` lo hacen.

Excepciones legítimas que se quedan en producción porque sirven de degradación o de modo local: `InMemoryCache` (único modo sin Valkey), `InMemoryRateLimiter` (lo usa `DegradingRateLimiter`), `NoopMetrics`.

Propuesta: mover el resto a `src/__tests__/utils/` y registrar alias `@platform/<lib>/test-utils` en `tsconfig.base.json`. Cada fake debe pasar el mismo `run<Port>Contract(factory)` que su adaptador real. Hoy `adapters/postgres/src/__tests__/utils/outbox-contract.ts` e `idempotency-contract.ts` ya existen y son el modelo.

### T6. Detección de Docker repetida cuatro veces (impacto bajo, esfuerzo S)

`adapters/postgres/src/__tests__/utils/docker.ts`, `persistence/src/__tests__/utils/docker.ts`, y dos copias inline en `adapters/valkey/src/__tests__/valkey.integration.spec.ts:38` y `adapters/aws/src/__tests__/sns-sqs.integration.spec.ts`. Cada una con su propia bandera (`POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION`, `VALKEY_INTEGRATION`, otra en aws) y su propia política en CI. Propuesta: una clase `ContainerRuntime` en `kernel/src/__tests__/utils/` (alias existente `@platform/kernel/test-utils`) con `isAvailable()`, `describeIfAvailable` y una sola variable `INTEGRATION_TESTS=skip|require`. Las cuatro copias se borran.

### T7. Funciones de validación copiadas (impacto bajo, esfuerzo S)

`assertNonNegativeFinite` en `primitives/backoff.ts:31` e `idempotency-store.ts:84`; `assertBudget` en `deadline.ts:5`; `assertCapacity` (`sharding/lru-map.ts`), `assertTtl` (`shard-router.ts:210`), `assertLease` (`message-dispatcher.ts:235`), `assertPositiveInteger` (`outbox-relay.ts:101`), `assertFinite` (`resilience/config.ts`), `assertIntegerInRange` (`bloom/limits.ts:21`), `assertIdentifier` (en `criteria/validation.ts` y `persistence/table-definition.ts`), `isPositiveInt` (`contracts/kit/define-messaging.ts:122`), `isPlainObject` (cache, primitives, kernel), `describeError` (`resilience/registry.ts:107` y `messaging/errors/describe-error.ts:2`), `codeOf` (`field-errors.ts` y `message-dispatcher.ts:230`). Cada una lanza un error distinto por librería.

Propuesta: una clase `Guard` en `primitives` (`Guard.positiveInteger(name, value)`, `Guard.finiteAtLeast(...)`, `Guard.inRange(...)`) y una `ErrorDescriptor` (`describe(error)`, `codeOf(error)`) que usan tanto messaging como resilience y metrics.

### T8. Idioma, nombres y un archivo por clase (impacto bajo, esfuerzo M)

- Comentarios en español en `kernel`, `config`, `observability`, `persistence`, `primitives`, `rate-limit`, `adapters/aws`, `adapters/postgres` y `contracts`; en inglés en `bloom`, `cache`, `criteria`, `internal-api`, `messaging`, `resilience`, `saga`, `sharding` y `adapters/valkey`. Las skills y el CLAUDE.md están en español. Se unifica en español al tocar cada archivo.
- Archivos sin sufijo de rol, contra `backend-codigo-enterprise/references/nombres.md`: `shard-router.ts`, `cache-aside.ts`, `topology.ts`, `util.ts` (prohibido por la skill), `types.ts`, `limits.ts`, `model.ts`.
- Varias clases públicas por archivo: `cache/errors.ts` (6), `resilience/errors.ts` (5), `primitives/errors.ts` (4), `bloom/bloom-error.ts` (4), `messaging/topology/route.ts` (4), `observability/telemetry.ts` y `metrics.ts` (3 cada uno).
- Clases de error sin sufijo `Error` en bloom: `InvalidParameters`, `CorruptedData`, `IncompatibleFilters` (`bloom-error.ts:19,26,33`).

### T9. Estructura de pruebas

- `kernel/src/__tests__/utils/__tests__` y `rate-limit/src/__tests__/utils/__tests__` rompen la regla "las pruebas de un utilitario van en el `__tests__` que lo contiene, no anidado dentro de `utils/`".
- Las pruebas de integración de Valkey y AWS se llaman `*.integration.spec.ts`; Jest las toma como unitarias porque terminan en `.spec.ts`. La convención de `jest.preset.js` y de la skill es `.int-spec.ts`.
- Hay solo dos suites `.int-spec.ts` (`persistence`, `adapters/postgres`); `valkey` y `aws` tienen integración con otro nombre. No hay integración de cache o rate-limit contra Valkey real fuera de esas.

---

## 2. Hallazgos por librería

### 2.1 kernel

Pequeña y limpia (369 líneas). Tres puntos.

**KRN-1. Dependencia al revés: `kernel` importa `@contracts/platform` (alto, S).**
`kernel/src/invalid-id.error.ts:1` importa `PlatformErrorCode` solo para un código. La skill dice que el dominio depende solo de `@platform/kernel`, y `kernel` no debería depender de nada. Con T2 (cada librería tiene su enum) el kernel declara `KernelErrorCode.InvalidId` y la dependencia desaparece.

**KRN-2. `failureKind` repetido y desigual (medio, S).**
`DomainError` (`domain-error.ts:19`) calcula `failureKind` desde `retryable`; `PlatformError` (`platform-error.ts:32`) no lo declara, y cada subclase de librería lo declara a mano (`abstract readonly failureKind` en cache, resilience, saga, internal-api, etc.). Propuesta: `PlatformError` recibe `failureKind` en el constructor (valor por defecto `Permanent`, o `Transient` si `retryable`), y las subclases pasan la clase en `super`. Se borran decenas de líneas `readonly failureKind = ...`.

**KRN-3. Código sin uso y funciones sueltas (bajo, S).**

- `result.ts` (36 líneas, funciones `ok`, `err`, `isOk`, `isErr`) no lo importa ninguna otra librería. Compite con `CallOutcome` de primitives y con el `Result` de `internal-api/result.ts`. Se decide uno: `Result<T,E>` como clase con `map`/`unwrap` si lo van a usar los servicios, o se borra.
- `platform-error.ts:8` `isErrorCode` y `:54` `isPlatformError` son funciones sueltas. Pasan a métodos estáticos `PlatformError.is(value)` y `ErrorCode.isValid(value)`. `ERROR_CODE_PATTERN` existe también en `contracts/kit/error-catalog.ts:7` con otra expresión (`^[A-Z]+(\.[A-Z_]+){2}$` frente a `^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$`), así que un código puede pasar en un sitio y fallar en el otro. Una sola, la del kernel.
- `id-generator.ts:22` recibe `nowMs: () => number = Date.now` en vez de un `Clock`, contra el resto del código. Debe recibir `Clock`.
- `Id` envuelve un `ValueObject<{value}>`, pero el código de otras librerías pasa strings. Cuando llegue TypeORM conviene un `IdTransformer` en persistencia para columnas `uuid`.

**KRN-4. Falta lo que los servicios van a necesitar (medio, M).** `UseCase` es una interfaz, no hay `Specification`, ni `DomainEvent` con tipo enum, ni `RandomSource` (T4), ni `HealthCheckable` (T1). Se agregan como interfaces mínimas al kernel.

### 2.2 primitives

1.301 líneas. Mezcla utilidades puras con puertos de otras capas.

**PRM-1. Puertos que no son primitivas (alto, M).** `transaction/transaction-manager.ts` (`TransactionManager`, `UnitOfWork`, `IsolationLevel`) e `idempotency/idempotency-store.ts` (`IdempotencyStore`, `ClaimState`) son puertos de aplicación. `persistence/src/enums.ts:15` redefine `IsolationLevel` con los mismos valores. Propuesta: mover los puertos a `kernel` (o a una nueva carpeta `ports/` del kernel) y dejar en `primitives` solo cálculo (backoff, hash, JSON canónico, deadline). Hay que borrar la copia de persistence al hacer la capa TypeORM.

**PRM-2. Funciones sueltas que deberían ser clases (medio, M).** El script lista `backoff.ts`, `call-outcome.ts`, `canonical-json.ts`, `failure.ts`, `hash.ts`, `idempotency-store.ts` y `timers.ts`. Propuesta concreta:

- `Backoff` (clase con `delay(attempt)`; el constructor valida una vez; `Backoff.fullJitter(...)`, `Backoff.equalJitter(...)`). Sustituye `backoffDelay`, `createBackoff`, `validateBackoffOptions` (`backoff.ts:38,66,100`) y a `defaultBackoff` de saga.
- `FailureClassifier` (inyectable, con las tablas `TRANSIENT_NETWORK_CODES`, `TRANSIENT_STATUS` como constructor con valores por defecto y ampliables por adaptador) sustituye `classifyFailure` e `isTransientError` (`failure.ts:106,133`). Hoy cada adaptador traduce sus errores a `failureKind` por convención; con una clase puede registrar un `FailureRule`.
- `RetryAfterParser` sustituye `retryAfterMs` (`failure.ts:153`, con `nowMs = Date.now()` como valor por defecto, lectura de reloj dentro de la función) y `retryAfterHintMs` de resilience (`transient.ts:61`), que lo envuelve.
- `CanonicalJson` (`canonicalize`, `stringify`, `digest`) y `Hashes` en `hash.ts` (`fnv1a32`, `fnv1a32Hex`).
- `Deadline` ya es clase; absorbe `raceDeadline`, `abortableSleep` y `armTimer` (`timers.ts:29,56,123`) como métodos (T3). `timers.ts:150` usa `Date.now()` en vez del `Clock` del `Deadline`.
- `CallOutcome` (`call-outcome.ts:153`) es un objeto literal con funciones más tipos de unión. Está bien como unión discriminada, pero `fromError` (:123) debería ser un `CallOutcomeFactory` que recibe el `FailureClassifier`, no una función que llama a `classifyFailure` global.

**PRM-3. Tamaños y constantes con sentido pero sin dueño (bajo, S).** `MAX_TIMER_MS` también está en `sharding/lookup-budget.ts:4`; `MAX_CAUSE_DEPTH` y `DEFAULT_RETRY_AFTER_MAX_MS` se reexportan a resilience. `InMemoryIdempotencyStore` (T5) sale al `test-utils`.

### 2.3 criteria

996 líneas. Afectada por la decisión de TypeORM.

**CRI-1. Choca con lo decidido: genera SQL propio (alto, L, lo absorbe el equipo de persistencia).** `sql.ts` (283 líneas, `toSql` de unas 200) y `postgres.ts` producen cadenas con `$n`. Con TypeORM el traductor debe producir un `SelectQueryBuilder` o `FindOptionsWhere`. El AST (`ast.ts`) y la clase `Criteria` (`criteria.ts:186`, builder tipado con `WhereClause`) se conservan: son agnósticos del motor y están bien diseñados. Se reemplaza `toSql` por `TypeOrmCriteriaTranslator` (clase que recibe el `Repository` y una lista blanca de campos).

**CRI-2. Cursor con funciones y el secreto como parámetro (medio, S).** `cursor.ts:66,101` (`encodeCursor`, `decodeCursor`) reciben `CursorOptions` con el secreto en cada llamada; `takePage` (`page.ts:12`) lo reenvía. Propuesta: `CursorCodec` inyectable que se construye con el secreto firmado una vez (desde `AppConfig`), y `PageBuilder` que lo recibe por constructor. El servicio pide `CursorCodec` en lugar de pasar el secreto por cuatro capas.

**CRI-3. Validación con funciones sueltas y error propio (bajo, S).** `validation.ts` agrupa seis `assert*`. Pasan a una clase `CriteriaValidator` o se absorben en `Guard` (T7). `CriteriaError` es el único error de la librería y su enum local duplica `PlatformErrorCode` (T2).

**CRI-4. Dependencia de `@contracts/platform` para `Pagination` (bajo, S).** `validation.ts:1` y `page.ts:1` importan constantes de contrato. Aceptable, pero `Page` debería venir del kernel o definirse aquí y reexportarse a contracts, no al revés.

### 2.4 config

312 líneas. Pequeña, pero hace tres cosas que no le tocan.

**CFG-1. `base-config.ts` mezcla temas ajenos y obliga a todos (alto, S).** `baseConfigSchema` (`base-config.ts:30-59`) mete `DB_LOG_QUERIES`, `DB_SLOW_QUERY_MS`, `OTEL_SDK_DISABLED`, `OTEL_METRIC_EXPORT_INTERVAL` y `LOG_*` en el esquema que extiende todo servicio. Un servicio sin base de datos recibe variables de base de datos. La skill pide config agrupada por tema. Propuesta: esquemas por tema (`serviceConfigSchema`, `loggingConfigSchema`, `telemetryConfigSchema`, `databaseConfigSchema`) que cada módulo aporta con `forRoot()`. El módulo de config los compone y el servicio no escribe `.extend(...)`.

**CFG-2. `LogLevel` vive en config y observability depende de config (medio, S).** `config/src/log-level.ts` y `observability/src/logger.ts:8,13`. Propuesta: el enum va en `observability`; `config` no lo conoce y `loggingConfigSchema` se define en `observability/src/nest/`. Elimina la dependencia `observability -> config`.

**CFG-3. `defineConfig` devuelve un objeto literal y lee `process.env` por defecto (medio, S).** `define-config.ts:20` (`load(env = process.env)`) y `ConfigDefinition` como interfaz de un método. Es una función de fábrica más un singleton de módulo: `awsConfig` (`aws-config.ts:46`), `valkeyConfig` y similares se crean al importar el archivo. Propuesta: `ConfigLoader` (clase) con `load<T>(schema)`; `ConfigModule.forRoot({ schema })` lo ejecuta una vez en el arranque y expone `AppConfig` como provider inmutable, con `ConfigService.get(token)` tipado. Nadie vuelve a leer `process.env`.

**CFG-4. `as unknown as` y fábricas sin clase (bajo, S).** `env.ts:63` usa un cast doble; hay que tipar el `match` con una tupla. `env.ts` (`envBoolean`, `envNumber`, `envList`, `envDuration`) y `secret.ts:52` (`secret()`) son fábricas de esquemas zod. Son aceptables como DSL declarativo (ver sección 3, excepciones), pero `isSecret` y `Secret` con `WeakMap` de módulo (`secret.ts:8`) es estado global; `Secret` puede guardar el valor en un campo privado `#value` y quitar el `WeakMap`.

**CFG-5. Opciones y esquemas que nadie declara (bajo, S).** `Secret` y `secret()` no los usa ninguna librería (valkey, aws y postgres no tienen secretos en esquema aún, y `DB_CREDENTIALS` de Terraform llega sin esquema). Se mantienen por la skill de seguridad pero hace falta un `SecretsProvider` (puerto) con adaptador AWS Secrets Manager; hoy el contrato de variables de Terraform y el de las librerías no coincide (ver auditoría BE-02 del 14 de noviembre).

### 2.5 observability

1.708 líneas. La librería más grande en funciones y en estado global.

**OBS-1. Estado global y APIs estáticas (alto, M).**

- `request-context.ts:76` `const storage = new AsyncLocalStorage()` a nivel de módulo, y `RequestContext` con métodos `static` (`run`, `current`, :99). Cada llamador usa `RequestContext.current()` sin inyección (`logger.ts:106`, `persistence-context.ts`, saga, internal-api).
- `logger.ts:102,105` (`RESERVED_FIELDS`, `contextFields()`) y `logger.ts:258` `defaultSink` escribe a `process.stdout` directo.
- `spans.ts:33` `platformTracer()` y `withSpan` (:79) usan el tracer global de OTel.
- `redaction.ts:22-130`: ocho `Set` y expresiones a nivel de módulo; `redact` y `redactString` son funciones.
- `propagation.ts:33` crea `EXTERNAL_TRACE_ID_KEY` a nivel de módulo.

Propuesta de clases:

- `RequestContextStore` (inyectable, envuelve el `AsyncLocalStorage`; `run(init, fn)`, `current()`). El `AsyncLocalStorage` queda como campo privado. Un `RequestContextInterceptor` y un `RequestContextMiddleware` de NestJS lo alimentan.
- `Tracing` (clase con `withSpan(name, fn, options)` y `current()`), inyectable con el `Tracer`.
- `Redactor` (clase) con `redact(value)`, `redactString(text)`; sus listas de palabras entran por constructor con valores por defecto y se pueden ampliar por servicio.
- `StructuredLogger` (implementa `LoggerPort`) con dos destinos como estrategia, no con un `if` interno: `StdoutLogSink` y `OtlpLogSink` (`LogSink.write(record)`). Quita `LogDestination` y `logDestinationFor` (`logger.ts:45,60`) y las ramas `this.otel !== undefined`.

**OBS-2. `metrics.ts` mezcla puerto, tres adaptadores y listeners acoplados a otras librerías (alto, M).** 263 líneas con `MetricsPort`, `NoopMetrics`, `InMemoryMetrics`, `OtelMetrics`, y `resilienceMetricsListener` (:174, con una interfaz espejo `ResilienceMetricEvent` para no depender de resilience), `cacheErrorMetricsReporter` (:236), `recordCacheLookup` (:249) y `recordError` (:261). Observability conoce las métricas de cache y de resilience, que es un acoplamiento invertido. Propuesta: observability solo tiene `MetricsPort`, `OtelMetrics`, `NoopMetrics` y `ErrorMetricAttributes`. `resilience` publica un `ResilienceEventListener` que recibe un `MetricsPort`; `cache` publica `CacheMetrics`. Cada librería depende de observability, no al revés. `InMemoryMetrics` va a `test-utils` (T5).

**OBS-3. `telemetry.ts` con 337 líneas y cuatro responsabilidades (medio, M).** `UuidV7TraceIdGenerator`, `ExternalTraceIdSpanProcessor`, `IovalkeyInstrumentation` y la función `setupTelemetry` (:243) más `telemetryOptionsFromConfig` (:316) en un archivo. Propuesta: una clase por archivo y un `TelemetryBootstrap` (clase con `start()` y `shutdown()`) que implementa `OnApplicationShutdown`. `setupTelemetry` devuelve un objeto literal `Telemetry`; pasa a ser el propio `TelemetryBootstrap`. `ObservabilityModule.forRoot()` lo arranca con valores por defecto desde `AppConfig`. Hoy el servicio debe llamar a `setupTelemetry` en `main.ts` antes de importar nada, y el sub-entrada `@platform/observability/setup` existe solo por eso.

**OBS-4. Funciones de `trace.ts` y `propagation.ts` (bajo, S).** `isTraceId`, `normalizeTraceId`, `parseTraceparent`, `formatTraceparent`, `newTraceId`, `newSpanId` son utilidades puras de formato, pero `newTraceId` (`trace.ts:79`) crea un `new UuidV7IdGenerator()` como valor por defecto (instancia compartida a la vista) y `newSpanId` (:84) usa `randomBytes`. Se agrupan en `TraceContextCodec` y reciben `IdGenerator`/`RandomSource`.

**OBS-5. Código de métricas de errores duplicado (bajo, S).** `metrics.ts:204` (`errorMetricAttributes`) y `spans.ts:42` (`recordSpanError`) extraen `code`/`name` del error con lógica parecida, y `call-outcome.ts:102` (`reasonOf`) una tercera vez. Va a `ErrorDescriptor` (T7).

### 2.6 cache

840 líneas. Bien pensada; las costuras son de cableado.

**CAC-1. `CacheAside` pide demasiado cableado (alto, M).** `cache-aside.ts:153` recibe `CachePort`, `VersionedKeyspace` y un objeto con `resilience`, `transactions`, `singleFlight`, `random`, `onError`, `dependencyKey`, `maxValueBytes`. Para usarlo hay que construir `ResilienceRegistry`, un `CacheTransactionScope`, un `VersionedKeyspace` y un `SingleFlight`. Propuesta: `CacheModule.forRoot()` (por defecto `InMemoryCache` o `ValkeyCache` según config, `SingleFlight` y `ResilienceRegistry` compartidos) y `CacheModule.forFeature({ namespace, ttlMs })` que registra un `CacheAside` listo para inyectar. `onError` pasa a un `CacheErrorReporter` (puerto, con adaptador de métricas), y se borran `random`, `singleFlight` y `maxValueBytes` de la opción pública (nadie los cambia fuera de pruebas).

**CAC-2. Reimplementa lo que ya hay en primitives (medio, S).** `wait.ts` (78 líneas) duplica `raceDeadline` y `abortReason` (T3). `jittered-ttl.ts` replica `boundedRandom` de `backoff.ts:54` (T4). `stable-hash.ts:58` tiene `isPlainObject`, que está también en `canonical-json.ts` y `value-object.ts`. Propuesta: `stable-hash.ts` pasa a llamar a `CanonicalJson.digest` de primitives (la misma serialización canónica) y se borra.

**CAC-3. La invalidación con `afterCommit` como callback (medio, S).** `InvalidateOptions.afterCommit?: (fn) => void` (`cache-aside.ts:94`) y `CacheTransactionScope.isInTransaction()` (:36) reinventan una parte del `TransactionManager`. Con `TransactionManager` inyectado (que ya expone `afterCommit` e `isInTransaction`), `invalidate(namespace)` hace las dos cosas sin que el llamador pase una función. Se borran `CacheTransactionScope` e `InvalidateOptions`.

**CAC-4. Funciones sueltas y errores (bajo, S).** El script señala `jittered-ttl.ts`, `stable-hash.ts` y `wait.ts`. `jitteredTtl` → `TtlJitter` (clase con `RandomSource`). `errors.ts` repite cinco clases con el patrón de T2.

**CAC-5. `VersionedKeyspace` usa `randomUUID` directo (bajo, S).** `versioned-keyspace.ts:67,73,78` (T4): recibe `IdGenerator`.

### 2.7 bloom

681 líneas. Autocontenida y de buen nivel; hay tres piezas sin uso.

**BLO-1. `BloomFilterDefinition.rebuildCron` y `resolveBloomFilterDefinition` no tienen consumidor (alto, S).** `bloom-filter-definition.ts:42,50` validan una expresión cron que nadie programa. Nada reconstruye el filtro. Se necesita un `BloomRebuildJob` (clase con `BloomFilterRegistry` y fuente de datos inyectada) dentro del módulo de NestJS, con un puerto `JobScheduler` de plataforma que hoy no existe. Si el programador de jobs va a ser el de `@nestjs/schedule`, `rebuildCron` se pasa tal cual al decorador; si no, se borra el campo. Hoy es una opción que nadie usa.

**BLO-2. Funciones sueltas (medio, S).** El script marca `bloom-filter-definition.ts`, `hashing.ts`, `limits.ts`, `optimal-parameters.ts`, `partitioned-bloom-filter.ts` y `positions.ts`. `murmur3_32` (nombre con guion bajo contra la convención de nombres), `bloomPositions`, `requiredBits`, `optimalParameters`, `partitionCount`, `partitionOf` y `assertIntegerInRange` pasan a una clase `BloomMath` (estática y pura, justificada) y a `BloomSizing`. `partitionOf` también existe en `adapters/aws/messaging-names.ts:11` con otro significado (partición del ARN); renombrar el de AWS a `awsPartitionFor`.

**BLO-3. Sin módulo ni punto único (medio, M).** Para usar un filtro un servicio construye `BloomFilter`, o `ValkeyBloomFilter`, o `PartitionedBloomFilter`, según tamaño. Propuesta: `BloomModule.forFeature({ name, expectedItems, falsePositiveRate })` registra un `AsyncBloomFilter` con token por nombre y elige particionado si `expectedItems` lo exige.

**BLO-4. Nombres de error (bajo, S).** T8.

### 2.8 sharding

2.140 líneas. Afectada por la decisión de persistencia, porque la capa TypeORM de sharding la consume.

**SHD-1. `ShardRouter` hace demasiado (alto, L).** `shard-router.ts` tiene 733 líneas, 14 campos privados y un constructor con 12 opciones (`:264`). Mezcla: resolución, caché local con LRU, caché compartida con versiones y lápidas, tabla de invalidaciones con secuencia, deduplicación de cargas en vuelo y publicación de cambios. Propuesta de colaboradores con constructor propio:

- `ShardRouter` (solo `resolve` y `assertWritable`),
- `PlacementCache` (LRU local más `RoutingCache` compartida, con lápidas y versión mínima),
- `InvalidationLog`,
- `PlacementLoader` (carga en vuelo compartida con `LookupBudget`),
- `DirectoryChangeApplier`.
  Debe quedar cada uno bajo 200 líneas. La API pública (`resolve`, `invalidate`, `applyDirectoryChange`) no cambia, para no romper a persistencia.

**SHD-2. Funciones sueltas de configuración (medio, S).** El script marca `clock.ts`, `directory-changes.ts`, `lru-map.ts`, `placement-codec.ts`, `placement-policy.ts` y `sharding-feature.ts`. `nowMs(clock)` (`clock.ts:5`) es una función de una línea que se usa solo en el router; se borra. `validateShardingFeature` y `routingKeyFor` (`sharding-feature.ts:26,48`) pasan a `ShardingFeature` (clase inmutable con `validate()` y `keyFor(context)`). `LruMap` es una utilidad general que solo usa sharding: se mueve a `primitives` como `LruCache` o se queda como clase interna. `encodePlacement/decodePlacement` → `PlacementCodec` (clase; hoy usa un `Set` de módulo, `placement-codec.ts`).

**SHD-3. `LookupBudget` duplica espera con plazo (medio, S).** T3. `lookup-budget.ts:4` copia `MAX_TIMER_MS`.

**SHD-4. Comentarios obsoletos y documentación de algo inexistente (bajo, S).** `ports.ts:3` dice que el Postgres del directorio pertenece a `@platform/persistence`; vive en `adapters/postgres`. `types.ts:12` documenta `PersistenceModule.forFeature({ sharding: ... })`, que no existe. La decisión de TypeORM dará ese módulo; hasta entonces el comentario miente.

**SHD-5. Constante de tenant con dos valores (medio, S).** `MAX_TENANT_ID_LENGTH = 64` en `shard-router.ts:45` y `128` en `internal-api/limits.ts:8` y `messaging/envelope/message-envelope.ts:30`. Un tenant de 100 caracteres entra por mensajería y falla en el router. Una constante en `kernel` (`TenantId` como `ValueObject`).

**SHD-6. Ports con solo implementación en memoria o en un único adaptador (medio, M).** `DirectoryStore`/`DirectoryWriter`: Postgres (`adapters/postgres`) más memoria; `RoutingCache`: Valkey más memoria; `ShardDirectoryChangeSubscriber`/`Publisher`: Valkey Pub/Sub más memoria. Están implementados de verdad. Lo que falta es el job que consume `DirectoryWriter` (el alta y el traslado de tenants son sagas que nadie ha escrito) y quien llama a `ShardRouter.applyDirectoryChange` al arrancar (suscripción a `ValkeyShardDirectoryChannel` desde `onModuleInit`). Propuesta para el equipo de persistencia: `ShardingModule.forRoot()` conecta canal, router y directorio.

### 2.9 resilience

1.156 líneas. Bien hecha pero con un solo consumidor.

**RES-1. `ResiliencePolicyName` es un enum cerrado con políticas sin uso (alto, S).** `policy-name.ts:2-10` fija `Database`, `Cache`, `ExternalApi`, `Ai`, `AiStreaming`, `Email`, `Queue`, y `config.ts` trae valores para todas. Solo `Cache` tiene consumidor. Un servicio que necesite otra política tiene que editar la librería. Propuesta: el nombre es un `string` brand o un token creado con `ResiliencePolicy.named('payments')`; la librería trae solo `Cache` y `Database` por defecto; cada módulo registra la suya con `ResilienceModule.forFeature({ name, policy })`. Se borran `Ai`, `AiStreaming`, `Email` hasta que haya un adaptador.

**RES-2. `ResilienceRegistry` con 532 líneas y estado mutable compartido (medio, M).** `registry.ts:153`: `configs`, `entries` y `listeners` en la misma clase que hace `execute`, bulkhead, reintentos, tiempo por intento y emisión. Se parte en `PolicyRegistry` (resolución de política y entradas), `PolicyExecutor` (`runAttempts`, `runTimedAttempt`, `shouldRetry`) y `ResilienceEventBus` (listeners). `Bulkhead` y `CircuitBreaker` ya son clases.

**RES-3. Funciones sueltas y duplicado (bajo, S).** `config.ts` y `transient.ts` en la lista del script: `retryAfterHintMs` (T2/PRM-2), `assertFinite`. `describeError` (`registry.ts:107`) repetida (T7). `registry.ts:176` y `:48` aceptan `random` (T4).

**RES-4. Sin cableado (medio, S).** T1. Para que `internal-api`, `aws` y Valkey la usen hay que exponer `ResilienceModule` global con `Database` y `Cache` y un decorador `@Resilient(policyName)` opcional (la auditoría anterior lo vio como código obsoleto; si no hay decorador se documenta `registry.execute` como única vía).

### 2.10 messaging

3.129 líneas. La librería más completa; sus dos huecos son de operación.

**MSG-1. Nadie ejecuta el relay del outbox ni limpia el outbox (alto, M).** `OutboxRelay.relayOnce` (`outbox-relay.ts:150`) procesa un lote; en todo el repo solo lo llama la documentación (`outbox-message-bus.ts:29`: "por ejemplo `() => relay.relayOnce()`"). El `PostgresOutboxStore.purge` y `PostgresIdempotencyStore.purgeCompleted` tampoco tienen job. Propuesta: `OutboxRelayRunner` (clase con bucle, `start()/stop()`, intervalo y `unref`, enganchada a `onApplicationBootstrap/BeforeApplicationShutdown`), `OutboxRetentionJob` y `IdempotencyRetentionJob`. El runner despierta con `OutboxMessageBus` (el `onAppended` que hoy debe pasar el servicio) y con un temporizador de respaldo. Todo se registra con `MessagingModule.forRoot({ relay: true })`.

**MSG-2. Los consumidores son funciones registradas, no clases (alto, M).** `MessageDispatcher.register(contract, handler)` (`message-dispatcher.ts:290`) recibe un closure `MessageHandler<T>`. La skill pide consumidores como clases con `@Subscribe` en `presentation/`, con el caso de uso inyectado. Hoy un servicio escribe un `onModuleInit` que llama a `dispatcher.register` a mano. Propuesta: decorador `@Subscribe(UserRegisteredV1)` sobre un método de una clase `@Injectable()`, y un `MessagingExplorer` que descubre los métodos con `DiscoveryService` y los registra en el dispatcher. Lo mismo para `TenantVerifier` (tipo función, `message-dispatcher.ts:119`): sin ninguna implementación. Se hace `abstract class TenantVerifier`.

**MSG-3. `MessageDispatcher` con 601 líneas y tres responsabilidades (medio, M).** Validación de envelope y límites, reclamo de idempotencia con lease y clasificación de resultados en una clase. Propuesta: `EnvelopeValidator`, `ClaimGuard` (reclamo y liberación con `ProcessedMessageStore`), `DeliveryClassifier` (`classify-error.ts` pasa a clase) y `MessageDispatcher` que los orquesta. Las constantes de lease (`DEFAULT_CLAIM_LEASE_MS`, `assertLease` en `:235`) van a `ClaimGuard`.

**MSG-4. Segundo modelo de topología (medio, M).** `topology/queue-def.ts`, `topic-def.ts`, `route.ts` y `retry-policy.ts` definen `QueueDef`/`TopicDef`/`Route` con API encadenada, y `contract-topology.ts` traduce desde `QueueDefinition`/`TopicDefinition` de contracts. Fuera de `contract-topology.ts` solo los usa la propia librería, con 36 usos en pruebas. Es una abstracción sin segundo uso. Propuesta: `Topology` se construye directo de los `*Definition` del kit (que ya validan en `define-messaging.ts`) y se borra el DSL. La validación de `topology.ts:169` (170 líneas) y la de `defineQueue` se solapan.

**MSG-5. Opciones obsoletas y estado global (medio, S).** `outbox-relay.ts:33-58` `LegacyBackoffOptions` marcada `@deprecated` y aceptada en `OutboxRelayOptions.backoff`. `message-envelope.ts:100-103` `newId` y `now` obsoletos que "tienen precedencia" sobre `ids` y `clock`. `message-envelope.ts:107-108` crea `defaultIds` y `defaultClock` como singletons de módulo, y `createEnvelope` (:110), `parseEnvelope` (:166) y `toWireEnvelope` (:200) son funciones. Propuesta: `EnvelopeFactory` (recibe `Clock` e `IdGenerator`) y `EnvelopeParser`; se borran las dos opciones obsoletas y `LegacyBackoffOptions`.

**MSG-6. Choques con lo decidido y con la skill (medio, S).**

- La skill muestra `OutboxWriter.add(events)` y `processed.tryRegister(id, consumer)`; la librería usa `OutboxWriter.append(record)` (`outbox.ts:109`) y `ProcessedMessageStore = IdempotencyStore<ProcessedMessage>` con `claim/complete/release`. La librería es más robusta (fencing). Se actualiza la skill, no el código.
- `OutboxWriter.append` "encuentra la transacción por su propio `TransactionManager`" (`outbox.ts:106`): con TypeORM será el `EntityManager` de la transacción activa. Queda anotado para el equipo de persistencia.

**MSG-7. Constante de grupo y nombres (bajo, S).** `topology.ts:22` `MESSAGING_RESOURCE_NAME = /^[A-Za-z0-9_-]+$/` y `contracts/define-messaging.ts:82` `MESSAGING_NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/`: dos reglas para el mismo nombre. Se usa la de contracts. `describe-error.ts` (4 líneas) es `ErrorDescriptor` (T7).

**MSG-8. `InMemoryBus` e `InMemoryOutboxStore` en producción (medio, S).** T5. `InMemoryBus.drain` (:124) es una herramienta de prueba.

### 2.11 internal-api

1.597 líneas. Contrato fuerte, tamaño razonable, pero sin transporte real y con cableado manual.

**INT-1. Solo existe el transporte en proceso (alto, L).** `Transport` (`transport.ts:20`) tiene una sola implementación, `InProcessTransport` (`in-process-transport.ts:5`). Para que un servicio llame a otro hace falta `HttpTransport` (cliente con `fetch`, `traceparent`, `CallMeta` en cabeceras, validación contra contrato antes de llamar, política de resiliencia `ExternalApi`) y `InternalApiController` (el borde que expone `InternalRouter.handle` en `/internal/v1/:operationId`, con autenticación de servicio). La skill de seguridad y la de composición lo dan por hecho. Propuesta: ambas piezas más `InternalApiModule.forRoot({ transport: 'http' | 'in-process' })`.

**INT-2. `InternalClient` implementa su propio reintento y tiene costuras de prueba como opciones (medio, M).** `client.ts:114`. Los campos `sleep`, `random` y `clock` como opciones (`:46-53`) son costuras de pruebas; el bucle propio se reemplaza por `ResilienceRegistry` (T3). `client.ts:93` `isRetryable` y `:101` `defaultSleep` son funciones sueltas. `InternalClient.call` (:137) y `callById` (:154) quedan; el armado de intentos pasa a `CallAttempt` (clase pequeña).

**INT-3. `InternalRouter` con 537 líneas y una máquina de estados escondida (medio, M).** `router.ts:164`. Tiene `Stage` (:132), `Progress`, un `ROLLBACK` como símbolo de módulo (:149) usado para forzar el rollback lanzando una excepción, y `traceContext` (:527). Propuesta: `OperationDispatcher` (validación y ruta), `IdempotencyGate` (claim, complete, release con el `ProcessedOperationStore`) y `UnitOfWorkRunner`. El `ROLLBACK` como excepción centinela se reemplaza por una `Rollback` clase de control de flujo, o mejor por devolver un `Outcome` y decidir el commit fuera.

**INT-4. Registro de handlers imperativo (medio, M).** `InternalRouter.register(operation, handler)` (:206) con closures. Igual que MSG-2: `@InternalHandler(operation)` sobre clases inyectables con descubrimiento automático. El `assertComplete(registry)` (:203) se ejecuta en `onApplicationBootstrap` automáticamente.

**INT-5. Funciones sueltas de contrato (medio, S).** El script marca `contract.ts`, `json-safety.ts`, `limits.ts` y `result.ts`. `effectiveRetry`, `effectiveTimeout`, `effectiveAttempts`, `defaultCallBudgetMs`, `compensationOf`, `allowedErrorCodes` (`contract.ts:63-134`) son métodos de `OperationMetadata`, que hoy es una interfaz. Pasa a clase inmutable con esos métodos. `resolveOperation` usa un `WeakMap` de módulo (:158). `limits.ts` (`operationIdempotencyKey`, `isValidCallKey`, `fitsPayload`) pasa a `IdempotencyKeyPolicy` y `PayloadLimit`.

**INT-6. `DEFAULT_RETRY_POLICY` y `RetryPolicy` duplican a messaging y resilience (medio, S).** T3.

**INT-7. `ProcessedOperationStore` solo tiene memoria dentro de la librería (bajo, S).** `store.ts:25`. El adaptador real es `PostgresIdempotencyStore`, que cumple. Se mueve el en memoria a `test-utils` (T5).

### 2.12 saga (ya decidido: solo choques)

El rediseño (store persistente con TypeORM, `SagaInstance` como agregado, `StepExecutor`, `CompensationRunner`, `LeaseKeeper`, `SagaRecoveryJob`, `SagaEventPublisher`, `SagaModule.forFeature`) ya está decidido. Lo que choca con el código actual y que el equipo de saga debe tener a la vista:

- `engine/saga-engine.ts` (1.093 líneas) se reparte entre los colaboradores. Tiene 30 métodos privados y un `Run` interno; `engine/transitions.ts` (217 líneas) y `model.ts` (133) son funciones y tipos que pasan a métodos de `SagaInstance`.
- `engine/engine-setup.ts` (`defaultBackoff`, `assertLeaseOutlivesStep`, `compileAll`, `callContext`), `engine/step-call.ts` y `util.ts` (`assertNever`, `jsonClone`, `copyDate`, `assertSerializableState`) son los módulos de funciones sueltas que se disuelven. `util.ts` es un nombre prohibido por la skill. `jsonClone` y `copyDate` solo existen para el store en memoria; con TypeORM desaparecen. `assertSerializableState` usa `CanonicalJson` de primitives.
- `store/in-memory-saga-store.ts` pasa a `test-utils` (T5) y debe pasar la misma prueba de contrato que el store TypeORM.
- `SagaRecoveryJob.runOnce` (`recovery/saga-recovery-job.ts:58`) no se programa en ningún sitio: el módulo debe hacerlo.
- Las opciones `random`, `owner`, `leaseMs`, `maxStepDurationMs` y las de suspensión (`engine-setup.ts:11-14`) se mueven a la configuración del módulo con valores por defecto.
- `saga-engine.ts:85,107` define `StartOptions` y `SagaSpanAttribute`; `engine/saga-engine.ts:1085` `inTrace` replica `traceContext` de `internal-api/router.ts:527`. Una sola `TraceContextRestorer` en observability.
- `InternalClientInvoker` (`internal-client-invoker.ts`, 47 líneas) y `OperationInvoker` (`invoker.ts`) adaptan `InternalClient`: tendrán que seguir la API nueva de INT-2.
- El 1.670 líneas de `engine/__tests__/saga-engine.spec.ts` se parte con el rediseño.

### 2.13 rate-limit

555 líneas. Es la librería mejor alineada con las skills (clase abstracta como puerto, `test-utils`, `DegradingRateLimiter`). Dos puntos.

**RTL-1. Funciones de reglas y ventana sueltas (medio, S).** `rate-limit-rule.ts:61,90,119` (`assertRateLimitRule`, `assertRateLimitCall`, `defineRateLimitRule`) y `sliding-window.ts:31,68,112` (`windowPosition`, `admits`, `slidingWindowResult`). Propuesta: `RateLimitRule` pasa a clase inmutable con `validate()` y `static define()`; `SlidingWindow` clase con la aritmética (la usan `InMemoryRateLimiter` y el script Lua de Valkey por equivalencia, y una prueba de contrato debe verificar que dan lo mismo). Hoy la equivalencia entre memoria y Lua no tiene prueba.

**RTL-2. Sin cableado (medio, S).** `RateLimitModule.forRoot()` elige `ValkeyRateLimiter` si hay Valkey configurado y lo envuelve en `DegradingRateLimiter` con `localDivisor` tomado de `INSTANCE_COUNT`; si no, `InMemoryRateLimiter`. Un `@RateLimit(rule)` más `RateLimitGuard` cubre el uso en controllers. `onDegraded` pasa a un `RateLimitDegradationReporter` que escribe un log y una métrica.

### 2.14 adapters/aws

1.033 líneas. Único lugar con `@aws-sdk` (correcto).

**AWS-1. Sin módulo, con fábricas y `destroy` manuales (alto, M).** `aws-clients.ts:19,29` `createAwsMessagingClients` y `destroyAwsMessagingClients`; `aws-config.ts:46` `awsConfig = defineConfig(...)` como singleton al importar. Propuesta: `AwsModule.forRoot()` crea `SNSClient` y `SQSClient` con `AwsConfig` (token `SNS_CLIENT`, `SQS_CLIENT`), implementa `OnModuleDestroy`, y registra `SnsSqsEnvelopePublisher`, `AwsMessagingNames` y `SnsSqsMessageBus` ligados a los puertos `EnvelopePublisher` y `MessageBus` de messaging. Con eso `MessagingModule` + `AwsModule` bastan para publicar.

**AWS-2. `SqsDeliveryRunner` con 503 líneas y dos modos en una clase (medio, M).** `sqs-delivery-runner.ts:161`. Tiene el consumo por Lambda (`handleLambdaEvent`, :189), el sondeo largo (`pollOnce`, `start`, `stop`, :234-311), el reenvío a DLQ (`sendToDeadLetter`, :401), el cambio de visibilidad y el borrado por lote. Propuesta: `SqsPoller` (modo servicio) y `SqsLambdaHandler` (modo Lambda) sobre un `SqsDeliveryProcessor` común, más `SqsDeadLetterRedriver`. `sleep` propio (:130, T3). Las constantes (`MAX_VISIBILITY_SECONDS`, `DEFAULT_BATCH_SIZE`, `DEFAULT_WAIT_TIME_SECONDS`) a un `SqsConsumerConfig` con valores por defecto.

**AWS-3. Funciones sueltas (medio, S).** El script marca `aws-clients.ts`, `aws-errors.ts` (`isRetryableAwsError`, `transportError`), `elasticache-iam-auth.ts` (`credentialsOf`, `elastiCacheIamAuthToken`) y `messaging-names.ts` (`partitionOf`). Propuesta: `AwsErrorTranslator` (clase, registrable como `FailureRule` en `FailureClassifier`, PRM-2), `ElastiCacheIamAuthTokenProvider` (clase con `Clock` y las credenciales por constructor) y `partitionOf` como método privado de `AwsMessagingNames`. `elasticache-iam-auth.ts` pertenece al adaptador de Valkey por cohesión; es lo que consume `valkey-client`. Hoy `valkey` no depende de `aws` y se resuelve pasando la función; mover la clase a un `adapters/aws` es correcto y el módulo `ValkeyModule` la recibe por token opcional.

**AWS-4. Mezcla de capas en errores (bajo, S).** `aws-errors.ts` devuelve `MessagingError` con código `TransportFailed`: el adaptador conoce el error de su puerto, está bien. Los mensajes de validación de `aws-config.ts:23-44` están en español y el resto del código en inglés (T8).

### 2.15 adapters/valkey

1.202 líneas.

**VLK-1. Fábricas y configuración por funciones, sin módulo (alto, M).** `valkey-client.ts:143,169` (`createValkeyClient`, `createTokenAuthenticatedValkeyClient`), `valkey-config.ts` (`valkeyConnectionFromConfig`, esquema propio con 8 variables). Sin `quit()` en el cierre ni `HealthCheckable`. Propuesta: `ValkeyModule.forRoot()` con `ValkeyClientFactory` (clase), `OnModuleDestroy` que hace `quit`, un `ValkeyHealthIndicator`, y los adaptadores como providers: `ValkeyCache` ligado a `CachePort`, `ValkeyRateLimiter` a `RateLimiter`, `ValkeyRoutingCache` a `RoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilter`. Con `VALKEY_URL` o `VALKEY_HOST` salen todos con valores por defecto.

**VLK-2. `runCommand`, `integerReply`, `optionalStringReply` y `LuaScript` (medio, S).** `valkey-client.ts:42,84,92`. Funciones que envuelven el cliente: pasan a `ValkeyCommandExecutor` (clase con el cliente por constructor, `run(command, args)`, `integer()`, `optionalString()`), que ya es lo que cada adaptador usa por separado. `bloom-keys.ts` (`bloomKey`, `rebuildKey`) y `valkey-error.ts` (`errorMessage` privada, `valkeyError`) pasan a ser métodos de `ValkeyKeyspace` y de `ValkeyErrorTranslator`.

**VLK-3. Prefijo obligatorio sin valor por defecto (bajo, S, ya anotado en BE-02).** `ValkeyKeyspace` exige prefijo, lo cual es correcto por la ACL; en el módulo, `VALKEY_KEY_PREFIX` por defecto debe ser `SERVICE_NAME`, no obligar a declararlo dos veces.

**VLK-4. Faltan puertos con implementación en Valkey (medio, M).** `IdempotencyStore` solo tiene memoria y Postgres. Un `ValkeyIdempotencyStore` (con `SET NX PX` y el token de fencing) serviría a la API interna fuera de transacción. Es decisión de producto; se anota.

### 2.16 adapters/postgres (afectado por lo decidido)

1.149 líneas. Implementa de verdad el outbox, los procesados, la idempotencia y el directorio, y por eso es la pieza crítica. Todo lo que sigue choca con la decisión de TypeORM y se rehace en ese equipo:

- `shard-migrations.ts` (127) y `catalog-migrations.ts` (49) son SQL a mano con `CREATE TABLE`, índices parciales y `CHECK`. Pasan a entidades (`OutboxEntity`, `IdempotencyKeyEntity`, `ProcessedMessageEntity`, `ShardDirectoryEntity`, `ShardInstanceEntity`, `ShardLockEntity`) y a migraciones generadas con la CLI. `CLAIM_STATES_SQL`, `OUTBOX_STATUSES_SQL` y similares (`shard-migrations.ts:11-35`) generan el `CHECK` desde los enums; con TypeORM se usa `@Check` o `enum` en `varchar`. Los índices parciales (`outbox_open_idx` y los otros tres) se conservan con `@Index({ where })`.
- Los cuatro stores (`postgres-outbox-store.ts` 353, `postgres-directory-store.ts` 330, `postgres-idempotency-store.ts` 244, `postgres-processed-message-store.ts` 40) usan `Database`/`DatabaseResolver`/`SqlSession` de persistence y SQL con `$n`. Pasan a `TypeOrmOutboxStore`, etc., sobre el `EntityManager` de la transacción activa. `FOR UPDATE SKIP LOCKED` y la reclamación con lease se escriben con `QueryBuilder.setLock('pessimistic_write_or_fail')` o SQL parametrizado en el `manager.query`, justificado por la skill.
- `PostgresProcessedMessageStore` hereda de `PostgresIdempotencyStore` (:23); es una herencia que no es jerarquía estable. Con TypeORM, composición: un `ClaimTable<R>` que parametriza la entidad.
- Pruebas: `pg-mem` (`__tests__/utils/pg-mem.ts`) simula Postgres. La skill dice "no se mockea lo que no es tuyo cuando se puede levantar real". La capa nueva se prueba solo con Testcontainers, y las pruebas de contrato (`outbox-contract.ts`, `idempotency-contract.ts`, `processed-message-contract.ts`) se conservan porque son las que sirven.
- `postgres-outbox-store.ts:57-90` y `postgres-idempotency-store.ts:53` tienen funciones de conversión de fecha repetidas (`toDate`, `toMs`).

### 2.17 persistence (ya decidido: solo choques)

Se rehace sobre TypeORM; el equipo debe revisar estos puntos de acoplamiento que otras librerías asumen hoy:

- `TransactionManager` e `IsolationLevel` existen en `primitives` y en `persistence/enums.ts`. La nueva capa implementa el puerto del kernel (PRM-1) y borra el enum duplicado.
- `SqlUnitOfWork.session` (`transaction/transaction-manager.ts:13`) es lo que usan los stores. Con TypeORM será `manager: EntityManager`.
- `PersistenceContext` copia campos de `RequestContext` por función (`persistence-context.ts:28`, `requestContextProvider` como constante de módulo); pasa a `PersistenceContextProvider` inyectable sobre `RequestContextStore` (OBS-1).
- `SessionSetting` (`app.actor_id`, `app.tenant_id`, `app.trace_id`), `@Audited` (`metadata/entity-metadata.ts:19`, con `WeakMap` de módulo) y el trigger de auditoría (`schema-helpers.ts`, `persistence-migrations.ts`) se conservan: son la parte que aporta valor y no existe en TypeORM. `@Audited` pasa a leer metadatos con `Reflect` o con un `EntitySubscriber` y el trigger se emite en la migración.
- `persistence.ts:107` `createPersistence` (función fábrica con dos ramas) pasa a `PersistenceModule.forRoot` y `forFeature`.
- `base-repository.ts` (678 líneas) y `database.ts` (417) desaparecen en favor de `BaseRepository` sobre TypeORM, con la política de réplicas (`DatabaseRole`) y de `DataAccess` resuelta por el `DataSource` del shard.
- `docs/adr/0009-rds-postgresql-capa-persistencia-propia.md` debe ser sustituido por un ADR nuevo. El título y la decisión contradicen lo acordado.
- `criteria` y `sharding/ports.ts`, `sharding/types.ts` (SHD-4, CRI-1) dependen de este rediseño.

### 2.18 contracts (kit y plataforma)

**CTR-1. El catálogo de errores conoce toda la plataforma (alto, M).** T2. `platform-error-catalog.ts` (521 líneas) y `platform-error-code.enum.ts` (108 líneas, 100 valores).

**CTR-2. `kit/define-*` como funciones (medio, S, con excepción).** El script lista once archivos del kit: `define-command`, `define-event`, `define-messaging`, `define-operation`, `define-route`, `define-service-contract`, `error-catalog`, `field-errors`, `message-definition`, `problem-details`, `query-params`, y `schemas/pagination.schema.ts`. Estas funciones son un DSL declarativo sin dependencias ni estado que arma descriptores inmutables; se tratan como excepción justificada de "utilidades puras" (sección 3). Los que sí deben ser clase por tener lógica y estado: `ErrorCatalog` (ya lo es, :62), `validateContract` y los `check*` privados de `define-service-contract.ts:63-183` (unas 150 líneas de verificación) → `ServiceContractValidator`; `toProblemDetails` (`problem-details.ts`) → `ProblemDetailsFactory`, inyectable en el `ProblemDetailsFilter` de la skill de errores; `queryParamsOf` y `decodeQuery` en `query-params.ts` → `QueryParamsCodec`.

**CTR-3. Constantes y patrones duplicados (medio, S).** `ERROR_CODE_PATTERN` (KRN-3), `MESSAGING_NAME_PATTERN` (MSG-7), `MAX_TENANT_ID_LENGTH` (SHD-5). Una constante por concepto, en `contracts/platform/constants`.

**CTR-4. `Date` sin reloj en una validación (bajo, S).** `define-route.ts:91` valida fechas de deprecación con `new Date(...)`, es parseo y no lectura del reloj, así que está bien. No se toca.

**CTR-5. `contracts/identity` (bajo, S).** 1.284 líneas con la prueba `contract.spec.ts` que mezcla comprobaciones; las 9 sentencias `if` de `contract.spec.ts` y las 8 de `platform-error-catalog.spec.ts` verifican por bucle (ver sección 3, pruebas).

### 2.19 shared/utils

**UTL-1. `money.ts` sin consumidor y con funciones sueltas (medio, S).** 106 líneas (`money`, `addMoney`, `subtractMoney`, `multiplyMoney`, `sumMoney`, `allocateMoney`, `compareMoney`, `currencyDigits`, `formatMoney`) y alias `@shared/utils`; nadie lo importa (el tipo viene de `@contracts/platform`). Es un objeto de valor del dominio. Propuesta: `Money` como `ValueObject` del kernel (`Money.of(amountMinor, currency)`, `.add()`, `.subtract()`, `.multiply()`, `.allocate(ratios)`, `.compareTo()`, `.format(locale)`) y se borra `libs/shared/utils`. Si no se quiere en el kernel, se queda como `Money` en una librería `@platform/money`, nunca como "utils" (nombre que la skill prohíbe).

### 2.20 tools

**TLS-1. `contracts-export` (778 líneas) en funciones y con registro a mano (medio, M).**

- `build-export.ts`, `build-asyncapi.ts` y `build-topology.ts` son tres módulos de funciones con `fail()` repetida (`build-export.ts:32`, `build-topology.ts:25`, `define-service-contract.ts:105`).
- `main.ts` (117 líneas) tiene `MODES` como `Record`, `CONTRACTS_DIR = resolve('libs/contracts')` a nivel de módulo (depende del `cwd`), `console.log` y un `main()` con cuatro responsabilidades.
- `registry.ts:8` lista los contratos a mano, y `unregisteredDirs` (`main.ts:38`) obliga a recordar editarlo.
  Propuesta: `ContractExporter` (orquesta, recibe `ContractRegistry` y `FileSystem`), `SchemaExportBuilder`, `AsyncApiBuilder`, `TopologyBuilder`, `ExportCommand` con un `CheckMode` y un `WriteMode` (estrategia, no un diccionario de banderas) y `ContractsDiscovery` que lee `libs/contracts/*/src/index.ts` y evita el registro manual. `ContractExporter` escribe por un `ArtifactWriter` para poder probar sin disco.

**TLS-2. `app-bundler` bien (bajo, S).** `AppBundler` y `DecoratorMetadataPlugin` ya son clases con constructor. Solo `main.ts` es un script con `console`; está bien en un binario de línea de comandos. El plugin recomienda `types: ["*"]` y `emitDecoratorMetadata` coherentes con el resto (verificado). Falta un generador de apps y de módulos, anunciado en CLAUDE.md como "fase F11".

---

## 3. Excepciones razonables (no se tocan)

Para no sobre-aplicar la regla "nada de funciones sueltas", quedan como están:

- Fábricas declarativas sin estado ni dependencias: `defineEvent`, `defineCommand`, `defineOperation`, `defineRoute`, `defineTopic`, `defineQueue`, `defineServiceContract`, `defineErrorCatalog`, y los esquemas zod de `env.ts` y `secret()`. Son un DSL de contratos.
- Funciones puras de formato o matemática sin configuración que ya están agrupadas en un archivo cohesivo (`fnv1a32`, `murmur3_32`): se encapsulan como métodos estáticos de una clase de utilidad con nombre de negocio (`Hashes`, `BloomMath`), sin inyección.
- Los `main()` de los binarios de `tools/`.

---

## 4. Pruebas (sección 7 de la solicitud)

- **Verificación de detalles internos.** `shard-router.spec.ts` (1.339 líneas) tiene 56 `jest.fn` y 45 aserciones `toHaveBeenCalledTimes/With` sobre el directorio y la caché compartida; `cache-aside.spec.ts` (794 líneas) 54 y 25; `internal-api/router.spec.ts` 38 y 17; `client.spec.ts` 17 y 16. Cuentan llamadas internas, que es lo que la skill prohíbe ("no se verifica el orden ni el número de llamadas internas"). Se sustituyen por fakes con comportamiento (`InMemoryDirectoryStore` con un contador observable como atributo público del fake) y se verifica el resultado externo (a qué shard llegó, cuántas veces se leyó la fuente de verdad solo cuando es requisito, como la deduplicación de cargas).
- **Lógica en pruebas.** `adapters/aws/src/__tests__/sqs-delivery-runner.spec.ts` (14 `if`), `sns-sqs.integration.spec.ts` (:172-177, :320-325) con una escalera `if (name === 'GetQueueUrlCommand')` que reimplementa el SDK; `sharding/consistent-hash-ring.spec.ts` (9), `saga-engine.spec.ts` (9), `contracts/identity/contract.spec.ts` (9), `platform-error-catalog.spec.ts` (8). Propuesta: un `FakeSqsClient` y un `FakeSnsClient` como clases en `adapters/aws/src/__tests__/utils/` (hoy solo hay `fixtures.ts`) y `it.each` para las tablas.
- **Archivos enormes.** `saga-engine.spec.ts` 1.670 líneas, `shard-router.spec.ts` 1.339, `router.spec.ts` 909, `define.spec.ts` 795. Se parten por escenario junto con el refactor de cada clase.
- **`pg-mem` en lugar de contenedor.** T6 y 2.16.
- **Fakes sin prueba de contrato.** Solo hay contrato compartido para outbox, idempotencia y procesados de Postgres. Faltan para `RateLimiter` (memoria frente a Valkey), `CachePort` (memoria frente a Valkey), `DirectoryStore`, `RoutingCache` y `SagaStore`.
- **Integración con otro nombre y alcance.** T9.

---

## 5. Tabla de puertos y quién los implementa de verdad

| Puerto                             | Memoria    | Real           | Falta                                                             |
| ---------------------------------- | ---------- | -------------- | ----------------------------------------------------------------- |
| `OutboxStore`                      | sí         | Postgres       | job que ejecute `OutboxRelay` y limpie (MSG-1)                    |
| `EnvelopePublisher`                | no         | SNS/SQS        | nada                                                              |
| `ProcessedMessageStore`            | sí         | Postgres       | nada; `TenantVerifier` sin implementación (MSG-2)                 |
| `IdempotencyStore`                 | sí         | Postgres       | Valkey opcional (VLK-4), job de purga                             |
| `DirectoryStore`/`DirectoryWriter` | sí         | Postgres       | quien escribe (sagas de alta y traslado), arranque del suscriptor |
| `RoutingCache`                     | sí         | Valkey         | nada                                                              |
| `ShardDirectoryChange*`            | sí         | Valkey Pub/Sub | suscripción en `onModuleInit`                                     |
| `Transport` (internal-api)         | en proceso | ninguno        | `HttpTransport` y el controller de entrada (INT-1)                |
| `SagaStore`                        | sí         | ninguno        | decidido: TypeORM                                                 |
| `CachePort`                        | sí         | Valkey         | nada                                                              |
| `RateLimiter`                      | sí         | Valkey         | nada                                                              |
| `AsyncBloomFilter`                 | sí         | Valkey         | job de reconstrucción (BLO-1)                                     |
| `LoggerPort`                       | consola    | OTLP           | nada                                                              |
| `MetricsPort`                      | sí         | OTLP           | nada                                                              |
| `Clock`/`IdGenerator`              | sí         | sí             | `RandomSource` (T4)                                               |
| secretos                           | no         | no             | `SecretsProvider` con Secrets Manager (CFG-5)                     |
| salud                              | no         | no             | `HealthCheckable` en cada adaptador (T1)                          |

---

## 6. Plan por paquetes de trabajo

Cada paquete toca un conjunto de archivos disjunto del resto. Los paquetes P1 a P6 pueden correr en paralelo una vez cerrado P0. PD1 y PD2 son lo ya decidido; se listan para fijar las fronteras de archivos.

Regla común: los alias de `tsconfig.base.json` y las dependencias de `package.json` los edita solo P0 (agrega los alias `@platform/<lib>/nest` y `@platform/<lib>/test-utils` de todas las librerías, y `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `typeorm`, `reflect-metadata`). Ningún otro paquete toca esos dos archivos. La API pública de las librerías no cambia de nombre hasta que el paquete dueño lo anuncia en su `index.ts`; los demás paquetes importan solo lo que ya existe.

### P0. Fundaciones (primero, secuencial, tropa de 1 a 2 agentes)

Archivos: `libs/platform/kernel/**`, `libs/platform/primitives/**`, `libs/contracts/platform/src/enums/platform-error-code.enum.ts`, `libs/contracts/platform/src/errors/**`, `libs/contracts/platform/src/kit/error-catalog.ts`, `tsconfig.base.json`, `package.json`, `jest.preset.js`.

Contenido: KRN-1 a KRN-4, PRM-1 a PRM-3, T2 (reparto de enums y catálogos por librería, dejando `PlatformErrorCode` transversal), T4 (`RandomSource`), T7 (`Guard`, `ErrorDescriptor`), T6 (`ContainerRuntime` en `kernel/__tests__/utils`), `HealthCheckable`, tokens base (`CLOCK`, `ID_GENERATOR`, `RANDOM_SOURCE`), puertos de transacción e idempotencia movidos al kernel, y los alias y dependencias de todos. Esfuerzo total L. Cada librería necesita después solo cambiar sus imports; P0 deja alias de compatibilidad (reexport) durante un ciclo para que los paquetes siguientes no se bloqueen.

### P1. Config y observabilidad

Archivos: `libs/platform/config/**`, `libs/platform/observability/**`.

Contenido: CFG-1 a CFG-5, OBS-1 a OBS-5, T1 para ambas (`ConfigModule`, `ObservabilityModule`, `RequestContextInterceptor`). Mover `LogLevel` a observability. Sacar de `metrics.ts` los listeners de resilience y cache, que adoptan P2. Esfuerzo L. Depende de P0.

### P2. Resiliencia, cache, rate-limit y bloom

Archivos: `libs/platform/resilience/**`, `libs/platform/cache/**`, `libs/platform/rate-limit/**`, `libs/platform/bloom/**`.

Contenido: RES-1 a RES-4, CAC-1 a CAC-5, RTL-1 y RTL-2, BLO-1 a BLO-4, T3 (eliminar `wait.ts`), módulos `ResilienceModule`, `CacheModule`, `RateLimitModule`, `BloomModule`, y los listeners de métricas que salieron de observability. Esfuerzo L. Depende de P0 y de P1 solo por el `MetricsPort` (que no cambia de forma).

### P3. Messaging y adaptador AWS

Archivos: `libs/platform/messaging/**`, `libs/platform/adapters/aws/**`.

Contenido: MSG-1 a MSG-8, AWS-1 a AWS-4, T5 (para sus dobles), T6 (su integración con `ContainerRuntime`), `MessagingModule`, `AwsModule`, `@Subscribe`, `OutboxRelayRunner` y jobs de retención, partición del runner de SQS. `adapters/aws` mantiene `elasticache-iam-auth` hasta que P5 lo consuma por token. Esfuerzo L. Depende de P0 y P1.

### P4. API interna

Archivos: `libs/platform/internal-api/**`.

Contenido: INT-1 a INT-7, `InternalApiModule`, `HttpTransport`, controller de entrada, decorador `@InternalHandler`. Debe conservar la forma de `InternalClient.call/callById` y de `OperationInvoker`, porque PD2 los consume. Esfuerzo L. Depende de P0, P1 y P2 (resiliencia).

### P5. Sharding y adaptador Valkey

Archivos: `libs/platform/sharding/**`, `libs/platform/adapters/valkey/**`.

Contenido: SHD-1 a SHD-6, VLK-1 a VLK-4, T3 (borrar `LookupBudget`), `ShardingModule` (sin la parte TypeORM), `ValkeyModule`, `ValkeyHealthIndicator`. La API pública de `ShardRouter` no cambia; PD1 la consume. Esfuerzo L. Depende de P0 y P2 (cache, bloom, rate-limit).

### P6. Contratos, herramientas y utilidades

Archivos: `libs/contracts/platform/src/kit/**` (menos `error-catalog.ts`), `libs/contracts/platform/src/{schemas,constants,types,contract.ts,index.ts}`, `libs/contracts/identity/**`, `libs/shared/utils/**` (se elimina), `tools/**`.

Contenido: CTR-2, CTR-3, CTR-5, UTL-1 (`Money` al kernel: coordinar con P0 el archivo `kernel/src/money.ts` que P0 crea vacío con el contrato acordado, o se pide a P0 incluirlo), TLS-1 y TLS-2, y el generador de apps y módulos (F11) si se desea. Esfuerzo M. Depende de P0 (por el reparto de catálogos).

### PD1. Persistencia con TypeORM y sharding físico (ya decidido)

Archivos: `libs/platform/persistence/**`, `libs/platform/adapters/postgres/**`, `libs/platform/criteria/**`, `docs/adr/0009-*.md` (se supera con un ADR nuevo).

Contenido: lo decidido, más CRI-1 a CRI-4, 2.16 y 2.17. Consume `ShardRouter` de P5 y los puertos del kernel de P0. Debe empezar después de que P0 mueva `TransactionManager` y de que P5 cierre la división del router (o trabajar contra la API pública, que no cambia). Esfuerzo L.

### PD2. Sagas (ya decidido)

Archivos: `libs/platform/saga/**`.

Contenido: lo decidido, más las notas de 2.12. Consume `InternalClient` de P4 y `PersistenceModule`/`EntityManager` de PD1. Esfuerzo L. Depende de P0, P4 y PD1.

### Orden sugerido

1. P0 solo.
2. P1, P2 y P6 en paralelo.
3. P3, P4 y P5 en paralelo (cada uno necesita P1 y P2).
4. PD1 (tras P0 y P5) y luego PD2 (tras P4 y PD1).

Cada paquete cierra con `pnpm nx run-many -t lint test typecheck -p <proyectos del paquete>` y con `node .claude/skills/backend-estructura/scripts/check-structure.mjs --all .`, cuyo objetivo es bajar de 97 a las excepciones de la sección 3 (unas 12, todas del DSL de contratos y de los `main()` de `tools`).
