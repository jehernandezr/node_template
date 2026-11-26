import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { CatalogDataSource } from '@platform/persistence';
import { HealthCheckName } from './health-check-name.enum.js';
import { HealthProbeQuery } from './health-probe-query.enum.js';

/**
 * Checks that the catalog responds. Errors are not caught: `HealthRegistry` turns them into
 * `Down` with the error name, never with the message, which may carry connection data.
 */
export class CatalogHealthCheck extends HealthCheckable {
  readonly name = HealthCheckName.Catalog;

  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  override async check(signal?: AbortSignal): Promise<HealthReport> {
    signal?.throwIfAborted();
    const dataSource = await this.catalog.get();
    await dataSource.query(HealthProbeQuery.SelectOne);
    return { state: HealthState.Up };
  }
}
