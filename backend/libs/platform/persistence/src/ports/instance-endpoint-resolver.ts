import type { InstanceEndpoints } from '../model/instance-endpoints.js';

/** Traduce el nombre de una instancia física, tal como lo entrega el directorio, a sus nodos. */
export abstract class InstanceEndpointResolver {
  /** @throws PersistenceError `PersistenceInvalidConfig` si la instancia no está configurada. */
  abstract resolve(instance: string): InstanceEndpoints;
}
