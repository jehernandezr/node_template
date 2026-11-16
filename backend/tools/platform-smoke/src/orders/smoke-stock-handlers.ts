import { Injectable } from '@nestjs/common';
import { type HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { PAYMENT_DECLINED, SmokeOperations } from './smoke-operations.js';

/** Handlers de las operaciones internas de la saga. Llevan el registro de reservas para observarlo. */
@Injectable()
export class SmokeStockHandlers {
  private readonly reserved = new Set<string>();

  @InternalHandler(SmokeOperations.Reserve)
  reserve(input: {
    readonly orderId: string;
  }): Promise<HandlerResult<{ reserved: boolean }>> {
    this.reserved.add(input.orderId);
    return Promise.resolve({
      outcome: CallOutcome.success({ reserved: true }),
    });
  }

  @InternalHandler(SmokeOperations.Release)
  release(input: {
    readonly orderId: string;
  }): Promise<HandlerResult<{ released: boolean }>> {
    this.reserved.delete(input.orderId);
    return Promise.resolve({
      outcome: CallOutcome.success({ released: true }),
    });
  }

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

  isReserved(orderId: string): boolean {
    return this.reserved.has(orderId);
  }
}
