/** Códigos de error del servicio reports. */
export enum ReportsErrorCode {
  RunNotFound = 'REPORTS.RUN.NOT_FOUND',
  RunNotReady = 'REPORTS.RUN.NOT_READY',
  RunExpired = 'REPORTS.RUN.EXPIRED',
  TypeUnknown = 'REPORTS.TYPE.UNKNOWN',
  ParamsInvalidRange = 'REPORTS.PARAMS.INVALID_RANGE',
  ResultTooLarge = 'REPORTS.RESULT.TOO_LARGE',
}

/** Identificadores de las rutas públicas de reports. */
export enum ReportsRoute {
  ListCatalog = 'reports.catalog.list',
  CreateRun = 'reports.run.create',
  ListRuns = 'reports.run.list',
  GetRun = 'reports.run.get',
  DownloadRun = 'reports.run.download',
}

/** Identificadores de las operaciones internas de reports. */
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

/** Tipos CloudEvents de los eventos que publica reports. */
export enum ReportsEvent {
  RunCompleted = 'reports.run.completed.v1',
}

/** Tipos CloudEvents de los comandos que atiende reports. */
export enum ReportsCommand {
  ExecuteRun = 'reports.run.execute.v1',
}

/** Tópicos donde reports publica sus eventos. */
export enum ReportsTopic {
  Events = 'reports-events',
}

/** Colas que consume reports. */
export enum ReportsQueue {
  Runs = 'reports-runs',
  Projections = 'reports-projections',
  FinanceProjections = 'reports-finance-projections',
}

/**
 * Nombres de los mensajes de notifications que reports consume. Se repiten aquí
 * porque notifications ya importa a reports y un contrato no puede importar a
 * quien lo importa; `contracts-export` comprueba que existan.
 */
export enum NotificationsReference {
  Topic = 'notifications-events',
  NotificationCreated = 'notifications.notification.created.v1',
}
