import type { MigrationInterface, QueryRunner } from 'typeorm';

/** El tenant de cada mensaje procesado del shard, para que el traslado del tenant se lleve su idempotencia. */
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
