import type { EntityMapper } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { SmokeOrder } from './smoke-order.js';
import { SmokeOrderEntity } from './smoke-order.entity.js';
import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Translates between the aggregate and the row. A version without a value inserts; with a value, it updates. */
@Injectable()
export class SmokeOrderMapper implements EntityMapper<
  SmokeOrder,
  SmokeOrderEntity
> {
  toDomain(entity: SmokeOrderEntity): SmokeOrder {
    return new SmokeOrder(
      entity.id,
      entity.customer,
      entity.status as SmokeOrderStatus,
      entity.version ?? 0,
    );
  }

  toPersistence(aggregate: SmokeOrder): SmokeOrderEntity {
    const entity = new SmokeOrderEntity();
    entity.id = aggregate.id;
    entity.customer = aggregate.customer;
    entity.status = aggregate.status;
    if (aggregate.version > 0) {
      entity.version = aggregate.version;
    }
    return entity;
  }
}
