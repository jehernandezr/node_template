import { Compensation } from '../enums/compensation.enum.js';
import { TenantMoveLimits } from '../constants/tenant-move.constants.js';
import {
  TenantMoveAckSchema,
  TenantMoveProgressSchema,
  TenantMoveRefSchema,
  TenantMoveVerificationSchema,
} from '../schemas/tenant-move.schema.js';
import {
  defineOperation,
  type OperationDefinition,
} from './define-operation.js';

/** Las cinco operaciones de traslado de un servicio, con las claves que usa su contrato. */
export interface TenantMoveOperations {
  readonly tenantMoveSync: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveProgressSchema
  >;
  readonly tenantMoveFinalize: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveVerificationSchema
  >;
  readonly tenantMoveAbort: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
  readonly tenantMoveSwitch: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
  readonly tenantMoveCleanup: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
}

/**
 * Declara las operaciones `<servicio>.tenant-move.{sync,finalize,abort,switch,cleanup}.v1`
 * que `@platform/tenant-move` registra en cada servicio. Los ids se arman con el
 * nombre del servicio y el enum `<S>Operation` de cada contrato debe repetirlos.
 */
export function defineTenantMoveOperations(
  service: string,
): TenantMoveOperations {
  const id = (step: string) => `${service}.tenant-move.${step}.v1`;
  const tenantMoveAbort = defineOperation({
    id: id('abort'),
    input: TenantMoveRefSchema,
    output: TenantMoveAckSchema,
    idempotent: true,
    compensatedBy: Compensation.None,
    compensationReason:
      'Solo corre como compensación de la copia: descarta lo copiado al destino y no hay nada que restaurar.',
    timeoutMs: TenantMoveLimits.abortTimeoutMs,
    description: `Cancela el traslado de un tenant y descarta lo copiado de ${service} al destino.`,
  });
  return {
    tenantMoveSync: defineOperation({
      id: id('sync'),
      input: TenantMoveRefSchema,
      output: TenantMoveProgressSchema,
      idempotent: true,
      compensatedBy: id('abort'),
      timeoutMs: TenantMoveLimits.syncTimeoutMs,
      description: `Copia un lote de los datos del tenant en ${service} al destino mientras las escrituras siguen; la saga repite hasta completar la ronda.`,
    }),
    tenantMoveFinalize: defineOperation({
      id: id('finalize'),
      input: TenantMoveRefSchema,
      output: TenantMoveVerificationSchema,
      idempotent: true,
      compensatedBy: id('abort'),
      timeoutMs: TenantMoveLimits.finalizeTimeoutMs,
      description: `Copia la última ronda de ${service} con el tenant congelado y verifica conteos y sumas.`,
    }),
    tenantMoveAbort,
    tenantMoveSwitch: defineOperation({
      id: id('switch'),
      input: TenantMoveRefSchema,
      output: TenantMoveAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Corre después del pivote: el tenant ya vive en el destino y se reintenta hasta completarse.',
      timeoutMs: TenantMoveLimits.switchTimeoutMs,
      description: `Apunta ${service} al destino del tenant trasladado y vuelve a abrir sus escrituras.`,
    }),
    tenantMoveCleanup: defineOperation({
      id: id('cleanup'),
      input: TenantMoveRefSchema,
      output: TenantMoveAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Borra del origen los datos ya trasladados una vez vencida la gracia: no se restauran.',
      timeoutMs: TenantMoveLimits.cleanupTimeoutMs,
      description: `Borra de ${service} los datos del tenant trasladado cuando pasa el periodo de gracia.`,
    }),
  };
}
