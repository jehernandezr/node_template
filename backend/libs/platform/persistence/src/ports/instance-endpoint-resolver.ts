import type { InstanceEndpoints } from '../model/instance-endpoints.js';

/** Translates the name of a physical instance, as provided by the directory, into its nodes. */
export abstract class InstanceEndpointResolver {
  /**
   * Resolves the hosts of a physical instance.
   * @param instance Instance name.
   * @returns Its primary and replica hosts.
   * @throws PersistenceError `PersistenceInvalidConfig` if the instance is not configured.
   */
  abstract resolve(instance: string): InstanceEndpoints;
}
