import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantMoveCheckpoints1794800001003 implements MigrationInterface {
  readonly name = 'CreateTenantMoveCheckpoints1794800001003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_move_checkpoints" ("move_id" text NOT NULL, "table_name" text NOT NULL, "reconciled_key" jsonb, "verified_rows" integer, "verified_checksum" text, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_2071787df85acd0eba6b5fe0e60" PRIMARY KEY ("move_id", "table_name"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_move_checkpoints"`);
  }
}
