import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@contracts/billing';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import { SubscriptionMaintenance } from '../../domain/subscription-maintenance.js';
import { SubscriptionEntity } from './entities/subscription.entity.js';

/**
 * `subscriptions` queries across all shards, in cross-tenant maintenance transactions, excluding tenants
 * that have already moved to another shard.
 */
@Injectable()
export class TypeOrmSubscriptionMaintenance extends SubscriptionMaintenance {
  private static readonly OPEN = [
    SubscriptionStatus.Trialing,
    SubscriptionStatus.Active,
    SubscriptionStatus.PastDue,
  ];

  constructor(private readonly shards: AcrossShards) {
    super();
  }

  dueForClosing(today: string): Promise<readonly string[]> {
    return this.tenantsWhere((manager) =>
      manager
        .createQueryBuilder(SubscriptionEntity, 'subscription')
        .select(['subscription.id', 'subscription.tenantId'])
        .where('subscription.status IN (:...open)', {
          open: TypeOrmSubscriptionMaintenance.OPEN,
        })
        .andWhere('subscription.periodEnd < :today', { today })
        .andWhere(TenantWriteFence.unfenced('subscription.tenant_id'))
        .getMany(),
    );
  }

  pastDueBefore(cutoff: Date): Promise<readonly string[]> {
    return this.tenantsWhere((manager) =>
      manager
        .createQueryBuilder(SubscriptionEntity, 'subscription')
        .select(['subscription.id', 'subscription.tenantId'])
        .where('subscription.status = :status', {
          status: SubscriptionStatus.PastDue,
        })
        .andWhere('subscription.pastDueSince < :cutoff', { cutoff })
        .andWhere(TenantWriteFence.unfenced('subscription.tenant_id'))
        .getMany(),
    );
  }

  private async tenantsWhere(
    query: (manager: EntityManager) => Promise<SubscriptionEntity[]>,
  ): Promise<readonly string[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, query),
    );
    return outcome.results.flatMap((result) =>
      result.value.map((row) => row.tenantId),
    );
  }
}
