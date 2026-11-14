import {
  JobScheduleKind,
  ScheduledJob,
  type JobContext,
} from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { BloomDefinitionResolver } from '../bloom-definition-resolver.js';
import { BloomFilter } from '../bloom-filter.js';
import { BloomRebuildJob } from '../bloom-rebuild-job.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';
import { InMemoryAsyncBloomFilter } from '../in-memory-async-bloom-filter.js';
import { PartitionedBloomFilter } from '../partitioned-bloom-filter.js';
import { BloomFixtures } from './utils/bloom-fixtures.js';
import { FakeRebuildSourceProvider } from './utils/fake-rebuild-source-provider.js';
import { NonRebuildableBloomFilter } from './utils/non-rebuildable-bloom-filter.js';

const definition = BloomDefinitionResolver.resolve({
  name: 'users.emails',
  expectedItems: 1_000,
  rebuildCron: '0 3 * * *',
});

const context: JobContext = {
  signal: new AbortController().signal,
  startedAt: new FixedClock().now(),
  runId: 'run-1',
};

const newFilter = (): InMemoryAsyncBloomFilter =>
  new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1_000 }));

describe('BloomRebuildJob', () => {
  it('is an exclusive scheduled job with its own name, schedule and timeout', () => {
    const job = new BloomRebuildJob(
      definition,
      newFilter(),
      new FakeRebuildSourceProvider(),
    );

    expect(job).toBeInstanceOf(ScheduledJob);
    expect(job.exclusive).toBe(true);
    expect(job.name.startsWith('bloom.rebuild:')).toBe(true);
    expect(job.schedule).toEqual({
      kind: JobScheduleKind.Cron,
      expression: '0 3 * * *',
    });
    expect(job.timeoutMs).toBe(BloomRebuildJob.TIMEOUT_MS);
  });

  it('rebuilds the filter from the source and drops items that are gone', async () => {
    const filter = newFilter();
    await filter.add('removed-long-ago');
    const job = new BloomRebuildJob(
      definition,
      filter,
      new FakeRebuildSourceProvider(),
    );
    await expect(filter.mightContain('removed-long-ago')).resolves.toBe(true);

    await job.run(context);

    await expect(filter.mightContain('removed-long-ago')).resolves.toBe(false);
    await expect(filter.mightContain('ana@example.com')).resolves.toBe(true);
    await expect(filter.mightContain('luis@example.com')).resolves.toBe(true);
  });

  it('keeps the old filter and rejects when the source fails', async () => {
    const filter = newFilter();
    await filter.add('still-here');
    const source = new FakeRebuildSourceProvider([], new Error('source down'));
    const job = new BloomRebuildJob(definition, filter, source);

    await expect(job.run(context)).rejects.toThrow('source down');
    await expect(filter.mightContain('still-here')).resolves.toBe(true);
  });

  it('rebuilds a partitioned filter partition by partition', async () => {
    const filter = new PartitionedBloomFilter(
      BloomFixtures.inMemoryPartitions(2, 1_000),
    );
    await filter.add('removed-long-ago');
    const job = new BloomRebuildJob(
      definition,
      filter,
      new FakeRebuildSourceProvider(),
    );

    await job.run(context);

    await expect(filter.mightContain('removed-long-ago')).resolves.toBe(false);
    await expect(filter.mightContain('luis@example.com')).resolves.toBe(true);
  });

  it('rejects with InvalidParametersError when the filter cannot be rebuilt', async () => {
    const job = new BloomRebuildJob(
      definition,
      new NonRebuildableBloomFilter(),
      new FakeRebuildSourceProvider(),
    );

    await expect(job.run(context)).rejects.toMatchObject({
      code: BloomErrorCode.InvalidParameters,
    });
  });
});
