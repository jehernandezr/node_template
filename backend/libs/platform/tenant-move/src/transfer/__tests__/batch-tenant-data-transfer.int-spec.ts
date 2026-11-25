import { SystemClock, UuidV7IdGenerator } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { TenantWriteFence } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import {
  LedgerManifest,
  LedgerWithAttemptsManifest,
  LedgerWriter,
  TickingClock,
  TransferTestDatabases,
} from '../../__tests__/utils/index.js';
import { BatchTenantDataTransfer } from '../batch/batch-tenant-data-transfer.js';
import type { TenantTransfer } from '../tenant-transfer.js';

const ids = new UuidV7IdGenerator();
const newId = (): string => ids.next().toString();

const OPTIONS = {
  batchSize: 7,
  callBudgetMs: 4_000,
  deltaMarginMs: 60_000,
  caughtUpRows: 0,
};

async function seedLedger(
  dataSource: DataSource,
  tenantId: string,
  total: string,
  entries: readonly string[],
): Promise<string> {
  const ledgerId = newId();
  await dataSource.transaction(async (manager) => {
    await manager.query("SELECT set_config('app.tenant_id', $1, true)", [
      tenantId,
    ]);
    await manager.query(
      'INSERT INTO ledgers (id, tenant_id, name, total, tags) VALUES ($1, $2, $3, $4, \'["a", {"b": 1}]\')',
      [ledgerId, tenantId, `ledger ${total}`, total],
    );
    for (const amount of entries) {
      await manager.query(
        'INSERT INTO entries (id, ledger_id, amount) VALUES ($1, $2, $3)',
        [newId(), ledgerId, amount],
      );
    }
  });
  return ledgerId;
}

/** Filas de cada tabla tal como las ve el superusuario, sin RLS, para comparar los dos lados. */
async function snapshot(
  admin: DataSource,
  tenantId: string,
): Promise<{ ledgers: unknown[]; entries: unknown[] }> {
  return {
    ledgers: await admin.query(
      'SELECT id, tenant_id, name, total::text, tags, version, created_at, updated_at FROM ledgers WHERE tenant_id = $1 ORDER BY id',
      [tenantId],
    ),
    entries: await admin.query(
      'SELECT e.id, e.ledger_id, e.amount::text, e.updated_at FROM entries e JOIN ledgers l ON l.id = e.ledger_id WHERE l.tenant_id = $1 ORDER BY e.id',
      [tenantId],
    ),
  };
}

/** Repite la llamada mientras la ronda no termina en su plazo, como lo hace la saga. */
async function untilRoundEnds<T>(call: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await call();
    } catch (error) {
      if (
        (error as { code?: unknown }).code !== TenantMoveErrorCode.RoundPending
      ) {
        throw error;
      }
    }
  }
}

new ContainerRuntime(process.env).describeIfAvailable(
  'BatchTenantDataTransfer over PostgreSQL',
  () => {
    jest.setTimeout(180_000);
    const databases = new TransferTestDatabases();
    const transfer = new BatchTenantDataTransfer(
      new LedgerManifest(),
      new SystemClock(),
      OPTIONS,
    );
    let source: DataSource;
    let target: DataSource;
    let sourceAdmin: DataSource;
    let targetAdmin: DataSource;
    let tenantId: string;
    let move: TenantTransfer;

    beforeAll(async () => {
      await databases.start();
    });

    afterAll(async () => {
      await databases.stop();
    });

    beforeEach(async () => {
      ({ source, target, sourceAdmin, targetAdmin } = await databases.pair());
      tenantId = newId();
      move = { moveId: newId(), tenantId, source, target };
    });

    it('copies every row of the tenant with its exact values and nothing of other tenants', async () => {
      const other = newId();
      for (let i = 0; i < 20; i++) {
        await seedLedger(
          source,
          tenantId,
          `${9_007_199_254_740_993n + BigInt(i)}`,
          ['12345678901234.5678', '-0.0001'],
        );
      }
      await seedLedger(source, other, '1', ['1']);

      const progress = await transfer.sync(move);

      expect(progress.tables).toEqual([
        { table: 'ledgers', copiedRows: 20, pendingRows: 0 },
        { table: 'entries', copiedRows: 40, pendingRows: 0 },
      ]);
      expect(await snapshot(targetAdmin, tenantId)).toEqual(
        await snapshot(sourceAdmin, tenantId),
      );
      await expect(snapshot(targetAdmin, other)).resolves.toEqual({
        ledgers: [],
        entries: [],
      });
    });

    it('catches up with rows changed and added since the last round, without duplicating', async () => {
      const first = await seedLedger(source, tenantId, '10', ['1']);
      await transfer.sync(move);
      await sourceAdmin.query(
        'UPDATE ledgers SET total = 11, version = 2, updated_at = now() WHERE id = $1',
        [first],
      );
      await seedLedger(source, tenantId, '20', ['2']);

      const progress = await transfer.sync(move);

      expect(progress.caughtUp).toBe(false);
      expect(await snapshot(targetAdmin, tenantId)).toEqual(
        await snapshot(sourceAdmin, tenantId),
      );
      await expect(transfer.sync(move)).resolves.toMatchObject({
        caughtUp: true,
      });
    });

    it('verifies the frozen copy and removes rows that were deleted in the source', async () => {
      const kept = await seedLedger(source, tenantId, '1', ['1']);
      const removed = await seedLedger(source, tenantId, '2', ['2', '3']);
      await transfer.sync(move);
      await sourceAdmin.query('DELETE FROM entries WHERE ledger_id = $1', [
        removed,
      ]);
      await sourceAdmin.query('DELETE FROM ledgers WHERE id = $1', [removed]);

      const verification = await transfer.verify(move);

      expect(verification.verified).toBe(true);
      expect(verification.tables.map((check) => check.targetRows)).toEqual([
        1, 1,
      ]);
      const ledgers: { id: string }[] = await targetAdmin.query(
        'SELECT id FROM ledgers',
      );
      expect(ledgers.map((row) => row.id)).toEqual([kept]);
    });

    it('verifies a copy whose table keeps its columns in another physical order than the source', async () => {
      await targetAdmin.query('ALTER TABLE ledgers DROP COLUMN tags');
      await targetAdmin.query(
        "ALTER TABLE ledgers ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'",
      );
      await seedLedger(source, tenantId, '1', ['1']);
      await seedLedger(source, tenantId, '2', ['2']);
      await transfer.sync(move);

      const verification = await transfer.verify(move);

      expect(verification.verified).toBe(true);
      expect(
        verification.tables.every(
          (check) => check.sourceChecksum === check.targetChecksum,
        ),
      ).toBe(true);
    });

    it('discards the copy on abort and the source on cleanup', async () => {
      await seedLedger(source, tenantId, '1', ['1', '2']);
      await transfer.sync(move);

      await transfer.abort(move);
      await transfer.cleanup(tenantId, source);

      for (const admin of [sourceAdmin, targetAdmin]) {
        await expect(snapshot(admin, tenantId)).resolves.toEqual({
          ledgers: [],
          entries: [],
        });
      }
    });

    it('stops at the call budget and continues where it left on the next call', async () => {
      for (let i = 0; i < 30; i++) {
        await seedLedger(source, tenantId, `${i}`, []);
      }
      const hurried = new BatchTenantDataTransfer(
        new LedgerManifest(),
        new SystemClock(),
        { ...OPTIONS, batchSize: 1, callBudgetMs: 1 },
      );

      await expect(hurried.sync(move)).rejects.toMatchObject({
        code: TenantMoveErrorCode.RoundPending,
        retryable: true,
      });
      const copiedSoFar: { count: string }[] = await targetAdmin.query(
        'SELECT count(*)::text AS count FROM ledgers',
      );
      expect(Number(copiedSoFar[0]?.count)).toBeLessThan(30);

      await transfer.sync(move);
      expect(await snapshot(targetAdmin, tenantId)).toEqual(
        await snapshot(sourceAdmin, tenantId),
      );
    });

    it('catches up with a large table without updated_at whose full read does not fit in one call', async () => {
      for (let i = 0; i < 30; i++) {
        await source.transaction(async (manager) => {
          await manager.query("SELECT set_config('app.tenant_id', $1, true)", [
            tenantId,
          ]);
          await manager.query(
            'INSERT INTO attempts (id, tenant_id, outcome) VALUES ($1, $2, $3)',
            [newId(), tenantId, `outcome ${i}`],
          );
        });
      }
      const hurried = new BatchTenantDataTransfer(
        new LedgerWithAttemptsManifest(),
        new TickingClock(),
        { ...OPTIONS, batchSize: 3, callBudgetMs: 6 },
      );

      let calls = 0;
      let progress: Awaited<ReturnType<typeof hurried.sync>> | undefined;
      while (progress?.caughtUp !== true && calls < 40) {
        calls += 1;
        try {
          progress = await hurried.sync(move);
        } catch (error) {
          if (
            (error as { code?: unknown }).code !==
            TenantMoveErrorCode.RoundPending
          ) {
            throw error;
          }
        }
      }

      expect(progress?.caughtUp).toBe(true);
      await expect(
        targetAdmin.query(
          'SELECT count(*)::int AS count FROM attempts WHERE tenant_id = $1',
          [tenantId],
        ),
      ).resolves.toEqual([{ count: 30 }]);
    });

    it('verifies a table too large for one call over several calls, each one going on where the last stopped', async () => {
      const ledgers: string[] = [];
      for (let i = 0; i < 30; i++) {
        ledgers.push(await seedLedger(source, tenantId, `${i}`, [`${i}`]));
      }
      await transfer.sync(move);
      const [first, , , , , sixth, , , , , eleventh, , , , , sixteenth] =
        ledgers;
      // Cambios que las rondas delta no ven: sin tocar `updated_at`, como una transacción que confirmó tarde.
      await sourceAdmin.query(
        'UPDATE ledgers SET total = total + 1000 WHERE id = ANY($1::uuid[])',
        [[first, eleventh]],
      );
      await sourceAdmin.query('DELETE FROM entries WHERE ledger_id = $1', [
        sixth,
      ]);
      await sourceAdmin.query('DELETE FROM ledgers WHERE id = $1', [sixth]);
      await targetAdmin.query(
        'UPDATE entries SET amount = 0 WHERE ledger_id = $1',
        [sixteenth],
      );
      const hurried = new BatchTenantDataTransfer(
        new LedgerManifest(),
        new TickingClock(),
        { ...OPTIONS, batchSize: 3, callBudgetMs: 12, deltaMarginMs: 0 },
      );

      let calls = 0;
      let verification: Awaited<ReturnType<typeof hurried.verify>> | undefined;
      while (verification === undefined && calls < 100) {
        calls += 1;
        try {
          verification = await hurried.verify(move);
        } catch (error) {
          if (
            (error as { code?: unknown }).code !==
            TenantMoveErrorCode.RoundPending
          ) {
            throw error;
          }
        }
      }

      expect(calls).toBeGreaterThan(2);
      expect(verification?.verified).toBe(true);
      expect(await snapshot(targetAdmin, tenantId)).toEqual(
        await snapshot(sourceAdmin, tenantId),
      );
      await expect(
        targetAdmin.query('SELECT 1 FROM tenant_move_checkpoints'),
      ).resolves.toEqual([]);
    });

    it('neither loses nor duplicates any row written while the tenant moves', async () => {
      const writers = Array.from(
        { length: 4 },
        () => new LedgerWriter(source, tenantId, newId),
      );
      const fence = new TenantWriteFence();
      let writing = true;
      const running = writers.map(async (writer) => {
        while (writing) {
          await writer.writeOnce();
        }
      });
      try {
        for (let round = 0; round < 3; round++) {
          await untilRoundEnds(() => transfer.sync(move));
        }
        await fence.raise(source, tenantId, move.moveId);
        const verification = await untilRoundEnds(() => transfer.verify(move));
        expect(verification.verified).toBe(true);
        await expect(writers[0]?.writeOnce()).resolves.toBe(false);
      } finally {
        writing = false;
        await Promise.all(running);
      }

      const acked = writers.flatMap((writer) => writer.ackedWrites());
      const copied: { id: string; total: string }[] = await targetAdmin.query(
        'SELECT id, total::text AS total FROM ledgers WHERE tenant_id = $1 ORDER BY id',
        [tenantId],
      );
      expect(acked.length).toBeGreaterThan(10);
      expect(
        writers.reduce((sum, writer) => sum + writer.rejected(), 0),
      ).toBeGreaterThan(0);
      expect(copied).toEqual(
        [...acked].sort((a, b) => a.id.localeCompare(b.id)),
      );
    });
  },
);
