import type { ActorType } from '@platform/observability';

/** Request data that the layer carries to every statement and to the audit. */
export interface PersistenceContext {
  readonly traceId?: string;
  readonly tenantId?: string;
  /** Who makes the change: user, service account, API key or system. Goes to the audit. */
  readonly actorId?: string;
  readonly actorType?: ActorType;
  /**
   * User being operated on. It is the key of `ShardKey.User`: a service
   * account or a saga acting on a user must reach that user's shard,
   * not the actor's.
   */
  readonly userId?: string;
}
