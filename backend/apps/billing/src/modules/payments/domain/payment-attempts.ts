import type { PaymentAttempt } from './payment-attempt.js';
import type { PaymentResult } from './payment-provider.js';

/** Charge attempt log of the tenant of the open `ShardScope`. */
export abstract class PaymentAttempts {
  /**
   * Records the attempt as `Requested`, in its own transaction, before requesting the charge.
   * @param attempt Attempt to record, with its id and its number within the invoice.
   * @returns `false` if that attempt number was already recorded: another run reserved it and owns the charge.
   */
  abstract reserve(attempt: PaymentAttempt): Promise<boolean>;

  /**
   * Finds an attempt by its number within the invoice.
   * @param invoiceId Invoice of the attempt.
   * @param attempt Attempt number, starting at 1.
   * @returns The attempt, or `undefined` if it was never recorded.
   */
  abstract find(
    invoiceId: string,
    attempt: number,
  ): Promise<PaymentAttempt | undefined>;

  /**
   * Finds an attempt by the id that traveled to the provider as the idempotency key.
   * @param invoiceId Invoice the attempt must belong to.
   * @param id Attempt id.
   * @returns The attempt, or `undefined` if it does not exist or belongs to another invoice.
   */
  abstract findById(
    invoiceId: string,
    id: string,
  ): Promise<PaymentAttempt | undefined>;

  /**
   * Returns the invoice attempt with the highest number: the only one that can still be open.
   * @param invoiceId Invoice of the attempts.
   * @returns The last attempt, or `undefined` if the invoice was never charged.
   */
  abstract latest(invoiceId: string): Promise<PaymentAttempt | undefined>;

  /**
   * Stores the response of a still open attempt (`Requested` or `Pending`); a resolved one does not change.
   * @param id Attempt id.
   * @param result Provider response, with its reference or its reason.
   */
  abstract resolve(id: string, result: PaymentResult): Promise<void>;
}
