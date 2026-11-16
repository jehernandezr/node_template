import type {
  Clock,
  JobLock,
  RandomSource,
  ScheduledJob,
} from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { TimerScheduler } from '@platform/primitives';
import { DuplicateJobError } from './errors/duplicate-job.error.js';
import { UnknownJobError } from './errors/unknown-job.error.js';
import { JobExecution } from './job-execution.js';
import { JobSchedulePlanner } from './job-schedule-planner.js';

interface JobEntry {
  readonly job: ScheduledJob;
  /** Cancela el temporizador pendiente; `undefined` si no hay ninguno. */
  cancelTimer?: () => void;
  /** Corrida en curso, para no solapar dos del mismo job en este proceso. */
  running?: Promise<void>;
}

/**
 * Corre los `ScheduledJob` registrados. En modo local arma un temporizador por
 * job; en modo externo no se llama a `start` y alguien más invoca `runNow`. Una
 * corrida nunca se solapa con otra del mismo job en este proceso, y la
 * siguiente se programa cuando la anterior termina.
 */
export class JobRunner {
  private readonly entries = new Map<string, JobEntry>();
  private readonly planner: JobSchedulePlanner;
  private readonly execution: JobExecution;
  private started = false;
  private shutdown = new AbortController();

  constructor(
    clock: Clock,
    random: RandomSource,
    lock: JobLock,
    logger: LoggerPort,
    metrics: MetricsPort,
  ) {
    this.planner = new JobSchedulePlanner(clock, random);
    this.execution = new JobExecution(clock, random, lock, logger, metrics);
  }

  /**
   * @throws DuplicateJobError si el nombre ya está registrado.
   * @throws InvalidJobScheduleError o InvalidCronExpressionError si el calendario no es válido.
   */
  register(job: ScheduledJob): void {
    if (this.entries.has(job.name)) {
      throw new DuplicateJobError(job.name);
    }
    this.planner.validate(job);
    const entry: JobEntry = { job };
    this.entries.set(job.name, entry);
    if (this.started) {
      this.arm(entry, this.planner.delayMs(job));
    }
  }

  /** Arma los temporizadores de todos los jobs. No hace nada si ya está iniciado. */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.shutdown = new AbortController();
    for (const entry of this.entries.values()) {
      this.arm(entry, this.planner.delayMs(entry.job));
    }
  }

  /**
   * Deja de programar corridas y espera las que están en curso hasta `graceMs`.
   * Si vencen, aborta su `signal` y espera a que terminen.
   */
  async stop(graceMs: number): Promise<void> {
    this.started = false;
    const pending: Promise<void>[] = [];
    for (const entry of this.entries.values()) {
      entry.cancelTimer?.();
      entry.cancelTimer = undefined;
      if (entry.running !== undefined) {
        pending.push(entry.running.catch(() => undefined));
      }
    }
    if (pending.length === 0) {
      return;
    }
    const settled = Promise.all(pending);
    let cancelGrace: () => void = () => undefined;
    const graceExpired = new Promise<boolean>((resolve) => {
      cancelGrace = TimerScheduler.armDetached(graceMs, () => resolve(true));
    });
    const expired = await Promise.race([
      settled.then(() => false),
      graceExpired,
    ]);
    cancelGrace();
    if (expired) {
      this.shutdown.abort();
      await settled;
    }
  }

  /**
   * Corre el job ya y espera el resultado; si ya hay una corrida en curso, espera esa.
   * @throws UnknownJobError si no está registrado.
   * @throws El error del job si la corrida falla.
   */
  async runNow(name: string): Promise<void> {
    return this.run(this.entryFor(name));
  }

  /**
   * Pide una corrida pronto. No hace nada si el runner no está iniciado o si el
   * job ya está corriendo.
   * @throws UnknownJobError si no está registrado.
   */
  trigger(name: string): void {
    const entry = this.entryFor(name);
    if (!this.started || entry.running !== undefined) {
      return;
    }
    this.arm(entry, 0);
  }

  private entryFor(name: string): JobEntry {
    const entry = this.entries.get(name);
    if (entry === undefined) {
      throw new UnknownJobError(name);
    }
    return entry;
  }

  private arm(entry: JobEntry, delayMs: number): void {
    entry.cancelTimer?.();
    // Mantiene vivo el proceso: un worker que solo corre jobs no tiene otra cosa que lo sostenga.
    entry.cancelTimer = TimerScheduler.arm(delayMs, () => {
      entry.cancelTimer = undefined;
      void this.tick(entry);
    });
  }

  private async tick(entry: JobEntry): Promise<void> {
    if (!this.started) {
      return;
    }
    try {
      await this.run(entry);
    } catch {
      // La falla ya quedó en el log y en las métricas; el siguiente ciclo sigue.
    }
    if (this.started && entry.cancelTimer === undefined) {
      this.arm(entry, this.planner.delayMs(entry.job));
    }
  }

  private run(entry: JobEntry): Promise<void> {
    if (entry.running !== undefined) {
      return entry.running;
    }
    const running = this.execution
      .execute(entry.job, this.shutdown.signal)
      .then(() => undefined)
      .finally(() => {
        entry.running = undefined;
      });
    entry.running = running;
    return running;
  }
}
