import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cada intento lleva su número dentro de la factura y cuándo se pidió, y el número es único: el intento se anota antes
 * de cobrar y esa llave impide que dos corridas pidan el mismo cobro. Las filas que ya existían son el primer intento
 * de su factura, porque hasta ahora se cobraba una sola vez.
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
