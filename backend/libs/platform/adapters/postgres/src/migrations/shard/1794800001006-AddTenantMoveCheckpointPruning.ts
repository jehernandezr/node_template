import type { MigrationInterface, QueryRunner } from 'typeorm';

/** How far a move pruned the target rows the frozen source no longer has, table by table. */
export class AddTenantMoveCheckpointPruning1794800001006 implements MigrationInterface {
  readonly name = 'AddTenantMoveCheckpointPruning1794800001006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_move_checkpoints" ADD "pruned_key" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_move_checkpoints" ADD "pruned" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_move_checkpoints" DROP COLUMN "pruned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_move_checkpoints" DROP COLUMN "pruned_key"`,
    );
  }
}
