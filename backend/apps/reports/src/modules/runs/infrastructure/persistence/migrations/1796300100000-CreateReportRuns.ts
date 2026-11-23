import {
  auditTriggerSql,
  dropAuditTriggerSql,
  TenantIsolationSql,
} from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

/** `report_runs` auditada, con RLS por tenant y la política de mantenimiento del vencimiento y del borrado. */
export class CreateReportRuns1796300100000 implements MigrationInterface {
  readonly name = 'CreateReportRuns1796300100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "report_runs" (${BASE}, "type" character varying(32) NOT NULL, "format" character varying(8) NOT NULL, "params" jsonb NOT NULL, "status" character varying(16) NOT NULL, "requested_by" uuid NOT NULL, "requested_by_home_tenant_id" uuid NOT NULL, "result" jsonb, "result_bytes" integer, "completed_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "failure_code" character varying(64), CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id"), CONSTRAINT "report_runs_status_check" CHECK ("status" IN ('queued', 'running', 'ready', 'failed', 'expired')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "report_runs_tenant_idx" ON "report_runs" ("tenant_id", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "report_runs_expiry_idx" ON "report_runs" ("status", "expires_at") `,
    );
    for (const statement of [
      ...auditTriggerSql('report_runs'),
      ...TenantIsolationSql.enable('report_runs'),
      ...TenantIsolationSql.allowMaintenance('report_runs'),
    ]) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of [
      ...TenantIsolationSql.disallowMaintenance('report_runs'),
      ...TenantIsolationSql.disable('report_runs'),
    ]) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(dropAuditTriggerSql('report_runs'));
    await queryRunner.query(`DROP TABLE "report_runs"`);
  }
}
