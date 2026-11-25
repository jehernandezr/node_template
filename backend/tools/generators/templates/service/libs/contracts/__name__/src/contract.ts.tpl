import {
  defineServiceContract,
  defineTenantDirectoryOperations,
  defineTenantMoveOperations,
} from '@contracts/platform';
import { __Name__Operation } from './enums/identifiers.enum.js';

/** The tenant move operations of __name__, with their exact type to register and call them. */
export const __Name__TenantMoveOperations = defineTenantMoveOperations('__name__');

/** The tenant directory operations of __name__, with their exact type to register and call them. */
export const __Name__TenantDirectoryOperations =
  defineTenantDirectoryOperations('__name__');

/** Contract of the __name__ service. Its routes, events and errors are added here with their enums. */
export const __nameCamel__Contract = defineServiceContract({
  service: '__name__',
  description: 'Servicio __name__.',
  enums: { __Name__Operation },
  operations: {
    ...__Name__TenantMoveOperations,
    ...__Name__TenantDirectoryOperations,
  },
});
