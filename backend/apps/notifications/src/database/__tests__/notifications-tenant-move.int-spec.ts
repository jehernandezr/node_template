import { platformShardMigrations } from '@platform/adapters-postgres';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { TenantMoveRehearsal } from '@platform/tenant-move/test-utils';
import { notificationsShardMigrations } from '../shard-migrations.js';
import { NotificationsTenantMoveManifest } from '../notifications-tenant-move.manifest.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'notifications tenant move over its migrations',
  () => {
    jest.setTimeout(300_000);
    const rehearsal = new TenantMoveRehearsal({
      manifest: new NotificationsTenantMoveManifest(),
      shardMigrations: [
        ...platformShardMigrations,
        ...notificationsShardMigrations,
      ],
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
  },
);
