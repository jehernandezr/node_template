import {
  createPartitionedTableSql,
  PartitionBy,
  PartitionInterval,
} from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { LoginAttemptPartitions } from '../login-attempt-partitions.js';

/**
 * `login_attempts` partitioned by month on `id` (UUIDv7): each month is a table, so the 12-month retention
 * drops whole partitions instead of rows. The primary key is the partition column.
 */
export class CreateLoginAttempts1795000300000 implements MigrationInterface {
  readonly name = 'CreateLoginAttempts1795000300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of createPartitionedTableSql(
      LoginAttemptPartitions.TABLE,
      `"id" uuid NOT NULL, "user_id" uuid NOT NULL, "result" character varying(16) NOT NULL, "reason" character varying(32), "ip" character varying(64) NOT NULL, "device_id" uuid, "trace_id" character varying(64), "attempted_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")`,
      {
        by: PartitionBy.Range,
        column: 'id',
        interval: PartitionInterval.Month,
        retention: LoginAttemptPartitions.RETENTION_MONTHS,
      },
      LoginAttemptPartitions.MONTHS_AHEAD,
    )) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(
      `CREATE INDEX "login_attempts_user_idx" ON "login_attempts" ("user_id", "attempted_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "login_attempts" CASCADE`);
  }
}
