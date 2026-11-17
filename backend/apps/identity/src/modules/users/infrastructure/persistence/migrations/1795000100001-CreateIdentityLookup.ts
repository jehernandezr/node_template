import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityLookup1795000100001 implements MigrationInterface {
  readonly name = 'CreateIdentityLookup1795000100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "identity_lookup" ("email_fingerprint" bytea NOT NULL, "user_id" uuid NOT NULL, "home_tenant_id" uuid NOT NULL, "region" text NOT NULL, "status" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "identity_lookup_pkey" PRIMARY KEY ("email_fingerprint"), CONSTRAINT "identity_lookup_status_check" CHECK ("status" IN ('reserved', 'active')))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "identity_lookup_user_id_key" ON "identity_lookup" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "identity_lookup_reserved_idx" ON "identity_lookup" ("created_at") WHERE "status" = 'reserved'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "identity_lookup"`);
  }
}
