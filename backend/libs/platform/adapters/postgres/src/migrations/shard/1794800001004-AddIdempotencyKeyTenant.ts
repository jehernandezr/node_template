import type { MigrationInterface, QueryRunner } from 'typeorm';

/** El tenant de cada llave de idempotencia del shard, para que el traslado del tenant se lleve sus llaves. */
export class AddIdempotencyKeyTenant1794800001004 implements MigrationInterface {
  readonly name = 'AddIdempotencyKeyTenant1794800001004';

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
