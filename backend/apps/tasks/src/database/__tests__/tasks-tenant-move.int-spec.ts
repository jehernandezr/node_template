import { platformShardMigrations } from '@platform/adapters-postgres';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { TenantMoveRehearsal } from '@platform/tenant-move/test-utils';
import { tasksShardMigrations } from '../shard-migrations.js';
import { TasksTenantMoveManifest } from '../tasks-tenant-move.manifest.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('tasks tenant move over its migrations', () => {
  jest.setTimeout(300_000);
  const rehearsal = new TenantMoveRehearsal({
    manifest: new TasksTenantMoveManifest(),
    shardMigrations: [...platformShardMigrations, ...tasksShardMigrations],
    extensions: ['vector'],
    batchSize: 1,
  });

  beforeAll(async () => {
    await rehearsal.start();
  });

  afterAll(async () => {
    await rehearsal.stop();
  });

  it('moves every table of a tenant to another shard without losing or changing a row and leaves its neighbour alone', async () => {
    const report = await rehearsal.rehearse();

    expect(report.verified).toBe(true);
    expect(report.movedRows).toEqual(rehearsal.everyTable(2));
    expect(report.verifiedSource).toEqual(report.seeded);
    expect(report.verifiedTarget).toEqual(report.seeded);
    expect(report.leftInSource).toEqual(rehearsal.everyTable(0));
    expect(report.neighbourAfter).toEqual(report.neighbourBefore);
  });

  it('moves a tenant whose service keeps writing during the copy, without losing or changing a committed write', async () => {
    const report = await rehearsal.rehearseUnderWrites();

    expect(report.verified).toBe(true);
    expect(report.acked).toBeGreaterThan(0);
    expect(report.rejected).toBeGreaterThan(0);
    expect(report.verifiedTarget).toEqual(report.verifiedSource);
    expect(report.sourceAfterSwitch).toEqual(report.verifiedSource);
  });
});
