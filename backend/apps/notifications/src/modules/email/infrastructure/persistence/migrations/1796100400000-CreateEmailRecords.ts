import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Email log and suppression list, in the catalog. */
export class CreateEmailRecords1796100400000 implements MigrationInterface {
  readonly name = 'CreateEmailRecords1796100400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_messages" ("message_id" uuid NOT NULL, "template" character varying(64) NOT NULL, "template_version" integer NOT NULL, "recipient_hash" character varying(64) NOT NULL, "status" character varying(16) NOT NULL, "provider_id" character varying(128), "trace_id" character varying(64), "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "email_messages_pkey" PRIMARY KEY ("message_id"), CONSTRAINT "email_messages_status_check" CHECK ("status" IN ('sent', 'failed')))`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_suppressions" ("recipient_hash" character varying(64) NOT NULL, "reason" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("recipient_hash"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_suppressions"`);
    await queryRunner.query(`DROP TABLE "email_messages"`);
  }
}
