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
 * Pasada la gracia desde que todos los servicios apuntan al destino, pide a cada uno que borre lo que quedó del tenant
 * en el origen. Cada llamada borra lo que cabe en su plazo y responde que la ronda sigue: el job la repite, con una
 * llave nueva por intento y una pausa corta entre intentos para no cargar el shard sin respiro, hasta que el servicio
 * termina, se acaba su tramo de la corrida o llega al tope de intentos. Un servicio que falla no
 * impide intentar los demás, y un traslado que no termina queda para la corrida siguiente, que empieza por los que
 * llevan más tiempo sin intentarse. Un tenant con otro traslado en curso espera: ese traslado puede volver al shard que
 * se iba a limpiar y entre su `finalize` y su `switch` la copia buena vive ahí.
 */
@Injectable()
export class TenantMoveCleanupJob extends ScheduledJob {
  private static readonly EVERY_MS = 60 * 60_000;
  private static readonly DAY_MS = 24 * 60 * 60_000;
  private static readonly BATCH = 20;
  /** Tiempo de una corrida en que empieza llamadas; deja margen a la última antes de `timeoutMs`. */
  private static readonly RUN_BUDGET_MS = 14 * 60_000;
  /** Tiempo de cada servicio por traslado y corrida, para que uno grande no deje sin turno a los demás. */
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

  async run(context: JobContext): Promise<void> {
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

  /** Pide la limpieza a cada servicio. Devuelve lo que respondió cada uno que no terminó. */
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
   * Repite la llamada, con una pausa entre intentos, mientras el servicio responde que su limpieza sigue, queda
   * tiempo en su tramo y no se llegó al tope de intentos.
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

  /** Espera la pausa entre intentos; un aborto la corta antes. */
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
