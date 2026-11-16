import { LoggerPort } from '@platform/observability';

/** Línea de error que guardó {@link RecordingLogger}. */
export interface RecordedError {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger que guarda los errores, para afirmar sobre ellos. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedError[] = [];

  debug(): void {
    // Solo interesan los errores.
  }

  info(): void {
    // Solo interesan los errores.
  }

  warn(): void {
    // Solo interesan los errores.
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }

  child(): LoggerPort {
    return this;
  }
}
