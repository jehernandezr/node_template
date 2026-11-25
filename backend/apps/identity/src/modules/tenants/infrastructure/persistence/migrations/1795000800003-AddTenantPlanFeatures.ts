import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The plan features billing reports for each tenant and when it decided them. */
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
