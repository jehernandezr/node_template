import {
  auditTriggerSql,
  dropAuditTriggerSql,
  TenantIsolationSql,
} from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

const TABLES = ['invoices', 'invoice_lines', 'invoice_sequences'] as const;

/**
 * Facturas (auditadas), sus líneas y el consecutivo por serie, con RLS por tenant. `invoices` admite además
 * la sesión de mantenimiento del job que retoma los cobros pendientes de todos los tenants.
 */
export class CreateInvoices1796200400000 implements MigrationInterface {
  readonly name = 'CreateInvoices1796200400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "invoices" (${BASE}, "number" character varying(32) NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "status" character varying(16) NOT NULL, "currency" character varying(3) NOT NULL, "total_minor" bigint NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "failed_attempts" integer NOT NULL, CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"), CONSTRAINT "invoices_status_check" CHECK ("status" IN ('draft', 'issued', 'paid', 'failed', 'void')))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invoices_tenant_number_key" ON "invoices" ("tenant_id", "number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "invoices_tenant_status_idx" ON "invoices" ("tenant_id", "status", "id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "invoice_lines" (${BASE}, "invoice_id" uuid NOT NULL, "position" integer NOT NULL, "kind" character varying(16) NOT NULL, "description" character varying(200) NOT NULL, "amount_minor" bigint NOT NULL, CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id"), CONSTRAINT "invoice_lines_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "invoice_lines_invoice_idx" ON "invoice_lines" ("tenant_id", "invoice_id", "position") `,
    );
    await queryRunner.query(
      `CREATE TABLE "invoice_sequences" (${BASE}, "series" character varying(8) NOT NULL, "last_number" integer NOT NULL, CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invoice_sequences_tenant_series_key" ON "invoice_sequences" ("tenant_id", "series") `,
    );
    for (const statement of auditTriggerSql('invoices')) {
      await queryRunner.query(statement);
    }
    for (const table of TABLES) {
      for (const statement of TenantIsolationSql.enable(table)) {
        await queryRunner.query(statement);
      }
    }
    for (const statement of TenantIsolationSql.allowMaintenance('invoices')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.disallowMaintenance(
      'invoices',
    )) {
      await queryRunner.query(statement);
    }
    for (const table of [...TABLES].reverse()) {
      for (const statement of TenantIsolationSql.disable(table)) {
        await queryRunner.query(statement);
      }
    }
    await queryRunner.query(dropAuditTriggerSql('invoices'));
    for (const table of [...TABLES].reverse()) {
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
  }
}
