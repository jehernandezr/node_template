import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { DeliveryStatus, type Delivery } from '../../domain/delivery.js';
import { FailedDeliveries } from '../../domain/failed-deliveries.js';
import { DeliveryRowMapper } from './delivery-row.mapper.js';
import { DeliveryEntity } from './entities/delivery.entity.js';

/**
 * Pending or failed deliveries of each shard whose next attempt is due, excluding those of tenants already
 * moved to another shard: their new shard retries those.
 */
@Injectable()
export class TypeOrmFailedDeliveries extends FailedDeliveries {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async due(now: Date, limit: number): Promise<readonly Delivery[]> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, (manager) =>
        manager
          .createQueryBuilder(DeliveryEntity, 'delivery')
          .where('delivery.status IN (:...statuses)', {
            statuses: [DeliveryStatus.Pending, DeliveryStatus.Failed],
          })
          .andWhere('delivery.nextAttemptAt <= :now', { now })
          .andWhere(TenantWriteFence.unfenced('delivery.home_tenant_id'))
          .orderBy('delivery.nextAttemptAt', 'ASC')
          .take(limit)
          .getMany(),
      ),
    );
    return outcome.results.flatMap((result) =>
      result.value.map((row) => DeliveryRowMapper.toDomain(row)),
    );
  }
}
