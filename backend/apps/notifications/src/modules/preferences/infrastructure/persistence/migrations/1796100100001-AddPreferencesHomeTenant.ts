import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The home tenant of the preferences owner: moving a tenant selects the rows by it. */
export class AddPreferencesHomeTenant1796100100001 implements MigrationInterface {
  readonly name = 'AddPreferencesHomeTenant1796100100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD "home_tenant_id" uuid`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN "home_tenant_id"`,
    );
  }
}
