import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Tenant move log in the catalog, with at most one move in progress per tenant. */
export class CreateTenantMoves1795001300000 implements MigrationInterface {
  readonly name = 'CreateTenantMoves1795001300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_moves" ("move_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "target_group" character varying(64) NOT NULL, "target_region" character varying(64) NOT NULL, "saga_id" uuid NOT NULL, "status" character varying(16) NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "switched_at" TIMESTAMP WITH TIME ZONE, "cleanup_attempted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "tenant_moves_pkey" PRIMARY KEY ("move_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "tenant_moves_one_running_key" ON "tenant_moves" ("tenant_id") WHERE "status" = 'running'`,
    );
    await queryRunner.query(
      `CREATE INDEX "tenant_moves_switched_idx" ON "tenant_moves" ("status", "switched_at") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_moves"`);
  }
}
