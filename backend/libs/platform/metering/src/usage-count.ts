/**
 * Lo que un tenant consumió de una métrica en una ventana. La métrica es texto: el almacén de contadores no
 * conoce el catálogo de billing, y `UsageFlushJob` la valida contra él antes de enviarla.
 */
export interface UsageCount {
  readonly tenantId: string;
  readonly metric: string;
  readonly quantity: number;
}

/** Los contadores de una ventana de un minuto, identificada por su inicio. */
export interface UsageWindow {
  readonly start: Date;
  readonly counts: readonly UsageCount[];
}
