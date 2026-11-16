# 0025. Capa NestJS por sub-entrada y puertos como clases abstractas

- Estado: Aceptada
- Fecha: 2026-11-14

## Contexto

Las librerías de plataforma no tenían cableado de NestJS. Cada servicio unía a mano puertos y adaptadores con fábricas, y los puertos eran interfaces sin token de inyección, así que cada uno necesitaba un `Symbol` y un `@Inject`. Ese código se repetía en cada servicio y ataba el arranque de cada uno a los detalles de la librería.

## Decisión

### Puertos como clases abstractas

Todo puerto es una clase abstracta sin decoradores, y es su propio token de inyección. El dominio no importa NestJS. Se usa `Symbol` solo cuando conviven varias instancias del mismo tipo (`SNS_CLIENT`, `SQS_CLIENT` o un filtro Bloom por nombre con `bloomFilterToken(name)`).

Convertir una interfaz en clase abstracta no rompe a quien la implementa, ni a los dobles hechos con objetos literales, siempre que la clase solo tenga miembros abstractos.

```ts
export abstract class Clock {
  abstract now(): Date;
}
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
```

### Sub-entrada nest

Cada librería con cableado expone `@platform/<lib>/nest`, que apunta a `src/nest/index.ts`. Fuera de `src/nest/` no se importa `@nestjs/*` ni otra sub-entrada `/nest`. Lo verifican la regla de ESLint `layout/no-nest-outside-nest-folder` de `backend/eslint.config.mjs` y `check-structure.mjs`. `domain/` ya tenía su propia regla.

### Módulos configurables

Se usa `ConfigurableModuleBuilder` de `@nestjs/common`, que genera `forRoot` y `forRootAsync` sin código propio. `forFeature` se escribe a mano cuando el servicio registra algo suyo.

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

### Quién elige el adaptador

Un módulo del núcleo nunca importa un adaptador, porque la dependencia iría al revés. La opción recibe el tipo del adaptador y el módulo lo liga al puerto.

```ts
export interface CacheModuleOptions {
  /** Por defecto `InMemoryCache`, el modo local sin Valkey. */
  readonly store?: Type<CachePort>;
}
// en CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

Sin la opción, el módulo obtiene el modo local. Las demás opciones siguen el mismo patrón: `RateLimitModule` (`limiter`, `degradeLocally`), `ShardingModule` (`routingCache`, `channel`, `directory`), `MessagingModule` (`outboxStore`, `processedStore`, `bus`, `publisher`), `InternalApiModule` (`processedStore`) y `SagaModule` (`store`). El adaptador exporta sus clases desde su módulo y la app las nombra.

### Configuración

`ConfigModule.forRoot({ schema })` recibe solo el esquema propio del servicio. Cada módulo de librería importa `ConfigModule.forFeature(section)` con su sección (`LoggingConfig`, `TelemetryConfig`, `DatabaseConfig`, `ValkeyConfig`, `AwsConfig`), y se lee con `AppConfig.get(section)`. Así el servicio no escribe `.extend(...)` ni conoce variables que no son suyas. Todo se valida al arrancar, y si algo falla el arranque lista todos los errores a la vez.

### Ciclo de vida

Hay tres momentos, en este orden de apagado:

1. `BeforeApplicationShutdown` detiene lo que genera trabajo: `JobRunner`, `SqsPoller` y las suscripciones.
2. `OnModuleDestroy` cierra los recursos: clientes SNS y SQS, Valkey con `quit` y el `DataSource` de TypeORM.
3. `OnApplicationShutdown` vacía la telemetría.

### Salud

`HealthRegistry` vive en observability, con `register(check)` y `checkAll()`, y `HealthCheckable` vive en el kernel. Cada adaptador de red se registra en su `onModuleInit`. Los endpoints `/health/live` y `/health/ready` los monta F4 en `@platform/http` sobre `HealthRegistry`.

### Telemetría

El arranque temprano se conserva fuera de Nest, en `@platform/observability/setup`. Debe parchear http, pg e iovalkey antes de que se importen, así que `instrumentation.ts` es la primera importación de `main.ts`. `ObservabilityModule` provee `TELEMETRY` con ese valor y solo gobierna el apagado.

```ts
// instrumentation.ts, primera importación de main.ts
import { TelemetryBootstrap } from '@platform/observability/setup';
export const telemetry = TelemetryBootstrap.start(process.env);
```

### Dobles de prueba

Los dobles salen por `@platform/<lib>/test-utils`, no por el índice público. Cada doble pasa la misma prueba de contrato `run<Port>Contract(factory)` que el adaptador real.

### Módulos por librería

| Librería          | Módulo                   | Provee                                                                                                                                                                         |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| config            | `ConfigModule`           | `AppConfig`                                                                                                                                                                    |
| observability     | `ObservabilityModule`    | `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`                                                                       |
| resilience        | `ResilienceModule`       | `ResilienceRegistry`; `forFeature({ name, policy })` agrega una política                                                                                                       |
| cache             | `CacheModule`            | `CachePort`, `SingleFlight`, `CacheAside` por espacio (`cacheAsideToken(namespace)`)                                                                                           |
| rate-limit        | `RateLimitModule`        | `RateLimiter`, `RateLimitGuard`                                                                                                                                                |
| bloom             | `BloomModule`            | `bloomFilterToken(name)` por `forFeature`, `BloomRebuildJob`                                                                                                                   |
| scheduling        | `SchedulingModule`       | `JobRunner`, `JobLock`                                                                                                                                                         |
| sharding          | `ShardingModule`         | `ShardRouter`, `DirectoryChangeSubscription`                                                                                                                                   |
| messaging         | `MessagingModule`        | `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs                                                                                    |
| internal-api      | `InternalApiModule`      | `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs                                                                                                 |
| persistence       | `PersistenceModule`      | `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`                                                                                   |
| adapters-postgres | `PostgresPlatformModule` | `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`                                                                       |
| saga              | `SagaModule`             | `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definiciones])`                                                                                     |
| adapters-aws      | `AwsModule`              | `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `SqsPoller`                                                                                         |
| adapters-valkey   | `ValkeyModule`           | `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator` |

## Consecuencias

### Positivas

- El servicio solo nombra adaptadores y su esquema de configuración.
- El dominio sigue sin depender de NestJS.
- Un servicio sin Valkey arranca en modo local sin cambiar código.
- Los dobles quedan fuera del índice público.

### Costos

- Cada librería suma una carpeta `src/nest` y una sub-entrada en `tsconfig.base.json`.
- Dependencias nuevas: `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `reflect-metadata` y `rxjs`.
- Hay que migrar los consumidores de las interfaces anteriores. Mientras tanto se conservan reexportes marcados `@deprecated`.

## Alternativas consideradas

- Que cada servicio cablee a mano los puertos: es el estado anterior, y el cableado se repite en cada servicio.
- Que un módulo del núcleo importe el adaptador: la dependencia iría al revés.
- Mover el arranque de OpenTelemetry a `ObservabilityModule`: rompe la instrumentación automática, que debe parchear antes de importar http, pg e iovalkey.
- Un decorador `@Resilient`: se descarta, porque `ResilienceRegistry.execute` es la única vía.
