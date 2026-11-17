import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantLookup1795000800001 implements MigrationInterface {
  readonly name = 'CreateTenantLookup1795000800001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_lookup" ("slug" text NOT NULL, "tenant_id" uuid NOT NULL, "region" text NOT NULL, CONSTRAINT "tenant_lookup_pkey" PRIMARY KEY ("slug"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "tenant_lookup_tenant_id_key" ON "tenant_lookup" ("tenant_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_lookup"`);
  }
}
