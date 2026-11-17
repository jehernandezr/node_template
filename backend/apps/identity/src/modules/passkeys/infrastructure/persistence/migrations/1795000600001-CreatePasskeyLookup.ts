import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasskeyLookup1795000600001 implements MigrationInterface {
  readonly name = 'CreatePasskeyLookup1795000600001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "passkey_lookup" ("credential_id_hash" bytea NOT NULL, "user_id" uuid NOT NULL, "home_tenant_id" uuid NOT NULL, "region" text NOT NULL, CONSTRAINT "passkey_lookup_pkey" PRIMARY KEY ("credential_id_hash"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "passkey_lookup"`);
  }
}
