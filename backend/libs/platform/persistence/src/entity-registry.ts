import { DatabaseKind } from './model/database-kind.enum.js';
import type { EntityClass } from './metadata/entity-metadata.js';

/**
 * Entidades que los módulos declaran en `PersistenceModule.forFeature`. Se leen al crear cada
 * `DataSource`, que ocurre en el primer uso, cuando todos los módulos ya se instanciaron.
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
