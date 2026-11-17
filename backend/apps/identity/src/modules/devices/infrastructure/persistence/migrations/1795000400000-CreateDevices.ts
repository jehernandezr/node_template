import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevices1795000400000 implements MigrationInterface {
  readonly name = 'CreateDevices1795000400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "devices" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "platform" character varying(16) NOT NULL, "public_key" text NOT NULL, "first_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_ip" character varying(64) NOT NULL, "trusted_until" TIMESTAMP WITH TIME ZONE, "verifier" boolean NOT NULL, "push_token" character varying(512), "removed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "devices_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "devices_user_idx" ON "devices" ("user_id", "last_seen_at")`,
    );
    for (const statement of auditTriggerSql('devices', {
      exclude: ['push_token'],
    })) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('devices'));
    await queryRunner.query(`DROP TABLE "devices"`);
  }
}
