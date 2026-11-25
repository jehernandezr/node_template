import { Injectable } from '@nestjs/common';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import type { SmokeOrder } from './smoke-order.js';
import { SmokeOrderEntity } from './smoke-order.entity.js';
import { SmokeOrderMapper } from './smoke-order.mapper.js';

/** Orders of the tenant of the open `ShardScope`, on its assigned shard. */
@Injectable()
export class SmokeOrderRepository extends TenantIsolatedRepository {
  constructor(
    kit: RepositoryKit,
    private readonly mapper: SmokeOrderMapper,
  ) {
    super(kit);
  }

  /** The order, or `null` if the tenant has none with that id. */
  async findById(orderId: string): Promise<SmokeOrder | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(SmokeOrderEntity, { id: orderId, tenantId }),
    );
    return entity === null ? null : this.mapper.toDomain(entity);
  }

  /**
   * Inserts an order without a version and updates one with a version, then reads it back from the primary.
   * @throws OptimisticLockError if the version is no longer the stored one.
   */
  async save(order: SmokeOrder): Promise<SmokeOrder> {
    const entity = this.mapper.toPersistence(order);
    if (entity.version === undefined) {
      await this.insertOwned(SmokeOrderEntity, entity);
    } else {
      await this.updateOwned(SmokeOrderEntity, entity);
    }
    const tenantId = this.tenantId();
    const saved = await this.readPrimary((manager) =>
      manager.findOneByOrFail(SmokeOrderEntity, { id: entity.id, tenantId }),
    );
    return this.mapper.toDomain(saved);
  }
}
