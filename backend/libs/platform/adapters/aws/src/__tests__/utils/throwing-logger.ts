import { LoggerPort } from '@platform/observability';

/** Logger whose sink is down: every line throws, to test that consumption does not depend on it. */
export class ThrowingLogger extends LoggerPort {
  debug(): void {
    throw new Error('logger down');
  }

  info(): void {
    throw new Error('logger down');
  }

  warn(): void {
    throw new Error('logger down');
  }

  error(): void {
    throw new Error('logger down');
  }

  child(): LoggerPort {
    return this;
  }
}
