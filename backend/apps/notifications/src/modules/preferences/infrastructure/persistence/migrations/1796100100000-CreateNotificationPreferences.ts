import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Una fila de preferencias por usuario, en su shard. */
export class CreateNotificationPreferences1796100100000 implements MigrationInterface {
  readonly name = 'CreateNotificationPreferences1796100100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("id" uuid NOT NULL, "version" integer NOT NULL DEFAULT 1, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "enabled" jsonb NOT NULL, "quiet_start" character varying(5) NOT NULL, "quiet_end" character varying(5) NOT NULL, "timezone" character varying(64) NOT NULL, CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "notification_preferences_user_key" ON "notification_preferences" ("user_id") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
  }
}
