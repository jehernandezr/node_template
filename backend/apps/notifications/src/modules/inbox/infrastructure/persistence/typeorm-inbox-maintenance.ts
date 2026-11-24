import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { InboxMaintenance } from '../../domain/inbox-maintenance.js';
import { NotificationEntity } from './entities/notification.entity.js';

/**
 * Recorre los shards y borra en cada uno las notificaciones leídas antes del corte, salvo las de los usuarios cuyo
 * tenant de origen ya se trasladó a otro shard.
 */
@Injectable()
export class TypeOrmInboxMaintenance extends InboxMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async purgeReadBefore(cutoff: Date): Promise<number> {
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
