/**
 * Regla de un flag. Con `enabled` apagado el flag está apagado para todos. Encendido, aplica al contexto que
 * coincide con algún destinatario explícito (usuario, tenant, plan o grupo) o cuyo usuario cae dentro del
 * porcentaje de despliegue.
 */
export interface FlagRule {
  readonly flag: string;
  readonly enabled: boolean;
  /** Porcentaje de usuarios, de 0 a 100, que lo reciben aunque no sean destinatarios explícitos. */
  readonly rolloutPercent: number;
  readonly users?: readonly string[];
  readonly tenants?: readonly string[];
  readonly plans?: readonly string[];
  readonly groups?: readonly string[];
}
