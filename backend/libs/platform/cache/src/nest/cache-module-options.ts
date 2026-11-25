import type { Abstract, ModuleMetadata, Type } from '@nestjs/common';
import type { MetricsPort } from '@platform/observability';
import type { CachePort } from '../cache-port.js';

/** Options of `CacheModule.forRoot`. */
export interface CacheModuleOptions {
  /** Maximum length of a deduplication key. Defaults to `SingleFlight.DEFAULT_MAX_KEY_LENGTH`. */
  readonly singleFlightMaxKeyLength?: number;
}

/** Extras of `CacheModule.forRoot`: resolved by injection, they are not plain options. */
export interface CacheModuleExtras {
  /** `false` to import the module in each module that uses it. Global by default. */
  isGlobal?: boolean;
  /** `CachePort` implementation. Defaults to `InMemoryCache`. */
  store?: Type<CachePort> | Abstract<CachePort>;
  /** Cache metrics port. Without it, absorbed failures are not counted. */
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
}

/** Options of `CacheModule.forFeature`. */
export interface CacheFeatureOptions {
  /** Namespace of the `CacheAside`. It goes into the version key and cannot contain ':'. */
  readonly namespace: string;
  /** Additional modules the feature module needs. */
  readonly imports?: ModuleMetadata['imports'];
}
