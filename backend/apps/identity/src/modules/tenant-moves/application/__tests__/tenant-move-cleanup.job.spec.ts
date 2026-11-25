import type {
  TenantMoveAck,
  TenantMoveOperations,
  TenantMoveRef,
} from '@contracts/platform';
import { PlatformErrorCode } from '@contracts/platform';
import {
  OperationHandler,
  type CallMeta,
  type HandlerResult,
} from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import type { JobContext } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome, CallOutcomeKind } from '@platform/primitives';
import {
  TenantMoveErrorCode,
  tenantMoveConfigSchema,
} from '@platform/tenant-move';
import { RecordingLogger } from '../../../alerts/__tests__/utils/index.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { InMemoryTenantMoveLog } from '../../__tests__/utils/index.js';
import { TenantMoveCleanupJob } from '../tenant-move-cleanup.job.js';
import { TenantMoveParticipants } from '../tenant-move-participants.js';

const DAY_MS = 24 * 60 * 60_000;
const NOW = new Date('2026-11-24T10:00:00.000Z');
const OLD_MOVE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const RECENT_MOVE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
const TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';

/** Cómo responde la limpieza de un servicio a su llamada número `call`, contando desde 1. */
type CleanupScript = (
  input: TenantMoveRef,
  call: number,
) => CallOutcome<TenantMoveAck>;

const done: CleanupScript = (input) =>
  CallOutcome.success({ moveId: input.moveId });

/**
 * La limpieza de un servicio: responde según su guion y anota cada traslado que terminó de limpiar y cada llave de
 * idempotencia que recibió, que es un intento del job (los reintentos del cliente repiten la llave).
 */
class ScriptedCleanup extends OperationHandler<
  TenantMoveOperations['tenantMoveCleanup']
> {
  readonly cleaned: string[] = [];
  readonly keys = new Set<string>();
  private calls = 0;

  constructor(
    private readonly script: CleanupScript,
    private readonly onCall: () => void = () => undefined,
  ) {
    super();
  }

  get callCount(): number {
    return this.calls;
  }

  async handle(
    input: TenantMoveRef,
    context: CallMeta,
  ): Promise<HandlerResult<TenantMoveAck>> {
    this.calls += 1;
    this.keys.add(context.idempotencyKey);
    this.onCall();
    const outcome = this.script(input, this.calls);
    if (outcome.kind === CallOutcomeKind.Success) {
      this.cleaned.push(input.moveId);
    }
    return { outcome };
  }
}

const context = (): JobContext => ({
  signal: new AbortController().signal,
  startedAt: NOW,
  runId: 'run-1',
});

describe('TenantMoveCleanupJob', () => {
  const setup = (
    scripts: Partial<Record<number, CleanupScript>> = {},
    onCall?: (clock: FixedClock) => void,
    maxAttempts = 30,
  ) => {
    const clock = new FixedClock(NOW);
    const ids = new SequentialIdGenerator();
    const operations = TenantMoveParticipants.ALL.map(
      (service) => service.tenantMoveCleanup,
    );
    const api = new InProcessInternalApi({ clock, ids, operations });
    const handlers = operations.map((operation, index) => {
      const handler = new ScriptedCleanup(scripts[index] ?? done, () =>
        onCall?.(clock),
      );
      api.router.register(operation, handler);
      return handler;
    });
    const log = new InMemoryTenantMoveLog();
    const logger = new RecordingLogger();
    const job = new TenantMoveCleanupJob(
      log,
      api.client,
      clock,
      new SequentialIdGenerator(),
      logger,
      tenantMoveConfigSchema.parse({
        TENANT_MOVE_GRACE_DAYS: '7',
        TENANT_MOVE_CLEANUP_PAUSE_MS: '1',
        TENANT_MOVE_CLEANUP_MAX_ATTEMPTS: String(maxAttempts),
      }),
    );
    return { clock, handlers, job, log, logger };
  };

  const switchedMove = async (
    log: InMemoryTenantMoveLog,
    moveId: string,
    tenantId: string,
    daysAgo: number,
  ): Promise<void> => {
    await log.start({
      moveId,
      tenantId,
      targetGroup: 'sa-group-1',
      targetRegion: 'sa-east-1',
      sagaId: moveId,
      status: TenantMoveStatus.Running,
      startedAt: new Date(NOW.getTime() - (daysAgo + 1) * DAY_MS),
    });
    await log.markSwitched(moveId, new Date(NOW.getTime() - daysAgo * DAY_MS));
  };

  it('cleans the source of every service once the grace has passed', async () => {
    const { handlers, job, log } = setup();
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);
    await switchedMove(log, RECENT_MOVE, TENANT_B, 2);

    await job.run(context());

    for (const handler of handlers) {
      expect(handler.cleaned).toEqual([OLD_MOVE]);
    }
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.CleanedUp);
    expect(log.find(RECENT_MOVE)?.status).toBe(TenantMoveStatus.Switched);
  });

  it('leaves the cleanup of a tenant that has another move in progress for a later run', async () => {
    const { handlers, job, log } = setup();
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);
    await log.start({
      moveId: RECENT_MOVE,
      tenantId: TENANT_A,
      targetGroup: 'sa-group-0',
      targetRegion: 'sa-east-1',
      sagaId: RECENT_MOVE,
      status: TenantMoveStatus.Running,
      startedAt: NOW,
    });

    await job.run(context());

    for (const handler of handlers) {
      expect(handler.callCount).toBe(0);
    }
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.Switched);
  });

  it('repeats a cleanup that answers that its round goes on until the service finishes it in the same run', async () => {
    const { handlers, job, log } = setup({
      0: (input, call) =>
        call <= 4
          ? CallOutcome.transientFailure(TenantMoveErrorCode.RoundPending)
          : done(input, call),
    });
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);

    await job.run(context());

    // Más llamadas que los intentos que el cliente hace por su cuenta en una sola llamada.
    expect(handlers[0]?.callCount).toBe(5);
    expect(handlers[0]?.keys.size).toBeGreaterThan(1);
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.CleanedUp);
  });

  it('stops asking a service that keeps answering that its round goes on once it reaches the attempt cap', async () => {
    const maxAttempts = 2;
    const { handlers, job, log } = setup(
      {
        0: () => CallOutcome.transientFailure(TenantMoveErrorCode.RoundPending),
      },
      undefined,
      maxAttempts,
    );
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);

    await job.run(context());

    expect(handlers[0]?.keys.size).toBe(maxAttempts);
    for (const handler of handlers.slice(1)) {
      expect(handler.cleaned).toEqual([OLD_MOVE]);
    }
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.Switched);
  });

  it('stops repeating a pending round when the run is aborted during the pause', async () => {
    const controller = new AbortController();
    const { handlers, job, log } = setup({
      0: () => {
        controller.abort();
        return CallOutcome.transientFailure(TenantMoveErrorCode.RoundPending);
      },
    });
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);

    await job.run({ ...context(), signal: controller.signal });

    expect(handlers[0]?.keys.size).toBe(1);
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.Switched);
  });

  it('tries the other services when one fails, and asks that one again on the next run with a new key', async () => {
    const { clock, handlers, job, log, logger } = setup({
      1: (input, call) =>
        call === 1
          ? CallOutcome.businessError(PlatformErrorCode.InternalUnexpected)
          : done(input, call),
    });
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);

    await job.run(context());
    const afterFirstRun = log.find(OLD_MOVE)?.status;
    clock.advance(60 * 60_000);
    await job.run(context());

    expect(afterFirstRun).toBe(TenantMoveStatus.Switched);
    expect(handlers.at(-1)?.cleaned).toEqual([OLD_MOVE, OLD_MOVE]);
    expect(handlers[1]?.cleaned).toEqual([OLD_MOVE]);
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.CleanedUp);
    expect(logger.lines).toEqual([
      expect.objectContaining({
        message: 'tenant move cleanup postponed',
        fields: expect.objectContaining({
          moveId: OLD_MOVE,
          pending: [
            expect.stringContaining(
              TenantMoveParticipants.ALL[1]?.tenantMoveCleanup.id ?? '',
            ),
          ],
        }),
      }),
    ]);
  });

  it('gives every service its turn when one keeps cleaning a large tenant past its slice of the run', async () => {
    const { handlers, job, log } = setup(
      {
        0: () => CallOutcome.transientFailure(TenantMoveErrorCode.RoundPending),
      },
      (clock) => clock.advance(45_000),
    );
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);

    await job.run(context());

    expect(handlers[0]?.cleaned).toEqual([]);
    for (const handler of handlers.slice(1)) {
      expect(handler.cleaned).toEqual([OLD_MOVE]);
    }
    expect(log.find(OLD_MOVE)).toMatchObject({
      status: TenantMoveStatus.Switched,
      cleanupAttemptedAt: NOW,
    });
  });

  it('starts each run with the moves that waited longest for an attempt, so moves that always fail do not hide the rest', async () => {
    const failing = Array.from(
      { length: 20 },
      (_, index) =>
        `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e${index.toString(16).padStart(4, '0')}`,
    );
    const { clock, job, log } = setup({
      2: (input, call) =>
        failing.includes(input.moveId)
          ? CallOutcome.businessError(PlatformErrorCode.InternalUnexpected)
          : done(input, call),
    });
    for (const moveId of failing) {
      await switchedMove(log, moveId, moveId, 30);
    }
    await switchedMove(log, RECENT_MOVE, TENANT_B, 8);

    await job.run(context());
    const afterFirstRun = log.find(RECENT_MOVE)?.status;
    clock.advance(60 * 60_000);
    await job.run(context());

    expect(afterFirstRun).toBe(TenantMoveStatus.Switched);
    expect(log.find(RECENT_MOVE)?.status).toBe(TenantMoveStatus.CleanedUp);
  });

  it('starts nothing once the run is aborted', async () => {
    const { handlers, job, log } = setup();
    await switchedMove(log, OLD_MOVE, TENANT_A, 8);
    const controller = new AbortController();
    controller.abort();

    await job.run({ ...context(), signal: controller.signal });

    expect(handlers[0]?.callCount).toBe(0);
    expect(log.find(OLD_MOVE)?.status).toBe(TenantMoveStatus.Switched);
  });
});
