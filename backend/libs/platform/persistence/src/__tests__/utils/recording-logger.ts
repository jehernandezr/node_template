import { LoggerPort } from '@platform/observability';

/** Una entrada de log guardada por {@link RecordingLogger}. */
export interface RecordedLog {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** `LoggerPort` que guarda los errores y los avisos para que la prueba los compruebe. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedLog[] = [];
  readonly warnings: RecordedLog[] = [];

  debug(): void {
    // Las pruebas no miran los niveles bajos.
  }

  info(): void {
    // Las pruebas no miran los niveles bajos.
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.warnings.push({ message, fields });
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }

  child(): LoggerPort {
    return this;
  }
}
