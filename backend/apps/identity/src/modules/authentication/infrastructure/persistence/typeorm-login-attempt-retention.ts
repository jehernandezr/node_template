import { Injectable } from '@nestjs/common';
import { AcrossShards } from '@platform/persistence';
import {
  LoginAttemptRetention,
  type LoginAttemptRetentionReport,
} from '../../domain/login-attempt-retention.js';
import { LoginAttemptPartitions } from './login-attempt-partitions.js';

/** Walks the service shards and maintains the `login_attempts` partitions on each one. */
@Injectable()
export class TypeOrmLoginAttemptRetention extends LoginAttemptRetention {
  private readonly partitions = new LoginAttemptPartitions();

  constructor(private readonly shards: AcrossShards) {
    super();
  }

  async maintain(now: Date): Promise<LoginAttemptRetentionReport> {
    const outcome = await this.shards.run((connection) =>
      connection.dataSource.transaction((manager) =>
        this.partitions.maintain(manager, now),
      ),
    );
    return {
      dropped: outcome.results.flatMap((result) =>
        result.value.map((name) => `${result.shard}/${name}`),
      ),
      failedShards: outcome.failures.map((failure) => failure.shard),
    };
  }
}
