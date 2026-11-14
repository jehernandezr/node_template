/** Estado de un {@link ConsecutiveCircuitBreaker}. */
export enum CircuitState {
  /** Las llamadas corren; las fallas contadas se acumulan. */
  Closed = 'closed',
  /** Las llamadas se rechazan sin correr hasta que pase `halfOpenAfterMs`. */
  Open = 'open',
  /** Corre una llamada de prueba; las demás se rechazan hasta que termine. */
  HalfOpen = 'half-open',
}
