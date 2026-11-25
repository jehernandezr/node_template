/** Structured logging port. Services inject it; nobody uses `console.log`. */
export abstract class LoggerPort {
  abstract debug(message: string, fields?: Record<string, unknown>): void;
  abstract info(message: string, fields?: Record<string, unknown>): void;
  abstract warn(message: string, fields?: Record<string, unknown>): void;
  abstract error(message: string, fields?: Record<string, unknown>): void;
  abstract child(bindings: Record<string, unknown>): LoggerPort;
}
