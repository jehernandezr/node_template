import { LoggerPort } from '@platform/observability';

/** Logger that discards everything; tests do not clutter the output. */
export class SilentLogger extends LoggerPort {
  debug(): void {}

  info(): void {}

  warn(): void {}

  error(): void {}

  child(): LoggerPort {
    return this;
  }
}
