---
name: backend-nestjs-composicion
description: 'Composición NestJS: módulos como raíz de composición, tokens de puertos, casos de uso, controllers, fachadas y apagado. Úsala al cablear módulos y providers.'
paths:
  - 'backend/**/presentation/**'
  - 'backend/**/*.module.ts'
  - 'backend/**/main.ts'
  - 'backend/libs/platform/*/src/nest/**'
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

Ejemplo en `references/ejemplos.md`, sección "Tokens para puertos".

Un `Symbol` solo cuando conviven varias instancias del mismo tipo: `SNS_CLIENT`, `SQS_CLIENT` o un filtro Bloom por nombre con `bloomFilterToken(name)`. Ahí el constructor lleva `@Inject`:

Ejemplo en `references/ejemplos.md`, sección "Tokens para puertos".

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

Ejemplo en `references/ejemplos.md`, sección "Módulos de las librerías de plataforma".

Sin Valkey (modo local con una sola instancia), el servicio omite `ValkeyModule` y deja `CacheModule.forRoot()` y `RateLimitModule.forRoot()` sin opciones: usan `InMemoryCache` e `InMemoryRateLimiter`, y `ShardingModule` usa `NullRoutingCache` e `InProcessDirectoryChannel`. Los jobs exclusivos usan `InProcessJobLock`.

Catálogo de cada módulo (qué provee y sus hooks) en `references/modulos-de-plataforma.md`.

## Casos de uso y comandos

- Una clase por caso de uso, método `execute(command)`, nombre de verbo (`SignInUseCase`). Implementa `UseCase<TInput, TOutput>` del kernel.
- Orquesta: valida permisos, carga agregados, invoca al dominio, guarda, publica eventos con `MessageBus`, devuelve un DTO mínimo (un id o un resultado, no el agregado).
- No contiene reglas de negocio. Si una condición decide el negocio, va en el agregado o en un servicio de dominio.
- Un caso de uso no llama a otro caso de uso. Si dos comparten un paso, es un servicio de aplicación o un evento.
- El comando es una clase de datos inmutable en `application/`, distinta del DTO HTTP. El controller traduce uno al otro.
- Las consultas (lecturas) tienen su propia clase `*Query` y manejador, y no abren transacción de escritura.
- La transacción la abre el caso de uso con `TransactionManager.runInTransaction`. Nunca el controller.

Ejemplo en `references/ejemplos.md`, sección "Casos de uso y comandos".

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

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-boundary-discipline`, `principle-minimize-reader-load`, `principle-laziness-protocol`, `principle-encode-lessons-in-structure`. Un adaptador se elige con una clase selectora probada, nunca con un `switch` dentro de `useFactory`.
