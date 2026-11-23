import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

const TABLES = ['usage_records', 'usage_totals', 'billing_members'] as const;

/** Registros de uso por llave, totales por día y miembros facturables, con RLS por tenant. */
export class CreateUsage1796200300000 implements MigrationInterface {
  readonly name = 'CreateUsage1796200300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "usage_records" (${BASE}, "key" character varying(200) NOT NULL, "metric" character varying(32) NOT NULL, "quantity" bigint NOT NULL, "window_start" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "usage_records_tenant_key_key" ON "usage_records" ("tenant_id", "key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "usage_totals" (${BASE}, "day" date NOT NULL, "metric" character varying(32) NOT NULL, "quantity" bigint NOT NULL, CONSTRAINT "usage_totals_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "usage_totals_tenant_day_metric_key" ON "usage_totals" ("tenant_id", "day", "metric") `,
    );
    await queryRunner.query(
      `CREATE TABLE "billing_members" (${BASE}, "user_id" uuid NOT NULL, CONSTRAINT "billing_members_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "billing_members_tenant_user_key" ON "billing_members" ("tenant_id", "user_id") `,
    );
    for (const table of TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...TABLES].reverse()) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
  }
}
