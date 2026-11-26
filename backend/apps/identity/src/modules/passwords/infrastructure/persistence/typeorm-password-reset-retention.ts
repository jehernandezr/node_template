import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { PasswordResetRetention } from '../../domain/password-reset-retention.js';
import { PasswordResetEntity } from './entities/password-reset.entity.js';

/**
 * Walks the shards and deletes the expired recoveries in each one, except those of users whose home tenant
 * was already moved to another shard. A down shard is retried on the next run.
 */
@Injectable()
export class TypeOrmPasswordResetRetention extends PasswordResetRetention {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  override async purgeExpiredBefore(cutoff: Date): Promise<number> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(
        connection.dataSource.manager,
        async (manager) => {
          const result = await manager
            .createQueryBuilder()
            .delete()
            .from(PasswordResetEntity)
            .where('"expires_at" < :cutoff', { cutoff })
            .andWhere(
              TenantWriteFence.unfenced(
                'SELECT u.home_tenant_id FROM users u WHERE u.id = "password_resets"."user_id"',
              ),
            )
            .execute();
          return result.affected ?? 0;
        },
      ),
    );
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
