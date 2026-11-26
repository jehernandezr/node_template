/** Structured logging port. Services inject it; nobody uses `console.log`. */
export abstract class LoggerPort {
  /**
   * Logs a debug message, subject to sampling.
   * @param message Message.
   * @param fields Structured fields, redacted.
   */
  abstract debug(message: string, fields?: Record<string, unknown>): void;
  /**
   * Logs an informative message.
   * @param message Message.
   * @param fields Structured fields, redacted.
   */
  abstract info(message: string, fields?: Record<string, unknown>): void;
  /**
   * Logs a warning.
   * @param message Message.
   * @param fields Structured fields, redacted.
   */
  abstract warn(message: string, fields?: Record<string, unknown>): void;
  /**
   * Logs an error.
   * @param message Message.
   * @param fields Structured fields, redacted.
   */
  abstract error(message: string, fields?: Record<string, unknown>): void;
  /**
   * Creates a logger that adds `bindings` to every record.
   * @param bindings Fields of every record.
   * @returns The child logger.
   */
  abstract child(bindings: Record<string, unknown>): LoggerPort;
}
