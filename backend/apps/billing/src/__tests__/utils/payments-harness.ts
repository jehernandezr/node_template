import type { Clock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ChargeInvoice } from '../../modules/payments/application/charge-invoice.use-case.js';
import { LocalPaymentsFacade } from '../../modules/payments/application/local-payments.facade.js';
import { RecordPaymentResult } from '../../modules/payments/application/record-payment-result.use-case.js';
import { ApprovingPaymentProvider } from './approving-payment-provider.js';
import { InMemoryPaymentAttempts } from './in-memory-payment-attempts.js';

/** The payments module over an approving provider and attempts kept in memory, as the other modules see it. */
export class PaymentsHarness {
  readonly provider = new ApprovingPaymentProvider();
  readonly attempts = new InMemoryPaymentAttempts();
  private readonly ids = new SequentialIdGenerator();
  private readonly shard = UnroutedShardScopes.create();

  constructor(private readonly clock: Clock) {}

  /** The facade of the module, charging and recording notices over these doubles. */
  facade(): LocalPaymentsFacade {
    return new LocalPaymentsFacade(
      new ChargeInvoice(
        this.provider,
        this.attempts,
        this.shard,
        this.ids,
        this.clock,
      ),
      new RecordPaymentResult(this.attempts, this.shard, this.ids, this.clock),
    );
  }
}
