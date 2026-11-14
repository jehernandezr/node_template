/** Ajustes y ganchos de un {@link Bulkhead}. */
export interface BulkheadOptions {
  /** Llamadas simultáneas máximas. */
  readonly limit: number;
  /** Llamadas que pueden esperar un cupo antes de ser rechazadas. */
  readonly queue: number;
  /** Error que se lanza cuando no hay cupo ni lugar en la cola. */
  readonly rejectWith: () => Error;
  readonly onReject?: () => void;
}
