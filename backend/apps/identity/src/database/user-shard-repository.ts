import {
  ManagerIntent,
  type RepositoryKit,
  type VersionedEntity,
} from '@platform/persistence';
import type { EntityManager, EntityTarget } from 'typeorm';

/**
 * Base de los repositorios de datos de usuario: no llevan columna de tenant, así que no usan
 * `ShardedRepository`. El shard sale del `ShardScope` que abre el caso de uso con `inUserShard`.
 */
export abstract class UserShardRepository {
  protected constructor(protected readonly kit: RepositoryKit) {}

  /** Lee del primario: los flujos de autenticación leen lo que acaban de escribir. */
  protected read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  /** Escribe en la transacción abierta o en una propia. */
  protected write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      fn,
    );
  }

  /** @throws OptimisticLockError si la fila cambió desde que se leyó. */
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
