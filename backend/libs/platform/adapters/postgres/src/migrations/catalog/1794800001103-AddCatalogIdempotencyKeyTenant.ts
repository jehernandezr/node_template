import type { MigrationInterface, QueryRunner } from 'typeorm';

/** El tenant de cada llave de idempotencia del catálogo, con la misma forma que la tabla de los shards. */
export class AddCatalogIdempotencyKeyTenant1794800001103 implements MigrationInterface {
  readonly name = 'AddCatalogIdempotencyKeyTenant1794800001103';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "idempotency_keys" ADD "tenant_id" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "idempotency_keys_tenant_idx" ON "idempotency_keys" ("tenant_id") WHERE "tenant_id" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idempotency_keys_tenant_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idempotency_keys" DROP COLUMN "tenant_id"`,
    );
  }
}
