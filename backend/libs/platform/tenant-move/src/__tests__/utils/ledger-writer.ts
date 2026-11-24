import { TenantWriteFence } from '@platform/persistence';
import { ShardingError } from '@platform/sharding';
import type { DataSource } from 'typeorm';

/** Una fila escrita y confirmada por el writer: su id y el valor con que quedó. */
export interface AckedWrite {
  readonly id: string;
  readonly total: string;
}

/**
 * Escribe ledgers de un tenant como lo haría un servicio: cada escritura entra por la barrera del tenant, en su
 * propia transacción con el tenant en la sesión. Lleva cuenta de lo que se confirmó y de lo que la barrera rechazó.
 */
export class LedgerWriter {
  private readonly fence = new TenantWriteFence();
  private readonly acked = new Map<string, string>();
  private rejections = 0;
  private sequence = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantId: string,
    private readonly ids: () => string,
  ) {}

  /** Inserta un ledger nuevo o cambia uno ya confirmado. Devuelve `false` si la barrera lo rechazó. */
  async writeOnce(): Promise<boolean> {
    this.sequence += 1;
    const existing = [...this.acked.keys()];
    const update = existing.length > 0 && this.sequence % 3 === 0;
    const id = update
      ? (existing[this.sequence % existing.length] ?? this.ids())
      : this.ids();
    const total = `${9_007_199_254_740_993n + BigInt(this.sequence)}`;
    const runner = this.dataSource.createQueryRunner('master');
    try {
      await runner.connect();
      await this.fence.admit(runner, this.tenantId);
    } catch (error) {
      await runner.release();
      if (error instanceof ShardingError) {
        this.rejections += 1;
        return false;
      }
      throw error;
    }
    try {
      await runner.startTransaction();
      await runner.query("SELECT set_config('app.tenant_id', $1, true)", [
        this.tenantId,
      ]);
      await runner.query(
        `INSERT INTO ledgers (id, tenant_id, name, total, updated_at) VALUES ($1, $2, $3, $4, clock_timestamp())
         ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total, version = ledgers.version + 1, updated_at = clock_timestamp()`,
        [id, this.tenantId, `ledger ${this.sequence}`, total],
      );
      await runner.commitTransaction();
      this.acked.set(id, total);
      return true;
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      throw error;
    } finally {
      await this.fence.leave(runner, this.tenantId);
      await runner.release();
    }
  }

  ackedWrites(): readonly AckedWrite[] {
    return [...this.acked].map(([id, total]) => ({ id, total }));
  }

  rejected(): number {
    return this.rejections;
  }
}
