import type { HealthReport, HealthState } from '@platform/kernel';

/** Resultado de consultar todas las dependencias registradas. */
export interface HealthSummary {
  /** El peor estado de las dependencias: `Down` si alguna cae, `Degraded` si alguna se degrada, `Up` si no hay ninguna o todas responden. */
  readonly state: HealthState;
  /** Reporte de cada dependencia por su `name`. */
  readonly checks: Readonly<Record<string, HealthReport>>;
}
