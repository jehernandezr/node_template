import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import { FixedClock } from '@platform/kernel/test-utils';
import type { DataSource } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { CompositeTenantDataTransfer } from '../composite-tenant-data-transfer.js';
import { TenantDataTransfer } from '../tenant-data-transfer.js';
import type { TenantTransfer } from '../tenant-transfer.js';
import type { TransferBudget } from '../transfer-budget.js';

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

/** Una copia que gasta `spentMs` del plazo de la llamada en cada tabla que copia o borra. */
class SlowTransfer extends TenantDataTransfer {
  constructor(
    private readonly table: string,
    private readonly clock: FixedClock,
    private readonly spentMs: number,
  ) {
    super();
  }

  async sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    this.spend(transfer.budget);
    return {
      tables: [{ table: this.table, copiedRows: 1, pendingRows: 0 }],
      caughtUp: true,
    };
  }

  async verify(): Promise<TenantMoveVerification> {
    return { tables: [], verified: true };
  }

  async abort(transfer: TenantTransfer): Promise<void> {
    this.spend(transfer.budget);
  }

  async cleanup(
    _tenantId: string,
    _source: DataSource,
    budget?: TransferBudget,
  ): Promise<void> {
    this.spend(budget);
  }

  assignRegion(): Promise<void> {
    return Promise.resolve();
  }

  private spend(budget: TransferBudget | undefined): void {
    budget?.check(this.table);
    this.clock.advance(this.spentMs);
  }
}

const BUDGET_MS = 1_000;
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
    const composite = new CompositeTenantDataTransfer(
      [
        new ScriptedTransfer('ledgers', journal, true, true),
        new ScriptedTransfer('saga.instances', journal, true, true),
      ],
      new FixedClock(),
      BUDGET_MS,
    );

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
    const composite = new CompositeTenantDataTransfer(
      [
        new ScriptedTransfer('ledgers', journal, true, true),
        new ScriptedTransfer('saga.instances', journal, false, false),
      ],
      new FixedClock(),
      BUDGET_MS,
    );

    await expect(composite.sync(MOVE)).resolves.toMatchObject({
      caughtUp: false,
    });
    await expect(composite.verify(MOVE)).resolves.toMatchObject({
      verified: false,
    });
  });

  it('gives every part of a call the same budget, so the call ends when the parts together spend it', async () => {
    const clock = new FixedClock();
    const composite = new CompositeTenantDataTransfer(
      ['ledgers', 'entries', 'saga.instances'].map(
        (table) => new SlowTransfer(table, clock, 600),
      ),
      clock,
      BUDGET_MS,
    );

    await expect(composite.sync(MOVE)).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
      details: { table: 'saga.instances' },
    });
    await expect(composite.cleanup('tenant-1', SHARD)).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
      details: { table: 'saga.instances' },
    });
  });

  it('starts a new budget on every call', async () => {
    const clock = new FixedClock();
    const composite = new CompositeTenantDataTransfer(
      ['ledgers', 'saga.instances'].map(
        (table) => new SlowTransfer(table, clock, 600),
      ),
      clock,
      BUDGET_MS,
    );

    await expect(composite.sync(MOVE)).resolves.toMatchObject({
      caughtUp: true,
    });
    await expect(composite.sync(MOVE)).resolves.toMatchObject({
      caughtUp: true,
    });
  });
});
