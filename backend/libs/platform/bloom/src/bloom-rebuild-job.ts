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
 * Job que reconstruye un filtro desde su fuente de verdad. Es exclusivo: un solo proceso del clúster
 * lo corre a la vez. El `JobRunner` de scheduling lo descubre por `instanceof ScheduledJob`.
 */
export class BloomRebuildJob extends ScheduledJob {
  /** Tiempo máximo de una corrida. Una reconstrucción lee toda la fuente, así que dura bastante más que un job típico. */
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
   * Reconstruye el filtro. Si la fuente falla, el filtro viejo se conserva y el error se propaga.
   * @throws InvalidParametersError cuando el filtro no se puede reconstruir.
   */
  async run(context: JobContext): Promise<void> {
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
