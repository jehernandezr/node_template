import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessions1795000700000 implements MigrationInterface {
  readonly name = 'CreateSessions1795000700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "home_tenant_id" uuid NOT NULL, "active_tenant_id" uuid NOT NULL, "device_id" uuid, "device_name" character varying(120) NOT NULL, "platform" character varying(16) NOT NULL, "token_salt" text NOT NULL, "generation" integer NOT NULL, "previous_generation_until" TIMESTAMP WITH TIME ZONE, "amr" jsonb NOT NULL, "auth_time" TIMESTAMP WITH TIME ZONE NOT NULL, "mfa_verified_at" TIMESTAMP WITH TIME ZONE, "idle_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "absolute_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_refresh_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ip" character varying(64) NOT NULL, "user_agent" character varying(512), "revoked_at" TIMESTAMP WITH TIME ZONE, "revocation_reason" character varying(32), CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "sessions_user_active_idx" ON "sessions" ("user_id", "last_refresh_at") WHERE "revoked_at" IS NULL`,
    );
    for (const statement of auditTriggerSql('sessions', {
      exclude: ['token_salt'],
    })) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('sessions'));
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
