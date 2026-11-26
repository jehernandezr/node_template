import { platformShardMigrations } from '@platform/adapters-postgres';
import {
  UuidV7IdGenerator,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { SagaStatus } from '@platform/saga';
import { TenantStatus } from '@platform/sharding';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import {
  ForeignKeyRaceTransfer,
  LedgerManifest,
  ProbedAbortTransfer,
  RehearsalShard,
  TenantMoveRehearsal,
} from '../../__tests__/utils/index.js';
import { LedgerShardMigration1900000000030 } from '../../nest/__tests__/utils/index.js';

const ids = new UuidV7IdGenerator(new SystemClock(), new SystemRandomSource());
const newId = (): string => ids.next().toString();

/** Repeats the step while its round does not finish within the call's deadline, like the saga. */
async function untilDone<T>(step: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await step();
    } catch (error) {
      if (
        (error as { code?: unknown }).code !== TenantMoveErrorCode.RoundPending
      ) {
        throw error;
      }
    }
  }
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TenantMoves back and forth between shards', () => {
  jest.setTimeout(300_000);
  const rehearsal = new TenantMoveRehearsal({
    manifest: new LedgerManifest(),
    shardMigrations: [
      ...platformShardMigrations,
      LedgerShardMigration1900000000030,
    ],
    batchSize: 3,
  });

  const write = (tenantId: string): Promise<string> => {
    const id = newId();
    return rehearsal.db.runAs(tenantId, () =>
      rehearsal.db.transactions.runInTransaction(async (uow) => {
        await uow.manager.query(
          'INSERT INTO ledgers (id, tenant_id, name, total) VALUES ($1, $2, $3, 1)',
          [id, tenantId, `ledger ${id}`],
        );
        return id;
      }),
    );
  };

  const ledgerIds = async (
    shard: RehearsalShard,
    tenantId: string,
  ): Promise<string[]> =>
    (
      (await (
        await rehearsal.shard(shard)
      ).query('SELECT id FROM ledgers WHERE tenant_id = $1 ORDER BY id', [
        tenantId,
      ])) as { id: string }[]
    ).map((row) => row.id);

  /** A tenant saga on the shard, with the given status. */
  const sagaOf = async (
    shard: RehearsalShard,
    tenantId: string,
    status: SagaStatus,
  ): Promise<string> => {
    const id = newId();
    await (
      await rehearsal.shard(shard)
    ).query(
      `INSERT INTO saga.instances (id, tenant_id, type, status, current_step, direction, version, attempts,
         input_digest, created_at, updated_at)
       VALUES ($1, $2, 'ledger.saga', $3, 0, 'forward', 1, 0, 'digest', now(), now())`,
      [id, tenantId, status],
    );
    return id;
  };

  beforeAll(async () => {
    await rehearsal.start();
  });

  afterAll(async () => {
    await rehearsal.stop();
  });

  it('brings a tenant back to the shard it left after the cleanup, lets it write there and empties the other shard', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const away = await rehearsal.move(tenant, RehearsalShard.B);
    await rehearsal.cleanup(away.ref);
    const writtenAway = await write(tenant);

    const back = await rehearsal.move(tenant, RehearsalShard.A);
    const writtenBack = await write(tenant);
    await rehearsal.cleanup(back.ref);

    const rows = await ledgerIds(RehearsalShard.A, tenant);
    expect(rows).toEqual(expect.arrayContaining([writtenAway, writtenBack]));
    expect(rows).toHaveLength(4);
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual([]);
    await expect(
      rehearsal.fence.raisedBy(await rehearsal.shard(RehearsalShard.A), tenant),
    ).resolves.toBeUndefined();
    await expect(
      rehearsal.fence.raisedBy(await rehearsal.shard(RehearsalShard.B), tenant),
    ).resolves.toBeUndefined();
    await expect(rehearsal.placement(tenant)).resolves.toMatchObject({
      region: TenantMoveRehearsal.REGIONS[RehearsalShard.A],
      shardGroup: [RehearsalShard.A],
      status: TenantStatus.Active,
    });
  });

  it('waits for the sagas of the tenant before copying and refuses to freeze a tenant with a saga behind the fence', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const saga = await sagaOf(RehearsalShard.A, tenant, SagaStatus.Running);
    const moves = rehearsal.steps();
    const move = rehearsal.refTo(tenant, RehearsalShard.B);

    await expect(moves.sync(move)).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
      retryable: true,
    });
    await (
      await rehearsal.shard(RehearsalShard.A)
    ).query('UPDATE saga.instances SET status = $2 WHERE id = $1', [
      saga,
      SagaStatus.Completed,
    ]);
    await untilDone(() => moves.sync(move));
    await sagaOf(RehearsalShard.A, tenant, SagaStatus.Suspended);

    await expect(moves.finalize(move)).rejects.toMatchObject({
      code: TenantMoveErrorCode.TenantBusy,
      retryable: false,
    });
    await moves.abort(move);
    await expect(rehearsal.placement(tenant)).resolves.toMatchObject({
      shardGroup: [RehearsalShard.A],
      status: TenantStatus.Active,
    });
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual([]);
  });

  it('refuses to clean a source that the directory of the service still routes the tenant to', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const moves = rehearsal.steps();
    const move = rehearsal.refTo(tenant, RehearsalShard.B);
    await untilDone(() => moves.sync(move));
    await untilDone(() => moves.finalize(move));
    const before = await ledgerIds(RehearsalShard.A, tenant);

    await expect(moves.cleanup(move)).rejects.toMatchObject({
      code: TenantMoveErrorCode.NotSwitched,
      retryable: false,
    });
    const kept = await ledgerIds(RehearsalShard.A, tenant);
    await moves.switch(move);
    await rehearsal.cleanup(move);

    expect(kept).toEqual(before);
    expect(kept).toHaveLength(2);
    await expect(ledgerIds(RehearsalShard.A, tenant)).resolves.toEqual([]);
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual(before);
  });

  it('brings a tenant back before the first cleanup, which then leaves its live rows alone', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const away = await rehearsal.move(tenant, RehearsalShard.B);
    const writtenAway = await write(tenant);
    const removedAway = (await ledgerIds(RehearsalShard.B, tenant))[0];
    await (
      await rehearsal.shard(RehearsalShard.B)
    ).query('DELETE FROM entries WHERE ledger_id = $1', [removedAway]);
    await (
      await rehearsal.shard(RehearsalShard.B)
    ).query('DELETE FROM ledgers WHERE id = $1', [removedAway]);

    const back = await rehearsal.move(tenant, RehearsalShard.A);
    const writtenBack = await write(tenant);
    await rehearsal.cleanup(away.ref);
    const afterFirstCleanup = await ledgerIds(RehearsalShard.A, tenant);
    await rehearsal.cleanup(back.ref);

    expect(back.verification.verified).toBe(true);
    expect(afterFirstCleanup).toEqual(
      expect.arrayContaining([writtenAway, writtenBack]),
    );
    expect(afterFirstCleanup).not.toContain(removedAway);
    expect(afterFirstCleanup).toHaveLength(3);
    await expect(ledgerIds(RehearsalShard.A, tenant)).resolves.toEqual(
      afterFirstCleanup,
    );
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual([]);
  });

  it('keeps the copy of a move back to the source when the cleanup of the first move runs between its finalize and its switch', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const away = await rehearsal.move(tenant, RehearsalShard.B);
    const writtenAway = await write(tenant);
    const moves = rehearsal.steps();
    const back = rehearsal.refTo(tenant, RehearsalShard.A);
    await untilDone(() => moves.sync(back));
    await untilDone(() => moves.finalize(back));

    await expect(moves.cleanup(away.ref)).rejects.toMatchObject({
      code: TenantMoveErrorCode.MoveInProgress,
      retryable: false,
    });
    await moves.switch(back);
    await rehearsal.cleanup(away.ref);
    await rehearsal.cleanup(back);

    const rows = await ledgerIds(RehearsalShard.A, tenant);
    expect(rows).toContain(writtenAway);
    expect(rows).toHaveLength(3);
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual([]);
  });

  it('answers a round pending when a child reaches the target before its parent, and copies both on the next round', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const moves = rehearsal.stepsWith(
      (transfer) => new ForeignKeyRaceTransfer(transfer),
    );
    const move = rehearsal.refTo(tenant, RehearsalShard.B);

    await expect(moves.sync(move)).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
      retryable: true,
    });
    await untilDone(() => moves.sync(move));
    const verification = await untilDone(() => moves.finalize(move));
    await moves.switch(move);

    expect(verification.verified).toBe(true);
  });

  it('lets the tenant write in the source again before it discards the copy of an aborted move', async () => {
    const tenant = newId();
    await rehearsal.seed(tenant, RehearsalShard.A);
    const seen: { fence?: string; status?: TenantStatus } = {};
    const moves = rehearsal.stepsWith(
      (transfer) =>
        new ProbedAbortTransfer(transfer, async () => {
          seen.fence = await rehearsal.fence.raisedBy(
            await rehearsal.shard(RehearsalShard.A),
            tenant,
          );
          seen.status = (await rehearsal.placement(tenant)).status;
        }),
    );
    const move = rehearsal.refTo(tenant, RehearsalShard.B);
    await untilDone(() => moves.sync(move));
    await untilDone(() => moves.finalize(move));

    await moves.abort(move);

    expect(seen).toEqual({ fence: undefined, status: TenantStatus.Active });
    await expect(ledgerIds(RehearsalShard.B, tenant)).resolves.toEqual([]);
  });
});
