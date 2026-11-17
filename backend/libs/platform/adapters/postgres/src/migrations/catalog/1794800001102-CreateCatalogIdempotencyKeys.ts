import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogIdempotencyKeys1794800001102 implements MigrationInterface {
  readonly name = 'CreateCatalogIdempotencyKeys1794800001102';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("key" text NOT NULL, "state" text NOT NULL, "fingerprint" text NOT NULL, "claim_token" text, "lease_until" TIMESTAMP WITH TIME ZONE, "attempt" integer NOT NULL, "result" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "idempotency_keys_state_check" CHECK ("state" IN ('acquired', 'in-progress', 'completed')), CONSTRAINT "PK_0afd83cbf08c9d12089a9bffc5e" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idempotency_keys_updated_idx" ON "idempotency_keys"  ("state", "updated_at") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idempotency_keys_updated_idx"`,
    );
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
