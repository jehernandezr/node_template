import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `tenant_members.leaving_since` records the departure the deletion of an account reserved, so a concurrent
 * deletion of another owner sees that this owner is leaving.
 */
export class RecordMemberDepartures1795000900003 implements MigrationInterface {
  readonly name = 'RecordMemberDepartures1795000900003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_members" ADD "leaving_since" TIMESTAMP WITH TIME ZONE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_members" DROP COLUMN "leaving_since"`,
    );
  }
}
