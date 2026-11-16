import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { CatalogDataSource } from '@platform/persistence';
import { HealthCheckName } from './health-check-name.enum.js';
import { HealthProbeQuery } from './health-probe-query.enum.js';

/**
 * Comprueba que el catálogo responde. Los errores no se atrapan: `HealthRegistry` los convierte en
 * `Down` con el nombre del error, nunca con el mensaje, que puede traer datos de conexión.
 */
export class CatalogHealthCheck extends HealthCheckable {
  readonly name = HealthCheckName.Catalog;

  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  async check(signal?: AbortSignal): Promise<HealthReport> {
    signal?.throwIfAborted();
    const dataSource = await this.catalog.get();
    await dataSource.query(HealthProbeQuery.SelectOne);
    return { state: HealthState.Up };
  }
}
