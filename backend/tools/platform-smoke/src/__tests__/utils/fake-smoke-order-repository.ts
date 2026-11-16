import type { RepositoryKit } from '@platform/persistence';
import { SmokeOrder } from '../../orders/smoke-order.js';
import { SmokeOrderMapper } from '../../orders/smoke-order.mapper.js';
import { SmokeOrderRepository } from '../../orders/smoke-order.repository.js';

/** Repositorio en memoria para las pruebas unitarias: guarda agregados sin tocar una base. */
export class FakeSmokeOrderRepository extends SmokeOrderRepository {
  readonly rows = new Map<string, SmokeOrder>();
  /** Cuando es `true`, el próximo `save` falla como lo haría una fila que no cabe. */
  failNextSave = false;

  constructor() {
    super(undefined as unknown as RepositoryKit, new SmokeOrderMapper());
  }

  override save(order: SmokeOrder): Promise<SmokeOrder> {
    if (this.failNextSave) {
      this.failNextSave = false;
      return Promise.reject(new Error('the row does not fit'));
    }
    const stored = new SmokeOrder(
      order.id,
      order.customer,
      order.status,
      order.version + 1,
    );
    this.rows.set(order.id, stored);
    return Promise.resolve(stored);
  }

  override findById(id: string): Promise<SmokeOrder | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }
}
