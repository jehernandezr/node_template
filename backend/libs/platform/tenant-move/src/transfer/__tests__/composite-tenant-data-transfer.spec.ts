import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { DataSource } from 'typeorm';
import { CompositeTenantDataTransfer } from '../composite-tenant-data-transfer.js';
import { TenantDataTransfer } from '../tenant-data-transfer.js';
import type { TenantTransfer } from '../tenant-transfer.js';

/** Una copia de una sola tabla que anota cada paso que le piden, con el avance y la verificación dados. */
class ScriptedTransfer extends TenantDataTransfer {
  constructor(
    private readonly table: string,
    private readonly journal: string[],
    private readonly caughtUp: boolean,
    private readonly verified: boolean,
  ) {
    super();
  }

  async sync(): Promise<TenantMoveProgress> {
    this.journal.push(`sync ${this.table}`);
    return {
      tables: [{ table: this.table, copiedRows: 1, pendingRows: 0 }],
      caughtUp: this.caughtUp,
    };
  }

  async verify(): Promise<TenantMoveVerification> {
    this.journal.push(`verify ${this.table}`);
    return {
      tables: [
        {
          table: this.table,
          sourceRows: 1,
          targetRows: this.verified ? 1 : 0,
          sourceChecksum: 'a',
          targetChecksum: this.verified ? 'a' : '',
        },
      ],
      verified: this.verified,
    };
  }

  async abort(): Promise<void> {
    this.journal.push(`abort ${this.table}`);
  }

  async cleanup(tenantId: string): Promise<void> {
    this.journal.push(`cleanup ${this.table} ${tenantId}`);
  }

  async assignRegion(
    tenantId: string,
    _target: DataSource,
    region: string,
  ): Promise<void> {
    this.journal.push(`region ${this.table} ${tenantId} ${region}`);
  }
}

const SHARD = {} as DataSource;
const MOVE: TenantTransfer = {
  moveId: 'move-1',
  tenantId: 'tenant-1',
  source: SHARD,
  target: SHARD,
};

describe('CompositeTenantDataTransfer', () => {
  it('runs every part in order and adds up their tables', async () => {
    const journal: string[] = [];
    const composite = new CompositeTenantDataTransfer([
      new ScriptedTransfer('ledgers', journal, true, true),
      new ScriptedTransfer('saga.instances', journal, true, true),
    ]);

    const progress = await composite.sync(MOVE);
    const verification = await composite.verify(MOVE);
    await composite.assignRegion('tenant-1', SHARD, 'region-b');
    await composite.cleanup('tenant-1', SHARD);
    await composite.abort(MOVE);

    expect(progress).toEqual({
      tables: [
        { table: 'ledgers', copiedRows: 1, pendingRows: 0 },
        { table: 'saga.instances', copiedRows: 1, pendingRows: 0 },
      ],
      caughtUp: true,
    });
    expect(verification.verified).toBe(true);
    expect(verification.tables.map((check) => check.table)).toEqual([
      'ledgers',
      'saga.instances',
    ]);
    expect(journal).toEqual([
      'sync ledgers',
      'sync saga.instances',
      'verify ledgers',
      'verify saga.instances',
      'region ledgers tenant-1 region-b',
      'region saga.instances tenant-1 region-b',
      'cleanup ledgers tenant-1',
      'cleanup saga.instances tenant-1',
      'abort ledgers',
      'abort saga.instances',
    ]);
  });

  it('is caught up and verified only when every part is', async () => {
    const journal: string[] = [];
    const composite = new CompositeTenantDataTransfer([
      new ScriptedTransfer('ledgers', journal, true, true),
      new ScriptedTransfer('saga.instances', journal, false, false),
    ]);

    await expect(composite.sync(MOVE)).resolves.toMatchObject({
      caughtUp: false,
    });
    await expect(composite.verify(MOVE)).resolves.toMatchObject({
      verified: false,
    });
  });
});
