import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvitations1795001000000 implements MigrationInterface {
  readonly name = 'CreateInvitations1795001000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "created_by" character varying(64), "updated_by" character varying(64), "email" character varying(254) NOT NULL, "group_ids" jsonb NOT NULL, "invited_by" uuid NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(16) NOT NULL, CONSTRAINT "invitations_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations" ("token_hash")`,
    );
    for (const statement of auditTriggerSql('invitations', {
      exclude: ['token_hash'],
    })) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('invitations'));
    await queryRunner.query(`DROP TABLE "invitations"`);
  }
}
