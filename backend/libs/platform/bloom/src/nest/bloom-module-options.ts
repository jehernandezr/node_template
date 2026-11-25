import type { ModuleMetadata, Type } from '@nestjs/common';
import type { BloomFilterDefinition } from '../bloom-filter-definition.js';
import type { BloomFilterFactory } from '../bloom-filter-factory.js';
import type { BloomRebuildSourceProvider } from '../bloom-rebuild-source-provider.js';
import type { Abstract } from '@nestjs/common';

/** Options of `BloomModule.forRoot`. */
export interface BloomModuleOptions {
  /** Maximum bits per partition. A larger filter is split into partitions. Defaults to `BloomSizing.MAX_BITS`. */
  readonly maxPartitionBits?: number;
}

/** Extras of `BloomModule.forRoot`: resolved by injection, they are not plain options. */
export interface BloomModuleExtras {
  /** `false` to import the module in each module that uses it. Global by default. */
  isGlobal?: boolean;
  /** Filter factory. Defaults to the one that creates in-memory filters. */
  factory?: Type<BloomFilterFactory> | Abstract<BloomFilterFactory>;
}

/** Options of `BloomModule.forFeature`: a filter's definition and its source of truth. */
export interface BloomFeatureOptions {
  readonly definition: BloomFilterDefinition;
  /** Concrete class that provides the source of truth. `forFeature` itself registers it. */
  readonly source: Type<BloomRebuildSourceProvider>;
  /** Modules that provide the dependencies of `source`. */
  readonly imports?: ModuleMetadata['imports'];
}
