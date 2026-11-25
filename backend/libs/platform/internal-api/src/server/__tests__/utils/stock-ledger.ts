import { Compensation, defineOperation } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import type { HandlerResult } from '../../handler-result.js';
import { OperationHandler } from '../../operation-handler.js';

/** Un paso de saga que reserva stock y su compensación. */
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

/** Las reservas de stock de un participante de saga, con las que vive cada una. */
export class StockLedger {
  readonly reserved = new Set<string>();
}

/** Reserva stock; con `gate`, espera antes de aplicar el efecto, como un handler lento. */
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

  /** Espera la compuerta y anota la reserva. */
  async handle(input: {
    sku: string;
  }): Promise<HandlerResult<{ reservationId: string }>> {
    this.calls += 1;
    await this.gate;
    this.ledger.reserved.add(input.sku);
    return { outcome: CallOutcome.success({ reservationId: input.sku }) };
  }
}

/** Libera la reserva que dejó el paso hacia delante, si la hay. */
export class ReleaseHandler extends OperationHandler<
  typeof StockOperations.Release
> {
  constructor(private readonly ledger: StockLedger) {
    super();
  }

  /** Quita la reserva. */
  async handle(input: {
    reservationId: string;
  }): Promise<HandlerResult<{ released: boolean }>> {
    const released = this.ledger.reserved.delete(input.reservationId);
    return { outcome: CallOutcome.success({ released }) };
  }
}
