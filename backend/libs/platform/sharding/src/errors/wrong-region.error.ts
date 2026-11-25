import { ShardingError } from './sharding-error.js';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/** The tenant placement is in a region this process does not serve. */
export class WrongRegionError extends ShardingError {
  readonly region: string;

  /** @param apiBaseUrl API URL of the tenant region, if this process knows it. */
  constructor(region: string, apiBaseUrl?: string) {
    super(ShardingErrorCode.WrongRegion, 'Tenant is placed in another region', {
      details: { region, ...(apiBaseUrl !== undefined && { apiBaseUrl }) },
    });
    this.region = region;
  }
}
