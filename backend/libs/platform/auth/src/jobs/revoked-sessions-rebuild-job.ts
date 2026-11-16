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
 * Reconstruye el Bloom de sesiones revocadas desde `auth:revoked-index`. No es
 * exclusivo: el filtro vive en la memoria de cada proceso y cada uno tiene que
 * llenar el suyo, también para recuperar los avisos del canal que se perdieron.
 */
export class RevokedSessionsRebuildJob extends ScheduledJob {
  static readonly EVERY_MS = 10_000;
  /** Desfasa a los procesos para que no lean el índice todos en el mismo instante. */
  static readonly JITTER_RATIO = 0.1;

  readonly name = AuthJob.RevokedSessionsRebuild;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: RevokedSessionsRebuildJob.EVERY_MS,
    jitterRatio: RevokedSessionsRebuildJob.JITTER_RATIO,
  };
  override readonly exclusive = false;

  /** @param source El lector de Valkey, sin las cachés locales. */
  constructor(
    private readonly source: AuthStateReader,
    private readonly registry: RevokedSessionRegistry,
  ) {
    super();
  }

  /** @throws el error de la lectura del índice; el registro conserva el filtro anterior. */
  async run(context: JobContext): Promise<void> {
    await this.registry.rebuild(this.source.revokedSessionIds(context.signal));
  }
}
