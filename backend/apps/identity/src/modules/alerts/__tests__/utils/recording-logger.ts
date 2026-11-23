import { LoggerPort } from '@platform/observability';

/** Una línea que registró {@link RecordingLogger}. */
export interface RecordedLine {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger que guarda lo registrado en `info` y `warn`, para comprobar qué deja un adaptador en el log. */
export class RecordingLogger extends LoggerPort {
  readonly lines: RecordedLine[] = [];

  debug(): void {
    // Las pruebas no miran el nivel de depuración.
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  child(): LoggerPort {
    return this;
  }
}
