import { JobScheduleKind } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { SagaSettings } from '../../engine/saga-settings.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';
import { SagaJob } from '../saga-job.enum.js';
import { SagaRetentionJob } from '../saga-retention-job.js';

const NOW = SagaInstanceBuilder.NOW;
const RETENTION_MS = 60_000;

function settings(): SagaSettings {
  return new SagaSettings(
    {
      owner: 'node-a',
      leaseMs: 60_000,
      maxStepDurationMs: 1_000,
      retentionMs: RETENTION_MS,
    },
    new FixedRandomSource([0.5]),
  );
}

/** Saga with the given status and age, relative to `NOW`. */
function saga(id: string, status: SagaStatus, ageMs: number) {
  return SagaInstanceBuilder.aSaga()
    .with({
      id,
      status,
      updatedAt: new Date(NOW.getTime() - ageMs),
      createdAt: new Date(NOW.getTime() - ageMs),
    })
    .build();
}

describe('SagaRetentionJob', () => {
  it('deletes the Completed and Compensated sagas older than now - retentionMs and leaves the rest', async () => {
    const store = new InMemorySagaStore();
    await store.create(
      saga('old-completed', SagaStatus.Completed, RETENTION_MS + 1),
    );
    await store.create(
      saga('old-compensated', SagaStatus.Compensated, RETENTION_MS + 1),
    );
    await store.create(
      saga('recent-completed', SagaStatus.Completed, RETENTION_MS - 1),
    );
    await store.create(
      saga('old-running', SagaStatus.Running, RETENTION_MS + 1),
    );
    await store.create(
      saga('old-failed', SagaStatus.CompensationFailed, RETENTION_MS + 1),
    );
    await store.create(
      saga(
        'old-intervention',
        SagaStatus.RequiresIntervention,
        RETENTION_MS + 1,
      ),
    );
    const job = new SagaRetentionJob(store, settings(), new FixedClock(NOW));

    await job.run();

    const kept = [
      await store.get('recent-completed'),
      await store.get('old-running'),
      await store.get('old-failed'),
      await store.get('old-intervention'),
    ];
    expect(kept.map((instance) => instance?.id)).toEqual([
      'recent-completed',
      'old-running',
      'old-failed',
      'old-intervention',
    ]);
    expect(await store.get('old-completed')).toBeNull();
    expect(await store.get('old-compensated')).toBeNull();
  });

  it('deletes nothing when there are no old finished sagas', async () => {
    const store = new InMemorySagaStore();
    await store.create(saga('fresh', SagaStatus.Completed, 0));
    const job = new SagaRetentionJob(store, settings(), new FixedClock(NOW));

    await job.run();

    expect((await store.get('fresh'))?.id).toBe('fresh');
  });

  it('is scheduled every hour with its enum name', () => {
    const job = new SagaRetentionJob(
      new InMemorySagaStore(),
      settings(),
      new FixedClock(NOW),
    );

    expect(job.name).toBe(SagaJob.Retention);
    expect(job.schedule).toMatchObject({
      kind: JobScheduleKind.Interval,
      everyMs: 3_600_000,
    });
  });
});
