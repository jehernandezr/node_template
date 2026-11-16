import type { Clock } from '@platform/kernel';

/** Opciones de `InMemoryCache`. */
export interface InMemoryCacheOptions {
  /** Fuente de tiempo para los vencimientos. En pruebas, `FixedClock` de `@platform/kernel/test-utils`. */
  readonly clock?: Clock;
}
