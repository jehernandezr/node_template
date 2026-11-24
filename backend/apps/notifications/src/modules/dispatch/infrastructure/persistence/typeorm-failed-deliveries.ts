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
 * Entregas pendientes o fallidas de cada shard cuyo próximo intento ya llegó, sin las de los tenants que ya se
 * trasladaron a otro shard: esas las reintenta su shard nuevo.
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
