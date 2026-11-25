import { DatabaseKind } from './model/database-kind.enum.js';
import type { EntityClass } from './metadata/entity-metadata.js';

/**
 * Entities that modules declare in `PersistenceModule.forFeature`. They are read when each
 * `DataSource` is created, which happens on first use, when all modules have already been instantiated.
 */
export class EntityRegistry {
  private readonly byKind: Readonly<Record<DatabaseKind, Set<EntityClass>>> = {
    [DatabaseKind.Shard]: new Set(),
    [DatabaseKind.Catalog]: new Set(),
  };

  register(kind: DatabaseKind, entities: readonly EntityClass[]): void {
    for (const entity of entities) {
      this.byKind[kind].add(entity);
    }
  }

  entities(kind: DatabaseKind): readonly EntityClass[] {
    return [...this.byKind[kind]];
  }
}
