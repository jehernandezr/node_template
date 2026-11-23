import { Injectable } from '@nestjs/common';
import { AcrossShards } from '@platform/persistence';
import { In, LessThanOrEqual } from 'typeorm';
import { DeliveryStatus, type Delivery } from '../../domain/delivery.js';
import { FailedDeliveries } from '../../domain/failed-deliveries.js';
import { DeliveryRowMapper } from './delivery-row.mapper.js';
import { DeliveryEntity } from './entities/delivery.entity.js';

/** Entregas pendientes o fallidas de cada shard cuyo próximo intento ya llegó. */
@Injectable()
export class TypeOrmFailedDeliveries extends FailedDeliveries {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async due(now: Date, limit: number): Promise<readonly Delivery[]> {
    const outcome = await this.shards.run((connection) =>
      connection.dataSource.getRepository(DeliveryEntity).find({
        where: {
          status: In([DeliveryStatus.Pending, DeliveryStatus.Failed]),
          nextAttemptAt: LessThanOrEqual(now),
        },
        order: { nextAttemptAt: 'ASC' },
        take: limit,
      }),
    );
    return outcome.results.flatMap((result) =>
      result.value.map((row) => DeliveryRowMapper.toDomain(row)),
    );
  }
}
