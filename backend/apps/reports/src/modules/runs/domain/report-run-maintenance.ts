import type { UserRef } from '@contracts/platform';

/** Una ejecución de algún tenant, para los jobs que recorren todos los shards. */
export interface TenantRun {
  readonly tenantId: string;
  readonly runId: string;
}

/** Mantenimiento de las ejecuciones de todos los tenants, en todos los shards. */
export abstract class ReportRunMaintenance {
  /** Marca vencidas las ejecuciones listas cuyo resultado venció antes de `now` y las devuelve. */
  abstract expireBefore(now: Date): Promise<readonly TenantRun[]>;
  /** Pone a `replacement` como solicitante de las ejecuciones que pidió el usuario. */
  abstract replaceRequester(
    userId: string,
    replacement: UserRef,
  ): Promise<number>;
}
