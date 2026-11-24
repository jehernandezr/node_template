import { platformShardMigrations } from '@platform/adapters-postgres';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  RehearsalShard,
  TenantMoveRehearsal,
} from '@platform/tenant-move/test-utils';
import { IdentityTenantMoveManifest } from '../identity-tenant-move.manifest.js';
import { identityShardMigrations } from '../shard-migrations.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('identity tenant move over its migrations', () => {
  jest.setTimeout(300_000);
  const rehearsal = new TenantMoveRehearsal({
    manifest: new IdentityTenantMoveManifest(),
    shardMigrations: [...platformShardMigrations, ...identityShardMigrations],
    batchSize: 1,
  });

  beforeAll(async () => {
    await rehearsal.start();
  });

  afterAll(async () => {
    await rehearsal.stop();
  });

  it('moves every table of a tenant and its users to another shard and region without losing or changing a row', async () => {
    const report = await rehearsal.rehearse();

    expect(report.verified).toBe(true);
    expect(report.movedRows).toEqual(rehearsal.everyTable(2));
    expect(report.verifiedSource).toEqual(report.seeded);
    expect(report.verifiedTarget).toEqual(report.seeded);
    expect(report.leftInSource).toEqual(rehearsal.everyTable(0));
    expect(report.neighbourAfter).toEqual(report.neighbourBefore);
    await expect(
      rehearsal.values(RehearsalShard.B, 'tenants', 'region', report.tenantId),
    ).resolves.toEqual([
      TenantMoveRehearsal.REGIONS[RehearsalShard.B],
      TenantMoveRehearsal.REGIONS[RehearsalShard.B],
    ]);
  });
});
