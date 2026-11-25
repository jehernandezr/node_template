import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

const TABLES = [
  'proj_tasks',
  'proj_invoices',
  'proj_deliveries',
  'proj_backfills',
] as const;

/** The task, invoice and delivery projections, and the backfill progress, with RLS per tenant. */
export class CreateProjections1796300200000 implements MigrationInterface {
  readonly name = 'CreateProjections1796300200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "proj_tasks" (${BASE}, "task_id" uuid NOT NULL, "status" character varying(16) NOT NULL, "task_created_at" TIMESTAMP WITH TIME ZONE, "done_at" TIMESTAMP WITH TIME ZONE, "removed_at" TIMESTAMP WITH TIME ZONE, "source_version" integer NOT NULL, CONSTRAINT "proj_tasks_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "proj_tasks_tenant_task_key" ON "proj_tasks" ("tenant_id", "task_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "proj_invoices" (${BASE}, "invoice_id" uuid NOT NULL, "number" character varying(32) NOT NULL, "status" character varying(16) NOT NULL, "status_progress" smallint NOT NULL, "currency" character varying(3) NOT NULL, "total_minor" bigint NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE, "paid_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "proj_invoices_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "proj_invoices_tenant_invoice_key" ON "proj_invoices" ("tenant_id", "invoice_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "proj_deliveries" (${BASE}, "notification_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "channels" text array NOT NULL, "notified_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "proj_deliveries_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "proj_deliveries_tenant_notification_key" ON "proj_deliveries" ("tenant_id", "notification_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "proj_backfills" (${BASE}, "source" character varying(16) NOT NULL, "cursor" text, "completed" boolean NOT NULL, CONSTRAINT "proj_backfills_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "proj_backfills_tenant_source_key" ON "proj_backfills" ("tenant_id", "source") `,
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
