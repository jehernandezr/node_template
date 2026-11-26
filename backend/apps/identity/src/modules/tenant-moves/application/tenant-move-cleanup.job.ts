import { Inject, Injectable } from '@nestjs/common';
import type {
  TenantMoveAck,
  TenantMoveOperations,
  TenantMoveRef,
} from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import {
  Clock,
  IdGenerator,
  JobScheduleKind,
  ScheduledJob,
  type JobContext,
  type JobSchedule,
} from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import {
  CallOutcomeKind,
  TimerScheduler,
  type CallOutcome,
} from '@platform/primitives';
import {
  TenantMoveConfig,
  TenantMoveErrorCode,
  type TenantMoveSettings,
} from '@platform/tenant-move';
import { IdentityJob } from '../../../shared/enums/identity-job.enum.js';
import type { TenantMove } from '../domain/tenant-move.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';
import { TenantMoveParticipants } from './tenant-move-participants.js';

/**
 * Once the grace period has passed since every service points to the target, asks each one to delete what remained of the tenant
 * in the source. Each call deletes what fits in its time budget and responds that the round continues: the job repeats it, with a
 * new key per attempt and a short pause between attempts so as not to load the shard without respite, until the service
 * finishes, its slice of the run ends or it reaches the attempt cap. A failing service does not
 * prevent trying the others, and a move that does not finish is left for the next run, which starts with those that
 * have gone longest without an attempt. A tenant with another move in progress waits: that move may return to the shard that
 * was going to be cleaned, and between its `finalize` and its `switch` the good copy lives there.
 */
@Injectable()
export class TenantMoveCleanupJob extends ScheduledJob {
  private static readonly EVERY_MS = 60 * 60_000;
  private static readonly DAY_MS = 24 * 60 * 60_000;
  private static readonly BATCH = 20;
  /** Time of a run during which it starts calls; leaves margin for the last one before `timeoutMs`. */
  private static readonly RUN_BUDGET_MS = 14 * 60_000;
  /** Time for each service per move and run, so a large one does not starve the others. */
  private static readonly SERVICE_SLICE_MS = 2 * 60_000;

  readonly name = IdentityJob.CleanUpTenantMoves;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: TenantMoveCleanupJob.EVERY_MS,
  };
  override readonly exclusive = true;
  override readonly timeoutMs = 15 * 60_000;

  constructor(
    private readonly log: TenantMoveLog,
    private readonly client: InternalClient,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger: LoggerPort,
    @Inject(TenantMoveConfig.token)
    private readonly settings: TenantMoveSettings,
  ) {
    super();
  }

  override async run(context: JobContext): Promise<void> {
    const runEndsAt = this.nowMs() + TenantMoveCleanupJob.RUN_BUDGET_MS;
    const graceMs =
      this.settings.TENANT_MOVE_GRACE_DAYS * TenantMoveCleanupJob.DAY_MS;
    const due = await this.log.switchedBefore(
      new Date(this.nowMs() - graceMs),
      TenantMoveCleanupJob.BATCH,
    );
    for (const move of due) {
      if (this.nowMs() >= runEndsAt || context.signal.aborted) {
        return;
      }
      if ((await this.log.runningFor(move.tenantId)) !== undefined) {
        this.logger.info('tenant move cleanup waits for a move in progress', {
          moveId: move.moveId,
          tenantId: move.tenantId,
        });
        continue;
      }
      await this.log.markCleanupAttempted(move.moveId, this.clock.now());
      const pending = await this.cleanUp(move, runEndsAt, context.signal);
      if (pending.length === 0) {
        await this.log.markCleanedUp(move.moveId);
      } else {
        this.logger.warn('tenant move cleanup postponed', {
          moveId: move.moveId,
          tenantId: move.tenantId,
          pending,
        });
      }
    }
  }

  /** Requests the cleanup from each service. Returns what each one that did not finish responded. */
  private async cleanUp(
    move: TenantMove,
    runEndsAt: number,
    signal: AbortSignal,
  ): Promise<string[]> {
    const ref: TenantMoveRef = {
      moveId: move.moveId,
      tenantId: move.tenantId,
      targetGroup: move.targetGroup,
      targetRegion: move.targetRegion,
    };
    const pending: string[] = [];
    for (const service of TenantMoveParticipants.ALL) {
      const operation = service.tenantMoveCleanup;
      const sliceEndsAt = Math.min(
        runEndsAt,
        this.nowMs() + TenantMoveCleanupJob.SERVICE_SLICE_MS,
      );
      const outcome = await this.untilFinished(
        operation,
        ref,
        sliceEndsAt,
        signal,
      );
      if (outcome.kind !== CallOutcomeKind.Success) {
        pending.push(
          `${operation.id}: ${TenantMoveCleanupJob.describe(outcome)}`,
        );
      }
    }
    return pending;
  }

  /**
   * Repeats the call, with a pause between attempts, while the service responds that its cleanup continues, there is
   * time left in its slice and the attempt cap has not been reached.
   */
  private async untilFinished(
    operation: TenantMoveOperations['tenantMoveCleanup'],
    ref: TenantMoveRef,
    sliceEndsAt: number,
    signal: AbortSignal,
  ): Promise<CallOutcome<TenantMoveAck>> {
    const call = () =>
      this.client.call(operation, ref, {
        idempotencyKey: this.ids.next().toString(),
        signal,
      });
    let outcome = await call();
    for (
      let attempt = 1;
      attempt < this.settings.TENANT_MOVE_CLEANUP_MAX_ATTEMPTS &&
      TenantMoveCleanupJob.roundPending(outcome) &&
      this.nowMs() < sliceEndsAt &&
      !signal.aborted;
      attempt += 1
    ) {
      await this.pause(signal);
      if (signal.aborted) {
        break;
      }
      outcome = await call();
    }
    return outcome;
  }

  /** Waits for the pause between attempts; an abort cuts it short. */
  private pause(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = (): void => {
        signal.removeEventListener('abort', done);
        cancel();
        resolve();
      };
      const cancel = TimerScheduler.arm(
        this.settings.TENANT_MOVE_CLEANUP_PAUSE_MS,
        done,
      );
      signal.addEventListener('abort', done, { once: true });
    });
  }

  private static roundPending(outcome: CallOutcome<TenantMoveAck>): boolean {
    return (
      outcome.kind === CallOutcomeKind.TransientFailure &&
      outcome.reason === TenantMoveErrorCode.RoundPending
    );
  }

  private nowMs(): number {
    return this.clock.now().getTime();
  }

  private static describe(outcome: CallOutcome<TenantMoveAck>): string {
    switch (outcome.kind) {
      case CallOutcomeKind.BusinessError:
        return outcome.code;
      case CallOutcomeKind.Success:
        return outcome.kind;
      default:
        return `${outcome.kind} ${outcome.reason}`;
    }
  }
}
