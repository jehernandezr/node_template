import {
  PartitionInterval,
  registerPartitionedTableSql,
} from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { LoginAttemptPartitions } from '../login-attempt-partitions.js';

/**
 * Registers `login_attempts` with retention for the platform partition functions, which refuse any table that is
 * not registered. A shard that created the table after `PlatformPartitionGuard` already has it registered;
 * running it again changes nothing.
 */
export class RetainLoginAttemptPartitions1795000300002 implements MigrationInterface {
  readonly name = 'RetainLoginAttemptPartitions1795000300002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      registerPartitionedTableSql(
        LoginAttemptPartitions.TABLE,
        PartitionInterval.Month,
        LoginAttemptPartitions.RETENTION_MONTHS,
      ),
    );
  }

  /**
   * Keeps the registration: `CreateLoginAttempts` registers the table too, and the partition job needs it while the
   * table exists.
   */
  down(): Promise<void> {
    return Promise.resolve();
  }
}
