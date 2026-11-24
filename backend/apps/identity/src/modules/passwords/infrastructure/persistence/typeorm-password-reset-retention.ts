import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { PasswordResetRetention } from '../../domain/password-reset-retention.js';
import { PasswordResetEntity } from './entities/password-reset.entity.js';

/**
 * Recorre los shards y borra en cada uno las recuperaciones vencidas, salvo las de los usuarios cuyo tenant de
 * origen ya se trasladó a otro shard. Un shard caído se reintenta en la próxima corrida.
 */
@Injectable()
export class TypeOrmPasswordResetRetention extends PasswordResetRetention {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async purgeExpiredBefore(cutoff: Date): Promise<number> {
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
