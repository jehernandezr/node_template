import {
  platformCatalogEntities,
  platformCatalogMigrations,
  platformSagaShardEntities,
  platformSagaShardMigrations,
  platformShardEntities,
  platformShardMigrations,
} from '@platform/adapters-postgres';
import { ServiceDatabaseSets } from '../service-database-sets.js';
import { ServiceCatalogMigration1900000000011 } from './utils/service-catalog-migration.js';
import { ServiceEntity } from './utils/service-entity.js';
import { ServiceShardMigration1900000000010 } from './utils/service-shard-migration.js';

describe('ServiceDatabaseSets', () => {
  const serviceMigrations = () => ({
    catalog: {
      entities: [ServiceEntity],
      migrations: [ServiceCatalogMigration1900000000011],
    },
    shard: {
      entities: [ServiceEntity],
      migrations: [ServiceShardMigration1900000000010],
    },
  });

  it('puts the platform shard entities before the service entities', () => {
    const { shard } = new ServiceDatabaseSets().merge(serviceMigrations());

    expect(shard.entities.slice(0, platformShardEntities.length)).toEqual(
      platformShardEntities,
    );
    expect(shard.entities.at(-1)).toBe(ServiceEntity);
  });

  it('puts the platform shard migrations before the service migrations', () => {
    const { shard } = new ServiceDatabaseSets().merge(serviceMigrations());

    expect(shard.migrations.slice(0, platformShardMigrations.length)).toEqual(
      platformShardMigrations,
    );
    expect(shard.migrations.at(-1)).toBe(ServiceShardMigration1900000000010);
  });

  it('adds the saga log to every shard, which the runtime reads on start', () => {
    const { shard } = new ServiceDatabaseSets().merge(serviceMigrations());

    expect(shard.entities).toEqual(
      expect.arrayContaining([...platformSagaShardEntities]),
    );
    expect(shard.migrations).toEqual(
      expect.arrayContaining([...platformSagaShardMigrations]),
    );
  });

  it('puts the platform catalog entities and migrations before the service ones', () => {
    const { catalog } = new ServiceDatabaseSets().merge(serviceMigrations());

    expect(catalog.entities.slice(0, platformCatalogEntities.length)).toEqual(
      platformCatalogEntities,
    );
    expect(catalog.entities.at(-1)).toBe(ServiceEntity);
    expect(
      catalog.migrations.slice(0, platformCatalogMigrations.length),
    ).toEqual(platformCatalogMigrations);
    expect(catalog.migrations.at(-1)).toBe(
      ServiceCatalogMigration1900000000011,
    );
  });

  it('leaves the service arrays unchanged', () => {
    const service = serviceMigrations();

    new ServiceDatabaseSets().merge(service);

    expect(service).toEqual(serviceMigrations());
  });
});
