import {
  JobScheduleKind,
  ScheduledJob,
  type CronJobSchedule,
  type JobContext,
} from '@platform/kernel';
import type { AsyncBloomFilter } from './async-bloom-filter.js';
import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import type { BloomRebuildSourceProvider } from './bloom-rebuild-source-provider.js';
import { BloomJob } from './bloom-job.enum.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';
import { PartitionedBloomFilter } from './partitioned-bloom-filter.js';
import { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/**
 * Job that rebuilds a filter from its source of truth. It is exclusive: only one process in the cluster
 * runs it at a time. The scheduling `JobRunner` discovers it through `instanceof ScheduledJob`.
 */
export class BloomRebuildJob extends ScheduledJob {
  /** Maximum duration of a run. A rebuild reads the whole source, so it takes much longer than a typical job. */
  static readonly TIMEOUT_MS = 30 * 60 * 1000;

  override readonly name: string;
  override readonly schedule: CronJobSchedule;
  override readonly exclusive = true;
  override readonly timeoutMs = BloomRebuildJob.TIMEOUT_MS;

  constructor(
    private readonly definition: ResolvedBloomFilterDefinition,
    private readonly filter: AsyncBloomFilter,
    private readonly source: BloomRebuildSourceProvider,
  ) {
    super();
    this.name = `${BloomJob.Rebuild}:${definition.name}`;
    this.schedule = {
      kind: JobScheduleKind.Cron,
      expression: definition.rebuildCron,
    };
  }

  /**
   * Rebuilds the filter. If the source fails, the old filter is kept and the error propagates.
   * @throws InvalidParametersError when the filter cannot be rebuilt.
   */
  override async run(context: JobContext): Promise<void> {
    if (this.filter instanceof PartitionedBloomFilter) {
      await this.filter.rebuildFrom(() => this.source.batches(context.signal));
      return;
    }
    if (RebuildableBloomFilter.is(this.filter)) {
      await this.filter.rebuild(this.source.batches(context.signal));
      return;
    }
    throw new InvalidParametersError(
      `filter ${this.definition.name} cannot be rebuilt`,
    );
  }
}
