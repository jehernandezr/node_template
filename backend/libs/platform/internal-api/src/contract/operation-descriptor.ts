import type { OperationMetadata } from './operation-metadata.js';
import type { OperationSchemas } from './operation-schemas.js';

/** Operation resolved from its `defineOperation` descriptor. */
export interface OperationDescriptor extends OperationSchemas {
  readonly id: string;
  readonly metadata: OperationMetadata;
}
