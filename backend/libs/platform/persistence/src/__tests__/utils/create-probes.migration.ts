import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  auditTriggerSqlFor,
  dropAuditTriggerSql,
} from '../../migrations/schema-helpers.js';
import { ProbeEntity } from './probe.entity.js';

/** Crea la tabla `probes` con su índice y el trigger de auditoría, como lo haría una migración generada. */
export class CreateProbes1794700000001 implements MigrationInterface {
  readonly name = 'CreateProbes1794700000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "probes" (
  "id" uuid NOT NULL,
  "version" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "tenant_id" uuid NOT NULL,
  "created_by" character varying(64),
  "updated_by" character varying(64),
  "name" character varying(120) NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_probes_id" PRIMARY KEY ("id")
)`);
    await queryRunner.query(
      'CREATE INDEX "probes_tenant_name_idx" ON "probes" ("tenant_id", "name")',
    );
    for (const statement of auditTriggerSqlFor(ProbeEntity, 'probes')) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropAuditTriggerSql('probes'));
    await queryRunner.query('DROP TABLE "probes"');
  }
}
