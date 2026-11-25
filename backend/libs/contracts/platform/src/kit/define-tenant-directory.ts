import { TenantDirectoryLimits } from '../constants/tenant-directory.constants.js';
import { Compensation } from '../enums/compensation.enum.js';
import {
  TenantDirectoryAckSchema,
  TenantDirectoryEntrySchema,
  TenantDirectoryRefSchema,
} from '../schemas/tenant-directory.schema.js';
import {
  defineOperation,
  type OperationDefinition,
} from './define-operation.js';

/** Las dos operaciones del directorio de tenants de un servicio, con las claves que usa su contrato. */
export interface TenantDirectoryOperations {
  readonly tenantDirectoryPlace: OperationDefinition<
    typeof TenantDirectoryEntrySchema,
    typeof TenantDirectoryAckSchema
  >;
  readonly tenantDirectoryRemove: OperationDefinition<
    typeof TenantDirectoryRefSchema,
    typeof TenantDirectoryAckSchema
  >;
}

/**
 * Declara las operaciones `<servicio>.tenant-directory.{place,remove}.v1` que `@platform/tenant-move` registra en
 * cada servicio que sigue la ubicación que identity elige. Los ids se arman con el nombre del servicio y el enum
 * `<S>Operation` de cada contrato debe repetirlos.
 */
export function defineTenantDirectoryOperations(
  service: string,
): TenantDirectoryOperations {
  const id = (step: string) => `${service}.tenant-directory.${step}.v1`;
  return {
    tenantDirectoryPlace: defineOperation({
      id: id('place'),
      input: TenantDirectoryEntrySchema,
      output: TenantDirectoryAckSchema,
      idempotent: true,
      compensatedBy: id('remove'),
      timeoutMs: TenantDirectoryLimits.placeTimeoutMs,
      description: `Anota un tenant nuevo en el directorio de shards de ${service} con la región y los grupos que eligió identity; si ya está, lo deja como está.`,
    }),
    tenantDirectoryRemove: defineOperation({
      id: id('remove'),
      input: TenantDirectoryRefSchema,
      output: TenantDirectoryAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Solo corre como compensación del alta, antes de que el tenant tenga datos: no hay nada que restaurar.',
      timeoutMs: TenantDirectoryLimits.removeTimeoutMs,
      description: `Retira de ${service} la fila del directorio de un tenant cuya alta se deshace.`,
    }),
  };
}
