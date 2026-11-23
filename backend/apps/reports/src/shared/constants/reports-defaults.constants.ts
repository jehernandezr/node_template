import { Pagination } from '@contracts/platform';

/** Valores por defecto de reports. */
export const ReportsDefaults = {
  maxResultBytes: 1_000_000,
  resultTtlDays: 30,
  pageSize: 20,
  /** Cambios de tareas por página al rellenar las proyecciones de un tenant. */
  backfillPageSize: Pagination.maxLimit,
  /** Páginas que rellena una corrida por tenant: cada llamada cabe en el presupuesto de una operación interna. */
  backfillPagesPerRun: 10,
  /**
   * Quien queda como solicitante de las ejecuciones de un usuario borrado: un UUIDv7 válido que el
   * `IdGenerator` nunca emite (su marca de tiempo es cero).
   */
  erasedRequester: {
    userId: '00000000-0000-7000-8000-000000000000',
    homeTenantId: '00000000-0000-7000-8000-000000000000',
  },
} as const;
