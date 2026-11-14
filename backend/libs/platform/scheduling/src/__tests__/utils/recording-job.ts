import {
  JobScheduleKind,
  ScheduledJob,
  type JobContext,
  type JobSchedule,
} from '@platform/kernel';

export enum RecordingJobBehavior {
  Succeed = 'succeed',
  Fail = 'fail',
  HangUntilAborted = 'hang-until-aborted',
  /** Termina bien cuando la prueba llama a `release`, aunque se aborte antes. */
  WaitForRelease = 'wait-for-release',
}

export interface RecordingJobOptions {
  readonly name: string;
  readonly schedule?: JobSchedule;
  readonly exclusive?: boolean;
  readonly timeoutMs?: number;
  readonly behavior?: RecordingJobBehavior;
}

const HOUR_MS = 3_600_000;
const DEFAULT_TIMEOUT_MS = 60_000;

/** Job que anota cada corrida para que las pruebas verifiquen qué ocurrió. */
export class RecordingJob extends ScheduledJob {
  override readonly name: string;
  override readonly schedule: JobSchedule;
  override readonly exclusive: boolean;
  override readonly timeoutMs: number;

  runs = 0;
  contexts: JobContext[] = [];
  abortedRuns = 0;

  private readonly behavior: RecordingJobBehavior;
  private releaseRun: () => void = () => undefined;
  private readonly released = new Promise<void>((resolve) => {
    this.releaseRun = resolve;
  });

  constructor(options: RecordingJobOptions) {
    super();
    this.name = options.name;
    this.schedule = options.schedule ?? {
      kind: JobScheduleKind.Interval,
      everyMs: HOUR_MS,
    };
    this.exclusive = options.exclusive ?? false;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.behavior = options.behavior ?? RecordingJobBehavior.Succeed;
  }

  async run(context: JobContext): Promise<void> {
    this.runs += 1;
    this.contexts.push(context);
    if (this.behavior === RecordingJobBehavior.Fail) {
      throw new Error('job failed');
    }
    if (this.behavior === RecordingJobBehavior.HangUntilAborted) {
      await new Promise<void>((resolve) => {
        if (context.signal.aborted) {
          resolve();
          return;
        }
        context.signal.addEventListener('abort', () => resolve(), {
          once: true,
        });
      });
      this.abortedRuns += 1;
    }
    if (this.behavior === RecordingJobBehavior.WaitForRelease) {
      await this.released;
    }
  }

  /** Deja terminar la corrida de un job `WaitForRelease`. */
  release(): void {
    this.releaseRun();
  }
}
