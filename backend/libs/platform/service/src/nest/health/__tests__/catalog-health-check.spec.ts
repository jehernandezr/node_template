import { HealthState } from '@platform/kernel';
import { CatalogHealthCheck } from '../catalog-health-check.js';
import { HealthProbeQuery } from '../health-probe-query.enum.js';
import {
  ConnectionFailedError,
  FakeCatalogDataSource,
  FakeDataSource,
  ProbeErrorName,
} from './utils/index.js';

describe('CatalogHealthCheck', () => {
  describe('when the catalog answers the probe', () => {
    it('reports up after running the probe query', async () => {
      const dataSource = new FakeDataSource();
      const check = new CatalogHealthCheck(
        new FakeCatalogDataSource(dataSource).asCatalogDataSource(),
      );

      await expect(check.check()).resolves.toEqual({ state: HealthState.Up });
      expect(dataSource.queries).toEqual([HealthProbeQuery.SelectOne]);
    });
  });

  describe('when the probe query fails', () => {
    it('rejects with the same error so the registry reports the error name', async () => {
      const error = new ConnectionFailedError();
      const check = new CatalogHealthCheck(
        new FakeCatalogDataSource(
          FakeDataSource.failingWith(error),
        ).asCatalogDataSource(),
      );

      await expect(check.check()).rejects.toBe(error);
    });
  });

  describe('when the signal is already aborted', () => {
    it('rejects without asking the catalog for its data source', async () => {
      const catalog = new FakeCatalogDataSource(new FakeDataSource());
      const check = new CatalogHealthCheck(catalog.asCatalogDataSource());

      await expect(check.check(AbortSignal.abort())).rejects.toMatchObject({
        name: ProbeErrorName.Abort,
      });
      expect(catalog.requests).toBe(0);
    });
  });
});
