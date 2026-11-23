import { Injectable } from '@nestjs/common';
import { AcrossShards } from '@platform/persistence';
import { LessThan } from 'typeorm';
import { PasswordResetRetention } from '../../domain/password-reset-retention.js';
import { PasswordResetEntity } from './entities/password-reset.entity.js';

/** Recorre los shards y borra en cada uno las recuperaciones vencidas. Un shard caído se reintenta en la próxima corrida. */
@Injectable()
export class TypeOrmPasswordResetRetention extends PasswordResetRetention {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async purgeExpiredBefore(cutoff: Date): Promise<number> {
    const outcome = await this.shards.run(async (connection) => {
      const result = await connection.dataSource
        .getRepository(PasswordResetEntity)
        .delete({ expiresAt: LessThan(cutoff) });
      return result.affected ?? 0;
    });
    return outcome.results.reduce((total, result) => total + result.value, 0);
  }
}
