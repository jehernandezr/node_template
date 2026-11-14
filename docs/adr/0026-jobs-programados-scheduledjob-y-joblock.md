# 0026. Jobs programados: ScheduledJob, JobLock y @platform/scheduling

- Estado: Aceptada
- Fecha: 2026-11-14

## Contexto

Hay piezas con `runOnce` o `purge` que no tienen quien las programe: el relay del outbox, la purga de idempotencia y del outbox, `SagaRecoveryJob` y la reconstrucción de los filtros Bloom. El diseño de F4 proponía un `IntervalJob` provisional y un `OutboxRelayWorker`. Con esa propuesta, cada librería terminaría con sus propios temporizadores, cada uno con su manera de parar al apagar y de evitar corridas duplicadas.

## Decisión

### Contrato en el kernel

El contrato vive en `kernel/src/ports/scheduling/`, para que cada librería declare sus jobs sin depender del runner ni de NestJS.

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

### Runner

El runner vive en la librería nueva `@platform/scheduling`, de tipo `platform`, que depende de kernel, primitives y observability.

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

`CronExpression` se escribe en casa, en unas 120 líneas, con expresiones UTC de 5 o 6 campos. No añade dependencia ni `@nestjs/schedule`. `InProcessJobLock` sirve al modo local y a las pruebas. `ValkeyJobLock` (SET NX PX con token) vive en `@platform/adapters-valkey`. Con `SchedulingMode.External` el runner no arma temporizadores, y EventBridge o un cron llaman a `runNow`.

### Descubrimiento

`SchedulingModule` en `@platform/scheduling/nest` descubre con `DiscoveryService` los providers que son `instanceof ScheduledJob`. Una librería solo declara la clase en sus `providers` y no importa el módulo de scheduling.

### Reparto

| Job                              | Dueño        | Calendario               | Exclusivo |
| -------------------------------- | ------------ | ------------------------ | --------- |
| `OutboxRelayJob`                 | messaging    | cada 1 s con jitter      | no        |
| `OutboxRetentionJob`             | messaging    | cada hora                | no        |
| `ProcessedMessageRetentionJob`   | messaging    | cada hora                | no        |
| `ProcessedOperationRetentionJob` | internal-api | cada hora                | no        |
| `SagaRecoveryJob`                | saga         | cada 5 s                 | no        |
| `SagaRetentionJob`               | saga         | cada hora                | no        |
| `BloomRebuildJob`                | bloom        | `rebuildCron` del filtro | sí        |

`OutboxMessageBus` llama a `runner.trigger` al escribir, para publicar sin esperar al intervalo. El relay recorre las particiones con `RelayScopes`: `SingleRelayScope` es el valor por defecto y usa una sola base, y `ShardedRelayScopes` en `@platform/adapters-postgres` usa `AcrossShards` y `ShardScope`. Así messaging no conoce TypeORM.

```ts
// @platform/messaging
export abstract class RelayScopes {
  /** Corre `body` una vez por cada partición de la que hay que publicar. */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
export class SingleRelayScope extends RelayScopes {} // por defecto, una sola base
// @platform/adapters-postgres: ShardedRelayScopes usa AcrossShards y ShardScope de persistence.
```

### Apagado

`JobRunner.stop(graceMs)` corre en `BeforeApplicationShutdown`. Espera los jobs en curso hasta `graceMs` y aborta su `signal`.

## Consecuencias

### Positivas

- Una sola mecánica para todos los jobs, sin temporizadores propios en cada librería.
- Los jobs se prueban llamando a `run()` directamente.
- El mismo job puede correr en el proceso o ser invocado desde fuera.

### Costos

- Una librería nueva que mantener.
- El cron propio cubre solo el subconjunto de expresiones que se necesita.
- Un job exclusivo depende de un `JobLock` compartido (Valkey) para serlo entre procesos.

## Alternativas consideradas

- `@nestjs/schedule`: es una dependencia externa para un calendario que se resuelve en casa, y acoplaría las librerías a NestJS.
- El `IntervalJob` provisional y el `OutboxRelayWorker` del diseño de F4: cada librería programaría lo suyo.
- Delegar todo a un programador externo como EventBridge: se soporta con `SchedulingMode.External`, pero no sirve para el modo local.
