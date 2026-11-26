import {
  JobScheduleKind,
  ScheduledJob,
  type JobContext,
  type JobSchedule,
} from '@platform/kernel';
import type { AuthStateReader } from '../state/auth-state-reader.js';
import type { RevokedSessionRegistry } from '../state/revoked-session-registry.js';
import { AuthJob } from './auth-job.enum.js';

/**
 * Rebuilds the revoked sessions Bloom filter from `auth:revoked-index`. It is not
 * exclusive: the filter lives in the memory of each process and each one has to
 * fill its own, also to recover the channel notices that were lost.
 */
export class RevokedSessionsRebuildJob extends ScheduledJob {
  static readonly EVERY_MS = 10_000;
  /** Staggers the processes so they do not all read the index at the same instant. */
  static readonly JITTER_RATIO = 0.1;

  readonly name = AuthJob.RevokedSessionsRebuild;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: RevokedSessionsRebuildJob.EVERY_MS,
    jitterRatio: RevokedSessionsRebuildJob.JITTER_RATIO,
  };
  override readonly exclusive = false;

  /** @param source The Valkey reader, without the local caches. */
  constructor(
    private readonly source: AuthStateReader,
    private readonly registry: RevokedSessionRegistry,
  ) {
    super();
  }

  /** @throws the index read error; the registry keeps the previous filter. */
  override async run(context: JobContext): Promise<void> {
    await this.registry.rebuild(this.source.revokedSessionIds(context.signal));
  }
}
