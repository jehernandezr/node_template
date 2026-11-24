import type { MigrationInterface, QueryRunner } from 'typeorm';

/** El tenant de origen del dueño de las preferencias: el traslado de un tenant elige las filas por él. */
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
