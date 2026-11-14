import type { LogLevel } from './log-level.enum.js';

/**
 * Un log listo para escribir: el mensaje y los campos ya están redactados y
 * `fields` ya trae los campos de traza y contexto (`LogField`) del instante.
 */
export interface LogRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly service: string;
  readonly context?: string;
  readonly fields: Readonly<Record<string, unknown>>;
}
