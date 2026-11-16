import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema `saga` de la bitácora en cada shard: las tablas `instances` y
 * `step_log`, sus `CHECK` de estado, dirección y estado de paso, la llave
 * primaria de la bitácora y los tres índices parciales. Generado desde las
 * entidades con `createSchemaBuilder().log()` y revisado a mano: las
 * sentencias de `up` coinciden con el esquema que `saga-schema.int-spec.ts` verifica.
 */
export class CreateSagaSchema1795000000001 implements MigrationInterface {
  readonly name = 'CreateSagaSchema1795000000001';

  private static readonly UP: readonly string[] = [
    'CREATE SCHEMA IF NOT EXISTS "saga"',
    'CREATE TABLE "saga"."instances" ("id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "type" character varying(120) NOT NULL, "idempotency_key" character varying(200), "status" character varying(32) NOT NULL, "state" jsonb, "current_step" integer NOT NULL, "direction" character varying(16) NOT NULL, "version" integer NOT NULL, "lease_token" character varying(120), "lease_until" TIMESTAMP WITH TIME ZONE, "next_attempt_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL, "suspended_since" TIMESTAMP WITH TIME ZONE, "deadline_at" TIMESTAMP WITH TIME ZONE, "last_error_code" character varying(120), "last_error_detail" character varying(300), "context" jsonb, "input_digest" character varying(128) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "saga_instances_direction_check" CHECK ("direction" IN (\'forward\', \'compensate\')), CONSTRAINT "saga_instances_status_check" CHECK ("status" IN (\'running\', \'suspended\', \'compensating\', \'completed\', \'compensated\', \'compensation_failed\', \'requires_intervention\')), CONSTRAINT "PK_11862209053330b4765f7f54178" PRIMARY KEY ("id"))',
    'CREATE INDEX "saga_instances_purge_idx" ON "saga"."instances"  ("status", "updated_at") WHERE "status" IN (\'completed\', \'compensated\')',
    'CREATE INDEX "saga_instances_open_idx" ON "saga"."instances"  ("updated_at") WHERE "status" IN (\'running\', \'compensating\', \'suspended\')',
    'CREATE UNIQUE INDEX "saga_instances_tenant_key_uq" ON "saga"."instances"  ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL',
    'CREATE TABLE "saga"."step_log" ("saga_id" uuid NOT NULL, "step_index" integer NOT NULL, "direction" character varying(16) NOT NULL, "operation_id" character varying(200) NOT NULL, "status" character varying(16) NOT NULL, "idempotency_key" character varying(200) NOT NULL, "input" jsonb, "output" jsonb, "error_code" character varying(120), "traceparent" character varying(64), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "saga_step_log_status_check" CHECK ("status" IN (\'dispatched\', \'succeeded\', \'failed\', \'uncertain\')), CONSTRAINT "saga_step_log_direction_check" CHECK ("direction" IN (\'forward\', \'compensate\')), CONSTRAINT "PK_e7e41da7bc589ecd77421e51a16" PRIMARY KEY ("saga_id", "step_index", "direction"))',
  ];

  /** Inversas de `UP`: la bitácora antes que la instancia, y el esquema al final. */
  private static readonly DOWN: readonly string[] = [
    'DROP TABLE IF EXISTS "saga"."step_log"',
    'DROP TABLE IF EXISTS "saga"."instances"',
    'DROP SCHEMA IF EXISTS "saga"',
  ];

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of CreateSagaSchema1795000000001.UP) {
      await queryRunner.query(statement);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of CreateSagaSchema1795000000001.DOWN) {
      await queryRunner.query(statement);
    }
  }
}
