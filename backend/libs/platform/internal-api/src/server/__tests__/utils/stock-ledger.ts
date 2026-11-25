import { Compensation, defineOperation } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import type { HandlerResult } from '../../handler-result.js';
import { OperationHandler } from '../../operation-handler.js';

/** A saga step that reserves stock and its compensation. */
export class StockOperations {
  static readonly Reserve = defineOperation({
    id: 'stock.reserve.v1',
    input: z.object({ sku: z.string() }),
    output: z.object({ reservationId: z.string() }),
    idempotent: true,
    compensatedBy: 'stock.release.v1',
    description: 'Reserves stock.',
  });

  static readonly Release = defineOperation({
    id: 'stock.release.v1',
    input: z.object({ reservationId: z.string() }),
    output: z.object({ released: z.boolean() }),
    idempotent: true,
    compensatedBy: Compensation.None,
    compensationReason: 'Idempotent release',
    description: 'Releases a reservation.',
  });
}

/** The stock reservations of a saga participant, with what each one holds. */
export class StockLedger {
  readonly reserved = new Set<string>();
}

/** Reserves stock; with `gate`, waits before applying the effect, like a slow handler. */
export class ReserveHandler extends OperationHandler<
  typeof StockOperations.Reserve
> {
  calls = 0;

  constructor(
    private readonly ledger: StockLedger,
    private readonly gate: Promise<void> = Promise.resolve(),
  ) {
    super();
  }

  /** Waits for the gate and records the claim. */
  async handle(input: {
    sku: string;
  }): Promise<HandlerResult<{ reservationId: string }>> {
    this.calls += 1;
    await this.gate;
    this.ledger.reserved.add(input.sku);
    return { outcome: CallOutcome.success({ reservationId: input.sku }) };
  }
}

/** Releases the reservation left by the forward step, if any. */
export class ReleaseHandler extends OperationHandler<
  typeof StockOperations.Release
> {
  constructor(private readonly ledger: StockLedger) {
    super();
  }

  /** Removes the claim. */
  async handle(input: {
    reservationId: string;
  }): Promise<HandlerResult<{ released: boolean }>> {
    const released = this.ledger.reserved.delete(input.reservationId);
    return { outcome: CallOutcome.success({ released }) };
  }
}
