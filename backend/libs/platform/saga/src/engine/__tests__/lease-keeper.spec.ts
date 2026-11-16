import {
  FixedClock,
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { Deadline } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { RecordingLogger } from '../../__tests__/utils/recording-logger.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';
import { LeaseKeeper } from '../lease-keeper.js';
import { SagaSettings } from '../saga-settings.js';

/** Almacén cuya liberación del lease falla, como una base caída. */
class BrokenReleaseStore extends InMemorySagaStore {
  override async releaseLease(): Promise<void> {
    throw new Error('database unavailable');
  }
}

function keeperFor(store: InMemorySagaStore, logger?: RecordingLogger) {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const settings = new SagaSettings(
    { owner: 'node-a' },
    new FixedRandomSource([0.5]),
  );
  return {
    clock,
    keeper: new LeaseKeeper(
      store,
      settings,
      clock,
      new SequentialIdGenerator(),
      logger,
    ),
  };
}

async function codeOf(action: Promise<unknown>): Promise<unknown> {
  try {
    await action;
  } catch (error) {
    return error instanceof SagaError ? error.code : error;
  }
  return undefined;
}

describe('LeaseKeeper', () => {
  it('crea una corrida con el owner y un token que sale del IdGenerator', () => {
    const { keeper } = keeperFor(new InMemorySagaStore());

    const run = keeper.newRun('s1');

    expect(run.sagaId).toBe('s1');
    expect(run.token).toMatch(/^node-a:[0-9a-f-]{36}$/);
  });

  it('rechaza tomar el lease de una saga que no existe con NotFound', async () => {
    const { keeper } = keeperFor(new InMemorySagaStore());

    expect(await codeOf(keeper.acquire(keeper.newRun('missing')))).toBe(
      SagaErrorCode.NotFound,
    );
  });

  it('rechaza tomar un lease que tiene otra corrida con LeaseNotAcquired', async () => {
    const store = new InMemorySagaStore();
    const { keeper, clock } = keeperFor(store);
    await store.create(SagaInstanceBuilder.aSaga().build());
    await store.tryAcquireLease(
      SagaInstanceBuilder.DEFAULT_ID,
      'other:1',
      new Date(clock.now().getTime() + 60_000),
      clock.now(),
    );

    expect(
      await codeOf(
        keeper.acquire(keeper.newRun(SagaInstanceBuilder.DEFAULT_ID)),
      ),
    ).toBe(SagaErrorCode.LeaseNotAcquired);
  });

  it('lanza LeaseLost cuando la renovación del lease se pierde', async () => {
    const store = new InMemorySagaStore();
    const { keeper, clock } = keeperFor(store);
    const run = keeper.newRun('s1');

    expect(
      await codeOf(keeper.renewPast(run, Deadline.after(1_000, clock))),
    ).toBe(SagaErrorCode.LeaseLost);
  });

  it('no lanza al soltar el lease fallido y lo registra', async () => {
    const logger = new RecordingLogger();
    const { keeper } = keeperFor(new BrokenReleaseStore(), logger);

    await expect(
      keeper.releaseQuietly(keeper.newRun('s1')),
    ).resolves.toBeUndefined();
    expect(logger.at('warn')).toHaveLength(1);
  });
});
