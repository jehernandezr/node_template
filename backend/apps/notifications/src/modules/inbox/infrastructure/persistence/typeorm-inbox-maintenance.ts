import { Injectable } from '@nestjs/common';
import { AcrossShards } from '@platform/persistence';
import { LessThan } from 'typeorm';
import { InboxMaintenance } from '../../domain/inbox-maintenance.js';
import { NotificationEntity } from './entities/notification.entity.js';

/** Recorre los shards y borra en cada uno las notificaciones leídas antes del corte. */
@Injectable()
export class TypeOrmInboxMaintenance extends InboxMaintenance {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async purgeReadBefore(cutoff: Date): Promise<number> {
    const outcome = await this.shards.run(async (connection) => {
      const result = await connection.dataSource
        .getRepository(NotificationEntity)
        .delete({ readAt: LessThan(cutoff) });
      return result.affected ?? 0;
    });
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
