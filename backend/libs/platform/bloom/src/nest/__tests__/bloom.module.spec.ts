import 'reflect-metadata';
import { ScheduledJob, type JobContext } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { Test } from '@nestjs/testing';
import { AsyncBloomFilter } from '../../async-bloom-filter.js';
import { BloomFilterAssembler } from '../../bloom-filter-assembler.js';
import { BloomErrorCode } from '../../errors/bloom-error-code.enum.js';
import { PartitionedBloomFilter } from '../../partitioned-bloom-filter.js';
import { FakeRebuildSourceProvider } from '../../__tests__/utils/fake-rebuild-source-provider.js';
import { BloomModule } from '../bloom.module.js';
import { bloomFilterToken, bloomRebuildJobToken } from '../bloom-tokens.js';
import { BloomFactoryTestModule } from './utils/bloom-factory-test.module.js';
import { CountingBloomFilterFactory } from './utils/counting-bloom-filter-factory.js';

const NAME = 'users.emails';
const definition = {
  name: NAME,
  expectedItems: 1_000,
  rebuildCron: '0 3 * * *',
};

const context: JobContext = {
  signal: new AbortController().signal,
  startedAt: new FixedClock().now(),
  runId: 'run-1',
};

describe('BloomModule', () => {
  it('provides a filter under its token that answers after add', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        BloomModule.forRoot(),
        BloomModule.forFeature({
          definition,
          source: FakeRebuildSourceProvider,
        }),
      ],
    }).compile();
    const filter = ref.get<AsyncBloomFilter>(bloomFilterToken(NAME));

    await filter.add('fresh@example.com');

    await expect(filter.mightContain('fresh@example.com')).resolves.toBe(true);
  });

  it('provides a rebuild job that is a ScheduledJob and fills the filter from the source', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        BloomModule.forRoot(),
        BloomModule.forFeature({
          definition,
          source: FakeRebuildSourceProvider,
        }),
      ],
    }).compile();
    const filter = ref.get<AsyncBloomFilter>(bloomFilterToken(NAME));
    const job = ref.get(bloomRebuildJobToken(NAME));

    expect(job).toBeInstanceOf(ScheduledJob);
    await expect(filter.mightContain('ana@example.com')).resolves.toBe(false);
    await ref.get<ScheduledJob>(bloomRebuildJobToken(NAME)).run(context);
    await expect(filter.mightContain('ana@example.com')).resolves.toBe(true);
  });

  it('partitions a filter that does not fit in one partition', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        BloomModule.forRoot({ maxPartitionBits: 1_024 }),
        BloomModule.forFeature({
          definition: { ...definition, expectedItems: 10_000 },
          source: FakeRebuildSourceProvider,
        }),
      ],
    }).compile();

    expect(ref.get(bloomFilterToken(NAME))).toBeInstanceOf(
      PartitionedBloomFilter,
    );
  });

  it('creates filters with the factory given in forRoot', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        BloomFactoryTestModule,
        BloomModule.forRoot({ factory: CountingBloomFilterFactory }),
        BloomModule.forFeature({
          definition,
          source: FakeRebuildSourceProvider,
        }),
      ],
    }).compile();

    expect(ref.get(CountingBloomFilterFactory).created).toBe(1);
  });

  it('accepts an async configuration', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        BloomModule.forRootAsync({
          useFactory: () => ({ maxPartitionBits: 1_024 }),
        }),
      ],
    }).compile();

    expect(ref.get(BloomFilterAssembler)).toBeInstanceOf(BloomFilterAssembler);
  });

  it('rejects an invalid definition when the feature module is built', () => {
    expect(() =>
      BloomModule.forFeature({
        definition: { ...definition, expectedItems: 0 },
        source: FakeRebuildSourceProvider,
      }),
    ).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });
});
