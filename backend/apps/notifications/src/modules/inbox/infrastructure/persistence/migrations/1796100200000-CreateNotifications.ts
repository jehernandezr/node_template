import type { MigrationInterface, QueryRunner } from 'typeorm';

/** La bandeja, en el shard del usuario. */
export class CreateNotifications1796100200000 implements MigrationInterface {
  readonly name = 'CreateNotifications1796100200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL, "version" integer NOT NULL DEFAULT 1, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "title" character varying(200) NOT NULL, "body" character varying(1000) NOT NULL, "locale" character varying(35) NOT NULL, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id", "id") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
