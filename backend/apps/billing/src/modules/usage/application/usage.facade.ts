import type { UsageLevel } from '../domain/usage-ledger.js';

/** Lo que `usage` ofrece a los otros módulos. */
export abstract class UsageFacade {
  /**
   * Lo usado por métrica en el periodo: los usuarios son los miembros de hoy y las demás métricas, lo
   * registrado entre `from` y `to`.
   */
  abstract levels(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]>;
}
