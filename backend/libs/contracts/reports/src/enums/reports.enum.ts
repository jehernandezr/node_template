/** Reportes que ofrece la plantilla. */
export enum ReportType {
  TasksByStatus = 'tasks_by_status',
  TasksActivity = 'tasks_activity',
  InvoicesSummary = 'invoices_summary',
  NotificationsDelivery = 'notifications_delivery',
}

/** Estado de una ejecución de reporte. */
export enum ReportRunStatus {
  Queued = 'queued',
  Running = 'running',
  Ready = 'ready',
  Failed = 'failed',
  Expired = 'expired',
}

/** Formatos en que se pide o se descarga un reporte. */
export enum ReportFormat {
  Json = 'json',
  Csv = 'csv',
}

/** Cómo se agrupa el tiempo en un reporte. */
export enum ReportGranularity {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

/** Tipo de dato de una columna del resultado. Los valores viajan como texto. */
export enum ReportColumnKind {
  Text = 'text',
  Integer = 'integer',
  Date = 'date',
}
