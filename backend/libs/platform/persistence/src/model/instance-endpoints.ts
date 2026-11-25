import type { DatabaseEndpoint } from './database-endpoint.js';

/** Nodes of a physical instance: the primary and its read replicas (there may be none). */
export interface InstanceEndpoints {
  readonly primary: DatabaseEndpoint;
  readonly replicas: readonly DatabaseEndpoint[];
}
