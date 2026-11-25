/**
 * Platform log levels. It is the only levels enum: the
 * `LoggingConfig` section validates `LOG_LEVEL` against it.
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}
