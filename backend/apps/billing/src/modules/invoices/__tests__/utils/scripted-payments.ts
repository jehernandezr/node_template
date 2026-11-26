import { PaymentsFacade } from '../../../payments/index.js';
import type { ChargeRequest, PaymentResult } from '../../../payments/index.js';
import { PaymentStatus } from '../../../payments/index.js';

/** Payments that answer each charge with the next scripted status and record every request. */
export class ScriptedPayments extends PaymentsFacade {
  readonly charges: ChargeRequest[] = [];

  constructor(private readonly statuses: PaymentStatus[] = []) {
    super();
  }

  override async charge(request: ChargeRequest): Promise<PaymentResult> {
    this.charges.push(request);
    return { status: this.statuses.shift() ?? PaymentStatus.Approved };
  }

  override async record(): Promise<number> {
    return 0;
  }
}
