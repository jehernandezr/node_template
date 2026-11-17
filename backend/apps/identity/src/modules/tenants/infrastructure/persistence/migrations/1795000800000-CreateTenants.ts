import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1795000800000 implements MigrationInterface {
  readonly name = 'CreateTenants1795000800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64), "slug" character varying(63) NOT NULL, "name" character varying(120) NOT NULL, "region" character varying(32) NOT NULL, "kind" character varying(32) NOT NULL, "status" character varying(32) NOT NULL, "pinned_api_version" character varying(16), CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"))`,
    );
    for (const statement of auditTriggerSql('tenants')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('tenants'));
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
