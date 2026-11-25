import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Each attempt carries its number within the invoice and when it was requested, and the number is unique: the attempt is
 * recorded before charging and that key prevents two runs from requesting the same charge. Existing rows are the first
 * attempt of their invoice, because until now each invoice was charged only once.
 */
export class ReservePaymentAttempts1796200500001 implements MigrationInterface {
  readonly name = 'ReservePaymentAttempts1796200500001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."payment_attempts_invoice_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" ADD "attempt" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" ALTER COLUMN "attempt" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" ADD "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "payment_attempts" SET "requested_at" = "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" ALTER COLUMN "requested_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "payment_attempts_invoice_attempt_key" ON "payment_attempts" ("tenant_id", "invoice_id", "attempt") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."payment_attempts_invoice_attempt_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" DROP COLUMN "requested_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempts" DROP COLUMN "attempt"`,
    );
    await queryRunner.query(
      `CREATE INDEX "payment_attempts_invoice_idx" ON "payment_attempts" ("tenant_id", "invoice_id") `,
    );
  }
}
