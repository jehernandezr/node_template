import { PersistenceErrorCode } from '@platform/persistence';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  LoginAttemptRetention,
  type LoginAttemptRetentionReport,
} from '../../domain/login-attempt-retention.js';
import { RotateLoginAttemptPartitionsJob } from '../rotate-login-attempt-partitions.job.js';

class FixedRetention extends LoginAttemptRetention {
  readonly calls: Date[] = [];

  constructor(private readonly report: LoginAttemptRetentionReport) {
    super();
  }

  override async maintain(now: Date): Promise<LoginAttemptRetentionReport> {
    this.calls.push(now);
    return this.report;
  }
}

describe('RotateLoginAttemptPartitionsJob', () => {
  const clock = new FixedClock(new Date('2026-11-16T03:30:00.000Z'));

  it('maintains the partitions with the current time', async () => {
    const retention = new FixedRetention({ dropped: [], failedShards: [] });

    await new RotateLoginAttemptPartitionsJob(retention, clock).run();

    expect(retention.calls).toEqual([clock.now()]);
  });

  it('fails the run when a shard could not be maintained', async () => {
    const retention = new FixedRetention({
      dropped: [],
      failedShards: ['identity_shard_1'],
    });

    await expect(
      new RotateLoginAttemptPartitionsJob(retention, clock).run(),
    ).rejects.toMatchObject({
      code: PersistenceErrorCode.QueryFailed,
      details: { shards: ['identity_shard_1'] },
    });
  });
});
