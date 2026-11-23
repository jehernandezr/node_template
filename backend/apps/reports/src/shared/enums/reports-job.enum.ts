/** Jobs periódicos de reports. */
export enum ReportsJob {
  /** Borra el resultado de las ejecuciones vencidas. */
  ExpireRuns = 'reports.expire-runs',
  /** Rellena las proyecciones de tareas de los tenants que existían antes del servicio. */
  BackfillProjections = 'reports.backfill-projections',
}
