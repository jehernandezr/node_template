import { AssignedShardConnections } from '../../__tests__/utils/assigned-shard-connections.js';
import {
  SystemClock,
  UuidV7IdGenerator,
  SystemRandomSource,
} from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { DataSource } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import {
  LedgerManifest,
  LedgersOnlyManifest,
  TransferTestDatabases,
} from '../../__tests__/utils/index.js';
import { BatchTenantDataTransfer } from '../batch/batch-tenant-data-transfer.js';
import { LogicalReplicationTransfer } from '../logical/logical-replication-transfer.js';
import { ReplicationNames } from '../logical/replication-names.js';
import type { TenantTransfer } from '../tenant-transfer.js';

const ids = new UuidV7IdGenerator(new SystemClock(), new SystemRandomSource());
const newId = (): string => ids.next().toString();
const clock = new SystemClock();
const manifest = new LedgersOnlyManifest();
const connections = new AssignedShardConnections();
const batch = new BatchTenantDataTransfer(manifest, connections, clock, {
  batchSize: 100,
  callBudgetMs: 4_000,
  deltaMarginMs: 60_000,
  caughtUpRows: 0,
});

async function insertLedger(
  admin: DataSource,
  tenantId: string,
  total: number,
): Promise<string> {
  const id = newId();
  await admin.query(
    'INSERT INTO ledgers (id, tenant_id, name, total) VALUES ($1, $2, $3, $4)',
    [id, tenantId, `ledger ${total}`, total],
  );
  return id;
}

async function replicaIdentity(admin: DataSource): Promise<string> {
  const rows: { identity: string }[] = await admin.query(
    "SELECT relreplident AS identity FROM pg_class WHERE relname = 'ledgers'",
  );
  return rows[0]?.identity ?? '';
}

async function ledgerIds(
  admin: DataSource,
  tenantId: string,
): Promise<string[]> {
  const rows: { id: string }[] = await admin.query(
    'SELECT id FROM ledgers WHERE tenant_id = $1 ORDER BY id',
    [tenantId],
  );
  return rows.map((row) => row.id);
}

new ContainerRuntime(process.env).describeIfAvailable(
  'LogicalReplicationTransfer over PostgreSQL',
  () => {
    jest.setTimeout(180_000);
    const databases = new TransferTestDatabases();
    const replication = new LogicalReplicationTransfer(
      manifest,
      batch,
      connections,
      clock,
      {
        callBudgetMs: 4_000,
        caughtUpBytes: 1_048_576,
        lockTimeoutMs: 2_000,
        sourceHost: 'localhost',
        sourcePort: 5432,
      },
    );

    beforeAll(async () => {
      await databases.start();
    });

    afterAll(async () => {
      await databases.stop();
    });

    it('refuses a manifest with tables reached through their parent', () => {
      expect(
        () =>
          new LogicalReplicationTransfer(
            new LedgerManifest(),
            batch,
            connections,
            clock,
            {
              callBudgetMs: 1_000,
              caughtUpBytes: 0,
              lockTimeoutMs: 1_000,
            },
          ),
      ).toThrow(
        expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
      );
    });

    it('replicates the rows of the tenant, follows later changes and deletes, and leaves nothing behind', async () => {
      const { sourceAdmin, targetAdmin } = await databases.pair();
      const tenantId = newId();
      const other = newId();
      const move: TenantTransfer = {
        moveId: newId(),
        tenantId,
        source: connections.locationOf(sourceAdmin),
        target: connections.locationOf(targetAdmin),
      };
      await insertLedger(sourceAdmin, tenantId, 1);
      const deleted = await insertLedger(sourceAdmin, tenantId, 2);
      await insertLedger(sourceAdmin, other, 3);

      let caughtUp = false;
      for (let round = 0; round < 600 && !caughtUp; round++) {
        caughtUp = (await replication.sync(move)).caughtUp;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(caughtUp).toBe(true);
      await insertLedger(sourceAdmin, tenantId, 4);
      await sourceAdmin.query('DELETE FROM ledgers WHERE id = $1', [deleted]);

      const verification = await replication.verify(move);

      expect(verification.verified).toBe(true);
      expect(await ledgerIds(targetAdmin, tenantId)).toEqual(
        await ledgerIds(sourceAdmin, tenantId),
      );
      await expect(ledgerIds(targetAdmin, other)).resolves.toEqual([]);
      await expect(
        sourceAdmin.query('SELECT 1 FROM pg_publication WHERE pubname = $1', [
          ReplicationNames.of(move.moveId),
        ]),
      ).resolves.toEqual([]);
      await expect(
        sourceAdmin.query(
          'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1',
          [ReplicationNames.of(move.moveId)],
        ),
      ).resolves.toEqual([]);
      await expect(
        targetAdmin.query('SELECT 1 FROM pg_subscription WHERE subname = $1', [
          ReplicationNames.of(move.moveId),
        ]),
      ).resolves.toEqual([]);
    });

    it('drops the replication and the copy on abort', async () => {
      const { sourceAdmin, targetAdmin } = await databases.pair();
      const tenantId = newId();
      const move: TenantTransfer = {
        moveId: newId(),
        tenantId,
        source: connections.locationOf(sourceAdmin),
        target: connections.locationOf(targetAdmin),
      };
      await insertLedger(sourceAdmin, tenantId, 1);
      await replication.sync(move);

      await replication.abort(move);

      await expect(ledgerIds(targetAdmin, tenantId)).resolves.toEqual([]);
      await expect(
        targetAdmin.query('SELECT 1 FROM pg_subscription WHERE subname = $1', [
          ReplicationNames.of(move.moveId),
        ]),
      ).resolves.toEqual([]);
      await expect(
        sourceAdmin.query(
          'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1',
          [ReplicationNames.of(move.moveId)],
        ),
      ).resolves.toEqual([]);
    });

    it('gives up the round instead of queueing the writes behind a long transaction that holds the table', async () => {
      const { sourceAdmin, targetAdmin } = await databases.pair();
      const tenantId = newId();
      const move: TenantTransfer = {
        moveId: newId(),
        tenantId,
        source: connections.locationOf(sourceAdmin),
        target: connections.locationOf(targetAdmin),
      };
      const impatient = new LogicalReplicationTransfer(
        manifest,
        batch,
        connections,
        clock,
        {
          callBudgetMs: 4_000,
          caughtUpBytes: 0,
          lockTimeoutMs: 100,
        },
      );
      const holder = sourceAdmin.createQueryRunner();
      await holder.connect();
      try {
        await holder.startTransaction();
        await holder.query('SELECT count(*) FROM ledgers');

        await expect(impatient.sync(move)).rejects.toMatchObject({
          code: TenantMoveErrorCode.RoundPending,
          retryable: true,
        });
        await holder.rollbackTransaction();
      } finally {
        await holder.release();
      }
      await expect(replicaIdentity(sourceAdmin)).resolves.toBe('d');
      await expect(
        sourceAdmin.query('SELECT 1 FROM pg_publication WHERE pubname = $1', [
          ReplicationNames.of(move.moveId),
        ]),
      ).resolves.toEqual([]);
    });

    it('keeps the updates of a shard working for every tenant while another move from it is still published', async () => {
      const first = await databases.pair();
      const second = await databases.pair();
      const source = first.sourceAdmin;
      const leaving = newId();
      const staying = newId();
      const bystander = newId();
      const leavingMove: TenantTransfer = {
        moveId: newId(),
        tenantId: leaving,
        source: connections.locationOf(source),
        target: connections.locationOf(first.targetAdmin),
      };
      const stayingMove: TenantTransfer = {
        moveId: newId(),
        tenantId: staying,
        source: connections.locationOf(source),
        target: connections.locationOf(second.targetAdmin),
      };
      await insertLedger(source, leaving, 1);
      await insertLedger(source, staying, 2);
      await insertLedger(source, bystander, 3);
      await replication.sync(leavingMove);
      await replication.sync(stayingMove);

      await replication.abort(leavingMove);
      await source.query('UPDATE ledgers SET total = total + 1');
      const identityWhileOneIsPublished = await replicaIdentity(source);
      await replication.abort(stayingMove);

      expect(identityWhileOneIsPublished).toBe('f');
      await expect(replicaIdentity(source)).resolves.toBe('d');
      const totals: { total: string }[] = await source.query(
        'SELECT total::text AS total FROM ledgers ORDER BY total',
      );
      expect(totals.map((row) => row.total)).toEqual(['2', '3', '4']);
    });
  },
);
