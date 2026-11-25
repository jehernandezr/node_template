/** reports periodic jobs. */
export enum ReportsJob {
  /** Deletes the result of expired runs. */
  ExpireRuns = 'reports.expire-runs',
  /** Backfills the task projections of the tenants that existed before the service. */
  BackfillProjections = 'reports.backfill-projections',
}
