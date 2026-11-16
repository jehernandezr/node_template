/** Valores de la conexión que vienen del runtime y no del entorno. */
export interface ValkeyRuntimeOptions {
  /** Nombre que muestra `CLIENT LIST`, por ejemplo el nombre del servicio. */
  readonly connectionName?: string;
  /** Tiempo para establecer una conexión. Por defecto 2 000 ms. */
  readonly connectTimeoutMs?: number;
  /**
   * Cota de un comando en el cliente. Por defecto 1 000 ms. La política de
   * resilience de cada llamador fija el límite real, más corto; esta solo
   * evita que un comando quede colgado para siempre.
   */
  readonly commandTimeoutMs?: number;
}
