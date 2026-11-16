import { ShardingError } from './sharding-error.js';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/** El placement del tenant está en una región que este proceso no sirve. */
export class WrongRegionError extends ShardingError {
  readonly region: string;

  constructor(region: string) {
    super(ShardingErrorCode.WrongRegion, 'Tenant is placed in another region', {
      details: { region },
    });
    this.region = region;
  }
}
