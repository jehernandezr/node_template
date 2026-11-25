import type { OperationDescriptor } from './operation-descriptor.js';
import type { OperationMetadata } from './operation-metadata.js';
import type { OperationSchemas } from './operation-schemas.js';

/** Registered operation with its metadata and schemas. */
export interface RegisteredContract {
  readonly id: string;
  readonly metadata: OperationMetadata;
  /** Input and output schemas. */
  readonly contract: OperationSchemas;
  readonly descriptor: OperationDescriptor;
}
