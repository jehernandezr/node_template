/**
 * Niveles de log de la plataforma. Es el único enum de niveles: `LOG_LEVEL`
 * se valida contra él y `@platform/observability` lo reexporta para el logger.
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}
