import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Las funcionalidades del plan que billing informa para cada tenant y cuándo las decidió. */
export class AddTenantPlanFeatures1795000800003 implements MigrationInterface {
  readonly name = 'AddTenantPlanFeatures1795000800003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "plan_features" text array`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "plan_changed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "plan_changed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "plan_features"`,
    );
  }
}
