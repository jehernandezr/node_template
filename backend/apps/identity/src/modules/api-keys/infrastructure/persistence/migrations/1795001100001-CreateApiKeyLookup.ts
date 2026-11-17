import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeyLookup1795001100001 implements MigrationInterface {
  readonly name = 'CreateApiKeyLookup1795001100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key_lookup" ("prefix" text NOT NULL, "tenant_id" uuid NOT NULL, "region" text NOT NULL, CONSTRAINT "api_key_lookup_pkey" PRIMARY KEY ("prefix"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "api_key_lookup"`);
  }
}
