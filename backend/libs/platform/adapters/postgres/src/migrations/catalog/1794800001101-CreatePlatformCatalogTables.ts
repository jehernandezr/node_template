import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformCatalogTables1794800001101 implements MigrationInterface {
  readonly name = 'CreatePlatformCatalogTables1794800001101';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shard_directory" ("tenant_id" text NOT NULL, "region" text NOT NULL, "shard_group" text array NOT NULL, "status" text NOT NULL, "version" bigint NOT NULL, "dedicated" boolean NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "shard_directory_version_check" CHECK ("version" >= 0), CONSTRAINT "shard_directory_group_check" CHECK ("shard_group" <> '{}'), CONSTRAINT "PK_b3874a7fd018a454bee073c9413" PRIMARY KEY ("tenant_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shard_instances" ("logical_shard" text NOT NULL, "instance" text NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_a77751b47d1ee06f9bb73c210bc" PRIMARY KEY ("logical_shard"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shard_locks" ("logical_shard" text NOT NULL, CONSTRAINT "PK_6b1e5d09f5acc8e1f090ad94469" PRIMARY KEY ("logical_shard"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shard_locks"`);
    await queryRunner.query(`DROP TABLE "shard_instances"`);
    await queryRunner.query(`DROP TABLE "shard_directory"`);
  }
}
