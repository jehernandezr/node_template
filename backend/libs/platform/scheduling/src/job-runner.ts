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
  /** Cancels the pending timer; `undefined` if there is none. */
  cancelTimer?: () => void;
  /** Run in progress, so two runs of the same job do not overlap in this process. */
  running?: Promise<void>;
}

/**
 * Runs the registered `ScheduledJob`s. In local mode it sets up a timer per
 * job; in external mode `start` is not called and something else invokes `runNow`. A
 * run never overlaps another run of the same job in this process, and the
 * next one is scheduled when the previous one ends.
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
   * Registers a job to be scheduled when the runner starts.
   * @param job Job to register.
   * @throws DuplicateJobError if the name is already registered.
   * @throws InvalidJobScheduleError or InvalidCronExpressionError if the schedule is not valid.
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

  /** Sets up the timers of all jobs. Does nothing if it is already started. */
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
   * Stops scheduling runs and waits for the ones in progress up to `graceMs`.
   * If they time out, aborts their `signal` and waits for them to finish.
   * @param graceMs Time to wait for running jobs.
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
   * Runs the job now and waits for the result; if a run is already in progress, waits for that one.
   * @param name Job to run.
   * @throws UnknownJobError if it is not registered.
   * @throws The job error if the run fails.
   */
  async runNow(name: string): Promise<void> {
    return this.run(this.entryFor(name));
  }

  /**
   * Requests a run soon. Does nothing if the runner is not started or if the
   * job is already running.
   * @param name Job to run.
   * @throws UnknownJobError if it is not registered.
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

  /**
   * Keeps the process alive: a worker that only runs jobs has nothing else holding it up.
   */
  private arm(entry: JobEntry, delayMs: number): void {
    entry.cancelTimer?.();
    entry.cancelTimer = TimerScheduler.arm(delayMs, () => {
      entry.cancelTimer = undefined;
      void this.tick(entry);
    });
  }

  /**
   * The failure is already in the log and the metrics; the next cycle continues.
   */
  private async tick(entry: JobEntry): Promise<void> {
    if (!this.started) {
      return;
    }
    try {
      await this.run(entry);
    } catch {}
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
