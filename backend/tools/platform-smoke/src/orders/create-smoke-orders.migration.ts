import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the orders table on each shard. Its columns are those of `AuditedEntity` plus its own. */
export class CreateSmokeOrdersMigration implements MigrationInterface {
  readonly name = 'CreateSmokeOrdersMigration1795100000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "smoke_orders" ("id" uuid NOT NULL, "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" varchar(64), "updated_by" varchar(64), "customer" varchar(120) NOT NULL, "status" varchar(32) NOT NULL, CONSTRAINT "PK_smoke_orders_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "smoke_orders_tenant_status_idx" ON "smoke_orders" ("tenant_id", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."smoke_orders_tenant_status_idx"`,
    );
    await queryRunner.query(`DROP TABLE "smoke_orders"`);
  }
}
