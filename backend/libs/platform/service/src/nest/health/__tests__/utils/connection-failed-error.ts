import { ProbeErrorName } from './probe-error-name.enum.js';

/** Error de conexión simulado. Su mensaje lleva un dato de conexión, que nunca debe salir en el reporte de salud. */
export class ConnectionFailedError extends Error {
  override readonly name = ProbeErrorName.Connection;

  constructor() {
    super('connection refused by postgres.internal:5432');
  }
}
