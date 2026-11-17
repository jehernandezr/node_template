import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordCredentials1795000200000 implements MigrationInterface {
  readonly name = 'CreatePasswordCredentials1795000200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_credentials" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "hash" text NOT NULL, "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("id"))`,
    );
    for (const statement of auditTriggerSql('password_credentials', {
      exclude: ['hash'],
    })) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('password_credentials'));
    await queryRunner.query(`DROP TABLE "password_credentials"`);
  }
}
