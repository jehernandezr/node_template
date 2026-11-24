import { ShardingError } from './sharding-error.js';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/** El placement del tenant está en una región que este proceso no sirve. */
export class WrongRegionError extends ShardingError {
  readonly region: string;

  /** @param apiBaseUrl URL de la API de la región del tenant, si este proceso la conoce. */
  constructor(region: string, apiBaseUrl?: string) {
    super(ShardingErrorCode.WrongRegion, 'Tenant is placed in another region', {
      details: { region, ...(apiBaseUrl !== undefined && { apiBaseUrl }) },
    });
    this.region = region;
  }
}
