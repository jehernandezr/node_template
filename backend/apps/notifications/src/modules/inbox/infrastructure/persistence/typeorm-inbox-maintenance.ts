import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { InboxMaintenance } from '../../domain/inbox-maintenance.js';
import { NotificationEntity } from './entities/notification.entity.js';

/**
 * Walks the shards and deletes in each one the notifications read before the cutoff, except those of users whose
 * home tenant has already moved to another shard.
 */
@Injectable()
export class TypeOrmInboxMaintenance extends InboxMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  override async purgeReadBefore(cutoff: Date): Promise<number> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(
        connection.dataSource.manager,
        async (manager) => {
          const result = await manager
            .createQueryBuilder()
            .delete()
            .from(NotificationEntity)
            .where('"read_at" < :cutoff', { cutoff })
            .andWhere(
              TenantWriteFence.unfenced('"notifications"."home_tenant_id"'),
            )
            .execute();
          return result.affected ?? 0;
        },
      ),
    );
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
