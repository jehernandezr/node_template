import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@contracts/billing';
import { AcrossShards, TenantMaintenanceSession } from '@platform/persistence';
import { In, LessThan, type EntityManager } from 'typeorm';
import { SubscriptionMaintenance } from '../../domain/subscription-maintenance.js';
import { SubscriptionEntity } from './entities/subscription.entity.js';

/** Consultas de `subscriptions` en todos los shards, en transacciones de mantenimiento entre tenants. */
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
      manager.find(SubscriptionEntity, {
        select: { tenantId: true },
        where: {
          status: In(TypeOrmSubscriptionMaintenance.OPEN),
          periodEnd: LessThan(today),
        },
      }),
    );
  }

  pastDueBefore(cutoff: Date): Promise<readonly string[]> {
    return this.tenantsWhere((manager) =>
      manager.find(SubscriptionEntity, {
        select: { tenantId: true },
        where: {
          status: SubscriptionStatus.PastDue,
          pastDueSince: LessThan(cutoff),
        },
      }),
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
