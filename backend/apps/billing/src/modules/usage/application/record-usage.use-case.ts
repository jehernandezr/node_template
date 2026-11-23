import { Injectable } from '@nestjs/common';
import type { RecordUsagePayload } from '@contracts/billing';
import { IdGenerator, TransactionManager } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { UsageLedger } from '../domain/usage-ledger.js';

/**
 * Aplica un lote de uso de otro servicio en una transacción: cada registro cuenta una sola vez por su llave,
 * aunque el lote llegue de nuevo o la llave se repita en otro lote.
 */
@Injectable()
export class RecordUsage {
  constructor(
    private readonly ledger: UsageLedger,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
  ) {}

  execute(batch: RecordUsagePayload): Promise<number> {
    return this.shard.run(batch.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        let applied = 0;
        for (const record of batch.records) {
          const windowStart = new Date(record.windowStart);
          const fresh = await this.ledger.claim({
            id: this.ids.next().toString(),
            key: record.key,
            metric: record.metric,
            quantity: record.quantity,
            windowStart,
          });
          if (fresh) {
            await this.ledger.accumulate(
              windowStart.toISOString().slice(0, 10),
              record.metric,
              record.quantity,
            );
            applied += 1;
          }
        }
        return applied;
      }),
    );
  }
}
