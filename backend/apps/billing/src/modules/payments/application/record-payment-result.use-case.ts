import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PaymentAttempts } from '../domain/payment-attempts.js';
import type { PaymentResult } from '../domain/payment-provider.js';

/**
 * Anota lo que el proveedor informó después por su webhook, con su referencia o su motivo: resuelve el intento que
 * quedó abierto o, si el cobro no salió de billing, anota uno ya resuelto. Un intento resuelto no cambia, así que
 * repetir el aviso no hace nada.
 */
@Injectable()
export class RecordPaymentResult {
  constructor(
    private readonly attempts: PaymentAttempts,
    private readonly shard: TenantShard,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  execute(
    tenantId: string,
    invoiceId: string,
    attempt: number,
    result: PaymentResult,
  ): Promise<void> {
    return this.shard.run(tenantId, async () => {
      const recorded = await this.attempts.reserve({
        id: this.ids.next().toString(),
        invoiceId,
        attempt,
        requestedAt: this.clock.now(),
        ...result,
      });
      if (recorded) {
        return;
      }
      const existing = await this.attempts.find(invoiceId, attempt);
      if (existing !== undefined) {
        await this.attempts.resolve(existing.id, result);
      }
    });
  }
}
