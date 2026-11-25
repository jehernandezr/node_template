import type { ResourceOptions } from '../endpoint-options.js';

/** Metadata that `@Resource` stores on the controller class. */
export interface ResourceMetadata {
  readonly name: string;
  readonly options: ResourceOptions;
}
