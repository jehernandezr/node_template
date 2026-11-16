import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { ShardDataSources, ShardLister } from '@platform/persistence';
import { HealthCheckName } from './health-check-name.enum.js';
import { HealthProbeQuery } from './health-probe-query.enum.js';

/**
 * Comprueba que cada shard lógico del directorio responde. Sin shards también es `Up`: no hay
 * nada que probar. Los errores se propagan para que `HealthRegistry` marque `Down`.
 */
export class ShardsHealthCheck extends HealthCheckable {
  readonly name = HealthCheckName.Shards;

  constructor(
    private readonly lister: ShardLister,
    private readonly sources: ShardDataSources,
  ) {
    super();
  }

  async check(signal?: AbortSignal): Promise<HealthReport> {
    signal?.throwIfAborted();
    const locations = await this.lister.list();
    await Promise.all(
      locations.map(async (location) =>
        (await this.sources.get(location)).query(HealthProbeQuery.SelectOne),
      ),
    );
    return { state: HealthState.Up };
  }
}
