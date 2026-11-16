import type { ResourceOptions } from '../endpoint-options.js';

/** Metadato que `@Resource` guarda en la clase del controller. */
export interface ResourceMetadata {
  readonly name: string;
  readonly options: ResourceOptions;
}
