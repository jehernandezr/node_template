import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import type { TenantMove } from '../domain/tenant-move.js';
import { TenantMoveStatus } from '../domain/tenant-move-status.enum.js';
import { TenantMoveEntity } from '../infrastructure/persistence/entities/tenant-move.entity.js';
import { tenantMovesCatalogMigrations } from '../infrastructure/persistence/migrations/index.js';
import { TypeOrmTenantMoveLog } from '../infrastructure/persistence/typeorm-tenant-move-log.js';

const DAY_MS = 24 * 60 * 60_000;
const NOW = new Date('2026-11-24T10:00:00.000Z');
const ago = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

let sequence = 0;
const moveOf = (tenantId: string): TenantMove => {
  sequence += 1;
  const suffix = sequence.toString(16).padStart(4, '0');
  return {
    moveId: `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e${suffix}`,
    sagaId: `0192f1b4-7c3a-7d2e-9a41-5b6c7d8f${suffix}`,
    tenantId,
    targetGroup: 'sa-group-1',
    targetRegion: 'sa-east-1',
    status: TenantMoveStatus.Running,
    startedAt: ago(30),
  };
};

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TypeOrmTenantMoveLog over PostgreSQL', () => {
  jest.setTimeout(180_000);
  const database = new ShardedTestDatabase({
    shard: { entities: [], migrations: [] },
    catalog: {
      entities: [TenantMoveEntity],
      migrations: tenantMovesCatalogMigrations,
    },
  });
  let log: TypeOrmTenantMoveLog;

  beforeAll(async () => {
    await database.start();
    await database.migrate();
    log = new TypeOrmTenantMoveLog(database.catalog);
  });

  afterAll(async () => {
    await database.stop();
  });

  it('keeps one running move per tenant and the first instant of its switch', async () => {
    const tenant = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
    const move = moveOf(tenant);

    await expect(log.start(move)).resolves.toBe(true);
    await expect(log.start(moveOf(tenant))).resolves.toBe(false);
    await log.markSwitched(move.moveId, ago(10));
    await log.markSwitched(move.moveId, ago(9));

    await expect(log.runningFor(tenant)).resolves.toBeUndefined();
    await expect(log.switchedBefore(ago(8), 50)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moveId: move.moveId,
          status: TenantMoveStatus.Switched,
          switchedAt: ago(10),
        }),
      ]),
    );
  });

  it('offers first the moves never attempted and then the ones attempted longest ago, and forgets the cleaned ones', async () => {
    const attemptedLately = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02');
    const attemptedLongAgo = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a03');
    const neverAttempted = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a04');
    const cleaned = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05');
    const recent = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a06');
    for (const [move, switchedDaysAgo] of [
      [attemptedLately, 20],
      [attemptedLongAgo, 19],
      [neverAttempted, 18],
      [cleaned, 21],
      [recent, 1],
    ] as const) {
      await log.start(move);
      await log.markSwitched(move.moveId, ago(switchedDaysAgo));
    }
    await log.markCleanupAttempted(attemptedLately.moveId, ago(0.1));
    await log.markCleanupAttempted(attemptedLongAgo.moveId, ago(2));
    await log.markCleanedUp(cleaned.moveId);

    const due = await log.switchedBefore(ago(7), 50);
    const ours = due
      .map((move) => move.moveId)
      .filter((moveId) =>
        [
          attemptedLately,
          attemptedLongAgo,
          neverAttempted,
          cleaned,
          recent,
        ].some((move) => move.moveId === moveId),
      );

    expect(ours).toEqual([
      neverAttempted.moveId,
      attemptedLongAgo.moveId,
      attemptedLately.moveId,
    ]);
    expect(
      due.find((move) => move.moveId === attemptedLongAgo.moveId),
    ).toMatchObject({ cleanupAttemptedAt: ago(2) });
  });

  it('closes a running move as aborted and never a switched one', async () => {
    const aborted = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a07');
    const switched = moveOf('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a08');
    await log.start(aborted);
    await log.start(switched);
    await log.markSwitched(switched.moveId, ago(30));

    await log.markAborted(aborted.moveId);
    await log.markAborted(switched.moveId);

    await expect(
      log.runningFor('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a07'),
    ).resolves.toBeUndefined();
    await expect(log.switchedBefore(ago(7), 50)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moveId: switched.moveId }),
      ]),
    );
  });
});
