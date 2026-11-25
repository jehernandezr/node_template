# 0026. Scheduled jobs: ScheduledJob, JobLock and @platform/scheduling

- Status: Accepted
- Date: 2026-11-14

## Context

There are pieces with `runOnce` or `purge` that nothing schedules: the outbox relay, the idempotency and outbox purge, `SagaRecoveryJob` and the rebuild of the Bloom filters. The F4 design proposed a provisional `IntervalJob` and an `OutboxRelayWorker`. With that proposal, each library would end up with its own timers, each with its own way of stopping at shutdown and of avoiding duplicate runs.

## Decision

### Contract in the kernel

The contract lives in `kernel/src/ports/scheduling/`, so that each library declares its jobs without depending on the runner or on NestJS.

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
  | { readonly kind: JobScheduleKind.Cron; readonly expression: string }; // UTC, 5 or 6 fields

export interface JobContext {
  readonly signal: AbortSignal;
  readonly startedAt: Date;
  readonly runId: string;
}

export abstract class ScheduledJob {
  /** Value of an enum of the owning library, for example `MessagingJob.OutboxRelay`. */
  abstract readonly name: string;
  abstract readonly schedule: JobSchedule;
  /** true: a single process in the cluster runs it at a time, with `JobLock`. */
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

The runner lives in the new `@platform/scheduling` library, of type `platform`, which depends on kernel, primitives and observability.

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
  /** Waits for the running jobs up to `graceMs` and aborts their `signal`. */
  stop(graceMs: number): Promise<void>;
  /** Runs once right away. Used by tests, wake-ups and external invocation. */
  runNow(name: string): Promise<void>;
  /** Requests a run soon, without duplicating one in progress. */
  trigger(name: string): void;
}

export class CronExpression {
  static parse(expression: string): CronExpression;
  nextAfter(from: Date): Date;
}

export class InProcessJobLock extends JobLock {} // local mode and tests
export enum SchedulingMode {
  InProcess = 'in-process',
  External = 'external', // no timers: EventBridge or a cron calls runNow
}
```

`CronExpression` is written in house, in about 120 lines, with UTC expressions of 5 or 6 fields. It adds no dependency and no `@nestjs/schedule`. `InProcessJobLock` serves local mode and tests. `ValkeyJobLock` (SET NX PX with a token) lives in `@platform/adapters-valkey`. With `SchedulingMode.External` the runner sets up no timers, and EventBridge or a cron calls `runNow`.

### Discovery

`SchedulingModule` in `@platform/scheduling/nest` uses `DiscoveryService` to discover the providers that are `instanceof ScheduledJob`. A library only declares the class in its `providers` and does not import the scheduling module.

### Assignment

| Job                              | Owner        | Schedule                   | Exclusive |
| -------------------------------- | ------------ | -------------------------- | --------- |
| `OutboxRelayJob`                 | messaging    | every 1 s with jitter      | no        |
| `OutboxRetentionJob`             | messaging    | every hour                 | no        |
| `ProcessedMessageRetentionJob`   | messaging    | every hour                 | no        |
| `ProcessedOperationRetentionJob` | internal-api | every hour                 | no        |
| `SagaRecoveryJob`                | saga         | every 5 s                  | no        |
| `SagaRetentionJob`               | saga         | every hour                 | no        |
| `BloomRebuildJob`                | bloom        | the filter's `rebuildCron` | yes       |

`OutboxMessageBus` calls `runner.trigger` when writing, to publish without waiting for the interval. The relay walks the partitions with `RelayScopes`: `SingleRelayScope` is the default and uses a single database, and `ShardedRelayScopes` in `@platform/adapters-postgres` uses `AcrossShards` and `ShardScope`. That way messaging does not know about TypeORM.

```ts
// @platform/messaging
export abstract class RelayScopes {
  /** Runs `body` once for each partition that has to be published from. */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
export class SingleRelayScope extends RelayScopes {} // default, a single database
// @platform/adapters-postgres: ShardedRelayScopes uses AcrossShards and ShardScope from persistence.
```

### What `exclusive` guarantees

`exclusive` guarantees mutual exclusion while the lease lasts, not one run per occurrence of the schedule. The lease expires after `timeoutMs`: if the run is still going, another replica can take the lock and start another one. Two consecutive occurrences can run in different processes, and an occurrence lost during a restart is not recovered. That is why every job, exclusive or not, is idempotent on its input and honours `context.signal` between units of work: when aborted it stops taking new work, so the next replica does not overlap with what the first one has in flight. What cannot be repeated (a charge, an email) is reserved per unit in the database, not left to the lock.

A daily job uses `JobScheduleKind.Cron` anchored in UTC and not a 24 h interval: the interval counts from startup and, with back-to-back deployments, never elapses. If a lost occurrence is not acceptable, the job runs every hour and decides from its data what is due, like the invoice closing.

### Shutdown

`JobRunner.stop(graceMs)` runs in `BeforeApplicationShutdown`. It waits for the running jobs up to `graceMs` and aborts their `signal`.

## Consequences

### Positive

- A single mechanism for all jobs, without each library having its own timers.
- Jobs are tested by calling `run()` directly.
- The same job can run in the process or be invoked from outside.

### Costs

- A new library to maintain.
- The in-house cron covers only the subset of expressions that is needed.
- An exclusive job depends on a shared `JobLock` (Valkey) to be exclusive across processes.

## Alternatives considered

- `@nestjs/schedule`: it is an external dependency for a schedule that is solved in house, and it would couple the libraries to NestJS.
- The provisional `IntervalJob` and the `OutboxRelayWorker` from the F4 design: each library would schedule its own work.
- Delegating everything to an external scheduler such as EventBridge: it is supported with `SchedulingMode.External`, but it does not work for local mode.
