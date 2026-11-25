import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `next_collection_at`: cuándo toca cobrar cada factura, al emitirla y después de cada rechazo según el calendario de
 * reintentos. Las emitidas que ya existían se cobran en la próxima corrida; las fallidas no tenían reintento.
 */
export class ScheduleInvoiceCollection1796200400001 implements MigrationInterface {
  readonly name = 'ScheduleInvoiceCollection1796200400001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "next_collection_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "invoices" SET "next_collection_at" = "issued_at" WHERE "status" = 'issued'`,
    );
    await queryRunner.query(
      `CREATE INDEX "invoices_collection_idx" ON "invoices" ("next_collection_at") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."invoices_collection_idx"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "next_collection_at"`,
    );
  }
}
