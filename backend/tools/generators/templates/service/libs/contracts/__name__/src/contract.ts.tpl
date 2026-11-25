import {
  defineServiceContract,
  defineTenantDirectoryOperations,
  defineTenantMoveOperations,
} from '@contracts/platform';
import { __Name__Operation } from './enums/identifiers.enum.js';

/** Las operaciones de traslado de tenant de __name__, con su tipo exacto para registrarlas y llamarlas. */
export const __Name__TenantMoveOperations = defineTenantMoveOperations('__name__');

/** Las operaciones del directorio de tenants de __name__, con su tipo exacto para registrarlas y llamarlas. */
export const __Name__TenantDirectoryOperations =
  defineTenantDirectoryOperations('__name__');

/** Contrato del servicio __name__. Sus rutas, eventos y errores se agregan aquí con sus enums. */
export const __nameCamel__Contract = defineServiceContract({
  service: '__name__',
  description: 'Servicio __name__.',
  enums: { __Name__Operation },
  operations: {
    ...__Name__TenantMoveOperations,
    ...__Name__TenantDirectoryOperations,
  },
});
