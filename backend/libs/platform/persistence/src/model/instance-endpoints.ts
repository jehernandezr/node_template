import type { DatabaseEndpoint } from './database-endpoint.js';

/** Nodos de una instancia física: el primario y sus réplicas de lectura (puede no haber ninguna). */
export interface InstanceEndpoints {
  readonly primary: DatabaseEndpoint;
  readonly replicas: readonly DatabaseEndpoint[];
}
