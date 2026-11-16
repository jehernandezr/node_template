import { Injectable } from '@nestjs/common';
import { RepositoryKit, ShardedRepository } from '@platform/persistence';
import { SmokeOrder } from './smoke-order.js';
import { SmokeOrderEntity } from './smoke-order.entity.js';
import { SmokeOrderMapper } from './smoke-order.mapper.js';

/** Pedidos del tenant del contexto, en el shard que le toca. */
@Injectable()
export class SmokeOrderRepository extends ShardedRepository<
  SmokeOrder,
  SmokeOrderEntity
> {
  constructor(kit: RepositoryKit, mapper: SmokeOrderMapper) {
    super(SmokeOrderEntity, kit, mapper);
  }
}
