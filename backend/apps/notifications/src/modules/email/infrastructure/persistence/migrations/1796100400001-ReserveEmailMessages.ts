import type { MigrationInterface, QueryRunner } from 'typeorm';

/** `sending`: el correo se reserva antes de entregarlo al proveedor, así un reintento no lo envía dos veces. */
export class ReserveEmailMessages1796100400001 implements MigrationInterface {
  readonly name = 'ReserveEmailMessages1796100400001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_messages" DROP CONSTRAINT "email_messages_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_status_check" CHECK ("status" IN ('sending', 'sent', 'failed'))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "email_messages" SET "status" = 'failed' WHERE "status" = 'sending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_messages" DROP CONSTRAINT "email_messages_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_status_check" CHECK ("status" IN ('sent', 'failed'))`,
    );
  }
}
