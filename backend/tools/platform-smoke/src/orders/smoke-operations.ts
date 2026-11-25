import { Compensation, defineOperation } from '@contracts/platform';
import { z } from 'zod';

/** Business error declared by the payment verification. */
export const PAYMENT_DECLINED = 'SMOKE.PAYMENT.DECLINED';

/** Internal operations the welcome saga calls. Each one has its handler in `SmokeStockHandlers`. */
export class SmokeOperations {
  static readonly Reserve = defineOperation({
    id: 'smoke.stock.reserve.v1',
    input: z.object({ orderId: z.string() }),
    output: z.object({ reserved: z.boolean() }),
    idempotent: true,
    compensatedBy: 'smoke.stock.release.v1',
    description: 'Reserves stock for an order.',
    timeoutMs: 10_000,
    retry: { maxAttempts: 2, baseMs: 10, maxMs: 50 },
  });

  static readonly Release = defineOperation({
    id: 'smoke.stock.release.v1',
    input: z.object({ orderId: z.string() }),
    output: z.object({ released: z.boolean() }),
    idempotent: true,
    compensatedBy: Compensation.None,
    compensationReason:
      'Releasing an already released reservation has nothing to undo.',
    description: 'Releases the reservation of an order.',
    timeoutMs: 10_000,
    retry: { maxAttempts: 2, baseMs: 10, maxMs: 50 },
  });

  static readonly Verify = defineOperation({
    id: 'smoke.payment.verify.v1',
    input: z.object({ orderId: z.string(), fail: z.boolean() }),
    output: z.object({ verified: z.boolean() }),
    idempotent: true,
    mutating: false,
    errors: [PAYMENT_DECLINED],
    description: 'Verifies the order payment; may fail on purpose in the test.',
    timeoutMs: 10_000,
    retry: { maxAttempts: 1, baseMs: 10, maxMs: 10 },
  });

  /** All the operations this service publishes. */
  static readonly all = [
    SmokeOperations.Reserve,
    SmokeOperations.Release,
    SmokeOperations.Verify,
  ];
}
