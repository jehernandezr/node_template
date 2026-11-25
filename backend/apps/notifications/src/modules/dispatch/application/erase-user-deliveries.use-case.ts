import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ShardScopes } from '@platform/persistence';
import { DeliveryRepository } from '../domain/delivery.repository.js';

/** Deletes a user's deliveries in their shard, as part of the erasure of their data. */
@Injectable()
export class EraseUserDeliveries {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly shard: ShardScopes,
  ) {}

  /** The number of deliveries deleted; repeating it deletes nothing. */
  execute(user: UserRef): Promise<number> {
    return this.shard.inUserShard(user, () =>
      this.deliveries.erase(user.userId),
    );
  }
}
