import {
  Currency,
  InvoiceLineKind,
  SubscriptionStatus,
} from '@contracts/billing';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { CatalogPlans } from '../../../../__tests__/utils/catalog-plans.js';
import { PaymentsHarness } from '../../../../__tests__/utils/payments-harness.js';
import { SubscriptionsHarness } from '../../../../__tests__/utils/subscriptions-harness.js';
import type { PaymentsFacade, PaymentStatus } from '../../../payments/index.js';
import { CloseInvoicePeriodsJob } from '../../application/close-invoice-periods.job.js';
import { CollectInvoice } from '../../application/collect-invoice.use-case.js';
import { IssueInvoice } from '../../application/issue-invoice.use-case.js';
import { RecordPaymentNotice } from '../../application/record-payment-notice.use-case.js';
import { SettleInvoice } from '../../application/settle-invoice.use-case.js';
import { Invoice } from '../../domain/invoice.js';
import { InMemoryInvoices } from './in-memory-invoices.js';
import { ScriptedPayments } from './scripted-payments.js';
import { SequentialInvoiceNumbering } from './sequential-invoice-numbering.js';
import { TenantInvoiceMaintenance } from './tenant-invoice-maintenance.js';

/**
 * The invoice use cases of one tenant over in-memory repositories, with the real subscriptions module behind them, so
 * a test reads the standing the invoices leave the subscription in.
 */
export class InvoicesHarness {
  static readonly TENANT = SubscriptionsHarness.TENANT;
  static readonly ISSUED_AT = new Date('2026-12-01T00:05:00.000Z');
  static readonly FIRST_PERIOD_START = '2026-11-01';

  readonly subscriptionsModule = new SubscriptionsHarness();
  readonly clock = this.subscriptionsModule.clock;
  readonly transactions = this.subscriptionsModule.transactions;
  readonly bus = this.subscriptionsModule.bus;
  readonly usage = this.subscriptionsModule.usage;
  readonly subscriptions = this.subscriptionsModule.facade();
  readonly invoices = new InMemoryInvoices();
  readonly numbering = new SequentialInvoiceNumbering();
  readonly payments: ScriptedPayments;
  readonly paymentsModule = new PaymentsHarness(this.clock);
  readonly attempts = this.paymentsModule.attempts;
  readonly logger = new SilentLogger();
  private readonly ids = new SequentialIdGenerator();
  private readonly shard = UnroutedShardScopes.create();

  constructor(statuses: PaymentStatus[] = []) {
    this.payments = new ScriptedPayments(statuses);
    this.clock.set(InvoicesHarness.ISSUED_AT);
  }

  /** Stores an active subscription to the basic plan whose first period started on November 1st. */
  async subscribe(): Promise<void> {
    await this.subscriptionsModule.seedActive(
      CatalogPlans.BASIC,
      InvoicesHarness.FIRST_PERIOD_START,
    );
  }

  /** The status the subscription was left in, or `undefined` without one. */
  standing(): SubscriptionStatus | undefined {
    return this.subscriptionsModule.subscriptions.current()?.snapshot().status;
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

  /** The use case that closes the period of the subscription and issues its invoice. */
  issueInvoice(): IssueInvoice {
    return new IssueInvoice(
      this.invoices,
      this.numbering,
      this.subscriptions,
      this.usage,
      this.bus,
      this.shard,
      this.transactions,
      this.ids,
      this.clock,
      this.subscriptionsModule.settings,
    );
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

  /** The use case that charges a due invoice with `payments`, the scripted ones unless another is given. */
  collect(payments: PaymentsFacade = this.payments): CollectInvoice {
    return new CollectInvoice(
      this.invoices,
      payments,
      this.settle(),
      this.shard,
      this.clock,
      this.logger,
    );
  }

  /** The hourly job that closes the periods and charges the due invoices with `payments`, the scripted ones by default. */
  closingJob(payments: PaymentsFacade = this.payments): CloseInvoicePeriodsJob {
    return new CloseInvoicePeriodsJob(
      this.subscriptions,
      this.issueInvoice(),
      new TenantInvoiceMaintenance(InvoicesHarness.TENANT, this.invoices),
      this.collect(payments),
      this.clock,
      this.logger,
    );
  }

  /** The use case that applies the provider's webhook, over the real payments module and its attempts. */
  notices(): RecordPaymentNotice {
    return new RecordPaymentNotice(
      this.invoices,
      this.paymentsModule.facade(),
      this.settle(),
      this.subscriptions,
      this.shard,
      this.transactions,
    );
  }
}
