import { Injectable } from '@nestjs/common';
import { RepositoryKit, ShardedRepository } from '@platform/persistence';
import { SmokeOrder } from './smoke-order.js';
import { SmokeOrderEntity } from './smoke-order.entity.js';
import { SmokeOrderMapper } from './smoke-order.mapper.js';

/** Orders of the context tenant, on its assigned shard. */
@Injectable()
export class SmokeOrderRepository extends ShardedRepository<
  SmokeOrder,
  SmokeOrderEntity
> {
  constructor(kit: RepositoryKit, mapper: SmokeOrderMapper) {
    super(SmokeOrderEntity, kit, mapper);
  }
}
