import { NestFactory } from '@nestjs/core';
import { DirectoryShardLister } from '@platform/adapters-postgres';
import { TelemetryBootstrap } from '@platform/observability/setup';
import {
  ShardedMigrationRunner,
  type MigrationReport,
  type ShardLister,
} from '@platform/persistence';
import { MigrationTarget } from '../../migration-target.enum.js';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceDefinitionValidator } from '../../service-definition-validator.js';
import type { ServiceMigrationReport } from '../../service-migration-report.js';
import { MigrationHostModule } from './migration-host.module.js';
import type { ServiceMigratorOptions } from './service-migrator-options.js';

/**
 * Migrates the databases of a service with `ShardedMigrationRunner`. The service's `migrate` binary
 * calls it.
 */
export class ServiceMigrator {
  async run(
    definition: ServiceDefinition,
    target: MigrationTarget,
    options: ServiceMigratorOptions = {},
  ): Promise<ServiceMigrationReport> {
    new ServiceDefinitionValidator().validate(definition);
    const env = options.env ?? process.env;
    // The migrator does not export telemetry: starting it disabled keeps the process from waiting for a collector.
    const telemetry = TelemetryBootstrap.startWith({
      serviceName: definition.name,
      disabled: true,
    });
    const app = await NestFactory.createApplicationContext(
      MigrationHostModule.forService(definition, env, telemetry),
      { logger: false, abortOnError: false },
    );
    try {
      const runner = app.get(ShardedMigrationRunner);
      const databases = await this.migrate(
        target,
        runner,
        app.get(DirectoryShardLister),
      );
      return { target, databases };
    } finally {
      await app.close();
    }
  }

  private async migrate(
    target: MigrationTarget,
    runner: ShardedMigrationRunner,
    lister: ShardLister,
  ): Promise<readonly MigrationReport[]> {
    switch (target) {
      case MigrationTarget.Catalog:
        return [await runner.migrateCatalog()];
      case MigrationTarget.Shards:
        return this.migrateShards(runner, lister);
      case MigrationTarget.All:
        return runner.migrateAll();
    }
  }

  /** The databases are migrated one by one: a failure stops the run and the ones already migrated stay up to date. */
  private async migrateShards(
    runner: ShardedMigrationRunner,
    lister: ShardLister,
  ): Promise<readonly MigrationReport[]> {
    const reports: MigrationReport[] = [];
    for (const location of await lister.list()) {
      reports.push(await runner.migrateShard(location));
    }
    return reports;
  }
}
