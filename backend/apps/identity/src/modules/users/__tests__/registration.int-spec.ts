import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  IdentityTestApp,
  ShardedUsers,
} from '../../../__tests__/utils/index.js';
import { SweepReservedLookupsJob } from '../application/sweep-reserved-lookups.job.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'user registration across the catalog and the shards',
  () => {
    jest.setTimeout(180_000);

    const app = new IdentityTestApp();
    const users = new ShardedUsers(app);

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    it('writes each user, her password and her event in the shard the router picks', async () => {
      const probe = app.shards();
      const placed = await users.oneInEachShard('spread');

      for (const [shard, { ref }] of placed) {
        expect(
          await probe.shardsWith(
            `SELECT 1 FROM users WHERE id = '${ref.userId}'`,
          ),
        ).toEqual([shard]);
        expect(
          await probe.shardsWith(
            `SELECT 1 FROM password_credentials WHERE id = '${ref.userId}'`,
          ),
        ).toEqual([shard]);
        expect(
          await probe.catalogRows(
            `SELECT status FROM identity_lookup WHERE user_id = '${ref.userId}'`,
          ),
        ).toEqual([{ status: 'active' }]);
      }
      expect([...placed.keys()].sort()).toEqual([...probe.names()].sort());
    });

    it('releases the reservation when the shard fails in the second step', async () => {
      const probe = app.shards();
      for (const shard of probe.names()) {
        await probe.rowsIn(
          shard,
          'ALTER TABLE password_credentials RENAME TO password_credentials_off',
        );
      }
      try {
        await expect(
          users.register('step.two@example.com'),
        ).rejects.toBeDefined();
      } finally {
        for (const shard of probe.names()) {
          await probe.rowsIn(
            shard,
            'ALTER TABLE password_credentials_off RENAME TO password_credentials',
          );
        }
      }

      expect(
        await probe.catalogRows(
          `SELECT 1 FROM identity_lookup WHERE status = 'reserved'`,
        ),
      ).toEqual([]);
      await expect(users.register('step.two@example.com')).resolves.toEqual(
        expect.objectContaining({ userId: expect.any(String) }),
      );
    });

    it('sweeps reservations older than an hour and keeps the recent ones', async () => {
      const probe = app.shards();
      const home = String(app.env()['IDENTITY_DEFAULT_TENANT_ID']);
      await probe.catalogRows(
        `INSERT INTO identity_lookup (email_fingerprint, user_id, home_tenant_id, region, status, created_at) VALUES ('\\x01', '01900000-0000-7000-8000-0000000000f1', '${home}', 'eu', 'reserved', now() - interval '2 hours'), ('\\x02', '01900000-0000-7000-8000-0000000000f2', '${home}', 'eu', 'reserved', now())`,
      );

      await app.get(SweepReservedLookupsJob).run();

      expect(
        await probe.catalogRows<{ user_id: string }>(
          `SELECT user_id FROM identity_lookup WHERE status = 'reserved' ORDER BY user_id`,
        ),
      ).toEqual([{ user_id: '01900000-0000-7000-8000-0000000000f2' }]);
    });
  },
);
