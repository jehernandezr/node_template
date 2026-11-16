/**
 * Niveles de log de la plataforma. Es el único enum de niveles: la sección
 * `LoggingConfig` valida `LOG_LEVEL` contra él.
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}
