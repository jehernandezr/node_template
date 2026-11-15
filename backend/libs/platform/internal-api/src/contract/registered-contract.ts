import type { OperationDescriptor } from './operation-descriptor.js';
import type { OperationMetadata } from './operation-metadata.js';
import type { OperationSchemas } from './operation-schemas.js';

/** Operación registrada con sus metadatos y esquemas. */
export interface RegisteredContract {
  readonly id: string;
  readonly metadata: OperationMetadata;
  /** Esquemas de entrada y salida. */
  readonly contract: OperationSchemas;
  readonly descriptor: OperationDescriptor;
}
