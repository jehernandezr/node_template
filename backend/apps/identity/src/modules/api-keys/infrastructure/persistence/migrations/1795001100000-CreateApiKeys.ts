import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64)';

export class CreateApiKeys1795001100000 implements MigrationInterface {
  readonly name = 'CreateApiKeys1795001100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "service_accounts" (${BASE}, "name" character varying(120) NOT NULL, "permissions" jsonb NOT NULL, "status" character varying(16) NOT NULL, "pinned_api_version" character varying(16), CONSTRAINT "service_accounts_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" (${BASE}, "service_account_id" uuid NOT NULL, "prefix" character varying(16) NOT NULL, "secret_hmac" text NOT NULL, "environment" character varying(8) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "allowed_cidrs" jsonb NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, "status" character varying(16) NOT NULL, "valid_until" TIMESTAMP WITH TIME ZONE, CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys" ("prefix")`,
    );
    await queryRunner.query(
      `CREATE INDEX "api_keys_service_account_idx" ON "api_keys" ("tenant_id", "service_account_id")`,
    );
    for (const statement of auditTriggerSql('service_accounts')) {
      await queryRunner.query(statement);
    }
    for (const statement of auditTriggerSql('api_keys', {
      exclude: ['secret_hmac'],
    })) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('api_keys'));
    await queryRunner.query(dropAuditTriggerSql('service_accounts'));
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "service_accounts"`);
  }
}
