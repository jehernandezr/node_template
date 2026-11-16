import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformShardTables1794800001001 implements MigrationInterface {
  readonly name = 'CreatePlatformShardTables1794800001001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("key" text NOT NULL, "state" text NOT NULL, "fingerprint" text NOT NULL, "claim_token" text, "lease_until" TIMESTAMP WITH TIME ZONE, "attempt" integer NOT NULL, "result" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "idempotency_keys_state_check" CHECK ("state" IN ('acquired', 'in-progress', 'completed')), CONSTRAINT "PK_0afd83cbf08c9d12089a9bffc5e" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idempotency_keys_updated_idx" ON "idempotency_keys"  ("state", "updated_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox" ("id" text NOT NULL, "seq" BIGSERIAL NOT NULL, "envelope" jsonb NOT NULL, "status" text NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "group_id" text, "delay_ms" integer, "last_error" text, "lease_owner" text, "lease_token" text, "lease_expires_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "outbox_status_check" CHECK ("status" IN ('pending', 'published', 'failed', 'dead')), CONSTRAINT "PK_340ab539f309f03bdaa14aa7649" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "outbox_retention_idx" ON "outbox"  ("status", "updated_at") WHERE "status" IN ('published', 'dead')`,
    );
    await queryRunner.query(
      `CREATE INDEX "outbox_group_idx" ON "outbox"  ("group_id", "created_at", "seq") WHERE "status" IN ('pending', 'failed') AND "group_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "outbox_due_idx" ON "outbox"  ("next_attempt_at") WHERE "status" IN ('pending', 'failed')`,
    );
    await queryRunner.query(
      `CREATE INDEX "outbox_open_idx" ON "outbox"  ("created_at", "seq") WHERE "status" IN ('pending', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "processed_messages" ("key" text NOT NULL, "state" text NOT NULL, "fingerprint" text NOT NULL, "claim_token" text, "lease_until" TIMESTAMP WITH TIME ZONE, "attempt" integer NOT NULL, "result" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "processed_messages_state_check" CHECK ("state" IN ('acquired', 'in-progress', 'completed')), CONSTRAINT "PK_8d139f0f1f039015d3f7844731b" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "processed_messages_updated_idx" ON "processed_messages"  ("state", "updated_at") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."processed_messages_updated_idx"`,
    );
    await queryRunner.query(`DROP TABLE "processed_messages"`);
    await queryRunner.query(`DROP INDEX "public"."outbox_open_idx"`);
    await queryRunner.query(`DROP INDEX "public"."outbox_due_idx"`);
    await queryRunner.query(`DROP INDEX "public"."outbox_group_idx"`);
    await queryRunner.query(`DROP INDEX "public"."outbox_retention_idx"`);
    await queryRunner.query(`DROP TABLE "outbox"`);
    await queryRunner.query(
      `DROP INDEX "public"."idempotency_keys_updated_idx"`,
    );
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
