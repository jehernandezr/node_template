import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasskeys1795000600000 implements MigrationInterface {
  readonly name = 'CreatePasskeys1795000600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "passkeys" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "credential_id" text NOT NULL, "public_key" text NOT NULL, "sign_count" bigint NOT NULL, "transports" jsonb NOT NULL, "aaguid" character varying(64) NOT NULL, "backed_up" boolean NOT NULL, "name" character varying(120) NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "passkeys_credential_key" ON "passkeys" ("user_id", "credential_id")`,
    );
    for (const statement of auditTriggerSql('passkeys')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('passkeys'));
    await queryRunner.query(`DROP TABLE "passkeys"`);
  }
}
