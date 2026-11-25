import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The tenant of each idempotency key in the catalog, with the same shape as the shard table. */
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
