import type { ModuleMetadata, Type } from '@nestjs/common';
import type { BloomFilterDefinition } from '../bloom-filter-definition.js';
import type { BloomFilterFactory } from '../bloom-filter-factory.js';
import type { BloomRebuildSourceProvider } from '../bloom-rebuild-source-provider.js';
import type { Abstract } from '@nestjs/common';

/** Opciones de `BloomModule.forRoot`. */
export interface BloomModuleOptions {
  /** Bits máximos por partición. Un filtro más grande se reparte en particiones. Por defecto `BloomSizing.MAX_BITS`. */
  readonly maxPartitionBits?: number;
}

/** Extras de `BloomModule.forRoot`: se resuelven por inyección, no son opciones planas. */
export interface BloomModuleExtras {
  /** `false` para importar el módulo en cada módulo que lo use. Por defecto, global. */
  isGlobal?: boolean;
  /** Fábrica de filtros. Por defecto, la que crea filtros en memoria. */
  factory?: Type<BloomFilterFactory> | Abstract<BloomFilterFactory>;
}

/** Opciones de `BloomModule.forFeature`: la definición de un filtro y su fuente de verdad. */
export interface BloomFeatureOptions {
  readonly definition: BloomFilterDefinition;
  /** Clase concreta que entrega la fuente de verdad. El propio `forFeature` la registra. */
  readonly source: Type<BloomRebuildSourceProvider>;
  /** Módulos que aporten las dependencias de `source`. */
  readonly imports?: ModuleMetadata['imports'];
}
