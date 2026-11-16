import { HealthState } from '@platform/kernel';
import { HealthRegistry } from '@platform/observability';
import { StaticShardLister } from '@platform/persistence/test-utils';
import { CatalogHealthCheck } from '../catalog-health-check.js';
import { HealthCheckName } from '../health-check-name.enum.js';
import { HealthRegistrar } from '../health-registrar.js';
import { ShardsHealthCheck } from '../shards-health-check.js';
import {
  ConnectionFailedError,
  FakeCatalogDataSource,
  FakeDataSource,
  FakeShardDataSources,
  ProbeErrorName,
} from './utils/index.js';

describe('HealthRegistrar', () => {
  describe('on module init', () => {
    it('registers the catalog and shard checks under their names', async () => {
      const registry = new HealthRegistry();
      const registrar = new HealthRegistrar(
        registry,
        new CatalogHealthCheck(
          new FakeCatalogDataSource(new FakeDataSource()).asCatalogDataSource(),
        ),
        new ShardsHealthCheck(
          new StaticShardLister([]),
          new FakeShardDataSources(
            () => new FakeDataSource(),
          ).asShardDataSources(),
        ),
      );

      registrar.onModuleInit();
      const summary = await registry.checkAll();

      expect(Object.keys(summary.checks)).toEqual(
        expect.arrayContaining([
          HealthCheckName.Catalog,
          HealthCheckName.Shards,
        ]),
      );
    });

    it('reports a failing catalog as down with the error name only', async () => {
      const registry = new HealthRegistry();
      const registrar = new HealthRegistrar(
        registry,
        new CatalogHealthCheck(
          new FakeCatalogDataSource(
            FakeDataSource.failingWith(new ConnectionFailedError()),
          ).asCatalogDataSource(),
        ),
        new ShardsHealthCheck(
          new StaticShardLister([]),
          new FakeShardDataSources(
            () => new FakeDataSource(),
          ).asShardDataSources(),
        ),
      );

      registrar.onModuleInit();
      const summary = await registry.checkAll();

      expect(summary.checks[HealthCheckName.Catalog]).toEqual({
        state: HealthState.Down,
        detail: ProbeErrorName.Connection,
      });
    });
  });
});
