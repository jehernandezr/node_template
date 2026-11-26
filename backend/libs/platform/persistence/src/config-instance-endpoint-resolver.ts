import type { DatabaseSettings } from './config/database.config.js';
import { PersistenceError } from './errors/persistence-error.js';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import type { InstanceEndpoints } from './model/instance-endpoints.js';
import { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** Resolves instances with the `DB_INSTANCES` map from the configuration. */
export class ConfigInstanceEndpointResolver extends InstanceEndpointResolver {
  constructor(private readonly instances: DatabaseSettings['DB_INSTANCES']) {
    super();
  }

  /**
   * A name like `constructor` is not a configured instance even if it exists on the prototype.
   */
  resolve(instance: string): InstanceEndpoints {
    if (Object.hasOwn(this.instances, instance)) {
      return this.instances[instance];
    }
    throw new PersistenceError(
      PersistenceErrorCode.InvalidConfig,
      'Unknown database instance',
      { details: { instance } },
    );
  }
}
