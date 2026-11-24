import type { MigrationInterface, QueryRunner } from 'typeorm';

/** El tenant de origen del dueño de cada notificación: el traslado de un tenant elige las filas por él. */
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
