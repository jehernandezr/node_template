import type { Clock } from '@platform/kernel';

/** Opciones de {@link InMemoryRateLimiter}. */
export interface InMemoryRateLimiterOptions {
  /** Fuente de tiempo. En pruebas, `FixedClock` de `@platform/kernel/test-utils`. */
  readonly clock?: Clock;
  /**
   * Llaves que guarda como máximo. Al pasarse olvida la usada hace más tiempo,
   * que vuelve a empezar de cero: así una ráfaga de llaves distintas no agota
   * la memoria del proceso. Por defecto {@link InMemoryRateLimiter.DEFAULT_MAX_ENTRIES}.
   */
  readonly maxEntries?: number;
}
