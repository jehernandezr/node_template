import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantWriteFences1794800001002 implements MigrationInterface {
  readonly name = 'CreateTenantWriteFences1794800001002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_write_fences" ("tenant_id" text NOT NULL, "move_id" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "switched_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ad4891e621c0b655a90b36f26f9" PRIMARY KEY ("tenant_id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_write_fences"`);
  }
}
