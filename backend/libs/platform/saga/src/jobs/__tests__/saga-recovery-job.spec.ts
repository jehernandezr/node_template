import { PlatformErrorCode } from '@contracts/platform';
import { JobScheduleKind } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { LoggerPort } from '@platform/observability';
import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaSettings } from '../../engine/saga-settings.js';
import { SagaInstance } from '../../model/saga-instance.js';
import { SagaScopes } from '../../store/saga-scopes.js';
import { SagaRecoveryJob } from '../saga-recovery-job.js';
import { SagaJob } from '../saga-job.enum.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';

const NOW = SagaInstanceBuilder.NOW;

/** Test engine: responds based on the saga id and counts the resumes. */
class ScriptedEngine {
  readonly resumed: string[] = [];
  private readonly outcomes = new Map<string, Error>();

  fail(sagaId: string, error: Error): void {
    this.outcomes.set(sagaId, error);
  }

  async resume(sagaId: string): Promise<SagaInstance> {
    this.resumed.push(sagaId);
    const error = this.outcomes.get(sagaId);
    if (error !== undefined) {
      throw error;
    }
    return SagaInstanceBuilder.aSaga().with({ id: sagaId }).build();
  }
}

/** Store that remembers which limit it was queried with. */
class RecordingStore extends InMemorySagaStore {
  readonly limits: number[] = [];

  override async findRecoverable(
    now: Date,
    limit: number,
  ): Promise<SagaInstance[]> {
    this.limits.push(limit);
    return super.findRecoverable(now, limit);
  }
}

/** Scope that remembers which instances it received. */
class RecordingScopes extends SagaScopes {
  readonly seen: string[] = [];

  override run<T>(instance: SagaInstance, body: () => Promise<T>): Promise<T> {
    this.seen.push(instance.id);
    return body();
  }
}

/** In-memory log of the error messages. */
class RecordingLogger extends LoggerPort {
  readonly errors: { message: string; fields?: Record<string, unknown> }[] = [];

  readonly others: string[] = [];

  debug(message: string): void {
    this.others.push(message);
  }

  info(message: string): void {
    this.others.push(message);
  }

  warn(message: string): void {
    this.others.push(message);
  }

  child(): LoggerPort {
    return this;
  }
  error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }
}

function settings(extra: { recoveryBatchSize?: number } = {}): SagaSettings {
  return new SagaSettings(
    { owner: 'node-b', leaseMs: 60_000, maxStepDurationMs: 1_000, ...extra },
    new FixedRandomSource([0.5]),
  );
}

/** An overdue saga that the job must resume, in `Running` with an expired lease. */
function expiredSaga(id: string): SagaInstance {
  return SagaInstanceBuilder.aSaga()
    .with({
      id,
      leaseToken: 'node-a:1',
      leaseUntil: new Date(NOW.getTime() - 1),
    })
    .build();
}

describe('SagaRecoveryJob', () => {
  it('un fallo en una saga se registra y el lote sigue con las demás', async () => {
    const store = new InMemorySagaStore();
    await store.create(expiredSaga('good'));
    await store.create(expiredSaga('ghost'));
    const engine = new ScriptedEngine();
    engine.fail(
      'ghost',
      new SagaError(SagaErrorCode.UnknownDefinition, 'no saga registered'),
    );
    const job = new SagaRecoveryJob({
      engine: engine,
      store,
      scopes: new RecordingScopes(),
      settings: settings(),
      clock: new FixedClock(NOW),
    });

    const report = await job.runOnce(10);

    expect(report.resumed).toEqual(['good']);
    expect(report.failed).toEqual([
      {
        sagaId: 'ghost',
        errorCode: SagaErrorCode.UnknownDefinition,
        detail: expect.stringContaining(SagaErrorCode.UnknownDefinition),
      },
    ]);
  });

  it('un error inesperado da PLATFORM.INTERNAL.UNEXPECTED y lo registra', async () => {
    const store = new InMemorySagaStore();
    await store.create(expiredSaga('s1'));
    const engine = new ScriptedEngine();
    engine.fail('s1', new Error('boom'));
    const logger = new RecordingLogger();
    const job = new SagaRecoveryJob({
      engine: engine,
      store,
      scopes: new RecordingScopes(),
      settings: settings(),
      clock: new FixedClock(NOW),
      logger,
    });

    const report = await job.runOnce(10);

    expect(logger.errors).toEqual([
      {
        message: 'saga recovery failed',
        fields: expect.objectContaining({
          sagaId: 's1',
          errorCode: PlatformErrorCode.InternalUnexpected,
        }),
      },
    ]);
    expect(report.failed).toEqual([
      {
        sagaId: 's1',
        errorCode: PlatformErrorCode.InternalUnexpected,
        detail: 'Error: boom',
      },
    ]);
  });

  it('un PlatformError conserva su código en el fallo', async () => {
    const store = new InMemorySagaStore();
    await store.create(expiredSaga('s1'));
    const engine = new ScriptedEngine();
    engine.fail(
      's1',
      new SagaError(SagaErrorCode.InvalidState, 'not runnable'),
    );
    const job = new SagaRecoveryJob({
      engine: engine,
      store,
      scopes: new RecordingScopes(),
      settings: settings(),
      clock: new FixedClock(NOW),
    });

    const report = await job.runOnce(10);

    expect(report.failed[0]?.errorCode).toBe(SagaErrorCode.InvalidState);
    expect(report.failed[0]?.errorCode).not.toBe(
      PlatformErrorCode.InternalUnexpected,
    );
  });

  it('se salta la contención sin registrar fallo ni error', async () => {
    const store = new InMemorySagaStore();
    await store.create(expiredSaga('busy'));
    const engine = new ScriptedEngine();
    engine.fail(
      'busy',
      new SagaError(SagaErrorCode.LeaseNotAcquired, 'leased elsewhere'),
    );
    const logger = new RecordingLogger();
    const job = new SagaRecoveryJob({
      engine: engine,
      store,
      scopes: new RecordingScopes(),
      settings: settings(),
      clock: new FixedClock(NOW),
      logger,
    });

    const report = await job.runOnce(10);

    expect(report).toEqual({ resumed: [], failed: [] });
    expect(logger.errors).toEqual([]);
  });

  it('run usa settings.recoveryBatchSize como límite', async () => {
    const store = new RecordingStore();
    const job = new SagaRecoveryJob({
      engine: new ScriptedEngine(),
      store,
      scopes: new RecordingScopes(),
      settings: settings({ recoveryBatchSize: 7 }),
      clock: new FixedClock(NOW),
    });

    await job.run();

    expect(store.limits).toEqual([7]);
  });

  it('el ámbito recibe cada instancia recuperada antes de reanudarla', async () => {
    const store = new InMemorySagaStore();
    await store.create(expiredSaga('a'));
    await store.create(expiredSaga('b'));
    const scopes = new RecordingScopes();
    const engine = new ScriptedEngine();
    const job = new SagaRecoveryJob({
      engine: engine,
      store,
      scopes,
      settings: settings(),
      clock: new FixedClock(NOW),
    });

    const report = await job.runOnce(10);

    expect(scopes.seen).toEqual(['a', 'b']);
    expect(engine.resumed).toEqual(['a', 'b']);
    expect(report.resumed).toEqual(['a', 'b']);
  });

  it('se programa cada 5 segundos con el nombre de su enum', () => {
    const job = new SagaRecoveryJob({
      engine: new ScriptedEngine(),
      store: new InMemorySagaStore(),
      scopes: new RecordingScopes(),
      settings: settings(),
      clock: new FixedClock(NOW),
    });

    expect(job.name).toBe(SagaJob.Recovery);
    expect(job.schedule).toMatchObject({
      kind: JobScheduleKind.Interval,
      everyMs: 5_000,
    });
  });
});
