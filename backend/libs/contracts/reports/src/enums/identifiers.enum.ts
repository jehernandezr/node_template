/** Error codes of the reports service. */
export enum ReportsErrorCode {
  RunNotFound = 'REPORTS.RUN.NOT_FOUND',
  RunNotReady = 'REPORTS.RUN.NOT_READY',
  RunExpired = 'REPORTS.RUN.EXPIRED',
  TypeUnknown = 'REPORTS.TYPE.UNKNOWN',
  ParamsInvalidRange = 'REPORTS.PARAMS.INVALID_RANGE',
  ResultTooLarge = 'REPORTS.RESULT.TOO_LARGE',
}

/** Identifiers of the public routes of reports. */
export enum ReportsRoute {
  ListCatalog = 'reports.catalog.list',
  CreateRun = 'reports.run.create',
  ListRuns = 'reports.run.list',
  GetRun = 'reports.run.get',
  DownloadRun = 'reports.run.download',
}

/** Identifiers of the internal operations of reports. */
export enum ReportsOperation {
  EraseUserData = 'reports.user-data.erase.v1',
  TenantMoveSync = 'reports.tenant-move.sync.v1',
  TenantMoveFinalize = 'reports.tenant-move.finalize.v1',
  TenantMoveAbort = 'reports.tenant-move.abort.v1',
  TenantMoveSwitch = 'reports.tenant-move.switch.v1',
  TenantMoveCleanup = 'reports.tenant-move.cleanup.v1',
  TenantDirectoryPlace = 'reports.tenant-directory.place.v1',
  TenantDirectoryRemove = 'reports.tenant-directory.remove.v1',
}

/** CloudEvents types of the events reports publishes. */
export enum ReportsEvent {
  RunCompleted = 'reports.run.completed.v1',
}

/** CloudEvents types of the commands reports handles. */
export enum ReportsCommand {
  ExecuteRun = 'reports.run.execute.v1',
}

/** Topics where reports publishes its events. */
export enum ReportsTopic {
  Events = 'reports-events',
}

/** Queues that reports consumes. */
export enum ReportsQueue {
  Runs = 'reports-runs',
  Projections = 'reports-projections',
  FinanceProjections = 'reports-finance-projections',
}

/**
 * Names of the notifications messages that reports consumes. They are repeated here
 * because notifications already imports reports and a contract cannot import
 * whoever imports it; `contracts-export` checks that they exist.
 */
export enum NotificationsReference {
  Topic = 'notifications-events',
  NotificationCreated = 'notifications.notification.created.v1',
}
