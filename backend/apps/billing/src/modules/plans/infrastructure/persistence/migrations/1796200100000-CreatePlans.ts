import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Plan catalog and its quotas per metric, shared by all tenants. */
export class CreatePlans1796200100000 implements MigrationInterface {
  readonly name = 'CreatePlans1796200100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "billing_plans" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(40) NOT NULL, "name" character varying(120) NOT NULL, "price_minor" bigint NOT NULL, "currency" character varying(3) NOT NULL, "periodicity" character varying(16) NOT NULL, "features" text array NOT NULL, CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id"), CONSTRAINT "billing_plans_price_check" CHECK ("price_minor" >= 0), CONSTRAINT "billing_plans_periodicity_check" CHECK ("periodicity" IN ('monthly', 'annual')))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "billing_plan_quotas" ("plan_id" uuid NOT NULL, "metric" character varying(32) NOT NULL, "quota_limit" bigint NOT NULL, "unit_price_minor" bigint, CONSTRAINT "billing_plan_quotas_pkey" PRIMARY KEY ("plan_id", "metric"), CONSTRAINT "billing_plan_quotas_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE CASCADE)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "billing_plan_quotas"`);
    await queryRunner.query(`DROP TABLE "billing_plans"`);
  }
}
