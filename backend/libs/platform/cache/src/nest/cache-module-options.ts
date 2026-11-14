import type { Abstract, ModuleMetadata, Type } from '@nestjs/common';
import type { MetricsPort } from '@platform/observability';
import type { CachePort } from '../cache-port.js';

/** Opciones de `CacheModule.forRoot`. */
export interface CacheModuleOptions {
  /** Largo máximo de una llave de deduplicación. Por defecto `SingleFlight.DEFAULT_MAX_KEY_LENGTH`. */
  readonly singleFlightMaxKeyLength?: number;
}

/** Extras de `CacheModule.forRoot`: se resuelven por inyección, no son opciones planas. */
export interface CacheModuleExtras {
  /** `false` para importar el módulo en cada módulo que lo use. Por defecto, global. */
  isGlobal?: boolean;
  /** Implementación de `CachePort`. Por defecto `InMemoryCache`. */
  store?: Type<CachePort> | Abstract<CachePort>;
  /** Puerto de métricas del caché. Sin él, las fallas absorbidas no se cuentan. */
  metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
}

/** Opciones de `CacheModule.forFeature`. */
export interface CacheFeatureOptions {
  /** Espacio de nombres del `CacheAside`. Entra en la llave de versión y no puede contener ':'. */
  readonly namespace: string;
  /** Módulos adicionales que el módulo de característica necesite. */
  readonly imports?: ModuleMetadata['imports'];
}
