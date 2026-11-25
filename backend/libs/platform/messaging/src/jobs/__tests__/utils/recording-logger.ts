import { LoggerPort } from '@platform/observability';

/** Una línea de error que se registró. */
export interface RecordedError {
  readonly message: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/** Logger que guarda los errores para mirarlos en la prueba y descarta el resto. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedError[] = [];

  /** Descarta la línea. */
  debug(): void {
    return;
  }

  /** Descarta la línea. */
  info(): void {
    return;
  }

  /** Descarta la línea. */
  warn(): void {
    return;
  }

  /** Guarda el error. */
  error(message: string, attributes?: Readonly<Record<string, unknown>>): void {
    this.errors.push({ message, ...(attributes && { attributes }) });
  }

  /** El mismo logger. */
  child(): LoggerPort {
    return this;
  }
}
