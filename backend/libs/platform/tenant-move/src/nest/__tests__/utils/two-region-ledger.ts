import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import type { ConfigEnv } from '@platform/config';
import { ShardedMigrationRunner } from '@platform/persistence';
import { SchedulingMode } from '@platform/scheduling';
import { ServiceHostModule } from '@platform/service/nest';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import { LedgerService, type LedgerServiceOptions } from './ledger-service.js';
import type { RegionServers } from './region-servers.js';
import type { AckedLedger } from './service-ledger-writer.js';

/** Los grupos de destino que conoce el servicio de prueba. */
export enum LedgerGroup {
  A1 = 'group-a1',
  B0 = 'group-b0',
}

/**
 * El servicio de prueba desplegado en dos regiones sobre bases nuevas: el catálogo y los shards `a0` y `a1` en la
 * región A, el shard `b0` en la B, y un proceso por región. Los tenants pedidos empiezan en `a0`.
 */
export class TwoRegionLedger {
  private static deployments = 0;

  readonly shards: {
    readonly a0: string;
    readonly a1: string;
    readonly b0: string;
  };
  private readonly catalog: string;
  private readonly apps: INestApplicationContext[] = [];

  constructor(
    readonly regionA: RegionServers,
    readonly regionB: RegionServers,
    private readonly gate: string,
    private readonly service: LedgerServiceOptions = { requireScope: true },
  ) {
    TwoRegionLedger.deployments += 1;
    const suffix = TwoRegionLedger.deployments;
    this.catalog = `ledger_catalog_${suffix}`;
    this.shards = {
      a0: `ledger_${suffix}_a0`,
      a1: `ledger_${suffix}_a1`,
      b0: `ledger_${suffix}_b0`,
    };
  }

  /** Crea las bases, migra, ubica los tenants y arranca un proceso en cada región. */
  async deploy(tenants: readonly string[]): Promise<{
    readonly inA: INestApplicationContext;
    readonly inB: INestApplicationContext;
  }> {
    await this.regionA.createDatabases([
      this.catalog,
      this.shards.a0,
      this.shards.a1,
    ]);
    await this.regionB.createDatabases([this.shards.b0]);
    const inA = await this.start(this.regionA);
    await inA.get(ShardedMigrationRunner).migrateCatalog();
    const directory = inA.get(TypeOrmDirectoryStore);
    await directory.setInstance(this.shards.a0, this.regionA.instance);
    await directory.setInstance(this.shards.a1, this.regionA.instance);
    await directory.setInstance(this.shards.b0, this.regionB.instance);
    for (const tenant of tenants) {
      await directory.putPlacement(
        PlacementBuilder.aPlacement()
          .withTenantId(tenant)
          .withRegion(this.regionA.region)
          .withShardGroup(this.shards.a0)
          .build(),
        undefined,
      );
    }
    await inA.get(ShardedMigrationRunner).migrateAll();
    return { inA, inB: await this.start(this.regionB) };
  }

  /** Los ledgers de un tenant en un shard, leídos como superusuario. */
  async rowsOf(
    region: RegionServers,
    shard: string,
    tenant: string,
  ): Promise<AckedLedger[]> {
    return (await region.connect(shard)).query(
      'SELECT id, total::text AS total FROM ledgers WHERE tenant_id = $1 ORDER BY id',
      [tenant],
    );
  }

  async close(): Promise<void> {
    await Promise.all(this.apps.splice(0).map((app) => app.close()));
  }

  private async start(region: RegionServers): Promise<INestApplicationContext> {
    const app = await NestFactory.createApplicationContext(
      ServiceHostModule.forService(LedgerService.definition(this.service), {
        env: this.environment(region),
        adapters: { valkey: true, aws: false },
        schedulingMode: SchedulingMode.External,
      }),
      { logger: false },
    );
    this.apps.push(app);
    return app;
  }

  private environment(region: RegionServers): ConfigEnv {
    const { regionA, regionB } = this;
    return {
      ...region.credentials(),
      ...region.valkey.environment(),
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      DB_CATALOG_NAME: this.catalog,
      DB_CATALOG_INSTANCE: regionA.instance,
      DB_INSTANCES: JSON.stringify({
        [regionA.instance]: regionA.endpoint(),
        [regionB.instance]: regionB.endpoint(),
      }),
      SERVICE_REGION: region.region,
      REGIONS: JSON.stringify(
        [regionA, regionB].map((known) => ({
          code: known.region,
          apiBaseUrl: known.apiBaseUrl,
          issuer: known.apiBaseUrl,
        })),
      ),
      TENANT_WRITE_GATE: this.gate,
      TENANT_MOVE_TARGETS: JSON.stringify({
        [LedgerGroup.A1]: { region: regionA.region, shard: this.shards.a1 },
        [LedgerGroup.B0]: { region: regionB.region, shard: this.shards.b0 },
      }),
      TENANT_MOVE_BATCH_SIZE: '25',
      TENANT_MOVE_CAUGHT_UP_ROWS: '50',
    };
  }
}
