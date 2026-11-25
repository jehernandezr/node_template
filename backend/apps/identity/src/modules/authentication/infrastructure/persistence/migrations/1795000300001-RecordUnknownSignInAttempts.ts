import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `login_attempts.user_id` becomes optional: a failed sign-in with an email without an account is recorded too,
 * so the failure costs the same as one with an existing account.
 */
export class RecordUnknownSignInAttempts1795000300001 implements MigrationInterface {
  readonly name = 'RecordUnknownSignInAttempts1795000300001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "login_attempts" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "login_attempts" WHERE "user_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "login_attempts" ALTER COLUMN "user_id" SET NOT NULL`,
    );
  }
}
