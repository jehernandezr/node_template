import { PersistenceErrorCode } from '../../errors/persistence-error-code.enum.js';
import { PersistenceError } from '../../errors/persistence-error.js';
import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { InstanceEndpointResolver } from '../../ports/instance-endpoint-resolver.js';

/** Resolves each instance to the endpoints the test gives it. */
export class FixedInstanceEndpointResolver extends InstanceEndpointResolver {
  /**
   * @param instances Endpoints of each instance.
   */
  constructor(
    private readonly instances: Readonly<Record<string, InstanceEndpoints>>,
  ) {
    super();
  }

  /**
   * Endpoints of one instance.
   * @param instance Instance name.
   * @returns Its endpoints.
   * @throws PersistenceError `InvalidConfig` for an instance the test did not give.
   */
  override resolve(instance: string): InstanceEndpoints {
    const endpoints = this.instances[instance];
    if (endpoints === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.InvalidConfig,
        `Unknown test instance ${instance}`,
      );
    }
    return endpoints;
  }
}
