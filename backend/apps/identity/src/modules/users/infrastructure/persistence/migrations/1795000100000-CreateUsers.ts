import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1795000100000 implements MigrationInterface {
  readonly name = 'CreateUsers1795000100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "home_tenant_id" uuid NOT NULL, "email" character varying(254) NOT NULL, "email_fingerprint" bytea NOT NULL, "email_verified_at" TIMESTAMP WITH TIME ZONE, "status" character varying(32) NOT NULL, "display_name" character varying(120) NOT NULL, "locale" character varying(35) NOT NULL, "last_tenant_id" uuid, CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "users_email_fingerprint_key" ON "users" ("email_fingerprint")`,
    );
    for (const statement of auditTriggerSql('users')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('users'));
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
