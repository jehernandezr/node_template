import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResets1795000200001 implements MigrationInterface {
  readonly name = 'CreatePasswordResets1795000200001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_resets" ("id" uuid NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "password_resets_user_idx" ON "password_resets" ("user_id") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."password_resets_user_idx"`);
    await queryRunner.query(`DROP TABLE "password_resets"`);
  }
}
