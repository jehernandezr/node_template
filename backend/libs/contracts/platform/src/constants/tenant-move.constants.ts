/** Límites y plazos de las operaciones de traslado de un tenant entre shards y regiones. */
export const TenantMoveLimits = {
  /** Largo máximo del identificador de un grupo de shards o de una región. */
  targetMaxLength: 64,
  /** Largo máximo del nombre de una tabla de PostgreSQL. */
  tableNameMaxLength: 63,
  /** Tablas que un servicio declara en su manifiesto de traslado. */
  maxTables: 64,
  /** Largo máximo de la suma de verificación de una tabla (hexadecimal). */
  checksumMaxLength: 64,
  /** Plazo de una llamada de copia: copia un lote acotado y devuelve el progreso; la saga repite hasta terminar la ronda. */
  syncTimeoutMs: 6_000,
  /** Plazo de una llamada de la última ronda y la verificación, por lotes como la copia. */
  finalizeTimeoutMs: 6_000,
  /** Plazo de una llamada de cancelación, por lotes. */
  abortTimeoutMs: 6_000,
  /** Plazo del cambio de directorio de un servicio al destino. */
  switchTimeoutMs: 6_000,
  /** Plazo de una llamada de limpieza del origen, por lotes. */
  cleanupTimeoutMs: 6_000,
} as const;
