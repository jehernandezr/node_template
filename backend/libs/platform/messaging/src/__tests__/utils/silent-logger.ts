import { LoggerPort } from '@platform/observability';

/** Logger that discards everything; tests do not clutter the output. */
export class SilentLogger extends LoggerPort {
  debug(): void {
    // Discards the message on purpose.
  }

  info(): void {
    // Discards the message on purpose.
  }

  warn(): void {
    // Discards the message on purpose.
  }

  error(): void {
    // Discards the message on purpose.
  }

  child(): LoggerPort {
    return this;
  }
}
