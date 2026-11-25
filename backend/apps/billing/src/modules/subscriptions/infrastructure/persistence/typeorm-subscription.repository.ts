import { Injectable } from '@nestjs/common';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { SubscriptionRepository } from '../../domain/subscription.repository.js';
import type { Subscription } from '../../domain/subscription.js';
import { SubscriptionEntity } from './entities/subscription.entity.js';
import { SubscriptionMapper } from './subscription.mapper.js';

/** `SubscriptionRepository` sobre `subscriptions` del shard del tenant. */
@Injectable()
export class TypeOrmSubscriptionRepository
  extends TenantIsolatedRepository
  implements SubscriptionRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async find(): Promise<Subscription | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(SubscriptionEntity, { tenantId }),
    );
    return row === null ? undefined : SubscriptionMapper.toDomain(row);
  }

  async lock(): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager
        .createQueryBuilder(SubscriptionEntity, 'subscription')
        .setLock('pessimistic_write')
        .where('subscription.tenantId = :tenantId', { tenantId })
        .getOne(),
    );
  }

  insert(subscription: Subscription): Promise<void> {
    return this.insertOwned(
      SubscriptionEntity,
      SubscriptionMapper.toRow(subscription),
    );
  }

  update(subscription: Subscription): Promise<void> {
    return this.updateOwned(
      SubscriptionEntity,
      SubscriptionMapper.toRow(subscription),
    );
  }

  async remove(): Promise<boolean> {
    const tenantId = this.tenantId();
    const result = await this.write((manager) =>
      manager.delete(SubscriptionEntity, { tenantId }),
    );
    return (result.affected ?? 0) > 0;
  }
}
