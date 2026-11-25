/** Reports the template offers. */
export enum ReportType {
  TasksByStatus = 'tasks_by_status',
  TasksActivity = 'tasks_activity',
  InvoicesSummary = 'invoices_summary',
  NotificationsDelivery = 'notifications_delivery',
}

/** Status of a report run. */
export enum ReportRunStatus {
  Queued = 'queued',
  Running = 'running',
  Ready = 'ready',
  Failed = 'failed',
  Expired = 'expired',
}

/** Formats in which a report is requested or downloaded. */
export enum ReportFormat {
  Json = 'json',
  Csv = 'csv',
}

/** How time is grouped in a report. */
export enum ReportGranularity {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

/** Data type of a result column. Values travel as text. */
export enum ReportColumnKind {
  Text = 'text',
  Integer = 'integer',
  Date = 'date',
}
