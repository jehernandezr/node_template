import { LoggerPort } from '@platform/observability';

/** Logger que descarta todo; las pruebas no ensucian la salida. */
export class SilentLogger extends LoggerPort {
  debug(): void {
    // Descarta el mensaje a propósito.
  }

  info(): void {
    // Descarta el mensaje a propósito.
  }

  warn(): void {
    // Descarta el mensaje a propósito.
  }

  error(): void {
    // Descarta el mensaje a propósito.
  }

  child(): LoggerPort {
    return this;
  }
}
