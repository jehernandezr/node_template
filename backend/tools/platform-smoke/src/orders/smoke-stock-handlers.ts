import { Injectable } from '@nestjs/common';
import { type HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { PAYMENT_DECLINED, SmokeOperations } from './smoke-operations.js';

/** Handlers of the saga's internal operations. They keep the reservations record to observe it. */
@Injectable()
export class SmokeStockHandlers {
  private readonly reserved = new Set<string>();

  /**
   * Reserves stock for an order.
   * @param input Order to reserve.
   * @returns The reservation.
   */
  @InternalHandler(SmokeOperations.Reserve)
  reserve(input: {
    readonly orderId: string;
  }): Promise<HandlerResult<{ reserved: boolean }>> {
    this.reserved.add(input.orderId);
    return Promise.resolve({
      outcome: CallOutcome.success({ reserved: true }),
    });
  }

  /**
   * Releases the stock of an order, the compensation of reserving it.
   * @param input Order to release.
   * @returns The release.
   */
  @InternalHandler(SmokeOperations.Release)
  release(input: {
    readonly orderId: string;
  }): Promise<HandlerResult<{ released: boolean }>> {
    this.reserved.delete(input.orderId);
    return Promise.resolve({
      outcome: CallOutcome.success({ released: true }),
    });
  }

  /**
   * Verifies an order, failing when asked to, so the saga compensates.
   * @param input Order and whether to fail.
   * @returns The verification.
   */
  @InternalHandler(SmokeOperations.Verify)
  verify(input: {
    readonly orderId: string;
    readonly fail: boolean;
  }): Promise<HandlerResult<{ verified: boolean }>> {
    if (input.fail) {
      return Promise.resolve({
        outcome: CallOutcome.businessError(PAYMENT_DECLINED),
      });
    }
    return Promise.resolve({
      outcome: CallOutcome.success({ verified: true }),
    });
  }

  /**
   * Tells whether an order holds a reservation.
   * @param orderId Order to check.
   * @returns `true` when reserved.
   */
  isReserved(orderId: string): boolean {
    return this.reserved.has(orderId);
  }
}
