import {
  auditTriggerSql,
  dropAuditTriggerSql,
  TenantIsolationSql,
} from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

/** `tasks` con su auditoría, RLS por tenant y la política de mantenimiento de las purgas y borrados de usuario. */
export class CreateTasks1796000100000 implements MigrationInterface {
  readonly name = 'CreateTasks1796000100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tasks" (${BASE}, "title" character varying(200) NOT NULL, "description" text NOT NULL, "status" character varying(16) NOT NULL, "created_by_home_tenant_id" uuid NOT NULL, CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"), CONSTRAINT "tasks_status_check" CHECK ("status" IN ('open', 'in_progress', 'done')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "tasks_tenant_status_idx" ON "tasks" ("tenant_id", "status", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "tasks_tenant_updated_idx" ON "tasks" ("tenant_id", "updated_at", "id") `,
    );
    for (const statement of [
      ...auditTriggerSql('tasks'),
      ...TenantIsolationSql.enable('tasks'),
      ...TenantIsolationSql.allowMaintenance('tasks'),
    ]) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of [
      ...TenantIsolationSql.disallowMaintenance('tasks'),
      ...TenantIsolationSql.disable('tasks'),
    ]) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(dropAuditTriggerSql('tasks'));
    await queryRunner.query(`DROP TABLE "tasks"`);
  }
}
