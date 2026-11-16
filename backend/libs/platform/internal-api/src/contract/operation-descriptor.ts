import type { OperationMetadata } from './operation-metadata.js';
import type { OperationSchemas } from './operation-schemas.js';

/** Operación resuelta desde su descriptor de `defineOperation`. */
export interface OperationDescriptor extends OperationSchemas {
  readonly id: string;
  readonly metadata: OperationMetadata;
}
