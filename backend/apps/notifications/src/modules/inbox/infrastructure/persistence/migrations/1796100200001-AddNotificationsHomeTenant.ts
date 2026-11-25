import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The home tenant of the owner of each notification: moving a tenant selects the rows by it. */
export class AddNotificationsHomeTenant1796100200001 implements MigrationInterface {
  readonly name = 'AddNotificationsHomeTenant1796100200001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "home_tenant_id" uuid`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "home_tenant_id"`,
    );
  }
}
