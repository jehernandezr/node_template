import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The tenant of each processed message in the shard, so the tenant move takes its idempotency along. */
export class AddProcessedMessageTenant1794800001005 implements MigrationInterface {
  readonly name = 'AddProcessedMessageTenant1794800001005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "processed_messages" ADD "tenant_id" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "processed_messages_tenant_idx" ON "processed_messages" ("tenant_id") WHERE "tenant_id" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."processed_messages_tenant_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_messages" DROP COLUMN "tenant_id"`,
    );
  }
}
