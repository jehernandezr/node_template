import { LoggerPort } from '@platform/observability';

/** Logger that discards everything; tests do not clutter the output. */
export class SilentLogger extends LoggerPort {
  override debug(): void {}

  override info(): void {}

  override warn(): void {}

  override error(): void {}

  override child(): LoggerPort {
    return this;
  }
}
