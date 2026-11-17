import { auditTriggerSql, dropAuditTriggerSql } from '@platform/persistence';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const BASE =
  '"id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE';

export class CreateMfaFactors1795000500000 implements MigrationInterface {
  readonly name = 'CreateMfaFactors1795000500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "totp_factors" (${BASE}, "encrypted_secret" text NOT NULL, "confirmed_at" TIMESTAMP WITH TIME ZONE, "last_used_step" bigint NOT NULL, CONSTRAINT "totp_factors_pkey" PRIMARY KEY ("id"))`,
    );
    for (const statement of auditTriggerSql('totp_factors', {
      exclude: ['encrypted_secret'],
    })) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(
      `CREATE TABLE "recovery_codes" (${BASE}, "user_id" uuid NOT NULL, "code_hash" text NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "recovery_codes_user_idx" ON "recovery_codes" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "mfa_recoveries" (${BASE}, "user_id" uuid NOT NULL, "token_hash" text NOT NULL, "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL, "available_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(16) NOT NULL, CONSTRAINT "mfa_recoveries_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "mfa_recoveries_user_idx" ON "mfa_recoveries" ("user_id", "requested_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mfa_recoveries"`);
    await queryRunner.query(`DROP TABLE "recovery_codes"`);
    await queryRunner.query(dropAuditTriggerSql('totp_factors'));
    await queryRunner.query(`DROP TABLE "totp_factors"`);
  }
}
