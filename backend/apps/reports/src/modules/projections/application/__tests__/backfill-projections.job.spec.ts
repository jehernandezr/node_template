import {
  Currency,
  InvoiceStatus,
  type InvoiceChange,
} from '@contracts/billing';
import { TaskStatus, type TaskChange } from '@contracts/tasks';
import {
  InMemoryTransactionManager,
  SilentLogger,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ReportsDefaults } from '../../../../shared/constants/reports-defaults.constants.js';
import {
  InMemoryBackfillProgress,
  InMemoryFinanceProjection,
  InMemoryTaskProjection,
  ListedTenants,
  PagedInvoiceHistory,
  PagedTaskHistory,
} from '../../__tests__/utils/index.js';
import { BackfillProjectionsJob } from '../backfill-projections.job.js';
import { ProjectFinanceEvents } from '../project-finance-events.use-case.js';
import { ProjectTaskEvents } from '../project-task-events.use-case.js';

const ACME = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const GLOBEX = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
const ACTOR = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: ACME,
};

const task = (
  index: number,
  overrides: Partial<TaskChange> = {},
): TaskChange => ({
  id: `0192f1b4-7c3a-7d2e-9a41-${String(index).padStart(12, '0')}`,
  title: `Task ${index}`,
  description: '',
  status: TaskStatus.Open,
  version: 1,
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-03T09:00:00.000Z',
  createdBy: ACTOR,
  deletedAt: null,
  ...overrides,
});

const invoice = (overrides: Partial<InvoiceChange> = {}): InvoiceChange => ({
  id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
  number: 'FAC-000001',
  period: { start: '2026-11-01', end: '2026-11-30' },
  status: InvoiceStatus.Issued,
  currency: Currency.Cop,
  total: { amountMinor: 189_000, currency: Currency.Cop },
  issuedAt: '2026-12-01T00:05:00.000Z',
  paidAt: null,
  ...overrides,
});

class BackfillHarness {
  private readonly unrouted = new UnroutedShardScopes();
  private readonly transactions = new InMemoryTransactionManager();
  readonly taskHistory = new PagedTaskHistory();
  readonly invoiceHistory = new PagedInvoiceHistory();
  readonly tasks = new InMemoryTaskProjection(this.unrouted.scope);
  readonly finance = new InMemoryFinanceProjection(this.unrouted.scope);
  readonly taskEvents = new ProjectTaskEvents(
    this.tasks,
    this.unrouted.scopes,
    this.transactions,
  );
  readonly financeEvents = new ProjectFinanceEvents(
    this.finance,
    this.unrouted.scopes,
    this.transactions,
  );
  readonly job = new BackfillProjectionsJob(
    new ListedTenants([ACME, GLOBEX]),
    this.taskHistory,
    this.invoiceHistory,
    this.tasks,
    this.finance,
    new InMemoryBackfillProgress(this.unrouted.scope),
    this.unrouted.scopes,
    this.transactions,
    new SilentLogger(),
  );
}

describe('BackfillProjectionsJob', () => {
  it('copies the tasks and invoices of every tenant once and then stops asking for them', async () => {
    const harness = new BackfillHarness();
    harness.taskHistory.changes.byTenant.set(ACME, [task(1), task(2)]);
    harness.taskHistory.changes.byTenant.set(GLOBEX, [task(3)]);
    harness.invoiceHistory.changes.byTenant.set(ACME, [invoice()]);

    await harness.job.run();
    const served = harness.taskHistory.changes.pagesServed;
    await harness.job.run();

    expect(harness.tasks.tasksOf(ACME)).toHaveLength(2);
    expect(harness.tasks.tasksOf(GLOBEX)).toHaveLength(1);
    expect(harness.finance.invoicesOf(ACME)).toEqual([
      expect.objectContaining({ status: InvoiceStatus.Issued }),
    ]);
    expect(harness.taskHistory.changes.pagesServed).toBe(served);
  });

  it('dates a backfilled done task by its last change and keeps a deleted one out of the counts', async () => {
    const harness = new BackfillHarness();
    harness.taskHistory.changes.byTenant.set(ACME, [
      task(1, {
        status: TaskStatus.Done,
        version: 4,
        updatedAt: '2026-11-07T12:00:00.000Z',
      }),
      task(2, { deletedAt: '2026-11-08T12:00:00.000Z' }),
    ]);

    await harness.job.run();

    expect(harness.tasks.tasksOf(ACME)).toEqual([
      expect.objectContaining({ doneAt: new Date('2026-11-07T12:00:00.000Z') }),
      expect.objectContaining({
        removedAt: new Date('2026-11-08T12:00:00.000Z'),
      }),
    ]);
  });

  it('never takes a task or an invoice back to an older state that a live event already moved past', async () => {
    const harness = new BackfillHarness();
    await harness.taskEvents.updated({
      tenantId: ACME,
      taskId: task(1).id,
      changedFields: [],
      statusBefore: TaskStatus.Open,
      statusAfter: TaskStatus.InProgress,
      version: 2,
      actor: ACTOR,
      createdBy: ACTOR,
      updatedAt: '2026-11-05T10:00:00.000Z',
    });
    await harness.financeEvents.invoicePaid({
      tenantId: ACME,
      invoiceId: invoice().id,
      number: 'FAC-000001',
      total: invoice().total,
      paidAt: '2026-12-02T08:00:00.000Z',
    });
    harness.taskHistory.changes.byTenant.set(ACME, [task(1)]);
    harness.invoiceHistory.changes.byTenant.set(ACME, [invoice()]);

    await harness.job.run();

    expect(harness.tasks.tasksOf(ACME)).toEqual([
      expect.objectContaining({
        status: TaskStatus.InProgress,
        version: 2,
        createdAt: new Date('2026-11-03T09:00:00.000Z'),
      }),
    ]);
    expect(harness.finance.invoicesOf(ACME)).toEqual([
      expect.objectContaining({
        status: InvoiceStatus.Paid,
        issuedAt: new Date('2026-12-01T00:05:00.000Z'),
      }),
    ]);
  });

  it('backfills the other tenants when the history of one is down, and that one on a later run', async () => {
    const harness = new BackfillHarness();
    harness.taskHistory.changes.byTenant.set(ACME, [task(1)]);
    harness.taskHistory.changes.byTenant.set(GLOBEX, [task(2)]);
    harness.taskHistory.changes.down.add(ACME);

    await harness.job.run();
    expect(harness.tasks.tasksOf(ACME)).toEqual([]);
    expect(harness.tasks.tasksOf(GLOBEX)).toHaveLength(1);

    harness.taskHistory.changes.down.delete(ACME);
    await harness.job.run();
    expect(harness.tasks.tasksOf(ACME)).toHaveLength(1);
  });

  it('goes on where the previous run stopped when a history does not fit in one run', async () => {
    const harness = new BackfillHarness();
    const total =
      ReportsDefaults.backfillPageSize * ReportsDefaults.backfillPagesPerRun +
      3;
    harness.taskHistory.changes.byTenant.set(
      ACME,
      Array.from({ length: total }, (_, index) => task(index)),
    );

    await harness.job.run();
    expect(harness.tasks.tasksOf(ACME)).toHaveLength(total - 3);

    await harness.job.run();
    expect(harness.tasks.tasksOf(ACME)).toHaveLength(total);
  });
});
