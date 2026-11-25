import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

/** `subscriptions` with RLS per tenant and the maintenance policy of the jobs that walk the tenants. */
export class CreateSubscriptions1796200200000 implements MigrationInterface {
  readonly name = 'CreateSubscriptions1796200200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscriptions" (${BASE}, "plan_id" uuid NOT NULL, "period_plan_id" uuid NOT NULL, "status" character varying(16) NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "proration_minor" bigint NOT NULL, "past_due_since" TIMESTAMP WITH TIME ZONE, CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"), CONSTRAINT "subscriptions_status_check" CHECK ("status" IN ('trialing', 'active', 'past_due', 'suspended', 'canceled')), CONSTRAINT "subscriptions_period_check" CHECK ("period_end" >= "period_start"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "subscriptions_tenant_key" ON "subscriptions" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "subscriptions_status_period_idx" ON "subscriptions" ("status", "period_end") `,
    );
    for (const statement of [
      ...TenantIsolationSql.enable('subscriptions'),
      ...TenantIsolationSql.allowMaintenance('subscriptions'),
    ]) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of [
      ...TenantIsolationSql.disallowMaintenance('subscriptions'),
      ...TenantIsolationSql.disable('subscriptions'),
    ]) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "subscriptions"`);
  }
}
