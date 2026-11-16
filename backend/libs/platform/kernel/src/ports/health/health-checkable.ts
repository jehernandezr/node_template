import type { HealthReport } from './health-report.js';

/** Dependencia cuyo estado se puede consultar, como un cliente de base o de caché. */
export abstract class HealthCheckable {
  /** Nombre estable de la dependencia en los reportes de salud. */
  abstract readonly name: string;

  abstract check(signal?: AbortSignal): Promise<HealthReport>;
}
