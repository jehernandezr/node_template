import {
  ManagerIntent,
  type RepositoryKit,
  type VersionedEntity,
} from '@platform/persistence';
import type { EntityManager, EntityTarget } from 'typeorm';

/**
 * Base for user data repositories: they have no tenant column, so they do not use
 * `TenantIsolatedRepository`. The shard comes from the `ShardScope` the use case opens with `inUserShard`.
 */
export abstract class UserShardRepository {
  protected constructor(protected readonly kit: RepositoryKit) {}

  /** Reads from the primary: the authentication flows read what they just wrote. */
  protected read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  /** Writes in the open transaction or in its own. */
  protected write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      fn,
    );
  }

  /** @throws OptimisticLockError if the row changed since it was read. */
  protected updateVersioned<T extends VersionedEntity>(
    target: EntityTarget<T>,
    entity: T,
    scope: Readonly<Record<string, unknown>> = {},
  ): Promise<void> {
    return this.write((manager) =>
      this.kit.writer.update(manager, target, entity, scope),
    );
  }
}
