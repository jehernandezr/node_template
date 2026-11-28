import type { MigrationInterface, QueryRunner } from 'typeorm';
import { PartitionBy, PartitionInterval } from '../../enums.js';
import { createPartitionedTableSql } from '../../migrations/schema-helpers.js';

/**
 * Creates two monthly partitioned tables, each with a partition of January 2020: `expiring_probes`, registered with
 * retention as a service migration does, and `loose_probes`, never registered for the platform functions.
 */
export class CreatePartitionedProbes1794700000003 implements MigrationInterface {
  readonly name = 'CreatePartitionedProbes1794700000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of createPartitionedTableSql(
      'expiring_probes',
      '"id" uuid NOT NULL, CONSTRAINT "expiring_probes_pkey" PRIMARY KEY ("id")',
      {
        by: PartitionBy.Range,
        column: 'id',
        interval: PartitionInterval.Month,
        retention: 1,
      },
      1,
    )) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(
      'CREATE TABLE "loose_probes" ("id" uuid PRIMARY KEY) PARTITION BY RANGE ("id")',
    );
    for (const table of ['expiring_probes', 'loose_probes']) {
      await queryRunner.query(
        `CREATE TABLE "${table}_202001" PARTITION OF "${table}" FOR VALUES FROM (platform_uuid_v7_lower_bound('2020-01-01')) TO (platform_uuid_v7_lower_bound('2020-02-01'))`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "loose_probes"');
    await queryRunner.query('DROP TABLE "expiring_probes"');
    await queryRunner.query(
      `DELETE FROM platform_partitioned_tables WHERE table_name = 'expiring_probes'`,
    );
  }
}
