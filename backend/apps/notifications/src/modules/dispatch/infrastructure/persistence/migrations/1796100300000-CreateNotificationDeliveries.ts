import type { MigrationInterface, QueryRunner } from 'typeorm';

/** One delivery per notification and channel, in the user's shard. */
export class CreateNotificationDeliveries1796100300000 implements MigrationInterface {
  readonly name = 'CreateNotificationDeliveries1796100300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_deliveries" ("id" uuid NOT NULL, "notification_id" uuid NOT NULL, "user_id" uuid NOT NULL, "home_tenant_id" uuid NOT NULL, "channel" character varying(16) NOT NULL, "status" character varying(16) NOT NULL, "attempts" integer NOT NULL, "title" character varying(200) NOT NULL, "body" character varying(1000) NOT NULL, "locale" character varying(35) NOT NULL, "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL, "provider_id" character varying(128), "error" character varying(500), "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"), CONSTRAINT "notification_deliveries_status_check" CHECK ("status" IN ('pending', 'sent', 'failed', 'abandoned')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "notification_deliveries_notification_idx" ON "notification_deliveries" ("notification_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "notification_deliveries_retry_idx" ON "notification_deliveries" ("status", "next_attempt_at") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_deliveries"`);
  }
}
