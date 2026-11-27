import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A push the `none` sender does not deliver is stored as `skipped`. Old code never writes it, so it is an expand step. */
export class AllowSkippedDeliveries1796100300001 implements MigrationInterface {
  readonly name = 'AllowSkippedDeliveries1796100300001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_status_check" CHECK ("status" IN ('pending', 'sent', 'failed', 'abandoned', 'skipped'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_status_check" CHECK ("status" IN ('pending', 'sent', 'failed', 'abandoned'))`,
    );
  }
}
