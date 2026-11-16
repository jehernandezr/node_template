import { LoggerPort } from '@platform/observability';

/** Logger cuyo sumidero está caído: cada línea lanza, para probar que el consumo no depende de él. */
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
