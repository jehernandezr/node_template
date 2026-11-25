/** Ajustes de la renovación del lease mientras corre un handler. */
export interface ClaimKeeperOptions {
  /** Cada cuánto se renueva el lease. Por defecto 2 s. */
  readonly renewEveryMs?: number;
  /** Cuánto dura el lease desde cada renovación. Por defecto 10 s: varias renovaciones perdidas antes de vencer. */
  readonly renewedLeaseMs?: number;
}
