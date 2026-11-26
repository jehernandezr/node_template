import { LoggerPort } from '@platform/observability';

/** Logger whose sink is down: every line throws, to test that consumption does not depend on it. */
export class ThrowingLogger extends LoggerPort {
  override debug(): void {
    throw new Error('logger down');
  }

  override info(): void {
    throw new Error('logger down');
  }

  override warn(): void {
    throw new Error('logger down');
  }

  override error(): void {
    throw new Error('logger down');
  }

  override child(): LoggerPort {
    return this;
  }
}
