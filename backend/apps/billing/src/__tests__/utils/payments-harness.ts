import type { Clock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ChargeInvoice } from '../../modules/payments/application/charge-invoice.use-case.js';
import { LocalPaymentsFacade } from '../../modules/payments/application/local-payments.facade.js';
import { RecordPaymentResult } from '../../modules/payments/application/record-payment-result.use-case.js';
import type { PaymentProvider } from '../../modules/payments/domain/payment-provider.js';
import { NonePaymentProvider } from '../../modules/payments/infrastructure/none-payment-provider.js';
import { ApprovingPaymentProvider } from './approving-payment-provider.js';
import { InMemoryPaymentAttempts } from './in-memory-payment-attempts.js';

/** The payments module over an approving provider and attempts kept in memory, as the other modules see it. */
export class PaymentsHarness {
  readonly provider = new ApprovingPaymentProvider();
  readonly attempts = new InMemoryPaymentAttempts();
  private readonly ids = new SequentialIdGenerator();
  private readonly shard = UnroutedShardScopes.create();

  constructor(private readonly clock: Clock) {}

  /** The facade of the module over the provider of `BILLING_PAYMENT_PROVIDER=none`, which never charges. */
  neverCharging(): LocalPaymentsFacade {
    return this.facade(new NonePaymentProvider());
  }

  /** The facade of the module, charging with `provider` and recording notices over these doubles. */
  facade(provider: PaymentProvider = this.provider): LocalPaymentsFacade {
    return new LocalPaymentsFacade(
      new ChargeInvoice(
        provider,
        this.attempts,
        this.shard,
        this.ids,
        this.clock,
      ),
      new RecordPaymentResult(this.attempts, this.shard, this.ids, this.clock),
    );
  }
}
