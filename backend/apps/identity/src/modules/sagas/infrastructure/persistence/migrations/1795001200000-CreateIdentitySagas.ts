import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Directorio de sagas de identity en el catálogo. */
export class CreateIdentitySagas1795001200000 implements MigrationInterface {
  readonly name = 'CreateIdentitySagas1795001200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "identity_sagas" ("saga_id" uuid NOT NULL, "saga" character varying(64) NOT NULL, "tenant_id" uuid NOT NULL, "requested_by" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "identity_sagas_pkey" PRIMARY KEY ("saga_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "identity_sagas_requested_by_idx" ON "identity_sagas" ("requested_by") `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "identity_sagas"`);
  }
}
