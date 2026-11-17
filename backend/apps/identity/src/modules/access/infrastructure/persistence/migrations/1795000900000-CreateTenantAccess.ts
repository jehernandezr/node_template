import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const AUDITED = ['tenant_members', 'groups', 'roles', 'tenant_access_versions'];
const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

export class CreateTenantAccess1795000900000 implements MigrationInterface {
  readonly name = 'CreateTenantAccess1795000900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenant_members" (${BASE}, "user_id" uuid NOT NULL, "home_tenant_id" uuid NOT NULL, "group_ids" jsonb NOT NULL, "permission_version" integer NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "tenant_members_user_key" ON "tenant_members" ("tenant_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "groups" (${BASE}, "name" character varying(80) NOT NULL, "system_role" character varying(16), "role_ids" jsonb NOT NULL, CONSTRAINT "groups_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "groups_name_key" ON "groups" ("tenant_id", "name")`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" (${BASE}, "name" character varying(80) NOT NULL, "system_role" character varying(16), "permissions" jsonb NOT NULL, CONSTRAINT "roles_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "roles_name_key" ON "roles" ("tenant_id", "name")`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_access_versions" (${BASE}, "permission_version" integer NOT NULL, CONSTRAINT "tenant_access_versions_pkey" PRIMARY KEY ("id"))`,
    );
    for (const table of AUDITED) {
      for (const statement of auditTriggerSql(table)) {
        await queryRunner.query(statement);
      }
    }
    await queryRunner.query(
      `CREATE TABLE "user_tenants" ("user_id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("user_id", "tenant_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_role_assignments" ("user_id" uuid NOT NULL, "role" character varying(32) NOT NULL, CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("user_id", "role"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_role_assignments"`);
    await queryRunner.query(`DROP TABLE "user_tenants"`);
    for (const table of [...AUDITED].reverse()) {
      await queryRunner.query(dropAuditTriggerSql(table));
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
  }
}
