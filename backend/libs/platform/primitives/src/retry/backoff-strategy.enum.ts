/**
 * Cómo se reparte la espera dentro del techo exponencial
 * `min(maxMs, baseMs * factor^(attempt - 1))`.
 * - `None`: espera exactamente el techo (exponencial sin jitter).
 * - `FullJitter`: espera uniforme en `[0, techo)`.
 * - `EqualJitter`: espera uniforme en `[techo / 2, techo)`.
 */
export enum BackoffStrategy {
  None = 'none',
  FullJitter = 'full-jitter',
  EqualJitter = 'equal-jitter',
}
