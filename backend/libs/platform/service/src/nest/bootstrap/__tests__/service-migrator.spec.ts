import { NestFactory } from '@nestjs/core';
import { StaticShardLister } from '@platform/persistence/test-utils';
import { ServiceErrorCode } from '../../../errors/service-error-code.enum.js';
import { MigrationTarget } from '../../../migration-target.enum.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/service-definition.builder.js';
import { ServiceMigrator } from '../service-migrator.js';
import { FakeMigrationApp } from './utils/fake-migration-app.js';
import { FakeMigrationRunner } from './utils/fake-migration-runner.js';
import { MigrationRunnerCall } from './utils/migration-runner-call.enum.js';

const CATALOG_REPORT = { database: 'catalog', applied: ['CatalogProbe'] };
const SHARD_LOCATIONS = [
  { logicalShard: 'svc_shard_0', instance: 'main' },
  { logicalShard: 'svc_shard_1', instance: 'main' },
];
const SHARD_REPORTS = [
  { database: 'svc_shard_0', applied: ['ShardProbe'] },
  { database: 'svc_shard_1', applied: [] },
];

describe('ServiceMigrator', () => {
  const definition =
    ServiceDefinitionBuilder.aDefinition('migrator-probe').build();
  let runner: FakeMigrationRunner;
  let app: FakeMigrationApp;
  let createContext: jest.SpyInstance;

  beforeEach(() => {
    runner = new FakeMigrationRunner(CATALOG_REPORT, SHARD_REPORTS);
    app = new FakeMigrationApp(runner, new StaticShardLister(SHARD_LOCATIONS));
    createContext = jest
      .spyOn(NestFactory, 'createApplicationContext')
      .mockResolvedValue(app.asApplicationContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [
      MigrationTarget.Catalog,
      { target: MigrationTarget.Catalog, databases: [CATALOG_REPORT] },
    ],
    [
      MigrationTarget.Shards,
      { target: MigrationTarget.Shards, databases: SHARD_REPORTS },
    ],
    [
      MigrationTarget.All,
      {
        target: MigrationTarget.All,
        databases: [CATALOG_REPORT, ...SHARD_REPORTS],
      },
    ],
  ])('returns the reports of the %s target', async (target, expected) => {
    await expect(
      new ServiceMigrator().run(definition, target, { env: {} }),
    ).resolves.toEqual(expected);
  });

  it.each([
    [MigrationTarget.Catalog, [{ method: MigrationRunnerCall.Catalog }]],
    [
      MigrationTarget.Shards,
      [
        { method: MigrationRunnerCall.Shard, location: SHARD_LOCATIONS[0] },
        { method: MigrationRunnerCall.Shard, location: SHARD_LOCATIONS[1] },
      ],
    ],
    [MigrationTarget.All, [{ method: MigrationRunnerCall.All }]],
  ])(
    'asks the runner only for the %s databases, in directory order',
    async (target, expectedCalls) => {
      await new ServiceMigrator().run(definition, target, { env: {} });

      expect(runner.calls).toEqual(expectedCalls);
    },
  );

  it.each([
    MigrationTarget.Catalog,
    MigrationTarget.Shards,
    MigrationTarget.All,
  ])(
    'closes the application once and rethrows the failure of the %s target',
    async (target) => {
      const failure = new Error('la base no responde');
      runner.failWith(failure);

      await expect(
        new ServiceMigrator().run(definition, target, { env: {} }),
      ).rejects.toBe(failure);
      expect(app.closeCount).toBe(1);
    },
  );

  it('closes the application once after a successful run', async () => {
    await new ServiceMigrator().run(definition, MigrationTarget.All, {
      env: {},
    });

    expect(app.closeCount).toBe(1);
  });

  it('rejects an invalid definition without creating the application', async () => {
    const invalid = ServiceDefinitionBuilder.aDefinition('migrator-probe')
      .with({ name: 'otro' })
      .build();

    await expect(
      new ServiceMigrator().run(invalid, MigrationTarget.Catalog, { env: {} }),
    ).rejects.toMatchObject({ code: ServiceErrorCode.InvalidDefinition });
    expect(createContext).not.toHaveBeenCalled();
  });
});
