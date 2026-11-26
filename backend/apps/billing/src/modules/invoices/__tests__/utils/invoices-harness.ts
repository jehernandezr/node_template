import { Currency, InvoiceLineKind } from '@contracts/billing';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
  SilentLogger,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import type { PaymentStatus } from '../../../payments/index.js';
import { CollectInvoice } from '../../application/collect-invoice.use-case.js';
import { SettleInvoice } from '../../application/settle-invoice.use-case.js';
import { Invoice } from '../../domain/invoice.js';
import { InMemoryInvoices } from './in-memory-invoices.js';
import { RecordingSubscriptions } from './recording-subscriptions.js';
import { ScriptedPayments } from './scripted-payments.js';

/** The invoice use cases of one tenant over doubles, with a journal of the reads and standing changes. */
export class InvoicesHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly ISSUED_AT = new Date('2026-12-01T00:05:00.000Z');

  readonly journal: string[] = [];
  readonly clock = new FixedClock(InvoicesHarness.ISSUED_AT);
  readonly invoices = new InMemoryInvoices(this.journal);
  readonly subscriptions = new RecordingSubscriptions(this.journal);
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  readonly payments: ScriptedPayments;
  private readonly shard = UnroutedShardScopes.create();

  constructor(statuses: PaymentStatus[] = []) {
    this.payments = new ScriptedPayments(statuses);
  }

  /** Stores an issued invoice of `totalMinor`, due for collection now, and returns its id. */
  async issue(id: string, totalMinor = 189_000): Promise<string> {
    await this.invoices.insert(
      Invoice.issue({
        id,
        number: `FAC-${id.slice(-6)}`,
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        currency: Currency.Cop,
        lines: [
          {
            kind: InvoiceLineKind.FixedFee,
            description: 'Plan',
            amountMinor: totalMinor,
          },
        ],
        now: this.clock.now(),
      }),
    );
    return id;
  }

  /** The use case that records payments and rejections. */
  settle(): SettleInvoice {
    return new SettleInvoice(
      this.invoices,
      this.subscriptions,
      this.bus,
      this.shard,
      this.transactions,
    );
  }

  /** The use case that charges a due invoice. */
  collect(): CollectInvoice {
    return new CollectInvoice(
      this.invoices,
      this.payments,
      this.settle(),
      this.shard,
      this.clock,
      new SilentLogger(),
    );
  }
}
