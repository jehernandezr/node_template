import { TenantIsolationSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

/** `payment_attempts` con RLS por tenant. */
export class CreatePaymentAttempts1796200500000 implements MigrationInterface {
  readonly name = 'CreatePaymentAttempts1796200500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_attempts" (${BASE}, "invoice_id" uuid NOT NULL, "status" character varying(16) NOT NULL, "reference" character varying(120), "reason" character varying(200), CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "payment_attempts_invoice_idx" ON "payment_attempts" ("tenant_id", "invoice_id") `,
    );
    for (const statement of TenantIsolationSql.enable('payment_attempts')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of TenantIsolationSql.disable('payment_attempts')) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE "payment_attempts"`);
  }
}
